import { useEffect, useState } from 'react';
import axios from 'axios';

const useZodiacData = (latitude, longitude, timezone, refreshInterval) => {
    const [data, setData] = useState({
        planets: [],
        aspects: [],
        houses: [],
    });
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            const [planetsResponse, aspectsResponse, housesResponse] = await Promise.all([
                axios.get('/api/ephemeris/planets', { params: { latitude, longitude, timezone } }),
                axios.get('/api/ephemeris/aspects', { params: { latitude, longitude, timezone } }),
                axios.get('/api/ephemeris/houses', { params: { latitude, longitude, timezone } }),
            ]);

            setData({
                planets: planetsResponse.data,
                aspects: aspectsResponse.data,
                houses: housesResponse.data,
            });
        } catch (err) {
            setError(err);
        }
    };

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, refreshInterval);

        return () => {
            clearInterval(intervalId);
        };
    }, [latitude, longitude, timezone, refreshInterval]);

    return { data, error };
};

export default useZodiacData;