import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { message } from 'antd';
import GlassCard from '@/shared/components/GlassCard';
import GlassInput from '@/shared/components/GlassInput';
import GlassButton from '@/shared/components/GlassButton';
import { useLogin, useGoogleLogin, useClerkLogin } from '@/modules/auth/hooks/useAuth';
import { useAuthStore } from '@/shared/stores/authStore';
import GoogleSignInButton, { googleSignInEnabled } from '@/modules/auth/components/GoogleSignInButton';
import ClerkSignInButton, { clerkSignInEnabled } from '@/modules/auth/components/ClerkSignInButton';
import { enterDemo } from '@/shared/demo/demo';

/** Pull the API's `detail` off an axios error, falling back when it is absent. */
function errorDetail(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' && detail ? detail : fallback;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const { mutate: login, isPending } = useLogin();
  const { mutate: googleLogin } = useGoogleLogin();
  const { mutate: clerkLogin } = useClerkLogin();
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
      onError: (error) => {
        message.error(errorDetail(error, 'Google sign-in failed'));
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
        onError: (error) => {
          // The API distinguishes bad credentials from a disabled account and one
          // awaiting approval; surfacing its reason stops users from chasing a
          // password that was never the problem.
          message.error(errorDetail(error, 'Invalid email or password'));
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
        background: 'var(--bg-main)',
        padding: 24,
      }}
    >
      <GlassCard padding="lg" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--primary)',
              margin: 0,
              letterSpacing: 1,
              textShadow: '0 0 20px rgba(230, 230, 230, 0.15)',
            }}
          >
            NavDashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
            Sign in to your account
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: 13,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Email
            </label>
            <GlassInput
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              prefix={<MailOutlined style={{ color: 'var(--text-muted)' }} />}
              size="lg"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                color: 'var(--text-secondary)',
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
              prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />}
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
              color: 'var(--text-secondary)',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            {pendingMessage}
          </div>
        )}
        {clerkSignInEnabled && (
          <div style={{ marginTop: 12 }}>
            <ClerkSignInButton
              onSessionToken={(token) =>
                clerkLogin(token, {
                  onSuccess: (d) => {
                    if (d.pending) message.info(d.message || 'Awaiting admin approval');
                    else navigate('/');
                  },
                  onError: (e) => message.error(errorDetail(e, 'Clerk sign-in failed')),
                })
              }
            />
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
                color: 'var(--text-muted)',
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

        {/* A no-strings look around with sample data. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0 12px',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          just looking?
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <GlassButton
          variant="ghost"
          fullWidth
          icon={<EyeOutlined />}
          onClick={() => enterDemo()}
        >
          Explore the demo
        </GlassButton>
        <div
          style={{
            marginTop: 8,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          Sample data · read-only · nothing you do here is saved
        </div>

        {/* Whose software this is, on the one screen every user sees. */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 16,
            borderTop: '1px solid var(--overlay-subtle)',
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.7,
          }}
        >
          <div>
            An internal tool of{' '}
            <a
              href="https://www.navwireless.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Nav Wireless Technologies Pvt Ltd
            </a>
          </div>
          <div>Built by Raj Patel · Head of Operations</div>
        </div>
      </GlassCard>
    </div>
  );
}