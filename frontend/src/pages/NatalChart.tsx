import React, { useMemo, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardBody,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { BirthDataForm } from '../components/NatalChart/BirthDataForm';
import { ChartInterpretation } from '../components/NatalChart/ChartInterpretation';
import { useNatalChart } from '../hooks/useNatalChart';
import { chartService } from '../services/chartService';
import { useChartStore } from '../store/chartStore';

export const NatalChart: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, calculateChart, loadSavedChart } = useNatalChart();
  const { addChart } = useChartStore();
  const toast = useToast();
  const saveDialog = useDisclosure();

  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveType, setSaveType] = useState<'natal' | 'event' | 'horary'>('natal');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadSavedChart(id);
    }
  }, [id, loadSavedChart]);

  const handleSaveChart = async () => {
    if (!data || !saveName.trim()) return;
    setSaving(true);
    try {
      const saved = await chartService.saveChart({
        name: saveName.trim(),
        type: saveType,
        date: data.birthData.date,
        time: data.birthData.time.length === 5
          ? data.birthData.time
          : data.birthData.time.substring(0, 5),
        location: {
          latitude: data.birthData.location.latitude,
          longitude: data.birthData.location.longitude,
          city: '',
          country: '',
          timezone: data.birthData.location.timezone,
        },
        description: saveDescription.trim() || undefined,
        tags: undefined,
      } as any);

      addChart(saved);

      toast({
        title: t('natalChart.saveSuccessTitle'),
        description: t('natalChart.saveSuccessDesc', { name: saved.name }),
        status: 'success',
        duration: 3000,
      });

      saveDialog.onClose();
      setSaveName('');
      setSaveDescription('');
      setSaveType('natal');
    } catch (err) {
      console.error('Save chart failed:', err);
      toast({
        title: t('natalChart.saveErrorTitle'),
        description: t('natalChart.saveErrorDesc'),
        status: 'error',
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  // Prepare zodiac wheel config for natal chart (static, no refresh)
  const wheelConfig = useMemo(() => ({
    size: 600,
    showHouses: true,
    showAspects: true,
    showDegrees: true,
    showRetrogrades: true,
    aspectOrb: 8,
    refreshInterval: 0, // No auto-refresh for natal chart
    colorScheme: {
      background: '#1a202c',
      zodiacRing: '#2d3748',
      zodiacText: '#e2e8f0',
      degreeMarks: '#4a5568',
      houses: '#4a5568',
      planets: {
        'Sun': '#ffd700',
        'Moon': '#c0c0c0',
        'Mercury': '#ffa500',
        'Venus': '#00ff7f',
        'Mars': '#ff6b6b',
        'Jupiter': '#4169e1',
        'Saturn': '#daa520',
        'Uranus': '#00ced1',
        'Neptune': '#4169e1',
        'Pluto': '#8b008b',
      },
      aspects: {
        'conjunction': '#ffd700',
        'sextile': '#00ced1',
        'square': '#ff6b6b',
        'trine': '#90ee90',
        'opposition': '#ff69b4',
        'quincunx': '#da70d6',
      },
    },
  }), []);

  return (
    <Container maxW="1400px" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="xl" mb={2}>
            {t('natalChart.title')}
          </Heading>
          <Text color="gray.600">
            {t('natalChart.subtitle')}
          </Text>
        </Box>

        {/* Main Layout */}
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1.5fr', xl: '1fr 2fr' }} gap={6}>
          {/* Left: Input Form */}
          <GridItem>
            <BirthDataForm onCalculate={calculateChart} loading={loading} />

            {/* Birth Data Summary (if calculated) */}
            {data && (
              <Card mt={6}>
                <CardHeader>
                  <Heading size="sm">{t('natalChart.birthDataTitle')}</Heading>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={2} fontSize="sm">
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">{t('natalChart.dateLabel')}</Text>
                      <Text>{new Date(data.birthData.date).toLocaleDateString(i18n.language)}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">{t('natalChart.timeLabel')}</Text>
                      <Text>{data.birthData.time}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">{t('natalChart.coordsLabel')}</Text>
                      <Text>
                        {data.birthData.location.latitude.toFixed(2)}°N,{' '}
                        {data.birthData.location.longitude.toFixed(2)}°E
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">{t('natalChart.timezoneLabel')}</Text>
                      <Text>{data.birthData.location.timezone}</Text>
                    </HStack>
                    <Divider my={2} />
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">{t('natalChart.moonPhaseLabel')}</Text>
                      <Badge colorScheme="purple">{data.moonPhase}</Badge>
                    </HStack>
                    <Button
                      mt={3}
                      colorScheme="green"
                      size="sm"
                      onClick={saveDialog.onOpen}
                    >
                      💾 {t('natalChart.saveButton')}
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            )}
          </GridItem>

          {/* Right: Visualization */}
          <GridItem>
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>{t('natalChart.calculationError')}</AlertTitle>
                  <AlertDescription>{error.message}</AlertDescription>
                </Box>
              </Alert>
            )}

            {!data && !loading && (
              <Card h="full">
                <CardBody display="flex" alignItems="center" justifyContent="center">
                  <VStack spacing={4} color="gray.500">
                    <Text fontSize="4xl">🌟</Text>
                    <Text textAlign="center">
                      {t('natalChart.emptyHint')}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            )}

            {loading && (
              <Card h="full">
                <CardBody display="flex" alignItems="center" justifyContent="center">
                  <VStack spacing={4}>
                    <Text fontSize="4xl">⏳</Text>
                    <Text>{t('natalChart.calculating')}</Text>
                  </VStack>
                </CardBody>
              </Card>
            )}

            {data && !loading && (
              <VStack spacing={6} align="stretch">
                {/* Zodiac Wheel */}
                <Card>
                  <CardBody display="flex" justifyContent="center" alignItems="center" p={4}>
                    <ZodiacWheel
                      config={wheelConfig}
                      latitude={data.birthData.location.latitude}
                      longitude={data.birthData.location.longitude}
                      timezone={data.birthData.location.timezone}
                      useAdaptiveRefresh={false}
                      data={data}
                    />
                  </CardBody>
                </Card>

                {/* Planet Positions Table */}
                <Card>
                  <CardHeader>
                    <Heading size="sm">{t('natalChart.planetPositions')}</Heading>
                  </CardHeader>
                  <CardBody>
                    <TableContainer>
                      <Table size="sm" variant="simple">
                        <Thead>
                          <Tr>
                            <Th>{t('natalChart.planetCol')}</Th>
                            <Th>{t('natalChart.signCol')}</Th>
                            <Th isNumeric>{t('natalChart.longitudeCol')}</Th>
                            <Th>{t('natalChart.statusCol')}</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {data.planets.map((planet, idx) => (
                            <Tr key={idx}>
                              <Td fontWeight="semibold">{planet.name}</Td>
                              <Td>{planet.zodiacSign.name}</Td>
                              <Td isNumeric>{planet.longitude.toFixed(2)}°</Td>
                              <Td>
                                {planet.isRetrograde && (
                                  <Badge colorScheme="orange" fontSize="xs">
                                    {t('natalChart.retrograde')}
                                  </Badge>
                                )}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </CardBody>
                </Card>

                {/* Houses Table */}
                {data.houses && data.houses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <Heading size="sm">{t('natalChart.housesTitle')}</Heading>
                    </CardHeader>
                    <CardBody>
                      <TableContainer>
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th>{t('natalChart.houseCol')}</Th>
                              <Th>{t('natalChart.cuspCol')}</Th>
                              <Th isNumeric>{t('natalChart.longitudeCol')}</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {data.houses.map((house, idx) => (
                              <Tr key={idx}>
                                <Td fontWeight="semibold">{t('natalChart.houseNumber', { number: house.number })}</Td>
                                <Td>{house.sign?.name || 'N/A'}</Td>
                                <Td isNumeric>{house.cusp.toFixed(2)}°</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </CardBody>
                  </Card>
                )}

                {/* Chart Interpretation */}
                <ChartInterpretation planets={data.planets} />

                {/* Major Aspects */}
                {data.aspects && data.aspects.length > 0 && (
                  <Card>
                    <CardHeader>
                      <Heading size="sm">{t('natalChart.majorAspects')}</Heading>
                    </CardHeader>
                    <CardBody>
                      <TableContainer>
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th>{t('natalChart.planetsCol')}</Th>
                              <Th>{t('natalChart.aspectCol')}</Th>
                              <Th isNumeric>{t('natalChart.angleCol')}</Th>
                              <Th isNumeric>{t('natalChart.orbCol')}</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {data.aspects
                              .filter(aspect => aspect.isExact || aspect.orb < 3)
                              .slice(0, 15)
                              .map((aspect, idx) => (
                                <Tr key={idx}>
                                  <Td>
                                    {aspect.body1.name} - {aspect.body2.name}
                                  </Td>
                                  <Td>
                                    <Badge
                                      colorScheme={
                                        aspect.type === 'conjunction' ? 'yellow' :
                                          aspect.type === 'trine' ? 'green' :
                                            aspect.type === 'square' ? 'red' :
                                              aspect.type === 'opposition' ? 'pink' :
                                                aspect.type === 'sextile' ? 'cyan' :
                                                  'purple'
                                      }
                                      fontSize="xs"
                                    >
                                      {aspect.type === 'conjunction' && t('natalChart.aspect.conjunction')}
                                      {aspect.type === 'sextile' && t('natalChart.aspect.sextile')}
                                      {aspect.type === 'square' && t('natalChart.aspect.square')}
                                      {aspect.type === 'trine' && t('natalChart.aspect.trine')}
                                      {aspect.type === 'opposition' && t('natalChart.aspect.opposition')}
                                      {aspect.type === 'quincunx' && t('natalChart.aspect.quincunx')}
                                    </Badge>
                                  </Td>
                                  <Td isNumeric>{aspect.angle.toFixed(1)}°</Td>
                                  <Td isNumeric>{aspect.orb.toFixed(2)}°</Td>
                                </Tr>
                              ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            )}
          </GridItem>
        </Grid>
      </VStack>

      <Modal isOpen={saveDialog.isOpen} onClose={saveDialog.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('natalChart.saveDialogTitle')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>{t('natalChart.saveNameLabel')}</FormLabel>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={t('natalChart.saveNamePlaceholder') ?? ''}
                  autoFocus
                />
              </FormControl>
              <FormControl>
                <FormLabel>{t('natalChart.saveTypeLabel')}</FormLabel>
                <Select
                  value={saveType}
                  onChange={(e) => setSaveType(e.target.value as 'natal' | 'event' | 'horary')}
                >
                  <option value="natal">{t('natalChart.saveTypeNatal')}</option>
                  <option value="event">{t('natalChart.saveTypeEvent')}</option>
                  <option value="horary">{t('natalChart.saveTypeQuestion')}</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>{t('natalChart.saveDescriptionLabel')}</FormLabel>
                <Textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={saveDialog.onClose}>
              {t('natalChart.cancel')}
            </Button>
            <Button
              colorScheme="green"
              onClick={handleSaveChart}
              isLoading={saving}
              isDisabled={!saveName.trim()}
            >
              {t('natalChart.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default NatalChart;
