/**
 * Antigravity — useColorTransition
 *
 * Хук для плавных анимированных переходов между тёмной и светлой темой
 * и между разными палитрами дня.
 *
 * Принцип: вместо мгновенного переключения CSS-переменных —
 * интерполируем их значения через requestAnimationFrame.
 */

import { useRef, useCallback } from 'react';

/** Линейная интерполяция числа */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/** Easing — ease-in-out cubic для более естественного перехода */
function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Парсим hex → [r,g,b] */
function parseHex(hex: string): [number, number, number] | null {
    const m = hex.match(/^#([0-9a-f]{6})$/i);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** [r,g,b] → hex */
function toHex(r: number, g: number, b: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    return `#${clamp(r).toString(16).padStart(2, '0')}` +
        `${clamp(g).toString(16).padStart(2, '0')}` +
        `${clamp(b).toString(16).padStart(2, '0')}`;
}

/** Интерполируем hex-цвет */
function lerpHex(from: string, to: string, t: number): string {
    const a = parseHex(from);
    const b = parseHex(to);
    if (!a || !b) return t > 0.5 ? to : from;
    return toHex(
        lerp(a[0], b[0], t),
        lerp(a[1], b[1], t),
        lerp(a[2], b[2], t),
    );
}

/** Интерполируем rgba() */
function lerpRgba(from: string, to: string, t: number): string {
    const parseRgba = (s: string) => {
        const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!m) return null;
        return [+m[1], +m[2], +m[3], m[4] !== undefined ? +m[4] : 1] as [number, number, number, number];
    };
    const a = parseRgba(from);
    const b_ = parseRgba(to);
    if (!a || !b_) return t > 0.5 ? to : from;
    return `rgba(${Math.round(lerp(a[0], b_[0], t))},${Math.round(lerp(a[1], b_[1], t))},${Math.round(lerp(a[2], b_[2], t))},${lerp(a[3], b_[3], t).toFixed(2)})`;
}

/** Интерполируем любой CSS-цвет (hex или rgba) */
function lerpColor(from: string, to: string, t: number): string {
    if (from.startsWith('#') && to.startsWith('#')) return lerpHex(from, to, t);
    if (from.startsWith('rgb') && to.startsWith('rgb')) return lerpRgba(from, to, t);
    return t > 0.5 ? to : from;
}

export interface TransitionOptions {
    /** Длительность в мс (default: 600) */
    duration?: number;
    /** Easing функция (default: ease-in-out cubic) */
    easing?: (t: number) => number;
}

export interface UseColorTransitionReturn {
    /** Запустить анимированный переход CSS-переменных на :root */
    transitionCssVars: (
        toVars: Record<string, string>,
        options?: TransitionOptions
    ) => Promise<void>;
    /** Немедленно применить без анимации */
    applyCssVars: (vars: Record<string, string>) => void;
    /** Прервать текущий переход */
    cancelTransition: () => void;
}

export function useColorTransition(): UseColorTransitionReturn {
    const animFrameRef = useRef<number | null>(null);
    const activeRef = useRef(false);

    const cancelTransition = useCallback(() => {
        if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        activeRef.current = false;
    }, []);

    const applyCssVars = useCallback((vars: Record<string, string>) => {
        const root = document.documentElement;
        for (const [key, value] of Object.entries(vars)) {
            root.style.setProperty(key, value);
        }
    }, []);

    /**
     * Плавный переход CSS-переменных через requestAnimationFrame
     *
     * Алгоритм:
     * 1. Считываем текущие значения переменных из :root
     * 2. В каждом кадре вычисляем t = elapsed/duration
     * 3. Применяем easing к t
     * 4. Интерполируем каждую переменную от текущей к целевой
     */
    const transitionCssVars = useCallback(async (
        toVars: Record<string, string>,
        options: TransitionOptions = {}
    ): Promise<void> => {
        cancelTransition();

        const duration = options.duration ?? 600;
        const easing = options.easing ?? easeInOutCubic;

        if (duration === 0) {
            applyCssVars(toVars);
            return;
        }

        // Снимаем текущие значения переменных
        const root = document.documentElement;
        const computed = getComputedStyle(root);
        const fromVars: Record<string, string> = {};

        for (const key of Object.keys(toVars)) {
            const current = root.style.getPropertyValue(key) || computed.getPropertyValue(key);
            fromVars[key] = current.trim() || toVars[key];
        }

        return new Promise<void>((resolve) => {
            const startTime = performance.now();
            activeRef.current = true;

            const tick = (now: number) => {
                if (!activeRef.current) {
                    resolve();
                    return;
                }

                const elapsed = now - startTime;
                const rawT = Math.min(elapsed / duration, 1);
                const t = easing(rawT);

                // Интерполируем каждую переменную
                for (const [key, toValue] of Object.entries(toVars)) {
                    const fromValue = fromVars[key];
                    const interpolated = lerpColor(fromValue, toValue, t);
                    root.style.setProperty(key, interpolated);
                }

                if (rawT < 1) {
                    animFrameRef.current = requestAnimationFrame(tick);
                } else {
                    // Финальный кадр — точные значения
                    applyCssVars(toVars);
                    activeRef.current = false;
                    animFrameRef.current = null;
                    resolve();
                }
            };

            animFrameRef.current = requestAnimationFrame(tick);
        });
    }, [cancelTransition, applyCssVars]);

    return { transitionCssVars, applyCssVars, cancelTransition };
}
