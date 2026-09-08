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
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useChartStore } from '../store/chartStore';
import { chartAnalysisService, HumanDesignResult } from '../services/chartAnalysisService';
import type { SavedChart } from '../types/chart';

const TYPE_COLORS: Record<string, string> = {
  Generator: 'green',
  'Manifesting Generator': 'teal',
  Manifestor: 'red',
  Projector: 'purple',
  Reflector: 'blue',
};

export const HumanDesign: React.FC = () => {
  const { t } = useTranslation();
  const { charts, loadCharts, isLoading: chartsLoading } = useChartStore();
  const [chartId, setChartId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HumanDesignResult | null>(null);

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
      const data = await chartAnalysisService.calculateHumanDesign(selectedChart);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const renderActivationTable = (
    title: string,
    activations: Record<string, { gate: number; line: number; center: string }>
  ) => (
    <Card>
      <CardHeader>
        <Heading size="sm">{title}</Heading>
      </CardHeader>
      <CardBody>
        <TableContainer maxH="360px" overflowY="auto">
          <Table size="sm" variant="simple">
            <Thead position="sticky" top={0} bg="gray.800" zIndex={1}>
              <Tr>
                <Th>{t('humanDesign.planet', 'Planet')}</Th>
                <Th isNumeric>{t('humanDesign.gate', 'Gate')}</Th>
                <Th isNumeric>{t('humanDesign.line', 'Line')}</Th>
                <Th>{t('humanDesign.center', 'Center')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {Object.entries(activations).map(([planet, a]) => (
                <Tr key={planet}>
                  <Td fontWeight="semibold">{planet}</Td>
                  <Td isNumeric>{a.gate}</Td>
                  <Td isNumeric>{a.line}</Td>
                  <Td>{a.center}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </CardBody>
    </Card>
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">{t('humanDesign.title', 'Human Design')}</Heading>
        <Text color="gray.400">
          {t('humanDesign.subtitle', 'Bodygraph — Personality (birth) + Design (~88° before birth)')}
        </Text>

        {chartsLoading && <Spinner />}

        {!chartsLoading && charts.length === 0 && (
          <Alert status="info">
            <AlertIcon />
            {t('humanDesign.needChart', 'Save a chart in the Chart Library first.')}
          </Alert>
        )}

        {charts.length > 0 && (
          <Card>
            <CardBody>
              <HStack spacing={4} align="end" flexWrap="wrap">
                <Box flex={1} minW="200px">
                  <Text fontSize="sm" mb={1} color="gray.400">
                    {t('humanDesign.chart', 'Birth chart')}
                  </Text>
                  <Select value={chartId} onChange={(e) => setChartId(e.target.value)}>
                    {charts.map((c: SavedChart) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Box>
                <Button colorScheme="purple" onClick={handleCalculate} isLoading={loading}>
                  {t('humanDesign.calculate', 'Calculate')}
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

        {result && selectedChart && (
          <>
            <Card>
              <CardHeader>
                <Heading size="sm">{selectedChart.name}</Heading>
                <Text fontSize="sm" color="gray.400">
                  Design: {new Date(result.meta.design_datetime_utc).toLocaleString()}
                </Text>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <Box>
                    <Text fontSize="xs" color="gray.500" textTransform="uppercase">Type</Text>
                    <Badge colorScheme={TYPE_COLORS[result.type] ?? 'gray'} fontSize="md" p={2}>
                      {result.type}
                    </Badge>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" textTransform="uppercase">Profile</Text>
                    <Text fontSize="2xl" fontWeight="bold">{result.profile}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" textTransform="uppercase">Authority</Text>
                    <Text fontSize="lg" fontWeight="semibold">{result.authority}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" textTransform="uppercase">Strategy</Text>
                    <Text fontSize="sm">{result.strategy}</Text>
                  </Box>
                </SimpleGrid>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <Heading size="sm">{t('humanDesign.centers', 'Defined Centers')}</Heading>
                <Text fontSize="sm" color="gray.400">
                  {result.defined_centers.length} / 9 — {result.definition}
                </Text>
              </CardHeader>
              <CardBody>
                <Wrap spacing={2}>
                  {result.defined_centers.map((c) => (
                    <WrapItem key={c.id}>
                      <Badge colorScheme="purple" fontSize="sm" p={2}>{c.label}</Badge>
                    </WrapItem>
                  ))}
                </Wrap>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <Heading size="sm">{t('humanDesign.channels', 'Defined Channels')}</Heading>
                <Text fontSize="sm" color="gray.400">{result.defined_channels.length} channels</Text>
              </CardHeader>
              <CardBody>
                <Wrap spacing={2}>
                  {result.defined_channels.map((ch) => (
                    <WrapItem key={ch}>
                      <Badge variant="outline" fontSize="sm">{ch}</Badge>
                    </WrapItem>
                  ))}
                </Wrap>
              </CardBody>
            </Card>

            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
              {renderActivationTable(
                t('humanDesign.personality', 'Personality (conscious)'),
                result.personality
              )}
              {renderActivationTable(
                t('humanDesign.design', 'Design (unconscious)'),
                result.design
              )}
            </SimpleGrid>
          </>
        )}
      </VStack>
    </Container>
  );
};

export default HumanDesign;
