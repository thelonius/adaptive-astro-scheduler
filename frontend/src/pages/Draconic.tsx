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
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { DEFAULT_CONFIG } from '../components/ZodiacWheel/types';
import { useChartStore } from '../store/chartStore';
import { chartAnalysisService, DraconicResult } from '../services/chartAnalysisService';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';
import type { SavedChart } from '../types/chart';

export const Draconic: React.FC = () => {
  const { t } = useTranslation();
  const { charts, loadCharts, isLoading: chartsLoading } = useChartStore();
  const [chartId, setChartId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraconicResult | null>(null);
  const [wheelData, setWheelData] = useState<ZodiacWheelData | null>(null);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  useEffect(() => {
    if (charts.length > 0 && !chartId) {
      setChartId(charts[0].id);
    }
  }, [charts, chartId]);

  const selectedChart = charts.find((c) => c.id === chartId);

  const wheelConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    size: 520,
    showHouses: true,
    showAspects: true,
  }), []);

  const handleCalculate = async () => {
    if (!selectedChart) return;
    setLoading(true);
    setError(null);
    try {
      const data = await chartAnalysisService.calculateDraconic(selectedChart);
      setResult(data.draconic);
      setWheelData(data.wheelData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">{t('draconic.title', 'Draconic Chart')}</Heading>
        <Text color="gray.400">
          {t('draconic.subtitle', 'Zodiac rebased to the North Node at 0° Aries — soul-level chart')}
        </Text>

        {chartsLoading && <Spinner />}

        {!chartsLoading && charts.length === 0 && (
          <Alert status="info">
            <AlertIcon />
            {t('draconic.needChart', 'Save a chart in the Chart Library first.')}
          </Alert>
        )}

        {charts.length > 0 && (
          <Card>
            <CardBody>
              <HStack spacing={4} align="end" flexWrap="wrap">
                <Box flex={1} minW="200px">
                  <Text fontSize="sm" mb={1} color="gray.400">
                    {t('draconic.chart', 'Natal chart')}
                  </Text>
                  <Select value={chartId} onChange={(e) => setChartId(e.target.value)}>
                    {charts.map((c: SavedChart) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Box>
                <Button colorScheme="purple" onClick={handleCalculate} isLoading={loading}>
                  {t('draconic.calculate', 'Calculate')}
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

        {wheelData && result && selectedChart && (
          <Card>
            <CardHeader>
              <Heading size="sm">{selectedChart.name} — Draconic</Heading>
              <Text fontSize="sm" color="gray.400">
                North Node (tropical): {result.north_node_longitude.toFixed(2)}°
              </Text>
            </CardHeader>
            <CardBody display="flex" justifyContent="center">
              <ZodiacWheel
                config={wheelConfig}
                latitude={selectedChart.location.latitude}
                longitude={selectedChart.location.longitude}
                timezone={selectedChart.location.timezone}
                useAdaptiveRefresh={false}
                data={wheelData}
              />
            </CardBody>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <Heading size="sm">{t('draconic.positions', 'Draconic positions')}</Heading>
            </CardHeader>
            <CardBody>
              <TableContainer maxH="400px" overflowY="auto">
                <Table size="sm" variant="simple">
                  <Thead position="sticky" top={0} bg="gray.800" zIndex={1}>
                    <Tr>
                      <Th>{t('draconic.planet', 'Planet')}</Th>
                      <Th isNumeric>{t('draconic.longitude', 'Longitude')}</Th>
                      <Th>{t('draconic.sign', 'Sign')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Object.entries(result.planets).map(([planet, p]) => (
                      <Tr key={planet}>
                        <Td fontWeight="semibold">{planet}</Td>
                        <Td isNumeric>{p.longitude.toFixed(2)}°</Td>
                        <Td>{p.sign} {p.sign_degree.toFixed(1)}°</Td>
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

export default Draconic;
