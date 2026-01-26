import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { House } from '@adaptive-astro/shared/types';
import type { ColorScheme } from './types';
import { longitudeToAngle, polarToCartesian } from './utils';
import { HouseTooltip } from './HouseTooltip';
import { getHouseMeaning, isAngularHouse } from '../../constants/houses';

interface HousesOverlayProps {
  houses: House[];
  size: number;
  colorScheme: ColorScheme;
  onHouseHover?: (houseNumber: number | null, position: { x: number; y: number }) => void;
}

export const HousesOverlay: React.FC<HousesOverlayProps> = ({ houses, size, colorScheme, onHouseHover }) => {
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);

  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.35;
  const innerRadius = size * 0.1;

  const handleMouseEnter = useCallback((houseNumber: number, event: React.MouseEvent) => {
    const rect = (event.target as Element).getBoundingClientRect();
    const position = {
      x: event.clientX,
      y: event.clientY
    };
    setHoveredHouse(houseNumber);
    onHouseHover?.(houseNumber, position);
  }, [onHouseHover]);

  const handleMouseLeave = useCallback(() => {
    setHoveredHouse(null);
    onHouseHover?.(null, { x: 0, y: 0 });
  }, [onHouseHover]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (hoveredHouse) {
      const position = {
        x: event.clientX,
        y: event.clientY
      };
      onHouseHover?.(hoveredHouse, position);
    }
  }, [hoveredHouse, onHouseHover]);

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

        // Create arc path for hover area
        const nextHouseAngle = longitudeToAngle(nextHouse.cusp);
        const largeArcFlag = Math.abs(angle - nextHouseAngle) > 180 ? 1 : 0;

        const outerStart = polarToCartesian(centerX, centerY, outerRadius, angle);
        const outerEnd = polarToCartesian(centerX, centerY, outerRadius, nextHouseAngle);
        const innerStart = polarToCartesian(centerX, centerY, innerRadius, angle);
        const innerEnd = polarToCartesian(centerX, centerY, innerRadius, nextHouseAngle);

        const hoverPath = `
          M ${outerStart.x} ${outerStart.y}
          A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}
          L ${innerEnd.x} ${innerEnd.y}
          A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}
          Z
        `;

        // Special styling for angular houses (1, 4, 7, 10)
        const isAngular = isAngularHouse(house.number);

        return (
          <g
            key={`house-${house.number}`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => handleMouseEnter(house.number, e)}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
          >
            {/* House cusp line */}
            <motion.line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={hoveredHouse === house.number ? '#ffd700' : colorScheme.houses}
              strokeWidth={hoveredHouse === house.number ? (isAngular ? 3 : 2) : (isAngular ? 2 : 1)}
              opacity={hoveredHouse === house.number ? 0.8 : (isAngular ? 0.6 : 0.3)}
              strokeDasharray={isAngular ? 'none' : '3 3'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: i * 0.05 }}
            />

            {/* House highlight area (when hovered) */}
            {hoveredHouse === house.number && (
              <motion.path
                d={hoverPath}
                fill={colorScheme.houses}
                fillOpacity={0.1}
                stroke={'#ffd700'}
                strokeWidth={0.5}
                strokeOpacity={0.3}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}

            {/* Invisible hover area for better interaction */}
            <path
              d={hoverPath}
              fill="transparent"
              strokeWidth={0}
              style={{ cursor: 'pointer' }}
            />

            {/* House number */}
            <motion.text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={hoveredHouse === house.number ? '#ffd700' : colorScheme.houses}
              fontSize={size * 0.025}
              fontWeight={isAngular ? 'bold' : 'normal'}
              opacity={hoveredHouse === house.number ? 1 : 0.7}
              initial={{ opacity: 0 }}
              animate={{ opacity: hoveredHouse === house.number ? 1 : 0.7 }}
              transition={{ delay: i * 0.05 + 0.5, duration: 0.2 }}
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
