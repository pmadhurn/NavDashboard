import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SaveOutlined,
  DatabaseOutlined,
  CloudOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import GlassInput from '@/shared/components/GlassInput';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { useSettings, useSystemInfo, useUpdateSetting } from '../hooks/useSettings';
import { useAuthStore } from '@/shared/stores/authStore';

export default function GeneralSettings() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: systemInfo, isLoading: infoLoading } = useSystemInfo();
  const updateSetting = useUpdateSetting();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  // AI Config state
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [chatModel, setChatModel] = useState('');
  const [embedModel, setEmbedModel] = useState('');
  const [aiDirty, setAiDirty] = useState(false);

  // Map Config state
  const [mapLat, setMapLat] = useState('');
  const [mapLng, setMapLng] = useState('');
  const [mapZoom, setMapZoom] = useState('');
  const [mapDirty, setMapDirty] = useState(false);

  // Populate from settings
  useEffect(() => {
    if (!settings) return;
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
    setOllamaUrl(settingsMap.get('ollama_url') ?? '');
    setChatModel(settingsMap.get('ollama_model') ?? '');
    setEmbedModel(settingsMap.get('ollama_embed_model') ?? '');
    setMapLat(settingsMap.get('default_map_lat') ?? '');
    setMapLng(settingsMap.get('default_map_lng') ?? '');
    setMapZoom(settingsMap.get('default_map_zoom') ?? '');
  }, [settings]);

  // Track changes
  const settingsMap = useMemo(
    () => new Map(settings?.map((s) => [s.key, s.value]) ?? []),
    [settings]
  );

  useEffect(() => {
    setAiDirty(
      ollamaUrl !== (settingsMap.get('ollama_url') ?? '') ||
      chatModel !== (settingsMap.get('ollama_model') ?? '') ||
      embedModel !== (settingsMap.get('ollama_embed_model') ?? '')
    );
  }, [ollamaUrl, chatModel, embedModel, settingsMap]);

  useEffect(() => {
    setMapDirty(
      mapLat !== (settingsMap.get('default_map_lat') ?? '') ||
      mapLng !== (settingsMap.get('default_map_lng') ?? '') ||
      mapZoom !== (settingsMap.get('default_map_zoom') ?? '')
    );
  }, [mapLat, mapLng, mapZoom, settingsMap]);

  const handleSaveAi = async () => {
    if (ollamaUrl !== settingsMap.get('ollama_url'))
      await updateSetting.mutateAsync({ key: 'ollama_url', value: ollamaUrl });
    if (chatModel !== settingsMap.get('ollama_model'))
      await updateSetting.mutateAsync({ key: 'ollama_model', value: chatModel });
    if (embedModel !== settingsMap.get('ollama_embed_model'))
      await updateSetting.mutateAsync({ key: 'ollama_embed_model', value: embedModel });
    setAiDirty(false);
  };

  const handleSaveMap = async () => {
    if (mapLat !== settingsMap.get('default_map_lat'))
      await updateSetting.mutateAsync({ key: 'default_map_lat', value: mapLat });
    if (mapLng !== settingsMap.get('default_map_lng'))
      await updateSetting.mutateAsync({ key: 'default_map_lng', value: mapLng });
    if (mapZoom !== settingsMap.get('default_map_zoom'))
      await updateSetting.mutateAsync({ key: 'default_map_zoom', value: mapZoom });
    setMapDirty(false);
  };

  if (settingsLoading || infoLoading) {
    return <LoadingSpinner text="Loading settings..." />;
  }

  const infoItems = systemInfo
    ? [
        { label: 'Version', value: systemInfo.version },
        { label: 'Environment', value: systemInfo.environment },
        { label: 'Database Size', value: systemInfo.database_size },
        { label: 'Tables', value: String(systemInfo.table_count) },
        { label: 'Total Devices', value: String(systemInfo.total_devices) },
        { label: 'Total Couples', value: String(systemInfo.total_couples) },
        { label: 'Total Pairs', value: String(systemInfo.total_pairs) },
        { label: 'Total Documents', value: String(systemInfo.total_documents) },
        { label: 'Total Users', value: String(systemInfo.total_users) },
        { label: 'Audit Entries', value: String(systemInfo.total_audit_entries) },
        { label: 'AI Embeddings', value: String(systemInfo.total_embeddings) },
      ]
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Section 1: System Information */}
      <GlassCard>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <DatabaseOutlined style={{ color: 'var(--text-muted)', fontSize: 16 }} />
          <h3
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            System Information
          </h3>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {infoItems.map((item) => (
            <div key={item.label}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Section 2: AI Configuration */}
      <GlassCard>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <CloudOutlined style={{ color: 'var(--text-muted)', fontSize: 16 }} />
          <h3
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            AI Configuration
          </h3>
        </div>

        {/* Ollama status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 8,
          }}
        >
          {systemInfo?.ollama_status === 'connected' ? (
            <CheckCircleOutlined style={{ color: 'var(--status-working)', fontSize: 14 }} />
          ) : (
            <CloseCircleOutlined style={{ color: 'var(--status-faulty)', fontSize: 14 }} />
          )}
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Ollama:{' '}
            <span
              style={{
                color:
                  systemInfo?.ollama_status === 'connected'
                    ? 'var(--status-working)'
                    : 'var(--status-faulty)',
                fontWeight: 500,
              }}
            >
              {systemInfo?.ollama_status === 'connected'
                ? 'Connected'
                : 'Disconnected'}
            </span>
          </span>
          {systemInfo?.ollama_models && systemInfo.ollama_models.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 12 }}>
              Models: {systemInfo.ollama_models.join(', ')}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Ollama URL
            </label>
            <GlassInput
              value={ollamaUrl}
              onChange={setOllamaUrl}
              placeholder="http://host.docker.internal:11434"
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Chat Model
            </label>
            <GlassInput
              value={chatModel}
              onChange={setChatModel}
              placeholder="llama3"
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Embedding Model
            </label>
            <GlassInput
              value={embedModel}
              onChange={setEmbedModel}
              placeholder="nomic-embed-text"
              disabled={!isAdmin}
            />
          </div>
        </div>

        {isAdmin && aiDirty && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <GlassButton
              icon={<SaveOutlined />}
              onClick={handleSaveAi}
              loading={updateSetting.isPending}
            >
              Save AI Settings
            </GlassButton>
          </div>
        )}
      </GlassCard>

      {/* Section 3: Map Defaults */}
      <GlassCard>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <EnvironmentOutlined style={{ color: 'var(--text-muted)', fontSize: 16 }} />
          <h3
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Map Defaults
          </h3>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Default Latitude
            </label>
            <GlassInput
              type="number"
              value={mapLat}
              onChange={setMapLat}
              placeholder="48.8566"
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Default Longitude
            </label>
            <GlassInput
              type="number"
              value={mapLng}
              onChange={setMapLng}
              placeholder="2.3522"
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Default Zoom (1-18)
            </label>
            <GlassInput
              type="number"
              value={mapZoom}
              onChange={setMapZoom}
              placeholder="13"
              disabled={!isAdmin}
            />
          </div>
        </div>

        {isAdmin && mapDirty && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <GlassButton
              icon={<SaveOutlined />}
              onClick={handleSaveMap}
              loading={updateSetting.isPending}
            >
              Save Map Settings
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
