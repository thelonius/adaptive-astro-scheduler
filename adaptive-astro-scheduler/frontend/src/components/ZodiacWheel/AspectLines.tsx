import React from 'react';
import { AspectType, AspectLineProps } from './types';

const aspectColors: Record<AspectType, string> = {
  conjunction: 'gold',
  sextile: 'cyan',
  square: 'red',
  trine: 'green',
  quincunx: 'purple',
  opposition: 'pink',
};

const AspectLines: React.FC<AspectLineProps> = ({ aspects }) => {
  return (
    <>
      {aspects.map((aspect) => {
        const { type, start, end } = aspect;
        const color = aspectColors[type];

        return (
          <line
            key={`${start}-${end}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.7}
          >
            <title>{`${type} Aspect`}</title>
          </line>
        );
      })}
    </>
  );
};

export default AspectLines;