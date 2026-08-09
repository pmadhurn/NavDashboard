import { Tabs } from 'antd';
import { DatabaseOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GeneralSettings from '../components/GeneralSettings';
import UserManagement from '../components/UserManagement';
import DemoDataSettings from '../components/DemoDataSettings';
import { useAuthStore } from '@/shared/stores/authStore';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const tabItems = [
    {
      key: 'general',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SettingOutlined />
          General
        </span>
      ),
      children: <GeneralSettings />,
    },
    ...(isAdmin
      ? [
          {
            key: 'users',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TeamOutlined />
                User Management
              </span>
            ),
            children: <UserManagement />,
          },
          {
            key: 'demo-data',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <DatabaseOutlined />
                Demo Data
              </span>
            ),
            children: <DemoDataSettings />,
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="Users, permissions, and system configuration"
      />
      <Tabs
        items={tabItems}
        defaultActiveKey="general"
        style={{ color: 'var(--text-primary)' }}
        tabBarStyle={{
          borderBottom: '1px solid var(--border)',
          marginBottom: 24,
        }}
      />

      <style>{`
        .ant-tabs-tab {
          color: var(--text-muted) !important;
          font-size: 14px !important;
          padding: 8px 16px !important;
        }
        .ant-tabs-tab:hover {
          color: var(--text-secondary) !important;
        }
        .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: var(--primary) !important;
        }
        .ant-tabs-ink-bar {
          background: var(--primary) !important;
        }
      `}</style>
    </div>
  );
}
