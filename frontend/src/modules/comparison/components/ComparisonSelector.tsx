import React, { useState, useMemo } from 'react';
import { Row, Col, Select, Segmented } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import {
  useCoupleOptions,
  usePairOptions,
  useDeviceOptions,
  EntityOption,
} from '../hooks/useComparison';

interface ComparisonSelectorProps {
  onCompare: (entityType: string, id1: string, id2: string) => void;
}

const ComparisonSelector: React.FC<ComparisonSelectorProps> = ({
  onCompare,
}) => {
  const [entityType, setEntityType] = useState<string>('couples');
  const [entityA, setEntityA] = useState<string | undefined>(undefined);
  const [entityB, setEntityB] = useState<string | undefined>(undefined);

  const { data: coupleOptions, isLoading: couplesLoading } =
    useCoupleOptions();
  const { data: pairOptions, isLoading: pairsLoading } = usePairOptions();
  const { data: deviceOptions, isLoading: devicesLoading } =
    useDeviceOptions();

  const currentOptions: EntityOption[] = useMemo(() => {
    switch (entityType) {
      case 'couples':
        return coupleOptions || [];
      case 'pairs':
        return pairOptions || [];
      case 'devices':
        return deviceOptions || [];
      default:
        return [];
    }
  }, [entityType, coupleOptions, pairOptions, deviceOptions]);

  const isOptionsLoading =
    (entityType === 'couples' && couplesLoading) ||
    (entityType === 'pairs' && pairsLoading) ||
    (entityType === 'devices' && devicesLoading);

  const optionsA = currentOptions;
  const optionsB = currentOptions.filter((o) => o.value !== entityA);

  const canCompare = !!entityA && !!entityB && entityA !== entityB;

  const handleEntityTypeChange = (val: string | number) => {
    setEntityType(val as string);
    setEntityA(undefined);
    setEntityB(undefined);
  };

  const handleCompare = () => {
    if (canCompare && entityA && entityB) {
      onCompare(entityType, entityA, entityB);
    }
  };

  return (
    <GlassCard style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <div
          style={{ color: '#B8B8B8', fontSize: 12, marginBottom: 8 }}
        >
          Entity Type
        </div>
        <Segmented
          value={entityType}
          onChange={handleEntityTypeChange}
          options={[
            { label: 'Couples', value: 'couples' },
            { label: 'Pairs', value: 'pairs' },
            { label: 'Devices', value: 'devices' },
          ]}
          style={{
            background: 'rgba(255,255,255,0.04)',
          }}
        />
      </div>

      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={10}>
          <div
            style={{ color: '#B8B8B8', fontSize: 12, marginBottom: 6 }}
          >
            Entity A
          </div>
          <Select
            showSearch
            allowClear
            placeholder={`Select ${entityType.slice(0, -1)}...`}
            style={{ width: '100%' }}
            value={entityA}
            onChange={setEntityA}
            options={optionsA}
            loading={isOptionsLoading}
            filterOption={(input, option) =>
              (option?.label ?? '')
                .toString()
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Col>

        <Col
          xs={24}
          sm={4}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingTop: 20,
          }}
        >
          <SwapOutlined
            style={{ fontSize: 20, color: '#7A7A7A' }}
          />
        </Col>

        <Col xs={24} sm={10}>
          <div
            style={{ color: '#B8B8B8', fontSize: 12, marginBottom: 6 }}
          >
            Entity B
          </div>
          <Select
            showSearch
            allowClear
            placeholder={`Select ${entityType.slice(0, -1)}...`}
            style={{ width: '100%' }}
            value={entityB}
            onChange={setEntityB}
            options={optionsB}
            loading={isOptionsLoading}
            filterOption={(input, option) =>
              (option?.label ?? '')
                .toString()
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Col>
      </Row>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <GlassButton
          onClick={handleCompare}
          disabled={!canCompare}
          style={{
            background: canCompare
              ? 'rgba(95,143,107,0.2)'
              : undefined,
            borderColor: canCompare ? '#5F8F6B' : undefined,
            color: canCompare ? '#5F8F6B' : undefined,
          }}
        >
          Compare
        </GlassButton>
      </div>
    </GlassCard>
  );
};

export default ComparisonSelector;