import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const api = readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const routeStart = api.indexOf('// ADD OR DELETE EXPENSES');
const routeEnd = api.indexOf('// Clean up notifications for the deleted entry.', routeStart);
assert.ok(routeStart >= 0 && routeEnd > routeStart, 'expense entry route must exist');
const route = api.slice(routeStart, routeEnd);

const checkStart = route.indexOf('// Validate recurrence before writing any financial record.');
const insertStart = route.indexOf("const created = (await db('tracker_entries', {", checkStart);
const recurrenceInsert = route.indexOf("await db('squareup_recurring_expenses', {", insertStart);
assert.ok(checkStart >= 0 && insertStart > checkStart && recurrenceInsert > insertStart,
  'recurrence must be validated before either financial insert');

const validation = route.slice(checkStart, insertStart);
function evaluate(type, recurring) {
  const sandbox = {e: {type}, body: {recurring}, fail: (message, status) => ({message, status})};
  return vm.runInNewContext('(function(){' + validation + 'return null;})()', sandbox);
}

test('invalid recurrence is rejected before writing an expense', () => {
  for (const value of ['hourly', 'yearly', 'invalid', 'DAILY']) {
    const result = evaluate('debt', value);
    assert.equal(result?.status, 400, value);
    assert.equal(result?.message, 'Invalid recurrence', value);
  }
});

test('supported recurrence frequencies remain accepted', () => {
  for (const value of ['daily', 'weekly', 'biweekly', 'monthly', 'none', undefined]) {
    assert.equal(evaluate('debt', value), null, String(value));
  }
});

test('payment reporting does not accidentally require a debt recurrence', () => {
  assert.equal(evaluate('payment', 'invalid'), null);
});

test('recurrence validation precedes insert, preserving rejection atomicity', () => {
  assert.ok(checkStart < insertStart);
  assert.ok(checkStart < recurrenceInsert);
  assert.ok(!route.slice(insertStart, recurrenceInsert).includes("return fail('Invalid recurrence'"),
    'there should be no late recurrence rejection after the financial insert');
});
