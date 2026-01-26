import { useEffect, useState } from 'react';
import { useZodiacData } from './useZodiacData';

const useAdaptiveZodiacData = () => {
    const { data, error, refreshData } = useZodiacData();
    const [refreshInterval, setRefreshInterval] = useState(60000); // Default to 60 seconds

    useEffect(() => {
        const calculateRefreshRate = () => {
            if (!data || !data.planets) return;

            const speeds = data.planets.map(p => Math.abs(p.speed));
            const maxSpeed = Math.max(...speeds);

            if (maxSpeed > 10) {
                setRefreshInterval(300000); // 5 minutes for fast-moving bodies like the Moon
            } else if (maxSpeed > 1) {
                setRefreshInterval(900000); // 15 minutes for inner planets
            } else {
                setRefreshInterval(3600000); // 60 minutes for outer planets
            }
        };

        calculateRefreshRate();
    }, [data]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            refreshData();
        }, refreshInterval);

        return () => clearInterval(intervalId);
    }, [refreshInterval, refreshData]);

    return { data, error, refreshData };
};

export default useAdaptiveZodiacData;