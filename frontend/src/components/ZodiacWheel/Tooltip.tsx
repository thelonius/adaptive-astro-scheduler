import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Text, VStack, HStack, Badge } from '@chakra-ui/react';
import type { CelestialBody, Aspect } from '@adaptive-astro/shared/types';
import { formatPlanetDegree, getPlanetSymbol } from './utils';
import ZodiacIcon from './ZodiacIcon';

interface TooltipProps {
  planet: CelestialBody | null;
  aspects?: Aspect[];
  position: { x: number; y: number };
}

export const Tooltip: React.FC<TooltipProps> = ({ planet, aspects, position }) => {
  if (!planet) return null;

  const relatedAspects = aspects?.filter(
    a => a.body1.name === planet.name || a.body2.name === planet.name
  ) || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute',
          left: position.x + 20,
          top: position.y - 20,
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        <Box
          bg="rgba(0, 0, 0, 0.9)"
          borderRadius="md"
          padding={3}
          border="1px solid"
          borderColor="whiteAlpha.300"
          boxShadow="lg"
          minW="200px"
        >
          <VStack align="stretch" spacing={2}>
            {/* Planet header */}
            <HStack justify="space-between">
              <HStack>
                <Text fontSize="xl" fontWeight="bold">
                  {getPlanetSymbol(planet.name)}
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="white">
                  {planet.name}
                </Text>
              </HStack>
              {planet.isRetrograde && (
                <Badge colorScheme="red" fontSize="xs">
                  ℞ Retrograde
                </Badge>
              )}
            </HStack>

            {/* Position */}
            <VStack align="stretch" spacing={0.5} fontSize="sm">
              <HStack justify="space-between">
                <Text color="gray.400">Position:</Text>
                <Text color="white">{formatPlanetDegree(planet.longitude)}</Text>
              </HStack>
              {planet.zodiacSign && (
                <HStack justify="space-between">
                  <Text color="gray.400">Sign:</Text>
                  <HStack spacing={1}>
                    <ZodiacIcon
                      sign={planet.zodiacSign.name}
                      size={16}
                      color="white"
                    />
                    <Text color="white">
                      {planet.zodiacSign.name}
                    </Text>
                  </HStack>
                </HStack>
              )}
              <HStack justify="space-between">
                <Text color="gray.400">Speed:</Text>
                <Text color="white">
                  {planet.speed?.toFixed(4) ?? 'N/A'}°/day
                </Text>
              </HStack>
              {planet.distanceAU !== undefined && (
                <HStack justify="space-between">
                  <Text color="gray.400">Distance:</Text>
                  <Text color="white">
                    {planet.distanceAU.toFixed(3)} AU
                  </Text>
                </HStack>
              )}
            </VStack>

            {/* Aspects */}
            {relatedAspects.length > 0 && (
              <>
                <Box borderTop="1px solid" borderColor="whiteAlpha.300" pt={2} mt={1}>
                  <Text fontSize="xs" color="gray.400" mb={1}>
                    Active Aspects:
                  </Text>
                  <VStack align="stretch" spacing={1}>
                    {relatedAspects.map((aspect, i) => {
                      const otherPlanet =
                        aspect.body1.name === planet.name
                          ? aspect.body2
                          : aspect.body1;

                      const aspectColors: Record<string, string> = {
                        conjunction: 'yellow.400',
                        sextile: 'cyan.400',
                        square: 'red.400',
                        trine: 'green.400',
                        opposition: 'pink.400',
                        quincunx: 'purple.400',
                      };

                      return (
                        <HStack key={i} fontSize="xs" spacing={1}>
                          <Text color={aspectColors[aspect.type] || 'gray.400'}>
                            {aspect.type}
                          </Text>
                          <Text color="white">
                            {getPlanetSymbol(otherPlanet.name)} {otherPlanet.name}
                          </Text>
                          <Text color="gray.500">
                            (orb: {aspect.orb.toFixed(1)}°)
                          </Text>
                        </HStack>
                      );
                    })}
                  </VStack>
                </Box>
              </>
            )}

            {/* Sign qualities */}
            {planet.zodiacSign && (
              <Box borderTop="1px solid" borderColor="whiteAlpha.300" pt={2} mt={1}>
                <HStack spacing={2} fontSize="xs">
                  <Badge colorScheme="blue" variant="subtle">
                    {planet.zodiacSign.element}
                  </Badge>
                  <Badge colorScheme="purple" variant="subtle">
                    {planet.zodiacSign.quality}
                  </Badge>
                </HStack>
              </Box>
            )}
          </VStack>
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};
