import React from 'react';
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
    Spinner,
    Grid,
    GridItem,
    Divider,
    Progress,
    Alert,
    AlertIcon,
    useColorModeValue,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import type { CalendarDay } from '../../services/dayService';

const MotionCard = motion(Card);

interface DayAnalysisProps {
    data: CalendarDay | null;
    isLoading: boolean;
    error: string | null;
    selectedDate: Date;
}

export const DayAnalysis: React.FC<DayAnalysisProps> = ({
    data,
    isLoading,
    error,
    selectedDate,
}) => {
    const cardBg = 'var(--ag-surface)';
    const borderColor = 'var(--ag-border)';
    const mutedColor = 'var(--ag-text-muted)';

    const getMoonPhaseEmoji = (phase: string): string => {
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

    const getEnergyColor = (energy: string): string => {
        const colors: Record<string, string> = {
            positive: 'green',
            negative: 'red',
            neutral: 'gray',
            mixed: 'yellow',
            powerful: 'purple',
            calm: 'blue',
        };
        return colors[energy.toLowerCase()] || 'gray';
    };

    if (isLoading) {
        return (
            <Card bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
                <CardBody>
                    <VStack py={10}>
                        <Spinner size="xl" color="purple.500" thickness="4px" />
                        <Text color={mutedColor}>Loading day analysis...</Text>
                    </VStack>
                </CardBody>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert status="error" borderRadius="xl">
                <AlertIcon />
                {error}
            </Alert>
        );
    }

    if (!data) {
        return (
            <Card bg={cardBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
                <CardBody>
                    <Text color={mutedColor} textAlign="center">
                        Select a date to view analysis
                    </Text>
                </CardBody>
            </Card>
        );
    }

    return (
        <VStack spacing={4} align="stretch">
            {/* Lunar Day Card */}
            <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                bg={cardBg}
                borderRadius="xl"
                border="1px solid"
                borderColor={borderColor}
                overflow="hidden"
            >
                <CardHeader bg="var(--ag-day-glow)" pb={2}>
                    <HStack justify="space-between">
                        <Heading size="md">
                            🌙 Lunar Day {data.lunarDay?.number || '—'}
                        </Heading>
                        <Badge
                            colorScheme={getEnergyColor(data.lunarDay?.energy || 'neutral')}
                            fontSize="sm"
                            px={3}
                            py={1}
                            borderRadius="full"
                        >
                            {data.lunarDay?.energy || 'Unknown'}
                        </Badge>
                    </HStack>
                </CardHeader>
                <CardBody>
                    <VStack align="stretch" spacing={4}>
                        {/* Moon Phase */}
                        <HStack justify="space-between">
                            <HStack>
                                <Text fontSize="3xl">
                                    {getMoonPhaseEmoji(data.moonPhase?.phase || '')}
                                </Text>
                                <VStack align="start" spacing={0}>
                                    <Text fontWeight="medium" textTransform="capitalize">
                                        {data.moonPhase?.phase || 'Unknown Phase'}
                                    </Text>
                                    <Text fontSize="sm" color={mutedColor}>
                                        Age: {data.moonPhase?.age?.toFixed(1) || '—'} days
                                    </Text>
                                </VStack>
                            </HStack>
                            <VStack align="end" spacing={1}>
                                <Text fontSize="sm" color={mutedColor}>
                                    Illumination
                                </Text>
                                <Text fontWeight="bold">
                                    {((data.moonPhase?.illumination || 0) * 100).toFixed(0)}%
                                </Text>
                            </VStack>
                        </HStack>

                        <Progress
                            value={(data.moonPhase?.illumination || 0) * 100}
                            colorScheme="purple"
                            size="sm"
                            borderRadius="full"
                            hasStripe
                        />

                        <Divider />

                        {/* Lunar Day Description */}
                        {data.lunarDay?.description && (
                            <Box>
                                <Text fontSize="sm" color={mutedColor} mb={1}>
                                    Day Meaning
                                </Text>
                                <Text>{data.lunarDay.description}</Text>
                            </Box>
                        )}

                        {/* Symbol */}
                        {data.lunarDay?.symbol && (
                            <HStack>
                                <Text fontSize="sm" color={mutedColor}>Symbol:</Text>
                                <Text fontWeight="medium">{data.lunarDay.symbol}</Text>
                            </HStack>
                        )}
                    </VStack>
                </CardBody>
            </MotionCard>

            {/* Void of Course Moon */}
            {data.voidMoon && (
                <MotionCard
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    bg={data.voidMoon.isVoid ? 'orange.50' : cardBg}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={data.voidMoon.isVoid ? 'orange.200' : borderColor}
                >
                    <CardBody>
                        <HStack justify="space-between">
                            <HStack>
                                <Text fontSize="xl">
                                    {data.voidMoon.isVoid ? '⚠️' : '✅'}
                                </Text>
                                <VStack align="start" spacing={0}>
                                    <Text fontWeight="medium">
                                        Void of Course Moon
                                    </Text>
                                    <Text fontSize="sm" color={mutedColor}>
                                        {data.voidMoon.isVoid
                                            ? 'Moon is currently void — avoid major decisions'
                                            : 'Moon is not void'}
                                    </Text>
                                </VStack>
                            </HStack>
                            <Badge
                                colorScheme={data.voidMoon.isVoid ? 'orange' : 'green'}
                                fontSize="sm"
                            >
                                {data.voidMoon.isVoid ? 'VOID' : 'ACTIVE'}
                            </Badge>
                        </HStack>

                        {data.voidMoon.isVoid && data.voidMoon.voidStart && (
                            <Box mt={3} pl={8}>
                                <Text fontSize="sm">
                                    <Text as="span" color={mutedColor}>Period: </Text>
                                    {new Date(data.voidMoon.voidStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {data.voidMoon.voidEnd && (
                                        <> — {new Date(data.voidMoon.voidEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                                    )}
                                </Text>
                            </Box>
                        )}
                    </CardBody>
                </MotionCard>
            )}

            {/* Recommendations */}
            {data.lunarDay?.recommendations && (
                <MotionCard
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    bg={cardBg}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={borderColor}
                >
                    <CardHeader pb={2}>
                        <Heading size="md">📊 Recommendations</Heading>
                    </CardHeader>
                    <CardBody>
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                            {/* Good Activities */}
                            <GridItem>
                                <VStack align="stretch" spacing={2}>
                                    <HStack>
                                        <Text color="green.500">✓</Text>
                                        <Text fontWeight="medium" color="green.600">Good for</Text>
                                    </HStack>
                                    {data.lunarDay.recommendations.good?.length > 0 ? (
                                        data.lunarDay.recommendations.good.map((item, i) => (
                                            <Text key={i} fontSize="sm" pl={5}>
                                                • {item}
                                            </Text>
                                        ))
                                    ) : (
                                        <Text fontSize="sm" color={mutedColor} pl={5}>
                                            No specific recommendations
                                        </Text>
                                    )}
                                </VStack>
                            </GridItem>

                            {/* Avoid Activities */}
                            <GridItem>
                                <VStack align="stretch" spacing={2}>
                                    <HStack>
                                        <Text color="red.500">✗</Text>
                                        <Text fontWeight="medium" color="red.600">Avoid</Text>
                                    </HStack>
                                    {data.lunarDay.recommendations.avoid?.length > 0 ? (
                                        data.lunarDay.recommendations.avoid.map((item, i) => (
                                            <Text key={i} fontSize="sm" pl={5}>
                                                • {item}
                                            </Text>
                                        ))
                                    ) : (
                                        <Text fontSize="sm" color={mutedColor} pl={5}>
                                            No specific warnings
                                        </Text>
                                    )}
                                </VStack>
                            </GridItem>
                        </Grid>
                    </CardBody>
                </MotionCard>
            )}
        </VStack>
    );
};

export default DayAnalysis;
