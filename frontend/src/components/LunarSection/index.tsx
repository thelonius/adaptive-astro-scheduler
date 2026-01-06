import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Grid,
  GridItem,
  Icon,
  Divider,
  Progress,
  Tooltip,
  useColorModeValue
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import type { LunarDay, DateTime } from '@adaptive-astro/shared/types';

interface LunarSectionProps {
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface LunarData {
  lunarDay: LunarDay;
  moonPhase: {
    phase: string;
    illumination: number;
    age: number; // Days since new moon
  };
  voidMoon: {
    isVoid: boolean;
    voidStart?: string;
    voidEnd?: string;
    nextAspect?: string;
  };
  dayChangeTime: string;
  nextDayChangeTime: string;
}

const MotionCard = motion(Card);
const MotionBox = motion(Box);

export const LunarSection: React.FC<LunarSectionProps> = ({
  latitude = 55.7558,
  longitude = 37.6173,
  timezone = 'Europe/Moscow'
}) => {
  const [lunarData, setLunarData] = useState<LunarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bgGradient = useColorModeValue(
    'linear(to-br, blue.50, purple.50, pink.50)',
    'linear(to-br, blue.900, purple.900, pink.900)'
  );

  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.200');

  useEffect(() => {
    fetchLunarData();
    // Update every minute to keep day change times accurate
    const interval = setInterval(fetchLunarData, 60000);
    return () => clearInterval(interval);
  }, [latitude, longitude, timezone]);

  const fetchLunarData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch lunar day data
      const lunarDayResponse = await fetch(
        `/api/ephemeris/lunar-day?date=${today}&timezone=${timezone}`
      );

      // Fetch moon phase
      const moonPhaseResponse = await fetch(
        `/api/ephemeris/moon-phase?date=${today}&timezone=${timezone}`
      );

      // Fetch void moon
      const voidMoonResponse = await fetch(
        `/api/ephemeris/void-moon?date=${today}&timezone=${timezone}`
      );

      if (!lunarDayResponse.ok || !moonPhaseResponse.ok || !voidMoonResponse.ok) {
        throw new Error('Failed to fetch lunar data');
      }

      const lunarDayData = await lunarDayResponse.json();
      const moonPhaseData = await moonPhaseResponse.json();
      const voidMoonData = await voidMoonResponse.json();

      // Calculate moon phase info from illumination
      const illumination = moonPhaseData.moonPhase || 0;
      const age = (illumination * 29.53); // Approximate age in days

      let phaseName = 'New';
      if (illumination < 0.125) phaseName = 'New';
      else if (illumination < 0.25) phaseName = 'Waxing Crescent';
      else if (illumination < 0.375) phaseName = 'First Quarter';
      else if (illumination < 0.625) phaseName = 'Waxing Gibbous';
      else if (illumination < 0.75) phaseName = 'Full';
      else if (illumination < 0.875) phaseName = 'Waning Gibbous';
      else if (illumination < 1.0) phaseName = 'Last Quarter';
      else phaseName = 'Waning Crescent';

      // Calculate day change times (mock implementation)
      const now = new Date();
      const dayChangeHour = 6; // Lunar day typically changes around sunrise
      const dayChange = new Date(now);
      dayChange.setHours(dayChangeHour, 0, 0, 0);

      const nextDayChange = new Date(dayChange);
      nextDayChange.setDate(dayChange.getDate() + 1);

      setLunarData({
        lunarDay: lunarDayData,
        moonPhase: {
          phase: phaseName,
          illumination: illumination,
          age: age
        },
        voidMoon: voidMoonData,
        dayChangeTime: dayChange.toLocaleTimeString(),
        nextDayChangeTime: nextDayChange.toLocaleTimeString()
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lunar data');
    } finally {
      setLoading(false);
    }
  };

  const getMoonPhaseEmoji = (phase: string): string => {
    const phaseMap: Record<string, string> = {
      'New': '🌑',
      'Waxing Crescent': '🌒',
      'First Quarter': '🌓',
      'Waxing Gibbous': '🌔',
      'Full': '🌕',
      'Waning Gibbous': '🌖',
      'Last Quarter': '🌗',
      'Waning Crescent': '🌘'
    };
    return phaseMap[phase] || '🌙';
  };

  const getLunarEnergyColor = (energy: string): string => {
    switch (energy) {
      case 'Light': return 'yellow';
      case 'Dark': return 'purple';
      case 'Neutral': return 'gray';
      default: return 'blue';
    }
  };

  if (loading) {
    return (
      <Card bg={cardBg} shadow="lg">
        <CardBody display="flex" justifyContent="center" alignItems="center" minH="200px">
          <VStack>
            <Spinner size="xl" color="purple.500" />
            <Text color={textColor}>Loading lunar data...</Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  if (error || !lunarData) {
    return (
      <Card bg={cardBg} shadow="lg">
        <CardBody>
          <VStack>
            <Text color="red.400" fontWeight="bold">Error loading lunar data</Text>
            <Text color={textColor} fontSize="sm">{error}</Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <MotionCard
        bg={cardBg}
        shadow="xl"
        border="1px solid"
        borderColor="purple.200"
        _dark={{ borderColor: 'purple.600' }}
        overflow="hidden"
      >
        <Box bgGradient={bgGradient} p={1} />

        <CardHeader pb={2}>
          <HStack justify="space-between" align="center">
            <HStack>
              <Text fontSize="2xl">🌙</Text>
              <Heading size="lg" color="purple.600" _dark={{ color: 'purple.300' }}>
                Lunar Information
              </Heading>
            </HStack>
            <Badge colorScheme="purple" variant="subtle">
              Live
            </Badge>
          </HStack>
        </CardHeader>

        <CardBody pt={0}>
          <VStack spacing={6} align="stretch">

            {/* Current Lunar Day */}
            <MotionBox
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Box textAlign="center" p={4} bg="purple.50" _dark={{ bg: 'purple.900' }} borderRadius="lg">
                <Text fontSize="4xl" mb={2}>{lunarData.lunarDay.symbol}</Text>
                <Heading size="xl" color="purple.600" _dark={{ color: 'purple.300' }} mb={2}>
                  Lunar Day {lunarData.lunarDay.number}
                </Heading>
                <Badge
                  colorScheme={getLunarEnergyColor(lunarData.lunarDay.energy)}
                  size="lg"
                  px={3}
                  py={1}
                >
                  {lunarData.lunarDay.energy} Energy
                </Badge>
              </Box>
            </MotionBox>

            {/* Moon Phase & Illumination */}
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <GridItem>
                <Card bg="blue.50" _dark={{ bg: 'blue.900' }} variant="filled">
                  <CardBody textAlign="center">
                    <Text fontSize="3xl" mb={2}>
                      {getMoonPhaseEmoji(lunarData.moonPhase.phase)}
                    </Text>
                    <Text fontWeight="bold" fontSize="lg" mb={2}>
                      {lunarData.moonPhase.phase}
                    </Text>
                    <Text fontSize="sm" color="blue.600" _dark={{ color: 'blue.300' }}>
                      Age: {lunarData.moonPhase.age.toFixed(1)} days
                    </Text>
                  </CardBody>
                </Card>
              </GridItem>

              <GridItem>
                <Card bg="yellow.50" _dark={{ bg: 'yellow.900' }} variant="filled">
                  <CardBody>
                    <VStack spacing={3}>
                      <Text fontWeight="bold">Illumination</Text>
                      <Progress
                        value={lunarData.moonPhase.illumination * 100}
                        colorScheme="yellow"
                        size="lg"
                        w="full"
                        borderRadius="full"
                      />
                      <Text fontSize="lg" fontWeight="bold" color="yellow.600" _dark={{ color: 'yellow.300' }}>
                        {(lunarData.moonPhase.illumination * 100).toFixed(1)}%
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>

            {/* Day Change Times */}
            <Card bg="green.50" _dark={{ bg: 'green.900' }} variant="filled">
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Text fontWeight="bold">🕐 Today's Change:</Text>
                    <Badge colorScheme="green">{lunarData.dayChangeTime}</Badge>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontWeight="bold">🕕 Next Change:</Text>
                    <Badge colorScheme="orange">{lunarData.nextDayChangeTime}</Badge>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Void of Course Moon */}
            <Card
              bg={lunarData.voidMoon.isVoid ? "red.50" : "gray.50"}
              _dark={{ bg: lunarData.voidMoon.isVoid ? "red.900" : "gray.800" }}
              variant="filled"
            >
              <CardBody>
                <HStack justify="space-between" align="center">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold">
                      🌘 Void of Course Moon
                    </Text>
                    <Badge
                      colorScheme={lunarData.voidMoon.isVoid ? "red" : "green"}
                      variant="solid"
                    >
                      {lunarData.voidMoon.isVoid ? "ACTIVE" : "Not Active"}
                    </Badge>
                  </VStack>
                  {lunarData.voidMoon.isVoid && (
                    <VStack align="end" spacing={1}>
                      <Text fontSize="xs" color={textColor}>
                        Until: {lunarData.voidMoon.voidEnd
                          ? new Date(lunarData.voidMoon.voidEnd).toLocaleString('ru-RU', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: timezone
                            })
                          : 'N/A'}
                      </Text>
                      <Text fontSize="xs" color={textColor}>
                        Next: {lunarData.voidMoon.nextAspect}
                      </Text>
                    </VStack>
                  )}
                </HStack>
              </CardBody>
            </Card>

            {/* Lunar Day Characteristics */}
            <Card bg="indigo.50" _dark={{ bg: 'indigo.900' }} variant="filled">
              <CardBody>
                <VStack align="stretch" spacing={4}>
                  <Heading size="sm" color="indigo.600" _dark={{ color: 'indigo.300' }}>
                    Day Characteristics
                  </Heading>

                  <VStack align="stretch" spacing={3}>
                    <Box>
                      <Text fontWeight="bold" color="green.600" _dark={{ color: 'green.300' }} mb={1}>
                        🙏 Spiritual Focus:
                      </Text>
                      <Text fontSize="sm" color={textColor}>
                        {lunarData.lunarDay.characteristics?.spiritual || "Focus on inner reflection and meditation"}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontWeight="bold" color="blue.600" _dark={{ color: 'blue.300' }} mb={1}>
                        🎯 Practical Activities:
                      </Text>
                      <Text fontSize="sm" color={textColor}>
                        {lunarData.lunarDay.characteristics?.practical || "Good for planning and organizing tasks"}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontWeight="bold" color="red.600" _dark={{ color: 'red.300' }} mb={1}>
                        ⚠️ Best to Avoid:
                      </Text>
                      <Text fontSize="sm" color={textColor}>
                        {lunarData.lunarDay.characteristics?.avoided?.join(', ') || "Hasty decisions, conflicts"}
                      </Text>
                    </Box>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </CardBody>
      </MotionCard>
    </MotionBox>
  );
};