import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  CheckCircleFilled,
  RightOutlined,
  BellOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { useAuthStore } from '@/shared/stores/authStore';
import {
  Task,
  URGENCY_COLOR,
  URGENCY_LABEL,
  Urgency,
  useMarkAllRead,
  useMyTasks,
  useNotifications,
} from '../hooks/useTasks';

dayjs.extend(relativeTime);

const ORDER: Urgency[] = ['BLOCKING', 'DUE', 'SOON'];

function TaskRow({ task }: { task: Task }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => task.link && navigate(task.link)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        // Generous target: this is tapped with a thumb, at a site, at the end
        // of a long day.
        padding: '16px 14px',
        borderRadius: 12,
        border: `1px solid ${URGENCY_COLOR[task.urgency]}33`,
        background: 'var(--overlay-subtle)',
        cursor: 'pointer',
        color: 'var(--text-primary)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: URGENCY_COLOR[task.urgency],
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{task.title}</div>
        {task.detail && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {task.detail}
          </div>
        )}
      </span>
      <span
        style={{
          fontSize: 12,
          color: URGENCY_COLOR[task.urgency],
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {task.action}
        <RightOutlined style={{ fontSize: 10 }} />
      </span>
    </button>
  );
}

/**
 * The field user's whole app: what you owe, and a way to clear it.
 *
 * Open → see what needs doing → do it → done. Nothing else competes for
 * attention here, because anything that does makes the list easier to ignore.
 */
export default function MyDayPage() {
  const user = useAuthStore((s) => s.user);
  const { data: tasks, isLoading } = useMyTasks();
  const { data: notifications } = useNotifications();
  const markRead = useMarkAllRead();
  const navigate = useNavigate();

  const first = user?.full_name?.split(' ')[0] || user?.username || 'there';
  const unread = (notifications ?? []).filter((n) => !n.read_at);
  const grouped = ORDER.map((u) => ({
    urgency: u,
    items: (tasks ?? []).filter((t) => t.urgency === u),
  })).filter((g) => g.items.length > 0);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          {dayjs().hour() < 12 ? 'Good morning' : dayjs().hour() < 17 ? 'Good afternoon' : 'Good evening'},{' '}
          {first}
        </h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {dayjs().format('dddd, D MMMM')}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Checking what's outstanding…" />
      ) : (tasks ?? []).length === 0 ? (
        <GlassCard>
          <div style={{ textAlign: 'center', padding: '28px 16px' }}>
            <CheckCircleFilled style={{ fontSize: 40, color: 'var(--status-working)' }} />
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 14 }}>
              You're all clear
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              Nothing outstanding. Anything that needs you will appear here.
            </div>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grouped.map((g) => (
            <div key={g.urgency}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: URGENCY_COLOR[g.urgency],
                  marginBottom: 8,
                }}
              >
                {URGENCY_LABEL[g.urgency]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {g.items.map((t) => (
                  <TaskRow key={t.key} task={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(notifications ?? []).length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <BellOutlined /> Recent {unread.length > 0 && `· ${unread.length} new`}
            </span>
            {unread.length > 0 && (
              <GlassButton size="sm" variant="ghost" onClick={() => markRead.mutate()}>
                Mark all read
              </GlassButton>
            )}
          </div>
          <GlassCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(notifications ?? []).slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => n.link && navigate(n.link)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: 'none',
                    background: n.read_at ? 'transparent' : 'var(--overlay-subtle)',
                    cursor: n.link ? 'pointer' : 'default',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read_at ? 400 : 600 }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.body}</div>
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {dayjs(n.created_at).fromNow()}
                  </span>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
