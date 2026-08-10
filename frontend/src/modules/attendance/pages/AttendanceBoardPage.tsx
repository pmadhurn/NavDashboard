import { useMemo, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { TeamOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ShareButton from '@/shared/components/ShareButton';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import {
  DAY_TYPES,
  DAY_TYPE_COLOR,
  DAY_TYPE_LABEL,
  useAttendanceBoard,
} from '../hooks/useAttendance';

/**
 * Who was where, for the whole team, over one month.
 *
 * The board is scoped server-side: a SELF-scoped technician sees one row (their
 * own) rather than a 403, so the page is useful at every permission level.
 */
export default function AttendanceBoardPage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const isMobile = useIsMobile();

  const range = useMemo(
    () => ({
      date_from: month.startOf('month').format('YYYY-MM-DD'),
      date_to: month.endOf('month').format('YYYY-MM-DD'),
    }),
    [month]
  );

  const { data: rows, isLoading } = useAttendanceBoard(range);

  const daysInMonth = month.daysInMonth();

  // person -> day-of-month -> entry
  const byPerson = useMemo(() => {
    const map = new Map<
      string,
      { name: string; days: Map<number, { day_type: string; project_name: string | null }> }
    >();
    for (const row of rows ?? []) {
      const name = row.person_name ?? 'Unknown';
      if (!map.has(row.person_id)) map.set(row.person_id, { name, days: new Map() });
      map.get(row.person_id)!.days.set(dayjs(row.day).date(), {
        day_type: row.day_type,
        project_name: row.project_name,
      });
    }
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Attendance Board"
        icon={<TeamOutlined />}
        subtitle={`Who was where · ${month.format('MMMM YYYY')}`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <DatePicker
              picker="month"
              value={month}
              onChange={(m) => m && setMonth(m)}
              allowClear={false}
            />
            <ShareButton title={`Attendance ${month.format('MMMM YYYY')}`} url="/attendance" />
          </div>
        }
      />

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {DAY_TYPES.map((dt) => (
          <span
            key={dt.value}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: DAY_TYPE_COLOR[dt.value],
                display: 'inline-block',
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{dt.label}</span>
          </span>
        ))}
      </div>

      <GlassCard>
        {isLoading ? (
          <LoadingSpinner text="Loading board…" />
        ) : byPerson.length === 0 ? (
          <EmptyState
            title="Nothing logged this month"
            description="Attendance entries appear here as the team logs their days."
          />
        ) : (
          // The grid is wide by nature; it scrolls inside its own container so
          // the page body never scrolls horizontally.
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 140 + daysInMonth * 26 }}>
              {/* Header row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `140px repeat(${daysInMonth}, 26px)`,
                  gap: 2,
                  marginBottom: 4,
                }}
              >
                <div />
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = month.startOf('month').add(i, 'day');
                  const weekend = d.day() === 0 || d.day() === 6;
                  return (
                    <div
                      key={i}
                      style={{
                        textAlign: 'center',
                        fontSize: 9,
                        color: weekend ? 'var(--text-secondary)' : 'var(--text-muted)',
                        fontWeight: weekend ? 700 : 400,
                      }}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>

              {byPerson.map(([personId, person]) => (
                <div
                  key={personId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `140px repeat(${daysInMonth}, 26px)`,
                    gap: 2,
                    marginBottom: 3,
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      paddingRight: 8,
                    }}
                    title={person.name}
                  >
                    {person.name}
                  </div>
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const entry = person.days.get(i + 1);
                    const d = month.startOf('month').add(i, 'day');
                    const weekend = d.day() === 0 || d.day() === 6;
                    return (
                      <div
                        key={i}
                        title={
                          entry
                            ? `${person.name} · ${d.format('D MMM')} · ${DAY_TYPE_LABEL[entry.day_type]}${entry.project_name ? ' · ' + entry.project_name : ''}`
                            : `${person.name} · ${d.format('D MMM')} · not logged`
                        }
                        style={{
                          height: 22,
                          borderRadius: 4,
                          background: entry
                            ? DAY_TYPE_COLOR[entry.day_type]
                            : weekend
                              ? 'var(--overlay-subtle)'
                              : 'transparent',
                          border: entry ? 'none' : '1px solid var(--overlay-subtle)',
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      {isMobile && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          Scroll the board sideways to reach the end of the month.
        </div>
      )}
    </div>
  );
}
