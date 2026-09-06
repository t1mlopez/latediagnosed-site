import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  ContentEditorError,
  requireEditableCollection,
  requireSlug,
  serializeMarkdown,
  slugify,
  splitMarkdown,
  validateEditorContent,
} from '../src/lib/cms/content-editor.ts';

test('content editor accepts only shared editable collections and safe slugs', () => {
  assert.equal(requireEditableCollection('articles'), 'articles');
  assert.throws(() => requireEditableCollection('authors'), ContentEditorError);
  assert.equal(slugify('A Late ADHD Diagnosis!'), 'a-late-adhd-diagnosis');
  assert.equal(requireSlug('a-safe-slug-2'), 'a-safe-slug-2');
  assert.throws(() => requireSlug('../unsafe'), /lowercase letters/i);
});

test('frontmatter round trips unknown metadata while changing known fields', () => {
  const original = `---\n# editorial context\ntitle: Old title\ncustomField:\n  nested: keep-me\ntags: [old]\n---\n\nOriginal body\n`;
  const parsed = splitMarkdown(original);
  assert.deepEqual(parsed.metadata.customField, { nested: 'keep-me' });
  const serialized = serializeMarkdown(original, { ...parsed.metadata, title: 'New title', tags: ['new'] }, 'New body\n');
  const roundTrip = splitMarkdown(serialized);
  assert.equal(roundTrip.metadata.title, 'New title');
  assert.deepEqual(roundTrip.metadata.customField, { nested: 'keep-me' });
  assert.equal(roundTrip.body, 'New body\n');
  assert.match(serialized, /# editorial context/);
});

test('new Markdown uses readable block frontmatter', () => {
  const serialized = serializeMarkdown(null, { title: 'New', tags: ['ADHD'], status: 'draft' }, 'Hello');
  assert.match(serialized, /^---\ntitle: New\ntags:\n  - ADHD\nstatus: draft\n---/);
});

test('drafts need a subject while publish requires all core fields', () => {
  const base = { title: 'Subject', description: 'Tagline', tags: ['ADHD'], publishDate: '2026-09-06T10:00:00.000Z' };
  const draft = validateEditorContent({ title: 'Subject' }, '', 'draft');
  assert.equal(draft.metadata.status, 'draft');
  assert.equal(draft.metadata.description, '');
  assert.equal(draft.metadata.author, 'late-diagnosed');
  assert.throws(() => validateEditorContent({}, '', 'draft'), /Subject is required/);
  assert.equal(validateEditorContent(base, 'Article body', 'publish').metadata.status, 'published');
  assert.throws(() => validateEditorContent({ ...base, tags: [] }, 'Article body', 'publish'), /at least one tag/);
  assert.throws(() => validateEditorContent(base, '', 'publish'), /Body is required/);
  assert.throws(() => validateEditorContent({ ...base, reviewDate: 'not-a-date' }, 'Article body', 'publish'), /reviewDate must be a valid date/);
  assert.throws(() => validateEditorContent({ ...base, canonicalUrl: 'relative/path' }, 'Article body', 'publish'), /absolute URL/);
  const normalized = validateEditorContent({ ...base, heroImage: 42, audience: ['general', 'unsupported'] }, 'Article body', 'publish');
  assert.equal('heroImage' in normalized.metadata, false);
  assert.deepEqual(normalized.metadata.audience, ['general']);
});

test('editor UI contains the required core, advanced, technical, preview, and unsaved-change controls', async () => {
  const source = await readFile(new URL('../src/components/ContentEditorForm.astro', import.meta.url), 'utf8');
  for (const label of ['Subject', 'Tagline', 'Tags', 'Date', 'Time', 'Body', 'Advanced', 'Super User / Technical']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /formaction="\/account\/content\/preview\/"/);
  assert.match(source, /beforeunload/);
  assert.match(source, /Save draft/);
  assert.match(source, />Publish</);
  assert.match(source, /Complete metadata \(JSON\)/);
  assert.match(source, /sandbox/);
});
