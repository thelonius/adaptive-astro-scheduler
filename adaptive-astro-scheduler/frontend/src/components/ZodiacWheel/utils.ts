export const degreesToRadians = (degrees: number): number => {
    return (degrees * Math.PI) / 180;
};

export const radiansToDegrees = (radians: number): number => {
    return (radians * 180) / Math.PI;
};

export const calculateAspect = (angle1: number, angle2: number, orb: number): boolean => {
    const difference = Math.abs(angle1 - angle2) % 360;
    return difference <= orb || (360 - difference) <= orb;
};

export const formatPlanetSymbol = (planet: string): string => {
    const symbols: { [key: string]: string } = {
        sun: '☉',
        moon: '☽',
        mercury: '☿',
        venus: '♀',
        mars: '♂',
        jupiter: '♃',
        saturn: '♄',
        uranus: '♅',
        neptune: '♆',
        pluto: '♇',
    };
    return symbols[planet.toLowerCase()] || planet;
};