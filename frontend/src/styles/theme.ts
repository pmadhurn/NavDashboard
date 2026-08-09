import { theme } from 'antd';

/**
 * Two palettes, one token set.
 *
 * `colors.*` returns `var(--token)` strings rather than hex, so any inline
 * style that uses a token follows the active theme with no re-render. The raw
 * palettes below are still exported because two things cannot consume a CSS
 * variable: antd's ConfigProvider (it parses colours to derive its own scales)
 * and any code doing string maths on a hex value — see `alpha()`.
 *
 * The variables themselves are declared in styles/global.css, under `:root`
 * (dark, the default) and `[data-theme='light']`.
 */

type Palette = typeof darkPalette;

export const darkPalette = {
  primary: '#E6E6E6',
  secondary: '#9FA3A8',
  bgMain: '#0A0A0A',
  bgCard: '#141414',
  bgSidebar: '#0F0F0F',
  textPrimary: '#F2F2F2',
  textSecondary: '#B8B8B8',
  textMuted: '#7A7A7A',
  border: '#242424',
  statusWorking: '#5F8F6B',
  statusNotWorking: '#B68A3C',
  statusFaulty: '#9B3E3E',
  sidebarBg: '#0F0F0F',
  sidebarActive: '#1E1E1E',
  sidebarHover: '#1A1A1A',
  sidebarIcon: '#C8C8C8',
  btnPrimaryBg: '#E6E6E6',
  btnPrimaryText: '#0A0A0A',
  btnSecondary: '#2A2A2A',
  btnDanger: '#8A3A3A',
  btnDisabled: '#3A3A3A',
  tableHeader: '#151515',
  tableAltRow: '#111111',
  tableHover: '#1C1C1C',
  tableSelected: '#242424',
  inputBorder: '#2A2A2A',
  inputFocus: '#C9C9C9',
  inputError: '#A14242',
  formSuccess: '#5F8F6B',
  dropdownBg: '#1F1F1F',
  tagIu: '#6B7F8C',
  tagOu: '#8C6B7C',
  tagHc: '#6B8C7A',
  tagRf: '#8C836B',
  severityLow: '#6E6E6E',
  severityMedium: '#B68A3C',
  severityHigh: '#9B3E3E',
  // Was #6E2C2C: the darkest colour in the ramp, so the most severe state was
  // also the least visible on #141414 (1.81:1) and sat only ΔE 10.8 from
  // `high`. #D97068 reverses that — severity escalates in brightness, and every
  // adjacent pair clears the ΔE 15 normal-vision floor and the CVD floor.
  severityCritical: '#D97068',
  roleAdmin: '#8C8C8C',
  roleTechnician: '#6F7A8C',
  roleViewer: '#6E6E6E',
  dashCardSecondary: '#1A1A1A',
  dashAccentEdge: '#2E2E2E',
  chart1: '#D6D6D6',
  chart2: '#A8A8A8',
  chart3: '#7A7A7A',
  chart4: '#5A5A5A',
  chartGrid: '#262626',
  auditLine: '#2C2C2C',
  auditCreate: '#5F8F6B',
  auditUpdate: '#7A7A7A',
  auditDelete: '#9B3E3E',
  diffMatch: '#4F7A63',
  diffDifference: '#8A5C3C',
  chatUserBubble: '#2A2A2A',
  chatAiBubble: '#141414',
  chatBg: '#0B0B0B',
  chatTyping: '#8C8C8C',
  notifInfo: '#6E7E8A',
  notifSuccess: '#5F8F6B',
  notifWarning: '#B68A3C',
  notifError: '#9B3E3E',
  // Surface overlays. In dark these lighten, in light they darken — which is
  // why they are tokens and not literal rgba(255,255,255,…) sprinkled inline.
  overlaySubtle: 'rgba(255, 255, 255, 0.04)',
  overlayMedium: 'rgba(255, 255, 255, 0.08)',
  overlayStrong: 'rgba(255, 255, 255, 0.15)',
  glassBg: 'rgba(255, 255, 255, 0.03)',
  headerBg: 'rgba(10, 10, 10, 0.8)',
};

/**
 * Light palette. Not an inversion — greys are re-picked so text keeps its
 * contrast ratios against a white-ish surface, and the accent colours are
 * darkened rather than reused, because the dark-mode versions were chosen to
 * sit on #141414 and wash out on #FFFFFF.
 */
