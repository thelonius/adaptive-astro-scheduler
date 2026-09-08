import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  Heading,
  HStack,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  TableContainer,
  VStack,
  Alert,
  AlertIcon,
  Badge,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { DEFAULT_CONFIG } from '../components/ZodiacWheel/types';
import { useChartStore } from '../store/chartStore';
import { chartAnalysisService, SynastryAspect } from '../services/chartAnalysisService';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';
import type { SavedChart } from '../types/chart';

export const Synastry: React.FC = () => {
  const { t } = useTranslation();
  const { charts, loadCharts, isLoading: chartsLoading } = useChartStore();
  const [chartAId, setChartAId] = useState('');
  const [chartBId, setChartBId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspects, setAspects] = useState<SynastryAspect[]>([]);
  const [wheelA, setWheelA] = useState<ZodiacWheelData | null>(null);
  const [wheelB, setWheelB] = useState<ZodiacWheelData | null>(null);
  const [labels, setLabels] = useState<{ a: string; b: string }>({ a: '', b: '' });

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  useEffect(() => {
    if (charts.length >= 2 && !chartAId && !chartBId) {
      setChartAId(charts[0].id);
      setChartBId(charts[1].id);
    } else if (charts.length === 1 && !chartAId) {
      setChartAId(charts[0].id);
    }
  }, [charts, chartAId, chartBId]);

  const wheelConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    size: 520,
    showHouses: true,
    showAspects: false,
  }), []);

  const chartA = charts.find((c) => c.id === chartAId);
  const chartB = charts.find((c) => c.id === chartBId);

  const handleCompare = async () => {
    if (!chartA || !chartB) return;
    if (chartA.id === chartB.id) {
      setError(t('synastry.sameChartError', 'Select two different charts'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await chartAnalysisService.calculateSynastry(chartA, chartB);
      setAspects(result.synastry.inter_aspects);
      setWheelA(result.wheelA);
      setWheelB(result.wheelB);
      setLabels({ a: chartA.name, b: chartB.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const renderChartSelect = (
    label: string,
    value: string,
    onChange: (id: string) => void
  ) => (
    <Box flex={1}>
      <Text fontSize="sm" mb={1} color="gray.400">{label}</Text>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('synastry.selectChart', 'Select chart')}
      >
        {charts.map((c: SavedChart) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>
    </Box>
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">{t('synastry.title', 'Synastry')}</Heading>
        <Text color="gray.400">
          {t('synastry.subtitle', 'Compare two natal charts for relationship aspects')}
        </Text>

        {chartsLoading && <Spinner />}

        {!chartsLoading && charts.length < 2 && (
          <Alert status="info">
            <AlertIcon />
            {t('synastry.needTwoCharts', 'Save at least two charts in the Chart Library to compare.')}
          </Alert>
        )}

        {charts.length >= 2 && (
          <Card>
            <CardBody>
              <HStack spacing={4} align="end" flexWrap="wrap">
                {renderChartSelect(t('synastry.chartA', 'Chart A (outer)'), chartAId, setChartAId)}
                {renderChartSelect(t('synastry.chartB', 'Chart B (inner)'), chartBId, setChartBId)}
                <Button
                  colorScheme="purple"
                  onClick={handleCompare}
                  isLoading={loading}
                  isDisabled={!chartAId || !chartBId}
                >
                  {t('synastry.compare', 'Compare')}
                </Button>
              </HStack>
            </CardBody>
          </Card>
        )}

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {wheelA && wheelB && (
          <Card>
            <CardHeader>
              <Heading size="sm">
                {labels.a} × {labels.b}
              </Heading>
            </CardHeader>
            <CardBody display="flex" justifyContent="center">
              <ZodiacWheel
                config={wheelConfig}
                latitude={chartA?.location.latitude ?? 0}
                longitude={chartA?.location.longitude ?? 0}
                timezone={chartA?.location.timezone ?? 'UTC'}
                useAdaptiveRefresh={false}
                data={wheelA}
                innerData={wheelB}
              />
            </CardBody>
          </Card>
        )}

        {aspects.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="sm">{t('synastry.aspectsTitle', 'Inter-chart aspects')}</Heading>
              <Text fontSize="sm" color="gray.400">{aspects.length} aspects</Text>
            </CardHeader>
            <CardBody>
              <TableContainer maxH="400px" overflowY="auto">
                <Table size="sm" variant="simple">
                  <Thead position="sticky" top={0} bg="gray.800" zIndex={1}>
                    <Tr>
                      <Th>{labels.a}</Th>
                      <Th>{labels.b}</Th>
                      <Th>{t('synastry.aspect', 'Aspect')}</Th>
                      <Th isNumeric>{t('synastry.orb', 'Orb')}</Th>
                      <Th>{t('synastry.nature', 'Nature')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {aspects.map((a, idx) => (
                      <Tr key={idx}>
                        <Td fontWeight="semibold">{a.chart_a_point}</Td>
                        <Td fontWeight="semibold">{a.chart_b_point}</Td>
                        <Td>
                          {a.symbol} {a.aspect}
                        </Td>
                        <Td isNumeric>{a.orb.toFixed(2)}°</Td>
                        <Td>
                          <Badge
                            colorScheme={
                              a.nature === 'harmonious' ? 'green' :
                              a.nature === 'tense' ? 'red' : 'gray'
                            }
                          >
                            {a.nature}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Container>
  );
};

export default Synastry;
