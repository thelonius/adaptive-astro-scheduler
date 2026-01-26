import React from 'react';

interface TooltipProps {
  content: string;
  position: {
    top: number;
    left: number;
  };
}

const Tooltip: React.FC<TooltipProps> = ({ content, position }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        zIndex: 1000,
      }}
    >
      {content}
    </div>
  );
};

export default Tooltip;