import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  Heading,
  HStack,
  Select,
  SimpleGrid,
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
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { DEFAULT_CONFIG } from '../components/ZodiacWheel/types';
import { useChartStore } from '../store/chartStore';
import { chartAnalysisService, NavamsaResult } from '../services/chartAnalysisService';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';
import type { SavedChart } from '../types/chart';

export const Navamsa: React.FC = () => {
  const { t } = useTranslation();
  const { charts, loadCharts, isLoading: chartsLoading } = useChartStore();
  const [chartId, setChartId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NavamsaResult | null>(null);
  const [wheelData, setWheelData] = useState<ZodiacWheelData | null>(null);

  useEffect(() => { loadCharts(); }, [loadCharts]);
  useEffect(() => {
    if (charts.length > 0 && !chartId) setChartId(charts[0].id);
  }, [charts, chartId]);

  const selectedChart = charts.find((c) => c.id === chartId);

  const wheelConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    size: 480,
    showHouses: false,
    showAspects: false,
  }), []);

  const handleCalculate = async () => {
    if (!selectedChart) return;
    setLoading(true);
    setError(null);
    try {
      const data = await chartAnalysisService.calculateNavamsa(selectedChart);
      setResult(data.navamsa);
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
        <Heading size="lg">{t('navamsa.title', 'Navamsa (D9)')}</Heading>
        <Text color="gray.400">
          {t('navamsa.subtitle', 'Vedic 9th divisional chart — marriage, dharma, inner strength (Lahiri sidereal)')}
        </Text>

        {chartsLoading && <Spinner />}

        {!chartsLoading && charts.length === 0 && (
          <Alert status="info">
            <AlertIcon />
            {t('navamsa.needChart', 'Save a chart in the Chart Library first.')}
          </Alert>
        )}

        {charts.length > 0 && (
          <Card>
            <CardBody>
              <HStack spacing={4} align="end" flexWrap="wrap">
                <Box flex={1} minW="200px">
                  <Text fontSize="sm" mb={1} color="gray.400">
                    {t('navamsa.chart', 'Birth chart')}
                  </Text>
                  <Select value={chartId} onChange={(e) => setChartId(e.target.value)}>
                    {charts.map((c: SavedChart) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Box>
                <Button colorScheme="purple" onClick={handleCalculate} isLoading={loading}>
                  {t('navamsa.calculate', 'Calculate')}
                </Button>
              </HStack>
            </CardBody>
          </Card>
        )}

        {error && <Alert status="error"><AlertIcon />{error}</Alert>}

        {result && selectedChart && (
          <>
            <Card>
              <CardHeader>
                <Heading size="sm">{selectedChart.name} — D9 Navamsa</Heading>
                <Text fontSize="sm" color="gray.400">
                  Ayanamsa ({result.meta.ayanamsa_type}): {result.meta.ayanamsa.toFixed(4)}°
                </Text>
              </CardHeader>
              <CardBody>
                {result.vargottama_planets.length > 0 ? (
                  <Box>
                    <Text fontSize="sm" color="gray.400" mb={2}>
                      {t('navamsa.vargottama', 'Vargottama (same sign in D1 & D9)')}:
                    </Text>
                    <Wrap spacing={2}>
                      {result.vargottama_planets.map((p) => (
                        <WrapItem key={p}>
                          <Badge colorScheme="yellow">{p}</Badge>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                ) : (
                  <Text fontSize="sm" color="gray.500">No vargottama planets</Text>
                )}
              </CardBody>
            </Card>

            {wheelData && (
              <Card>
                <CardHeader>
                  <Heading size="sm">{t('navamsa.wheel', 'D9 wheel')}</Heading>
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

            <Card>
              <CardHeader>
                <Heading size="sm">{t('navamsa.positions', 'D1 vs D9 positions')}</Heading>
              </CardHeader>
              <CardBody>
                <TableContainer maxH="500px" overflowY="auto">
                  <Table size="sm" variant="simple">
                    <Thead position="sticky" top={0} bg="gray.800" zIndex={1}>
                      <Tr>
                        <Th>Planet</Th>
                        <Th>D1 Sign</Th>
                        <Th isNumeric>D1°</Th>
                        <Th>D9 Sign</Th>
                        <Th isNumeric>D9°</Th>
                        <Th isNumeric>Nav.</Th>
                        <Th>Varg.</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {Object.entries(result.planets).map(([planet, p]) => (
                        <Tr key={planet}>
                          <Td fontWeight="semibold">{planet}</Td>
                          <Td>{p.d1.sign}</Td>
                          <Td isNumeric>{p.d1.sign_degree.toFixed(1)}°</Td>
                          <Td>{p.d9.sign}</Td>
                          <Td isNumeric>{p.d9.sign_degree.toFixed(1)}°</Td>
                          <Td isNumeric>{p.d9.navamsa_number}</Td>
                          <Td>{p.is_vargottama ? '✓' : ''}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </CardBody>
            </Card>
          </>
        )}
      </VStack>
    </Container>
  );
};

export default Navamsa;
