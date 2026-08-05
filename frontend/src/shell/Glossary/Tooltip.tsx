import { useEffect, useRef, useState } from 'react';

/**
 * Контроллер подсказок. Перенесён из mlops_tutor, механика та же.
 *
 * Слушает события на document и реагирует на любой элемент с классом
 * `.ag-gloss` и атрибутом `data-tooltip`. Это развязка: подсказку можно
 * навесить на что угодно, не прокидывая пропсы через дерево и не оборачивая
 * каждый термин в React-компонент. На десктопе работает наведение, на
 * тач-устройствах — тап с фиксацией.
 */
export function TooltipController() {
    const [content, setContent] = useState<{ text: string; source: string | null } | null>(null);
    const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
    const isTouch = useRef(false);
    const pinned = useRef<HTMLElement | null>(null);

    useEffect(() => {
        isTouch.current = window.matchMedia('(hover: none)').matches;
    }, []);

    useEffect(() => {
        const WIDTH = 340;

        const showFor = (el: HTMLElement) => {
            const text = el.dataset.tooltip;
            if (!text) return;
            const rect = el.getBoundingClientRect();
            const left = Math.max(
                8,
                Math.min(rect.left + rect.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - 8),
            );
            // Ниже элемента, а если внизу не помещается — выше него.
            const below = rect.bottom + 8;
            const top = below + 160 > window.innerHeight ? Math.max(8, rect.top - 168) : below;
            setPos({ left, top });
            setContent({ text, source: el.dataset.tooltipSource || null });
        };

        const hide = () => {
            setContent(null);
            pinned.current = null;
        };

        const target = (e: Event) =>
            (e.target as HTMLElement)?.closest?.('.ag-gloss') as HTMLElement | null;

        const onMouseOver = (e: MouseEvent) => {
            if (isTouch.current || pinned.current) return;
            const el = target(e);
            if (el) showFor(el);
        };
        const onMouseOut = (e: MouseEvent) => {
            if (isTouch.current || pinned.current) return;
            const el = target(e);
            const next = (e.relatedTarget as HTMLElement | null)?.closest?.('.ag-gloss');
            if (el && el !== next) hide();
        };
        const onClick = (e: MouseEvent) => {
            const el = target(e);
            if (!el) {
                if (pinned.current) hide();
                return;
            }
            if (pinned.current === el) hide();
            else {
                pinned.current = el;
                showFor(el);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') hide();
        };
        const onScroll = () => {
            if (pinned.current) showFor(pinned.current);
            else setContent(null);
        };

        document.addEventListener('mouseover', onMouseOver);
        document.addEventListener('mouseout', onMouseOut);
        document.addEventListener('click', onClick);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('mouseover', onMouseOver);
            document.removeEventListener('mouseout', onMouseOut);
            document.removeEventListener('click', onClick);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, []);

    if (!content) return null;

    return (
        <div className="ag-tooltip" style={{ left: pos.left, top: pos.top }} role="tooltip">
            <div className="ag-tooltip-body">{content.text}</div>
            {content.source && <div className="ag-tooltip-source">{content.source}</div>}
        </div>
    );
}
