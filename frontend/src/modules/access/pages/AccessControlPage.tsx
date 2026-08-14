import { useEffect, useMemo, useState } from 'react';
import { Input, Tabs, Tag, Popconfirm, Tooltip, Empty, Switch } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  SafetyOutlined,
  SearchOutlined,
  WarningOutlined,
  CheckCircleFilled,
  StopFilled,
  MinusOutlined,
  LogoutOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassModal from '@/shared/components/GlassModal';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import {
  BasicUser,
  CatalogGroup,
  Override,
  Role,
  useCatalog,
  useDeleteRole,
  useRevokeSession,
  useRevokeUserSessions,
  useRoles,
  useSaveRole,
  useApproveUser,
  useSaveUserAccess,
  useSessions,
  useUserAccess,
  useUsers,
} from '../hooks/useAccess';

dayjs.extend(relativeTime);

/** What a single permission resolves to for the user being edited. */
type Tri = 'role' | 'allow' | 'deny' | 'none';

function TriIcon({ state }: { state: Tri }) {
  if (state === 'allow')
    return <CheckCircleFilled style={{ color: 'var(--status-working)' }} />;
  if (state === 'role')
    return <CheckCircleFilled style={{ color: '#6F8CB6' }} />;
  if (state === 'deny') return <StopFilled style={{ color: '#8C5F5F' }} />;
  return <MinusOutlined style={{ color: 'var(--text-muted)' }} />;
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function PermissionRow({
  perm,
  state,
  onCycle,
}: {
  perm: { key: string; label: string; dangerous: boolean };
  state: Tri;
  onCycle: () => void;
}) {
  const label =
    state === 'role'
      ? 'Granted by a role — click to deny for this person only'
      : state === 'allow'
        ? 'Granted directly — click to deny'
        : state === 'deny'
          ? 'Denied for this person — click to clear'
          : 'Not granted — click to grant';

  return (
    <Tooltip title={label} mouseEnterDelay={0.4}>
      <button
        type="button"
        onClick={onCycle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          textAlign: 'left',
          padding: '7px 10px',
          borderRadius: 8,
          border: '1px solid transparent',
          background:
            state === 'deny'
              ? 'rgba(140,95,95,0.10)'
              : state === 'none'
                ? 'transparent'
                : 'var(--overlay-subtle)',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: 13,
        }}
      >
        <TriIcon state={state} />
        <span style={{ flex: 1, minWidth: 0 }}>{perm.label}</span>
        {perm.dangerous && (
          <Tooltip title="Destructive or trust-granting">
            <WarningOutlined style={{ color: 'var(--status-not-working)', fontSize: 12 }} />
          </Tooltip>
        )}
        <code style={{ fontSize: 10, color: 'var(--text-muted)' }}>{perm.key}</code>
      </button>
    </Tooltip>
  );
}

