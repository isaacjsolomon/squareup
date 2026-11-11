import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeBranch, validateTask, safeSearch } from '../policy.mjs';

test('accepts only Jarvis development branches', () => {
  assert.equal(isSafeBranch('feature/jarvis-developer-dashboard'), true);
  assert.equal(isSafeBranch('jarvis/fix-profile-photo'), true);
  for (const name of ['main','master','release', 'feature/other','jarvis/../main','']) assert.equal(isSafeBranch(name), false);
});
test('validates queued tasks', () => {
  assert.equal(validateTask('Investigate a profile photo rendering issue'), null);
  assert.match(validateTask('short'), /12/);
  assert.match(validateTask('x'.repeat(3001)), /3000/);
  assert.match(validateTask('Investigate\nand deploy immediately'), /Control/);
});
test('search only accepts bounded literals', () => {
  assert.equal(safeSearch('profile photo'), 'profile photo');
  assert.equal(safeSearch('x'), null);
  assert.equal(safeSearch('foo; rm -rf /'), null);
  assert.equal(safeSearch('-'.repeat(61)), null);
});
