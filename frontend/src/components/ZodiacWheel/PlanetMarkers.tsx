import React from 'react';
import { motion } from 'framer-motion';
import type { CelestialBody } from '@adaptive-astro/shared/types';
import type { ColorScheme, PlanetPosition } from './types';
import { getPlanetSymbol, formatPlanetDegree } from './utils';

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
  const planetRadius = size * 0.015;
  const labelOffset = size * 0.04;

  return (
    <g id="planets">
      {positions.map((pos, i) => {
        const planet = pos.planet;
        const color = colorScheme.planets?.[planet.name] || '#fff';
        const symbol = getPlanetSymbol(planet.name);
        const isRetrograde = planet.isRetrograde && showRetrogrades;

        // Calculate label position (outside the planet marker)
        const labelAngle = (pos.angle - 90) * Math.PI / 180;
        const labelX = pos.x + Math.cos(labelAngle) * labelOffset;
        const labelY = pos.y + Math.sin(labelAngle) * labelOffset;

        return (
          <g
            key={`planet-${planet.name}`}
            onMouseEnter={() => onPlanetHover?.(planet)}
            onMouseLeave={() => onPlanetHover?.(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Planet glow effect (larger hover target) */}
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={planetRadius * 2.5}
              fill={color}
              opacity={0.15}
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
              stroke={isRetrograde ? '#ff6b6b' : color}
              strokeWidth={isRetrograde ? 2 : 1}
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

            {/* Planet symbol */}
            <motion.text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={color}
              fontSize={size * 0.025}
              fontWeight="bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 + 0.2 }}
            >
              {symbol}
            </motion.text>

            {/* Retrograde indicator */}
            {isRetrograde && (
              <motion.text
                x={labelX + size * 0.02}
                y={labelY - size * 0.02}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ff6b6b"
                fontSize={size * 0.02}
                fontWeight="bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 + 0.3 }}
              >
                ℞
              </motion.text>
            )}

            {/* Degree label (small text below symbol) */}
            <motion.text
              x={labelX}
              y={labelY + size * 0.025}
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
          </g>
        );
      })}
    </g>
  );
};
