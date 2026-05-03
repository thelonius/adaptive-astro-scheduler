import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocationBar } from '../common/LocationBar';
import { useLocationStore } from '../../store/locationStore';

export interface IntentInputValue {
    intent: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    topN: number;
}

interface IntentInputProps {
    onSubmit: (value: IntentInputValue) => void;
    isLoading?: boolean;
}

const SAMPLE_INTENTS = [
    'хочу подписать договор аренды',
    'попросить у начальника прибавку',
    'отправиться в дальнее путешествие',
    'помириться с другом',
    'запустить новый онлайн-курс',
];

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}
function isoPlusDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

export const IntentInput: React.FC<IntentInputProps> = ({ onSubmit, isLoading }) => {
    const { t } = useTranslation();
    const [intent, setIntent] = useState('');
    const [startDate, setStartDate] = useState(todayISO());
    const [endDate, setEndDate] = useState(isoPlusDays(60));
    const [topN, setTopN] = useState(5);
    const location = useLocationStore((s) => s.location);

    const canSubmit = intent.trim().length > 0 && startDate && endDate && !isLoading;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({ intent: intent.trim(), startDate, endDate, topN });
    };

    return (
        <form className="otv2-input" onSubmit={handleSubmit}>
            <label className="otv2-label" htmlFor="otv2-intent">
                {t('optimalTimingV2.intentLabel', 'Что планируешь?')}
            </label>
            <textarea
                id="otv2-intent"
                className="otv2-textarea"
                rows={3}
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder={t(
                    'optimalTimingV2.intentPlaceholder',
                    'Опишите намерение в 1–2 предложениях. Например: «подписать важный контракт», «начать новый бизнес»',
                )}
                disabled={isLoading}
            />

            <div className="otv2-samples">
                <span className="otv2-samples-label">
                    {t('optimalTimingV2.examples', 'примеры:')}
                </span>
                {SAMPLE_INTENTS.map((s) => (
                    <button
                        key={s}
                        type="button"
                        className="otv2-sample-chip"
                        onClick={() => setIntent(s)}
                        disabled={isLoading}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="otv2-row">
                <div className="otv2-field">
                    <label className="otv2-label-small" htmlFor="otv2-start">
                        {t('optimalTimingV2.startDate', 'с')}
                    </label>
                    <input
                        id="otv2-start"
                        type="date"
                        className="otv2-date-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
                <div className="otv2-field">
                    <label className="otv2-label-small" htmlFor="otv2-end">
                        {t('optimalTimingV2.endDate', 'по')}
                    </label>
                    <input
                        id="otv2-end"
                        type="date"
                        className="otv2-date-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        disabled={isLoading}
                    />
                </div>
                <div className="otv2-field">
                    <label className="otv2-label-small" htmlFor="otv2-topn">
                        {t('optimalTimingV2.topN', 'топ-N')}
                    </label>
                    <input
                        id="otv2-topn"
                        type="number"
                        className="otv2-date-input otv2-topn-input"
                        value={topN}
                        min={1}
                        max={50}
                        onChange={(e) => setTopN(Math.max(1, Math.min(50, Number(e.target.value) || 5)))}
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="otv2-row otv2-row-bottom">
                <LocationBar />
                <div className="otv2-spacer" />
                <button
                    type="submit"
                    className="otv2-submit"
                    disabled={!canSubmit}
                >
                    {isLoading
                        ? t('optimalTimingV2.searching', 'ищу окна…')
                        : t('optimalTimingV2.submit', 'найти окна')}
                </button>
            </div>

            <div className="otv2-location-hint">
                {location.city
                    ? `${location.city}${location.country ? ', ' + location.country : ''}`
                    : `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                {' · '}
                {location.timezone}
            </div>
        </form>
    );
};
