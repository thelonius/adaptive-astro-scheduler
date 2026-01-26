import React, { useState } from 'react';
import { ZodiacWheel } from '../components/ZodiacWheel';
import { themes } from '../components/ZodiacWheel/themes';

const ZodiacWheelDemo = () => {
  const [config, setConfig] = useState({
    size: 600,
    showAspects: true,
    showHouses: false,
    refreshInterval: 5 * 60 * 1000,
    colorScheme: themes.cosmic,
  });

  const handleSizeChange = (e) => {
    setConfig({ ...config, size: e.target.value });
  };

  const handleAspectToggle = () => {
    setConfig({ ...config, showAspects: !config.showAspects });
  };

  const handleHouseToggle = () => {
    setConfig({ ...config, showHouses: !config.showHouses });
  };

  const handleRefreshIntervalChange = (e) => {
    setConfig({ ...config, refreshInterval: e.target.value * 60 * 1000 });
  };

  return (
    <div>
      <h1>Zodiac Wheel Demo</h1>
      <div>
        <label>
          Size:
          <input type="number" value={config.size} onChange={handleSizeChange} />
        </label>
        <label>
          Show Aspects:
          <input type="checkbox" checked={config.showAspects} onChange={handleAspectToggle} />
        </label>
        <label>
          Show Houses:
          <input type="checkbox" checked={config.showHouses} onChange={handleHouseToggle} />
        </label>
        <label>
          Refresh Interval (minutes):
          <input type="number" value={config.refreshInterval / 60000} onChange={handleRefreshIntervalChange} />
        </label>
      </div>
      <ZodiacWheel
        config={config}
        latitude={55.7558}
        longitude={37.6173}
        timezone="Europe/Moscow"
        useAdaptiveRefresh={true}
      />
    </div>
  );
};

export default ZodiacWheelDemo;