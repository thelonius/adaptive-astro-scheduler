import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Switch,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Card,
  CardBody,
  CardHeader,
  Grid,
  GridItem,
  Badge,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  List,
  ListItem,
  ListIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { themes, type ThemeName } from '../components/ZodiacWheel/themes';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';
import type { PlanetName } from '@adaptive-astro/shared/types';
import ZodiacIcon from '../components/ZodiacWheel/ZodiacIcon';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export const ZodiacWheelTest: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();

  // Configuration state
  const [size, setSize] = useState(600);
  const [showHouses, setShowHouses] = useState(false);
  const [showAspects, setShowAspects] = useState(true);
  const [showDegrees, setShowDegrees] = useState(true);
  const [showRetrogrades, setShowRetrogrades] = useState(true);
  const [aspectOrb, setAspectOrb] = useState(8);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  const [useAdaptiveRefresh, setUseAdaptiveRefresh] = useState(true);

  // Location state
  const [latitude, setLatitude] = useState(55.7558);
  const [longitude, setLongitude] = useState(37.6173);
  const [timezone] = useState('Europe/Moscow');

  // Test state
  const [currentData, setCurrentData] = useState<ZodiacWheelData | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [loadTime, setLoadTime] = useState<number>(0);
  const [updateCount, setUpdateCount] = useState(0);

  const handleDataUpdate = (data: ZodiacWheelData) => {
    const _updateTime = Date.now();
    // Commented out resource-heavy toast notifications
    // if (currentData) {
    //   const latency = updateTime - currentData.timestamp.getTime();
    //   if (latency > 0) {
    //     toast({
    //       title: 'Data Updated',
    //       description: `Latency: ${latency}ms`,
    //       status: 'info',
    //       duration: 2000,
    //       isClosable: true,
    //       position: 'bottom-right',
    //     });
    //   }
    // }
    setCurrentData(data);
    setUpdateCount((prev) => prev + 1);
  };

  // Run automated tests
  const runTests = () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];

    // Test 1: Data loaded
    const testDataLoaded = () => {
      const passed = currentData !== null;
      results.push({
        name: t('zodiacWheel.testName_dataLoaded'),
        passed,
        message: passed
          ? t('zodiacWheel.testMsg_dataLoadedPass', { count: currentData?.planets.length })
          : t('zodiacWheel.testMsg_dataLoadedFail'),
      });
    };

    // Test 2: All planets present
    const testAllPlanets = () => {
      const expectedPlanets: PlanetName[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
      const loadedPlanets = currentData?.planets.map((p) => p.name) || [];
      const allPresent = expectedPlanets.every((p) => loadedPlanets.includes(p));

      results.push({
        name: t('zodiacWheel.testName_allPlanets'),
        passed: allPresent,
        message: allPresent
          ? t('zodiacWheel.testMsg_allPlanetsPass', { count: expectedPlanets.length })
          : t('zodiacWheel.testMsg_allPlanetsFail', { list: expectedPlanets.filter((p) => !loadedPlanets.includes(p)).join(', ') }),
      });
    };

    // Test 3: Aspects calculated
    const testAspects = () => {
      const aspectCount = currentData?.aspects.filter((a) => a.isExact).length || 0;
      const passed = aspectCount > 0;

      results.push({
        name: t('zodiacWheel.testName_aspectsCalc'),
        passed,
        message: passed
          ? t('zodiacWheel.testMsg_aspectsPass', { count: aspectCount })
          : t('zodiacWheel.testMsg_aspectsFail'),
      });
    };

    // Test 4: Longitude ranges valid
    const testLongitudes = () => {
      const allValid = currentData?.planets.every(
        (p) => p.longitude >= 0 && p.longitude < 360
      ) || false;

      results.push({
        name: t('zodiacWheel.testName_longRanges'),
        passed: allValid,
        message: allValid
          ? t('zodiacWheel.testMsg_longPass')
          : t('zodiacWheel.testMsg_longFail'),
      });
    };

    // Test 5: Retrograde detection
    const testRetrogrades = () => {
      const retrogradeCount = currentData?.planets.filter((p) => p.isRetrograde).length || 0;

      results.push({
        name: t('zodiacWheel.testName_retroDetect'),
        passed: true,
        message: t('zodiacWheel.testMsg_retroMsg', { count: retrogradeCount }),
      });
    };

    // Test 6: Zodiac signs assigned
    const testZodiacSigns = () => {
      const allHaveSigns = currentData?.planets.every(
        (p) => p.zodiacSign && p.zodiacSign.name
      ) || false;

      results.push({
        name: t('zodiacWheel.testName_zodiacSigns'),
        passed: allHaveSigns,
        message: allHaveSigns
          ? t('zodiacWheel.testMsg_zodiacPass')
          : t('zodiacWheel.testMsg_zodiacFail'),
      });
    };

    // Test 7: Performance check
    const testPerformance = () => {
      const passed = loadTime < 1000;

      results.push({
        name: t('zodiacWheel.testName_performance'),
        passed,
        message: passed
          ? t('zodiacWheel.testMsg_perfGood', { ms: loadTime })
          : t('zodiacWheel.testMsg_perfBad', { ms: loadTime }),
        duration: loadTime,
      });
    };

    // Run all tests
    testDataLoaded();
    testAllPlanets();
    testAspects();
    testLongitudes();
    testRetrogrades();
    testZodiacSigns();
    testPerformance();

    setTestResults(results);
    setIsRunningTests(false);

    // Show summary toast
    const passedCount = results.filter((r) => r.passed).length;
    toast({
      title: t('zodiacWheel.testsCompleteTitle'),
      description: t('zodiacWheel.testsCompleteDesc', { passed: passedCount, total: results.length }),
      status: passedCount === results.length ? 'success' : 'warning',
      duration: 3000,
      isClosable: true,
    });
  };

  // Measure load time
  useEffect(() => {
    if (currentData && loadTime === 0) {
      const ts = currentData.timestamp instanceof Date ? currentData.timestamp.getTime() : new Date(currentData.timestamp ?? Date.now()).getTime();
      setLoadTime(Date.now() - ts);
    }
  }, [currentData, loadTime]);

  // Memoize config to ensure stable reference with current values
  const wheelConfig = useMemo(() => ({
    size,
    showHouses,
    showAspects,
    showDegrees,
    showRetrogrades,
    aspectOrb,
    refreshInterval: refreshInterval * 60 * 1000,
    colorScheme: themes[themeName],
  }), [size, showHouses, showAspects, showDegrees, showRetrogrades, aspectOrb, refreshInterval, themeName]);

  // Preset configurations
  const presets = {
    minimal: {
      size: 400,
      showHouses: false,
      showAspects: false,
      showDegrees: false,
      showRetrogrades: false,
    },
    standard: {
      size: 600,
      showHouses: false,
      showAspects: true,
      showDegrees: true,
      showRetrogrades: true,
    },
    full: {
      size: 800,
      showHouses: true,
      showAspects: true,
      showDegrees: true,
      showRetrogrades: true,
    },
  };

  const applyPreset = (preset: keyof typeof presets) => {
    const config = presets[preset];
    setSize(config.size);
    setShowHouses(config.showHouses);
    setShowAspects(config.showAspects);
    setShowDegrees(config.showDegrees);
    setShowRetrogrades(config.showRetrogrades);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="xl" mb={2}>
            {t('zodiacWheel.testTitle')}
          </Heading>
          <Text color="gray.500" mb={4}>
            {t('zodiacWheel.testSubtitle')}
          </Text>

          <Alert status="info" mb={4}>
            <AlertIcon />
            <Box>
              <AlertTitle>{t('zodiacWheel.testInstructionsTitle')}</AlertTitle>
              <AlertDescription>
                {t('zodiacWheel.testInstructionsDesc')}
              </AlertDescription>
            </Box>
          </Alert>
        </Box>

        {/* Main Layout - Component always visible on left */}
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
          {/* Left side - Zodiac Wheel (Always Visible) */}
          <GridItem>
            <Card position="sticky" top={4}>
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="md">{t('zodiacWheel.liveComponent')}</Heading>
                  <HStack>
                    <Badge colorScheme="green">{t('zodiacWheel.liveBadge')}</Badge>
                    <Badge colorScheme="blue">{t('zodiacWheel.updatesCount', { count: updateCount })}</Badge>
                  </HStack>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  {/* Wheel Display */}
                  <Box display="flex" justifyContent="center" alignItems="center">
                    <ZodiacWheel
                      config={wheelConfig}
                      latitude={latitude}
                      longitude={longitude}
                      timezone={timezone}
                      useAdaptiveRefresh={useAdaptiveRefresh}
                      onDataUpdate={handleDataUpdate}
                    />
                  </Box>

                  {/* Description of what's shown */}
                  {currentData && (
                    <Box
                      bg="rgba(0, 0, 0, 0.05)"
                      borderRadius="md"
                      p={4}
                      fontSize="sm"
                    >
                      <VStack align="stretch" spacing={2}>
                        <Text fontWeight="bold" fontSize="md">{t('zodiacWheel.whatYouSeeing')}</Text>

                        <Text>
                          <strong>{t('zodiacWheel.zodiacCircleLabel')}</strong> {t('zodiacWheel.zodiacCircleDesc')}
                        </Text>

                        {currentData.planets && (
                          <Text>
                            <strong>{t('zodiacWheel.planetsLabelBold')}</strong> {t('zodiacWheel.planetsDesc', { count: currentData.planets.length })}
                          </Text>
                        )}

                        {showRetrogrades && currentData.planets && (
                          <Text>
                            <strong>{t('zodiacWheel.retroIndicatorLabel')}</strong> {t('zodiacWheel.retroIndicatorDesc', { count: currentData.planets.filter(p => p.isRetrograde).length })}
                          </Text>
                        )}

                        {showAspects && currentData.aspects && (
                          <Text>
                            <strong>{t('zodiacWheel.aspectLinesLabel')}</strong> {t('zodiacWheel.aspectLinesDesc', { count: currentData.aspects.filter(a => a.isExact).length, orb: aspectOrb })}
                          </Text>
                        )}

                        {showHouses && currentData.houses && (
                          <Text>
                            <strong>{t('zodiacWheel.housesLabelBold')}</strong> {t('zodiacWheel.housesDesc', { lat: latitude.toFixed(2), lon: longitude.toFixed(2) })}
                          </Text>
                        )}

                        {showDegrees && (
                          <Text>
                            <strong>{t('zodiacWheel.degreeMarksLabel')}</strong> {t('zodiacWheel.degreeMarksDesc')}
                          </Text>
                        )}

                        <Text color="gray.600" fontSize="xs" mt={2}>
                          {t('zodiacWheel.hoverHint')}
                        </Text>
                      </VStack>
                    </Box>
                  )}

                  {/* Sky Events & Meanings Table */}
                  {currentData && (
                    <Box
                      borderWidth={1}
                      borderRadius="md"
                      overflow="hidden"
                    >
                      <Box bg="blue.50" px={4} py={2} borderBottomWidth={1}>
                        <Text fontWeight="bold" fontSize="md">{t('zodiacWheel.skyEventsTitle')}</Text>
                      </Box>
                      <Box maxH="300px" overflowY="auto">
                        <table style={{ width: '100%', fontSize: '0.875rem' }}>
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f7fafc' }}>
                            <tr>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '40%' }}>
                                {t('zodiacWheel.skyEventCol')}
                              </th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '60%' }}>
                                {t('zodiacWheel.skyMeaningCol')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Planet Positions */}
                            {currentData.planets?.slice(0, 3).map((planet, idx) => (
                              <tr key={`planet-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontWeight="semibold">
                                    {t('zodiacWheel.planetInSign', { planet: planet.name, sign: planet.zodiacSign.name })}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    {planet.longitude.toFixed(2)}° {planet.isRetrograde ? '℞' : ''}
                                  </Text>
                                </td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontSize="sm">
                                    {planet.name === 'Sun' && t('zodiacWheel.sunMeaning', { element: planet.zodiacSign.element, sign: planet.zodiacSign.name })}
                                    {planet.name === 'Moon' && t('zodiacWheel.moonMeaning', { quality: planet.zodiacSign.quality, sign: planet.zodiacSign.name })}
                                    {planet.name === 'Mercury' && t('zodiacWheel.mercuryMeaning', { sign: planet.zodiacSign.name })}
                                    {!['Sun', 'Moon', 'Mercury'].includes(planet.name) && t('zodiacWheel.genericPlanetMeaning', { planet: planet.name, sign: planet.zodiacSign.name })}
                                    {planet.isRetrograde && t('zodiacWheel.retroSuffix')}
                                  </Text>
                                </td>
                              </tr>
                            ))}

                            {/* Major Aspects */}
                            {currentData.aspects?.filter(a => a.isExact && ['conjunction', 'opposition', 'trine', 'square'].includes(a.type)).slice(0, 5).map((aspect, idx) => (
                              <tr key={`aspect-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontWeight="semibold">
                                    {aspect.body1.name} {aspect.type === 'conjunction' && '☌'}
                                    {aspect.type === 'sextile' && '⚹'}
                                    {aspect.type === 'square' && '□'}
                                    {aspect.type === 'trine' && '△'}
                                    {aspect.type === 'opposition' && '☍'}
                                    {aspect.type === 'quincunx' && '⚻'} {aspect.body2.name}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    {aspect.type === 'conjunction' && t('zodiacWheel.conjunctionName')}
                                    {aspect.type === 'sextile' && t('zodiacWheel.sextileName')}
                                    {aspect.type === 'square' && t('zodiacWheel.squareName')}
                                    {aspect.type === 'trine' && t('zodiacWheel.trineName')}
                                    {aspect.type === 'opposition' && t('zodiacWheel.oppositionName')}
                                    {aspect.type === 'quincunx' && t('zodiacWheel.quincunxName')} {t('zodiacWheel.aspectOrbSuffix', { angle: aspect.angle.toFixed(1), orb: aspect.orb.toFixed(1) })}
                                  </Text>
                                </td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontSize="sm">
                                    {aspect.type === 'conjunction' && t('zodiacWheel.conjunctionMeaning')}
                                    {aspect.type === 'opposition' && t('zodiacWheel.oppositionMeaning')}
                                    {aspect.type === 'trine' && t('zodiacWheel.trineMeaning')}
                                    {aspect.type === 'square' && t('zodiacWheel.squareMeaning')}
                                    {aspect.type === 'sextile' && t('zodiacWheel.sextileMeaning')}
                                    {aspect.type === 'quincunx' && t('zodiacWheel.quincunxMeaning')}
                                  </Text>
                                </td>
                              </tr>
                            ))}

                            {/* Retrograde Planets */}
                            {currentData.planets?.filter(p => p.isRetrograde).map((planet, idx) => (
                              <tr key={`retro-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontWeight="semibold">
                                    {t('zodiacWheel.retroPlanetLabel', { planet: planet.name })}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    {t('zodiacWheel.speedLabel', { speed: planet.speed.toFixed(4) })}
                                  </Text>
                                </td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontSize="sm">
                                    {planet.name === 'Mercury' && t('zodiacWheel.mercuryRetroMeaning')}
                                    {planet.name === 'Venus' && t('zodiacWheel.venusRetroMeaning')}
                                    {planet.name === 'Mars' && t('zodiacWheel.marsRetroMeaning')}
                                    {['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(planet.name) &&
                                      t('zodiacWheel.outerRetroMeaning', { planet: planet.name })}
                                  </Text>
                                </td>
                              </tr>
                            ))}

                            {/* Angular Houses (if shown) */}
                            {showHouses && currentData.houses && (
                              <>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <Text fontWeight="semibold">
                                      {t('zodiacWheel.ascendantLabel')}
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      {t('zodiacWheel.signAtDeg', { sign: currentData.houses[0]?.sign.name, deg: currentData.houses[0]?.cusp.toFixed(1) })}
                                    </Text>
                                  </td>
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <Text fontSize="sm">
                                      {t('zodiacWheel.ascendantMeaning', { sign: currentData.houses[0]?.sign.name })}
                                    </Text>
                                  </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <Text fontWeight="semibold">
                                      {t('zodiacWheel.midheavenLabel')}
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      {t('zodiacWheel.signAtDeg', { sign: currentData.houses[9]?.sign.name, deg: currentData.houses[9]?.cusp.toFixed(1) })}
                                    </Text>
                                  </td>
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <Text fontSize="sm">
                                      {t('zodiacWheel.midheavenMeaning', { sign: currentData.houses[9]?.sign.name })}
                                    </Text>
                                  </td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </Box>
                    </Box>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

          {/* Right side - Tabs with controls and info */}
          <GridItem>
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab fontSize="sm">{t('zodiacWheel.controlsTab')}</Tab>
                <Tab fontSize="sm">{t('zodiacWheel.testsTab')}</Tab>
                <Tab fontSize="sm">{t('zodiacWheel.statsTab')}</Tab>
                <Tab fontSize="sm">{t('zodiacWheel.scenariosTab')}</Tab>
              </TabList>

              <TabPanels>
                {/* Controls Tab (Combined Quick Toggles + Configuration) */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    {/* Quick Toggles */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">{t('zodiacWheel.quickToggles')}</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="sm" mb={0} flex={1}>
                              {t('zodiacWheel.showAspects')}
                            </FormLabel>
                            <Switch
                              isChecked={showAspects}
                              onChange={(e) => setShowAspects(e.target.checked)}
                              colorScheme="blue"
                            />
                          </FormControl>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="sm" mb={0} flex={1}>
                              {t('zodiacWheel.showHouses')}
                            </FormLabel>
                            <Switch
                              isChecked={showHouses}
                              onChange={(e) => setShowHouses(e.target.checked)}
                              colorScheme="purple"
                            />
                          </FormControl>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="sm" mb={0} flex={1}>
                              {t('zodiacWheel.showDegrees')}
                            </FormLabel>
                            <Switch
                              isChecked={showDegrees}
                              onChange={(e) => setShowDegrees(e.target.checked)}
                              colorScheme="green"
                            />
                          </FormControl>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="sm" mb={0} flex={1}>
                              {t('zodiacWheel.showRetrogrades')}
                            </FormLabel>
                            <Switch
                              isChecked={showRetrogrades}
                              onChange={(e) => setShowRetrogrades(e.target.checked)}
                              colorScheme="red"
                            />
                          </FormControl>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Quick Presets */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">{t('zodiacWheel.quickPresets')}</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={2}>
                          <Button
                            size="sm"
                            width="100%"
                            onClick={() => applyPreset('minimal')}
                          >
                            {t('zodiacWheel.presetMinimal')}
                          </Button>
                          <Button
                            size="sm"
                            width="100%"
                            onClick={() => applyPreset('standard')}
                            colorScheme="blue"
                          >
                            {t('zodiacWheel.presetStandard')}
                          </Button>
                          <Button
                            size="sm"
                            width="100%"
                            onClick={() => applyPreset('full')}
                            colorScheme="purple"
                          >
                            {t('zodiacWheel.presetFull')}
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Test Checklist */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">{t('zodiacWheel.manualChecklist')}</Heading>
                      </CardHeader>
                      <CardBody>
                        <List spacing={2} fontSize="sm">
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            {t('zodiacWheel.checklist_hoverTooltips')}
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            {t('zodiacWheel.checklist_checkRetro')}
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            {t('zodiacWheel.checklist_verifyAspects')}
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            {t('zodiacWheel.checklist_toggleHouses')}
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            {t('zodiacWheel.checklist_tryThemes')}
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            {t('zodiacWheel.checklist_testSizes')}
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            {t('zodiacWheel.checklist_checkAnim')}
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            {t('zodiacWheel.checklist_verifyRefresh')}
                          </ListItem>
                        </List>
                      </CardBody>
                    </Card>

                    {/* Appearance */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">{t('zodiacWheel.appearance')}</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <FormControl>
                            <FormLabel fontSize="sm">{t('zodiacWheel.theme')}</FormLabel>
                            <Select
                              value={themeName}
                              onChange={(e) => setThemeName(e.target.value as ThemeName)}
                              size="sm"
                            >
                              <option value="dark">{t('zodiacWheel.themeDark')}</option>
                              <option value="light">{t('zodiacWheel.themeLight')}</option>
                              <option value="cosmic">{t('zodiacWheel.themeCosmic')}</option>
                              <option value="solar">{t('zodiacWheel.themeSolar')}</option>
                              <option value="lunar">{t('zodiacWheel.themeLunar')}</option>
                            </Select>
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {t('zodiacWheel.chooseColorScheme')}
                            </Text>
                          </FormControl>

                          <FormControl>
                            <FormLabel fontSize="sm">{t('zodiacWheel.wheelSize', { size })}</FormLabel>
                            <Slider
                              value={size}
                              onChange={setSize}
                              min={300}
                              max={900}
                              step={50}
                            >
                              <SliderTrack>
                                <SliderFilledTrack />
                              </SliderTrack>
                              <SliderThumb />
                            </Slider>
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {t('zodiacWheel.recommendedSize')}
                            </Text>
                          </FormControl>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Advanced Settings */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">{t('zodiacWheel.advancedSettings')}</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <FormControl>
                            <FormLabel fontSize="sm">{t('zodiacWheel.aspectOrb', { orb: aspectOrb })}</FormLabel>
                            <Slider
                              value={aspectOrb}
                              onChange={setAspectOrb}
                              min={1}
                              max={15}
                              step={0.5}
                            >
                              <SliderTrack>
                                <SliderFilledTrack />
                              </SliderTrack>
                              <SliderThumb />
                            </Slider>
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {t('zodiacWheel.orbHint')}
                            </Text>
                          </FormControl>

                          <FormControl>
                            <FormLabel fontSize="sm">
                              {t('zodiacWheel.refreshInterval', { minutes: refreshInterval })}
                            </FormLabel>
                            <Slider
                              value={refreshInterval}
                              onChange={setRefreshInterval}
                              min={1}
                              max={60}
                              step={1}
                              isDisabled={useAdaptiveRefresh}
                            >
                              <SliderTrack>
                                <SliderFilledTrack />
                              </SliderTrack>
                              <SliderThumb />
                            </Slider>
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {useAdaptiveRefresh
                                ? t('zodiacWheel.usingAdaptive')
                                : t('zodiacWheel.fixedRefresh')}
                            </Text>
                          </FormControl>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Location & Advanced */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">{t('zodiacWheel.locationAdvanced')}</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <FormControl>
                            <FormLabel fontSize="sm">{t('zodiacWheel.latitude')}</FormLabel>
                            <NumberInput
                              value={latitude}
                              onChange={(_, val) => setLatitude(val)}
                              precision={4}
                              step={0.1}
                              min={-90}
                              max={90}
                              size="sm"
                            >
                              <NumberInputField />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {t('zodiacWheel.latDefaultMoscow')}
                            </Text>
                          </FormControl>

                          <FormControl>
                            <FormLabel fontSize="sm">{t('zodiacWheel.longitude')}</FormLabel>
                            <NumberInput
                              value={longitude}
                              onChange={(_, val) => setLongitude(val)}
                              precision={4}
                              step={0.1}
                              min={-180}
                              max={180}
                              size="sm"
                            >
                              <NumberInputField />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {t('zodiacWheel.lonDefaultMoscow')}
                            </Text>
                          </FormControl>

                          <Divider my={2} />

                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="sm" mb={0} flex={1}>
                              {t('zodiacWheel.adaptiveRefresh')}
                            </FormLabel>
                            <Switch
                              isChecked={useAdaptiveRefresh}
                              onChange={(e) => setUseAdaptiveRefresh(e.target.checked)}
                              colorScheme="green"
                            />
                          </FormControl>
                          <Text fontSize="xs" color="gray.500" mt={-2}>
                            {t('zodiacWheel.adaptiveRefreshDesc')}
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  </VStack>
                </TabPanel>

                {/* Tests Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardHeader>
                    <HStack justify="space-between">
                      <Heading size="md">{t('zodiacWheel.automatedTestSuite')}</Heading>
                      <Button
                        colorScheme="blue"
                        onClick={runTests}
                        isLoading={isRunningTests}
                        isDisabled={!currentData}
                      >
                        {t('zodiacWheel.runTests')}
                      </Button>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    {testResults.length === 0 ? (
                      <Alert status="info">
                        <AlertIcon />
                        {t('zodiacWheel.runTestsHint')}
                      </Alert>
                    ) : (
                      <VStack align="stretch" spacing={3}>
                        {testResults.map((result, i) => (
                          <Box
                            key={i}
                            p={4}
                            borderWidth={1}
                            borderRadius="md"
                            borderColor={result.passed ? 'green.200' : 'red.200'}
                            bg={result.passed ? 'green.50' : 'red.50'}
                          >
                            <HStack justify="space-between">
                              <HStack>
                                {result.passed ? (
                                  <CheckCircleIcon color="green.500" />
                                ) : (
                                  <WarningIcon color="red.500" />
                                )}
                                <Text fontWeight="bold">{result.name}</Text>
                              </HStack>
                              <Badge colorScheme={result.passed ? 'green' : 'red'}>
                                {result.passed ? t('zodiacWheel.pass') : t('zodiacWheel.fail')}
                              </Badge>
                            </HStack>
                            <Text fontSize="sm" mt={2} ml={6}>
                              {result.message}
                            </Text>
                            {result.duration && (
                              <Text fontSize="xs" color="gray.600" ml={6} mt={1}>
                                {t('zodiacWheel.duration', { ms: result.duration })}
                              </Text>
                            )}
                          </Box>
                        ))}

                        <Divider my={4} />

                        <HStack justify="space-between">
                          <Text fontWeight="bold">
                            {t('zodiacWheel.summary', { passed: testResults.filter((r) => r.passed).length, total: testResults.length })}
                          </Text>
                          <Badge
                            colorScheme={
                              testResults.every((r) => r.passed) ? 'green' : 'yellow'
                            }
                            fontSize="md"
                            px={3}
                            py={1}
                          >
                            {testResults.every((r) => r.passed)
                              ? t('zodiacWheel.allPassed')
                              : t('zodiacWheel.someFailed')}
                          </Badge>
                        </HStack>
                      </VStack>
                    )}
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Statistics Tab */}
            <TabPanel>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
                <Card>
                  <CardHeader>
                    <Heading size="sm">{t('zodiacWheel.dataStats')}</Heading>
                  </CardHeader>
                  <CardBody>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <Stat>
                        <StatLabel>{t('zodiacWheel.statPlanets')}</StatLabel>
                        <StatNumber>{currentData?.planets.length || 0}</StatNumber>
                        <StatHelpText>{t('zodiacWheel.statTotalLoaded')}</StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel>{t('zodiacWheel.statActiveAspects')}</StatLabel>
                        <StatNumber>
                          {currentData?.aspects.filter((a) => a.isExact).length || 0}
                        </StatNumber>
                        <StatHelpText>{t('zodiacWheel.statWithinOrb')}</StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel>{t('zodiacWheel.statRetrogrades')}</StatLabel>
                        <StatNumber>
                          {currentData?.planets.filter((p) => p.isRetrograde).length || 0}
                        </StatNumber>
                        <StatHelpText>{t('zodiacWheel.statCurrentlyRetro')}</StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel>{t('zodiacWheel.statHouses')}</StatLabel>
                        <StatNumber>{currentData?.houses?.length || 0}</StatNumber>
                        <StatHelpText>{t('zodiacWheel.statCalculated')}</StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel>{t('zodiacWheel.statLoadTime')}</StatLabel>
                        <StatNumber>{loadTime}ms</StatNumber>
                        <StatHelpText>{t('zodiacWheel.statInitialRender')}</StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel>{t('zodiacWheel.statUpdates')}</StatLabel>
                        <StatNumber>{updateCount}</StatNumber>
                        <StatHelpText>{t('zodiacWheel.statDataRefreshes')}</StatHelpText>
                      </Stat>
                    </Grid>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="sm">{t('zodiacWheel.planetDetails')}</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto">
                      {currentData?.planets.map((planet) => (
                        <Box
                          key={planet.name}
                          p={2}
                          borderWidth={1}
                          borderRadius="md"
                          fontSize="sm"
                        >
                          <HStack justify="space-between">
                            <HStack>
                              <Text fontWeight="bold">{planet.name}</Text>
                              {planet.isRetrograde && (
                                <Badge colorScheme="red" fontSize="xs">
                                  ℞
                                </Badge>
                              )}
                            </HStack>
                            <ZodiacIcon
                              sign={planet.zodiacSign.name}
                              size={16}
                              color="gray.600"
                            />
                          </HStack>
                          <Text fontSize="xs" color="gray.600">
                            {t('zodiacWheel.speedDay', { deg: planet.longitude.toFixed(2), speed: planet.speed.toFixed(4) })}
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="sm">{t('zodiacWheel.aspectBreakdown')}</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={2}>
                      {['conjunction', 'sextile', 'square', 'trine', 'opposition', 'quincunx'].map(
                        (type) => {
                          const count =
                            currentData?.aspects.filter(
                              (a) => a.type === type && a.isExact
                            ).length || 0;
                          return (
                            <HStack key={type} justify="space-between">
                              <Text fontSize="sm" textTransform="capitalize">
                                {type}
                              </Text>
                              <Badge colorScheme={count > 0 ? 'blue' : 'gray'}>{count}</Badge>
                            </HStack>
                          );
                        }
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              </Grid>
            </TabPanel>

            {/* Test Scenarios Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Accordion allowMultiple>
                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          {t('zodiacWheel.scenario1Title')}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">{t('zodiacWheel.objective')}</Text>
                        <Text>{t('zodiacWheel.scenario1Obj')}</Text>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.steps')}</Text>
                        <List spacing={2}>
                          <ListItem>{t('zodiacWheel.scenario1Step1')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario1Step2')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario1Step3')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario1Step4')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario1Step5')}</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.expectedResult')}</Text>
                        <Text>{t('zodiacWheel.scenario1Expected')}</Text>

                        <Alert status="success" mt={2}>
                          <AlertIcon />
                          <Text fontSize="sm">{t('zodiacWheel.scenario1Note')}</Text>
                        </Alert>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          {t('zodiacWheel.scenario2Title')}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">{t('zodiacWheel.objective')}</Text>
                        <Text>{t('zodiacWheel.scenario2Obj')}</Text>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.steps')}</Text>
                        <List spacing={2}>
                          <ListItem>{t('zodiacWheel.scenario2Step1')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario2Step2')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario2Step3')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario2Step4')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario2Step5')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario2Step6')}</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.expectedResult')}</Text>
                        <Text>{t('zodiacWheel.scenario2Expected')}</Text>

                        <Alert status="info" mt={2}>
                          <AlertIcon />
                          <Text fontSize="sm">{t('zodiacWheel.scenario2Note')}</Text>
                        </Alert>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          {t('zodiacWheel.scenario3Title')}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">{t('zodiacWheel.objective')}</Text>
                        <Text>{t('zodiacWheel.scenario3Obj')}</Text>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.steps')}</Text>
                        <List spacing={2}>
                          <ListItem>{t('zodiacWheel.scenario3Step1')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario3Step2')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario3Step3')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario3Step4')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario3Step5')}</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.expectedResult')}</Text>
                        <Text>{t('zodiacWheel.scenario3Expected')}</Text>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          {t('zodiacWheel.scenario4Title')}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">{t('zodiacWheel.objective')}</Text>
                        <Text>{t('zodiacWheel.scenario4Obj')}</Text>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.steps')}</Text>
                        <List spacing={2}>
                          <ListItem>{t('zodiacWheel.scenario4Step1')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario4Step2')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario4Step3')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario4Step4')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario4Step5')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario4Step6')}</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.expectedResult')}</Text>
                        <Text>{t('zodiacWheel.scenario4Expected')}</Text>

                        <Alert status="warning" mt={2}>
                          <AlertIcon />
                          <Text fontSize="sm">{t('zodiacWheel.scenario4Note')}</Text>
                        </Alert>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          {t('zodiacWheel.scenario5Title')}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">{t('zodiacWheel.objective')}</Text>
                        <Text>{t('zodiacWheel.scenario5Obj')}</Text>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.steps')}</Text>
                        <List spacing={2}>
                          <ListItem>{t('zodiacWheel.scenario5Step1')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario5Step2')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario5Step3')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario5Step4')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario5Step5')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario5Step6')}</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.expectedResult')}</Text>
                        <Text>{t('zodiacWheel.scenario5Expected')}</Text>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          {t('zodiacWheel.scenario6Title')}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">{t('zodiacWheel.objective')}</Text>
                        <Text>{t('zodiacWheel.scenario6Obj')}</Text>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.steps')}</Text>
                        <List spacing={2}>
                          <ListItem>{t('zodiacWheel.scenario6Step1')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario6Step2')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario6Step3')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario6Step4')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario6Step5')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario6Step6')}</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.expectedResult')}</Text>
                        <Text>{t('zodiacWheel.scenario6Expected')}</Text>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          {t('zodiacWheel.scenario7Title')}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">{t('zodiacWheel.objective')}</Text>
                        <Text>{t('zodiacWheel.scenario7Obj')}</Text>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.steps')}</Text>
                        <List spacing={2}>
                          <ListItem>{t('zodiacWheel.scenario7Step1')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario7Step2')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario7Step3')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario7Step4')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario7Step5')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario7Step6')}</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.expectedResult')}</Text>
                        <Text>{t('zodiacWheel.scenario7Expected')}</Text>

                        <Alert status="info" mt={2}>
                          <AlertIcon />
                          <Text fontSize="sm">{t('zodiacWheel.scenario7Note')}</Text>
                        </Alert>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          {t('zodiacWheel.scenario8Title')}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">{t('zodiacWheel.objective')}</Text>
                        <Text>{t('zodiacWheel.scenario8Obj')}</Text>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.steps')}</Text>
                        <List spacing={2}>
                          <ListItem>{t('zodiacWheel.scenario8Step1')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario8Step2')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario8Step3')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario8Step4')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario8Step5')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario8Step6')}</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.expectedResult')}</Text>
                        <Text>{t('zodiacWheel.scenario8Expected')}</Text>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          {t('zodiacWheel.scenario9Title')}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">{t('zodiacWheel.objective')}</Text>
                        <Text>{t('zodiacWheel.scenario9Obj')}</Text>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.steps')}</Text>
                        <List spacing={2}>
                          <ListItem>{t('zodiacWheel.scenario9Step1')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario9Step2')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario9Step3')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario9Step4')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario9Step5')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario9Step6')}</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.expectedResult')}</Text>
                        <Text>{t('zodiacWheel.scenario9Expected')}</Text>

                        <Alert status="success" mt={2}>
                          <AlertIcon />
                          <Text fontSize="sm">{t('zodiacWheel.scenario9Note')}</Text>
                        </Alert>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          {t('zodiacWheel.scenario10Title')}
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">{t('zodiacWheel.objective')}</Text>
                        <Text>{t('zodiacWheel.scenario10Obj')}</Text>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.steps')}</Text>
                        <List spacing={2}>
                          <ListItem>{t('zodiacWheel.scenario10Step1')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario10Step2')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario10Step3')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario10Step4')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario10Step5')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario10Step6')}</ListItem>
                          <ListItem>{t('zodiacWheel.scenario10Step7')}</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>{t('zodiacWheel.expectedResult')}</Text>
                        <Text>{t('zodiacWheel.scenario10Expected')}</Text>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>

                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>{t('zodiacWheel.testingTipsTitle')}</AlertTitle>
                    <AlertDescription>
                      <List spacing={1} mt={2} fontSize="sm">
                        <ListItem>{t('zodiacWheel.tip1')}</ListItem>
                        <ListItem>{t('zodiacWheel.tip2')}</ListItem>
                        <ListItem>{t('zodiacWheel.tip3')}</ListItem>
                        <ListItem>{t('zodiacWheel.tip4')}</ListItem>
                        <ListItem>{t('zodiacWheel.tip5')}</ListItem>
                      </List>
                    </AlertDescription>
                  </Box>
                </Alert>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
          </GridItem>
        </Grid>
      </VStack>
    </Container>
  );
};

export default ZodiacWheelTest;
