import React from 'react';
import {
    HStack,
    IconButton,
    Input,
    Button,
    Text,
    Box,
    useColorModeValue,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface DateNavigatorProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    isLoading?: boolean;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
    selectedDate,
    onDateChange,
    isLoading = false,
}) => {
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    const goToPreviousDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        onDateChange(newDate);
    };

    const goToNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        onDateChange(newDate);
    };

    const goToToday = () => {
        onDateChange(new Date());
    };

    const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            onDateChange(newDate);
        }
    };

    const formatDateForInput = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const formatDateDisplay = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const isToday = (date: Date): boolean => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    return (
        <MotionBox
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            bg={bgColor}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            p={4}
            boxShadow="sm"
        >
            <HStack spacing={4} justify="center" wrap="wrap">
                {/* Previous Day Button */}
                <IconButton
                    aria-label="Previous day"
                    icon={<Text fontSize="xl">←</Text>}
                    onClick={goToPreviousDay}
                    isDisabled={isLoading}
                    variant="ghost"
                    size="lg"
                    _hover={{ bg: 'purple.50', transform: 'scale(1.1)' }}
                    transition="all 0.2s"
                />

                {/* Date Display & Picker */}
                <Box textAlign="center">
                    <Text
                        fontSize="xl"
                        fontWeight="bold"
                        color={isToday(selectedDate) ? 'purple.500' : 'inherit'}
                    >
                        {formatDateDisplay(selectedDate)}
                    </Text>
                    <Input
                        type="date"
                        value={formatDateForInput(selectedDate)}
                        onChange={handleDateInputChange}
                        size="sm"
                        mt={2}
                        maxW="180px"
                        textAlign="center"
                        borderColor={borderColor}
                        _hover={{ borderColor: 'purple.400' }}
                        _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)' }}
                    />
                </Box>

                {/* Next Day Button */}
                <IconButton
                    aria-label="Next day"
                    icon={<Text fontSize="xl">→</Text>}
                    onClick={goToNextDay}
                    isDisabled={isLoading}
                    variant="ghost"
                    size="lg"
                    _hover={{ bg: 'purple.50', transform: 'scale(1.1)' }}
                    transition="all 0.2s"
                />
            </HStack>

            {/* Today Button */}
            {!isToday(selectedDate) && (
                <HStack justify="center" mt={3}>
                    <Button
                        size="sm"
                        colorScheme="purple"
                        variant="outline"
                        onClick={goToToday}
                        isDisabled={isLoading}
                        leftIcon={<Text>📅</Text>}
                    >
                        Today
                    </Button>
                </HStack>
            )}
        </MotionBox>
    );
};

export default DateNavigator;
