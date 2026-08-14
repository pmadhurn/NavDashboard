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
  HeartOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  ImportOutlined,
  AppstoreAddOutlined,
  MessageOutlined,
  CrownOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  ReadOutlined,
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
    items: [
      { key: '/', icon: <HomeOutlined />, label: 'Overview' },
      // No permission: learning how the system works is for everyone.
      { key: '/learn', icon: <ReadOutlined />, label: 'Learn' },
    ],
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
      // No permission: your own to-do list is not a privilege.
      { key: '/me', icon: <CheckCircleOutlined />, label: 'My Day' },
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
      { key: '/documents', icon: <FileOutlined />, label: 'Documents', permission: 'documents.read' },
      // Downloads is a standalone archive of software and downloadable material —
      // deliberately NOT the documents users upload against a project. It kept its
      // own tab until 2026-08-12, when the bar ran out of room; it lives here now,
      // still as its own page so the two are never confused.
      { key: '/downloads', icon: <CloudDownloadOutlined />, label: 'Downloads', permission: 'downloads.read' },
    ],
  },
  {
    // Inventory serves the whole office, not just the field teams — finance
    // checks required items, R&D draws test equipment, the boss asks "what do
    // we need to buy". Promoted out of Field Operations on 2026-08-12.
    key: 'inventory',
    label: 'Inventory',
    shortLabel: 'Stock',
    accent: '#7E8FA6',
    icon: <AppstoreOutlined />,
    items: [
      { key: '/inventory/assets', icon: <AppstoreOutlined />, label: 'Assets', permission: 'assets.read' },
      { key: '/inventory/requests', icon: <ShoppingCartOutlined />, label: 'Required Items', permission: 'stock.requests.read' },
      // The movement pair: out on a gate pass, back against it. The old
      // "Record a return" page still exists at /inventory/returns for items
      // that come back without a pass — linked from the inward screen.
      { key: '/inventory/outward', icon: <ExportOutlined />, label: 'Take items out', permission: 'projects.equipment' },
      { key: '/inventory/inward', icon: <ImportOutlined />, label: 'Receive items back', permission: 'assets.returns' },
      { key: '/inventory/handovers', icon: <SwapOutlined />, label: 'Handovers', permission: 'assets.read' },
      { key: '/inventory/kits', icon: <AppstoreAddOutlined />, label: 'Kits', permission: 'assets.read' },
      { key: '/inventory/repairs', icon: <ToolOutlined />, label: 'Repairs', permission: 'assets.read' },
      { key: '/inventory/vendors', icon: <ShopOutlined />, label: 'Vendors', permission: 'stock.read' },
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
      // A "link" is two couples aligned and talking — the UI word is Links;
      // the API and database keep the historical name `pair`.
      { key: '/pairs', icon: <SwapOutlined />, label: 'Links', permission: 'devices.read' },
      { key: '/inventory/deployed', icon: <DeploymentUnitOutlined />, label: 'Deployed', permission: 'assets.read' },
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
      // Finance plans payments from the required-items list, so it lives in
      // both workspaces — same route, one page.
      { key: '/inventory/requests', icon: <ShoppingCartOutlined />, label: 'Required Items', permission: 'stock.requests.read' },
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
      // Developer surface: diagnostics do not travel with the Admin account.
      { key: '/system', icon: <HeartOutlined />, label: 'System Health', permission: 'system.health' },
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
