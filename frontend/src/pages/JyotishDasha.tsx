import React, { useEffect, useState } from 'react';
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
  Progress,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useChartStore } from '../store/chartStore';
import { chartAnalysisService, VimshottariDashaResult } from '../services/chartAnalysisService';
import type { SavedChart } from '../types/chart';

const LORD_COLORS: Record<string, string> = {
  Sun: 'orange', Moon: 'gray', Mars: 'red', Mercury: 'teal',
  Jupiter: 'purple', Venus: 'pink', Saturn: 'blue',
  Rahu: 'cyan', Ketu: 'green',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export const JyotishDasha: React.FC = () => {
  const { t } = useTranslation();
  const { charts, loadCharts, isLoading: chartsLoading } = useChartStore();
  const [chartId, setChartId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VimshottariDashaResult | null>(null);

  useEffect(() => { loadCharts(); }, [loadCharts]);
  useEffect(() => {
    if (charts.length > 0 && !chartId) setChartId(charts[0].id);
  }, [charts, chartId]);

  const selectedChart = charts.find((c) => c.id === chartId);

  const handleCalculate = async () => {
    if (!selectedChart) return;
    setLoading(true);
    setError(null);
    try {
      const data = await chartAnalysisService.calculateVimshottariDasha(selectedChart);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const currentMaha = result?.current.mahadasha;
  const currentAntar = result?.current.antardasha;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">{t('jyotish.title', 'Vimshottari Dasha')}</Heading>
        <Text color="gray.400">
          {t('jyotish.subtitle', 'Vedic planetary periods from birth Moon nakshatra (Lahiri)')}
        </Text>

        {chartsLoading && <Spinner />}

        {!chartsLoading && charts.length === 0 && (
          <Alert status="info">
            <AlertIcon />
            {t('jyotish.needChart', 'Save a chart in the Chart Library first.')}
          </Alert>
        )}

        {charts.length > 0 && (
          <Card>
            <CardBody>
              <HStack spacing={4} align="end" flexWrap="wrap">
                <Box flex={1} minW="200px">
                  <Text fontSize="sm" mb={1} color="gray.400">
                    {t('jyotish.chart', 'Birth chart')}
                  </Text>
                  <Select value={chartId} onChange={(e) => setChartId(e.target.value)}>
                    {charts.map((c: SavedChart) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Box>
                <Button colorScheme="purple" onClick={handleCalculate} isLoading={loading}>
                  {t('jyotish.calculate', 'Calculate')}
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
                <Heading size="sm">{selectedChart.name}</Heading>
                <Text fontSize="sm" color="gray.400">
                  {result.birth_nakshatra.name_ru} ({result.birth_nakshatra.name}) · Pada {result.birth_nakshatra.pada} · Ruler: {result.birth_nakshatra.ruler}
                </Text>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {currentMaha && (
                    <Box>
                      <Text fontSize="xs" color="gray.500" textTransform="uppercase" mb={1}>Mahadasha</Text>
                      <Badge colorScheme={LORD_COLORS[currentMaha.lord] ?? 'gray'} fontSize="lg" p={2}>
                        {currentMaha.lord}
                      </Badge>
                      <Text fontSize="sm" mt={2}>{formatDate(currentMaha.start)} — {formatDate(currentMaha.end)}</Text>
                      <Progress value={currentMaha.progress_pct ?? 0} size="sm" colorScheme="purple" mt={2} />
                      <Text fontSize="xs" color="gray.500">{currentMaha.progress_pct}% elapsed</Text>
                    </Box>
                  )}
                  {currentAntar && (
                    <Box>
                      <Text fontSize="xs" color="gray.500" textTransform="uppercase" mb={1}>Antardasha</Text>
                      <Badge colorScheme={LORD_COLORS[currentAntar.lord] ?? 'gray'} fontSize="lg" p={2}>
                        {currentAntar.lord}
                      </Badge>
                      <Text fontSize="sm" mt={2}>{formatDate(currentAntar.start)} — {formatDate(currentAntar.end)}</Text>
                      <Progress value={currentAntar.progress_pct ?? 0} size="sm" colorScheme="teal" mt={2} />
                      <Text fontSize="xs" color="gray.500">{currentAntar.progress_pct}% elapsed</Text>
                    </Box>
                  )}
                </SimpleGrid>
                <Text fontSize="sm" color="gray.400" mt={4}>
                  Birth dasha: {result.birth_dasha_lord} · Balance at birth: {result.birth_dasha_balance_years.toFixed(2)} years
                </Text>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <Heading size="sm">{t('jyotish.timeline', 'Mahadasha timeline')}</Heading>
              </CardHeader>
              <CardBody>
                <TableContainer maxH="500px" overflowY="auto">
                  <Table size="sm" variant="simple">
                    <Thead position="sticky" top={0} bg="gray.800" zIndex={1}>
                      <Tr>
                        <Th>Lord</Th>
                        <Th>Start</Th>
                        <Th>End</Th>
                        <Th isNumeric>Years</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {result.mahadashas.map((m) => (
                        <Tr key={`${m.lord}-${m.start}`} bg={currentMaha?.lord === m.lord && currentMaha?.start === m.start ? 'whiteAlpha.100' : undefined}>
                          <Td>
                            <Badge colorScheme={LORD_COLORS[m.lord] ?? 'gray'}>{m.lord}</Badge>
                          </Td>
                          <Td>{formatDate(m.start)}</Td>
                          <Td>{formatDate(m.end)}</Td>
                          <Td isNumeric>{m.duration_years.toFixed(2)}</Td>
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

export default JyotishDasha;
