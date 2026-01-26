import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Text, VStack, HStack, Badge, Divider } from '@chakra-ui/react';
import { HouseMeaning } from '../../constants/houses';

interface HouseTooltipProps {
  house: HouseMeaning | null;
  houseNumber: number;
  position: { x: number; y: number };
  visible: boolean;
}

export const HouseTooltip: React.FC<HouseTooltipProps> = ({
  house,
  houseNumber,
  position,
  visible
}) => {
  if (!visible || !house) return null;

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
          minW="250px"
          maxW="300px"
        >
          <VStack align="stretch" spacing={2}>
            {/* House header */}
            <HStack justify="space-between" align="center">
              <HStack>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  {houseNumber}
                </Text>
                <Text fontSize="md" fontWeight="bold" color="white">
                  {house.title}
                </Text>
              </HStack>
              <Badge
                colorScheme={
                  [1, 4, 7, 10].includes(houseNumber) ? 'gold' :
                  [2, 5, 8, 11].includes(houseNumber) ? 'blue' :
                  'green'
                }
                variant="subtle"
                fontSize="xs"
              >
                {[1, 4, 7, 10].includes(houseNumber) ? 'Angular' :
                 [2, 5, 8, 11].includes(houseNumber) ? 'Succedent' :
                 'Cadent'}
              </Badge>
            </HStack>

            <Divider borderColor="whiteAlpha.300" />

            {/* Description */}
            <Text fontSize="sm" color="gray.200" lineHeight="1.4">
              {house.description}
            </Text>

            {/* Keywords */}
            <Box>
              <Text fontSize="xs" color="gray.400" mb={1}>
                Key Themes:
              </Text>
              <HStack spacing={1} flexWrap="wrap">
                {house.keywords.map((keyword, i) => (
                  <Badge
                    key={i}
                    colorScheme="purple"
                    variant="subtle"
                    fontSize="xs"
                    size="sm"
                  >
                    {keyword}
                  </Badge>
                ))}
              </HStack>
            </Box>

            {/* Life Areas */}
            {house.themes.length > 0 && (
              <Box borderTop="1px solid" borderColor="whiteAlpha.300" pt={2}>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Life Areas:
                </Text>
                <Text fontSize="xs" color="gray.300" lineHeight="1.3">
                  {house.themes.join(" • ")}
                </Text>
              </Box>
            )}

            {/* Special house meanings */}
            {houseNumber === 1 && (
              <Box borderTop="1px solid" borderColor="whiteAlpha.300" pt={1}>
                <Text fontSize="xs" color="yellow.300">
                  ✨ Ascendant: Your rising sign and outer personality
                </Text>
              </Box>
            )}
            {houseNumber === 4 && (
              <Box borderTop="1px solid" borderColor="whiteAlpha.300" pt={1}>
                <Text fontSize="xs" color="blue.300">
                  🏠 IC (Imum Coeli): Your emotional foundation
                </Text>
              </Box>
            )}
            {houseNumber === 7 && (
              <Box borderTop="1px solid" borderColor="whiteAlpha.300" pt={1}>
                <Text fontSize="xs" color="pink.300">
                  💕 Descendant: How you relate to others
                </Text>
              </Box>
            )}
            {houseNumber === 10 && (
              <Box borderTop="1px solid" borderColor="whiteAlpha.300" pt={1}>
                <Text fontSize="xs" color="green.300">
                  🎯 Midheaven (MC): Your public image and career
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};