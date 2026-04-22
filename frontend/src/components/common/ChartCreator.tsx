import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  useToast,
  Card,
  CardBody,
  HStack,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { ChartFormData, ChartData } from '../../types/chart';
import { LocationPicker } from '../common/LocationPicker';
import { chartService } from '../../services/chartService';
import { useChartStore } from '../../store/chartStore';

interface ChartCreatorProps {
  onChartCreated?: (chart: ChartData) => void;
  onCancel?: () => void;
  initialData?: Partial<ChartFormData>;
}

export const ChartCreator: React.FC<ChartCreatorProps> = ({
  onChartCreated,
  onCancel,
  initialData
}) => {
  const [formData, setFormData] = useState<ChartFormData>({
    name: initialData?.name || '',
    type: initialData?.type || 'natal',
    date: initialData?.date || new Date(),
    time: initialData?.time || '12:00',
    location: initialData?.location || {
      latitude: 0,
      longitude: 0,
      city: '',
      country: '',
      timezone: 'UTC'
    },
    description: '',
    tags: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const { addChart } = useChartStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const chartData: Omit<ChartData, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        type: formData.type,
        date: formData.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        time: formData.time,
        location: formData.location,
        description: undefined,
        tags: undefined,
      };

      console.log('Saving chart data:', chartData);
      const savedChart = await chartService.saveChart(chartData);
      console.log('Chart saved:', savedChart);
      
      addChart(savedChart);

      toast({
        title: 'Chart Saved',
        description: `"${savedChart.name}" created successfully`,
        status: 'success',
        duration: 3000,
      });

      onChartCreated?.(savedChart);
      
      // Reset form
      setFormData({
        name: '',
        type: 'natal',
        date: new Date(),
        time: '12:00',
        location: {
          latitude: 0,
          longitude: 0,
          city: '',
          country: '',
          timezone: 'UTC'
        },
        description: '',
        tags: []
      });

    } catch (error) {
      console.error('Error creating chart:', error);
      toast({
        title: 'Save Failed',
        description: 'Unable to save chart. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setFormData(prev => ({
        ...prev,
        date: new Date(dateValue)
      }));
    }
  };

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            
            <FormControl isRequired>
              <FormLabel>Chart Name</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Birth Chart"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Chart Type</FormLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
              >
                <option value="natal">Natal Chart</option>
                <option value="event">Event Chart</option>
                <option value="horary">Horary Chart</option>
              </Select>
            </FormControl>

            <HStack spacing={4}>
              <FormControl isRequired flex="1">
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={formatDateForInput(formData.date)}
                  onChange={handleDateChange}
                />
              </FormControl>

              <FormControl isRequired flex="1">
                <FormLabel>Time</FormLabel>
                <VStack spacing={2} align="stretch">
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  />
                  <Wrap spacing={1}>
                    <WrapItem>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setFormData(prev => ({ ...prev, time: '00:00' }))}
                      >
                        Midnight
                      </Button>
                    </WrapItem>
                    <WrapItem>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setFormData(prev => ({ ...prev, time: '06:00' }))}
                      >
                        Dawn
                      </Button>
                    </WrapItem>
                    <WrapItem>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setFormData(prev => ({ ...prev, time: '12:00' }))}
                      >
                        Noon
                      </Button>
                    </WrapItem>
                    <WrapItem>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setFormData(prev => ({ ...prev, time: '18:00' }))}
                      >
                        Evening
                      </Button>
                    </WrapItem>
                    <WrapItem>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          const now = new Date();
                          const hours = now.getHours().toString().padStart(2, '0');
                          const minutes = now.getMinutes().toString().padStart(2, '0');
                          setFormData(prev => ({ ...prev, time: `${hours}:${minutes}` }));
                        }}
                      >
                        Now
                      </Button>
                    </WrapItem>
                  </Wrap>
                </VStack>
              </FormControl>
            </HStack>

            <LocationPicker
              value={formData.location}
              onChange={(location) => setFormData(prev => ({ ...prev, location }))}
            />

            {formData.location.city && (
              <Box p={3} bg="green.50" borderRadius="md">
                <Text fontSize="sm" color="green.700">
                  📍 {formData.location.city}
                  {formData.location.country && `, ${formData.location.country}`}
                </Text>
              </Box>
            )}

            <HStack spacing={3} pt={4}>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isSubmitting}
                loadingText="Saving..."
                size="lg"
                flex="1"
              >
                Save Chart
              </Button>
              
              {onCancel && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                  size="lg"
                  flex="1"
                >
                  Cancel
                </Button>
              )}
            </HStack>
          </VStack>
        </form>
      </CardBody>
    </Card>
  );
};