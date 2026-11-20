import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const api = readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const entryRoute = api.indexOf('// ADD OR DELETE EXPENSES');
const begin = api.indexOf('if (notify.user_id !== me.id) {', entryRoute);
const end = api.indexOf('return json(savedDetail, 201);', begin);
assert.ok(entryRoute >= 0 && begin > entryRoute && end > begin, 'entry notification route exists');

const source = api.slice(begin, end) + 'return json(savedDetail, 201);';

async function invoke({ type, notificationFails, recipientIsSelf = false }) {
  const calls = [];
  const errors = [];
  const context = {
    notify: { user_id: recipientIsSelf ? 'owner' : 'other' },
    me: { id: 'owner', name: 'Alex' },
    created: { id: 'entry-id' },
    e: { type, from_name: 'Alex', to_name: 'Blair', amount: 12.5 },
    pending: type === 'payment',
    recurringScheduleWarning: null,
    id: 'tracker-id',
    db: async (table, params) => {
      calls.push({ table, params });
      if (notificationFails) throw new Error('notification service unavailable');
    },
    detail: async () => ({ entries: [{ id: 'entry-id' }] }),
    json: (payload, status) => ({ payload, status }),
    console: { error: (...args) => errors.push(args) }
  };
  const task = vm.runInNewContext('(async function() {' + source + '})', context);
  const result = await task();
  return { result, calls, errors };
}

for (const type of ['debt', 'payment']) {
  test(type + ': saved entry still reports success when notification fails', async () => {
    const {result, calls, errors} = await invoke({type, notificationFails: true});
    assert.equal(result.status, 201);
    assert.equal(result.payload.entries[0].id, 'entry-id');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].table, 'squareup_notifications');
    assert.equal(errors.length, 1);
  });

  test(type + ': successful notification preserves existing behavior', async () => {
    const {result, calls, errors} = await invoke({type, notificationFails: false});
    assert.equal(result.status, 201);
    assert.equal(calls.length, 1);
    assert.equal(errors.length, 0);
  });
}

test('no notification is sent to the entry creator', async () => {
  const {result, calls} = await invoke({type: 'debt', recipientIsSelf: true});
  assert.equal(result.status, 201);
  assert.equal(calls.length, 0);
});
