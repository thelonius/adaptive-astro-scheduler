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
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DateNavigator, DayAnalysis, FavoriteDays } from '../components/DayExplorer';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { dayService, type CalendarDay } from '../services/dayService';
import { useFavoritesStore } from '../store/favoritesStore';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const DayExplorer: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [dayData, setDayData] = useState<CalendarDay | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { addFavorite, removeFavorite, isFavorite, updateSummary } = useFavoritesStore();
    const toast = useToast();

    const bgColor = useColorModeValue('gray.50', 'gray.900');
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    // Responsive wheel size
    const wheelSize = useBreakpointValue({ base: 320, sm: 380, md: 440, lg: 500 }) || 400;

    console.log('[DayExplorer] Wheel size:', wheelSize);
    console.log('[DayExplorer] Rendering with date:', selectedDate);

    const formatDateForAPI = (date: Date): string => {
        return date.toISOString();
    };

    const formatDateForStore = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const isCurrentDateFavorite = isFavorite(formatDateForStore(selectedDate));

    const fetchDayData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await dayService.getDay(formatDateForAPI(selectedDate));
            setDayData(data);

            // Update summary in favorites if exists
            if (isFavorite(formatDateForStore(selectedDate))) {
                updateSummary(formatDateForStore(selectedDate), {
                    lunarDay: data.lunarDay?.number || 0,
                    moonPhase: data.moonPhase?.phase || 'unknown',
                    quality: data.dayQuality?.overall,
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load day data';
            setError(message);
            console.error('Error fetching day data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate, isFavorite, updateSummary]);

    useEffect(() => {
        fetchDayData();
    }, [fetchDayData]);

    useEffect(() => {
        console.log('[DayExplorer] WheelSize changed:', wheelSize);
    }, [wheelSize]);

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
    };

    const handleToggleFavorite = () => {
        const dateStr = formatDateForStore(selectedDate);

        if (isCurrentDateFavorite) {
            removeFavorite(dateStr);
            toast({
                title: 'Removed from favorites',
                status: 'info',
                duration: 2000,
                isClosable: true,
            });
        } else {
            addFavorite(dateStr, undefined, dayData ? {
                lunarDay: dayData.lunarDay?.number || 0,
                moonPhase: dayData.moonPhase?.phase || 'unknown',
                quality: dayData.dayQuality?.overall,
            } : undefined);
            toast({
                title: 'Added to favorites',
                description: 'This day has been saved',
                status: 'success',
                duration: 2000,
                isClosable: true,
            });
        }
    };

    return (
        <Box bg={bgColor} minH="100vh" py={6}>
            <Container maxW="container.md">
                <VStack spacing={6} align="stretch">
                    {/* Header */}
                    <MotionBox
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <HStack justify="space-between" mb={4}>
                            <Button
                                as={Link}
                                to="/"
                                variant="ghost"
                                leftIcon={<Box>←</Box>}
                                size="sm"
                            >
                                Back
                            </Button>
                            <IconButton
                                aria-label={isCurrentDateFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                icon={<Box fontSize="xl">{isCurrentDateFavorite ? '⭐' : '☆'}</Box>}
                                onClick={handleToggleFavorite}
                                colorScheme={isCurrentDateFavorite ? 'yellow' : 'gray'}
                                variant={isCurrentDateFavorite ? 'solid' : 'outline'}
                                isDisabled={isLoading}
                            />
                        </HStack>

                        <Heading size="xl" textAlign="center" mb={2}>
                            🔮 Day Explorer
                        </Heading>
                    </MotionBox>

                    {/* Date Navigator */}
                    <DateNavigator
                        selectedDate={selectedDate}
                        onDateChange={handleDateChange}
                        isLoading={isLoading}
                    />

                    {/* Zodiac Wheel */}
                    <MotionCard
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        bg={cardBg}
                        borderRadius="xl"
                        border="1px solid"
                        borderColor={borderColor}
                        overflow="hidden"
                    >
                        <CardHeader pb={2}>
                            <Heading size="md">🌟 Planetary Positions</Heading>
                        </CardHeader>
                        <CardBody>
                            <Box display="flex" justifyContent="center">
                                <ZodiacWheel
                                    config={{
                                        size: wheelSize,
                                        showAspects: true,
                                        showHouses: false,
                                        showDegrees: true,
                                        showRetrogrades: true,
                                        aspectOrb: 8,
                                    }}
                                    useAdaptiveRefresh={true}
                                    date={selectedDate}
                                />
                            </Box>
                        </CardBody>
                    </MotionCard>

                    {/* Day Analysis */}
                    <DayAnalysis
                        data={dayData}
                        isLoading={isLoading}
                        error={error}
                        selectedDate={selectedDate}
                    />

                    {/* Favorites Section */}
                    <FavoriteDays
                        onSelectDate={handleDateChange}
                        currentDate={selectedDate}
                    />
                </VStack>
            </Container>
        </Box>
    );
};

export default DayExplorer;

