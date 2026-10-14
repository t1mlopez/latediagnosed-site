import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAuthorName } from '../src/lib/authors.ts';

const authors = [
  { id: 'tim-lopez', data: { name: 'Tim Lopez' } },
  { id: 'late-diagnosed', data: { name: 'Late Diagnosed' } },
];

test('author slugs tolerate whitespace and capitalization', () => {
  assert.equal(resolveAuthorName('Tim-Lopez ', authors), 'Tim Lopez');
  assert.equal(resolveAuthorName('late-diagnosed', authors), 'Late Diagnosed');
});

test('author display names resolve and unlisted names remain visible', () => {
  assert.equal(resolveAuthorName(' tim lopez ', authors), 'Tim Lopez');
  assert.equal(resolveAuthorName('LateDiagnosed.org', authors), 'LateDiagnosed.org');
  assert.equal(resolveAuthorName(' Guest Writer ', authors), 'Guest Writer');
  assert.equal(resolveAuthorName('  ', authors), undefined);
});
