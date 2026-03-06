import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Box, Container, Heading, VStack, HStack, Button } from '@chakra-ui/react';
import ZodiacWheelTest from './pages/ZodiacWheelTest';
import ZodiacWheelDemo from './pages/ZodiacWheelDemo';
import NatalChart from './pages/NatalChart';
import ChartLibrary from './pages/ChartLibrary';
import DayExplorer from './pages/DayExplorer';
import { OptimalTiming } from './pages/OptimalTiming';
import { CelestialEvents } from './pages/CelestialEvents';
import { SchedulerLab } from './pages/SchedulerLab';
import { DynamicThemeProvider } from './theme/DynamicThemeProvider';


function Home() {
  // We'll use the existing chakra-ui components imported at the top
  // No need to redeclare Link, etc since they are imported

  return (
    <Container maxW="container.md" py={20}>
      <VStack spacing={8}>
        <Heading size="2xl">Adaptive Astro-Scheduler</Heading>
        <Heading size="md" color="gray.600">
          Cosmic Intelligence System
        </Heading>

        <VStack spacing={4} mt={8} width="100%">
          <Button
            as={Link}
            to="/optimal-timing"
            size="lg"
            colorScheme="orange"
            width="100%"
          >
            ⚡ Optimal Timing Engine (Find Best Times)
          </Button>

          <Button
            as={Link}
            to="/scheduler-lab"
            size="lg"
            colorScheme="cyan"
            width="100%"
          >
            🔬 Scheduler Lab (Advanced Instruments)
          </Button>

          <Button
            as={Link}
            to="/celestial-events"
            size="lg"
            colorScheme="pink"
            width="100%"
          >
            ✨ Celestial Events (Eclipses & Alignments)
          </Button>

          <Button
            as={Link}
            to="/day-explorer"
            size="lg"
            colorScheme="teal"
            width="100%"
          >
            🔮 Day Explorer (Analyze Any Day)
          </Button>

          <Button
            as={Link}
            to="/chart-library"
            size="lg"
            colorScheme="purple"
            width="100%"
          >
            📚 Chart Library (Save & Manage Charts)
          </Button>

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

        <Box mt={8} p={6} bg="var(--ag-surface)" border="1px solid" borderColor="var(--ag-border)" borderRadius="lg" width="100%">
          <Heading size="sm" mb={3} color="var(--ag-text)">
            Quick Links:
          </Heading>
          <VStack align="stretch" spacing={2} fontSize="sm">
            <HStack>
              <Box>⚡</Box>
              <Box>
                <strong>Optimal Timing:</strong> Find the perfect cosmic window for your habits,
                projects, and decisions.
              </Box>
            </HStack>
            <HStack>
              <Box>🔮</Box>
              <Box>
                <strong>Day Explorer:</strong> Analyze any day, navigate through dates,
                and save favorites
              </Box>
            </HStack>
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
    <DynamicThemeProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/optimal-timing" element={<OptimalTiming />} />
        <Route path="/scheduler-lab" element={<SchedulerLab />} />
        <Route path="/celestial-events" element={<CelestialEvents />} />
        <Route path="/day-explorer" element={<DayExplorer />} />
        <Route path="/chart-library" element={<ChartLibrary />} />
        <Route path="/natal-chart" element={<NatalChart />} />
        <Route path="/zodiac-wheel-test" element={<ZodiacWheelTest />} />
        <Route path="/zodiac-wheel-demo" element={<ZodiacWheelDemo />} />
      </Routes>
    </DynamicThemeProvider>
  );
}

export default App;
