import React from 'react';
import { motion } from 'framer-motion';
import type { ColorScheme } from './types';
import { getZodiacSignPositions, generateDegreeMarks, longitudeToAngle, polarToCartesian } from './utils';
import ZodiacIcon from './ZodiacIcon';

interface ZodiacCircleProps {
  size: number;
  colorScheme: ColorScheme;
  showDegrees: boolean;
  onZodiacHover?: (signName: string | null, position: { x: number; y: number }) => void;
  chartRotation?: number;
}

export const ZodiacCircle: React.FC<ZodiacCircleProps> = ({ size, colorScheme, showDegrees, onZodiacHover, chartRotation = 0 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.46;
  const innerRadius = size * 0.38;
  const _signRadius = size * 0.42;

  const signs = getZodiacSignPositions(size, chartRotation);
  // Generate high-fidelity degree marks (every 1 degree) for the inner ring
  const degreeMarks = showDegrees ? generateDegreeMarks(size, 1, chartRotation) : [];

  // Helper function to get elemental background color for signs
  const getElementalColor = (signName: string) => {
    switch (signName) {
      case 'Aries': case 'Leo': case 'Sagittarius':
      case 'Овен': case 'Лев': case 'Стрелец':
        return 'rgba(224, 17, 95, 0.15)'; // Fire (Ruby / Crimson)
      case 'Taurus': case 'Virgo': case 'Capricorn':
      case 'Телец': case 'Дева': case 'Козерог':
        return 'rgba(80, 200, 120, 0.15)'; // Earth (Emerald)
      case 'Gemini': case 'Libra': case 'Aquarius':
      case 'Близнецы': case 'Весы': case 'Водолей':
        return 'rgba(255, 200, 124, 0.15)'; // Air (Topaz / Sunset Gold)
      case 'Cancer': case 'Scorpio': case 'Pisces':
      case 'Рак': case 'Скорпион': case 'Рыбы':
        return 'rgba(15, 82, 186, 0.15)'; // Water (Sapphire / Deep Blue)
      default:
        return 'transparent';
    }
  };

  const getElementalHexColor = (signName: string) => {
    switch (signName) {
      case 'Aries': case 'Leo': case 'Sagittarius':
      case 'Овен': case 'Лев': case 'Стрелец':
        return '#ff3366'; // Fire (Neon Pink-Red)
      case 'Taurus': case 'Virgo': case 'Capricorn':
      case 'Телец': case 'Дева': case 'Козерог':
        return '#00ff66'; // Earth (Neon Green)
      case 'Gemini': case 'Libra': case 'Aquarius':
      case 'Близнецы': case 'Весы': case 'Водолей':
        return '#00ffff'; // Air (Cyan)
      case 'Cancer': case 'Scorpio': case 'Pisces':
      case 'Рак': case 'Скорпион': case 'Рыбы':
        return '#bc13fe'; // Water (Neon Magenta)
      default:
        return colorScheme.zodiacText;
    }
  };

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

      {/* Wedges for elemental colors */}
      {signs.map((sign, _i) => {
        const startAngle = sign.angle; // Longitude
        const endAngle = startAngle + 30; // Next sign

        const svgStartAngle = longitudeToAngle(startAngle, chartRotation);
        const svgEndAngle = longitudeToAngle(endAngle, chartRotation);

        const outerStart = polarToCartesian(centerX, centerY, outerRadius, svgStartAngle);
        const outerEnd = polarToCartesian(centerX, centerY, outerRadius, svgEndAngle);
        const innerStart = polarToCartesian(centerX, centerY, innerRadius, svgStartAngle);
        const innerEnd = polarToCartesian(centerX, centerY, innerRadius, svgEndAngle);

        const largeArcFlag = 0; // Zodiac signs are always 30 degrees, never > 180

        const pathData = `
          M ${outerStart.x} ${outerStart.y}
          A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}
          L ${innerEnd.x} ${innerEnd.y}
          A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}
          Z
        `;

        return (
          <path
            key={`elemental-bg-${sign.name}`}
            d={pathData}
            fill={getElementalColor(sign.name)}
            stroke={colorScheme.zodiacRing}
            strokeWidth={1}
          />
        );
      })}

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
                color={getElementalHexColor(sign.name)}
              />
            </div>
          </foreignObject>

          {/* Fallback text symbol for compatibility */}
          <text
            x={sign.x}
            y={sign.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={getElementalHexColor(sign.name)}
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
