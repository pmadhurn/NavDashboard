import { useState } from 'react';
import { Input, Select, Popconfirm, Avatar } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  MessageOutlined,
  SendOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ShareButton from '@/shared/components/ShareButton';
import { useAuthStore } from '@/shared/stores/authStore';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import {
  DailyUpdate,
  useAddComment,
  useDeleteComment,
  useDeleteUpdate,
  usePostUpdate,
  useUpdates,
} from '../hooks/useUpdates';

dayjs.extend(relativeTime);

/** Stable per-person colour so the same author reads the same everywhere. */
function authorColor(name: string): string {
  const palette = ['#6F8CB6', '#5E8C86', '#9E7E8A', '#7E6F9E', '#B68A3C', '#7E8FA6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length]!;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function CommentThread({ update }: { update: DailyUpdate }) {
  const [text, setText] = useState('');
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const user = useAuthStore((s) => s.user);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    addComment.mutate({ updateId: update.id, body }, { onSuccess: () => setText('') });
  };

  return (
    <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid var(--overlay-subtle)' }}>
      {update.comments.map((c) => {
        const name = c.author_name ?? 'Unknown';
        return (
          <div
            key={c.id}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              padding: '6px 0',
            }}
          >
            <Avatar
              size={22}
              style={{ background: authorColor(name), fontSize: 10, flexShrink: 0 }}
            >
              {initials(name)}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {name}
                </span>
                <span
                  style={{ fontSize: 10, color: 'var(--text-muted)' }}
                  title={dayjs(c.created_at).format('D MMM YYYY, HH:mm')}
                >
                  {dayjs(c.created_at).fromNow()}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {c.body}
              </div>
            </div>
            {c.author_id === user?.id && (
              <Popconfirm title="Remove this comment?" onConfirm={() => deleteComment.mutate(c.id)}>
                <DeleteOutlined
                  style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}
                />
              </Popconfirm>
            )}
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPressEnter={send}
          placeholder="Reply…"
          size="small"
        />
        <GlassButton
          size="sm"
          icon={<SendOutlined />}
          onClick={send}
          disabled={!text.trim() || addComment.isPending}
        >
          {''}
        </GlassButton>
      </div>
    </div>
  );
}

function UpdateCard({ update }: { update: DailyUpdate }) {
  const user = useAuthStore((s) => s.user);
  const deleteUpdate = useDeleteUpdate();
  const name = update.author_name ?? 'Unknown';

  return (
    <GlassCard>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar size={34} style={{ background: authorColor(name), flexShrink: 0 }}>
          {initials(name)}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {name}
            </span>
            {update.project_name && (
              <span
                style={{
                  fontSize: 11,
                  padding: '1px 8px',
                  borderRadius: 20,
                  background: 'var(--overlay-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {update.project_name}
              </span>
            )}
            <span
              style={{ fontSize: 11, color: 'var(--text-muted)' }}
              title={`Posted ${dayjs(update.created_at).format('D MMM YYYY, HH:mm')}`}
            >
              for {dayjs(update.posted_for).format('ddd, D MMM')} ·{' '}
              {dayjs(update.created_at).fromNow()}
            </span>
            <span style={{ flex: 1 }} />
            {update.author_id === user?.id && (
              <Popconfirm
                title="Remove this update?"
                description="Its replies go with it."
                onConfirm={() => deleteUpdate.mutate(update.id)}
              >
                <DeleteOutlined
                  style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
                />
              </Popconfirm>
            )}
          </div>

          <div
            style={{
              fontSize: 14,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            {update.body}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 8,
            }}
          >
            <MessageOutlined />
            {update.comment_count === 0
              ? 'No replies yet'
              : `${update.comment_count} ${update.comment_count === 1 ? 'reply' : 'replies'}`}
          </div>

          <CommentThread update={update} />
        </div>
      </div>
    </GlassCard>
  );
}

export default function UpdatesPage() {
  const [body, setBody] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>();
  const { data: updates, isLoading } = useUpdates({ limit: 100 });
  const { data: projects } = useProjects({});
  const post = usePostUpdate();

  const submit = () => {
    const text = body.trim();
    if (!text) return;
    post.mutate(
      { body: text, project_id: projectId ?? null },
      {
        onSuccess: () => {
          setBody('');
          setProjectId(undefined);
        },
      }
    );
  };

  // Group by the day being reported on, so the timeline reads as a diary
  // rather than an undifferentiated stream.
  const groups = new Map<string, DailyUpdate[]>();
  for (const u of updates ?? []) {
    if (!groups.has(u.posted_for)) groups.set(u.posted_for, []);
    groups.get(u.posted_for)!.push(u);
  }

  return (
    <div>
      <PageHeader
        title="Daily Updates"
        icon={<MessageOutlined />}
        subtitle="What everyone is working on, and the conversation around it"
        actions={<ShareButton title="Daily updates" url="/updates" />}
      />

      {/* Composer */}
      <GlassCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Input.TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="What did you work on today?"
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Select
              value={projectId}
              onChange={setProjectId}
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Project (optional)"
              style={{ minWidth: 200 }}
              options={(projects?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
            />
            <GlassButton
              icon={<SendOutlined />}
              onClick={submit}
              disabled={!body.trim() || post.isPending}
            >
              Post update
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isLoading ? (
          <LoadingSpinner text="Loading updates…" />
        ) : (updates ?? []).length === 0 ? (
          <EmptyState
            icon={<UserOutlined />}
            title="No updates yet"
            description="Post the first one — it becomes the team's shared record of the day."
          />
        ) : (
          [...groups.entries()].map(([day, items]) => (
            <div key={day}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                }}
              >
                {dayjs(day).isSame(dayjs(), 'day')
                  ? 'Today'
                  : dayjs(day).isSame(dayjs().subtract(1, 'day'), 'day')
                    ? 'Yesterday'
                    : dayjs(day).format('dddd, D MMMM YYYY')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((u) => (
                  <UpdateCard key={u.id} update={u} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
