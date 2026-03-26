import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Container,
    Heading,
    VStack,
    HStack,
    Button,
    IconButton,
    useColorModeValue,
    useToast,
    useBreakpointValue,
    Card,
    CardBody,
    CardHeader,
    Text,
    Flex,
    Switch,
    FormControl,
    FormLabel,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { DateNavigator, DayAnalysis, FavoriteDays, DispositorChains } from '../components/DayExplorer';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { dayService, type CalendarDay } from '../services/dayService';
import { useFavoritesStore } from '../store/favoritesStore';
import { useDynamicTheme } from '../theme/DynamicThemeProvider';
import { LocationBar } from '../components/common/LocationBar';
import { useLocationStore } from '../store/locationStore';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

import { useSearchParams } from 'react-router-dom';

const DayExplorer: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Initialize state from URL or default to now
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const dateParam = searchParams.get('date');
        return dateParam ? new Date(dateParam) : new Date();
    });

    const [dayData, setDayData] = useState<CalendarDay | null>(null);
    const { applyNatalDayTheme } = useDynamicTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const toast = useToast();

    // Геолокация пользователя из глобального store
    const { location: userLocation } = useLocationStore();

    const [showAspects, setShowAspects] = useState(false);
    const [showHouses, setShowHouses] = useState(true);
    const [showRetrogrades, setShowRetrogrades] = useState(true);

    // Update URL when selectedDate changes
    useEffect(() => {
        // Only update URL if it's actually different (toISOString can vary by ms, but here we care about the main date)
        const currentUrlDate = searchParams.get('date');
        const isoString = selectedDate.toISOString();
        if (currentUrlDate !== isoString && currentUrlDate !== null) {
            setSearchParams({ date: isoString }, { replace: true });
        } else if (currentUrlDate === null) {
            // Only set if not preset, but don't force re-render if it's already basically same
            setSearchParams({ date: isoString }, { replace: true });
        }
    }, [selectedDate, setSearchParams]);

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        toast({
            title: "Link copied!",
            description: "Time and date configuration saved to clipboard.",
            status: "success",
            duration: 2000,
            isClosable: true,
        });
    };

    const fetchDayData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await dayService.getDay(
                selectedDate.toISOString(),
                { latitude: userLocation.latitude, longitude: userLocation.longitude },
                userLocation.timezone
            );
            setDayData(data);

            if (data.lunarDay) {
                applyNatalDayTheme(selectedDate, null, null, data.lunarDay);
            }
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Failed to load day data';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate, applyNatalDayTheme, userLocation]);

    useEffect(() => {
        fetchDayData();
    }, [fetchDayData]);

    const handleDateChange = (date: Date) => {
        const newDate = new Date(date);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        setSelectedDate(newDate);
    };

    const handleTimeChange = (time: Date) => {
        setSelectedDate(time);
    };

    return (
        <Box bg="var(--ag-bg)" minH="100vh" py={6} transition="background-color var(--ag-transition-slow)">
            <Container maxW="1400px">
                <VStack spacing={8}>
                    {/* Header */}
                    <VStack spacing={3}>
                        <Heading size="xl">🔮 Day Explorer</Heading>
                        <HStack spacing={3} wrap="wrap" justify="center">
                            <LocationBar />
                            <Button
                                size="sm"
                                variant="ghost"
                                colorScheme="purple"
                                onClick={handleCopyLink}
                                leftIcon={<span>🔗</span>}
                            >
                                Share Configuration
                            </Button>
                        </HStack>
                        {userLocation.city && (
                            <Text fontSize="xs" color="gray.500">
                                Calculations for {userLocation.city}, {userLocation.country}
                                &nbsp;({userLocation.latitude.toFixed(2)}°N, {userLocation.longitude.toFixed(2)}°E)
                            </Text>
                        )}
                    </VStack>

                    {/* Digital Time Picker (on top of Date) */}
                    <Box
                        p={6}
                        bg="var(--ag-surface)"
                        border="1px solid"
                        borderColor="var(--ag-border)"
                        borderRadius="xl"
                        boxShadow="var(--ag-shadow-sm)"
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        width="100%"
                        maxW="md"
                    >
                        <Text fontSize="sm" color="gray.500" mb={2} fontWeight="medium" letterSpacing="wide">LOCAL TIME</Text>

                        <HStack spacing={4} align="center">
                            <Button
                                onClick={() => {
                                    const newDate = new Date(selectedDate);
                                    newDate.setMinutes(newDate.getMinutes() - 15);
                                    handleTimeChange(newDate);
                                }}
                                size="lg"
                                fontSize="2xl"
                                borderRadius="full"
                                variant="ghost"
                                aria-label="Decrease time"
                            >
                                -
                            </Button>

                            <Box position="relative" cursor="pointer" _hover={{ transform: 'scale(1.05)' }} transition="transform 0.2s">
                                <Text fontSize="5xl" fontWeight="bold" fontFamily="monospace" color="purple.600" lineHeight={1}>
                                    {selectedDate.getHours().toString().padStart(2, '0')}:{selectedDate.getMinutes().toString().padStart(2, '0')}
                                </Text>
                                <input
                                    type="time"
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        opacity: 0,
                                        cursor: 'pointer',
                                        zIndex: 10
                                    }}
                                    value={`${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`}
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        const [h, m] = e.target.value.split(':');
                                        const newDate = new Date(selectedDate);
                                        newDate.setHours(parseInt(h), parseInt(m));
                                        handleTimeChange(newDate);
                                    }}
                                />
                            </Box>

                            <Button
                                onClick={() => {
                                    const newDate = new Date(selectedDate);
                                    newDate.setMinutes(newDate.getMinutes() + 15);
                                    handleTimeChange(newDate);
                                }}
                                size="lg"
                                fontSize="2xl"
                                borderRadius="full"
                                variant="ghost"
                                aria-label="Increase time"
                            >
                                +
                            </Button>
                        </HStack>
                    </Box>

                    {/* Chart Settings Control Panel */}
                    <Box
                        bg="var(--ag-surface)"
                        border="1px solid"
                        borderColor="var(--ag-border)"
                        p={4}
                        borderRadius="xl"
                        boxShadow="var(--ag-shadow-sm)"
                        width="100%"
                        maxW="md"
                    >
                        <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={3} textAlign="center">
                            CHART SETTINGS
                        </Text>
                        <HStack justify="space-between" spacing={4}>
                            <FormControl display="flex" alignItems="center" width="auto">
                                <FormLabel htmlFor="aspects-switch" mb="0" fontSize="sm">
                                    Aspects
                                </FormLabel>
                                <Switch
                                    id="aspects-switch"
                                    isChecked={showAspects}
                                    onChange={() => setShowAspects(!showAspects)}
                                    size="sm"
                                    colorScheme="purple"
                                />
                            </FormControl>

                            <FormControl display="flex" alignItems="center" width="auto">
                                <FormLabel htmlFor="houses-switch" mb="0" fontSize="sm">
                                    Houses
                                </FormLabel>
                                <Switch
                                    id="houses-switch"
                                    isChecked={showHouses}
                                    onChange={() => setShowHouses(!showHouses)}
                                    size="sm"
                                    colorScheme="purple"
                                />
                            </FormControl>

                            <FormControl display="flex" alignItems="center" width="auto">
                                <FormLabel htmlFor="retro-switch" mb="0" fontSize="sm">
                                    Retrogrades
                                </FormLabel>
                                <Switch
                                    id="retro-switch"
                                    isChecked={showRetrogrades}
                                    onChange={() => setShowRetrogrades(!showRetrogrades)}
                                    size="sm"
                                    colorScheme="purple"
                                />
                            </FormControl>
                        </HStack>
                    </Box>

                    {/* Date Navigator */}
                    <DateNavigator
                        selectedDate={selectedDate}
                        onDateChange={handleDateChange}
                        isLoading={isLoading}
                    />

                    {/* Main Content Grid */}
                    <Box
                        display="grid"
                        gridTemplateColumns={{ base: "1fr", lg: "1.5fr 1fr" }}
                        gap={8}
                        width="100%"
                    >
                        {/* Left: Planetary Positions (Zodiac Wheel) */}
                        <MotionCard
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <CardHeader>
                                <Heading size="md">✨ Planetary Positions</Heading>
                            </CardHeader>
                            <CardBody display="flex" justifyContent="center">
                                <ZodiacWheel
                                    date={selectedDate}
                                    data={dayData ? {
                                        planets: Object.values(dayData.transits || {}),
                                        aspects: dayData.aspects || [],
                                        houses: dayData.houses || [],
                                        voidMoon: dayData.voidOfCourseMoon ? {
                                            isVoid: true, // If it exists, it's void
                                            voidStart: dayData.voidOfCourseMoon.startTime?.date?.toString(),
                                            voidEnd: dayData.voidOfCourseMoon.endTime?.date?.toString()
                                        } : { isVoid: false },
                                        planetaryHours: dayData.planetaryHours || [],
                                        timestamp: selectedDate
                                    } as any : null}
                                    config={{
                                        size: 800,
                                        showHouses: showHouses,
                                        showAspects: showAspects, // Controlled by state
                                        showRetrogrades: showRetrogrades
                                    }}
                                />
                            </CardBody>
                        </MotionCard>

                        {/* Right: Analysis */}
                        <VStack spacing={6} align="stretch">
                            <DayAnalysis
                                data={dayData}
                                isLoading={isLoading}
                                error={error}
                                selectedDate={selectedDate}
                            />
                            <DispositorChains date={selectedDate} />
                            <FavoriteDays
                                currentDate={selectedDate}
                                onSelectDate={handleDateChange}
                            />
                        </VStack>
                    </Box>
                </VStack>
            </Container>
        </Box>
    );
};

export default DayExplorer;

