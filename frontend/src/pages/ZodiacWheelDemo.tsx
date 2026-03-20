import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Grid,
  GridItem,
  Badge,
  Button,
  useColorMode,
} from '@chakra-ui/react';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { LunarSection } from '../components/LunarSection';
import { CesiumSkyViewer } from '../components/CesiumSkyViewer';
import { themes, type ThemeName } from '../components/ZodiacWheel/themes';
import { FeaturedEventsCarousel, type FeaturedEvent } from '../components/FeaturedEvents';
import { useAdaptiveZodiacData } from '../hooks/useZodiacData';
import { AsciiCelestialArt } from '../components/AsciiCelestialArt';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';
import { useNatalChart } from '../hooks/useNatalChart';
import { GeoLuckMap } from '../components/GeoLuckMap';
import axios from 'axios';

export const ZodiacWheelDemo: React.FC = () => {
  const { colorMode } = useColorMode();

  // Configuration state
  const [size, setSize] = useState(600);
  const [showHouses, setShowHouses] = useState(true);
  const [showAspects, setShowAspects] = useState(true);
  const [showDegrees, setShowDegrees] = useState(true);
  const [showRetrogrades, setShowRetrogrades] = useState(true);
  const [aspectOrb, setAspectOrb] = useState(8);
  const [refreshInterval, setRefreshInterval] = useState(1);
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  const [useAdaptiveRefresh, setUseAdaptiveRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<'2d' | '3d' | 'both'>('3d');

  // Location state (Moscow by default)
  const [latitude, setLatitude] = useState(55.7558);
  const [longitude, setLongitude] = useState(37.6173);
  const [timezone] = useState('Europe/Moscow');

  // Featured Events State
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [activeBodies, setActiveBodies] = useState<string[]>([]);
  const [eventTitle, setEventTitle] = useState<string | undefined>(undefined);

  // Geo Scan State
  const [geoNodes, setGeoNodes] = useState<any[]>([]);
  const [geoRecs, setGeoRecs] = useState<any>({ career: null, personal: null, wealth: null });
  const [isScanningGeo, setIsScanningGeo] = useState(false);

  // User Natal Chart for Geo-Scan
  const { calculateChart: calculateUserNatal, data: userNatalData } = useNatalChart();

  useEffect(() => {
    calculateUserNatal({
      birthDate: '1984-09-11',
      birthTime: '01:40',
      latitude: 55.7558,
      longitude: 37.6173,
      timezone: 'Europe/Moscow'
    });
  }, [calculateUserNatal]);

  // Use centralized data fetching
  const { data: currentData, loading } = useAdaptiveZodiacData({
    refreshInterval: refreshInterval * 60 * 1000,
    latitude,
    longitude,
    timezone,
    includeHouses: showHouses,
    aspectOrb,
    date: targetDate,
    adaptive: useAdaptiveRefresh && !targetDate,
  });

  // Viewer time state for animations (separate from data fetch time)
  const [viewerTime, setViewerTime] = useState<Date>(new Date());
  const [animatedData, setAnimatedData] = useState<ZodiacWheelData | null>(null);
  const animationRef = useRef<number>();
  const baseDataRef = useRef<ZodiacWheelData | null>(null);
  const baseTimeRef = useRef<Date | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState(60); // 60x speed = 1 minute per second
  const [isPlaying, setIsPlaying] = useState(true); // Control animation playback

  // Interpolate planet positions based on time elapsed and orbital speeds
  const interpolatePlanetData = (
    baseData: ZodiacWheelData,
    baseTime: Date,
    currentTime: Date
  ): ZodiacWheelData => {
    const elapsedMs = currentTime.getTime() - baseTime.getTime();
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

    const interpolatedPlanets = baseData.planets.map(planet => {
      // Calculate new longitude: longitude + speed * days
      // Speed is in degrees per day
      let newLongitude = planet.longitude + (planet.speed * elapsedDays);

      // Normalize to 0-360
      newLongitude = ((newLongitude % 360) + 360) % 360;

      // Keep original zodiacSign but update the degree within sign
      return {
        ...planet,
        longitude: newLongitude,
        zodiacSign: {
          ...planet.zodiacSign,
          degree: newLongitude % 30
        }
      };
    });

    return {
      ...baseData,
      planets: interpolatedPlanets,
      timestamp: currentTime
    };
  };

  const handleGeoScan = async () => {
    if (!userNatalData) return;
    setIsScanningGeo(true);
    try {
      const resp = await axios.post('http://localhost:3001/api/v1/travel/scan', {
        natalChart: userNatalData
      });
      setGeoNodes(resp.data.highestScoreZones);
      setGeoRecs(resp.data.recommendations);
    } catch (err) {
      console.error('Geo scan failed:', err);
    } finally {
      setIsScanningGeo(false);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Store base data when it arrives
  useEffect(() => {
    if (currentData && targetDate) {
      baseDataRef.current = currentData;
      baseTimeRef.current = targetDate;
    }
  }, [currentData, targetDate]);

  // Continuous animation: Time flows forward from event, planets move naturally

  // 1. Live Mode (No Event Selected)
  useEffect(() => {
    if (targetDate) return;
    const interval = setInterval(() => setViewerTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // 2. Animation Mode (Event Selected)
  useEffect(() => {
    if (!targetDate) return;

    let lastTime = Date.now();
    let frameId: number;

    const step = () => {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;

      if (isPlaying) {
        setViewerTime(prev => new Date(prev.getTime() + (dt * animationSpeed)));
      }
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [targetDate, isPlaying, animationSpeed]);

  // Update animated data based on viewerTime
  useEffect(() => {
    if (baseDataRef.current && baseTimeRef.current && targetDate) {
      const interpolated = interpolatePlanetData(
        baseDataRef.current,
        baseTimeRef.current,
        viewerTime
      );
      setAnimatedData(interpolated);
    }
  }, [viewerTime, targetDate]);

  const handleEventSelect = useCallback((event: FeaturedEvent) => {
    setSelectedEventId(event.id);
    setTargetDate(event.date);
    setViewerTime(event.date);
    setIsPlaying(true);
    setActiveBodies(event.activeBodies);
    setEventTitle(event.title);
    // Reset animation refs
    baseDataRef.current = null;
    baseTimeRef.current = null;
    // Switch to 3D view or Both if in 2D to see the event properly
    if (viewMode === '2d') {
      setViewMode('both');
    }
  }, [viewMode]);



  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <HStack justify="space-between" align="flex-start">
            <Box>
              <Heading size="xl" mb={2}>
                Zodiac Wheel - Real-time Celestial Visualization
              </Heading>
              <Text color="gray.500">
                Interactive astrological chart with live planetary positions and aspects
              </Text>

              {/* Featured Events Carousel */}
              <Box mt={6}>
                <FeaturedEventsCarousel
                  onSelectEvent={handleEventSelect}
                  selectedEventId={selectedEventId}
                />
              </Box>

              {/* ASCII Celestial Art Widget - Disabled for now */}
              {/* <Box mt={6} borderRadius="lg" overflow="hidden" boxShadow="md">
                <AsciiCelestialArt time={viewerTime} height="120px" />
              </Box> */}
            </Box>

            {/* View Mode Toggle */}
            <Card>
              <CardBody p={3}>
                <FormControl>
                  <FormLabel fontSize="sm" mb={2}>View Mode</FormLabel>
                  <HStack spacing={2}>
                    <button
                      onClick={() => setViewMode('2d')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: viewMode === '2d' ? '#3182ce' : 'transparent',
                        background: viewMode === '2d' ? 'rgba(49, 130, 206, 0.1)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      2D
                    </button>
                    <button
                      onClick={() => setViewMode('3d')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: viewMode === '3d' ? '#3182ce' : 'transparent',
                        background: viewMode === '3d' ? 'rgba(49, 130, 206, 0.1)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      3D
                    </button>
                    <button
                      onClick={() => setViewMode('both')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: viewMode === 'both' ? '#3182ce' : 'transparent',
                        background: viewMode === 'both' ? 'rgba(49, 130, 206, 0.1)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Both
                    </button>
                  </HStack>
                </FormControl>
              </CardBody>
            </Card>

            {/* Animation Speed Control - Only show when viewing an event */}
            {targetDate && (
              <Card bg="purple.50" borderColor="purple.200" borderWidth={2}>
                <CardBody py={2}>
                  <FormControl>
                    <FormLabel fontSize="sm" mb={1} color="purple.700">
                      ⏱️ Time Flow Speed
                    </FormLabel>
                    <HStack spacing={2}>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '2px solid',
                          borderColor: isPlaying ? '#ECC94B' : '#48BB78',
                          background: isPlaying ? 'rgba(236, 201, 75, 0.1)' : 'rgba(72, 187, 120, 0.1)',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          color: isPlaying ? '#B7791F' : '#276749',
                        }}
                      >
                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                      </button>
                      {[
                        { value: 1, label: '1x' },
                        { value: 60, label: '1min/s' },
                        { value: 600, label: '10min/s' },
                        { value: 3600, label: '1hr/s' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setAnimationSpeed(option.value)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '2px solid',
                            borderColor: animationSpeed === option.value ? '#805AD5' : 'transparent',
                            background: animationSpeed === option.value ? 'rgba(128, 90, 213, 0.2)' : 'rgba(128, 90, 213, 0.05)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: animationSpeed === option.value ? 'bold' : 'normal',
                            color: '#553C9A',
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                      <Button
                        size="xs"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => {
                          setTargetDate(undefined);
                          setSelectedEventId(undefined);
                          setActiveBodies([]);
                          setEventTitle(undefined);
                        }}
                      >
                        ✕ Exit
                      </Button>
                    </HStack>
                  </FormControl>
                </CardBody>
              </Card>
            )}
          </HStack>
        </Box>

        <Grid
          templateColumns={{
            base: '1fr',
            lg: viewMode === 'both' ? 'repeat(2, 1fr)' : viewMode === '2d' ? '2fr 1fr' : '1fr',
            xl: viewMode === 'both' ? '1fr 1fr 400px' : viewMode === '2d' ? '2fr 1fr' : '2fr 1fr'
          }}
          gap={8}
        >
          {/* 2D Zodiac Wheel */}
          {(viewMode === '2d' || viewMode === 'both') && (
            <GridItem>
              <Card>
                <CardBody display="flex" justifyContent="center" alignItems="center" p={8}>
                  <ZodiacWheel
                    config={{
                      size: 1000,
                      showHouses,
                      showAspects,
                      showDegrees,
                      showRetrogrades,
                      aspectOrb,
                      refreshInterval: refreshInterval * 60 * 1000,
                      colorScheme: themes[themeName],
                    }}
                    latitude={latitude}
                    longitude={longitude}
                    timezone={timezone}
                    useAdaptiveRefresh={useAdaptiveRefresh && !targetDate} // Disable adaptive refresh when viewing specific date
                    date={targetDate}
                    data={currentData}
                  />
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* 3D Cesium Sky Viewer */}
          {(viewMode === '3d' || viewMode === 'both') && (
            <GridItem>
              <VStack spacing={4} align="stretch">
                <Card>
                  <CardBody p={0}>
                    <CesiumSkyViewer
                      key="cesium-viewer"
                      planetData={currentData || undefined}
                      currentTime={viewerTime}
                      height={600}
                      autoRotate={false}
                      activeBodies={activeBodies}
                      loading={loading && !!targetDate}
                      eventTitle={eventTitle}
                      isPlaying={isPlaying}
                      animationSpeed={animationSpeed}
                      onTogglePlay={() => setIsPlaying(!isPlaying)}
                      natalChart={userNatalData}
                    />
                  </CardBody>
                </Card>

                {/* 2D Geo Luck Projection */}
                <Box>
                  <Heading size="sm" mb={3} color="gray.400" display="flex" justifyContent="space-between" alignItems="center">
                    2D Luck Projection
                    <Button size="xs" colorScheme="teal" onClick={handleGeoScan} isLoading={isScanningGeo}>
                      Refresh Scan
                    </Button>
                  </Heading>
                  <GeoLuckMap
                    nodes={geoNodes}
                    recommendations={geoRecs}
                    isLoading={isScanningGeo}
                  />
                </Box>
              </VStack>
            </GridItem>
          )}

          {/* Controls */}
          {viewMode !== '3d' && (
            <GridItem>
              <VStack spacing={6} align="stretch">
                {/* Statistics */}
                {currentData && currentData.planets && currentData.aspects && (
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={4}>
                        Current Data
                      </Heading>
                      <VStack align="stretch" spacing={2}>
                        <HStack justify="space-between">
                          <Text fontSize="sm">Planets:</Text>
                          <Badge colorScheme="blue">{currentData.planets.length}</Badge>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm">Active Aspects:</Text>
                          <Badge colorScheme="green">
                            {currentData.aspects?.filter(a => a.orb <= 8).length || 0}
                          </Badge>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm">Retrogrades:</Text>
                          <Badge colorScheme="red">
                            {currentData.planets.filter(p => p.isRetrograde).length}
                          </Badge>
                        </HStack>
                        {currentData.houses && (
                          <HStack justify="space-between">
                            <Text fontSize="sm">Houses:</Text>
                            <Badge colorScheme="purple">{currentData.houses.length}</Badge>
                          </HStack>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Theme Selection */}
                <Card>
                  <CardBody>
                    <FormControl>
                      <FormLabel fontSize="sm">Theme</FormLabel>
                      <Select
                        value={themeName}
                        onChange={(e) => setThemeName(e.target.value as ThemeName)}
                        size="sm"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="cosmic">Cosmic</option>
                        <option value="solar">Solar</option>
                        <option value="lunar">Lunar</option>
                      </Select>
                    </FormControl>
                  </CardBody>
                </Card>

                {/* Display Options */}
                <Card>
                  <CardBody>
                    <Heading size="sm" mb={4}>
                      Display Options
                    </Heading>
                    <VStack align="stretch" spacing={4}>
                      <FormControl display="flex" alignItems="center">
                        <FormLabel fontSize="sm" mb={0} flex={1}>
                          Show Aspects
                          {currentData && (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {currentData.aspects?.filter(a => a.orb <= 8).length || 0 > 0
                                ? `${currentData.aspects?.filter(a => a.orb <= 8).length || 0} available`
                                : 'No aspects currently'}
                            </Text>
                          )}
                        </FormLabel>
                        <Switch
                          isChecked={showAspects}
                          onChange={(e) => setShowAspects(e.target.checked)}
                          isDisabled={!currentData?.aspects?.filter(a => a.orb <= 8).length}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel fontSize="sm" mb={0} flex={1}>
                          Show Houses
                        </FormLabel>
                        <Switch
                          isChecked={showHouses}
                          onChange={(e) => setShowHouses(e.target.checked)}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel fontSize="sm" mb={0} flex={1}>
                          Show Degrees
                        </FormLabel>
                        <Switch
                          isChecked={showDegrees}
                          onChange={(e) => setShowDegrees(e.target.checked)}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel fontSize="sm" mb={0} flex={1}>
                          Show Retrogrades
                          {currentData && (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {currentData.planets?.filter(p => p.isRetrograde).length || 0 > 0
                                ? `${currentData.planets?.filter(p => p.isRetrograde).length || 0} retrograde planets`
                                : 'No retrogrades currently'}
                            </Text>
                          )}
                        </FormLabel>
                        <Switch
                          isChecked={showRetrogrades}
                          onChange={(e) => setShowRetrogrades(e.target.checked)}
                          isDisabled={!currentData?.planets?.filter(p => p.isRetrograde).length}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel fontSize="sm" mb={0} flex={1}>
                          Adaptive Refresh
                        </FormLabel>
                        <Switch
                          isChecked={useAdaptiveRefresh}
                          onChange={(e) => setUseAdaptiveRefresh(e.target.checked)}
                        />
                      </FormControl>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Advanced Settings */}
                <Card>
                  <CardBody>
                    <Heading size="sm" mb={4}>
                      Advanced Settings
                    </Heading>
                    <VStack align="stretch" spacing={4}>
                      <FormControl>
                        <FormLabel fontSize="sm">
                          Wheel Size: {size}px
                        </FormLabel>
                        <Slider
                          value={size}
                          onChange={setSize}
                          min={300}
                          max={800}
                          step={50}
                        >
                          <SliderTrack>
                            <SliderFilledTrack />
                          </SliderTrack>
                          <SliderThumb />
                        </Slider>
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="sm">
                          Aspect Orb: {aspectOrb}°
                        </FormLabel>
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
                        {useAdaptiveRefresh && (
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            Using adaptive refresh (auto-adjusted)
                          </Text>
                        )}
                      </FormControl>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Location Settings */}
                <Card>
                  <CardBody>
                    <Heading size="sm" mb={4}>
                      Location
                    </Heading>
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
                      </FormControl>

                      <Text fontSize="xs" color="gray.500">
                        Timezone: {timezone}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </GridItem>
          )}
        </Grid>

        {/* Lunar Section */}
        <LunarSection
          latitude={latitude}
          longitude={longitude}
          timezone={timezone}
        />

        {/* Feature Highlights */}
        <Card>
          <CardBody>
            <Heading size="sm" mb={4}>
              Features
            </Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
              <Box>
                <Text fontWeight="bold" fontSize="sm" mb={1}>
                  🎯 Real-time Updates
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Auto-refresh with adaptive intervals based on planet speeds
                </Text>
              </Box>
              <Box>
                <Text fontWeight="bold" fontSize="sm" mb={1}>
                  🌟 Full Aspects
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Conjunction, sextile, square, trine, opposition, quincunx
                </Text>
              </Box>
              <Box>
                <Text fontWeight="bold" fontSize="sm" mb={1}>
                  ℞ Retrogrades
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Visual indicators for retrograde planets
                </Text>
              </Box>
              <Box>
                <Text fontWeight="bold" fontSize="sm" mb={1}>
                  🏠 Houses
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Optional astrological houses overlay (Placidus system)
                </Text>
              </Box>
              <Box>
                <Text fontWeight="bold" fontSize="sm" mb={1}>
                  💫 Smooth Animations
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Framer Motion powered transitions
                </Text>
              </Box>
              <Box>
                <Text fontWeight="bold" fontSize="sm" mb={1}>
                  🎨 Custom Themes
                </Text>
                <Text fontSize="xs" color="gray.500">
                  5 built-in themes + full customization
                </Text>
              </Box>
            </Grid>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default ZodiacWheelDemo;
