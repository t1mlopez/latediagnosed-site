import assert from 'node:assert/strict';
import test from 'node:test';
import { selectHeroSlides } from '../src/lib/home/hero-slides.ts';

test('only numbered Astro snippets enter rotation in numeric order', () => {
  assert.deepEqual(selectHeroSlides({
    './10-third.astro':'third', './2-second.astro':'second', './01-first.astro':'first',
    './paused.astro':'paused', './README.md':'docs', './01-data.json':'data',
  }), ['first','second','third']);
});
test('removing a number disables a slide; restoring it enables it', () => {
  assert.deepEqual(selectHeroSlides({'./community.astro':'community'}), []);
  assert.deepEqual(selectHeroSlides({'./03-community.astro':'community'}), ['community']);
});
test('number gaps and matching-number ties have deterministic ordering', () => {
  assert.deepEqual(selectHeroSlides({'./20-z.astro':'z','./03-first.astro':'first','./20-a.astro':'a'}), ['first','a','z']);
});
test('empty folders produce no active slides for the fallback', () => {
  assert.deepEqual(selectHeroSlides({}), []);
});
