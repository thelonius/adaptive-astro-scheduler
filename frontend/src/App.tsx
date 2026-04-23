import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Box, Container, Heading, VStack, HStack, Button } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <Container maxW="container.md" py={20}>
      <VStack spacing={8}>
        <Heading size="2xl">{t('nav.appTitle')}</Heading>
        <Heading size="md" color="gray.600">
          {t('nav.subtitle')}
        </Heading>

        <VStack spacing={4} mt={8} width="100%">
          <Button
            as={Link}
            to="/optimal-timing"
            size="lg"
            colorScheme="orange"
            width="100%"
          >
            ⚡ {t('nav.optimalTiming')}
          </Button>

          <Button
            as={Link}
            to="/scheduler-lab"
            size="lg"
            colorScheme="cyan"
            width="100%"
          >
            🔬 {t('nav.schedulerLab')}
          </Button>

          <Button
            as={Link}
            to="/celestial-events"
            size="lg"
            colorScheme="pink"
            width="100%"
          >
            ✨ {t('nav.celestialEvents')}
          </Button>

          <Button
            as={Link}
            to="/day-explorer"
            size="lg"
            colorScheme="teal"
            width="100%"
          >
            🔮 {t('nav.dayExplorer')}
          </Button>

          <Button
            as={Link}
            to="/chart-library"
            size="lg"
            colorScheme="purple"
            width="100%"
          >
            📚 {t('nav.chartLibrary')}
          </Button>

          <Button
            as={Link}
            to="/natal-chart"
            size="lg"
            colorScheme="green"
            width="100%"
          >
            🌟 {t('nav.natalChart')}
          </Button>

          <Button
            as={Link}
            to="/zodiac-wheel-test"
            size="lg"
            colorScheme="blue"
            width="100%"
          >
            🧪 {t('nav.testPage')}
          </Button>

          <Button
            as={Link}
            to="/zodiac-wheel-demo"
            size="lg"
            colorScheme="purple"
            width="100%"
          >
            🎨 {t('nav.demoPage')}
          </Button>
        </VStack>

        <Box mt={8} p={6} bg="var(--ag-surface)" border="1px solid" borderColor="var(--ag-border)" borderRadius="lg" width="100%">
          <Heading size="sm" mb={3} color="var(--ag-text)">
            {t('nav.quickLinks')}
          </Heading>
          <VStack align="stretch" spacing={2} fontSize="sm">
            <HStack>
              <Box>⚡</Box>
              <Box>
                <strong>{t('nav.quickLinks_optimalTimingLabel')}</strong> {t('nav.quickLinks_optimalTimingDesc')}
              </Box>
            </HStack>
            <HStack>
              <Box>🔮</Box>
              <Box>
                <strong>{t('nav.quickLinks_dayExplorerLabel')}</strong> {t('nav.quickLinks_dayExplorerDesc')}
              </Box>
            </HStack>
            <HStack>
              <Box>📋</Box>
              <Box>
                <strong>{t('nav.quickLinks_testLabel')}</strong> {t('nav.quickLinks_testDesc')}
              </Box>
            </HStack>
            <HStack>
              <Box>🎨</Box>
              <Box>
                <strong>{t('nav.quickLinks_demoLabel')}</strong> {t('nav.quickLinks_demoDesc')}
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
        <Route path="/natal-chart/:id" element={<NatalChart />} />
        <Route path="/zodiac-wheel-test" element={<ZodiacWheelTest />} />
        <Route path="/zodiac-wheel-demo" element={<ZodiacWheelDemo />} />
      </Routes>
    </DynamicThemeProvider>
  );
}

export default App;
