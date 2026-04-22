import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Heading,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  Text,
  Badge,
  IconButton,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  SimpleGrid,
  Spinner,
  Alert,
  AlertIcon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Tag,
  TagLabel,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { 
  AddIcon, 
  DeleteIcon, 
  EditIcon, 
  ViewIcon, 
  ChevronDownIcon,
  CalendarIcon,
  InfoIcon
} from '@chakra-ui/icons';
import { format } from 'date-fns';
import { SavedChart } from '../types/chart';
import { useChartStore } from '../store/chartStore';
import { ChartCreator } from '../components/common/ChartCreator';

const ChartLibrary: React.FC = () => {
  const { charts, isLoading, error, loadCharts, deleteChart } = useChartStore();
  const [showCreator, setShowCreator] = useState(false);
  const [_selectedChart, _setSelectedChart] = useState<SavedChart | null>(null);
  const [chartToDelete, setChartToDelete] = useState<SavedChart | null>(null);
  
  const toast = useToast();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  const handleDeleteChart = async () => {
    if (!chartToDelete) return;

    try {
      await deleteChart(chartToDelete.id);
      toast({
        title: 'Chart deleted',
        description: `"${chartToDelete.name}" has been removed`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Unable to delete the chart',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setChartToDelete(null);
      onClose();
    }
  };

  const confirmDelete = (chart: SavedChart) => {
    setChartToDelete(chart);
    onOpen();
  };

  const handleViewChart = (chart: SavedChart) => {
    navigate(`/natal-chart/${chart.id}`);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'natal': return 'green';
      case 'event': return 'blue';
      case 'question': return 'purple';
      default: return 'gray';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'natal': return '👶';
      case 'event': return '✨';
      case 'question': return '❓';
      default: return '📊';
    }
  };

  if (showCreator) {
    return (
      <Container maxW="container.lg" py={8}>
        <ChartCreator
          onChartCreated={() => {
            setShowCreator(false);
            loadCharts();
          }}
          onCancel={() => setShowCreator(false)}
        />
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        
        {/* Header */}
        <HStack justify="space-between" align="center">
          <Heading size="xl">📚 Chart Library</Heading>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="green"
            size="lg"
            onClick={() => setShowCreator(true)}
          >
            New Chart
          </Button>
        </HStack>

        {/* Error Display */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <VStack spacing={4} py={8}>
            <Spinner size="xl" />
            <Text>Loading your charts...</Text>
          </VStack>
        )}

        {/* Empty State */}
        {!isLoading && charts.length === 0 && !error && (
          <Card>
            <CardBody textAlign="center" py={12}>
              <VStack spacing={4}>
                <Text fontSize="6xl">📊</Text>
                <Heading size="md" color="gray.600">
                  No charts yet
                </Heading>
                <Text color="gray.500" maxW="md">
                  Create your first chart to start exploring astrological insights. 
                  You can create natal charts, event charts, or horary question charts.
                </Text>
                <Button
                  leftIcon={<AddIcon />}
                  colorScheme="green"
                  size="lg"
                  onClick={() => setShowCreator(true)}
                  mt={4}
                >
                  Create Your First Chart
                </Button>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Chart Grid */}
        {!isLoading && charts.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {charts.map((chart) => (
              <Card key={chart.id} shadow="md" _hover={{ shadow: 'lg' }}>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    
                    {/* Chart Header */}
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          <Text fontSize="lg">{getTypeIcon(chart.type)}</Text>
                          <Heading size="md" noOfLines={2}>
                            {chart.name}
                          </Heading>
                        </HStack>
                        <Badge colorScheme={getTypeColor(chart.type)} size="sm">
                          {chart.type}
                        </Badge>
                      </VStack>
                      
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<ChevronDownIcon />}
                          variant="ghost"
                          size="sm"
                        />
                        <MenuList>
                          <MenuItem 
                            icon={<ViewIcon />}
                            onClick={() => handleViewChart(chart)}
                          >
                            View Chart
                          </MenuItem>
                          <MenuItem icon={<EditIcon />}>
                            Edit Details
                          </MenuItem>
                          <MenuItem icon={<CalendarIcon />}>
                            Daily Reading
                          </MenuItem>
                          <Divider />
                          <MenuItem 
                            icon={<DeleteIcon />} 
                            color="red.500"
                            onClick={() => confirmDelete(chart)}
                          >
                            Delete
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>

                    {/* Chart Info */}
                    <VStack spacing={2} align="start" fontSize="sm">
                      <HStack>
                        <CalendarIcon color="gray.500" />
                        <Text>
                          {format(new Date(chart.date), 'MMMM d, yyyy')} at {chart.time}
                        </Text>
                      </HStack>
                      
                      <HStack>
                        <Text>📍</Text>
                        <Text color="gray.600">
                          {chart.location.city}, {chart.location.country}
                        </Text>
                      </HStack>

                      {chart.description && (
                        <HStack align="start">
                          <InfoIcon color="gray.500" mt={0.5} />
                          <Text color="gray.600" noOfLines={2}>
                            {chart.description}
                          </Text>
                        </HStack>
                      )}
                    </VStack>

                    {/* Tags */}
                    {chart.tags && chart.tags.length > 0 && (
                      <Wrap>
                        {chart.tags.map((tag) => (
                          <WrapItem key={tag}>
                            <Tag size="sm" colorScheme="blue">
                              <TagLabel>{tag}</TagLabel>
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    )}

                    {/* Action Buttons */}
                    <HStack spacing={2} pt={2}>
                      <Button 
                        size="sm" 
                        colorScheme="blue" 
                        flex={1}
                        onClick={() => handleViewChart(chart)}
                      >
                        View Chart
                      </Button>
                      <Button size="sm" variant="outline" flex={1}>
                        Daily Reading
                      </Button>
                    </HStack>

                    {/* Created Date */}
                    <Text fontSize="xs" color="gray.400" textAlign="right">
                      Created {format(new Date(chart.createdAt), 'MMM d, yyyy')}
                    </Text>

                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}

        {/* Stats Summary */}
        {!isLoading && charts.length > 0 && (
          <Card bg="gray.50">
            <CardBody>
              <HStack justify="center" spacing={8}>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold">{charts.length}</Text>
                  <Text fontSize="sm" color="gray.600">Total Charts</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold">
                    {charts.filter(c => c.type === 'natal').length}
                  </Text>
                  <Text fontSize="sm" color="gray.600">Natal Charts</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold">
                    {charts.filter(c => c.type === 'event').length}
                  </Text>
                  <Text fontSize="sm" color="gray.600">Event Charts</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold">
                    {charts.filter(c => c.type === 'question').length}
                  </Text>
                  <Text fontSize="sm" color="gray.600">Horary Charts</Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        )}

      </VStack>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Chart
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{chartToDelete?.name}"? 
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteChart} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
};

export default ChartLibrary;