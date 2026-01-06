import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Box, Container, Heading, VStack, HStack, Button } from '@chakra-ui/react';
import ZodiacWheelTest from './pages/ZodiacWheelTest';
import ZodiacWheelDemo from './pages/ZodiacWheelDemo';
import NatalChart from './pages/NatalChart';

function Home() {
  return (
    <Container maxW="container.md" py={20}>
      <VStack spacing={8}>
        <Heading size="2xl">Adaptive Astro-Scheduler</Heading>
        <Heading size="md" color="gray.600">
          Zodiac Wheel Component
        </Heading>

        <VStack spacing={4} mt={8} width="100%">
          <Button
            as={Link}
            to="/natal-chart"
            size="lg"
            colorScheme="green"
            width="100%"
          >
            🌟 Natal Chart (Натальная карта)
          </Button>

          <Button
            as={Link}
            to="/zodiac-wheel-test"
            size="lg"
            colorScheme="blue"
            width="100%"
          >
            🧪 Test Page (Full Testing Suite)
          </Button>

          <Button
            as={Link}
            to="/zodiac-wheel-demo"
            size="lg"
            colorScheme="purple"
            width="100%"
          >
            🎨 Demo Page (Interactive Demo)
          </Button>
        </VStack>

        <Box mt={8} p={6} bg="gray.50" borderRadius="lg" width="100%">
          <Heading size="sm" mb={3}>
            Quick Links:
          </Heading>
          <VStack align="stretch" spacing={2} fontSize="sm">
            <HStack>
              <Box>📋</Box>
              <Box>
                <strong>Test Page:</strong> Comprehensive testing with automated tests, manual
                scenarios, and configuration controls
              </Box>
            </HStack>
            <HStack>
              <Box>🎨</Box>
              <Box>
                <strong>Demo Page:</strong> Interactive demonstration with live controls and
                theme switcher
              </Box>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/natal-chart" element={<NatalChart />} />
      <Route path="/zodiac-wheel-test" element={<ZodiacWheelTest />} />
      <Route path="/zodiac-wheel-demo" element={<ZodiacWheelDemo />} />
    </Routes>
  );
}

export default App;
