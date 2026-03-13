import { useState } from 'react'

interface HealthResponse {
  status: string
  version: string
}

function App() {
  const [loading, setLoading] = useState<boolean>(false)
  const [response, setResponse] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setResponse(null)
    setError(null)

    try {
      const res = await fetch('/api/v1/health')
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const data: HealthResponse = await res.json()
      setResponse(data)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 48,
        textAlign: 'center',
        minWidth: 400,
        maxWidth: 520,
      }}
    >
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#F2F2F2',
          marginBottom: 8,
        }}
      >
        NavDashboard
      </h1>

      <p
        style={{
          fontSize: 16,
          color: '#7A7A7A',
          marginBottom: 32,
        }}
      >
        Phase 0 — Communication Test
      </p>

      <button
        onClick={testConnection}
        disabled={loading}
        style={{
          background: loading ? '#999999' : '#E6E6E6',
          color: '#0A0A0A',
          border: 'none',
          borderRadius: 8,
          padding: '12px 24px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: 14,
          marginBottom: 24,
        }}
      >
        {loading ? 'Testing...' : 'Test Backend Connection'}
      </button>

      {response && (
        <div style={{ marginTop: 8 }}>
          <p
            style={{
              color: '#5F8F6B',
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            ✅ Connected
          </p>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 8,
              padding: 16,
              fontFamily: 'monospace',
              fontSize: 14,
              textAlign: 'left',
              color: '#F2F2F2',
            }}
          >
            {JSON.stringify(response, null, 2)}
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8 }}>
          <p
            style={{
              color: '#9B3E3E',
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            ❌ Failed
          </p>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 8,
              padding: 16,
              fontFamily: 'monospace',
              fontSize: 14,
              textAlign: 'left',
              color: '#9B3E3E',
            }}
          >
            {error}
          </div>
        </div>
      )}
    </div>
  )
}

export default App