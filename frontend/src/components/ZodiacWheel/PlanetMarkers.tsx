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

interface PlanetMarkersProps {
  positions: PlanetPosition[];
  colorScheme: ColorScheme;
  showRetrogrades: boolean;
  onPlanetHover?: (planet: CelestialBody | null) => void;
  size: number;
}

export const PlanetMarkers: React.FC<PlanetMarkersProps> = ({
  positions,
  colorScheme,
  showRetrogrades,
  onPlanetHover,
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

    // Create combined text showing all planets in cluster
    const planetSymbols = planets.map(pos => getPlanetSymbol(pos.planet.name)).join(' ');
    const planetNames = planets.map(pos => pos.planet.name).join(', ');

    return (
      <g key={`cluster-label-${index}`}>
        {/* Label background */}
        <motion.rect
          x={labelX - 30}
          y={labelY - 15}
          width={60}
          height={30}
          rx={8}
          fill="rgba(0,0,0,0.8)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.5, duration: 0.3 }}
        />

        {/* Combined planet symbols */}
        <motion.text
          x={labelX}
          y={labelY - 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          fontSize={size * 0.018}
          fontWeight="bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.6 }}
        >
          {planetSymbols}
        </motion.text>

        {/* Planet count indicator */}
        <motion.text
          x={labelX}
          y={labelY + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#cccccc"
          fontSize={size * 0.012}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: index * 0.1 + 0.7 }}
        >
          {planets.length} planets
        </motion.text>

        {/* Connection line to cluster center */}
        <motion.line
          x1={labelX}
          y1={labelY + 15}
          x2={planets[0].x + (planets[planets.length - 1].x - planets[0].x) / 2}
          y2={planets[0].y + (planets[planets.length - 1].y - planets[0].y) / 2}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
          strokeDasharray="3,3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ delay: index * 0.1 + 0.8, duration: 0.5 }}
        />
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
