import assert from 'node:assert/strict';
import test from 'node:test';
import { showDesignModules } from '../src/lib/home/preview.ts';

test('design modules are visible on preview and local development only', () => {
  assert.equal(showDesignModules('preview.latediagnosed.org'), true);
  assert.equal(showDesignModules('localhost'), true);
  assert.equal(showDesignModules('127.0.0.1'), true);
  for (const host of ['latediagnosed.org','www.latediagnosed.org','preview.latediagnosed.org.example.com']) {
    assert.equal(showDesignModules(host), false);
  }
});
