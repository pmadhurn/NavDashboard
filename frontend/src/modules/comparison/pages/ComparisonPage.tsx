import React, { useState } from 'react';
import { DiffOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import ComparisonSelector from '../components/ComparisonSelector';
import ComparisonTable from '../components/ComparisonTable';
import {
  useCompareCouples,
  useComparePairs,
  useCompareDevices,
  ComparisonResult,
} from '../hooks/useComparison';

const ComparisonPage: React.FC = () => {
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const compareCouples = useCompareCouples();
  const comparePairs = useComparePairs();
  const compareDevices = useCompareDevices();

  const isLoading =
    compareCouples.isPending ||
    comparePairs.isPending ||
    compareDevices.isPending;

  const handleCompare = async (
    entityType: string,
    id1: string,
    id2: string,
  ) => {
    setResult(null);
    const payload = { entity_id_1: id1, entity_id_2: id2 };

    try {
      let res: ComparisonResult;
      switch (entityType) {
        case 'couples':
          res = await compareCouples.mutateAsync(payload);
          break;
        case 'pairs':
          res = await comparePairs.mutateAsync(payload);
          break;
        case 'devices':
          res = await compareDevices.mutateAsync(payload);
          break;
        default:
          return;
      }
      setResult(res);
    } catch (err) {
      console.error('Comparison failed:', err);
    }
  };

  return (
    <div>
      <PageHeader title="Configuration Comparison" />

      <ComparisonSelector onCompare={handleCompare} />

      {isLoading && (
        <div style={{ marginTop: 32 }}>
          <LoadingSpinner />
        </div>
      )}

      {!isLoading && result && (
        <div style={{ marginTop: 24 }}>
          <ComparisonTable result={result} />
        </div>
      )}

      {!isLoading && !result && (
        <div style={{ marginTop: 48 }}>
          <EmptyState
            icon={
              <DiffOutlined style={{ fontSize: 48, color: '#7A7A7A' }} />
            }
            title="Select two entities to compare"
            description="Select two entities of the same type to compare their configurations side by side"
          />
        </div>
      )}
    </div>
  );
};

export default ComparisonPage;