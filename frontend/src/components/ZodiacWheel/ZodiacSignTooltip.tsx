import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Text, VStack, HStack, Badge, Wrap, WrapItem } from '@chakra-ui/react';
import ZodiacIcon from './ZodiacIcon';
import { getDetailedZodiacInfo, type DetailedZodiacInfo } from './zodiacData';

interface ZodiacSignTooltipProps {
  signName: string;
  position: { x: number; y: number };
  isVisible: boolean;
}

export const ZodiacSignTooltip: React.FC<ZodiacSignTooltipProps> = ({
  signName,
  position,
  isVisible
}) => {
  const zodiacInfo = getDetailedZodiacInfo(signName);

  if (!isVisible || !zodiacInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          left: position.x + 20,
          top: position.y - 20,
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        <Box
          bg="rgba(0, 0, 0, 0.95)"
          borderRadius="lg"
          padding={4}
          border="2px solid"
          borderColor="whiteAlpha.300"
          boxShadow="xl"
          minW="320px"
          maxW="400px"
        >
          <VStack align="stretch" spacing={3}>
            {/* Header */}
            <HStack justify="space-between" align="center">
              <HStack spacing={3}>
                <ZodiacIcon
                  sign={signName}
                  size={32}
                  color="white"
                />
                <VStack align="start" spacing={0}>
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {zodiacInfo.englishName}
                  </Text>
                  <Text fontSize="sm" color="gray.300">
                    {zodiacInfo.name} {zodiacInfo.symbol}
                  </Text>
                </VStack>
              </HStack>
              <VStack align="end" spacing={0}>
                <Text fontSize="xs" color="gray.400">
                  {zodiacInfo.dates}
                </Text>
              </VStack>
            </HStack>

            {/* Description */}
            <Box>
              <Text fontSize="sm" color="gray.200" lineHeight="1.4">
                {zodiacInfo.description}
              </Text>
            </Box>

            {/* Core Properties */}
            <HStack justify="space-around" spacing={2}>
              <VStack spacing={1} align="center">
                <Text fontSize="xs" color="gray.400" fontWeight="bold">
                  ELEMENT
                </Text>
                <Badge
                  colorScheme={
                    zodiacInfo.element === 'Fire' ? 'red' :
                    zodiacInfo.element === 'Earth' ? 'green' :
                    zodiacInfo.element === 'Air' ? 'yellow' : 'blue'
                  }
                  variant="solid"
                  fontSize="xs"
                >
                  {zodiacInfo.element}
                </Badge>
              </VStack>

              <VStack spacing={1} align="center">
                <Text fontSize="xs" color="gray.400" fontWeight="bold">
                  QUALITY
                </Text>
                <Badge
                  colorScheme="purple"
                  variant="solid"
                  fontSize="xs"
                >
                  {zodiacInfo.quality}
                </Badge>
              </VStack>

              <VStack spacing={1} align="center">
                <Text fontSize="xs" color="gray.400" fontWeight="bold">
                  RULER
                </Text>
                <Badge
                  colorScheme="orange"
                  variant="solid"
                  fontSize="xs"
                >
                  {zodiacInfo.rulingPlanet}
                </Badge>
              </VStack>
            </HStack>

            {/* Keywords */}
            <Box>
              <Text fontSize="xs" color="gray.400" fontWeight="bold" mb={2}>
                KEY THEMES
              </Text>
              <Wrap spacing={1}>
                {zodiacInfo.keywords.map((keyword, i) => (
                  <WrapItem key={i}>
                    <Badge
                      size="sm"
                      variant="outline"
                      colorScheme="cyan"
                      fontSize="xs"
                    >
                      {keyword}
                    </Badge>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>

            {/* Traits */}
            <HStack align="start" spacing={4}>
              <VStack align="stretch" spacing={1} flex={1}>
                <Text fontSize="xs" color="green.300" fontWeight="bold">
                  STRENGTHS
                </Text>
                {zodiacInfo.traits.positive.slice(0, 3).map((trait, i) => (
                  <Text key={i} fontSize="xs" color="green.200">
                    • {trait}
                  </Text>
                ))}
              </VStack>

              <VStack align="stretch" spacing={1} flex={1}>
                <Text fontSize="xs" color="orange.300" fontWeight="bold">
                  CHALLENGES
                </Text>
                {zodiacInfo.traits.challenging.slice(0, 3).map((trait, i) => (
                  <Text key={i} fontSize="xs" color="orange.200">
                    • {trait}
                  </Text>
                ))}
              </VStack>
            </HStack>

            {/* Additional Info */}
            <HStack justify="space-between" fontSize="xs">
              <VStack align="start" spacing={0}>
                <Text color="gray.400" fontWeight="bold">Body Parts:</Text>
                <Text color="gray.300">
                  {zodiacInfo.bodyParts.join(', ')}
                </Text>
              </VStack>

              <VStack align="end" spacing={0}>
                <Text color="gray.400" fontWeight="bold">Colors:</Text>
                <Text color="gray.300">
                  {zodiacInfo.colors.join(', ')}
                </Text>
              </VStack>
            </HStack>

            {/* Modern ruler note if different */}
            {zodiacInfo.modernRuler && (
              <Text fontSize="xs" color="gray.500" fontStyle="italic">
                {zodiacInfo.modernRuler}
              </Text>
            )}
          </VStack>
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};