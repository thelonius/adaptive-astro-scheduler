import React, { useState, useEffect } from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  List,
  ListItem,
  Button,
  Spinner,
  Text,
  useToast,
} from '@chakra-ui/react';
import { ChartFormData, GeocodeResult } from '../../types/chart';
import { geocodingService } from '../../services/chartService';

interface LocationPickerProps {
  value: ChartFormData['location'];
  onChange: (location: ChartFormData['location']) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange }) => {
  const [searchQuery, setSearchQuery] = useState(value.city || '');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const toast = useToast();

  const handleSearch = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await geocodingService.searchLocations(query);
      setSearchResults(results.slice(0, 5)); // Limit to 5 results
      setShowResults(true);
      
      if (results.length === 0) {
        toast({
          title: 'No results found',
          description: 'Try a different search term or city name',
          status: 'info',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Location search failed:', error);
      toast({
        title: 'Search failed',
        description: 'Unable to search for locations. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleLocationSelect = (result: GeocodeResult) => {
    const newLocation: ChartFormData['location'] = {
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.city,
      country: result.country,
      timezone: result.timezone || 'UTC'
    };
    
    onChange(newLocation);
    setSearchQuery(newLocation.city);
    setSearchResults([]);
    setShowResults(false);
    
    toast({
      title: 'Location set',
      description: `${newLocation.city}`,
      status: 'success',
      duration: 2000,
    });
  };

  return (
    <FormControl position="relative">
      <FormLabel>City</FormLabel>
      <InputGroup>
        <Input
          placeholder="Enter city name..."
          value={searchQuery}
          onChange={handleInputChange}
        />
        <InputRightElement>
          {isSearching && <Spinner size="sm" />}
        </InputRightElement>
      </InputGroup>
      
      {showResults && searchResults.length > 0 && (
        <List
          mt={1}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          maxHeight="200px"
          overflowY="auto"
          bg="white"
          position="absolute"
          zIndex={1000}
          width="100%"
          boxShadow="md"
        >
          {searchResults.map((result, index) => (
            <ListItem
              key={index}
              p={3}
              cursor="pointer"
              _hover={{ bg: 'gray.100' }}
              onClick={() => handleLocationSelect(result)}
              borderBottom={index < searchResults.length - 1 ? '1px solid' : 'none'}
              borderColor="gray.100"
            >
              <Text fontSize="sm" fontWeight="medium">
                {result.city}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {result.country}
              </Text>
            </ListItem>
          ))}
        </List>
      )}
    </FormControl>
  );
};