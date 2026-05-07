import React from 'react';
import { useTranslation } from 'react-i18next';
import type { VibeNarrativeMap } from '../../services/optimalTimingV2Service';

interface Props {
    /** Map vibeId -> narrative text. `undefined` = still loading; `{}` = backend returned empty. */
    narratives: VibeNarrativeMap | undefined;
    selectedVibeId: string | null;
}

export const NarrativeBlock: React.FC<Props> = ({ narratives, selectedVibeId }) => {
    const { t } = useTranslation();

    if (narratives === undefined) {
        return (
            <div className="otv2-narrative-skeleton" aria-busy="true">
                <div className="otv2-narrative-skeleton-line" />
                <div className="otv2-narrative-skeleton-line otv2-narrative-skeleton-line--short" />
            </div>
        );
    }

    if (!selectedVibeId) return null;

    const text = narratives[selectedVibeId];
    if (!text) {
        return (
            <p className="otv2-narrative-fallback">
                {t('optimalTimingV2.narrativeUnavailable', 'Текст для этого вайба недоступен. Попробуй обновить страницу.')}
            </p>
        );
    }

    return <p className="otv2-narrative-text">{text}</p>;
};
