import { Routes, Route, Link } from 'react-router-dom';
import { Box, Container, Heading, Text, SimpleGrid, VStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import ZodiacWheelTest from './pages/ZodiacWheelTest';
import ZodiacWheelDemo from './pages/ZodiacWheelDemo';
import NatalChart from './pages/NatalChart';
import ChartLibrary from './pages/ChartLibrary';
import DayExplorer from './pages/DayExplorer';
import { OptimalTiming } from './pages/OptimalTiming';
import OptimalTimingV2 from './pages/OptimalTimingV2';
import { CelestialEvents } from './pages/CelestialEvents';
import { SchedulerLab } from './pages/SchedulerLab';
import { DynamicThemeProvider } from './theme/DynamicThemeProvider';
import { Shell } from './shell/Shell';

// Полный список разделов живёт в сайдбаре; на главной только три входа,
// с которых реально начинают.
const ENTRY_POINTS = [
  {
    to: '/day-explorer',
    icon: '🔮',
    key: 'nav.short.dayExplorer',
    fallback: 'Проводник по дню',
    hintKey: 'nav.homeHint.dayExplorer',
    hint: 'Что сегодня в небе и что с этим делать',
  },
  {
    to: '/natal-chart',
    icon: '🌟',
    key: 'nav.short.natalChart',
    fallback: 'Натальная карта',
    hintKey: 'nav.homeHint.natalChart',
    hint: 'Построить карту и разобрать по факторам',
  },
  {
    to: '/optimal-timing',
    icon: '⚡',
    key: 'nav.short.optimalTiming',
    fallback: 'Оптимальное время',
    hintKey: 'nav.homeHint.optimalTiming',
    hint: 'Подобрать день под задачу',
  },
];

function Home() {
  const { t } = useTranslation();

  return (
    <Container maxW="container.md" py={12}>
      <VStack spacing={3} align="stretch" mb={10}>
        <Heading size="xl" color="var(--ag-text)">
          {t('nav.appTitle', 'Adaptive Astro')}
        </Heading>
        <Text color="var(--ag-text-muted)">{t('nav.subtitle', 'Планировщик по небу')}</Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        {ENTRY_POINTS.map((e) => (
          <Box
            key={e.to}
            as={Link}
            to={e.to}
            p={5}
            bg="var(--ag-surface)"
            border="1px solid"
            borderColor="var(--ag-border)"
            borderRadius="lg"
            transition="border-color .15s, transform .15s"
            _hover={{ borderColor: 'var(--ag-day-primary)', transform: 'translateY(-2px)' }}
          >
            <Text fontSize="2xl" mb={2}>
              {e.icon}
            </Text>
            <Heading size="sm" mb={1} color="var(--ag-text)">
              {t(e.key, e.fallback)}
            </Heading>
            <Text fontSize="sm" color="var(--ag-text-muted)">
              {t(e.hintKey, e.hint)}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Container>
  );
}

function App() {
  return (
    <DynamicThemeProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/optimal-timing" element={<OptimalTiming />} />
          <Route path="/optimal-timing-v2" element={<OptimalTimingV2 />} />
          <Route path="/scheduler-lab" element={<SchedulerLab />} />
          <Route path="/celestial-events" element={<CelestialEvents />} />
          <Route path="/day-explorer" element={<DayExplorer />} />
          <Route path="/chart-library" element={<ChartLibrary />} />
          <Route path="/natal-chart" element={<NatalChart />} />
          <Route path="/natal-chart/:id" element={<NatalChart />} />
          <Route path="/zodiac-wheel-test" element={<ZodiacWheelTest />} />
          <Route path="/zodiac-wheel-demo" element={<ZodiacWheelDemo />} />
        </Route>
      </Routes>
    </DynamicThemeProvider>
  );
}

export default App;
