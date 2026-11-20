import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the actual Cloudflare API handler with an in-memory database.
// Tests never connect to the real Supabase project or change production data.
const source = readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const { onRequest } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const owner = '11111111-1111-4111-8111-111111111111';
const editor = '22222222-2222-4222-8222-222222222222';
const viewer = '33333333-3333-4333-8333-333333333333';
const outsider = '44444444-4444-4444-8444-444444444444';
const tracker = '55555555-5555-4555-8555-555555555555';

function setup({ actor = owner, scheduleFails = false } = {}) {
  const members = [
    { tracker_id: tracker, user_id: owner, name: 'Alex', role: 'owner' },
    { tracker_id: tracker, user_id: editor, name: 'Jordan', role: 'editor' },
    { tracker_id: tracker, user_id: viewer, name: 'Taylor', role: 'viewer' }
  ];
  const entries = [];
  const writes = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    const path = url.pathname;
    const method = options.method || 'GET';
    if (path === '/auth/v1/user') {
      const names = { [owner]: 'Alex', [editor]: 'Jordan', [viewer]: 'Taylor', [outsider]: 'Outside' };
      return Response.json({ id: actor, email: 'fixture@example.test', user_metadata: { full_name: names[actor] } });
    }
    assert.ok(path.startsWith('/rest/v1/'), 'Unexpected external request: ' + path);
    const table = path.split('/').at(-1);
    const filters = url.searchParams;
    const body = options.body ? JSON.parse(options.body) : null;
    if (method !== 'GET') writes.push({ table, method, body, filters: Object.fromEntries(filters) });
    let rows = [];
    if (table === 'trackers') rows = [{ id: tracker, owner_id: owner, name: 'Test Group', currency: 'USD' }];
    else if (table === 'tracker_members') rows = members;
    else if (table === 'squareup_tracker_permissions') rows = [];
    else if (table === 'squareup_tracker_settings') rows = [{ tracker_id: tracker, require_expense_approval: false }];
    else if (table === 'tracker_entries') {
      if (method === 'POST') {
        const added = { ...body, id: '66666666-6666-4666-8666-666666666666' };
        entries.push(added);
        rows = [added];
      } else if (method === 'PATCH') {
        rows = entries.filter(e => (!filters.has('id') || filters.get('id') === 'eq.' + e.id));
        rows.forEach(e => Object.assign(e, body));
      } else rows = entries;
    } else if (table === 'squareup_recurring_expenses') {
      if (method === 'POST' && scheduleFails)
        return Response.json({ message: 'Simulated recurring schedule outage' }, { status: 503 });
      rows = method === 'POST' ? [{ id: '77777777-7777-4777-8777-777777777777', ...body }] : [];
    } else if (table === 'squareup_notifications') rows = method === 'POST' ? [{ id: 'notification-1', ...body }] : [];
    else if (table === 'profiles') rows = [];
    else assert.fail('Unhandled table: ' + table);
    if (table === 'tracker_members') {
      if (filters.has('tracker_id')) rows = rows.filter(row => filters.get('tracker_id') === 'eq.' + row.tracker_id);
      if (filters.has('user_id')) rows = rows.filter(row => filters.get('user_id') === 'eq.' + row.user_id);
    }
    if (table === 'tracker_entries' && filters.has('id'))
      rows = rows.filter(row => filters.get('id') === 'eq.' + row.id);
    return Response.json(rows);
  };
  const call = async (who, method = 'GET', path = ['trackers', tracker], body = undefined) => {
    actor = who;
    const request = new Request('https://doweo.app/api/' + path.join('/'), {
      method,
      headers: { Authorization: 'Bearer fake-test-token', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return onRequest({ request, env: { SUPABASE_SERVICE_ROLE_KEY: 'test-only-secret' }, params: { path } });
  };
  return { call, entries, writes, restore: () => { globalThis.fetch = previousFetch; } };
}
const pathEntries = ['trackers', tracker, 'entries'];
const debt = { type: 'debt', from: 'Jordan', to: 'Alex', amount: 18.75, note: 'Lunch' };
const payment = { type: 'payment', from: 'Jordan', to: 'Alex', amount: 7.25 };

test('outsider cannot read tracker or write financial records', async () => {
  const h = setup();
  try {
    assert.equal((await h.call(outsider)).status, 404);
    assert.equal((await h.call(outsider, 'POST', pathEntries, debt)).status, 404);
    assert.equal(h.writes.length, 0);
  } finally { h.restore(); }
});

test('viewer cannot create debts or report payments', async () => {
  const h = setup();
  try {
    assert.equal((await h.call(viewer, 'POST', pathEntries, debt)).status, 403);
    assert.equal((await h.call(viewer, 'POST', pathEntries, payment)).status, 403);
    assert.equal(h.entries.length, 0);
  } finally { h.restore(); }
});

test('payments must be reported by the payer, confirmed by the recipient and only once', async () => {
  const h = setup();
  try {
    assert.equal((await h.call(owner, 'POST', pathEntries, payment)).status, 403);
    assert.equal(h.entries.length, 0);
    const submitted = await h.call(editor, 'POST', pathEntries, payment);
    assert.equal(submitted.status, 201);
    assert.equal(h.entries.length, 1);
    assert.equal(h.entries[0].amount, 7.25);
    assert.equal(h.entries[0].payment_status, 'pending');
    const confirmation = ['trackers', tracker, 'payments', h.entries[0].id, 'confirm'];
    assert.equal((await h.call(editor, 'POST', confirmation, {})).status, 403);
    assert.equal(h.entries[0].payment_status, 'pending');
    assert.equal((await h.call(owner, 'POST', confirmation, {})).status, 200);
    assert.equal(h.entries[0].payment_status, 'confirmed');
    assert.equal((await h.call(owner, 'POST', confirmation, {})).status, 409);
    assert.equal(h.writes.filter(x => x.table === 'tracker_entries' && x.method === 'PATCH').length, 1);
  } finally { h.restore(); }
});

test('failed recurrence setup cannot falsely report the saved expense as failed', async () => {
  const h = setup({ scheduleFails: true });
  try {
    const response = await h.call(owner, 'POST', pathEntries, { ...debt, recurring: 'monthly' });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.match(result.warning, /Expense saved, but its recurring schedule was not created/i);
    assert.equal(h.entries.length, 1);
    assert.equal(h.entries[0].amount, 18.75);
    assert.equal(h.writes.filter(x => x.table === 'tracker_entries' && x.method === 'POST').length, 1);
    assert.equal(h.writes.filter(x => x.table === 'squareup_recurring_expenses' && x.method === 'POST').length, 1);
  } finally { h.restore(); }
});

test('normal recurring expense creates both entry and schedule without a warning', async () => {
  const h = setup();
  try {
    const response = await h.call(owner, 'POST', pathEntries, { ...debt, recurring: 'weekly' });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.warning, undefined);
    assert.equal(h.entries.length, 1);
    assert.equal(h.writes.filter(x => x.table === 'squareup_recurring_expenses' && x.method === 'POST').length, 1);
  } finally { h.restore(); }
});
