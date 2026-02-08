import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Spinner, Text, VStack, HStack, Badge, Button } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import type { CelestialBody } from '@adaptive-astro/shared/types';
import { useZodiacData, useAdaptiveZodiacData } from '../../hooks/useZodiacData';
import { ZodiacCircle } from './ZodiacCircle';
import { PlanetMarkers } from './PlanetMarkers';
import { AspectLines } from './AspectLines';
import { HousesOverlay } from './HousesOverlay';
import { Tooltip } from './Tooltip';
import { ZodiacSignTooltip } from './ZodiacSignTooltip';
import { HouseTooltip } from './HouseTooltip';
import { ClusterTooltip } from './ClusterTooltip';
import { calculatePlanetPositions, calculateAspectLines, sortPlanetsByOrbit } from './utils';
import type { ZodiacWheelConfig, ZodiacWheelData } from './types';
import { DEFAULT_CONFIG } from './types';
import { getHouseMeaning } from '../../constants/houses';

interface ZodiacWheelProps {
  config?: Partial<ZodiacWheelConfig>;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  useAdaptiveRefresh?: boolean;
  onDataUpdate?: (data: any) => void;
  onLoadingChange?: (loading: boolean) => void;
  date?: Date | string;
  data?: ZodiacWheelData | null;
}

