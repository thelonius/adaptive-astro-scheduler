import React from 'react';
import { useZodiacData } from '../../hooks/useZodiacData';
import { House } from './types';

const HousesOverlay: React.FC = () => {
  const { houses } = useZodiacData();

  return (
    <svg className="houses-overlay">
      {houses.map((house: House, index: number) => (
        <g key={index} className={`house house-${index + 1}`}>
          <text x={house.position.x} y={house.position.y} textAnchor="middle">
            {house.label}
          </text>
          {house.isAngular && (
            <circle cx={house.position.x} cy={house.position.y} r={5} fill="red" />
          )}
        </g>
      ))}
    </svg>
  );
};

export default HousesOverlay;