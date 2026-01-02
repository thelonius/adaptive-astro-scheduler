import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useToast,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Textarea,
} from '@chakra-ui/react';
import { FaPlus, FaStar } from 'react-icons/fa';
import apiService, { NatalChart, Rule } from '../services/api';

interface ChartManagerProps {
  onSelectChart: (chartId: string | null) => void;
}

function ChartManager({ onSelectChart }: ChartManagerProps) {
  const [charts, setCharts] = useState<NatalChart[]>([]);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [ruleRequest, setRuleRequest] = useState('');
  const [generatingRule, setGeneratingRule] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isRuleModalOpen,
    onOpen: onRuleModalOpen,
    onClose: onRuleModalClose,
  } = useDisclosure();
  const toast = useToast();

  // Form state for new chart
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    city: '',
    country: '',
    latitude: '',
    longitude: '',
  });

  const fetchCharts = async () => {
    try {
      const response = await apiService.getCharts();
      setCharts(response.data.data);
    } catch (error) {
      toast({
        title: 'Error loading charts',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async (chartId: string) => {
    try {
      const response = await apiService.getRules(chartId);
      setRules(response.data.data);
    } catch (error) {
      toast({
        title: 'Error loading rules',
        status: 'error',
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    fetchCharts();
  }, []);

  useEffect(() => {
    if (selectedChart) {
      fetchRules(selectedChart);
    }
  }, [selectedChart]);

  const handleSelectChart = (chartId: string) => {
    setSelectedChart(chartId);
    onSelectChart(chartId);
  };

  const handleCreateChart = async () => {
    try {
      await apiService.createChart({
        name: formData.name,
        birthDate: formData.birthDate,
        birthTime: formData.birthTime,
        birthPlace: {
          city: formData.city,
          country: formData.country,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        },
      } as any);
      await fetchCharts();
      onClose();
      setFormData({
        name: '',
        birthDate: '',
        birthTime: '',
        city: '',
        country: '',
        latitude: '',
        longitude: '',
      });
      toast({
        title: 'Chart created',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Error creating chart',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleGenerateRule = async () => {
    if (!selectedChart || !ruleRequest) {
      toast({
        title: 'Please enter a request',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setGeneratingRule(true);
    try {
      await apiService.generateRule(selectedChart, ruleRequest);
      await fetchRules(selectedChart);
      setRuleRequest('');
      onRuleModalClose();
      toast({
        title: 'Rule generated successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error generating rule',
        description: 'Make sure OpenAI API key is configured',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setGeneratingRule(false);
    }
  };

  if (loading) {
    return (
      <HStack justify="center" py={8}>
        <Spinner />
      </HStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Heading size="md">Natal Charts</Heading>
        <HStack>
          {selectedChart && (
            <Button leftIcon={<FaStar />} colorScheme="green" onClick={onRuleModalOpen}>
              Generate Rule with AI
            </Button>
          )}
          <Button leftIcon={<FaPlus />} colorScheme="purple" onClick={onOpen}>
            Add Chart
          </Button>
        </HStack>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {charts.map((chart) => (
          <Box
            key={chart._id}
            bg={selectedChart === chart._id ? 'purple.50' : 'white'}
            p={4}
            borderRadius="lg"
            shadow="md"
            cursor="pointer"
            onClick={() => handleSelectChart(chart._id)}
            borderWidth={selectedChart === chart._id ? 2 : 0}
            borderColor="purple.500"
          >
            <VStack align="stretch" spacing={2}>
              <Text fontWeight="bold" fontSize="lg">
                {chart.name}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {new Date(chart.birthDate).toLocaleDateString()}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {chart.birthPlace.city}, {chart.birthPlace.country}
              </Text>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      {selectedChart && rules.length > 0 && (
        <Box>
          <Heading size="sm" mb={4}>
            Rules for Selected Chart
          </Heading>
          <VStack align="stretch" spacing={2}>
            {rules.map((rule) => (
              <Box key={rule._id} bg="gray.50" p={3} borderRadius="md">
                <HStack justify="space-between">
                  <Text fontWeight="bold">{rule.name}</Text>
                  {rule.generated && <Badge colorScheme="green">AI Generated</Badge>}
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  {rule.description}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Create Chart Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Natal Chart</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormControl>
              <HStack width="full">
                <FormControl>
                  <FormLabel>Birth Date</FormLabel>
                  <Input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Birth Time</FormLabel>
                  <Input
                    type="time"
                    value={formData.birthTime}
                    onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                  />
                </FormControl>
              </HStack>
              <HStack width="full">
                <FormControl>
                  <FormLabel>City</FormLabel>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Country</FormLabel>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </FormControl>
              </HStack>
              <HStack width="full">
                <FormControl>
                  <FormLabel>Latitude</FormLabel>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Longitude</FormLabel>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleCreateChart}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Generate Rule Modal */}
      <Modal isOpen={isRuleModalOpen} onClose={onRuleModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Generate Rule with AI</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Describe the scheduling rule you want</FormLabel>
              <Textarea
                value={ruleRequest}
                onChange={(e) => setRuleRequest(e.target.value)}
                placeholder="e.g., Suggest best times for important meetings based on favorable transits"
                rows={4}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRuleModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={handleGenerateRule}
              isLoading={generatingRule}
            >
              Generate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

export default ChartManager;
