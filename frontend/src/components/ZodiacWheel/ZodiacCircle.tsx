import React from 'react';
import { motion } from 'framer-motion';
import type { ColorScheme } from './types';
import { getZodiacSignPositions, generateDegreeMarks } from './utils';
import ZodiacIcon from './ZodiacIcon';

interface ZodiacCircleProps {
  size: number;
  colorScheme: ColorScheme;
  showDegrees: boolean;
  onZodiacHover?: (signName: string | null, position: { x: number; y: number }) => void;
}

export const ZodiacCircle: React.FC<ZodiacCircleProps> = ({ size, colorScheme, showDegrees, onZodiacHover }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.48;
  const innerRadius = size * 0.35;
  const signRadius = size * 0.42;

  const signs = getZodiacSignPositions(size);
  const degreeMarks = showDegrees ? generateDegreeMarks(size, 5) : [];

  return (
    <g id="zodiac-circle">
      {/* Background circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={outerRadius}
        fill={colorScheme.zodiacRing}
        opacity={0.3}
      />

      {/* Inner circle (chart area) */}
      <circle
        cx={centerX}
        cy={centerY}
        r={innerRadius}
        fill={colorScheme.background}
        opacity={0.5}
      />

      {/* Zodiac ring */}
      <circle
        cx={centerX}
        cy={centerY}
        r={outerRadius}
        fill="none"
        stroke={colorScheme.zodiacRing}
        strokeWidth={2}
      />
      <circle
        cx={centerX}
        cy={centerY}
        r={innerRadius}
        fill="none"
        stroke={colorScheme.zodiacRing}
        strokeWidth={1}
      />

      {/* Degree marks */}
      {degreeMarks.map((mark, i) => (
        <line
          key={`degree-${i}`}
          x1={mark.x1}
          y1={mark.y1}
          x2={mark.x2}
          y2={mark.y2}
          stroke={colorScheme.degreeMarks}
          strokeWidth={mark.isMajor ? 2 : 0.5}
          opacity={mark.isMajor ? 0.6 : 0.3}
        />
      ))}

      {/* Zodiac signs dividers (30° each) */}
      {signs.map((sign, i) => {
        const innerPoint = {
          x: centerX + innerRadius * Math.cos((sign.svgAngle - 90) * Math.PI / 180),
          y: centerY + innerRadius * Math.sin((sign.svgAngle - 90) * Math.PI / 180),
        };
        const outerPoint = {
          x: centerX + outerRadius * Math.cos((sign.svgAngle - 90) * Math.PI / 180),
          y: centerY + outerRadius * Math.sin((sign.svgAngle - 90) * Math.PI / 180),
        };

        return (
          <line
            key={`divider-${i}`}
            x1={innerPoint.x}
            y1={innerPoint.y}
            x2={outerPoint.x}
            y2={outerPoint.y}
            stroke={colorScheme.zodiacRing}
            strokeWidth={1.5}
            opacity={0.4}
          />
        );
      })}

      {/* Zodiac sign symbols */}
      {signs.map((sign, i) => (
        <motion.g
          key={`sign-${i}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => {
            if (onZodiacHover) {
              const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement)?.getBoundingClientRect();
              if (rect) {
                onZodiacHover(sign.name, {
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top
                });
              }
            }
          }}
          onMouseMove={(e) => {
            if (onZodiacHover) {
              const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement)?.getBoundingClientRect();
              if (rect) {
                onZodiacHover(sign.name, {
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top
                });
              }
            }
          }}
          onMouseLeave={() => {
            if (onZodiacHover) {
              onZodiacHover(null, { x: 0, y: 0 });
            }
          }}
        >
          {/* Background circle for symbol */}
          <circle
            cx={sign.x}
            cy={sign.y}
            r={size * 0.03}
            fill={colorScheme.background}
            stroke={colorScheme.zodiacText}
            strokeWidth={1}
            opacity={0.8}
          />

          {/* Custom zodiac icon */}
          <foreignObject
            x={sign.x - (size * 0.025)}
            y={sign.y - (size * 0.025)}
            width={size * 0.05}
            height={size * 0.05}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '100%',
              height: '100%'
            }}>
              <ZodiacIcon 
                sign={sign.name}
                size={size * 0.035}
                color={colorScheme.zodiacText}
              />
            </div>
          </foreignObject>

          {/* Fallback text symbol for compatibility */}
          <text
            x={sign.x}
            y={sign.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={colorScheme.zodiacText}
            fontSize={size * 0.04}
            fontWeight="bold"
            fontFamily="serif"
            style={{
              display: 'none', // Hidden by default, shows if foreignObject fails
            }}
          >
            {sign.symbol}
          </text>
        </motion.g>
      ))}
      {/* Center point */}
      <circle
        cx={centerX}
        cy={centerY}
        r={3}
        fill={colorScheme.zodiacText}
        opacity={0.5}
      />
    </g>
  );
};
