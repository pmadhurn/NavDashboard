import React, { useState } from 'react';
import { Switch } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import GlassModal from '@/shared/components/GlassModal';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/formatters';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '../hooks/useSettings';
import type { UserItem } from '../hooks/useSettings';

const roleBadgeStyles: Record<string, { bg: string; color: string }> = {
  ADMIN: { bg: 'rgba(140, 140, 140, 0.2)', color: '#8C8C8C' },
  TECHNICIAN: { bg: 'rgba(111, 122, 140, 0.2)', color: '#6F7A8C' },
  VIEWER: { bg: 'rgba(110, 110, 110, 0.2)', color: '#6E6E6E' },
};

function RoleBadge({ role }: { role: string }) {
  const style = roleBadgeStyles[role] ?? roleBadgeStyles.VIEWER;
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        padding: '2px 10px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
      }}
    >
      {role}
    </span>
  );
}

interface UserFormState {
  full_name: string;
  email: string;
  username: string;
  password: string;
  role: string;
}

const emptyForm: UserFormState = {
  full_name: '',
  email: '',
  username: '',
  password: '',
  role: 'VIEWER',
};

export default function UserManagement() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<UserItem | null>(null);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setForm({
      full_name: user.full_name,
      email: user.email,
      username: user.username,
      password: '',
      role: user.role,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (editingUser) {
      await updateUser.mutateAsync({
        id: editingUser.id,
        data: {
          full_name: form.full_name || undefined,
          role: form.role || undefined,
        },
      });
    } else {
      await createUser.mutateAsync({
        email: form.email,
        username: form.username,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
      });
    }
    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleToggleActive = async (user: UserItem) => {
    await updateUser.mutateAsync({
      id: user.id,
      data: { is_active: !user.is_active },
    });
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteUser.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading users..." />;
  }

  return (
    <div>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 14, color: '#7A7A7A' }}>
          {users?.length ?? 0} user{(users?.length ?? 0) !== 1 ? 's' : ''} total
        </div>
        <GlassButton icon={<PlusOutlined />} onClick={handleOpenCreate}>
          Create User
        </GlassButton>
      </div>

      {/* Users table */}
      {!users || users.length === 0 ? (
        <EmptyState
          icon={<UserOutlined />}
          title="No users found"
          description="Create your first user to get started."
        />
      ) : (
        <GlassCard padding="sm">
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr>
                  {['Name', 'Email', 'Username', 'Role', 'Active', 'Created', 'Last Login', 'Actions'].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          fontSize: 11,
                          color: '#7A7A7A',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          borderBottom: '1px solid #242424',
                          fontWeight: 600,
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <td style={{ padding: '10px 12px', color: '#F2F2F2', fontSize: 13 }}>
                      {user.full_name}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#B8B8B8', fontSize: 13 }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#B8B8B8', fontSize: 13 }}>
                      {user.username}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <RoleBadge role={user.role} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Switch
                        size="small"
                        checked={user.is_active}
                        onChange={() => handleToggleActive(user)}
                        style={{
                          background: user.is_active ? '#5F8F6B' : '#4A4A4A',
                        }}
                      />
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        color: '#7A7A7A',
                        fontSize: 12,
                      }}
                    >
                      {formatDateTime(user.created_at)}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        color: '#7A7A7A',
                        fontSize: 12,
                      }}
                    >
                      {user.last_login ? formatRelativeTime(user.last_login) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenEdit(user)}
                        >
                          Edit
                        </GlassButton>
                        <GlassButton
                          variant="danger"
                          size="sm"
                          icon={<StopOutlined />}
                          onClick={() => setDeleteConfirm(user)}
                        >
                          Deactivate
                        </GlassButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Create/Edit modal */}
      <GlassModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingUser(null);
          setForm(emptyForm);
        }}
        title={editingUser ? 'Edit User' : 'Create User'}
        width={480}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton
              variant="ghost"
              onClick={() => {
                setModalOpen(false);
                setEditingUser(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleSubmit}
              loading={createUser.isPending || updateUser.isPending}
            >
              {editingUser ? 'Save Changes' : 'Create User'}
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              style={{ display: 'block', fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}
            >
              Full Name
            </label>
            <GlassInput
              value={form.full_name}
              onChange={(v) => setForm((prev) => ({ ...prev, full_name: v }))}
              placeholder="Enter full name"
            />
          </div>

          {!editingUser && (
            <>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#7A7A7A',
                    marginBottom: 6,
                  }}
                >
                  Email
                </label>
                <GlassInput
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm((prev) => ({ ...prev, email: v }))}
                  placeholder="user@navdashboard.com"
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#7A7A7A',
                    marginBottom: 6,
                  }}
                >
                  Username
                </label>
                <GlassInput
                  value={form.username}
                  onChange={(v) => setForm((prev) => ({ ...prev, username: v }))}
                  placeholder="username"
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#7A7A7A',
                    marginBottom: 6,
                  }}
                >
                  Password
                </label>
                <GlassInput
                  type="password"
                  value={form.password}
                  onChange={(v) => setForm((prev) => ({ ...prev, password: v }))}
                  placeholder="Minimum 6 characters"
                />
              </div>
            </>
          )}

          <div>
            <label
              style={{ display: 'block', fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}
            >
              Role
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['ADMIN', 'TECHNICIAN', 'VIEWER'].map((r) => (
                <button
                  key={r}
                  onClick={() => setForm((prev) => ({ ...prev, role: r }))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${
                      form.role === r
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(255, 255, 255, 0.06)'
                    }`,
                    background:
                      form.role === r
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.02)',
                    color: form.role === r ? '#F2F2F2' : '#7A7A7A',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassModal>

      {/* Delete/Deactivate confirm dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${deleteConfirm?.full_name}? They will no longer be able to log in.`}
        confirmText="Deactivate"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        danger
        loading={deleteUser.isPending}
      />
    </div>
  );
}