export const lightPalette: Palette = {
  primary: '#1F1F1F',
  secondary: '#5A6067',
  bgMain: '#F5F6F7',
  bgCard: '#FFFFFF',
  bgSidebar: '#FFFFFF',
  textPrimary: '#14171A',
  textSecondary: '#41474D',
  textMuted: '#6B7280',
  border: '#E1E4E8',
  statusWorking: '#2F6B45',
  statusNotWorking: '#8A6212',
  statusFaulty: '#B3261E',
  sidebarBg: '#FFFFFF',
  sidebarActive: '#ECEFF2',
  sidebarHover: '#F2F4F6',
  sidebarIcon: '#41474D',
  btnPrimaryBg: '#1F1F1F',
  btnPrimaryText: '#FFFFFF',
  btnSecondary: '#E8EAED',
  btnDanger: '#B3261E',
  btnDisabled: '#C7CBD1',
  tableHeader: '#F0F2F4',
  tableAltRow: '#FAFBFC',
  tableHover: '#EEF1F4',
  tableSelected: '#E3E8ED',
  inputBorder: '#D2D6DB',
  inputFocus: '#1F1F1F',
  inputError: '#B3261E',
  formSuccess: '#2F6B45',
  dropdownBg: '#FFFFFF',
  tagIu: '#3E5666',
  tagOu: '#6B3E56',
  tagHc: '#2F5E46',
  tagRf: '#6B5E2F',
  severityLow: '#6B7280',
  severityMedium: '#8A6212',
  severityHigh: '#B3261E',
  severityCritical: '#8C1D18',
  roleAdmin: '#5A6067',
  roleTechnician: '#3E5666',
  roleViewer: '#6B7280',
  dashCardSecondary: '#F7F8F9',
  dashAccentEdge: '#D8DCE0',
  chart1: '#3A3A3A',
  chart2: '#6B6B6B',
  chart3: '#9A9A9A',
  chart4: '#C0C0C0',
  chartGrid: '#E4E7EA',
  auditLine: '#DDE1E5',
  auditCreate: '#2F6B45',
  auditUpdate: '#6B7280',
  auditDelete: '#B3261E',
  diffMatch: '#2F6B4F',
  diffDifference: '#8A5C1E',
  chatUserBubble: '#E8EAED',
  chatAiBubble: '#FFFFFF',
  chatBg: '#F5F6F7',
  chatTyping: '#6B7280',
  notifInfo: '#3E5666',
  notifSuccess: '#2F6B45',
  notifWarning: '#8A6212',
  notifError: '#B3261E',
  overlaySubtle: 'rgba(0, 0, 0, 0.04)',
  overlayMedium: 'rgba(0, 0, 0, 0.08)',
  overlayStrong: 'rgba(0, 0, 0, 0.15)',
  glassBg: 'rgba(255, 255, 255, 0.72)',
  headerBg: 'rgba(245, 246, 247, 0.85)',
};

export type ThemeMode = 'dark' | 'light';

export const paletteFor = (mode: ThemeMode): Palette =>
  mode === 'light' ? lightPalette : darkPalette;

/** kebab-case CSS variable name for a palette key. */
export const cssVarName = (key: keyof Palette): string =>
  '--' + String(key).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

const v = (key: keyof Palette) => `var(${cssVarName(key)})`;

/**
 * Semi-transparent version of a token, for inline styles.
 *
 * Replaces the old `${hexColor}1F` string concatenation, which silently
 * produced an invalid colour the moment the value became a CSS variable.
 */
export const alpha = (cssColor: string, percent: number): string =>
  `color-mix(in srgb, ${cssColor} ${percent}%, transparent)`;

/**
 * Theme-reactive token references. Shape is kept identical to the original
 * export so existing `colors.text.primary` call sites keep working.
 */
