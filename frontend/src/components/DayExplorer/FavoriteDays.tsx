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
    const { favorites, removeFavorite, updateNote, updateTitle } = useFavoritesStore();
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [noteInput, setNoteInput] = useState('');
    const [titleInput, setTitleInput] = useState('');
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

    const handleEdit = (fav: FavoriteDay) => {
        setEditingDate(fav.date);
        setTitleInput(fav.title || '');
        setNoteInput(fav.note || '');
    };

    const handleSave = (date: string) => {
        updateTitle(date, titleInput);
        updateNote(date, noteInput);
        setEditingDate(null);
    };

    const handleCancelEdit = () => {
        setEditingDate(null);
        setNoteInput('');
        setTitleInput('');
    };

    if (favorites.length === 0) {
        return (
            <Card bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
                <CardBody>
                    <VStack py={4} spacing={2}>
                        <Text fontSize="2xl">📚</Text>
                        <Text color={mutedColor} textAlign="center">
                            Your Event Library is empty
                        </Text>
                        <Text fontSize="sm" color={mutedColor} textAlign="center">
                            Click the star button on any day to save it as a library item
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
                    <Heading size="md">📚 Event Library ({favorites.length})</Heading>
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
                                        <HStack justify="space-between" align="start">
                                            <HStack spacing={3} align="start">
                                                <Text fontSize="xl" mt={1}>
                                                    {getMoonPhaseEmoji(fav.summary?.moonPhase)}
                                                </Text>
                                                <VStack align="start" spacing={0}>
                                                    <Text fontWeight="bold" color="purple.600">
                                                        {fav.title || 'Untitled Event'}
                                                    </Text>
                                                    <Text fontSize="sm" color={mutedColor}>
                                                        {formatDate(fav.date)}
                                                    </Text>
                                                    {fav.summary && (
                                                        <HStack spacing={2} mt={1}>
                                                            <Badge size="sm" colorScheme="purple" variant="outline">
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
                                                    aria-label="Edit item"
                                                    icon={<Text>✏️</Text>}
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(fav);
                                                    }}
                                                />
                                                <IconButton
                                                    aria-label="Remove item"
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

                                        {/* Edit Mode */}
                                        {editingDate === fav.date ? (
                                            <Box mt={3} p={2} bg={cardBg} borderRadius="md" border="1px solid" borderColor="purple.200" onClick={(e) => e.stopPropagation()}>
                                                <VStack align="stretch" spacing={2}>
                                                    <Input
                                                        value={titleInput}
                                                        onChange={(e) => setTitleInput(e.target.value)}
                                                        placeholder="Event Title (e.g. Project Launch)"
                                                        size="sm"
                                                        fontWeight="bold"
                                                        autoFocus
                                                    />
                                                    <Input
                                                        value={noteInput}
                                                        onChange={(e) => setNoteInput(e.target.value)}
                                                        placeholder="Add description or notes..."
                                                        size="sm"
                                                    />
                                                    <HStack spacing={2} justify="flex-end">
                                                        <Button size="xs" colorScheme="purple" onClick={() => handleSave(fav.date)}>
                                                            Save Changes
                                                        </Button>
                                                        <Button size="xs" variant="ghost" onClick={handleCancelEdit}>
                                                            Cancel
                                                        </Button>
                                                    </HStack>
                                                </VStack>
                                            </Box>
                                        ) : fav.note ? (
                                            <Text fontSize="sm" color={mutedColor} mt={2} pl={9} borderLeft="2px solid" borderColor="purple.100">
                                                {fav.note}
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
