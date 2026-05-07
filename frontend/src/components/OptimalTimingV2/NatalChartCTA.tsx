import React from 'react';
import { Link } from 'react-router-dom';

export const NatalChartCTA: React.FC = () => (
  <div className="otv2-natal-cta">
    <span>☽ Добавь натальный чарт, чтобы видеть биколесо</span>
    <Link to="/natal-chart">→</Link>
  </div>
);
