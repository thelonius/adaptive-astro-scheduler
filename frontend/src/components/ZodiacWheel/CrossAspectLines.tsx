import React from 'react';
import type { AspectLine } from './types';

interface CrossAspectLinesProps {
  lines: AspectLine[];
}

const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#FFD700',
  opposition:  '#FF1493',
  trine:       '#32CD32',
  square:      '#FF4500',
  sextile:     '#00CED1',
  quincunx:    '#9370DB',
};

// Uses actual PlanetPosition.x/.y coordinates, not ring-projected like AspectLines.
// Cross-aspects are secondary information: no animation, no midpoint symbols.
export const CrossAspectLines: React.FC<CrossAspectLinesProps> = ({ lines }) => (
  <g id="cross-aspects">
    {lines.map((line, i) => {
      const color = ASPECT_COLORS[line.aspect.type] ?? '#888';
      const strokeWidth = Math.max(0.8, 1.5 * line.strength);
      const opacity = 0.45 + line.strength * 0.25;
      const dasharray = line.aspect.type === 'quincunx' ? '3,3' : undefined;

      return (
        <line
          key={`cx-${i}-${line.aspect.body1.name}-${line.aspect.body2.name}`}
          x1={line.from.x}
          y1={line.from.y}
          x2={line.to.x}
          y2={line.to.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={dasharray}
          opacity={opacity}
          style={{ pointerEvents: 'none' }}
        />
      );
    })}
  </g>
);
