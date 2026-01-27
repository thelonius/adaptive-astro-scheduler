import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CelestialBody } from '@adaptive-astro/shared/types';
import type { ColorScheme, PlanetPosition } from './types';
import {
  getPlanetSymbol,
  formatPlanetDegree,
  groupPlanetsByCluster,
  calculateCombinedClusterLabel
} from './utils';
import { analyzeCluster } from '../../constants/clusterAnalysis';

interface PlanetMarkersProps {
  positions: PlanetPosition[];
  colorScheme: ColorScheme;
  showRetrogrades: boolean;
  onPlanetHover?: (planet: CelestialBody | null) => void;
  onClusterHover?: (planets: CelestialBody[], position: { x: number; y: number }) => void;
  onClusterClick?: (planets: CelestialBody[], position: { x: number; y: number }) => void;
  size: number;
}

export const PlanetMarkers: React.FC<PlanetMarkersProps> = ({
  positions,
  colorScheme,
  showRetrogrades,
  onPlanetHover,
  onClusterHover,
  onClusterClick,
  size,
}) => {
  // Group planets by clusters for combined labeling
  const planetGroups = useMemo(() => {
    return groupPlanetsByCluster(positions);
  }, [positions]);

  // Calculate combined cluster labels
  const clusterLabels = useMemo(() => {
    const centerX = size / 2;
    const centerY = size / 2;
    return planetGroups.clusteredGroups.map(cluster =>
      calculateCombinedClusterLabel(cluster, centerX, centerY)
    );
  }, [planetGroups.clusteredGroups, size]);

  const getPlanetRadius = (pos: PlanetPosition) => {
    // Slightly smaller radius for clustered planets
    const baseRadius = size * 0.015;
    return pos.clustered ? baseRadius * 0.8 : baseRadius;
  };

  const renderCombinedClusterLabel = (clusterLabel: ReturnType<typeof calculateCombinedClusterLabel>, index: number) => {
    const planets = clusterLabel.planets;
    const labelX = clusterLabel.x;
    const labelY = clusterLabel.y;

    // Analyze cluster for enhanced visuals
    const clusterBodies = planets.map(p => p.planet);
    const analysis = clusterBodies.length >= 2 ? analyzeCluster(clusterBodies) : null;

    // Create combined text showing all planets in cluster
    const planetSymbols = planets.map(pos => getPlanetSymbol(pos.planet.name)).join(' ');

    // Get cluster type colors
    const getClusterGlow = () => {
      if (!analysis) return 'rgba(255,255,255,0.1)';
      switch (analysis.clusterType) {
        case 'tight': return 'rgba(255,100,100,0.3)';
        case 'moderate': return 'rgba(255,165,0,0.25)';
        case 'loose': return 'rgba(255,255,0,0.2)';
        default: return 'rgba(255,255,255,0.1)';
      }
    };

    // Helper for cluster color
    const getClusterColor = (type: string | undefined) => {
      switch (type) {
        case 'tight': return '#ff6464';
        case 'moderate': return '#ffa500';
        case 'loose': return '#ffff00';
        default: return '#ffffff';
      }
    };

    const clusterColor = getClusterColor(analysis?.clusterType);
    const gradientId = `cluster-gradient-${index}`;

    const handleClusterMouseEnter = (e: React.MouseEvent) => {
      if (onClusterHover) {
        onClusterHover(
          planets.map(p => p.planet),
          { x: e.clientX, y: e.clientY }
        );
      }
    };

    const handleClusterMouseLeave = () => {
      if (onClusterHover) {
        onClusterHover([], { x: 0, y: 0 });
      }
    };

    const handleClusterClick = (e: React.MouseEvent) => {
      if (onClusterClick) {
        onClusterClick(
          planets.map(p => p.planet),
          { x: e.clientX, y: e.clientY }
        );
      }
    };

    return (
      <g key={`cluster-label-${index}`}
        style={{ cursor: 'pointer' }}
        onMouseEnter={handleClusterMouseEnter}
        onMouseLeave={handleClusterMouseLeave}
        onClick={handleClusterClick}
      >
        <defs>
          <radialGradient id={gradientId}>
            <stop offset="0%" stopColor={clusterColor} stopOpacity="0.4" />
            <stop offset="50%" stopColor={clusterColor} stopOpacity="0.1" />
            <stop offset="100%" stopColor={clusterColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Draw the gradient field "blobs" for each planet in the cluster */}
        <g style={{ mixBlendMode: 'screen' }}>
          {planets.map((p, i) => (
            <motion.circle
              key={`field-${i}`}
              cx={p.x}
              cy={p.y}
              r={size * 0.08} // Large radius for the field
              fill={`url(#${gradientId})`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            />
          ))}
        </g>

        {/* Combined planet symbols centered on the label position 
            Note: labelX/Y comes from the cluster centroid calculation in utils 
        */}
        <motion.text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          fontSize={size * 0.018}
          fontWeight="bold"
          paintOrder="stroke"
          stroke="#000"
          strokeWidth="3px"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.6 }}
        >
          {planetSymbols}
        </motion.text>

        {/* Count indicator */}
        <motion.text
          x={labelX}
          y={labelY + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={analysis?.clusterType === 'tight' ? '#ff9999' :
            analysis?.clusterType === 'moderate' ? '#ffcc99' : '#cccccc'}
          fontSize={size * 0.012}
          fontWeight={analysis?.clusterType === 'tight' ? 'bold' : 'normal'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ delay: index * 0.1 + 0.7 }}
          style={{ textShadow: '0 0 2px black' }}
        >
          {planets.length} {analysis?.clusterType === 'tight' ? '★' :
            analysis?.clusterType === 'moderate' ? '◆' : '●'}
        </motion.text>
      </g>
    );
  };

  return (
    <g id="planets">
      {/* Render combined cluster labels */}
      {clusterLabels.map((clusterLabel, index) =>
        renderCombinedClusterLabel(clusterLabel, index)
      )}

      {/* Render all planet markers (clustered and individual) */}
      {positions.map((pos, i) => {
        const planet = pos.planet;
        const color = colorScheme.planets?.[planet.name] || '#fff';
        const isRetrograde = planet.isRetrograde && showRetrogrades;
        const planetRadius = getPlanetRadius(pos);
        const isInCluster = pos.clustered && planetGroups.clusteredGroups.some(cluster =>
          cluster.some(p => p.planet.name === planet.name)
        );

        return (
          <g
            key={`planet-${planet.name}`}
            onMouseEnter={() => onPlanetHover?.(planet)}
            onMouseLeave={() => onPlanetHover?.(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Planet glow effect */}
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={planetRadius * (pos.clustered ? 1.8 : 2.5)}
              fill={color}
              opacity={pos.clustered ? 0.08 : 0.15}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
                delay: i * 0.05,
              }}
            />

            {/* Planet marker circle */}
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={planetRadius}
              fill={color}
              stroke={pos.clustered ? '#ffffff' : (isRetrograde ? '#ff6b6b' : color)}
              strokeWidth={pos.clustered ? 1.5 : (isRetrograde ? 2 : 1)}
              opacity={0.9}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
                delay: i * 0.05,
              }}
            />

            {/* Cluster indicator dot */}
            {pos.clustered && (
              <motion.circle
                cx={pos.x + planetRadius * 0.7}
                cy={pos.y - planetRadius * 0.7}
                r={2}
                fill="#ffffff"
                opacity={0.8}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 + 0.3 }}
              />
            )}

            {/* Individual labels for non-clustered planets */}
            {!isInCluster && (
              <>
                <motion.text
                  x={pos.x + 15}
                  y={pos.y - 15}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={color}
                  fontSize={size * 0.025}
                  fontWeight="bold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 + 0.2 }}
                  style={{
                    textShadow: '0 0 3px rgba(0,0,0,0.8)'
                  }}
                >
                  {getPlanetSymbol(planet.name)}
                </motion.text>

                <motion.text
                  x={pos.x + 15}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={colorScheme.zodiacText}
                  fontSize={size * 0.015}
                  opacity={0.7}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: i * 0.05 + 0.25 }}
                >
                  {formatPlanetDegree(planet.longitude)}
                </motion.text>
              </>
            )}

            {/* Retrograde indicator */}
            {isRetrograde && (
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r={planetRadius + 4}
                fill="none"
                stroke="#ff6b6b"
                strokeWidth={1}
                strokeDasharray="2,2"
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{
                  scale: [0.8, 1.1, 0.8],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
          </g>
        );
      })}
    </g>
  );
};
