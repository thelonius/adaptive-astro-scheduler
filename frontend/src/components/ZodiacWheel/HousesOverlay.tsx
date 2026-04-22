import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { House } from '@adaptive-astro/shared/types';
import type { ColorScheme } from './types';
import { longitudeToAngle, polarToCartesian } from './utils';
import { isAngularHouse } from '../../constants/houses';

interface HousesOverlayProps {
  houses: House[];
  size: number;
  colorScheme: ColorScheme;
  onHouseHover?: (houseNumber: number | null, position: { x: number; y: number }) => void;
  chartRotation?: number;
}

export const HousesOverlay: React.FC<HousesOverlayProps> = ({ houses, size, colorScheme, onHouseHover, chartRotation = 0 }) => {
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);

  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.38; // Up to Zodiac inner ring
  const innerRadius = 0; // Extend to center completely

  const handleMouseEnter = useCallback((houseNumber: number, event: React.MouseEvent) => {
    const _rect = (event.target as Element).getBoundingClientRect();
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
        const angle = longitudeToAngle(house.cusp, chartRotation);
        const _outer = polarToCartesian(centerX, centerY, outerRadius, angle);
        const _inner = polarToCartesian(centerX, centerY, innerRadius, angle);

        // Calculate midpoint angle for house number
        const nextHouse = houses[(i + 1) % houses.length];
        const nextAngle = longitudeToAngle(nextHouse.cusp, chartRotation);
        let midAngle = (angle + nextAngle) / 2;

        // Calculate angular size of house
        let houseSize = nextHouse.cusp - house.cusp;
        if (houseSize < 0) houseSize += 360;

        // Handle angle wrapping
        if (Math.abs(angle - nextAngle) > 180) {
          midAngle = midAngle < 0 ? midAngle + 180 : midAngle - 180;
        }

        const labelRadius = size * 0.23; // Fixed radius for Roman numerals (between aspects and planets)
        const label = polarToCartesian(centerX, centerY, labelRadius, midAngle);

        // Create arc path for hover area
        const nextHouseAngle = longitudeToAngle(nextHouse.cusp, chartRotation);
        const largeArcFlag = houseSize > 180 ? 1 : 0; // Fixes overlapping/overflowing arcs on 360 boundary

        const outerStart = polarToCartesian(centerX, centerY, outerRadius, angle);
        const outerEnd = polarToCartesian(centerX, centerY, outerRadius, nextHouseAngle);
        const innerStart = polarToCartesian(centerX, centerY, innerRadius, angle);
        const innerEnd = polarToCartesian(centerX, centerY, innerRadius, nextHouseAngle);

        // Extended lines going completely through the zodiac circle to the outer edge
        const extendedOuterRadius = size * 0.48; // Edge of the SVG
        const extendedStart = polarToCartesian(centerX, centerY, extendedOuterRadius, angle);

        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        const formatHouseLabel = (num: number) => romanNumerals[num - 1] || `${num}`;

        const hoverPath = innerRadius > 0 ? `
          M ${outerStart.x} ${outerStart.y}
          A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}
          L ${innerEnd.x} ${innerEnd.y}
          A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}
          Z
        ` : `
          M ${outerStart.x} ${outerStart.y}
          A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}
          L ${centerX} ${centerY}
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
            {/* House cusp line (extended) */}
            <motion.line
              x1={innerStart.x}
              y1={innerStart.y}
              x2={extendedStart.x}
              y2={extendedStart.y}
              stroke={
                isAngular && house.number === 1 ? '#e53935' : // Red for Ascendant
                  isAngular && house.number === 7 ? '#e53935' : // Red for Descendant
                    isAngular && house.number === 10 ? '#1e88e5' : // Blue for MC
                      isAngular && house.number === 4 ? '#1e88e5' : // Blue for IC
                        hoveredHouse === house.number ? '#ffd700' : colorScheme.houses
              }
              strokeWidth={hoveredHouse === house.number ? (isAngular ? 4 : 2) : (isAngular ? 2.5 : 1.5)}
              opacity={hoveredHouse === house.number ? 1 : 0.8}
              strokeDasharray={'none'}
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

            {/* House number (Roman digits) */}
            <motion.text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={hoveredHouse === house.number ? '#ffd700' : colorScheme.houses}
              fontSize={size * 0.03}
              fontFamily="serif"
              fontWeight={'bold'}
              opacity={hoveredHouse === house.number ? 1 : 0.8}
              initial={{ opacity: 0 }}
              animate={{ opacity: hoveredHouse === house.number ? 1 : 0.8 }}
              transition={{ delay: i * 0.05 + 0.5, duration: 0.2 }}
            >
              {formatHouseLabel(house.number)}
            </motion.text>

            {/* House size (Arabic digits) near the cusp */}
            <motion.text
              x={polarToCartesian(centerX, centerY, size * 0.36, angle + 3).x}
              y={polarToCartesian(centerX, centerY, size * 0.36, angle + 3).y}
              textAnchor="start"
              dominantBaseline="middle"
              fill={colorScheme.houses}
              fontSize={size * 0.015}
              opacity={0.6}
            >
              {Math.round(houseSize)}°
            </motion.text>

            {/* Markers and Labels for Angles (ASC, DSC, MC, IC) */}
            {isAngular && (
              <>
                <g transform={`translate(${extendedStart.x}, ${extendedStart.y}) rotate(${angle - 90})`}>
                  {house.number === 1 && (
                    <path
                      d={`M ${-size * 0.015} ${-size * 0.012} L 0 0 L ${-size * 0.015} ${size * 0.012} 
                          M ${-size * 0.025} ${-size * 0.012} L ${-size * 0.01} 0 L ${-size * 0.025} ${size * 0.012}`}
                      fill="none"
                      stroke="#e53935"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {house.number === 10 && (
                    <circle cx={size * 0.01} cy={0} r={size * 0.01} fill="none" stroke="#1e88e5" strokeWidth={2} />
                  )}
                </g>
                <text
                  x={
                    house.number === 1 ? centerX - size * 0.485 :
                      house.number === 7 ? centerX + size * 0.485 :
                        polarToCartesian(centerX, centerY, size * 0.49, angle).x + size * 0.01
                  }
                  y={
                    house.number === 1 ? centerY + size * 0.025 :
                      house.number === 7 ? centerY + size * 0.025 :
                        polarToCartesian(centerX, centerY, size * 0.49, angle).y + (house.number === 4 ? size * 0.02 : 0)
                  }
                  textAnchor={
                    house.number === 1 || house.number === 7 ? 'middle' : 'start'
                  }
                  dominantBaseline="middle"
                  fill={house.number === 1 || house.number === 7 ? '#e53935' : '#1e88e5'}
                  fontSize={size * 0.022}
                  fontWeight="bold"
                >
                  {house.number === 1 ? 'Asc' : house.number === 7 ? 'Dsc' : house.number === 10 ? 'MC' : 'IC'}
                </text>
              </>
            )}
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
