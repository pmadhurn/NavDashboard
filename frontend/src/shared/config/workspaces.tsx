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
} from '@ant-design/icons';
import { hasPermission, PermissionLevel } from '@/shared/stores/authStore';

export interface WorkspaceItem {
  key: string; // route path
  icon: React.ReactNode;
  label: string;
  /** Permission section required to see this entry; undefined = everyone. */
  section?: string;
  /** Minimum level on that section (defaults to VIEW). */
  level?: PermissionLevel;
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

type User = Parameters<typeof hasPermission>[0];

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
    key: 'field',
    label: 'Field Operations',
    shortLabel: 'Field',
    accent: 'var(--status-not-working)',
    icon: <ThunderboltOutlined />,
    items: [
      { key: '/projects', icon: <ProjectOutlined />, label: 'Projects', section: 'projects' },
      { key: '/inventory/assets', icon: <AppstoreOutlined />, label: 'Inventory', section: 'inventory' },
      { key: '/inventory/deployed', icon: <DeploymentUnitOutlined />, label: 'Deployed', section: 'inventory' },
      { key: '/documents', icon: <FileOutlined />, label: 'Documents', section: 'documents' },
    ],
  },
  {
    key: 'device',
    label: 'Device Management',
    shortLabel: 'Devices',
    accent: '#5E8C86',
    icon: <ClusterOutlined />,
    items: [
      { key: '/devices', icon: <ApiOutlined />, label: 'Devices', section: 'devices' },
      { key: '/couples', icon: <LinkOutlined />, label: 'Couples', section: 'devices' },
      { key: '/pairs', icon: <SwapOutlined />, label: 'Pairs', section: 'devices' },
      { key: '/map', icon: <EnvironmentOutlined />, label: 'Map', section: 'devices' },
      { key: '/location-history', icon: <HistoryOutlined />, label: 'Location History', section: 'devices' },
      { key: '/troubleshooting', icon: <ToolOutlined />, label: 'Troubleshooting', section: 'troubleshooting' },
      { key: '/comparison', icon: <DiffOutlined />, label: 'Comparison', section: 'devices' },
      { key: '/reports', icon: <BarChartOutlined />, label: 'Reports', section: 'reports' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    accent: 'var(--status-working)',
    icon: <BankOutlined />,
    items: [
      { key: '/finance/my', icon: <WalletOutlined />, label: 'My Finance', section: 'finance' },
      { key: '/finance', icon: <DollarOutlined />, label: 'Expenses', section: 'finance' },
      { key: '/finance/claims', icon: <FileTextOutlined />, label: 'Claims', section: 'finance' },
      {
        key: '/finance/settlement',
        icon: <AuditOutlined />,
        label: 'Settlement',
        section: 'finance',
        level: 'MANAGE',
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
      { key: '/downloads', icon: <CloudDownloadOutlined />, label: 'Library', section: 'downloads' },
    ],
  },
  {
    key: 'people',
    label: 'People',
    accent: '#9E7E8A',
    icon: <TeamOutlined />,
    items: [
      { key: '/personnel', icon: <TeamOutlined />, label: 'Personnel', section: 'personnel' },
    ],
  },
  {
    key: 'assistant',
    label: 'Assistant',
    accent: '#7E6F9E',
    icon: <RobotOutlined />,
    items: [
      { key: '/ai', icon: <RobotOutlined />, label: 'AI Assistant', section: 'ai' },
      // /search was previously in no workspace at all — reachable only by typing
      // the URL or via the header box. It lives here now.
      { key: '/search', icon: <SearchOutlined />, label: 'Search', section: undefined },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    accent: 'var(--role-technician)',
    icon: <SafetyOutlined />,
    items: [
      { key: '/settings', icon: <SettingOutlined />, label: 'Users & Settings', section: 'admin' },
      { key: '/audit', icon: <AuditOutlined />, label: 'Audit Trail', section: 'admin' },
      { key: '/backup', icon: <CloudDownloadOutlined />, label: 'Backup', section: 'admin' },
    ],
  },
];

/** Items in a workspace the given user is allowed to see. */
export function visibleItems(workspace: Workspace, user: User): WorkspaceItem[] {
  return workspace.items.filter(
    (item) => !item.section || hasPermission(user, item.section, item.level ?? 'VIEW')
  );
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
