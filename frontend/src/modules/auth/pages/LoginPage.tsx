import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { message } from 'antd';
import GlassCard from '@/shared/components/GlassCard';
import GlassInput from '@/shared/components/GlassInput';
import GlassButton from '@/shared/components/GlassButton';
import { useLogin, useGoogleLogin } from '@/modules/auth/hooks/useAuth';
import { useAuthStore } from '@/shared/stores/authStore';
import GoogleSignInButton, { googleSignInEnabled } from '@/modules/auth/components/GoogleSignInButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const { mutate: login, isPending } = useLogin();
  const { mutate: googleLogin } = useGoogleLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const handleGoogleCredential = (credential: string) => {
    googleLogin(credential, {
      onSuccess: (data) => {
        if (data.pending) {
          setPendingMessage(
            data.message || 'Your account is awaiting admin approval.'
          );
        } else if (data.token) {
          navigate('/', { replace: true });
        }
      },
      onError: () => {
        message.error('Google sign-in failed');
      },
    });
  };

  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      message.error('Please enter email and password');
      return;
    }
    login(
      { email, password },
      {
        onSuccess: () => {
          navigate('/', { replace: true });
        },
        onError: () => {
          message.error('Invalid email or password');
        },
      }
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A0A',
        padding: 24,
      }}
    >
      <GlassCard padding="lg" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#E6E6E6',
              margin: 0,
              letterSpacing: 1,
              textShadow: '0 0 20px rgba(230, 230, 230, 0.15)',
            }}
          >
            NavDashboard
          </h1>
          <p style={{ color: '#7A7A7A', fontSize: 13, marginTop: 8 }}>
            Sign in to your account
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                color: '#B8B8B8',
                fontSize: 13,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Email
            </label>
            <GlassInput
              type="email"
              placeholder="admin@navdashboard.com"
              value={email}
              onChange={setEmail}
              prefix={<MailOutlined style={{ color: '#7A7A7A' }} />}
              size="lg"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                color: '#B8B8B8',
                fontSize: 13,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Password
            </label>
            <GlassInput
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={setPassword}
              prefix={<LockOutlined style={{ color: '#7A7A7A' }} />}
              size="lg"
            />
          </div>
          <GlassButton
            variant="primary"
            htmlType="submit"
            loading={isPending}
            fullWidth
            size="lg"
          >
            Sign In
          </GlassButton>
        </form>
        {pendingMessage && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(139, 195, 74, 0.08)',
              border: '1px solid rgba(139, 195, 74, 0.25)',
              color: '#B8B8B8',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            {pendingMessage}
          </div>
        )}
        {googleSignInEnabled && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                margin: '20px 0',
                color: '#7A7A7A',
                fontSize: 12,
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              or
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>
            <GoogleSignInButton onCredential={handleGoogleCredential} />
          </>
        )}
      </GlassCard>
    </div>
  );
}