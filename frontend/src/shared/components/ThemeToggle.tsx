import { BulbOutlined, MoonOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useThemeStore } from '@/shared/stores/themeStore';
import { colors } from '@/styles/theme';

/**
 * Light/dark switch, pinned bottom-left above the sidebar collapse control.
 */
export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = mode === 'dark';
  const label = isDark ? 'Switch to light' : 'Switch to dark';

  return (
    <Tooltip title={collapsed ? label : ''} placement="right">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '8px 0' : '8px 12px',
          background: 'transparent',
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          color: colors.text.secondary,
          cursor: 'pointer',
          fontSize: 13,
          transition: 'background 0.2s ease, color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.sidebar.hover;
          e.currentTarget.style.color = colors.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = colors.text.secondary;
        }}
      >
        {isDark ? <BulbOutlined /> : <MoonOutlined />}
        {!collapsed && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
      </button>
    </Tooltip>
  );
}
