import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useToast,
  Badge,
} from '@chakra-ui/react';
import Calendar from 'react-calendar';
import { format } from 'date-fns';
import apiService from '../services/api';
import 'react-calendar/dist/Calendar.css';

interface CalendarViewProps {
  selectedChartId: string | null;
}

function CalendarView({ selectedChartId }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [ephemerisData, setEphemerisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchEphemeris = async (date: Date) => {
    if (!selectedChartId) {
      toast({
        title: 'No chart selected',
        description: 'Please select a natal chart first',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.getPlanetPositions(date.toISOString());
      setEphemerisData(response.data.data);
    } catch (error) {
      toast({
        title: 'Error loading ephemeris',
        description: 'Could not load planetary positions',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChartId) {
      fetchEphemeris(selectedDate);
    }
  }, [selectedDate, selectedChartId]);

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="md" mb={4}>
          Calendar View
        </Heading>
        {!selectedChartId && (
          <Text color="orange.500" mb={4}>
            Please select a natal chart from the Natal Charts tab
          </Text>
        )}
      </Box>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Box bg="white" p={6} borderRadius="lg" shadow="md">
          <Calendar
            onChange={(value) => setSelectedDate(value as Date)}
            value={selectedDate}
          />
          <Text mt={4} fontWeight="bold">
            Selected: {format(selectedDate, 'MMMM d, yyyy')}
          </Text>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" shadow="md">
          <Heading size="sm" mb={4}>
            Planetary Positions
          </Heading>

          {loading && (
            <HStack justify="center" py={8}>
              <Spinner />
            </HStack>
          )}

          {!loading && ephemerisData && (
            <VStack align="stretch" spacing={2}>
              {ephemerisData.map((planet: any) => (
                <HStack key={planet.name} justify="space-between" p={2} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">{planet.name}</Text>
                  <HStack>
                    <Badge colorScheme="purple">{planet.sign}</Badge>
                    <Text fontSize="sm">{planet.degree.toFixed(2)}°</Text>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          )}

          {!loading && !ephemerisData && selectedChartId && (
            <Text color="gray.500">No data available</Text>
          )}
        </Box>
      </SimpleGrid>
    </VStack>
  );
}

export default CalendarView;
