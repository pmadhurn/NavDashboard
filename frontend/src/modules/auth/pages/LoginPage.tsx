import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Button, Typography } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useLogin } from '@/modules/auth/hooks/useAuth'
import { useAuthStore } from '@/shared/stores/authStore'
import { AxiosError } from 'axios'

const { Title, Text } = Typography

interface ApiErrorResponse {
  detail: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = () => {
    setError('')
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate('/', { replace: true })
        },
        onError: (err) => {
          const axiosError = err as AxiosError<ApiErrorResponse>
          setError(axiosError.response?.data?.detail || 'Login failed')
        },
      },
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 16,
          padding: 48,
          width: 400,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#F2F2F2', fontSize: 32, marginBottom: 8 }}>
            NavDashboard
          </Title>
          <Text style={{ color: '#7A7A7A', fontSize: 14 }}>Sign in to continue</Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            size="large"
            placeholder="Email"
            prefix={<MailOutlined style={{ color: '#7A7A7A' }} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Input.Password
            size="large"
            placeholder="Password"
            prefix={<LockOutlined style={{ color: '#7A7A7A' }} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {error && (
            <Text style={{ color: '#9B3E3E', fontSize: 13 }}>{error}</Text>
          )}

          <Button
            type="primary"
            size="large"
            block
            loading={login.isPending}
            onClick={handleSubmit}
            style={{ marginTop: 8, height: 44, fontWeight: 600 }}
          >
            Sign In
          </Button>
        </div>
      </div>
    </div>
  )
}