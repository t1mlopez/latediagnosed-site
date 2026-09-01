export type LauncherAccessMode = 'any' | 'all';
export type LauncherTone = 'navy' | 'purple';

export interface ToolsPageLauncher {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  allowedGroups?: readonly string[];
  accessMode?: LauncherAccessMode;
  external?: boolean;
  order?: number;
  enabled?: boolean;
  tone?: LauncherTone;
}

export interface DisplayRoleMapping {
  label: string;
  groups: readonly string[];
}

export const TOOLS_PAGE_LAUNCHERS: readonly ToolsPageLauncher[] = [
  {
    id: 'webmail',
    label: 'WebMail',
    description: 'Open your Late Diagnosed email.',
    icon: 'mail',
    href: 'https://outlook.cloud.microsoft/mail/',
    allowedGroups: ['Tools - WebMail', 'Content Center - WebMail'],
    accessMode: 'any',
    external: true,
    order: 10,
    tone: 'navy',
  },
  {
    id: 'content-editor',
    label: 'Content Editor',
    description: 'Create and update Late Diagnosed website content.',
    icon: 'file-pen-line',
    href: '/admin/',
    allowedGroups: ['Tools - Content Editor', 'Content Center - Content Editor', 'CMS Editors'],
    accessMode: 'any',
    order: 20,
    tone: 'purple',
  },
  {
    id: 'confluence',
    label: 'Confluence',
    description: 'Open the Late Diagnosed internal knowledge base.',
    icon: 'book-open',
    href: 'https://latediagnosed.atlassian.net/wiki/spaces/Home/overview?homepageId=15532201',
    allowedGroups: ['Tools - Confluence', 'Content Center - Confluence'],
    accessMode: 'any',
    external: true,
    order: 30,
    tone: 'navy',
  },
  {
    id: 'donate',
    label: 'Donate',
    description: 'Support Late Diagnosed and help expand our resources and programs.',
    icon: 'heart-handshake',
    href: 'https://givebutter.com/late-diagnosed-donations-3akmpq',
    external: true,
    order: 40,
    tone: 'purple',
  },
];

export const DISPLAY_ROLE_MAPPINGS: readonly DisplayRoleMapping[] = [
  { label: 'Volunteer', groups: ['Volunteer'] },
  { label: 'Contributor', groups: ['Contributor'] },
  { label: 'Donor', groups: ['Donor'] },
  { label: 'Staff', groups: ['Staff'] },
];

export function canAccessLauncher(
  userGroups: readonly string[],
  launcher: ToolsPageLauncher,
): boolean {
  if (launcher.enabled === false) return false;

  const allowedGroups = launcher.allowedGroups?.filter(Boolean) ?? [];
  if (allowedGroups.length === 0) return true;

  const groups = new Set(userGroups);
  const mode = launcher.accessMode ?? 'any';
  return mode === 'all'
    ? allowedGroups.every((group) => groups.has(group))
    : allowedGroups.some((group) => groups.has(group));
}

export function getVisibleLaunchers(
  userGroups: readonly string[],
  launchers: readonly ToolsPageLauncher[] = TOOLS_PAGE_LAUNCHERS,
): ToolsPageLauncher[] {
  const seen = new Set<string>();

  return [...launchers]
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .filter((launcher) => {
      if (seen.has(launcher.id) || !canAccessLauncher(userGroups, launcher)) return false;
      seen.add(launcher.id);
      return true;
    });
}

export function getDisplayRoles(
  userGroups: readonly string[],
  mappings: readonly DisplayRoleMapping[] = DISPLAY_ROLE_MAPPINGS,
): string[] {
  const groups = new Set(userGroups);
  return mappings
    .filter((mapping) => mapping.groups.some((group) => groups.has(group)))
    .map((mapping) => mapping.label);
}
