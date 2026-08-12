import { useEffect, useMemo, useState } from 'react';
import { MailOutlined, SaveOutlined } from '@ant-design/icons';
import { Switch } from 'antd';
import GlassCard from '@/shared/components/GlassCard';
import GlassInput from '@/shared/components/GlassInput';
import GlassButton from '@/shared/components/GlassButton';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';
import { useAuthStore } from '@/shared/stores/authStore';

const FIELDS: {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'password' | 'number';
}[] = [
  { key: 'smtp_host', label: 'SMTP server', placeholder: 'smtp.gmail.com' },
  { key: 'smtp_port', label: 'Port', placeholder: '587', type: 'number' },
  { key: 'smtp_user', label: 'Username', placeholder: 'you@yourdomain.com' },
  { key: 'smtp_password', label: 'Password / app password', placeholder: '••••••••', type: 'password' },
  { key: 'smtp_from', label: 'From address', placeholder: 'NavDashboard <no-reply@yourdomain.com>' },
  { key: 'app_base_url', label: 'Public URL for links (optional)', placeholder: 'https://your-domain.com' },
];

/**
 * Outbound email. Ships disabled; notifications stay in-app until someone
 * pastes SMTP details here — no rebuild, no env edit, works the same on any
 * domain the product is deployed to.
 */
export default function EmailSettings() {
  const { data: settings } = useSettings();
  const updateSetting = useUpdateSetting();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const settingsMap = useMemo(
    () => new Map(settings?.map((s) => [s.key, s.value]) ?? []),
    [settings]
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const next: Record<string, string> = {};
    for (const f of FIELDS) next[f.key] = settingsMap.get(f.key) ?? '';
    setValues(next);
    setEnabled((settingsMap.get('mail_enabled') ?? 'false') === 'true');
  }, [settings, settingsMap]);

  const dirty =
    FIELDS.some((f) => (values[f.key] ?? '') !== (settingsMap.get(f.key) ?? '')) ||
    enabled !== ((settingsMap.get('mail_enabled') ?? 'false') === 'true');

  const save = async () => {
    for (const f of FIELDS) {
      if ((values[f.key] ?? '') !== (settingsMap.get(f.key) ?? '')) {
        await updateSetting.mutateAsync({ key: f.key, value: values[f.key] ?? '' });
      }
    }
    const enabledStr = enabled ? 'true' : 'false';
    if (enabledStr !== (settingsMap.get('mail_enabled') ?? 'false')) {
      await updateSetting.mutateAsync({ key: 'mail_enabled', value: enabledStr });
    }
  };

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <MailOutlined style={{ color: 'var(--text-muted)', fontSize: 16 }} />
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16, fontWeight: 600 }}>
          Email
        </h3>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {enabled ? 'Sending on' : 'Off — notifications stay in-app'}
        </span>
        <Switch checked={enabled} onChange={setEnabled} disabled={!isAdmin} />
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>
        Used for things like project team assignments. Fill in any SMTP account
        (for Gmail, create an app password). Nothing is sent until this is on.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              {f.label}
            </label>
            <GlassInput
              type={f.type}
              value={values[f.key] ?? ''}
              onChange={(v: string) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              placeholder={f.placeholder}
              disabled={!isAdmin}
            />
          </div>
        ))}
      </div>
      {isAdmin && dirty && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <GlassButton icon={<SaveOutlined />} onClick={save} loading={updateSetting.isPending}>
            Save Email Settings
          </GlassButton>
        </div>
      )}
    </GlassCard>
  );
}
