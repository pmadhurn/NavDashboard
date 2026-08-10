import { useMemo, useState } from 'react';
import { DatePicker, Select, Input, Popconfirm } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import {
  CalendarOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ShareButton from '@/shared/components/ShareButton';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useAuthStore } from '@/shared/stores/authStore';
import {
  DAY_TYPES,
  DAY_TYPE_COLOR,
  DAY_TYPE_LABEL,
  DayType,
  useDeleteDay,
  useLogDay,
  useMyAttendance,
  useMyCompOff,
  useMySummary,
} from '../hooks/useAttendance';

function LogDayModal({
  open,
  onClose,
  personId,
}: {
  open: boolean;
  onClose: () => void;
  personId: string | undefined;
}) {
  const [day, setDay] = useState<Dayjs>(dayjs());
  const [dayType, setDayType] = useState<DayType>('ON_FIELD');
  const [projectId, setProjectId] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const { data: projects } = useProjects({});
  const logDay = useLogDay();

  const needsProject = dayType === 'ON_FIELD';

  const submit = () => {
    if (!personId) return;
    logDay.mutate(
      {
        person_id: personId,
        day: day.format('YYYY-MM-DD'),
        day_type: dayType,
        project_id: needsProject ? projectId : null,
        note: note || null,
      },
      { onSuccess: onClose }
    );
  };

  return (
    // footer={null}: this modal supplies its own actions, and antd
    // renders a default OK/Cancel pair when footer is undefined.
    <GlassModal open={open} onClose={onClose} title="Log a day" footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date</label>
          <DatePicker
            value={day}
            onChange={(d) => d && setDay(d)}
            style={{ width: '100%' }}
            allowClear={false}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>What were you doing?</label>
          {/* A grid of large targets rather than a dropdown: this is the one
              action a field user performs daily, on a phone. */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 8,
              marginTop: 6,
            }}
          >
            {DAY_TYPES.map((dt) => {
              const active = dt.value === dayType;
              return (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => setDayType(dt.value)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: `1px solid ${active ? DAY_TYPE_COLOR[dt.value] : 'var(--overlay-subtle)'}`,
                    background: active
                      ? `color-mix(in srgb, ${DAY_TYPE_COLOR[dt.value]} 14%, transparent)`
                      : 'var(--overlay-subtle)',
                    color: active ? DAY_TYPE_COLOR[dt.value] : 'var(--text-secondary)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{dt.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {dt.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {needsProject && (
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Project (required)</label>
            <Select
              value={projectId}
              onChange={setProjectId}
              style={{ width: '100%' }}
              placeholder="Which site?"
              showSearch
              optionFilterProp="label"
              options={(projects?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
        )}

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Note (optional)</label>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything worth recording"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={submit}
            disabled={!personId || (needsProject && !projectId) || logDay.isPending}
          >
            Save
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

export default function MyAttendancePage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const user = useAuthStore((s) => s.user);
  const [logOpen, setLogOpen] = useState(false);

  const range = useMemo(
    () => ({
      date_from: month.startOf('month').format('YYYY-MM-DD'),
      date_to: month.endOf('month').format('YYYY-MM-DD'),
    }),
    [month]
  );

  const { data: days, isLoading } = useMyAttendance(range);
  const { data: summary } = useMySummary(range);
  const { data: compOff } = useMyCompOff();
  const deleteDay = useDeleteDay();
  // The summary carries the caller's personnel id even when nothing is logged
  // yet. Deriving it from an existing row instead would mean a user with no
  // attendance could never log their first day.
  const personId = summary?.person_id;

  const logged = new Map((days ?? []).map((d) => [d.day, d]));
  const daysInMonth = month.daysInMonth();
  const firstWeekday = month.startOf('month').day(); // 0 = Sunday

  return (
    <div>
      <PageHeader
        title="My Attendance"
        icon={<CalendarOutlined />}
        subtitle={user?.full_name ? `${user.full_name} · ${month.format('MMMM YYYY')}` : month.format('MMMM YYYY')}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <DatePicker
              picker="month"
              value={month}
              onChange={(m) => m && setMonth(m)}
              allowClear={false}
            />
            <ShareButton title="My attendance" url="/me/attendance" />
            <GlassButton
              icon={<PlusOutlined />}
              onClick={() => setLogOpen(true)}
              disabled={!personId}
            >
              Log a day
            </GlassButton>
          </div>
        }
      />

      <LogDayModal open={logOpen} onClose={() => setLogOpen(false)} personId={personId} />

      {/* An unlinked login is an ordinary state — a new admin account has no
          personnel record. Say so, rather than leaving "Log a day" mysteriously
          inert. */}
      {summary && !personId && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '0 0 16px',
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--overlay-subtle)',
            border: '1px solid var(--status-not-working)',
            color: 'var(--text-secondary)',
            fontSize: 12,
          }}
        >
          <InfoCircleOutlined style={{ color: 'var(--status-not-working)' }} />
          <span>
            This login is not linked to a personnel record, so it has no attendance
            of its own. An admin can link it under Personnel.
          </span>
        </div>
      )}

      {/* Totals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {DAY_TYPES.map((dt) => (
          <GlassCard key={dt.value}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {dt.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: DAY_TYPE_COLOR[dt.value] }}>
              {summary?.counts?.[dt.value] ?? 0}
            </div>
          </GlassCard>
        ))}
        <GlassCard>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Comp-off balance
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            {compOff?.balance ?? 0}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {compOff?.accrued ?? 0} earned · {compOff?.consumed ?? 0} taken
          </div>
        </GlassCard>
      </div>

      {/* Month grid */}
      <GlassCard>
        {isLoading ? (
          <LoadingSpinner text="Loading attendance…" />
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 6,
              }}
            >
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div
                  key={i}
                  style={{
                    textAlign: 'center',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    paddingBottom: 4,
                  }}
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = month.startOf('month').add(i, 'day');
                const key = date.format('YYYY-MM-DD');
                const entry = logged.get(key);
                const isWeekend = date.day() === 0 || date.day() === 6;
                return (
                  <div
                    key={key}
                    title={
                      entry
                        ? `${DAY_TYPE_LABEL[entry.day_type]}${entry.project_name ? ' · ' + entry.project_name : ''}`
                        : 'Not logged'
                    }
                    style={{
                      minHeight: 54,
                      borderRadius: 8,
                      padding: 6,
                      border: `1px solid ${entry ? DAY_TYPE_COLOR[entry.day_type] : 'var(--overlay-subtle)'}`,
                      background: entry
                        ? `color-mix(in srgb, ${DAY_TYPE_COLOR[entry.day_type]} 12%, transparent)`
                        : isWeekend
                          ? 'var(--overlay-subtle)'
                          : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i + 1}</span>
                    {entry && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: DAY_TYPE_COLOR[entry.day_type],
                          lineHeight: 1.1,
                        }}
                      >
                        {DAY_TYPE_LABEL[entry.day_type]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </GlassCard>

      {/* Logged days */}
      <div style={{ marginTop: 16 }}>
        <GlassCard>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            Logged days — {month.format('MMMM YYYY')}
          </div>
          {!isLoading && (days ?? []).length === 0 ? (
            <EmptyState
              title="Nothing logged this month"
              description="Use “Log a day” to record where you were."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(days ?? []).map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--overlay-subtle)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 92 }}>
                      {dayjs(d.day).format('ddd, D MMM')}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: DAY_TYPE_COLOR[d.day_type],
                      }}
                    >
                      {DAY_TYPE_LABEL[d.day_type]}
                    </span>
                    {d.project_name && (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {d.project_name}
                      </span>
                    )}
                    {d.note && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.note}</span>
                    )}
                  </span>
                  <Popconfirm
                    title="Remove this day?"
                    description="Any comp-off it earned is removed with it."
                    onConfirm={() => deleteDay.mutate(d.id)}
                  >
                    <GlassButton variant="ghost" size="sm" icon={<DeleteOutlined />}>
                      {''}
                    </GlassButton>
                  </Popconfirm>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
