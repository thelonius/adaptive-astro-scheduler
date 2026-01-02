import { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
} from '@chakra-ui/react';
import CalendarView from './components/CalendarView';
import LayerManager from './components/LayerManager';
import ChartManager from './components/ChartManager';

function App() {
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);

  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Heading size="xl" color="purple.600">
            Adaptive Astro Scheduler
          </Heading>

          <Tabs colorScheme="purple" variant="enclosed">
            <TabList>
              <Tab>Calendar</Tab>
              <Tab>Natal Charts</Tab>
              <Tab>Layers</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <CalendarView selectedChartId={selectedChartId} />
              </TabPanel>

              <TabPanel>
                <ChartManager onSelectChart={setSelectedChartId} />
              </TabPanel>

              <TabPanel>
                <LayerManager />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  );
}

export default App;
