import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Spinner,
  Switch,
  Text,
  VStack,
  useToast,
  Badge,
  Input,
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
} from '@chakra-ui/react';
import { FaTrash, FaPlus } from 'react-icons/fa';
import apiService, { Layer } from '../services/api';

function LayerManager() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerDescription, setNewLayerDescription] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchLayers = async () => {
    try {
      const response = await apiService.getLayers();
      setLayers(response.data.data);
    } catch (error) {
      toast({
        title: 'Error loading layers',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayers();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await apiService.toggleLayer(id);
      await fetchLayers();
      toast({
        title: 'Layer toggled',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Error toggling layer',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteLayer(id);
      await fetchLayers();
      toast({
        title: 'Layer deleted',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Error deleting layer',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleCreate = async () => {
    if (!newLayerName || !newLayerDescription) {
      toast({
        title: 'Please fill all fields',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    try {
      await apiService.createLayer({
        name: newLayerName,
        description: newLayerDescription,
        config: {},
      });
      await fetchLayers();
      setNewLayerName('');
      setNewLayerDescription('');
      onClose();
      toast({
        title: 'Layer created',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Error creating layer',
        status: 'error',
        duration: 3000,
      });
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
        <Heading size="md">Layer Management</Heading>
        <Button leftIcon={<FaPlus />} colorScheme="purple" onClick={onOpen}>
          Create Custom Layer
        </Button>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {layers.map((layer) => (
          <Box key={layer.id} bg="white" p={4} borderRadius="lg" shadow="md">
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Badge colorScheme={layer.type === 'custom' ? 'green' : 'blue'}>
                  {layer.type}
                </Badge>
                <HStack>
                  <Switch
                    isChecked={layer.active}
                    onChange={() => handleToggle(layer.id)}
                    colorScheme="purple"
                  />
                  {layer.type === 'custom' && (
                    <IconButton
                      aria-label="Delete layer"
                      icon={<FaTrash />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => handleDelete(layer.id)}
                    />
                  )}
                </HStack>
              </HStack>

              <Box>
                <Text fontWeight="bold">{layer.name}</Text>
                <Text fontSize="sm" color="gray.600">
                  {layer.description}
                </Text>
              </Box>

              <Text fontSize="xs" color="gray.500">
                Priority: {layer.priority}
              </Text>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Custom Layer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={newLayerName}
                  onChange={(e) => setNewLayerName(e.target.value)}
                  placeholder="Enter layer name"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={newLayerDescription}
                  onChange={(e) => setNewLayerDescription(e.target.value)}
                  placeholder="Enter layer description"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleCreate}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

export default LayerManager;
