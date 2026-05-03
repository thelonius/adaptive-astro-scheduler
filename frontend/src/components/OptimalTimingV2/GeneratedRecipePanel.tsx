import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GeneratedRecipe } from '../../services/optimalTimingV2Service';

interface Props {
    recipe: GeneratedRecipe;
    llm: {
        model: string;
        prompt_version: string;
        cached: boolean;
        attempts: number;
    };
}

function predicateLabel(p: { type: string;[key: string]: unknown }): string {
    const args: string[] = [];
    for (const [k, v] of Object.entries(p)) {
        if (k === 'type') continue;
        if (Array.isArray(v)) args.push(`${k}=[${v.join(', ')}]`);
        else if (typeof v === 'object' && v !== null) args.push(`${k}=${JSON.stringify(v)}`);
        else args.push(`${k}=${String(v)}`);
    }
    return args.length ? `${p.type} (${args.join(', ')})` : p.type;
}

export const GeneratedRecipePanel: React.FC<Props> = ({ recipe, llm }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <section className={`otv2-recipe-panel${open ? ' is-open' : ''}`}>
            <button
                type="button"
                className="otv2-recipe-panel-header"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                <span className="otv2-recipe-panel-arrow">{open ? '▾' : '▸'}</span>
                <span className="otv2-recipe-panel-title">
                    {t('optimalTimingV2.whatLLMUnderstood', 'Что понял LLM')}
                </span>
                <span className="otv2-recipe-panel-meta">
                    {llm.cached
                        ? t('optimalTimingV2.cachedMark', 'из кэша')
                        : `${llm.attempts} ${t('optimalTimingV2.attempts', 'попыт.')}`}
                </span>
            </button>

            {open && (
                <div className="otv2-recipe-panel-body">
                    <div className="otv2-recipe-section">
                        <div className="otv2-recipe-section-title">
                            {t('optimalTimingV2.intent', 'намерение')}
                        </div>
                        <div className="otv2-recipe-section-body">{recipe.intent}</div>
                    </div>

                    <div className="otv2-recipe-section">
                        <div className="otv2-recipe-section-title">
                            {t('optimalTimingV2.rationale', 'обоснование')}
                        </div>
                        <div className="otv2-recipe-section-body otv2-recipe-rationale">
                            {recipe.rationale}
                        </div>
                    </div>

                    {recipe.disqualifiers.length > 0 && (
                        <div className="otv2-recipe-section">
                            <div className="otv2-recipe-section-title">
                                {t('optimalTimingV2.disqualifiers', 'дисквалификаторы (любой обнуляет день)')}
                            </div>
                            <ul className="otv2-recipe-list otv2-recipe-list--disq">
                                {recipe.disqualifiers.map((d, i) => (
                                    <li key={i}>{predicateLabel(d)}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {recipe.weighted_conditions.length > 0 && (
                        <div className="otv2-recipe-section">
                            <div className="otv2-recipe-section-title">
                                {t('optimalTimingV2.weightedConditions', 'взвешенные условия')}
                            </div>
                            <ul className="otv2-recipe-list otv2-recipe-list--weighted">
                                {recipe.weighted_conditions.map((w, i) => (
                                    <li key={i}>
                                        <span
                                            className={`otv2-weight-badge ${w.weight >= 0 ? 'is-pos' : 'is-neg'}`}
                                        >
                                            {w.weight >= 0 ? '+' : ''}
                                            {w.weight}
                                        </span>
                                        <span className="otv2-predicate-label">
                                            {predicateLabel(w.predicate)}
                                        </span>
                                        {w.note && <span className="otv2-predicate-note"> — {w.note}</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="otv2-recipe-footer">
                        {t('optimalTimingV2.model', 'модель')}: <code>{llm.model}</code>
                        {' · '}
                        {t('optimalTimingV2.promptVersion', 'промпт')}: <code>{llm.prompt_version}</code>
                    </div>
                </div>
            )}
        </section>
    );
};
