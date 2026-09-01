import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TOOLS_PAGE_LAUNCHERS,
  canAccessLauncher,
  getDisplayRoles,
  getVisibleLaunchers,
  type ToolsPageLauncher,
} from '../src/lib/tools-page.ts';

test('universal actions remain visible without application entitlements', () => {
  assert.deepEqual(getVisibleLaunchers([]).map((launcher) => launcher.id), ['donate']);
});

test('Tools entitlements expose the matching launcher', () => {
  const visible = getVisibleLaunchers(['Tools - WebMail', 'Tools - Confluence']);
  assert.deepEqual(visible.map((launcher) => launcher.id), ['webmail', 'confluence', 'donate']);
});

test('legacy Content Center entitlements remain accepted during migration', () => {
  const visible = getVisibleLaunchers(['Content Center - WebMail', 'Content Center - Confluence']);
  assert.deepEqual(visible.map((launcher) => launcher.id), ['webmail', 'confluence', 'donate']);
});

test('existing CMS Editors permission continues to expose Content Editor', () => {
  const visible = getVisibleLaunchers(['CMS Editors']);
  assert.equal(visible.some((launcher) => launcher.id === 'content-editor'), true);
});

test('a launcher with multiple allowed groups uses ANY access by default and renders once', () => {
  const sharedLauncher: ToolsPageLauncher = {
    id: 'shared',
    label: 'Shared tool',
    description: 'Shared access test.',
    icon: 'circle',
    href: '/shared',
    allowedGroups: ['Staff', 'Volunteer'],
  };

  assert.equal(canAccessLauncher(['Staff'], sharedLauncher), true);
  assert.equal(canAccessLauncher(['Volunteer'], sharedLauncher), true);
  assert.equal(canAccessLauncher(['Staff', 'Volunteer'], sharedLauncher), true);
  assert.equal(getVisibleLaunchers(['Staff', 'Volunteer'], [sharedLauncher]).length, 1);
});

test('ALL access requires every configured group', () => {
  const restrictedLauncher: ToolsPageLauncher = {
    id: 'restricted',
    label: 'Restricted tool',
    description: 'All-group access test.',
    icon: 'lock',
    href: '/restricted',
    allowedGroups: ['Staff', 'Approver'],
    accessMode: 'all',
  };

  assert.equal(canAccessLauncher(['Staff'], restrictedLauncher), false);
  assert.equal(canAccessLauncher(['Staff', 'Approver'], restrictedLauncher), true);
});

test('duplicate registry IDs never render duplicate cards', () => {
  const original = TOOLS_PAGE_LAUNCHERS[0];
  assert.ok(original);
  assert.equal(getVisibleLaunchers(['Tools - WebMail'], [original, original]).length, 1);
});

test('organizational roles are derived separately from application entitlements', () => {
  assert.deepEqual(
    getDisplayRoles(['Volunteer', 'Staff', 'Tools - WebMail']),
    ['Volunteer', 'Staff'],
  );
});
