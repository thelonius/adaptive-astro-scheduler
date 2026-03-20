import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Text,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import type { NatalChartInput } from '../../hooks/useNatalChart';
import { LocationPicker } from '../common/LocationPicker';

interface BirthDataFormProps {
  onCalculate: (input: NatalChartInput) => void;
  loading?: boolean;
}

// Common timezones for quick selection
const COMMON_TIMEZONES = [
  { label: 'Europe/Moscow', value: 'Europe/Moscow' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'Europe/Paris', value: 'Europe/Paris' },
  { label: 'America/New_York', value: 'America/New_York' },
  { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
  { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
  { label: 'Asia/Dubai', value: 'Asia/Dubai' },
  { label: 'Australia/Sydney', value: 'Australia/Sydney' },
  { label: 'UTC', value: 'UTC' },
];
export const BirthDataForm: React.FC<BirthDataFormProps> = ({ onCalculate, loading = false }) => {
  const [birthDate, setBirthDate] = useState('');
  const [birthHour, setBirthHour] = useState(12);
  const [birthMinute, setBirthMinute] = useState(0);
  const [birthSecond, setBirthSecond] = useState(0);
  const [location, setLocation] = useState({
    latitude: 55.7558,
    longitude: 37.6173,
    city: 'Moscow',
    country: 'Russia',
    timezone: 'Europe/Moscow'
  });

  // Format time as HH:MM:SS
  const birthTime = `${String(birthHour).padStart(2, '0')}:${String(birthMinute).padStart(2, '0')}:${String(birthSecond).padStart(2, '0')}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!birthDate || !birthTime) {
      return;
    }

    onCalculate({
      birthDate,
      birthTime,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    });
  };

  const loadSampleData = () => {
    // Example: Yuri Gagarin - April 12, 1961, 09:07:00, Klushino
    setBirthDate('1961-04-12');
    setBirthHour(9);
    setBirthMinute(7);
    setBirthSecond(0);
    setLocation({
      latitude: 57.0,
      longitude: 34.5,
      city: 'Klushino',
      country: 'Russia',
      timezone: 'Europe/Moscow'
    });
  };

  return (
    <Card>
      <CardHeader>
        <HStack justify="space-between">
          <Heading size="md">Данные рождения</Heading>
          <Button size="sm" variant="ghost" onClick={loadSampleData}>
            Загрузить пример
          </Button>
        </HStack>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                Введите точные данные рождения для расчета натальной карты
              </AlertDescription>
            </Alert>

            {/* Birth Date */}
            <FormControl isRequired>
              <FormLabel fontSize="sm">Дата рождения</FormLabel>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Формат: ГГГГ-ММ-ДД
              </Text>
            </FormControl>

            {/* Birth Time */}
            <FormControl isRequired>
              <FormLabel fontSize="sm">Время рождения</FormLabel>
              <HStack spacing={3}>
                <VStack spacing={1} flex={1}>
                  <Select
                    value={birthHour}
                    onChange={(e) => setBirthHour(parseInt(e.target.value))}
                    size="md"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}
                      </option>
                    ))}
                  </Select>
                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    Часы
                  </Text>
                </VStack>
                <Text fontSize="2xl" color="gray.400" mt={-4}>:</Text>
                <VStack spacing={1} flex={1}>
                  <Select
                    value={birthMinute}
                    onChange={(e) => setBirthMinute(parseInt(e.target.value))}
                    size="md"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}
                      </option>
                    ))}
                  </Select>
                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    Минуты
                  </Text>
                </VStack>
                <Text fontSize="2xl" color="gray.400" mt={-4}>:</Text>
                <VStack spacing={1} flex={1}>
                  <Select
                    value={birthSecond}
                    onChange={(e) => setBirthSecond(parseInt(e.target.value))}
                    size="md"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}
                      </option>
                    ))}
                  </Select>
                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    Секунды
                  </Text>
                </VStack>
              </HStack>
              <Text fontSize="xs" color="gray.500" mt={2} fontWeight="medium">
                ⏰ Выбранное время: {birthTime}
              </Text>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Точное время важно для расчета домов и асцендента
              </Text>
            </FormControl>

            {/* Location with embedded Timezone */}
            <LocationPicker
              value={location}
              onChange={(newLoc) => setLocation(newLoc)}
            />

            {location.city && (
              <Box p={3} bg="green.50" borderRadius="md">
                <Text fontSize="sm" color="green.700">
                  📍 {location.city} ({location.timezone})
                </Text>
              </Box>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              isLoading={loading}
              loadingText="Расчет..."
              isDisabled={!birthDate || !birthTime}
            >
              Рассчитать натальную карту
            </Button>
          </VStack>
        </form>
      </CardBody>
    </Card>
  );
};
