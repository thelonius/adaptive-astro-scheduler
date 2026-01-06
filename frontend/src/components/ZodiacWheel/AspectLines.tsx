import React from 'react';
import { motion } from 'framer-motion';
import type { AspectLine } from './types';

interface AspectLinesProps {
  lines: AspectLine[];
  size: number;
}

export const AspectLines: React.FC<AspectLinesProps> = ({ lines, size }) => {
  console.log('AspectLines received:', lines.length, 'lines for size:', size);
  // Group aspects by type for rendering order (weaker aspects behind)
  const sortedLines = [...lines].sort((a, b) => {
    const order = ['quincunx', 'sextile', 'trine', 'square', 'opposition', 'conjunction'];
    return order.indexOf(a.aspect.type) - order.indexOf(b.aspect.type);
  });

  return (
    <g id="aspects">
      {/* Gradient definitions for each aspect type */}
      <defs>
        {/* Conjunction: Unity - Gold to radiant white */}
        <linearGradient id="conjunctionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#FFF8DC" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFE0" stopOpacity="0.8" />
        </linearGradient>
        
        {/* Opposition: Tension - Deep red to electric blue */}
        <linearGradient id="oppositionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#DC143C" stopOpacity="0.8" />
          <stop offset="25%" stopColor="#FF1493" stopOpacity="0.9" />
          <stop offset="75%" stopColor="#4169E1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#00BFFF" stopOpacity="0.8" />
        </linearGradient>
        
        {/* Trine: Harmony - Forest green to spring green */}
        <linearGradient id="trineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#228B22" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#32CD32" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#98FB98" stopOpacity="0.8" />
        </linearGradient>
        
        {/* Square: Challenge - Fiery red to blazing orange */}
        <linearGradient id="squareGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B22222" stopOpacity="0.8" />
          <stop offset="30%" stopColor="#FF4500" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#FF6347" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFA500" stopOpacity="0.8" />
        </linearGradient>
        
        {/* Sextile: Opportunity - Ocean cyan to sky blue */}
        <linearGradient id="sextileGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#008B8B" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#00CED1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#87CEEB" stopOpacity="0.8" />
        </linearGradient>
        
        {/* Quincunx: Adjustment - Deep purple to mystical violet */}
        <linearGradient id="quincunxGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4B0082" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#9370DB" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#DDA0DD" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      
      {sortedLines.map((line, i) => {
        const { from, to, color, strength, aspect } = line;

        // Calculate stroke width based on aspect strength (make more visible)
        const strokeWidth = Math.max(1, size * 0.002 * (1 + strength * 2));

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

        // Get gradient URL for aspect type
        const getGradientUrl = (type: string) => {
          switch (type) {
            case 'conjunction':
              return 'url(#conjunctionGradient)';
            case 'opposition':
              return 'url(#oppositionGradient)';
            case 'trine':
              return 'url(#trineGradient)';
            case 'square':
              return 'url(#squareGradient)';
            case 'sextile':
              return 'url(#sextileGradient)';
            case 'quincunx':
              return 'url(#quincunxGradient)';
            default:
              return 'url(#conjunctionGradient)'; // Default fallback
          }
        };

        return (
          <motion.line
            key={`aspect-${i}-${aspect.body1.name}-${aspect.body2.name}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={getGradientUrl(aspect.type)}
            strokeWidth={strokeWidth}
            strokeDasharray={getStrokeDasharray(aspect.type)}
            opacity={0.7 + strength * 0.2}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 + strength * 0.2 }}
            transition={{
              pathLength: { type: 'spring', duration: 1.5, bounce: 0, delay: i * 0.1 },
              opacity: { duration: 0.5, delay: i * 0.1 },
            }}
            style={{ pointerEvents: 'none' }}
          />
        );
      })}
    </g>
  );
};
