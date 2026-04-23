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
import { useTranslation } from 'react-i18next';
import { SavedChart } from '../types/chart';
import { useChartStore } from '../store/chartStore';
import { ChartCreator } from '../components/common/ChartCreator';

const ChartLibrary: React.FC = () => {
  const { t } = useTranslation();
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
        title: t('chartLibrary.toastDeleted'),
        description: t('chartLibrary.toastDeletedDesc', { name: chartToDelete.name }),
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: t('chartLibrary.toastDeleteFailed'),
        description: t('chartLibrary.toastDeleteFailedDesc'),
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
          <Heading size="xl">📚 {t('chartLibrary.title')}</Heading>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="green"
            size="lg"
            onClick={() => setShowCreator(true)}
          >
            {t('chartLibrary.newChart')}
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
            <Text>{t('chartLibrary.loadingCharts')}</Text>
          </VStack>
        )}

        {/* Empty State */}
        {!isLoading && charts.length === 0 && !error && (
          <Card>
            <CardBody textAlign="center" py={12}>
              <VStack spacing={4}>
                <Text fontSize="6xl">📊</Text>
                <Heading size="md" color="gray.600">
                  {t('chartLibrary.noChartsYet')}
                </Heading>
                <Text color="gray.500" maxW="md">
                  {t('chartLibrary.emptyDescription')}
                </Text>
                <Button
                  leftIcon={<AddIcon />}
                  colorScheme="green"
                  size="lg"
                  onClick={() => setShowCreator(true)}
                  mt={4}
                >
                  {t('chartLibrary.createFirst')}
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
                          {t(`chartLibrary.types.${chart.type}`, chart.type)}
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
                            {t('chartLibrary.viewChart')}
                          </MenuItem>
                          <MenuItem icon={<EditIcon />}>
                            {t('chartLibrary.editDetails')}
                          </MenuItem>
                          <MenuItem icon={<CalendarIcon />}>
                            {t('chartLibrary.dailyReading')}
                          </MenuItem>
                          <Divider />
                          <MenuItem
                            icon={<DeleteIcon />}
                            color="red.500"
                            onClick={() => confirmDelete(chart)}
                          >
                            {t('chartLibrary.delete')}
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
                        {t('chartLibrary.viewChart')}
                      </Button>
                      <Button size="sm" variant="outline" flex={1}>
                        {t('chartLibrary.dailyReading')}
                      </Button>
                    </HStack>

                    {/* Created Date */}
                    <Text fontSize="xs" color="gray.400" textAlign="right">
                      {t('chartLibrary.createdOn', { date: format(new Date(chart.createdAt), 'MMM d, yyyy') })}
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
                  <Text fontSize="sm" color="gray.600">{t('chartLibrary.totalCharts')}</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold">
                    {charts.filter(c => c.type === 'natal').length}
                  </Text>
                  <Text fontSize="sm" color="gray.600">{t('chartLibrary.natalCharts')}</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold">
                    {charts.filter(c => c.type === 'event').length}
                  </Text>
                  <Text fontSize="sm" color="gray.600">{t('chartLibrary.eventCharts')}</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold">
                    {charts.filter(c => c.type === 'question').length}
                  </Text>
                  <Text fontSize="sm" color="gray.600">{t('chartLibrary.horaryCharts')}</Text>
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
              {t('chartLibrary.deleteChart')}
            </AlertDialogHeader>

            <AlertDialogBody>
              {t('chartLibrary.deleteConfirm', { name: chartToDelete?.name ?? '' })}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button colorScheme="red" onClick={handleDeleteChart} ml={3}>
                {t('chartLibrary.delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
};

export default ChartLibrary;