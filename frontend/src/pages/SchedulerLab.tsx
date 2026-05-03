import React, { useState } from 'react';
import { 
    Box, Container, Heading, Text, VStack, SimpleGrid, Button, 
    FormControl, FormLabel, Input, useToast, HStack, 
    Tabs, TabList, TabPanels, Tab, TabPanel, Textarea, Badge, Icon,
    Divider
} from '@chakra-ui/react';
import { IntentionSelector } from '../components/OptimalTiming/IntentionSelector';
import { NatalChartSelector } from '../components/NatalChart/NatalChartSelector';
import { optimalTimingService } from '../services/optimalTimingService';
import type { IntentionCategory, TimingWindow } from '@adaptive-astro/shared/types/astrology';

export const SchedulerLab: React.FC = () => {
    const [intention, setIntention] = useState<IntentionCategory | null>(null);
    const [aiPrompt, setAiPrompt] = useState("");
    const [mode, setMode] = useState(0); // 0: Standard, 1: AI
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [durationDays, setDurationDays] = useState(30);
    const [selectedNatalId, setSelectedNatalId] = useState<string | null>(null);
    const [results, setResults] = useState<TimingWindow[]>([]);
    const [aiStrategy, setAiStrategy] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const toast = useToast();

    const handleAnalyze = async () => {
        const isAiMode = mode === 1;

        if (!isAiMode && !intention) {
            toast({ title: "Please select an intention first", status: "warning" });
            return;
        }

        if (isAiMode && !aiPrompt.trim()) {
            toast({ title: "Please enter what you are planning", status: "warning" });
            return;
        }

        setIsAnalyzing(true);
        setResults([]);
        setAiStrategy(null);

        try {
            const start = new Date(startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + durationDays);

            let response;
            if (isAiMode) {
                const aiResult = await optimalTimingService.findAIWindows({
                    prompt: aiPrompt,
                    startDate: start,
                    endDate: end,
                    limit: 100,
                    natalChartId: selectedNatalId || undefined
                });
                response = aiResult;
                setAiStrategy(aiResult.strategy);
            } else {
                response = await optimalTimingService.findWindows({
                    intention: intention!,
                    startDate: start,
                    endDate: end,
                    limit: 100,
                    natalChartId: selectedNatalId || undefined
                });
            }

            // Sort purely by date for the "Lab" view to see timeline
            const sortedByDate = response.windows.sort((a, b) =>
                new Date(a.date.date).getTime() - new Date(b.date.date).getTime()
            );

            setResults(sortedByDate);
            toast({ 
                title: isAiMode ? "AI Analysis Ready" : "Analysis Complete", 
                description: `Scanned ${durationDays} days.`, 
                status: "success" 
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Analysis Failed", description: "Cosmos is unresponsive. Check API.", status: "error" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Container maxW="container.xl" py={10}>
            <VStack spacing={8} align="stretch">
                <Box>
                    <Heading size="xl">Scheduler Laboratory 🔬</Heading>
                    <Text color="gray.600">Experimental interface for AI-driven timing analysis and rule testing.</Text>
                </Box>

                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={10}>
                    {/* Control Panel */}
                    <Box bg="white" p={6} borderRadius="xl" boxShadow="md" height="fit-content" border="1px solid" borderColor="purple.100">
                        <Heading size="sm" mb={6} textTransform="uppercase" letterSpacing="wider" color="purple.600">
                            1. Configuration
                        </Heading>
                        <VStack spacing={6} align="stretch">
                            
                            <Tabs variant="soft-rounded" colorScheme="purple" onChange={(index) => setMode(index)}>
                                <TabList mb={4} p={1} bg="gray.50" borderRadius="full">
                                    <Tab borderRadius="full" flex={1}>Standard Categories</Tab>
                                    <Tab borderRadius="full" flex={1}>AI Intention ✨</Tab>
                                </TabList>
                                <TabPanels>
                                    <TabPanel p={0} pt={2}>
                                        <FormControl>
                                            <IntentionSelector 
                                                selected={intention} 
                                                onSelect={setIntention} 
                                                customIntent={aiPrompt}
                                                onCustomIntentChange={setAiPrompt}
                                                onAISearch={() => setMode(1)} // Or whatever makes sense
                                            />                                        </FormControl>
                                    </TabPanel>
                                    <TabPanel p={0} pt={2}>
                                        <FormControl>
                                            <FormLabel fontSize="sm" fontWeight="bold">What are you planning?</FormLabel>
                                            <Textarea 
                                                placeholder="e.g. Buying a car, starting a fast, or writing a book..."
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                bg="white"
                                            />
                                            <Text fontSize="xs" mt={2} color="gray.400">
                                                The AI will synthesize professional electional rules for your specific goal.
                                            </Text>
                                        </FormControl>
                                    </TabPanel>
                                </TabPanels>
                            </Tabs>

                            <NatalChartSelector
                                selectedId={selectedNatalId}
                                onSelect={setSelectedNatalId}
                            />

                            <SimpleGrid columns={2} spacing={4}>
                                <FormControl>
                                    <FormLabel fontSize="sm">Start Date</FormLabel>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="sm">Scan Range</FormLabel>
                                    <HStack>
                                        <Input
                                            type="number"
                                            value={durationDays}
                                            onChange={(e) => setDurationDays(parseInt(e.target.value))}
                                            min={1}
                                            max={365}
                                        />
                                        <Text fontSize="xs" color="gray.500">Days</Text>
                                    </HStack>
                                </FormControl>
                            </SimpleGrid>

                            <Button
                                colorScheme="purple"
                                size="lg"
                                onClick={handleAnalyze}
                                isLoading={isAnalyzing}
                                loadingText="Consulting the Oracle..."
                                width="full"
                                py={8}
                                fontSize="xl"
                                borderRadius="xl"
                                boxShadow="lg"
                            >
                                {mode === 0 ? 'Run Classic Scan' : 'Generate AI Plan ✨'}
                            </Button>
                        </VStack>
                    </Box>

                    {/* Results / Inspector Panel */}
                    <Box bg="gray.100" p={6} borderRadius="xl" border="1px solid" borderColor="gray.300" position="relative">
                        <HStack justify="space-between" mb={6}>
                            <Heading size="sm" textTransform="uppercase" letterSpacing="wider" color="gray.600">
                                2. Timeline Inspector
                            </Heading>
                            {results.length > 0 && <Badge colorScheme="purple" fontSize="0.7em" px={2} py={1} borderRadius="full">{results.length} windows</Badge>}
                        </HStack>

                        {aiStrategy && (
                            <Box bg="white" p={4} borderRadius="lg" mb={6} border="1px solid" borderColor="purple.200" boxShadow="sm">
                                <HStack mb={2} color="purple.600">
                                    <Text fontWeight="bold" fontSize="sm">AI Strategy Analysis</Text>
                                    <Icon viewBox="0 0 24 24" w={4} h={4}>
                                        <path fill="currentColor" d="M11,9L12.42,10.42L8.83,14L12.42,17.58L11,19L6,14L11,9M13,9L18,14L13,19L11.58,17.58L15.17,14L11.58,10.42L13,9Z" />
                                    </Icon>
                                </HStack>
                                <Text fontSize="xs" color="gray.600" lineHeight="tall">{aiStrategy}</Text>
                            </Box>
                        )}
                        {results.length === 0 ? (
                            <Box textAlign="center" py={10} color="gray.500">
                                <Text fontStyle="italic">
                                    Configure parameters and run analysis to see detailed breakdown here.
                                </Text>
                            </Box>
                        ) : (
                            <VStack spacing={3} align="stretch" maxH="600px" overflowY="auto" pr={2}>
                                {results.map((win: TimingWindow) => {
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
                                                <VStack align="start" spacing={1} mt={2}>
                                                    {win.suggestions.slice(0, 5).map((s: string, idx: number) => (
                                                        <Box key={idx} fontSize="xs" color="green.600" display="flex" alignItems="center">
                                                            <Box as="span" mr={1} fontWeight="bold">✓</Box>
                                                            {s}
                                                        </Box>
                                                    ))}
                                                    {win.warnings && win.warnings.length > 0 && win.warnings.slice(0, 3).map((w: string, idx: number) => (
                                                        <Box key={idx} fontSize="xs" color="orange.600" display="flex" alignItems="center">
                                                            <Box as="span" mr={1} fontWeight="bold">⚠</Box>
                                                            {w}
                                                        </Box>
                                                    ))}
                                                </VStack>
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