function UserAccessEditor({ user }: { user: BasicUser }) {
  const { data: access, isLoading } = useUserAccess(user.id);
  const { data: catalog } = useCatalog();
  const { data: roles } = useRoles();
  const save = useSaveUserAccess();
  const revokeAll = useRevokeUserSessions();
  const approve = useApproveUser();

  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (access) {
      setRoleIds(access.role_ids);
      setOverrides(access.overrides);
    }
  }, [access]);

  // Which permissions the currently-selected roles grant. Recomputed locally so
  // the matrix reacts to a role checkbox without a round-trip.
  const fromRoles = useMemo(() => {
    const set = new Set<string>();
    for (const r of roles ?? []) {
      if (roleIds.includes(r.id)) r.permissions.forEach((p) => set.add(p));
    }
    return set;
  }, [roles, roleIds]);

  const overrideMap = useMemo(
    () => new Map(overrides.map((o) => [o.permission_key, o.effect])),
    [overrides]
  );

  const stateOf = (key: string): Tri => {
    const o = overrideMap.get(key);
    if (o === 'DENY') return 'deny';
    if (o === 'ALLOW') return 'allow';
    return fromRoles.has(key) ? 'role' : 'none';
  };

  /** none -> allow -> deny -> none, but a role-granted key starts at deny. */
  const cycle = (key: string) => {
    const current = stateOf(key);
    const next: Override[] = overrides.filter((o) => o.permission_key !== key);
    if (current === 'none') next.push({ permission_key: key, effect: 'ALLOW' });
    else if (current === 'allow' || current === 'role')
      next.push({ permission_key: key, effect: 'DENY' });
    setOverrides(next);
  };

  const dirty =
    !!access &&
    (JSON.stringify([...roleIds].sort()) !== JSON.stringify([...access.role_ids].sort()) ||
      JSON.stringify(
        [...overrides].sort((a, b) => a.permission_key.localeCompare(b.permission_key))
      ) !==
        JSON.stringify(
          [...access.overrides].sort((a, b) =>
            a.permission_key.localeCompare(b.permission_key)
          )
        ));

  const groups: CatalogGroup[] = (catalog ?? [])
    .map((g) => ({
      ...g,
      permissions: g.permissions.filter(
        (p) =>
          !filter ||
          p.label.toLowerCase().includes(filter.toLowerCase()) ||
          p.key.toLowerCase().includes(filter.toLowerCase()) ||
          g.label.toLowerCase().includes(filter.toLowerCase())
      ),
    }))
    .filter((g) => g.permissions.length > 0);

  if (isLoading || !access) return <LoadingSpinner text="Loading access…" />;

  const grantedCount = (catalog ?? []).reduce(
    (n, g) => n + g.permissions.filter((p) => stateOf(p.key) !== 'none' && stateOf(p.key) !== 'deny').length,
    0
  );

  return (
    <div>
      {user.status === 'PENDING' && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 14,
            background: 'var(--overlay-subtle)',
            border: '1px solid var(--status-not-working)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <WarningOutlined style={{ color: 'var(--status-not-working)' }} />
          <span style={{ flex: 1, minWidth: 200 }}>
            This account is <strong>awaiting approval</strong> — they cannot sign
            in yet. Roles you set below apply the moment you approve.
          </span>
          <GlassButton
            size="sm"
            onClick={() => approve.mutate(user.id)}
            loading={approve.isPending}
          >
            Approve account
          </GlassButton>
        </div>
      )}

      {access.is_legacy_admin && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 14,
            background: 'var(--overlay-subtle)',
            border: '1px solid var(--status-not-working)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <WarningOutlined style={{ color: 'var(--status-not-working)' }} />
          <span>
            This account's legacy role is <strong>ADMIN</strong>, which grants
            everything regardless of the settings below. Change the account's role
            away from ADMIN for these to take effect.
          </span>
        </div>
      )}

      {/* Roles */}
      <GlassCard>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Roles</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
          Roles carry the bulk of a grant. Someone can hold more than one.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(roles ?? []).map((r) => {
            const on = roleIds.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  setRoleIds(on ? roleIds.filter((x) => x !== r.id) : [...roleIds, r.id])
                }
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontSize: 12,
                  border: `1px solid ${on ? '#6F8CB6' : 'var(--overlay-subtle)'}`,
                  background: on ? 'rgba(111,140,182,0.14)' : 'var(--overlay-subtle)',
                  color: on ? '#6F8CB6' : 'var(--text-secondary)',
                  fontWeight: on ? 600 : 400,
                }}
              >
                {r.name}
                <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 10 }}>
                  {r.permissions.length}
                </span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Matrix */}
      <div style={{ marginTop: 14 }}>
        <GlassCard>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              marginBottom: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Individual permissions</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {grantedCount} granted · click to cycle grant → deny → inherit
              </div>
            </div>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter permissions…"
              prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
              style={{ width: 240 }}
              allowClear
            />
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, marginBottom: 12 }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-muted)' }}>
              <TriIcon state="role" /> from a role
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-muted)' }}>
              <TriIcon state="allow" /> granted directly
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-muted)' }}>
              <TriIcon state="deny" /> denied for this person
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--text-muted)' }}>
              <TriIcon state="none" /> not granted
            </span>
          </div>

          {groups.length === 0 ? (
            <Empty description="Nothing matches that filter" />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}
            >
              {groups.map((g) => (
                <div key={g.key}>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    {g.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {g.permissions.map((p) => (
                      <PermissionRow
                        key={p.key}
                        perm={p}
                        state={stateOf(p.key)}
                        onCycle={() => cycle(p.key)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Sticky save */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 14,
          padding: '12px 0',
          background: 'var(--bg-main)',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Popconfirm
          title="Sign this user out everywhere?"
          description="Their current sessions end immediately."
          onConfirm={() => revokeAll.mutate(user.id)}
        >
          <GlassButton variant="ghost" icon={<LogoutOutlined />}>
            Sign out everywhere
          </GlassButton>
        </Popconfirm>
        <span style={{ flex: 1 }} />
        {dirty && (
          <span style={{ fontSize: 12, color: 'var(--status-not-working)' }}>
            Unsaved changes
          </span>
        )}
        <GlassButton
          variant="ghost"
          onClick={() => {
            setRoleIds(access.role_ids);
            setOverrides(access.overrides);
          }}
          disabled={!dirty}
        >
          Reset
        </GlassButton>
        <GlassButton
          onClick={() =>
            save.mutate({ userId: user.id, roleIds, overrides })
          }
          disabled={!dirty || save.isPending}
        >
          Save access
        </GlassButton>
      </div>
    </div>
  );
}

function UsersTab() {
  const { data: users, isLoading } = useUsers();
  const [selectedId, setSelectedId] = useState<string>();
  const [q, setQ] = useState('');
  const isMobile = useIsMobile();

  const filtered = (users ?? []).filter(
    (u) =>
      !q ||
      u.full_name.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase())
  );
  const selected = filtered.find((u) => u.id === selectedId) ?? filtered[0];

  if (isLoading) return <LoadingSpinner text="Loading users…" />;
  if (!users || users.length === 0)
    return <EmptyState title="No users" description="Create a user first." />;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '260px 1fr',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <GlassCard>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a person…"
          prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
          allowClear
          style={{ marginBottom: 10 }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: isMobile ? 260 : 620,
            overflowY: 'auto',
          }}
        >
          {filtered.map((u) => {
            const on = selected?.id === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedId(u.id)}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: 'none',
                  background: on ? 'var(--overlay-subtle)' : 'transparent',
                  borderLeft: `3px solid ${on ? '#6F8CB6' : 'transparent'}`,
                  color: 'var(--text-primary)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: on ? 600 : 400 }}>{u.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                  <Tag color={u.role === 'ADMIN' ? 'red' : 'default'} style={{ fontSize: 9, margin: 0 }}>
                    {u.role}
                  </Tag>
                  {u.auth_provider !== 'LOCAL' && (
                    <Tag style={{ fontSize: 9, margin: 0 }}>{u.auth_provider}</Tag>
                  )}
                  {u.status !== 'ACTIVE' && (
                    <Tag color="orange" style={{ fontSize: 9, margin: 0 }}>
                      {u.status}
                    </Tag>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <div>{selected ? <UserAccessEditor user={selected} /> : null}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roles tab
// ---------------------------------------------------------------------------

function RoleEditor({
  role,
  open,
  onClose,
}: {
  role: Role | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: catalog } = useCatalog();
  const save = useSaveRole();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [perms, setPerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setPerms(new Set(role?.permissions ?? []));
  }, [role, open]);

  const toggle = (key: string) => {
    const next = new Set(perms);
    next.has(key) ? next.delete(key) : next.add(key);
    setPerms(next);
  };

  const toggleGroup = (g: CatalogGroup, on: boolean) => {
    const next = new Set(perms);
    // "Select all" deliberately skips destructive keys — granting a whole
    // module should not quietly include "restore the database".
    for (const p of g.permissions) {
      if (on) {
        if (!p.dangerous) next.add(p.key);
      } else next.delete(p.key);
    }
    setPerms(next);
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={role ? `Edit role — ${role.name}` : 'New role'}
      width={760}
      footer={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Role name"
          disabled={role?.is_system}
        />
        {role?.is_system && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            System roles cannot be renamed or deleted, but what they may do is
            yours to change.
          </div>
        )}
        <Input.TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this role for?"
          rows={2}
        />

        <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
          {(catalog ?? []).map((g) => {
            const all = g.permissions.filter((p) => !p.dangerous);
            const allOn = all.length > 0 && all.every((p) => perms.has(p.key));
            return (
              <div key={g.key} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {g.label}
                  </span>
                  <Switch size="small" checked={allOn} onChange={(v) => toggleGroup(g, v)} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    all (safe only)
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 4,
                  }}
                >
                  {g.permissions.map((p) => {
                    const on = perms.has(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => toggle(p.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background: on ? 'var(--overlay-subtle)' : 'transparent',
                          color: on ? 'var(--text-primary)' : 'var(--text-muted)',
                          fontSize: 12,
                        }}
                      >
                        <TriIcon state={on ? 'allow' : 'none'} />
                        <span style={{ flex: 1, minWidth: 0 }}>{p.label}</span>
                        {p.dangerous && (
                          <WarningOutlined
                            style={{ color: 'var(--status-not-working)', fontSize: 11 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={() =>
              save.mutate(
                {
                  id: role?.id,
                  name: name.trim(),
                  description: description.trim() || undefined,
                  permissions: [...perms],
                },
                { onSuccess: onClose }
              )
            }
            disabled={!name.trim() || save.isPending}
          >
            Save role ({perms.size})
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

function RolesTab() {
  const { data: roles, isLoading } = useRoles();
  const del = useDeleteRole();
  const [editing, setEditing] = useState<Role | null>(null);
  const [open, setOpen] = useState(false);

  if (isLoading) return <LoadingSpinner text="Loading roles…" />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <GlassButton
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          New role
        </GlassButton>
      </div>

      <RoleEditor role={editing} open={open} onClose={() => setOpen(false)} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {(roles ?? []).map((r) => (
          <GlassCard key={r.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{r.name}</span>
              {r.is_system && <Tag style={{ fontSize: 9 }}>system</Tag>}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                marginTop: 4,
                minHeight: 32,
              }}
            >
              {r.description}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
              {r.permissions.length} permissions · {r.user_count} user
              {r.user_count === 1 ? '' : 's'}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(r);
                  setOpen(true);
                }}
              >
                Edit
              </GlassButton>
              {!r.is_system && (
                <Popconfirm
                  title="Delete this role?"
                  onConfirm={() => del.mutate(r.id)}
                >
                  <GlassButton size="sm" variant="ghost" icon={<DeleteOutlined />}>
                    {''}
                  </GlassButton>
                </Popconfirm>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sessions tab
// ---------------------------------------------------------------------------

function SessionsTab() {
  const [includeEnded, setIncludeEnded] = useState(false);
  const { data: sessions, isLoading } = useSessions(includeEnded);
  const revoke = useRevokeSession();

  if (isLoading) return <LoadingSpinner text="Loading sessions…" />;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        <Switch size="small" checked={includeEnded} onChange={setIncludeEnded} />
        Show ended sessions
      </div>

      {(sessions ?? []).length === 0 ? (
        <EmptyState
          title="No active sessions"
          description="Sessions appear here as people sign in, whichever provider they use."
        />
      ) : (
        <GlassCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(sessions ?? []).map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--overlay-subtle)',
                  opacity: s.is_active ? 1 : 0.55,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.user_name}</span>
                    <Tag style={{ fontSize: 9, margin: 0 }}>{s.auth_provider}</Tag>
                    {!s.is_active && (
                      <Tag color="red" style={{ fontSize: 9, margin: 0 }}>
                        ended
                      </Tag>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {s.ip_address ?? 'unknown IP'} · started {dayjs(s.created_at).fromNow()}
                    {s.expires_at && ` · expires ${dayjs(s.expires_at).fromNow()}`}
                  </div>
                  {s.user_agent && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        maxWidth: 460,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.user_agent}
                    </div>
                  )}
                </div>
                {s.is_active && (
                  <Popconfirm
                    title="End this session?"
                    description="The token stops working immediately."
                    onConfirm={() => revoke.mutate(s.id)}
                  >
                    <GlassButton size="sm" variant="ghost" icon={<LogoutOutlined />}>
                      End
                    </GlassButton>
                  </Popconfirm>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function AccessControlPage() {
  return (
    <div>
      <PageHeader
        title="Access Control"
        icon={<SafetyOutlined />}
        subtitle="Who can see and do what — per person, down to the individual action"
      />
      <Tabs
        defaultActiveKey="users"
        items={[
          { key: 'users', label: 'People', children: <UsersTab /> },
          { key: 'roles', label: 'Roles', children: <RolesTab /> },
          { key: 'sessions', label: 'Sessions', children: <SessionsTab /> },
        ]}
      />
      <style>{`
        .ant-tabs-tab { color: var(--text-muted) !important; }
        .ant-tabs-tab-active .ant-tabs-tab-btn { color: var(--text-primary) !important; }
        .ant-tabs-ink-bar { background: var(--text-primary) !important; }
      `}</style>
    </div>
  );
}
