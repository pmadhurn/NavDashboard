import { useEffect, useState } from 'react'
import { Typography, Button, Tag } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/shared/stores/authStore'
import { useCurrentUser, useLogout } from '@/modules/auth/hooks/useAuth'
import { api } from '@/shared/api/client'

const { Title, Text } = Typography

interface HealthResponse {
  status: string
  environment: string
  database: string
  version: string
}

export function DashboardPage() {
  const user = useAuthStore(state => state.user)
  const logout = useLogout()
  const [health, setHealth] = useState<HealthResponse | null>(null)

  useCurrentUser()

  useEffect(() => {
    api.get<HealthResponse>('/health').then(setHealth).catch(() => {})
  }, [])

  const roleColor =
    user?.role === 'ADMIN' ? 'red' : user?.role === 'TECHNICIAN' ? 'blue' : 'default'

  return (
    <div style={{ padding: 48, maxWidth: 800, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <div>
          <Title level={2} style={{ color: '#F2F2F2', margin: 0 }}>
            Dashboard
          </Title>
          <Text style={{ color: '#B8B8B8', fontSize: 16 }}>
            Welcome, {user?.full_name || 'User'}
          </Text>
          <div style={{ marginTop: 8 }}>
            <Tag color={roleColor}>{user?.role}</Tag>
          </div>
        </div>
        <Button icon={<LogoutOutlined />} onClick={logout}>
          Logout
        </Button>
      </div>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 16,
          padding: 32,
        }}
      >
        <Title level={4} style={{ color: '#F2F2F2', marginBottom: 16 }}>
          System Health
        </Title>
        {health ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Text style={{ color: '#B8B8B8' }}>
              Status: <Text style={{ color: '#F2F2F2' }}>{health.status}</Text>
            </Text>
            <Text style={{ color: '#B8B8B8' }}>
              Environment: <Text style={{ color: '#F2F2F2' }}>{health.environment}</Text>
            </Text>
            <Text style={{ color: '#B8B8B8' }}>
              Database: <Text style={{ color: '#F2F2F2' }}>{health.database}</Text>
            </Text>
            <Text style={{ color: '#B8B8B8' }}>
              Version: <Text style={{ color: '#F2F2F2' }}>{health.version}</Text>
            </Text>
          </div>
        ) : (
          <Text style={{ color: '#7A7A7A' }}>Loading...</Text>
        )}
      </div>
    </div>
  )
}