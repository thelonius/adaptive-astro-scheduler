// frontend/src/pages/OptimalTimingV2.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IntentInput, IntentInputValue } from '../components/OptimalTimingV2/IntentInput';
import { GeneratedRecipePanel } from '../components/OptimalTimingV2/GeneratedRecipePanel';
import { WindowListItem } from '../components/OptimalTimingV2/WindowListItem';
import { DayDetailPanel } from '../components/OptimalTimingV2/DayDetailPanel';
import {
    optimalTimingV2Service,
    type FindWithIntentResponse,
    type Vibe,
} from '../services/optimalTimingV2Service';
import { useLocationStore } from '../store/locationStore';
import { useChartStore } from '../store/chartStore';
import { chartService } from '../services/chartService';
import type { ZodiacWheelData } from '../components/ZodiacWheel/types';
import type { CelestialBody, Aspect, House } from '@adaptive-astro/shared/types';
import './OptimalTimingV2.css';

export default function OptimalTimingV2() {
    const { t, i18n } = useTranslation();
    const language = (i18n.language || 'en').slice(0, 2);
    const location = useLocationStore((s) => s.location);

    const [result, setResult] = useState<FindWithIntentResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

    const { charts, loadCharts, isLoading: chartsLoading } = useChartStore();
    const [natalData, setNatalData] = useState<ZodiacWheelData | null | undefined>(undefined);

    useEffect(() => { loadCharts(); }, []);

    useEffect(() => {
        if (chartsLoading) return;
        if (!charts.length) {
            setNatalData(null);
            return;
        }
        chartService.calculateChart(charts[0]).then(result => {
            setNatalData({
                planets: result.planets as CelestialBody[],
                houses: result.houses as House[],
                aspects: result.aspects as Aspect[],
            });
        }).catch(() => setNatalData(null));
    }, [charts, chartsLoading]);

    const handleSubmit = async (value: IntentInputValue) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await optimalTimingV2Service.findWithIntent({
                intent: value.intent,
                startDate: value.startDate,
                endDate: value.endDate,
                topN: value.topN,
                language,
                location: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    timezone: location.timezone,
                },
            });
            setResult(res);
            setSelectedDate(res.windows[0]?.date ?? null);
            setSelectedVibe(res.generated_recipe.vibes?.[0]?.id ?? null);
        } catch (e: unknown) {
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? (e as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message ??
                      (e as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error ??
                      String(e)
                    : e instanceof Error
                    ? e.message
                    : String(e);
            setError(msg);
            setResult(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectDate = (date: string) => {
        setSelectedDate(date);
        const vibes: Vibe[] = result?.generated_recipe.vibes ?? [];
        setSelectedVibe(vibes[0]?.id ?? null);
    };

    const selectedWindow = result?.windows.find((w) => w.date === selectedDate) ?? null;
    const vibes: Vibe[] = result?.generated_recipe.vibes ?? [];

    return (
        <div className="otv2-page">
            <header className="otv2-page-header">
                <h1 className="otv2-page-title">
                    {t('optimalTimingV2.pageTitle', 'Intent-based scheduler')}
                </h1>
                <p className="otv2-page-subtitle">
                    {t(
                        'optimalTimingV2.pageSubtitle',
                        'LLM переводит твоё намерение в астрологический recipe и ранжирует дни в выбранном диапазоне',
                    )}
                </p>
            </header>

            <IntentInput onSubmit={handleSubmit} isLoading={isLoading} />

            {isLoading && (
                <div className="otv2-loading">
                    <div className="otv2-loading-dot" />
                    <div className="otv2-loading-text">
                        {t(
                            'optimalTimingV2.loadingMessage',
                            'LLM генерирует recipe и считает скоринг по эфемеридам…',
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="otv2-error">
                    <strong>{t('optimalTimingV2.errorTitle', 'Ошибка')}:</strong> {error}
                </div>
            )}

            {result && !isLoading && (
                <>
                    <GeneratedRecipePanel
                        recipe={result.generated_recipe}
                        llm={result.llm}
                    />

                    <div className="otv2-summary">
                        <div className="otv2-summary-text">{result.summary}</div>
                        <div className="otv2-summary-meta">
                            {result.disqualified_days > 0 && (
                                <span>
                                    {t('optimalTimingV2.disqualifiedDays', 'дисквалифицировано')}:{' '}
                                    <strong>{result.disqualified_days}</strong>
                                </span>
                            )}
                            <span>
                                {t('optimalTimingV2.latency', 'время')}:{' '}
                                <strong>{(result.cost.latency_ms / 1000).toFixed(1)}s</strong>
                            </span>
                            <span>
                                {t('optimalTimingV2.requestId', 'request')}:{' '}
                                <code className="otv2-request-id">{result.request_id.slice(0, 8)}</code>
                            </span>
                        </div>
                    </div>

                    {result.windows.length === 0 ? (
                        <div className="otv2-empty">
                            {t(
                                'optimalTimingV2.noWindows',
                                'В этом диапазоне нет подходящих дней. Попробуй расширить даты или переформулировать намерение.',
                            )}
                        </div>
                    ) : (
                        <div className="otv2-split">
                            <div className="otv2-split-list">
                                {result.windows.map((w) => (
                                    <WindowListItem
                                        key={w.date}
                                        window={w}
                                        language={language}
                                        isSelected={w.date === selectedDate}
                                        onClick={handleSelectDate}
                                    />
                                ))}
                            </div>
                            <div className="otv2-split-detail">
                                {selectedWindow && (
                                    <DayDetailPanel
                                        window={selectedWindow}
                                        vibes={vibes}
                                        selectedVibe={selectedVibe}
                                        onVibeChange={setSelectedVibe}
                                        language={language}
                                        natalData={natalData}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
