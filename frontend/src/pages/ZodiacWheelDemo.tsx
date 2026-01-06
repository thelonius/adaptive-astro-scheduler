import React, { useState } from 'react';
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
  useColorMode,
} from '@chakra-ui/react';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { LunarSection } from '../components/LunarSection';
import { themes, type ThemeName } from '../components/ZodiacWheel/themes';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';

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

  // Location state (Moscow by default)
  const [latitude, setLatitude] = useState(55.7558);
  const [longitude, setLongitude] = useState(37.6173);
  const [timezone] = useState('Europe/Moscow');

  // Data state for statistics
  const [currentData, setCurrentData] = useState<ZodiacWheelData | null>(null);

  const handleDataUpdate = (data: ZodiacWheelData) => {
    setCurrentData(data);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="xl" mb={2}>
            Zodiac Wheel - Real-time Celestial Visualization
          </Heading>
          <Text color="gray.500">
            Interactive astrological chart with live planetary positions and aspects
          </Text>
        </Box>

        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={8}>
          {/* Main Wheel */}
          <GridItem>
            <Card>
              <CardBody display="flex" justifyContent="center" alignItems="center" p={8}>
                <ZodiacWheel
                  config={{
                    size,
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
                  useAdaptiveRefresh={useAdaptiveRefresh}
                  onDataUpdate={handleDataUpdate}
                />
              </CardBody>
            </Card>
          </GridItem>

          {/* Controls */}
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
