import React, { useMemo } from 'react';
import { Box, VStack, HStack, Text, Image, Card, CardBody, Heading, Badge } from '@chakra-ui/react';

export interface FeaturedEvent {
    id: string;
    title: string;
    date: Date;
    description: string;
    thumbnail: string;
    activeBodies: string[];
}

// Events will be sorted chronologically when rendered
export const FEATURED_EVENTS: FeaturedEvent[] = [
    {
        id: 'alignment-4-planet',
        title: '4-Planet Alignment',
        date: new Date('2026-02-07T20:00:00'),
        description: 'Rare Planetary Alignment',
        thumbnail: '/assets/events/conjunction.png',
        activeBodies: ['Mercury', 'Venus', 'Mars', 'Saturn'],
    },
    {
        id: 'alignment-5-planet',
        title: '5-Planet Alignment',
        date: new Date('2026-02-08T20:00:00'),
        description: 'Mercury, Venus, Mars, Saturn, Neptune',
        thumbnail: '/assets/events/alignment.png',
        activeBodies: ['Mercury', 'Venus', 'Mars', 'Saturn', 'Neptune'],
    },
    {
        id: 'solar-eclipse-annular',
        title: 'Annular Solar Eclipse',
        date: new Date('2026-02-17T12:00:00'),
        description: 'Ring of Fire Eclipse',
        thumbnail: '/assets/events/eclipse.png',
        activeBodies: ['Sun', 'Moon'],
    },
];

interface FeaturedEventsCarouselProps {
    onSelectEvent: (event: FeaturedEvent) => void;
    selectedEventId?: string;
}

const FeaturedEventsCarouselBase: React.FC<FeaturedEventsCarouselProps> = ({
    onSelectEvent,
    selectedEventId,
}) => {
    const bgColor = 'var(--ag-surface)';
    const selectedBorderColor = 'var(--ag-day-primary)';
    const hoverBg = 'var(--ag-surface-hover)';

    // Sort events chronologically (timeline order)
    const sortedEvents = useMemo(() => {
        return [...FEATURED_EVENTS].sort((a, b) => a.date.getTime() - b.date.getTime());
    }, []);

    // Check if event is in the past
    const isPastEvent = (date: Date) => date.getTime() < Date.now();
    const isTodayEvent = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    return (
        <Card variant="outline" mb={6}>
            <CardBody>
                <VStack align="start" spacing={4}>
                    <HStack justify="space-between" w="full">
                        <Heading size="sm">🌌 Celestial Events Timeline</Heading>
                        <Text fontSize="xs" color="gray.500">Click to animate • Scroll for more →</Text>
                    </HStack>
                    <HStack spacing={4} overflowX="auto" w="full" pb={2} css={{
                        '&::-webkit-scrollbar': {
                            height: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            width: '6px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: 'gray',
                            borderRadius: '24px',
                        },
                    }}>
                        {sortedEvents.map((event, index) => (
                            <HStack key={event.id} spacing={0}>
                                {/* Timeline connector */}
                                {index > 0 && (
                                    <Box
                                        w="20px"
                                        h="2px"
                                        bg={selectedEventId === event.id ? 'var(--ag-day-primary)' : 'var(--ag-border-strong)'}
                                        transition="all 0.3s"
                                    />
                                )}
                                <Box
                                    minW="200px"
                                    maxW="200px"
                                    cursor="pointer"
                                    onClick={() => onSelectEvent(event)}
                                    position="relative"
                                    transition="all 0.3s"
                                    transform={selectedEventId === event.id ? 'scale(1.05)' : 'none'}
                                >
                                    {/* Timeline badge */}
                                    <Badge
                                        position="absolute"
                                        top="-8px"
                                        left="50%"
                                        transform="translateX(-50%)"
                                        zIndex={2}
                                        colorScheme={
                                            isTodayEvent(event.date) ? 'green' :
                                                isPastEvent(event.date) ? 'gray' : 'purple'
                                        }
                                        fontSize="xs"
                                        px={2}
                                    >
                                        {isTodayEvent(event.date) ? '🔴 TODAY' :
                                            isPastEvent(event.date) ? 'PAST' : 'UPCOMING'}
                                    </Badge>

                                    {/* Playing indicator for selected event */}
                                    {selectedEventId === event.id && (
                                        <Badge
                                            position="absolute"
                                            top="12px"
                                            right="8px"
                                            zIndex={3}
                                            colorScheme="blue"
                                            variant="solid"
                                            fontSize="xs"
                                            animation="pulse 1.5s infinite"
                                        >
                                            ▶ ANIMATING
                                        </Badge>
                                    )}

                                    <Box
                                        borderRadius="lg"
                                        overflow="hidden"
                                        borderWidth="3px"
                                        borderColor={selectedEventId === event.id ? selectedBorderColor : 'transparent'}
                                        bg={bgColor}
                                        _hover={{ bg: hoverBg, transform: 'translateY(-4px)', boxShadow: 'lg' }}
                                        transition="all 0.3s"
                                        boxShadow={selectedEventId === event.id ? 'xl' : 'sm'}
                                    >
                                        <Box h="100px" overflow="hidden" position="relative">
                                            <Image
                                                src={event.thumbnail}
                                                alt={event.title}
                                                objectFit="cover"
                                                w="100%"
                                                h="100%"
                                                transition="transform 0.3s"
                                                filter={isPastEvent(event.date) ? 'grayscale(50%)' : 'none'}
                                                fallbackSrc="https://via.placeholder.com/200x100?text=Event"
                                            />
                                            {/* Gradient overlay */}
                                            <Box
                                                position="absolute"
                                                bottom={0}
                                                left={0}
                                                right={0}
                                                h="50%"
                                                bgGradient="linear(to-t, blackAlpha.700, transparent)"
                                            />
                                        </Box>
                                        <Box p={3}>
                                            <Text fontWeight="bold" fontSize="sm" noOfLines={1} mb={1}>
                                                {event.title}
                                            </Text>
                                            <HStack justify="space-between" mb={1}>
                                                <Text fontSize="xs" color="gray.500">
                                                    {event.date.toLocaleDateString()}
                                                </Text>
                                                <Text fontSize="xs" color="gray.400">
                                                    {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </HStack>
                                            <Text fontSize="xs" noOfLines={1} color="gray.600">
                                                {event.activeBodies.join(' • ')}
                                            </Text>
                                        </Box>
                                    </Box>
                                </Box>
                            </HStack>
                        ))}
                    </HStack>

                    {/* Pulse animation for ANIMATING badge */}
                    <style>{`
                        @keyframes pulse {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.5; }
                        }
                    `}</style>
                </VStack>
            </CardBody>
        </Card>
    );
};

export const FeaturedEventsCarousel = React.memo(FeaturedEventsCarouselBase);
