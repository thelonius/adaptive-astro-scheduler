import React from 'react';
import { motion } from 'framer-motion';
import type { House } from '@adaptive-astro/shared/types';
import type { ColorScheme } from './types';
import { longitudeToAngle, polarToCartesian } from './utils';

interface HousesOverlayProps {
  houses: House[];
  size: number;
  colorScheme: ColorScheme;
}

export const HousesOverlay: React.FC<HousesOverlayProps> = ({ houses, size, colorScheme }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.35;
  const innerRadius = size * 0.1;

  return (
    <g id="houses">
      {/* House divisions */}
      {houses.map((house, i) => {
        const angle = longitudeToAngle(house.cusp);
        const outer = polarToCartesian(centerX, centerY, outerRadius, angle);
        const inner = polarToCartesian(centerX, centerY, innerRadius, angle);

        // Calculate midpoint angle for house number
        const nextHouse = houses[(i + 1) % houses.length];
        const nextAngle = longitudeToAngle(nextHouse.cusp);
        let midAngle = (angle + nextAngle) / 2;

        // Handle angle wrapping
        if (Math.abs(angle - nextAngle) > 180) {
          midAngle = midAngle < 0 ? midAngle + 180 : midAngle - 180;
        }

        const labelRadius = (outerRadius + innerRadius) / 2;
        const label = polarToCartesian(centerX, centerY, labelRadius, midAngle);

        // Special styling for angular houses (1, 4, 7, 10)
        const isAngular = house.number === 1 || house.number === 4 || house.number === 7 || house.number === 10;

        return (
          <g key={`house-${house.number}`}>
            {/* House cusp line */}
            <motion.line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={colorScheme.houses}
              strokeWidth={isAngular ? 2 : 1}
              opacity={isAngular ? 0.6 : 0.3}
              strokeDasharray={isAngular ? 'none' : '3 3'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: i * 0.05 }}
            />

            {/* House number */}
            <motion.text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={colorScheme.houses}
              fontSize={size * 0.025}
              fontWeight={isAngular ? 'bold' : 'normal'}
              opacity={0.7}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: i * 0.05 + 0.5 }}
            >
              {house.number}
            </motion.text>
          </g>
        );
      })}

      {/* Houses ring */}
      <circle
        cx={centerX}
        cy={centerY}
        r={outerRadius}
        fill="none"
        stroke={colorScheme.houses}
        strokeWidth={1}
        opacity={0.3}
      />
      <circle
        cx={centerX}
        cy={centerY}
        r={innerRadius}
        fill="none"
        stroke={colorScheme.houses}
        strokeWidth={1}
        opacity={0.3}
      />
    </g>
  );
};
