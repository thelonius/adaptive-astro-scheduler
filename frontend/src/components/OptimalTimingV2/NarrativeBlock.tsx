// frontend/src/components/OptimalTimingV2/NarrativeBlock.tsx

import React from 'react';

interface Props {
    text: string | undefined;
}

export const NarrativeBlock: React.FC<Props> = ({ text }) => {
    if (!text) return null;
    return <p className="otv2-narrative">{text}</p>;
};