export const colors = {
  primary: v('primary'),
  secondary: v('secondary'),
  bg: { main: v('bgMain'), card: v('bgCard'), sidebar: v('bgSidebar') },
  text: { primary: v('textPrimary'), secondary: v('textSecondary'), muted: v('textMuted') },
  border: v('border'),
  status: {
    working: v('statusWorking'),
    notWorking: v('statusNotWorking'),
    faulty: v('statusFaulty'),
  },
  sidebar: {
    bg: v('sidebarBg'),
    active: v('sidebarActive'),
    hover: v('sidebarHover'),
    icon: v('sidebarIcon'),
  },
  btn: {
    primaryBg: v('btnPrimaryBg'),
    primaryText: v('btnPrimaryText'),
    secondary: v('btnSecondary'),
    danger: v('btnDanger'),
    disabled: v('btnDisabled'),
  },
  table: {
    header: v('tableHeader'),
    altRow: v('tableAltRow'),
    hover: v('tableHover'),
    selected: v('tableSelected'),
  },
  input: { border: v('inputBorder'), focus: v('inputFocus'), error: v('inputError') },
  form: { success: v('formSuccess') },
  dropdown: { bg: v('dropdownBg') },
  tag: { iu: v('tagIu'), ou: v('tagOu'), hc: v('tagHc'), rf: v('tagRf') },
  severity: {
    low: v('severityLow'),
    medium: v('severityMedium'),
    high: v('severityHigh'),
    critical: v('severityCritical'),
  },
  role: { admin: v('roleAdmin'), technician: v('roleTechnician'), viewer: v('roleViewer') },
  dashboard: {
    cardSecondary: v('dashCardSecondary'),
    accentEdge: v('dashAccentEdge'),
    chart1: v('chart1'),
    chart2: v('chart2'),
    chart3: v('chart3'),
    chart4: v('chart4'),
    chartGrid: v('chartGrid'),
  },
  audit: {
    line: v('auditLine'),
    create: v('auditCreate'),
    update: v('auditUpdate'),
    delete: v('auditDelete'),
  },
  diff: { match: v('diffMatch'), difference: v('diffDifference') },
  chat: {
    userBubble: v('chatUserBubble'),
    aiBubble: v('chatAiBubble'),
    bg: v('chatBg'),
    typing: v('chatTyping'),
  },
  notif: {
    info: v('notifInfo'),
    success: v('notifSuccess'),
    warning: v('notifWarning'),
    error: v('notifError'),
  },
  overlay: {
    subtle: v('overlaySubtle'),
    medium: v('overlayMedium'),
    strong: v('overlayStrong'),
  },
  glassBg: v('glassBg'),
  headerBg: v('headerBg'),
};

/**
 * antd config for a mode. Must use raw hex: ConfigProvider derives hover and
 * active shades by parsing these, and cannot parse `var(--x)`.
 */
export function buildAntdTheme(mode: ThemeMode) {
  const p = paletteFor(mode);
  return {
    algorithm: mode === 'light' ? theme.defaultAlgorithm : theme.darkAlgorithm,
    token: {
      colorPrimary: p.primary,
      colorBgBase: p.bgMain,
      colorBgContainer: p.bgCard,
      colorBgElevated: p.bgCard,
      colorBgLayout: p.bgMain,
      colorText: p.textPrimary,
      colorTextSecondary: p.textSecondary,
      colorTextTertiary: p.textMuted,
      colorBorder: p.border,
      colorBorderSecondary: p.border,
      borderRadius: 8,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      colorError: p.inputError,
      colorSuccess: p.formSuccess,
      colorWarning: p.severityMedium,
      colorInfo: p.notifInfo,
    },
    components: {
      Button: {
        colorPrimary: p.btnPrimaryBg,
        colorPrimaryHover: mode === 'light' ? '#000000' : '#FFFFFF',
        colorPrimaryActive: mode === 'light' ? '#333333' : '#D0D0D0',
        primaryColor: p.btnPrimaryText,
        borderRadius: 8,
      },
      Input: {
        colorBgContainer: p.overlaySubtle,
        colorBorder: p.inputBorder,
        activeBorderColor: p.inputFocus,
        hoverBorderColor: p.overlayStrong,
        activeShadow: `0 0 0 2px ${p.overlayMedium}`,
        borderRadius: 8,
      },
      Table: {
        colorBgContainer: 'transparent',
        headerBg: p.tableHeader,
        headerColor: p.textSecondary,
        rowHoverBg: p.tableHover,
        headerBorderRadius: 0,
        borderColor: p.border,
      },
      Menu: {
        darkItemBg: 'transparent',
        darkItemColor: p.textSecondary,
        darkItemHoverBg: p.sidebarHover,
        darkItemHoverColor: p.textPrimary,
        darkItemSelectedBg: p.sidebarActive,
        darkItemSelectedColor: p.textPrimary,
        itemBg: 'transparent',
        itemColor: p.textSecondary,
        itemHoverBg: p.sidebarHover,
        itemHoverColor: p.textPrimary,
        itemSelectedBg: p.sidebarActive,
        itemSelectedColor: p.textPrimary,
        itemBorderRadius: 8,
        iconSize: 18,
        itemMarginInline: 8,
        itemMarginBlock: 4,
      },
      Modal: {
        contentBg: p.bgCard,
        headerBg: 'transparent',
        titleColor: p.textPrimary,
      },
      Spin: { colorPrimary: p.primary },
      Breadcrumb: {
        itemColor: p.textMuted,
        lastItemColor: p.textSecondary,
        linkColor: p.textMuted,
        linkHoverColor: p.textPrimary,
        separatorColor: p.textMuted,
      },
    },
  };
}

/** Back-compat for any call site still importing the dark config directly. */
export const antdThemeConfig = buildAntdTheme('dark');
