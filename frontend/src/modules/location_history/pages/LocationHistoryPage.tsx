import { useState, useCallback } from 'react';
import { Select, DatePicker } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassButton from '@/shared/components/GlassButton';
import HistoryTimeline from '../components/HistoryTimeline';
import HistoryMap from '../components/HistoryMap';
import {
  useLocationHistory,
  useCouplesForSelect,
} from '../hooks/useLocationHistory';
import type { LocationHistoryEntry } from '../hooks/useLocationHistory';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

export default function LocationHistoryPage() {
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [appliedCoupleId, setAppliedCoupleId] = useState<string | null>(null);
  const [appliedDateRange, setAppliedDateRange] = useState<[string, string] | null>(null);
  const [page, setPage] = useState(1);

  const { data: couples, isLoading: couplesLoading } = useCouplesForSelect();
  const { data: historyData, isLoading: historyLoading } = useLocationHistory(
    appliedCoupleId,
    appliedDateRange,
    page,
    50
  );

  const entries: LocationHistoryEntry[] = historyData?.items ?? [];
  const hasMore = historyData ? page < historyData.pages : false;

  const handleApply = useCallback(() => {
    setAppliedCoupleId(selectedCoupleId);
    setAppliedDateRange(dateRange);
    setPage(1);
    setSelectedEntryId(null);
  }, [selectedCoupleId, dateRange]);

  const handleDateChange = (
    _dates: [Dayjs | null, Dayjs | null] | null,
    dateStrings: [string, string]
  ) => {
    if (dateStrings[0] && dateStrings[1]) {
      setDateRange(dateStrings);
    } else {
      setDateRange(null);
    }
  };

  const handleSelectEntry = useCallback((id: string) => {
    setSelectedEntryId((prev) => (prev === id ? null : id));
  }, []);

  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  return (
    <div>
      <PageHeader
        title="Location History"
        subtitle="Track couple location changes over time"
      />

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Select
          placeholder="All Couples"
          allowClear
          showSearch
          optionFilterProp="label"
          loading={couplesLoading}
          value={selectedCoupleId}
          onChange={(val) => setSelectedCoupleId(val || null)}
          style={{ minWidth: 200 }}
          popupClassName="glass-dropdown"
          options={[
            { label: 'All Couples', value: '' },
            ...(couples?.map((c) => ({
              label: c.name,
              value: c.id,
            })) ?? []),
          ]}
        />

        <RangePicker
          onChange={handleDateChange}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--input-border)',
            borderRadius: 8,
          }}
        />

        <GlassButton
          variant="secondary"
          icon={<FilterOutlined />}
          onClick={handleApply}
        >
          Apply
        </GlassButton>
      </div>

      {/* Two-panel layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          height: 'calc(100vh - 260px)',
          minHeight: 400,
        }}
      >
        {/* Left panel: Timeline */}
        <div
          style={{
            overflow: 'auto',
            paddingRight: 8,
            /* Custom scrollbar */
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--audit-line) transparent',
          }}
        >
          <HistoryTimeline
            entries={entries}
            loading={historyLoading}
            selectedId={selectedEntryId}
            onSelect={handleSelectEntry}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
          />
        </div>

        {/* Right panel: Map */}
        <div>
          <HistoryMap
            entries={entries}
            selectedEntryId={selectedEntryId}
            coupleId={appliedCoupleId}
          />
        </div>
      </div>

      {/* Responsive style override for mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
        }
        .glass-dropdown .ant-select-item {
          color: var(--text-secondary) !important;
        }
        .glass-dropdown .ant-select-item-option-active {
          background: rgba(255, 255, 255, 0.06) !important;
        }
        .glass-dropdown .ant-select-item-option-selected {
          background: rgba(255, 255, 255, 0.1) !important;
          color: var(--text-primary) !important;
        }
        .glass-dropdown {
          background: var(--sidebar-hover) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
    </div>
  );
}
