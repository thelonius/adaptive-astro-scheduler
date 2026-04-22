import React from 'react';
import {
    HStack,
    IconButton,
    Input,
    Button,
    Text,
    Box,
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
    const bgColor = 'var(--ag-surface)';
    const borderColor = 'var(--ag-border)';

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
                    _hover={{ bg: 'var(--ag-surface-hover)', transform: 'scale(1.1)' }}
                    transition="all 0.2s"
                />

                {/* Date Display & Picker */}
                <Box textAlign="center">
                    <Text
                        fontSize="xl"
                        fontWeight="bold"
                        color={isToday(selectedDate) ? 'var(--ag-day-primary)' : 'inherit'}
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
                        _hover={{ borderColor: 'var(--ag-day-secondary)' }}
                        _focus={{ borderColor: 'var(--ag-day-primary)', boxShadow: '0 0 0 1px var(--ag-day-primary)' }}
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
                    _hover={{ bg: 'var(--ag-surface-hover)', transform: 'scale(1.1)' }}
                    transition="all 0.2s"
                />
            </HStack>

            {/* Today Button */}
            {!isToday(selectedDate) && (
                <HStack justify="center" mt={3}>
                    <Button
                        size="sm"
                        bg="var(--ag-day-primary)"
                        color="var(--ag-surface)"
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
