import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  Heading,
  HStack,
  Input,
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
import { format } from 'date-fns';
import { useChartStore } from '../store/chartStore';
import { chartAnalysisService, ProgressionsResult } from '../services/chartAnalysisService';
import type { SavedChart } from '../types/chart';

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

function longitudeToSign(lon: number): string {
  const idx = Math.floor(lon / 30) % 12;
  const deg = lon % 30;
  return `${ZODIAC_SIGNS[idx]} ${deg.toFixed(1)}°`;
}

export const Progressions: React.FC = () => {
  const { t } = useTranslation();
  const { charts, loadCharts, isLoading: chartsLoading } = useChartStore();
  const [chartId, setChartId] = useState('');
  const [targetDate, setTargetDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProgressionsResult | null>(null);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  useEffect(() => {
    if (charts.length > 0 && !chartId) {
      setChartId(charts[0].id);
    }
  }, [charts, chartId]);

  const selectedChart = charts.find((c) => c.id === chartId);

  const handleCalculate = async () => {
    if (!selectedChart) return;
    setLoading(true);
    setError(null);
    try {
      const data = await chartAnalysisService.calculateProgressions(selectedChart, targetDate);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">{t('progressions.title', 'Secondary Progressions')}</Heading>
        <Text color="gray.400">
          {t('progressions.subtitle', '1 day after birth = 1 year of life (secondary progressions)')}
        </Text>

        {chartsLoading && <Spinner />}

        {!chartsLoading && charts.length === 0 && (
          <Alert status="info">
            <AlertIcon />
            {t('progressions.needChart', 'Save a chart in the Chart Library first.')}
          </Alert>
        )}

        {charts.length > 0 && (
          <Card>
            <CardBody>
              <HStack spacing={4} align="end" flexWrap="wrap">
                <Box flex={1} minW="200px">
                  <Text fontSize="sm" mb={1} color="gray.400">
                    {t('progressions.chart', 'Natal chart')}
                  </Text>
                  <Select value={chartId} onChange={(e) => setChartId(e.target.value)}>
                    {charts.map((c: SavedChart) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Box>
                <Box>
                  <Text fontSize="sm" mb={1} color="gray.400">
                    {t('progressions.targetDate', 'Target date')}
                  </Text>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </Box>
                <Button colorScheme="purple" onClick={handleCalculate} isLoading={loading}>
                  {t('progressions.calculate', 'Calculate')}
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

        {result && (
          <Card>
            <CardHeader>
              <Heading size="sm">{selectedChart?.name}</Heading>
              <Text fontSize="sm" color="gray.400">
                Age: {result.meta.age_years.toFixed(2)} years ·
                Progressed date: {new Date(result.meta.progressed_dt).toLocaleString()}
              </Text>
            </CardHeader>
            <CardBody>
              <TableContainer>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>{t('progressions.planet', 'Planet')}</Th>
                      <Th isNumeric>{t('progressions.longitude', 'Longitude')}</Th>
                      <Th>{t('progressions.sign', 'Sign')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Object.entries(result.planets).map(([planet, lon]) => (
                      <Tr key={planet}>
                        <Td fontWeight="semibold">{planet}</Td>
                        <Td isNumeric>{lon.toFixed(2)}°</Td>
                        <Td>{longitudeToSign(lon)}</Td>
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

export default Progressions;
