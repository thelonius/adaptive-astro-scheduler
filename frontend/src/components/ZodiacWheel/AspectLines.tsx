import React from 'react';
import { motion } from 'framer-motion';
import type { AspectLine } from './types';

interface AspectLinesProps {
  lines: AspectLine[];
  size: number;
}

export const AspectLines: React.FC<AspectLinesProps> = ({ lines, size }) => {
  // Group aspects by type for rendering order (weaker aspects behind)
  const sortedLines = [...lines].sort((a, b) => {
    const order = ['quincunx', 'sextile', 'trine', 'square', 'opposition', 'conjunction'];
    return order.indexOf(a.aspect.type) - order.indexOf(b.aspect.type);
  });

  return (
    <g id="aspects">
      {sortedLines.map((line, i) => {
        const { from, to, color, strength, aspect } = line;

        // Calculate stroke width based on aspect strength
        const strokeWidth = size * 0.001 * (1 + strength * 2);

        // Different line styles for different aspects
        const getStrokeDasharray = (type: string) => {
          switch (type) {
            case 'conjunction':
              return 'none'; // Solid line
            case 'opposition':
              return 'none'; // Solid line
            case 'trine':
              return 'none'; // Solid line
            case 'square':
              return `${size * 0.01} ${size * 0.005}`; // Dashed
            case 'sextile':
              return `${size * 0.005} ${size * 0.005}`; // Dotted
            case 'quincunx':
              return `${size * 0.003} ${size * 0.007}`; // Light dotted
            default:
              return 'none';
          }
        };

        return (
          <motion.line
            key={`aspect-${i}-${aspect.body1.name}-${aspect.body2.name}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={getStrokeDasharray(aspect.type)}
            opacity={0.3 + strength * 0.4}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 + strength * 0.4 }}
            transition={{
              pathLength: { type: 'spring', duration: 1.5, bounce: 0, delay: i * 0.1 },
              opacity: { duration: 0.5, delay: i * 0.1 },
            }}
            style={{ pointerEvents: 'none' }}
          />
        );
      })}

      {/* Aspect labels at midpoint */}
      {sortedLines.map((line, i) => {
        const { from, to, aspect } = line;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        // Only show labels for major aspects
        const showLabel = ['conjunction', 'opposition', 'trine', 'square'].includes(aspect.type);

        if (!showLabel) return null;

        // Get aspect symbol
        const getAspectSymbol = (type: string) => {
          switch (type) {
            case 'conjunction':
              return '☌';
            case 'opposition':
              return '☍';
            case 'trine':
              return '△';
            case 'square':
              return '□';
            case 'sextile':
              return '⚹';
            case 'quincunx':
              return '⚻';
            default:
              return '';
          }
        };

        return (
          <motion.g
            key={`aspect-label-${i}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.7, scale: 1 }}
            transition={{ delay: i * 0.1 + 0.5 }}
          >
            {/* Background circle for better readability */}
            <circle
              cx={midX}
              cy={midY}
              r={size * 0.015}
              fill="rgba(0, 0, 0, 0.7)"
            />

            {/* Aspect symbol */}
            <text
              x={midX}
              y={midY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={line.color}
              fontSize={size * 0.02}
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              {getAspectSymbol(aspect.type)}
            </text>
          </motion.g>
        );
      })}
    </g>
  );
};
