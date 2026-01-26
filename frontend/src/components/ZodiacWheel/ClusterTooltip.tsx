import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  List,
  ListItem,
  ListIcon,
  Progress,
  Tooltip as ChakraTooltip
} from '@chakra-ui/react';
import {
  StarIcon,
  CheckCircleIcon,
  WarningIcon,
  InfoIcon,
  SunIcon,
  MoonIcon
} from '@chakra-ui/icons';
import type { CelestialBody } from '@adaptive-astro/shared/types';
import { analyzeCluster, getClusterTimingAnalysis } from '../../constants/clusterAnalysis';
import { getPlanetSymbol } from './utils';

interface ClusterTooltipProps {
  planets: CelestialBody[];
  position: { x: number; y: number };
  visible: boolean;
  interactive?: boolean;
  onClose?: () => void;
}

export const ClusterTooltip: React.FC<ClusterTooltipProps> = ({
  planets,
  position,
  visible,
  interactive = false,
  onClose
}) => {
  if (!visible || planets.length < 2) return null;

  const analysis = analyzeCluster(planets);
  const timing = getClusterTimingAnalysis(analysis);

  const getClusterTypeColor = (type: string) => {
    switch (type) {
      case 'tight': return 'red';
      case 'moderate': return 'orange';
      case 'loose': return 'yellow';
      default: return 'gray';
    }
  };

  const getElementColor = (element: string) => {
    switch (element) {
      case 'Fire': return 'red';
      case 'Earth': return 'green';
      case 'Air': return 'blue';
      case 'Water': return 'cyan';
      default: return 'gray';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed',
          left: Math.min(position.x + 20, window.innerWidth - 520),
          top: Math.max(position.y - 300, 20),
          pointerEvents: interactive ? 'auto' : 'none',
          zIndex: interactive ? 20000 : 10000,
        }}
      >
        <Box
          bg="rgba(0, 0, 0, 0.95)"
          borderRadius="lg"
          padding={4}
          border="2px solid"
          borderColor="whiteAlpha.300"
          boxShadow="2xl"
          minW="480px"
          maxW="520px"
          maxH="600px"
          overflowY="auto"
          backdropFilter="blur(10px)"
        >
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <HStack>
                  <Text fontSize="lg" fontWeight="bold" color="white">
                    {analysis.interpretation.title}
                  </Text>
                  <Badge
                    colorScheme={getClusterTypeColor(analysis.clusterType)}
                    variant="solid"
                    fontSize="xs"
                  >
                    {analysis.clusterType.toUpperCase()}
                  </Badge>
                </HStack>
                <HStack spacing={2}>
                  {planets.map((planet, i) => (
                    <HStack key={i} spacing={1}>
                      <Text fontSize="md" color="yellow.300">
                        {getPlanetSymbol(planet.name)}
                      </Text>
                      <Text fontSize="xs" color="gray.300">
                        {planet.name}
                      </Text>
                    </HStack>
                  ))}
                </HStack>
              </VStack>
              <VStack align="end" spacing={1}>
                {interactive && onClose && (
                  <Box
                    as="button"
                    onClick={onClose}
                    color="gray.400"
                    _hover={{ color: 'white' }}
                    fontSize="lg"
                    mb={2}
                  >
                    ✕
                  </Box>
                )}
                <Badge
                  colorScheme={getElementColor(analysis.sign.includes('Aries') || analysis.sign.includes('Leo') || analysis.sign.includes('Sagittarius') ? 'Fire' :
                              analysis.sign.includes('Taurus') || analysis.sign.includes('Virgo') || analysis.sign.includes('Capricorn') ? 'Earth' :
                              analysis.sign.includes('Gemini') || analysis.sign.includes('Libra') || analysis.sign.includes('Aquarius') ? 'Air' : 'Water')}
                  variant="solid"
                >
                  {analysis.sign}
                </Badge>
                <Text fontSize="xs" color="gray.400">
                  {analysis.spread.toFixed(1)}° span
                </Text>
              </VStack>
            </HStack>

            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" color="gray.400">Cluster Strength:</Text>
                <Text fontSize="xs" color="white">{Math.round(analysis.strength * 100)}%</Text>
              </HStack>
              <Progress
                value={analysis.strength * 100}
                colorScheme={analysis.strength > 0.7 ? 'red' : analysis.strength > 0.4 ? 'orange' : 'yellow'}
                size="sm"
                borderRadius="full"
              />
            </Box>

            <Divider borderColor="whiteAlpha.300" />

            <Tabs variant="soft-rounded" colorScheme="purple" size="sm">
              <TabList bg="whiteAlpha.100" p={1} borderRadius="md">
                <Tab _selected={{ bg: 'purple.500', color: 'white' }} fontSize="xs">
                  <InfoIcon mr={1} />
                  Overview
                </Tab>
                <Tab _selected={{ bg: 'purple.500', color: 'white' }} fontSize="xs">
                  <StarIcon mr={1} />
                  Traits
                </Tab>
                <Tab _selected={{ bg: 'purple.500', color: 'white' }} fontSize="xs">
                  <SunIcon mr={1} />
                  Development
                </Tab>
                <Tab _selected={{ bg: 'purple.500', color: 'white' }} fontSize="xs">
                  <MoonIcon mr={1} />
                  Timing
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel p={2}>
                  <VStack align="stretch" spacing={3}>
                    <Text fontSize="sm" color="gray.200" lineHeight="1.4">
                      {analysis.interpretation.description}
                    </Text>

                    <Box>
                      <Text fontSize="xs" color="gray.400" mb={2}>Life Themes:</Text>
                      <HStack spacing={1} flexWrap="wrap">
                        {analysis.themes.slice(0, 6).map((theme, i) => (
                          <Badge
                            key={i}
                            colorScheme="cyan"
                            variant="outline"
                            fontSize="xx-small"
                            size="sm"
                          >
                            {theme}
                          </Badge>
                        ))}
                      </HStack>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="purple.300" mb={1}>
                        ✨ Spiritual Purpose:
                      </Text>
                      <Text fontSize="xs" color="gray.300" lineHeight="1.3">
                        {analysis.interpretation.spiritualMeaning}
                      </Text>
                    </Box>
                  </VStack>
                </TabPanel>

                <TabPanel p={2}>
                  <VStack align="stretch" spacing={3}>
                    <Box>
                      <Text fontSize="xs" color="green.400" mb={2} fontWeight="bold">
                        💎 Gifts & Strengths:
                      </Text>
                      <List spacing={1}>
                        {analysis.gifts.slice(0, 4).map((gift, i) => (
                          <ListItem key={i} fontSize="xs" color="gray.300">
                            <ListIcon as={CheckCircleIcon} color="green.400" />
                            {gift}
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="orange.400" mb={2} fontWeight="bold">
                        ⚠️ Challenges to Master:
                      </Text>
                      <List spacing={1}>
                        {analysis.challenges.slice(0, 3).map((challenge, i) => (
                          <ListItem key={i} fontSize="xs" color="gray.300">
                            <ListIcon as={WarningIcon} color="orange.400" />
                            {challenge}
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="yellow.400" mb={2} fontWeight="bold">
                        🌟 Personality Expression:
                      </Text>
                      <List spacing={1}>
                        {analysis.interpretation.personalityTraits.slice(0, 3).map((trait, i) => (
                          <ListItem key={i} fontSize="xs" color="gray.300">
                            <ListIcon as={StarIcon} color="yellow.400" />
                            {trait}
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </VStack>
                </TabPanel>

                <TabPanel p={2}>
                  <VStack align="stretch" spacing={3}>
                    <Box>
                      <Text fontSize="xs" color="blue.400" mb={2} fontWeight="bold">
                        🎯 Practical Guidance:
                      </Text>
                      <List spacing={1}>
                        {analysis.interpretation.practicalAdvice.slice(0, 4).map((advice, i) => (
                          <ListItem key={i} fontSize="xs" color="gray.300">
                            <ListIcon as={InfoIcon} color="blue.400" />
                            {advice}
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="purple.400" mb={1} fontWeight="bold">
                        🌱 Evolutionary Purpose:
                      </Text>
                      <Text fontSize="xs" color="gray.300" lineHeight="1.3"
                           bg="whiteAlpha.50" p={2} borderRadius="md">
                        {analysis.interpretation.evolutionaryPurpose}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="teal.400" mb={2} fontWeight="bold">
                        🏆 Life Areas of Focus:
                      </Text>
                      <List spacing={1}>
                        {analysis.interpretation.lifeThemes.slice(0, 3).map((theme, i) => (
                          <ListItem key={i} fontSize="xs" color="gray.300">
                            <ListIcon as={CheckCircleIcon} color="teal.400" />
                            {theme}
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </VStack>
                </TabPanel>

                <TabPanel p={2}>
                  <VStack align="stretch" spacing={3}>
                    <Box>
                      <Text fontSize="xs" color="yellow.400" mb={1} fontWeight="bold">
                        📍 Current Phase:
                      </Text>
                      <Text fontSize="xs" color="gray.300"
                           bg="whiteAlpha.50" p={2} borderRadius="md">
                        {timing.currentPhase}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="cyan.400" mb={2} fontWeight="bold">
                        ⚡ Key Activation Periods:
                      </Text>
                      <List spacing={1}>
                        {timing.activationPeriods.map((period, i) => (
                          <ListItem key={i} fontSize="xs" color="gray.300">
                            <ListIcon as={StarIcon} color="cyan.400" />
                            {period}
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="green.400" mb={2} fontWeight="bold">
                        🌊 Development Timeline:
                      </Text>
                      <List spacing={1}>
                        {timing.developmentStages.slice(0, 3).map((stage, i) => (
                          <ListItem key={i} fontSize="xs" color="gray.300">
                            <ListIcon as={InfoIcon} color="green.400" />
                            {stage}
                          </ListItem>
                        ))}
                      </List>
                    </Box>

                    <Box>
                      <Text fontSize="xs" color="orange.400" mb={2} fontWeight="bold">
                        💡 Timing Recommendations:
                      </Text>
                      <List spacing={1}>
                        {timing.recommendations.slice(0, 2).map((rec, i) => (
                          <ListItem key={i} fontSize="xs" color="gray.300">
                            <ListIcon as={CheckCircleIcon} color="orange.400" />
                            {rec}
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>

            <Box borderTop="1px solid" borderColor="whiteAlpha.300" pt={2}>
              <HStack justify="space-between" fontSize="xs" color="gray.500">
                <Text>
                  Stellium Analysis • {planets.length} planets in {analysis.spread.toFixed(1)}°
                </Text>
                <ChakraTooltip label="Cluster strength based on planetary proximity and count">
                  <Text cursor="help">
                    ℹ️ Strength: {Math.round(analysis.strength * 100)}%
                  </Text>
                </ChakraTooltip>
              </HStack>
            </Box>
          </VStack>
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};