export const ZodiacWheel: React.FC<ZodiacWheelProps> = ({
  config: userConfig,
  latitude,
  longitude,
  timezone,
  useAdaptiveRefresh = true,
  onDataUpdate,
  onLoadingChange,
  date,
  data: externalData,
}) => {
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...userConfig }), [userConfig]);
  const [hoveredPlanet, setHoveredPlanet] = useState<CelestialBody | null>(null);
  const [hoveredZodiacSign, setHoveredZodiacSign] = useState<string | null>(null);
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<CelestialBody[]>([]);
  const [clickedCluster, setClickedCluster] = useState<CelestialBody[] | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [zodiacTooltipPosition, setZodiacTooltipPosition] = useState({ x: 0, y: 0 });
  const [houseTooltipPosition, setHouseTooltipPosition] = useState({ x: 0, y: 0 });
  const [clusterTooltipPosition, setClusterTooltipPosition] = useState({ x: 0, y: 0 });
  const [clickedClusterPosition, setClickedClusterPosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Always use the adaptive hook wrapper, passing the 'adaptive' flag to control behavior
  // If external data is provided, disable internal fetching
  const { data: internalData, loading: internalLoading, error, refresh, lastUpdate } = useAdaptiveZodiacData({
    refreshInterval: config.refreshInterval,
    latitude,
    longitude,
    timezone,
    includeHouses: config.showHouses,
    aspectOrb: config.aspectOrb,
    date,
    adaptive: useAdaptiveRefresh,
    enabled: !externalData, // Disable if external data provided
  });

  const data = externalData || internalData;
  const loading = externalData ? false : internalLoading; // Assume external data is loaded if provided (or handle externally)

  // Notify parent of loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  // Notify parent of data updates
  useEffect(() => {
    if (data && onDataUpdate) {
      onDataUpdate(data);
    }
  }, [data, onDataUpdate]);

  // Calculate positions
  const planetPositions = useMemo(() => {
    if (!data?.planets) return [];
    const sorted = sortPlanetsByOrbit(data.planets);
    const centerX = config.size / 2;
    const centerY = config.size / 2;
    const radius = config.size * 0.3; // Planet orbit radius
    return calculatePlanetPositions(sorted, centerX, centerY, radius);
  }, [data?.planets, config.size]);

  const aspectLines = useMemo(() => {
    if (!data?.aspects || !config.showAspects) {
      console.log('No aspects or showAspects disabled:', { aspects: data?.aspects?.length || 0, showAspects: config.showAspects });
      return [];
    }
    console.log('Processing aspects:', data.aspects.length, 'with planet positions:', planetPositions.length);
    const lines = calculateAspectLines(data.aspects, planetPositions, config.colorScheme);
    console.log('Generated aspect lines:', lines.length);
    return lines;
  }, [data?.aspects, planetPositions, config.showAspects, config.colorScheme]);

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Handle zodiac sign hover
  const handleZodiacHover = (signName: string | null, position: { x: number; y: number }) => {
    setHoveredZodiacSign(signName);
    setZodiacTooltipPosition(position);
  };

  // Handle house hover
  const handleHouseHover = (houseNumber: number | null, position: { x: number; y: number }) => {
    setHoveredHouse(houseNumber);
    setHouseTooltipPosition(position);
  };

  // Handle cluster hover
  const handleClusterHover = (planets: CelestialBody[], position: { x: number; y: number }) => {
    // Only show hover if no clicked cluster is active
    if (!clickedCluster) {
      setHoveredCluster(planets);
      setClusterTooltipPosition(position);
      // Clear individual planet hover when hovering cluster
      if (planets.length > 0) {
        setHoveredPlanet(null);
      }
    }
  };

  // Handle cluster click
  const handleClusterClick = (planets: CelestialBody[], position: { x: number; y: number }) => {
    setClickedCluster(planets);
    setClickedClusterPosition(position);
    // Hide hover tooltip when clicked
    setHoveredCluster([]);
  };

  // Close clicked tooltip
  const closeClickedTooltip = () => {
    setClickedCluster(null);
  };

  if (error) {
    return (
      <Box
        width={config.size}
        height={config.size}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={config.colorScheme.background}
        borderRadius="lg"
      >
        <VStack>
          <Text color="red.400">Error loading zodiac data</Text>
          <Text color="gray.400" fontSize="sm">
            {error.message}
          </Text>
          <Button size="sm" onClick={refresh} mt={2}>
            Retry
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box position="relative" width={config.size} height={config.size}>
      {/* Loading overlay */}
      {loading && !data && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg={config.colorScheme.background}
          borderRadius="lg"
          zIndex={10}
        >
          <VStack>
            <Spinner size="xl" color="blue.400" />
            <Text color="gray.400" mt={4}>
              Loading celestial data...
            </Text>
          </VStack>
        </Box>
      )}

      {/* Main SVG */}
      <motion.svg
        ref={svgRef}
        width={config.size}
        height={config.size}
        viewBox={`0 0 ${config.size} ${config.size}`}
        style={{
          background: config.colorScheme.background,
          borderRadius: '12px',
        }}
        onMouseMove={handleMouseMove}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <defs>
          <radialGradient id="cluster-field-gradient">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="40%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Zodiac circle (signs and degrees) */}
        <ZodiacCircle
          size={config.size}
          colorScheme={config.colorScheme}
          showDegrees={config.showDegrees}
          onZodiacHover={handleZodiacHover}
        />

        {/* Houses overlay (optional) */}
        {config.showHouses && data?.houses && (
          <HousesOverlay
            houses={data.houses}
            size={config.size}
            colorScheme={config.colorScheme}
            onHouseHover={handleHouseHover}
          />
        )}

        {/* Aspect lines */}
        {config.showAspects && aspectLines.length > 0 && (
          <>
            {console.log('Rendering AspectLines with', aspectLines.length, 'lines')}
            <AspectLines lines={aspectLines} size={config.size} />
          </>
        )}
        {config.showAspects && aspectLines.length === 0 && (
          <>
            {console.log('AspectLines: showAspects=true but no aspect lines calculated')}
          </>
        )}

        {/* Planets */}
        {planetPositions.length > 0 && (
          <PlanetMarkers
            positions={planetPositions}
            colorScheme={config.colorScheme}
            showRetrogrades={config.showRetrogrades}
            onPlanetHover={setHoveredPlanet}
            onClusterHover={handleClusterHover}
            onClusterClick={handleClusterClick}
            size={config.size}
          />
        )}
      </motion.svg>

      {/* Tooltip */}
      {hoveredPlanet && hoveredCluster.length <= 1 && (
        <Tooltip
          planet={hoveredPlanet}
          aspects={data?.aspects}
          position={mousePosition}
        />
      )}

      {/* Zodiac Sign Tooltip */}
      {hoveredZodiacSign && (
        <ZodiacSignTooltip
          signName={hoveredZodiacSign}
          position={zodiacTooltipPosition}
          isVisible={!!hoveredZodiacSign}
        />
      )}

      {/* House Tooltip */}
      {hoveredHouse && (
        <HouseTooltip
          house={getHouseMeaning(hoveredHouse)}
          houseNumber={hoveredHouse}
          position={houseTooltipPosition}
          visible={!!hoveredHouse}
        />
      )}

      {/* Cluster Tooltips */}
      {hoveredCluster.length > 1 && !clickedCluster && (
        <ClusterTooltip
          planets={hoveredCluster}
          position={clusterTooltipPosition}
          visible={hoveredCluster.length > 1}
          interactive={false}
        />
      )}

      {/* Clicked Cluster Tooltip (Interactive) */}
      {clickedCluster && clickedCluster.length > 1 && (
        <ClusterTooltip
          planets={clickedCluster}
          position={clickedClusterPosition}
          visible={true}
          interactive={true}
          onClose={closeClickedTooltip}
        />
      )}
    </Box>
  );
};

export default ZodiacWheel;

// Export additional components for external use
export { default as ZodiacIcon } from './ZodiacIcon';
