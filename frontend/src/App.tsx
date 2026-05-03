import React, { Suspense, lazy } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Box, Container, Heading, VStack, HStack, Button, Spinner, Center } from '@chakra-ui/react';
import { DynamicThemeProvider } from './theme/DynamicThemeProvider';

// Lazy loaded routes to prevent heavy libraries (like Cesium) from blocking the initial load
const ZodiacWheelTest = lazy(() => import('./pages/ZodiacWheelTest'));
const ZodiacWheelDemo = lazy(() => import('./pages/ZodiacWheelDemo'));
const NatalChart = lazy(() => import('./pages/NatalChart'));
const ChartLibrary = lazy(() => import('./pages/ChartLibrary'));
const DayExplorer = lazy(() => import('./pages/DayExplorer'));
const OptimalTiming = lazy(() => import('./pages/OptimalTiming').then(m => ({ default: m.OptimalTiming })));
const CelestialEvents = lazy(() => import('./pages/CelestialEvents').then(m => ({ default: m.CelestialEvents })));
const SchedulerLab = lazy(() => import('./pages/SchedulerLab').then(m => ({ default: m.SchedulerLab })));

function Home() {
  return (
    <Container maxW="container.md" py={20}>
      <VStack spacing={8}>
        <Heading size="2xl">Adaptive Astro-Scheduler</Heading>
        <Heading size="md" color="gray.600">
          Cosmic Intelligence System
        </Heading>

        <VStack spacing={4} mt={8} width="100%">
          <Button as={Link} to="/optimal-timing" size="lg" colorScheme="orange" width="100%">
            ⚡ Optimal Timing Engine (Find Best Times)
          </Button>

          <Button as={Link} to="/scheduler-lab" size="lg" colorScheme="cyan" width="100%">
            🔬 Scheduler Lab (Advanced Instruments)
          </Button>

          <Button as={Link} to="/celestial-events" size="lg" colorScheme="pink" width="100%">
            ✨ Celestial Events (Eclipses & Alignments)
          </Button>

          <Button as={Link} to="/day-explorer" size="lg" colorScheme="teal" width="100%">
            🔮 Day Explorer (Analyze Any Day)
          </Button>

          <Button as={Link} to="/chart-library" size="lg" colorScheme="purple" width="100%">
            📚 Chart Library (Save & Manage Charts)
          </Button>

          <Button as={Link} to="/natal-chart" size="lg" colorScheme="green" width="100%">
            🌟 Natal Chart (Натальная карта)
          </Button>

          <Button as={Link} to="/zodiac-wheel-test" size="lg" colorScheme="blue" width="100%">
            🧪 Test Page (Full Testing Suite)
          </Button>

          <Button as={Link} to="/zodiac-wheel-demo" size="lg" colorScheme="purple" width="100%">
            🎨 Demo Page (Interactive Demo)
          </Button>
        </VStack>

        <Box mt={8} p={6} bg="var(--ag-surface)" border="1px solid" borderColor="var(--ag-border)" borderRadius="lg" width="100%">
          <Heading size="sm" mb={3} color="var(--ag-text)">Quick Links:</Heading>
          <VStack align="stretch" spacing={2} fontSize="sm">
            <HStack><Box>⚡</Box><Box><strong>Optimal Timing:</strong> Find the perfect cosmic window for your habits, projects, and decisions.</Box></HStack>
            <HStack><Box>🔮</Box><Box><strong>Day Explorer:</strong> Analyze any day, navigate through dates, and save favorites</Box></HStack>
            <HStack><Box>📋</Box><Box><strong>Test Page:</strong> Comprehensive testing with automated tests, manual scenarios, and configuration controls</Box></HStack>
            <HStack><Box>🎨</Box><Box><strong>Demo Page:</strong> Interactive demonstration with live controls and theme switcher</Box></HStack>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}

function App() {
  return (
    <DynamicThemeProvider>
      <Suspense fallback={
        <Center h="100vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Box color="gray.500">Loading modules...</Box>
          </VStack>
        </Center>
      }>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/optimal-timing" element={<OptimalTiming />} />
          <Route path="/scheduler-lab" element={<SchedulerLab />} />
          <Route path="/celestial-events" element={<CelestialEvents />} />
          <Route path="/day-explorer" element={<DayExplorer />} />
          <Route path="/chart-library" element={<ChartLibrary />} />
          <Route path="/natal-chart" element={<NatalChart />} />
          <Route path="/natal-chart/:id" element={<NatalChart />} />
          <Route path="/zodiac-wheel-test" element={<ZodiacWheelTest />} />
          <Route path="/zodiac-wheel-demo" element={<ZodiacWheelDemo />} />
        </Routes>
      </Suspense>
    </DynamicThemeProvider>
  );
}

export default App;
