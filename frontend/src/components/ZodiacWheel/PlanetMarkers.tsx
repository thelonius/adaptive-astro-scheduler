import React from 'react';
import { motion } from 'framer-motion';
import type { CelestialBody } from '@adaptive-astro/shared/types';
import type { ColorScheme, PlanetPosition } from './types';
import {
  getPlanetSymbol,
  longitudeToAngle,
  polarToCartesian
} from './utils';

interface PlanetMarkersProps {
  positions: PlanetPosition[];
  colorScheme: ColorScheme;
  showRetrogrades: boolean;
  voidMoon?: { isVoid: boolean; voidStart?: string; voidEnd?: string };
  onPlanetHover?: (planet: CelestialBody | null) => void;
  onClusterHover?: (planets: CelestialBody[], position: { x: number; y: number }) => void;
  onClusterClick?: (planets: CelestialBody[], position: { x: number; y: number }) => void;
  size: number;
  chartRotation?: number;
}

export const PlanetMarkers: React.FC<PlanetMarkersProps> = ({
  positions,
  colorScheme,
  showRetrogrades,
  voidMoon,
  onPlanetHover,
  onClusterHover,
  onClusterClick,
  size,
  chartRotation = 0,
}) => {
  return (
    <g id="planets">
      {/* Render all planet markers along orbit, using individual spacing */}
      {positions.map((pos, _i) => {
        const planet = pos.planet;
        const color = colorScheme.planets?.[planet.name] || '#fff';
        const isRetrograde = planet.isRetrograde && showRetrogrades;
        const isVoidMoon = planet.name === 'Moon' && voidMoon?.isVoid === true;
        const planetRadius = size * 0.015; // Fixed small radius for all markers

        // Inner ring exact point calculation
        const exactAngle = longitudeToAngle(planet.longitude, chartRotation);
        const _pointOnRing = polarToCartesian(size / 2, size / 2, size * 0.38, exactAngle);

        return (
          <g
            key={`planet-${planet.name}`}
            onMouseEnter={() => {
              if (pos.clustered && pos.clusterIndex !== undefined) {
                const clusterPos = positions.filter(p => p.clustered && p.clusterIndex === pos.clusterIndex);
                if (clusterPos.length > 1) {
                  onClusterHover?.(clusterPos.map(p => p.planet), { x: pos.x, y: pos.y });
                  return;
                }
              }
              onPlanetHover?.(planet);
            }}
            onMouseLeave={() => {
              if (pos.clustered && pos.clusterIndex !== undefined) {
                const clusterPos = positions.filter(p => p.clustered && p.clusterIndex === pos.clusterIndex);
                if (clusterPos.length > 1) {
                  onClusterHover?.([], { x: 0, y: 0 });
                  return;
                }
              }
              onPlanetHover?.(null);
            }}
            onClick={() => {
              if (pos.clustered && pos.clusterIndex !== undefined) {
                const clusterPos = positions.filter(p => p.clustered && p.clusterIndex === pos.clusterIndex);
                if (clusterPos.length > 1) {
                  onClusterClick?.(clusterPos.map(p => p.planet), { x: pos.x, y: pos.y });
                }
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* Exact precise line to inner wheel degree - Temporarily removed due to display artifact */}

            {/* Traditional Rx text */}
            {isRetrograde && (
              <text
                x={pos.x + 8}
                y={pos.y + 8}
                fill="#ff4444"
                fontSize={size * 0.015}
                fontWeight="bold"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                ℞
              </text>
            )}

            {/* Pulsating retrograde circle (kept for visibility) */}
            {isRetrograde && (
              <motion.circle
                cx={pos.x} cy={pos.y}
                r={planetRadius * 1.5}
                fill="none" stroke="#ff4444" strokeWidth={1} strokeDasharray="2 2"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Void of Course Moon Pulsating Aura */}
            {isVoidMoon && (
              <motion.circle
                cx={pos.x} cy={pos.y}
                r={planetRadius * 1.8}
                fill="none"
                stroke="#a0aec0"
                strokeWidth={2}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
            )}

            <motion.text
              x={pos.x} y={pos.y}
              textAnchor="middle" dominantBaseline="middle"
              fill={color}
              fontSize={size * 0.025}
              fontWeight="bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
            >
              {getPlanetSymbol(planet.name)}
            </motion.text>
          </g>
        );
      })}
    </g>
  );
};
