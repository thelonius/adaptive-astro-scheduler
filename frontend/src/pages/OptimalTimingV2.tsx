/**
 * v2 optimal-timing page.
 *
 * User flow:
 *   1. Type intent in free text → click "найти окна"
 *   2. Backend calls NIM → generates Recipe DSL → runs scoring pipeline
 *   3. Page shows the inferred Recipe (collapsed) + ranked windows
 *   4. Click a window to drill into matched predicates
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IntentInput, IntentInputValue } from '../components/OptimalTimingV2/IntentInput';
import { GeneratedRecipePanel } from '../components/OptimalTimingV2/GeneratedRecipePanel';
import { WindowCard } from '../components/OptimalTimingV2/WindowCard';
import {
    optimalTimingV2Service,
    type FindWithIntentResponse,
} from '../services/optimalTimingV2Service';
import { useLocationStore } from '../store/locationStore';
import './OptimalTimingV2.css';

export default function OptimalTimingV2() {
    const { t, i18n } = useTranslation();
    const language = (i18n.language || 'en').slice(0, 2);
    const location = useLocationStore((s) => s.location);

    const [result, setResult] = useState<FindWithIntentResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        } catch (e: unknown) {
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? // axios error
                    (e as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message ??
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
                        <div className="otv2-windows-list">
                            {result.windows.map((w) => (
                                <WindowCard key={w.date} window={w} language={language} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
