import React from 'react';
import { ZodiacSign } from './types';
import { calculateSignPosition } from './utils';

interface ZodiacCircleProps {
  signs: ZodiacSign[];
  radius: number;
}

const ZodiacCircle: React.FC<ZodiacCircleProps> = ({ signs, radius }) => {
  const circleCenter = radius;
  const signAngle = 360 / signs.length;

  return (
    <svg width={radius * 2} height={radius * 2}>
      <g transform={`translate(${circleCenter}, ${circleCenter})`}>
        {signs.map((sign, index) => {
          const angle = signAngle * index;
          const { x, y } = calculateSignPosition(angle, radius);

          return (
            <g key={sign.symbol} transform={`translate(${x}, ${y})`}>
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="16"
                fill="currentColor"
              >
                {sign.symbol}
              </text>
              <line
                x1={0}
                y1={0}
                x2={Math.cos((angle * Math.PI) / 180) * radius}
                y2={Math.sin((angle * Math.PI) / 180) * radius}
                stroke="lightgray"
                strokeWidth="1"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default ZodiacCircle;