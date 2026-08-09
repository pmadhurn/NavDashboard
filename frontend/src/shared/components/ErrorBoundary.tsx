import React from 'react';
import GlassCard from './GlassCard';
import GlassButton from './GlassButton';
import { WarningOutlined } from '@ant-design/icons';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            padding: 24,
          }}
        >
          <GlassCard padding="lg" accentColor="var(--status-faulty)" style={{ maxWidth: 500, width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <WarningOutlined
                style={{ fontSize: 48, color: 'var(--status-faulty)', marginBottom: 16 }}
              />
              <h2
                style={{
                  color: 'var(--text-primary)',
                  fontSize: 20,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Something went wrong
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                An unexpected error occurred. Please try again.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                <GlassButton variant="primary" onClick={this.handleRetry}>
                  Try Again
                </GlassButton>
                <GlassButton variant="ghost" onClick={this.toggleDetails}>
                  {this.state.showDetails ? 'Hide Details' : 'Show Details'}
                </GlassButton>
              </div>
              {this.state.showDetails && this.state.error && (
                <div
                  style={{
                    textAlign: 'left',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 12,
                    color: 'var(--status-faulty)',
                    fontFamily: 'monospace',
                    wordBreak: 'break-word',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {this.state.error.message}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {this.state.error.stack}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}