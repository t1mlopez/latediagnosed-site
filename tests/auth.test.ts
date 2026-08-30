import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CMS_LOGIN_PATH, cmsAccessDecision, isCmsPath } from '../src/lib/auth/cms.ts';
import { sealAuthValue, unsealAuthValue } from '../src/lib/auth/crypto.ts';
import { safeReturnTo } from '../src/lib/auth/return-to.ts';
import { cmsForbiddenResponse, expiredLoginResponse } from '../src/lib/auth/responses.ts';
import { isValidAuthSession } from '../src/lib/auth/session.ts';
import { createCmsCsrfToken, validateCmsCsrfToken } from '../src/lib/cms/csrf.ts';
import {
  CMS_BRANCH,
  CMS_REPOSITORY,
  isAllowedRequestOrigin,
  normalizeCmsPath,
  requireCmsBranch,
  requireCmsRepository,
  requireWritableCmsPath,
} from '../src/lib/cms/policy.ts';
import type { AuthSession, AuthUser } from '../src/lib/auth/types.ts';

const editor: AuthUser = { id: 'editor', permissions: ['CMS Editors'] };
const reader: AuthUser = { id: 'reader', permissions: ['CMS Viewer'] };

test('CMS paths include the page and its static assets only', () => {
  assert.equal(isCmsPath('/admin'), true);
  assert.equal(isCmsPath('/admin/'), true);
  assert.equal(isCmsPath('/admin/config.yml'), true);
  assert.equal(isCmsPath('/administrator'), false);
});

test('anonymous CMS access requires the canonical Okta login flow', () => {
  assert.equal(cmsAccessDecision(null), 'login');
  assert.equal(CMS_LOGIN_PATH, '/auth/login?returnTo=/admin/');
});

test('the exact CMS Editors permission authorizes CMS access', () => {
  assert.equal(cmsAccessDecision(editor), 'allow');
  assert.equal(cmsAccessDecision({ id: 'wrong-case', permissions: ['cms editors'] }), 'forbidden');
});

test('an authenticated user without CMS Editors is forbidden', () => {
  assert.equal(cmsAccessDecision(reader), 'forbidden');
});

test('permission denial and expired-login responses are friendly and non-cacheable', async () => {
  const forbidden = cmsForbiddenResponse();
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('Cache-Control'), 'private, no-store');
  assert.match(await forbidden.text(), /CMS Editors/);

  const expired = expiredLoginResponse();
  assert.equal(expired.status, 400);
  assert.match(await expired.text(), /sign-in attempt has expired/i);
});

test('safeReturnTo accepts same-origin paths and rejects external or protocol-relative targets', () => {
  assert.equal(safeReturnTo('/admin/'), '/admin/');
  assert.equal(safeReturnTo('/account?tab=access#permissions'), '/account?tab=access#permissions');
  assert.equal(safeReturnTo('https://evil.example/'), '/account');
  assert.equal(safeReturnTo('//evil.example/'), '/account');
  assert.equal(safeReturnTo('admin'), '/account');
});

test('tampered sealed sessions cannot be decrypted', async () => {
  const secret = 'a'.repeat(32);
  const session: AuthSession = { user: editor, expiresAt: Date.now() + 60_000 };
  const sealed = await sealAuthValue(session, secret);
  const last = sealed.at(-1);
  const tampered = `${sealed.slice(0, -1)}${last === 'A' ? 'B' : 'A'}`;
  assert.equal(await unsealAuthValue<AuthSession>(tampered, secret), null);
});

test('expired sessions are rejected after authenticated decryption', async () => {
  const secret = 'b'.repeat(32);
  const session: AuthSession = { user: editor, expiresAt: Date.now() - 1 };
  const sealed = await sealAuthValue(session, secret);
  const unsealed = await unsealAuthValue<AuthSession>(sealed, secret);
  assert.equal(isValidAuthSession(unsealed), false);
});

