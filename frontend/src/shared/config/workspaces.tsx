import React from 'react';
import {
  ApiOutlined,
  LinkOutlined,
  SwapOutlined,
  EnvironmentOutlined,
  ToolOutlined,
  HistoryOutlined,
  DiffOutlined,
  BarChartOutlined,
  ProjectOutlined,
  AppstoreOutlined,
  DeploymentUnitOutlined,
  DownloadOutlined,
  FileOutlined,
  DollarOutlined,
  WalletOutlined,
  FileTextOutlined,
  RobotOutlined,
  TeamOutlined,
  AuditOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
  ClusterOutlined,
  BankOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  HomeOutlined,
  SearchOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { can } from '@/shared/stores/authStore';

export interface WorkspaceItem {
  key: string; // route path
  icon: React.ReactNode;
  label: string;
  /**
   * Permission key required to see this entry; undefined = every signed-in
   * user. Hiding an entry is a courtesy — the route guard and the server both
   * check again.
   */
  permission?: string;
}

export interface Workspace {
  key: string;
  label: string;
  /** Short label for the mobile tab bar, where horizontal room is scarce. */
  shortLabel?: string;
  /** Subtle accent color applied to headers/active states in this workspace. */
  accent: string;
  icon: React.ReactNode;
  items: WorkspaceItem[];
}

type User = Parameters<typeof can>[0];

/**
 * The single source of truth for navigation. A workspace is a top-bar tab; its
 * items are the contextual sidebar. Adding a module costs one entry here.
 *
 * Order is deliberate — daily-use first, administration last. `shortLabel`
 * exists because the mobile tab bar has roughly 8 characters per slot.
 */
export const WORKSPACES: Workspace[] = [
  {
    key: 'home',
    label: 'Home',
    accent: 'var(--secondary)',
    icon: <HomeOutlined />,
    items: [{ key: '/', icon: <HomeOutlined />, label: 'Overview' }],
  },
  {
    // A destination, not a workspace: one page, no sub-nav, visible only to
    // holders of leadership:VIEW. It is the whole app for the person who only
    // needs to see, not to do.
    key: 'leadership',
    label: 'Leadership',
    shortLabel: 'Lead',
    accent: '#B68A3C',
    icon: <CrownOutlined />,
    items: [
      { key: '/leadership', icon: <CrownOutlined />, label: 'Overview', permission: 'leadership.read' },
    ],
  },
  {
    // The field user's whole app in one tab: what they log daily, on a phone.
    // Scattering these under People and Finance would make the most common
    // user the worst-served one.
    key: 'me',
    label: 'My Work',
    shortLabel: 'Me',
    accent: '#6F8CB6',
    icon: <CalendarOutlined />,
    items: [
      { key: '/me/attendance', icon: <CalendarOutlined />, label: 'My Attendance', permission: 'attendance.read' },
      { key: '/finance/my', icon: <WalletOutlined />, label: 'My Finance', permission: 'finance.read' },
      { key: '/updates', icon: <MessageOutlined />, label: 'Daily Updates', permission: 'updates.read' },
    ],
  },
  {
    key: 'field',
    label: 'Field Operations',
    shortLabel: 'Field',
    accent: 'var(--status-not-working)',
    icon: <ThunderboltOutlined />,
    items: [
      { key: '/projects', icon: <ProjectOutlined />, label: 'Projects', permission: 'projects.read' },
      { key: '/inventory/assets', icon: <AppstoreOutlined />, label: 'Inventory', permission: 'assets.read' },
      { key: '/inventory/deployed', icon: <DeploymentUnitOutlined />, label: 'Deployed', permission: 'assets.read' },
      { key: '/documents', icon: <FileOutlined />, label: 'Documents', permission: 'documents.read' },
    ],
  },
  {
    key: 'device',
    label: 'Device Management',
    shortLabel: 'Devices',
    accent: '#5E8C86',
    icon: <ClusterOutlined />,
    items: [
      { key: '/devices', icon: <ApiOutlined />, label: 'Devices', permission: 'devices.read' },
      { key: '/couples', icon: <LinkOutlined />, label: 'Couples', permission: 'devices.read' },
      { key: '/pairs', icon: <SwapOutlined />, label: 'Pairs', permission: 'devices.read' },
      { key: '/map', icon: <EnvironmentOutlined />, label: 'Map', permission: 'devices.read' },
      { key: '/location-history', icon: <HistoryOutlined />, label: 'Location History', permission: 'devices.read' },
      { key: '/troubleshooting', icon: <ToolOutlined />, label: 'Troubleshooting', permission: 'troubleshooting.read' },
      { key: '/comparison', icon: <DiffOutlined />, label: 'Comparison', permission: 'devices.read' },
      { key: '/reports', icon: <BarChartOutlined />, label: 'Reports', permission: 'reports.read' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    accent: 'var(--status-working)',
    icon: <BankOutlined />,
    items: [
      { key: '/finance/my', icon: <WalletOutlined />, label: 'My Finance', permission: 'finance.read' },
      { key: '/finance', icon: <DollarOutlined />, label: 'Expenses', permission: 'finance.read' },
      { key: '/finance/claims', icon: <FileTextOutlined />, label: 'Claims', permission: 'finance.read' },
      {
        key: '/finance/settlement',
        icon: <AuditOutlined />,
        label: 'Settlement',
        permission: 'finance.settle'
      },
    ],
  },
  {
    // Downloads is a standalone archive of software and downloadable material —
    // deliberately NOT the documents users upload against a project. It gets its
    // own tab so the two are never confused.
    key: 'downloads',
    label: 'Downloads',
    accent: '#7E8FA6',
    icon: <DownloadOutlined />,
    items: [
      { key: '/downloads', icon: <CloudDownloadOutlined />, label: 'Library', permission: 'downloads.read' },
    ],
  },
  {
    key: 'people',
    label: 'People',
    accent: '#9E7E8A',
    icon: <TeamOutlined />,
    items: [
      { key: '/personnel', icon: <TeamOutlined />, label: 'Personnel', permission: 'personnel.read' },
      { key: '/attendance', icon: <CalendarOutlined />, label: 'Attendance Board', permission: 'attendance.board' },
      { key: '/updates', icon: <MessageOutlined />, label: 'Daily Updates', permission: 'updates.read' },
      { key: '/compoff', icon: <ClockCircleOutlined />, label: 'Comp-off', permission: 'attendance.compoff' },
    ],
  },
  {
    key: 'assistant',
    label: 'Assistant',
    accent: '#7E6F9E',
    icon: <RobotOutlined />,
    items: [
      { key: '/ai', icon: <RobotOutlined />, label: 'AI Assistant', permission: 'ai.read' },
      // /search was previously in no workspace at all — reachable only by typing
      // the URL or via the header box. It lives here now.
      { key: '/search', icon: <SearchOutlined />, label: 'Search', permission: 'search.read' },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    accent: 'var(--role-technician)',
    icon: <SafetyOutlined />,
    items: [
      { key: '/settings/access', icon: <SafetyOutlined />, label: 'Access Control', permission: 'users.read' },
      { key: '/settings', icon: <SettingOutlined />, label: 'Users & Settings', permission: 'settings.read' },
      { key: '/audit', icon: <AuditOutlined />, label: 'Audit Trail', permission: 'audit.read' },
      { key: '/backup', icon: <CloudDownloadOutlined />, label: 'Backup', permission: 'backup.read' },
    ],
  },
];

/** Items in a workspace the given user is allowed to see. */
export function visibleItems(workspace: Workspace, user: User): WorkspaceItem[] {
  return workspace.items.filter((item) => !item.permission || can(user, item.permission));
}

/** Workspaces that have at least one item the user can see. */
export function visibleWorkspaces(user: User): Workspace[] {
  return WORKSPACES.filter((ws) => visibleItems(ws, user).length > 0);
}

/**
 * A workspace whose only item is its own landing route has no useful sidebar —
 * rendering one would be a column of a single link. Those pages get the full
 * width instead.
 */
export function hasContextualNav(workspace: Workspace | undefined, user: User): boolean {
  return !!workspace && visibleItems(workspace, user).length > 1;
}

/** The workspace that owns a given route path (longest-prefix match). */
export function workspaceForPath(pathname: string): Workspace | undefined {
  let best: { ws: Workspace; len: number } | undefined;
  for (const ws of WORKSPACES) {
    for (const item of ws.items) {
      if (pathname === item.key || pathname.startsWith(item.key + '/')) {
        if (!best || item.key.length > best.len) best = { ws, len: item.key.length };
      }
    }
  }
  return best?.ws;
}

export function workspaceByKey(key: string): Workspace | undefined {
  return WORKSPACES.find((ws) => ws.key === key);
}
