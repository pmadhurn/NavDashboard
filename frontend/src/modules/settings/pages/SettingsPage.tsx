import React from 'react';
import { Tabs } from 'antd';
import { SettingOutlined, TeamOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GeneralSettings from '../components/GeneralSettings';
import UserManagement from '../components/UserManagement';
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
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="System configuration and user management"
      />
      <Tabs
        items={tabItems}
        defaultActiveKey="general"
        style={{ color: '#F2F2F2' }}
        tabBarStyle={{
          borderBottom: '1px solid #242424',
          marginBottom: 24,
        }}
      />

      <style>{`
        .ant-tabs-tab {
          color: #7A7A7A !important;
          font-size: 14px !important;
          padding: 8px 16px !important;
        }
        .ant-tabs-tab:hover {
          color: #B8B8B8 !important;
        }
        .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #E6E6E6 !important;
        }
        .ant-tabs-ink-bar {
          background: #E6E6E6 !important;
        }
      `}</style>
    </div>
  );
}
