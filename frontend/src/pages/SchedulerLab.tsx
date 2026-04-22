import React, { useState } from 'react';
import { Box, Container, Heading, Text, VStack, SimpleGrid, Button, FormControl, FormLabel, Input, useToast, HStack } from '@chakra-ui/react';
import { IntentionSelector } from '../components/OptimalTiming/IntentionSelector';
import { optimalTimingService } from '../services/optimalTimingService';
import type { IntentionCategory, TimingWindow } from '@adaptive-astro/shared/types/astrology';

export const SchedulerLab: React.FC = () => {
    const [intention, setIntention] = useState<IntentionCategory | null>(null);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [durationDays, setDurationDays] = useState(30);
    const [results, setResults] = useState<TimingWindow[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const toast = useToast();

    const handleAnalyze = async () => {
        if (!intention) {
            toast({ title: "Please select an intention first", status: "warning" });
            return;
        }

        setIsAnalyzing(true);
        try {
            const start = new Date(startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + durationDays);

            const response = await optimalTimingService.findWindows({
                intention,
                startDate: start,
                endDate: end,
                limit: 100 // Get detailed scan
            });

            // Sort purely by date for the "Lab" view to see timeline
            const sortedByDate = response.windows.sort((a, b) =>
                new Date(a.date.date).getTime() - new Date(b.date.date).getTime()
            );

            setResults(sortedByDate);
            toast({ title: `Analysis Complete. Scanned ${durationDays} days.`, status: "success" });
        } catch (error) {
            console.error(error);
            toast({ title: "Analysis Failed", description: "Could not fetch data.", status: "error" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Container maxW="container.xl" py={10}>
            <VStack spacing={8} align="stretch">
                <Box>
                    <Heading size="xl">Scheduler Laboratory 🔬</Heading>
                    <Text color="gray.600">Experimental interface for detailed timing analysis and rule testing.</Text>
                </Box>

                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={10}>
                    {/* Control Panel */}
                    <Box bg="white" p={6} borderRadius="xl" boxShadow="md" height="fit-content">
                        <Heading size="md" mb={4}>1. Configure Parameters</Heading>
                        <VStack spacing={5} align="stretch">
                            <Box>
                                <FormLabel fontWeight="bold">Target Intention</FormLabel>
                                <IntentionSelector selected={intention} onSelect={setIntention} />
                            </Box>

                            <SimpleGrid columns={2} spacing={4}>
                                <FormControl>
                                    <FormLabel>Start Date</FormLabel>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Duration (Days)</FormLabel>
                                    <Input
                                        type="number"
                                        value={durationDays}
                                        onChange={(e) => setDurationDays(parseInt(e.target.value))}
                                        min={1}
                                        max={365}
                                    />
                                </FormControl>
                            </SimpleGrid>

                            <Button
                                colorScheme="purple"
                                size="lg"
                                onClick={handleAnalyze}
                                isLoading={isAnalyzing}
                                loadingText="Analyzing Cosmos..."
                                width="full"
                            >
                                Run Analysis
                            </Button>
                        </VStack>
                    </Box>

                    {/* Results / Inspector Panel */}
                    <Box bg="gray.50" p={6} borderRadius="xl" border="1px solid" borderColor="gray.200">
                        <Heading size="md" mb={4}>
                            2. Timeline Inspector
                            {results.length > 0 && <Text as="span" fontSize="sm" fontWeight="normal" ml={2}>({results.length} windows found)</Text>}
                        </Heading>

                        {results.length === 0 ? (
                            <Box textAlign="center" py={10} color="gray.500">
                                <Text fontStyle="italic">
                                    Configure parameters and run analysis to see detailed breakdown here.
                                </Text>
                            </Box>
                        ) : (
                            <VStack spacing={3} align="stretch" maxH="600px" overflowY="auto" pr={2}>
                                {results.map((win) => {
                                    const scoreColor = getScoreColor(win.score);
                                    const dateObj = new Date(win.date.date);
                                    return (
                                        <Box
                                            key={win.id}
                                            p={3}
                                            bg="white"
                                            borderRadius="md"
                                            boxShadow="sm"
                                            borderLeft="4px solid"
                                            borderLeftColor={scoreColor}
                                            transition="all 0.2s"
                                            _hover={{ transform: 'translateX(2px)', boxShadow: 'md' }}
                                        >
                                            <HStack justify="space-between" mb={1}>
                                                <VStack align="start" spacing={0}>
                                                    <Text fontWeight="bold">{dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                                                    <HStack fontSize="xs" color="gray.500" spacing={2}>
                                                        {win.moonPhase && <Text>🌑 {win.moonPhase}</Text>}
                                                        {win.moonSign && <Text>♐ {win.moonSign}</Text>}
                                                    </HStack>
                                                </VStack>
                                                <VStack align="end" spacing={0}>
                                                    <Text fontWeight="bold" fontSize="lg" color={scoreColor}>{win.score}</Text>
                                                    <Text fontSize="xs" color="gray.400">Score</Text>
                                                </VStack>
                                            </HStack>

                                            <Text fontSize="sm" color="gray.700" mb={2}>{win.summary}</Text>

                                            {win.suggestions && win.suggestions.length > 0 && (
                                                <Box fontSize="xs" color="green.600">
                                                    <strong>+ </strong> {win.suggestions.slice(0, 2).join(", ")}
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </VStack>
                        )}
                    </Box>
                </SimpleGrid>
            </VStack>
        </Container>
    );
};

function getScoreColor(score: number): string {
    if (score >= 90) return "green.500";
    if (score >= 75) return "teal.500";
    if (score >= 60) return "blue.500";
    if (score >= 40) return "orange.500";
    return "red.500";
}
