import React, { useState } from 'react';
import {
    Box,
    Card,
    CardBody,
    CardHeader,
    Heading,
    Text,
    VStack,
    HStack,
    Badge,
    IconButton,
    Input,
    Button,
    useColorModeValue,
    Collapse,
    useDisclosure,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFavoritesStore, type FavoriteDay } from '../../store/favoritesStore';

const MotionBox = motion(Box);

interface FavoriteDaysProps {
    onSelectDate: (date: Date) => void;
    currentDate: Date;
}

export const FavoriteDays: React.FC<FavoriteDaysProps> = ({
    onSelectDate,
    currentDate,
}) => {
    const { favorites, removeFavorite, updateNote } = useFavoritesStore();
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [noteInput, setNoteInput] = useState('');
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });

    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const mutedColor = useColorModeValue('gray.600', 'gray.400');
    const hoverBg = useColorModeValue('purple.50', 'gray.700');

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const isCurrentDate = (dateStr: string): boolean => {
        const favDate = new Date(dateStr);
        return (
            favDate.getDate() === currentDate.getDate() &&
            favDate.getMonth() === currentDate.getMonth() &&
            favDate.getFullYear() === currentDate.getFullYear()
        );
    };

    const getMoonPhaseEmoji = (phase?: string): string => {
        if (!phase) return '🌙';
        const phases: Record<string, string> = {
            'new moon': '🌑',
            'new': '🌑',
            'waxing crescent': '🌒',
            'first quarter': '🌓',
            'waxing gibbous': '🌔',
            'full moon': '🌕',
            'full': '🌕',
            'waning gibbous': '🌖',
            'last quarter': '🌗',
            'third quarter': '🌗',
            'waning crescent': '🌘',
        };
        return phases[phase.toLowerCase()] || '🌙';
    };

    const handleEditNote = (fav: FavoriteDay) => {
        setEditingDate(fav.date);
        setNoteInput(fav.note || '');
    };

    const handleSaveNote = (date: string) => {
        updateNote(date, noteInput);
        setEditingDate(null);
        setNoteInput('');
    };

    const handleCancelEdit = () => {
        setEditingDate(null);
        setNoteInput('');
    };

    if (favorites.length === 0) {
        return (
            <Card bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
                <CardBody>
                    <VStack py={4} spacing={2}>
                        <Text fontSize="2xl">⭐</Text>
                        <Text color={mutedColor} textAlign="center">
                            No favorite days yet
                        </Text>
                        <Text fontSize="sm" color={mutedColor} textAlign="center">
                            Click the star button to save days you want to remember
                        </Text>
                    </VStack>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
            <CardHeader
                pb={2}
                cursor="pointer"
                onClick={onToggle}
                _hover={{ bg: hoverBg }}
                borderRadius="xl"
                transition="background 0.2s"
            >
                <HStack justify="space-between">
                    <Heading size="md">⭐ Favorite Days ({favorites.length})</Heading>
                    <Text fontSize="lg">{isOpen ? '▼' : '▶'}</Text>
                </HStack>
            </CardHeader>

            <Collapse in={isOpen}>
                <CardBody pt={0}>
                    <VStack align="stretch" spacing={2}>
                        <AnimatePresence>
                            {favorites.map((fav) => (
                                <MotionBox
                                    key={fav.date}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Box
                                        p={3}
                                        borderRadius="lg"
                                        border="1px solid"
                                        borderColor={isCurrentDate(fav.date) ? 'purple.400' : borderColor}
                                        bg={isCurrentDate(fav.date) ? 'purple.50' : 'transparent'}
                                        _hover={{ bg: hoverBg, transform: 'translateX(4px)' }}
                                        transition="all 0.2s"
                                        cursor="pointer"
                                        onClick={() => onSelectDate(new Date(fav.date))}
                                    >
                                        <HStack justify="space-between">
                                            <HStack spacing={3}>
                                                <Text fontSize="xl">
                                                    {getMoonPhaseEmoji(fav.summary?.moonPhase)}
                                                </Text>
                                                <VStack align="start" spacing={0}>
                                                    <Text fontWeight="medium">
                                                        {formatDate(fav.date)}
                                                    </Text>
                                                    {fav.summary && (
                                                        <HStack spacing={2}>
                                                            <Badge size="sm" colorScheme="purple">
                                                                Day {fav.summary.lunarDay}
                                                            </Badge>
                                                            <Text fontSize="xs" color={mutedColor} textTransform="capitalize">
                                                                {fav.summary.moonPhase}
                                                            </Text>
                                                        </HStack>
                                                    )}
                                                </VStack>
                                            </HStack>

                                            <HStack spacing={1}>
                                                <IconButton
                                                    aria-label="Edit note"
                                                    icon={<Text>✏️</Text>}
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditNote(fav);
                                                    }}
                                                />
                                                <IconButton
                                                    aria-label="Remove from favorites"
                                                    icon={<Text>🗑️</Text>}
                                                    size="sm"
                                                    variant="ghost"
                                                    colorScheme="red"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFavorite(fav.date);
                                                    }}
                                                />
                                            </HStack>
                                        </HStack>

                                        {/* Note display or edit */}
                                        {editingDate === fav.date ? (
                                            <Box mt={2} onClick={(e) => e.stopPropagation()}>
                                                <Input
                                                    value={noteInput}
                                                    onChange={(e) => setNoteInput(e.target.value)}
                                                    placeholder="Add a note..."
                                                    size="sm"
                                                    mb={2}
                                                    autoFocus
                                                />
                                                <HStack spacing={2}>
                                                    <Button size="xs" colorScheme="purple" onClick={() => handleSaveNote(fav.date)}>
                                                        Save
                                                    </Button>
                                                    <Button size="xs" variant="ghost" onClick={handleCancelEdit}>
                                                        Cancel
                                                    </Button>
                                                </HStack>
                                            </Box>
                                        ) : fav.note ? (
                                            <Text fontSize="sm" color={mutedColor} mt={2} pl={9}>
                                                📝 {fav.note}
                                            </Text>
                                        ) : null}
                                    </Box>
                                </MotionBox>
                            ))}
                        </AnimatePresence>
                    </VStack>
                </CardBody>
            </Collapse>
        </Card>
    );
};

export default FavoriteDays;
