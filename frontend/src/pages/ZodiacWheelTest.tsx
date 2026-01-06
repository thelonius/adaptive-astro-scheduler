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
  Code,
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
import { ZodiacWheel } from '../components/ZodiacWheel';
import { themes, type ThemeName } from '../components/ZodiacWheel/themes';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';
import ZodiacIcon from '../components/ZodiacWheel/ZodiacIcon';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export const ZodiacWheelTest: React.FC = () => {
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
    const updateTime = Date.now();
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
        name: 'Data Loaded',
        passed,
        message: passed
          ? `Successfully loaded ${currentData?.planets.length} planets`
          : 'Failed to load data',
      });
    };

    // Test 2: All planets present
    const testAllPlanets = () => {
      const expectedPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
      const loadedPlanets = currentData?.planets.map((p) => p.name) || [];
      const allPresent = expectedPlanets.every((p) => loadedPlanets.includes(p));

      results.push({
        name: 'All Planets Present',
        passed: allPresent,
        message: allPresent
          ? `All ${expectedPlanets.length} planets loaded`
          : `Missing planets: ${expectedPlanets.filter((p) => !loadedPlanets.includes(p)).join(', ')}`,
      });
    };

    // Test 3: Aspects calculated
    const testAspects = () => {
      const aspectCount = currentData?.aspects.filter((a) => a.isExact).length || 0;
      const passed = aspectCount > 0;

      results.push({
        name: 'Aspects Calculated',
        passed,
        message: passed
          ? `Found ${aspectCount} active aspects`
          : 'No aspects found (may need to increase orb)',
      });
    };

    // Test 4: Longitude ranges valid
    const testLongitudes = () => {
      const allValid = currentData?.planets.every(
        (p) => p.longitude >= 0 && p.longitude < 360
      ) || false;

      results.push({
        name: 'Longitude Ranges Valid',
        passed: allValid,
        message: allValid
          ? 'All planet longitudes in valid range (0-360°)'
          : 'Some planets have invalid longitudes',
      });
    };

    // Test 5: Retrograde detection
    const testRetrogrades = () => {
      const retrogradeCount = currentData?.planets.filter((p) => p.isRetrograde).length || 0;

      results.push({
        name: 'Retrograde Detection',
        passed: true,
        message: `${retrogradeCount} planet(s) retrograde`,
      });
    };

    // Test 6: Zodiac signs assigned
    const testZodiacSigns = () => {
      const allHaveSigns = currentData?.planets.every(
        (p) => p.zodiacSign && p.zodiacSign.name
      ) || false;

      results.push({
        name: 'Zodiac Signs Assigned',
        passed: allHaveSigns,
        message: allHaveSigns
          ? 'All planets have zodiac sign assignments'
          : 'Some planets missing zodiac signs',
      });
    };

    // Test 7: Performance check
    const testPerformance = () => {
      const passed = loadTime < 1000;

      results.push({
        name: 'Performance (Load Time)',
        passed,
        message: `Load time: ${loadTime}ms ${passed ? '(Good)' : '(Needs optimization)'}`,
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
      title: 'Tests Complete',
      description: `${passedCount}/${results.length} tests passed`,
      status: passedCount === results.length ? 'success' : 'warning',
      duration: 3000,
      isClosable: true,
    });
  };

  // Measure load time
  useEffect(() => {
    if (currentData && loadTime === 0) {
      setLoadTime(Date.now() - currentData.timestamp.getTime());
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
            Zodiac Wheel Component - Test Suite
          </Heading>
          <Text color="gray.500" mb={4}>
            Comprehensive testing interface for the ZodiacWheel component with automated tests,
            configuration options, and visual validation.
          </Text>

          <Alert status="info" mb={4}>
            <AlertIcon />
            <Box>
              <AlertTitle>Test Instructions</AlertTitle>
              <AlertDescription>
                Configure the wheel using controls below, then click "Run Tests" to validate
                functionality. Hover over planets to test tooltips. Try different themes and
                configurations to ensure everything works correctly.
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
                  <Heading size="md">Live Component</Heading>
                  <HStack>
                    <Badge colorScheme="green">Live</Badge>
                    <Badge colorScheme="blue">Updates: {updateCount}</Badge>
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
                        <Text fontWeight="bold" fontSize="md">What You're Seeing:</Text>

                        <Text>
                          <strong>Zodiac Circle:</strong> The outer ring shows the 12 zodiac signs
                          (Aries through Pisces) arranged in a 360° circle.
                        </Text>

                        {currentData.planets && (
                          <Text>
                            <strong>Planets:</strong> {currentData.planets.length} celestial bodies
                            are plotted at their current ecliptic positions. Each planet is positioned
                            according to its longitude (0-360°) within the zodiac.
                          </Text>
                        )}

                        {showRetrogrades && currentData.planets && (
                          <Text>
                            <strong>Retrograde Indicators:</strong> Planets marked with ℞ are in
                            retrograde motion (appearing to move backward from Earth's perspective).
                            Currently: {currentData.planets.filter(p => p.isRetrograde).length} retrograde.
                          </Text>
                        )}

                        {showAspects && currentData.aspects && (
                          <Text>
                            <strong>Aspect Lines:</strong> Colored lines connecting planets show
                            astrological aspects (angular relationships).
                            {currentData.aspects.filter(a => a.isExact).length} active aspects
                            within {aspectOrb}° orb. Line colors indicate aspect type: gold (conjunction),
                            cyan (sextile), red (square), green (trine), pink (opposition), purple (quincunx).
                          </Text>
                        )}

                        {showHouses && currentData.houses && (
                          <Text>
                            <strong>Houses:</strong> The 12 astrological houses are shown as divisions
                            radiating from the center, calculated for {latitude.toFixed(2)}°N,
                            {longitude.toFixed(2)}°E. Houses represent different life areas and are
                            location-specific.
                          </Text>
                        )}

                        {showDegrees && (
                          <Text>
                            <strong>Degree Markings:</strong> The circle is marked with degree indicators
                            (0°, 30°, 60°, etc.) showing exact positions within the 360° zodiac wheel.
                          </Text>
                        )}

                        <Text color="gray.600" fontSize="xs" mt={2}>
                          💡 Hover over any planet to see detailed information including exact position,
                          speed, distance, and aspects to other planets.
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
                        <Text fontWeight="bold" fontSize="md">Текущие события на небе и их значения</Text>
                      </Box>
                      <Box maxH="300px" overflowY="auto">
                        <table style={{ width: '100%', fontSize: '0.875rem' }}>
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f7fafc' }}>
                            <tr>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '40%' }}>
                                Небесное событие / Ситуация
                              </th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '60%' }}>
                                Астрологическое значение
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Planet Positions */}
                            {currentData.planets?.slice(0, 3).map((planet, idx) => (
                              <tr key={`planet-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontWeight="semibold">
                                    {planet.name} в {planet.zodiacSign.name}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    {planet.longitude.toFixed(2)}° {planet.isRetrograde ? '℞' : ''}
                                  </Text>
                                </td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontSize="sm">
                                    {planet.name === 'Sun' && `Основная индивидуальность и жизненная сила проявляются через энергию ${planet.zodiacSign.element} знака ${planet.zodiacSign.name}`}
                                    {planet.name === 'Moon' && `Эмоциональные потребности и инстинкты соответствуют ${planet.zodiacSign.quality} природе ${planet.zodiacSign.name}`}
                                    {planet.name === 'Mercury' && `Общение и мышление под влиянием подхода ${planet.zodiacSign.name}`}
                                    {!['Sun', 'Moon', 'Mercury'].includes(planet.name) && `Энергия ${planet.name} фильтруется через качества ${planet.zodiacSign.name}`}
                                    {planet.isRetrograde && ' (Ретроградная: период внутреннего пересмотра и корректировки)'}
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
                                    {aspect.type === 'conjunction' && 'Соединение'}
                                    {aspect.type === 'sextile' && 'Секстиль'}
                                    {aspect.type === 'square' && 'Квадрат'}
                                    {aspect.type === 'trine' && 'Трин'}
                                    {aspect.type === 'opposition' && 'Оппозиция'}
                                    {aspect.type === 'quincunx' && 'Квинконс'} ({aspect.angle.toFixed(1)}°, орб {aspect.orb.toFixed(1)}°)
                                  </Text>
                                </td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontSize="sm">
                                    {aspect.type === 'conjunction' && 'Энергии объединяются и усиливаются; новые начинания и единое выражение'}
                                    {aspect.type === 'opposition' && 'Полярность и напряжение; необходимость баланса и интеграции противоположностей'}
                                    {aspect.type === 'trine' && 'Гармоничный поток и естественные таланты; лёгкость и поддержка'}
                                    {aspect.type === 'square' && 'Динамическое напряжение и вызов; мотивация для роста и действия'}
                                    {aspect.type === 'sextile' && 'Возможность и потенциал; сотрудничество через усилие'}
                                    {aspect.type === 'quincunx' && 'Требуется корректировка; разные энергии ищут интеграцию'}
                                  </Text>
                                </td>
                              </tr>
                            ))}

                            {/* Retrograde Planets */}
                            {currentData.planets?.filter(p => p.isRetrograde).map((planet, idx) => (
                              <tr key={`retro-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontWeight="semibold">
                                    {planet.name} Ретроградная ℞
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    Скорость: {planet.speed.toFixed(4)}°/день
                                  </Text>
                                </td>
                                <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                  <Text fontSize="sm">
                                    {planet.name === 'Mercury' && 'Общение, технологии и путешествия требуют дополнительного внимания; время для пересмотра и корректировки'}
                                    {planet.name === 'Venus' && 'Отношения и ценности на пересмотре; переосмысление того, что приносит удовольствие и ценность'}
                                    {planet.name === 'Mars' && 'Энергия и действия обращены внутрь; переоценка целей и стратегий'}
                                    {['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(planet.name) &&
                                      `Темы ${planet.name} требуют внутренней обработки и философского пересмотра`}
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
                                      Асцендент (1-й дом)
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      {currentData.houses[0]?.sign.name} в {currentData.houses[0]?.cusp.toFixed(1)}°
                                    </Text>
                                  </td>
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <Text fontSize="sm">
                                      Самопрезентация и подход к жизни окрашены качествами {currentData.houses[0]?.sign.name};
                                      первое впечатление и личный стиль
                                    </Text>
                                  </td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <Text fontWeight="semibold">
                                      Середина неба (10-й дом)
                                    </Text>
                                    <Text fontSize="xs" color="gray.600">
                                      {currentData.houses[9]?.sign.name} в {currentData.houses[9]?.cusp.toFixed(1)}°
                                    </Text>
                                  </td>
                                  <td style={{ padding: '8px', verticalAlign: 'top' }}>
                                    <Text fontSize="sm">
                                      Направление карьеры и публичная репутация под влиянием {currentData.houses[9]?.sign.name};
                                      жизненные цели и достижения
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
                <Tab fontSize="sm">🎛️ Controls</Tab>
                <Tab fontSize="sm">🧪 Tests</Tab>
                <Tab fontSize="sm">📊 Stats</Tab>
                <Tab fontSize="sm">📖 Scenarios</Tab>
              </TabList>

              <TabPanels>
                {/* Controls Tab (Combined Quick Toggles + Configuration) */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    {/* Quick Toggles */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">Quick Toggles</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="sm" mb={0} flex={1}>
                              Show Aspects
                            </FormLabel>
                            <Switch
                              isChecked={showAspects}
                              onChange={(e) => setShowAspects(e.target.checked)}
                              colorScheme="blue"
                            />
                          </FormControl>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="sm" mb={0} flex={1}>
                              Show Houses
                            </FormLabel>
                            <Switch
                              isChecked={showHouses}
                              onChange={(e) => setShowHouses(e.target.checked)}
                              colorScheme="purple"
                            />
                          </FormControl>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="sm" mb={0} flex={1}>
                              Show Degrees
                            </FormLabel>
                            <Switch
                              isChecked={showDegrees}
                              onChange={(e) => setShowDegrees(e.target.checked)}
                              colorScheme="green"
                            />
                          </FormControl>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="sm" mb={0} flex={1}>
                              Show Retrogrades
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
                        <Heading size="sm">Quick Presets</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={2}>
                          <Button
                            size="sm"
                            width="100%"
                            onClick={() => applyPreset('minimal')}
                          >
                            Minimal (400px, no extras)
                          </Button>
                          <Button
                            size="sm"
                            width="100%"
                            onClick={() => applyPreset('standard')}
                            colorScheme="blue"
                          >
                            Standard (600px, with aspects)
                          </Button>
                          <Button
                            size="sm"
                            width="100%"
                            onClick={() => applyPreset('full')}
                            colorScheme="purple"
                          >
                            Full (800px, all features)
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Test Checklist */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">Manual Test Checklist</Heading>
                      </CardHeader>
                      <CardBody>
                        <List spacing={2} fontSize="sm">
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            Hover planets to test tooltips
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            Check retrograde indicators (℞)
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            Verify aspect lines appear
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            Toggle houses on/off
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            Try different themes
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            Test different sizes
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            Check animations are smooth
                          </ListItem>
                          <ListItem>
                            <ListIcon as={InfoIcon} color="blue.500" />
                            Verify refresh button works
                          </ListItem>
                        </List>
                      </CardBody>
                    </Card>

                    {/* Appearance */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">Appearance</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <FormControl>
                            <FormLabel fontSize="sm">Theme</FormLabel>
                            <Select
                              value={themeName}
                              onChange={(e) => setThemeName(e.target.value as ThemeName)}
                              size="sm"
                            >
                              <option value="dark">Dark (Classic)</option>
                              <option value="light">Light (Clean)</option>
                              <option value="cosmic">Cosmic (Purple)</option>
                              <option value="solar">Solar (Warm)</option>
                              <option value="lunar">Lunar (Cool)</option>
                            </Select>
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              Choose a color scheme for the wheel
                            </Text>
                          </FormControl>

                          <FormControl>
                            <FormLabel fontSize="sm">Wheel Size: {size}px</FormLabel>
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
                              Recommended: 400-800px
                            </Text>
                          </FormControl>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Advanced Settings */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">Advanced Settings</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <FormControl>
                            <FormLabel fontSize="sm">Aspect Orb: {aspectOrb}°</FormLabel>
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
                              Tolerance for aspect detection (1-15°, standard: 8°)
                            </Text>
                          </FormControl>

                          <FormControl>
                            <FormLabel fontSize="sm">
                              Refresh Interval: {refreshInterval} min
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
                                ? 'Using adaptive refresh (auto-adjusted)'
                                : 'Fixed refresh interval'}
                            </Text>
                          </FormControl>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Location & Advanced */}
                    <Card>
                      <CardHeader>
                        <Heading size="sm">Location & Advanced</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <FormControl>
                            <FormLabel fontSize="sm">Latitude</FormLabel>
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
                              -90 to 90 (default: 55.7558 Moscow)
                            </Text>
                          </FormControl>

                          <FormControl>
                            <FormLabel fontSize="sm">Longitude</FormLabel>
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
                              -180 to 180 (default: 37.6173 Moscow)
                            </Text>
                          </FormControl>

                          <Divider my={2} />

                          <FormControl display="flex" alignItems="center">
                            <FormLabel fontSize="sm" mb={0} flex={1}>
                              Adaptive Refresh
                            </FormLabel>
                            <Switch
                              isChecked={useAdaptiveRefresh}
                              onChange={(e) => setUseAdaptiveRefresh(e.target.checked)}
                              colorScheme="green"
                            />
                          </FormControl>
                          <Text fontSize="xs" color="gray.500" mt={-2}>
                            Auto-adjust refresh rate based on planet speeds
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
                      <Heading size="md">Automated Test Suite</Heading>
                      <Button
                        colorScheme="blue"
                        onClick={runTests}
                        isLoading={isRunningTests}
                        isDisabled={!currentData}
                      >
                        Run Tests
                      </Button>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    {testResults.length === 0 ? (
                      <Alert status="info">
                        <AlertIcon />
                        Click "Run Tests" to validate component functionality
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
                                {result.passed ? 'PASS' : 'FAIL'}
                              </Badge>
                            </HStack>
                            <Text fontSize="sm" mt={2} ml={6}>
                              {result.message}
                            </Text>
                            {result.duration && (
                              <Text fontSize="xs" color="gray.600" ml={6} mt={1}>
                                Duration: {result.duration}ms
                              </Text>
                            )}
                          </Box>
                        ))}

                        <Divider my={4} />

                        <HStack justify="space-between">
                          <Text fontWeight="bold">
                            Summary: {testResults.filter((r) => r.passed).length}/
                            {testResults.length} Passed
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
                              ? '✓ All Tests Passed'
                              : '⚠ Some Tests Failed'}
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
                    <Heading size="sm">Data Statistics</Heading>
                  </CardHeader>
                  <CardBody>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <Stat>
                        <StatLabel>Planets</StatLabel>
                        <StatNumber>{currentData?.planets.length || 0}</StatNumber>
                        <StatHelpText>Total loaded</StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel>Active Aspects</StatLabel>
                        <StatNumber>
                          {currentData?.aspects.filter((a) => a.isExact).length || 0}
                        </StatNumber>
                        <StatHelpText>Within orb</StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel>Retrogrades</StatLabel>
                        <StatNumber>
                          {currentData?.planets.filter((p) => p.isRetrograde).length || 0}
                        </StatNumber>
                        <StatHelpText>Currently retrograde</StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel>Houses</StatLabel>
                        <StatNumber>{currentData?.houses?.length || 0}</StatNumber>
                        <StatHelpText>Calculated</StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel>Load Time</StatLabel>
                        <StatNumber>{loadTime}ms</StatNumber>
                        <StatHelpText>Initial render</StatHelpText>
                      </Stat>

                      <Stat>
                        <StatLabel>Updates</StatLabel>
                        <StatNumber>{updateCount}</StatNumber>
                        <StatHelpText>Data refreshes</StatHelpText>
                      </Stat>
                    </Grid>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="sm">Planet Details</Heading>
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
                            {planet.longitude.toFixed(2)}° • Speed: {planet.speed.toFixed(4)}°/day
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="sm">Aspect Breakdown</Heading>
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
                          📋 Scenario 1: Basic Functionality
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">Objective:</Text>
                        <Text>
                          Verify that the component loads and displays all essential elements
                        </Text>

                        <Text fontWeight="bold" mt={2}>
                          Steps:
                        </Text>
                        <List spacing={2}>
                          <ListItem>1. Load the page with default configuration</ListItem>
                          <ListItem>2. Wait for data to load (spinner should disappear)</ListItem>
                          <ListItem>3. Verify zodiac circle is visible with 12 signs</ListItem>
                          <ListItem>4. Check that 10 planets are displayed</ListItem>
                          <ListItem>5. Verify "Live" badge appears at bottom</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>
                          Expected Result:
                        </Text>
                        <Text>
                          Wheel renders completely within 1 second, all planets visible, smooth
                          animations
                        </Text>

                        <Alert status="success" mt={2}>
                          <AlertIcon />
                          <Text fontSize="sm">
                            ✓ This is the baseline test - if this passes, core functionality works
                          </Text>
                        </Alert>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          🔗 Scenario 2: Aspect Visualization
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">Objective:</Text>
                        <Text>Test aspect calculation and visual representation</Text>

                        <Text fontWeight="bold" mt={2}>
                          Steps:
                        </Text>
                        <List spacing={2}>
                          <ListItem>1. Enable "Show Aspects" toggle</ListItem>
                          <ListItem>2. Set aspect orb to 8° (standard)</ListItem>
                          <ListItem>3. Look for colored lines connecting planets</ListItem>
                          <ListItem>4. Verify different line styles (solid, dashed, dotted)</ListItem>
                          <ListItem>5. Check aspect symbols at line midpoints</ListItem>
                          <ListItem>6. Try increasing orb to 12° - more aspects should appear</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>
                          Expected Result:
                        </Text>
                        <Text>
                          Lines appear between aspecting planets, different colors for different
                          aspects, aspect count increases with larger orb
                        </Text>

                        <Alert status="info" mt={2}>
                          <AlertIcon />
                          <Text fontSize="sm">
                            💡 Aspect types: Conjunction (gold), Sextile (cyan), Square (red),
                            Trine (green), Opposition (pink), Quincunx (purple)
                          </Text>
                        </Alert>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          ℞ Scenario 3: Retrograde Detection
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">Objective:</Text>
                        <Text>Verify retrograde planet identification and display</Text>

                        <Text fontWeight="bold" mt={2}>
                          Steps:
                        </Text>
                        <List spacing={2}>
                          <ListItem>1. Enable "Show Retrogrades" toggle</ListItem>
                          <ListItem>2. Look for ℞ symbol near planet labels</ListItem>
                          <ListItem>3. Check Statistics tab for retrograde count</ListItem>
                          <ListItem>4. Hover over retrograde planet for tooltip</ListItem>
                          <ListItem>5. Verify tooltip shows "Retrograde" badge</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>
                          Expected Result:
                        </Text>
                        <Text>
                          Retrograde planets marked with ℞ symbol and red border, tooltip confirms
                          retrograde status with badge
                        </Text>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          🏠 Scenario 4: Houses System
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">Objective:</Text>
                        <Text>Test houses calculation and overlay display</Text>

                        <Text fontWeight="bold" mt={2}>
                          Steps:
                        </Text>
                        <List spacing={2}>
                          <ListItem>1. Set location (lat/long) if not already set</ListItem>
                          <ListItem>2. Enable "Show Houses" toggle</ListItem>
                          <ListItem>3. Wait for houses to load</ListItem>
                          <ListItem>
                            4. Verify 12 house cusps appear as lines from center
                          </ListItem>
                          <ListItem>5. Check house numbers (1-12) are displayed</ListItem>
                          <ListItem>
                            6. Verify angular houses (1, 4, 7, 10) are highlighted
                          </ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>
                          Expected Result:
                        </Text>
                        <Text>
                          12 houses visible with cusps, numbers displayed, angular houses have
                          bolder lines
                        </Text>

                        <Alert status="warning" mt={2}>
                          <AlertIcon />
                          <Text fontSize="sm">
                            ⚠️ Houses require accurate location data. Default is Moscow.
                          </Text>
                        </Alert>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          🎨 Scenario 5: Theme Switching
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">Objective:</Text>
                        <Text>Verify all themes render correctly with proper colors</Text>

                        <Text fontWeight="bold" mt={2}>
                          Steps:
                        </Text>
                        <List spacing={2}>
                          <ListItem>1. Start with "Dark" theme</ListItem>
                          <ListItem>2. Switch to "Light" theme - verify colors invert</ListItem>
                          <ListItem>3. Try "Cosmic" - check for purple/space theme</ListItem>
                          <ListItem>4. Try "Solar" - verify warm yellow/orange tones</ListItem>
                          <ListItem>5. Try "Lunar" - check for cool blue/grey tones</ListItem>
                          <ListItem>6. Verify aspect line colors change appropriately</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>
                          Expected Result:
                        </Text>
                        <Text>
                          Each theme applies distinct color palette, all elements visible and
                          readable in all themes
                        </Text>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          📏 Scenario 6: Size Responsiveness
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">Objective:</Text>
                        <Text>Test component at different sizes</Text>

                        <Text fontWeight="bold" mt={2}>
                          Steps:
                        </Text>
                        <List spacing={2}>
                          <ListItem>1. Set size to 300px (minimum)</ListItem>
                          <ListItem>2. Verify all elements still visible and readable</ListItem>
                          <ListItem>3. Set size to 600px (standard)</ListItem>
                          <ListItem>4. Set size to 900px (maximum)</ListItem>
                          <ListItem>5. Check that labels scale appropriately</ListItem>
                          <ListItem>6. Verify aspect lines remain visible at all sizes</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>
                          Expected Result:
                        </Text>
                        <Text>
                          Component scales smoothly, text remains readable, proportions maintained
                        </Text>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          🔄 Scenario 7: Real-time Updates
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">Objective:</Text>
                        <Text>Test auto-refresh and adaptive refresh functionality</Text>

                        <Text fontWeight="bold" mt={2}>
                          Steps:
                        </Text>
                        <List spacing={2}>
                          <ListItem>1. Enable "Adaptive Refresh"</ListItem>
                          <ListItem>2. Watch the "Updates" counter in header</ListItem>
                          <ListItem>3. Wait for automatic refresh (should see toast)</ListItem>
                          <ListItem>4. Click manual refresh button</ListItem>
                          <ListItem>5. Check Statistics tab for update count</ListItem>
                          <ListItem>
                            6. Disable adaptive, set fixed interval to 1 min, wait for update
                          </ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>
                          Expected Result:
                        </Text>
                        <Text>
                          Updates occur automatically, counter increments, toast notifications
                          appear, manual refresh works
                        </Text>

                        <Alert status="info" mt={2}>
                          <AlertIcon />
                          <Text fontSize="sm">
                            💡 Adaptive refresh adjusts from 5-60 minutes based on planet speeds
                          </Text>
                        </Alert>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          🖱️ Scenario 8: Interactive Tooltips
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">Objective:</Text>
                        <Text>Test hover interactions and tooltip content</Text>

                        <Text fontWeight="bold" mt={2}>
                          Steps:
                        </Text>
                        <List spacing={2}>
                          <ListItem>1. Hover over Sun - tooltip should appear</ListItem>
                          <ListItem>2. Verify tooltip shows: position, sign, speed, distance</ListItem>
                          <ListItem>
                            3. If planet has aspects, they should be listed in tooltip
                          </ListItem>
                          <ListItem>4. Move to Moon - tooltip should update smoothly</ListItem>
                          <ListItem>5. Hover over retrograde planet - check for ℞ badge</ListItem>
                          <ListItem>6. Move mouse away - tooltip should disappear</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>
                          Expected Result:
                        </Text>
                        <Text>
                          Tooltips appear instantly on hover, show complete information, smooth
                          transitions, accurate data
                        </Text>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          ⚡ Scenario 9: Performance Test
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">Objective:</Text>
                        <Text>Verify component meets performance targets</Text>

                        <Text fontWeight="bold" mt={2}>
                          Steps:
                        </Text>
                        <List spacing={2}>
                          <ListItem>1. Check Statistics tab for Load Time</ListItem>
                          <ListItem>2. Verify load time is under 1000ms</ListItem>
                          <ListItem>3. Enable all features (aspects, houses, degrees)</ListItem>
                          <ListItem>4. Set size to 800px</ListItem>
                          <ListItem>5. Verify animations remain smooth (no jank)</ListItem>
                          <ListItem>6. Run automated tests - check durations</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>
                          Expected Result:
                        </Text>
                        <Text>
                          Load time &lt;1s, 60fps animations, no lag during interactions, test
                          durations all &lt;100ms
                        </Text>

                        <Alert status="success" mt={2}>
                          <AlertIcon />
                          <Text fontSize="sm">
                            ✓ Target: Load &lt;1s, 60fps, &lt;10MB memory
                          </Text>
                        </Alert>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left" fontWeight="bold">
                          🌍 Scenario 10: Location Change
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="bold">Objective:</Text>
                        <Text>Test houses recalculation with different locations</Text>

                        <Text fontWeight="bold" mt={2}>
                          Steps:
                        </Text>
                        <List spacing={2}>
                          <ListItem>1. Enable "Show Houses"</ListItem>
                          <ListItem>2. Note current house cusps positions</ListItem>
                          <ListItem>3. Change latitude to 40.7128 (New York)</ListItem>
                          <ListItem>4. Change longitude to -74.0060</ListItem>
                          <ListItem>5. Wait for data refresh</ListItem>
                          <ListItem>6. Verify house cusps have moved</ListItem>
                          <ListItem>7. Planet positions should remain the same</ListItem>
                        </List>

                        <Text fontWeight="bold" mt={2}>
                          Expected Result:
                        </Text>
                        <Text>
                          Houses recalculate for new location, planet positions unchanged (they're
                          geocentric)
                        </Text>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>

                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Testing Tips</AlertTitle>
                    <AlertDescription>
                      <List spacing={1} mt={2} fontSize="sm">
                        <ListItem>• Test each scenario independently</ListItem>
                        <ListItem>• Check browser console for errors</ListItem>
                        <ListItem>• Use automated tests to verify core functionality</ListItem>
                        <ListItem>• Try edge cases (very small/large sizes, extreme orbs)</ListItem>
                        <ListItem>• Test on different browsers if possible</ListItem>
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
