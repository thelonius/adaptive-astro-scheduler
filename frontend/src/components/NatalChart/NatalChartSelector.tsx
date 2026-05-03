import React, { useEffect, useState } from 'react';
import { 
    FormControl, 
    FormLabel, 
    Select, 
    Spinner, 
    Text, 
    Box, 
    HStack, 
    IconButton, 
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { chartService } from '../../services/chartService';
import { ChartCreator } from '../common/ChartCreator';
import type { SavedChart, ChartData } from '../../types/chart';

interface NatalChartSelectorProps {
    onSelect: (chartId: string | null) => void;
    selectedId: string | null;
}

export const NatalChartSelector: React.FC<NatalChartSelectorProps> = ({ onSelect, selectedId }) => {
    const [charts, setCharts] = useState<SavedChart[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const fetchCharts = async () => {
        try {
            setIsLoading(true);
            const data = await chartService.getCharts();
            setCharts(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching charts:', err);
            setError('Failed to load saved charts');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCharts();
    }, []);

    const handleChartCreated = (newChart: ChartData) => {
        onClose();
        fetchCharts();
        // Automatically select the newly created chart if it has an ID
        if (newChart.id) {
            onSelect(newChart.id);
        }
    };

    if (isLoading) {
        return (
            <Box py={2} textAlign="center">
                <Spinner size="sm" mr={2} />
                <Text as="span" fontSize="sm" color="gray.500">Loading charts...</Text>
            </Box>
        );
    }

    if (error) {
        return <Text color="red.500" fontSize="sm">{error}</Text>;
    }

    return (
        <FormControl>
            <FormLabel fontWeight="bold">Natal Chart (Optional)</FormLabel>
            <HStack>
                <Select
                    placeholder="Universal (No Natal Chart)"
                    value={selectedId || ''}
                    onChange={(e) => onSelect(e.target.value || null)}
                    bg="white"
                >
                    {charts.map((chart: SavedChart) => (
                        <option key={chart.id} value={chart.id}>
                            {chart.name} ({new Date(chart.date).toLocaleDateString()})
                        </option>
                    ))}
                </Select>
                <IconButton
                    aria-label="Add new chart"
                    icon={<AddIcon />}
                    onClick={onOpen}
                    colorScheme="green"
                    variant="ghost"
                    size="md"
                    title="Add new natal chart"
                />
            </HStack>
            <Text fontSize="xs" color="gray.500" mt={1}>
                Select a chart to see personalized timing windows and scores.
            </Text>

            {/* Add Chart Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="lg">
                <ModalOverlay backdropFilter="blur(5px)" />
                <ModalContent bg="white" borderRadius="xl">
                    <ModalHeader>Add New Natal Chart 👶</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <ChartCreator 
                            onChartCreated={handleChartCreated}
                            onCancel={onClose}
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </FormControl>
    );
};