test('malformed session payloads are rejected', () => {
  assert.equal(isValidAuthSession({ expiresAt: Date.now() + 60_000, user: { id: 'x', permissions: 'CMS Editors' } }), false);
  assert.equal(isValidAuthSession({ expiresAt: 'later', user: editor }), false);
});

test('browser-served CMS files contain no privileged credential material', async () => {
  const sources = await Promise.all([
    readFile(new URL('../src/cms/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/cms/config.yml', import.meta.url), 'utf8'),
    readFile(new URL('../src/cms/backend.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/cms/preview.css', import.meta.url), 'utf8'),
  ]);
  const browserPayload = sources.join('\n');
  assert.doesNotMatch(browserPayload, /BEGIN (?:RSA )?PRIVATE KEY/);
  assert.doesNotMatch(browserPayload, /GITHUB_APP_PRIVATE_KEY|GITHUB_CLIENT_SECRET|OKTA_CLIENT_SECRET/);
  assert.doesNotMatch(browserPayload, /Authorization:\s*[`'"]?Bearer/i);
  assert.doesNotMatch(browserPayload, /fragrant-hall-b531|base_url:\s*https?:/);
  assert.match(browserPayload, /form\.method = "POST"/);
  assert.match(browserPayload, /window\.location\.replace\("\/auth\/login\?returnTo=\/admin\/"\)/);
});

test('CMS gateway accepts only the configured repository and branch', () => {
  assert.doesNotThrow(() => requireCmsRepository(CMS_REPOSITORY));
  assert.doesNotThrow(() => requireCmsBranch(CMS_BRANCH));
  assert.throws(() => requireCmsRepository('t1mlopez/another-repository'), /not allowed/i);
  assert.throws(() => requireCmsBranch('preview'), /not allowed/i);
});

test('CMS path policy rejects traversal and encoded paths', () => {
  assert.equal(normalizeCmsPath('src/content/articles/example.md'), 'src/content/articles/example.md');
  assert.throws(() => normalizeCmsPath('../wrangler.jsonc'), /traversal/i);
  assert.throws(() => normalizeCmsPath('src/content/articles/../pages/example.md'), /traversal/i);
  assert.throws(() => normalizeCmsPath('src/content/articles/%2e%2e/pages/example.md'), /encoded/i);
  assert.throws(() => normalizeCmsPath('src\\content\\articles\\example.md'), /invalid/i);
});

test('CMS writes are restricted to approved content and media paths', () => {
  assert.equal(requireWritableCmsPath('src/content/articles/example.md'), 'src/content/articles/example.md');
  assert.equal(requireWritableCmsPath('public/uploads/example.webp'), 'public/uploads/example.webp');
  assert.throws(() => requireWritableCmsPath('src/pages/index.astro'), /approved/i);
  assert.throws(() => requireWritableCmsPath('public/uploads/script.js'), /approved/i);
  assert.throws(() => requireWritableCmsPath('public/uploads/active.svg'), /approved/i);
  assert.throws(() => requireWritableCmsPath('README.md'), /approved/i);
});

test('CMS mutation origin must exactly match the request origin', () => {
  const url = new URL('https://latediagnosed.org/api/cms/repository');
  assert.equal(isAllowedRequestOrigin(url, 'https://latediagnosed.org'), true);
  assert.equal(isAllowedRequestOrigin(url, 'https://evil.example'), false);
  assert.equal(isAllowedRequestOrigin(url, null), false);
});

test('CMS CSRF tokens are subject-bound, expiring, and tamper evident', async () => {
  const secret = 'c'.repeat(32);
  const now = Date.now();
  const token = await createCmsCsrfToken('editor', secret, now);
  assert.equal(await validateCmsCsrfToken(token, 'editor', secret, now + 1), true);
  assert.equal(await validateCmsCsrfToken(token, 'another-editor', secret, now + 1), false);
  assert.equal(await validateCmsCsrfToken(token, 'editor', secret, now + 16 * 60 * 1000), false);
  assert.equal(await validateCmsCsrfToken(`${token}x`, 'editor', secret, now + 1), false);
});
