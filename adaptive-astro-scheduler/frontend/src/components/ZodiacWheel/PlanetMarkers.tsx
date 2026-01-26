import React from 'react';
import { useZodiacData } from '../../hooks/useZodiacData';
import { Planet } from './types';

const PlanetMarkers: React.FC = () => {
    const { planets } = useZodiacData();

    return (
        <>
            {planets.map((planet: Planet) => (
                <g key={planet.id} transform={`translate(${planet.x}, ${planet.y})`}>
                    <circle r={10} fill={planet.color} />
                    {planet.isRetrograde && (
                        <text x={15} y={5} fontSize={12} fill="red">℞</text>
                    )}
                    <text x={15} y={-5} fontSize={12} fill="black">{planet.symbol}</text>
                </g>
            ))}
        </>
    );
};

export default PlanetMarkers;