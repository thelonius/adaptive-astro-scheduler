import React, { useEffect, useState } from 'react';
import { useZodiacData } from '../../hooks/useZodiacData';
import { useAdaptiveZodiacData } from '../../hooks/useAdaptiveZodiacData';
import ZodiacCircle from './ZodiacCircle';
import PlanetMarkers from './PlanetMarkers';
import AspectLines from './AspectLines';
import HousesOverlay from './HousesOverlay';
import Tooltip from './Tooltip';
import { ThemeProvider } from '@chakra-ui/react';
import { themes } from './themes';

const ZodiacWheel = ({ config, latitude, longitude, timezone, useAdaptiveRefresh }) => {
  const [data, setData] = useState(null);
  const { planets, aspects, houses } = useZodiacData(latitude, longitude, timezone);
  const adaptiveData = useAdaptiveZodiacData(latitude, longitude, timezone);

  useEffect(() => {
    if (useAdaptiveRefresh) {
      setData(adaptiveData);
    } else {
      setData({ planets, aspects, houses });
    }
  }, [planets, aspects, houses, adaptiveData, useAdaptiveRefresh]);

  return (
    <ThemeProvider theme={themes[config.colorScheme]}>
      <div style={{ width: config.size, height: config.size }}>
        <ZodiacCircle />
        <PlanetMarkers planets={data?.planets} />
        <AspectLines aspects={data?.aspects} />
        <HousesOverlay houses={data?.houses} />
        <Tooltip />
      </div>
    </ThemeProvider>
  );
};

export default ZodiacWheel;