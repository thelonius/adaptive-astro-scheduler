import type { ReactNode } from 'react';
import { useGlossary, type GlossaryEntry } from './GlossaryProvider';

/** Подсказка обрезается по границе предложения: абзац в тултипе не читают. */
function toTooltip(text: string, max = 300): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat.length <= max) return flat;
    const cut = flat.slice(0, max);
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    return (stop > max * 0.4 ? cut.slice(0, stop + 1) : cut) + '…';
}

interface Props {
    kind: GlossaryEntry['kind'];
    /** 'Sun' | 'Солнце' | 'SUN' | 5 — нормализуется в провайдере. */
    term: string | number;
    children?: ReactNode;
    className?: string;
}

/**
 * Термин с подсказкой из корпуса.
 *
 * Если термина в словаре нет, отрисовывается обычный текст без пунктира:
 * подчёркивание, которое ничего не показывает, раздражает сильнее, чем его
 * отсутствие.
 */
export function GlossTerm({ kind, term, children, className }: Props) {
    const { lookup } = useGlossary();
    const entry = lookup(kind, term);
    const label = children ?? String(term);

    if (!entry) return <span className={className}>{label}</span>;

    return (
        <span
            className={`ag-gloss${className ? ' ' + className : ''}`}
            data-tooltip={toTooltip(entry.short.body)}
            data-tooltip-source={entry.short.author ?? undefined}
            tabIndex={0}
        >
            {label}
        </span>
    );
}
