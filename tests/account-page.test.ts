import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const headerSource = await readFile(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
const accountSource = await readFile(new URL('../src/pages/account.astro', import.meta.url), 'utf8');

test('signed-in header preserves the current Account and Search controls without global sign out', () => {
  assert.match(headerSource, /href="\/account"[^>]*>Account<\/a>/);
  assert.match(headerSource, /aria-label="Search"/);
  assert.doesNotMatch(headerSource, /action="\/auth\/logout"/);
});

test('account page owns sign out and keeps debug information collapsed', () => {
  assert.match(accountSource, /<form action="\/auth\/logout" method="post"/);
  assert.match(accountSource, /Debug information/);
  assert.doesNotMatch(accountSource, /<details[^>]*\sopen(?:\s|>)/);
});

test('account page includes Email, Content Editor, Confluence, and Jira widgets without visible access UI', () => {
  const emailIndex = accountSource.indexOf("label: 'Email'");
  const contentEditorIndex = accountSource.indexOf("label: 'Content Editor'");
  const confluenceIndex = accountSource.indexOf("label: 'Confluence'");
  const jiraIndex = accountSource.indexOf("label: 'Jira'");

  assert.ok(emailIndex >= 0);
  assert.ok(contentEditorIndex > emailIndex);
  assert.ok(confluenceIndex > contentEditorIndex);
  assert.ok(jiraIndex > confluenceIndex);
  assert.match(accountSource, /href: '\/account\/content\/'/);
  assert.match(accountSource, /user\.permissions\.includes\(CMS_PERMISSION\)/);
  assert.doesNotMatch(accountSource, />Access<\/h2>/);
});
