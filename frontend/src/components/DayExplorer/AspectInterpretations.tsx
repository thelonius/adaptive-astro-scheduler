import React, { useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Badge,
    Box,
    HStack,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import type { Aspect } from '@adaptive-astro/shared/types';
import { corpusService, aspectKeyOf, type CorpusEntry } from '../../services/corpusService';
import { GlossTerm } from '../../shell/Glossary';

const ASPECT_DEGREES: Record<string, number> = {
    conjunction: 0, sextile: 60, square: 90, trine: 120, quincunx: 150, opposition: 180,
};
const ASPECT_LABEL: Record<number, string> = {
    0: 'соединение', 60: 'секстиль', 90: 'квадрат', 120: 'тригон',
    150: 'квинконс', 180: 'оппозиция',
};
const ASPECT_TOKEN: Record<number, string> = {
    0: '☌', 60: '✶', 90: '□', 120: '△', 150: '⚻', 180: '☍',
};
// Гармоничные аспекты зелёным, напряжённые красным — так же, как их
// раскрашивает колесо.
const ASPECT_TONE: Record<number, string> = {
    0: 'gray', 60: 'green', 90: 'red', 120: 'green', 150: 'orange', 180: 'red',
};

/** Первые N символов до границы предложения — чтобы карточка не разъезжалась. */
function preview(text: string, max = 260): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut) + '…';
}

interface Props {
    aspects: Aspect[];
    /** Сколько авторов показывать на аспект. */
    limit?: number;
}

/**
 * Толкования аспектов дня из корпуса ZET.
 *
 * Тексты отдаются как есть, с указанием автора: это чужие книги под
 * копирайтом, и атрибуция здесь не украшение. Пересказ своими словами —
 * следующий шаг плана, пока показываем источник честно.
 */
export const AspectInterpretations: React.FC<Props> = ({ aspects, limit = 3 }) => {
    const [byKey, setByKey] = useState<Map<string, CorpusEntry[]>>(new Map());
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    // Аспекты приходят из колеса и меняются на каждый шаг даты; ключи
    // считаем отдельно, чтобы запрос не улетал повторно на тот же набор.
    const queries = useMemo(
        () =>
            aspects
                .map((a) => {
                    const deg = ASPECT_DEGREES[a.type];
                    if (deg === undefined || !a.body1?.name || !a.body2?.name) return null;
                    return { planet1: a.body1.name, planet2: a.body2.name, aspect: deg, deg };
                })
                .filter((q): q is NonNullable<typeof q> => q !== null),
        [aspects],
    );
    const signature = useMemo(
        () => queries.map((q) => aspectKeyOf(q.planet1, q.planet2, q.deg)).sort().join(','),
        [queries],
    );

    useEffect(() => {
        if (queries.length === 0) {
            setByKey(new Map());
            return;
        }
        let cancelled = false;
        setLoading(true);
        setFailed(false);
        corpusService
            .aspects(queries.map(({ planet1, planet2, aspect }) => ({ planet1, planet2, aspect })), limit)
            .then((res) => {
                if (!cancelled) setByKey(res);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // signature покрывает содержимое queries; сам массив пересоздаётся каждый рендер.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature, limit]);

    if (queries.length === 0) {
        return (
            <Text fontSize="sm" color="var(--ag-text-muted)">
                Аспектов в орбисе на этот момент нет.
            </Text>
        );
    }

    if (loading && byKey.size === 0) {
        return (
            <HStack color="var(--ag-text-muted)" fontSize="sm">
                <Spinner size="sm" />
                <Text>Ищу толкования…</Text>
            </HStack>
        );
    }

    if (failed) {
        return (
            <Text fontSize="sm" color="var(--ag-text-muted)">
                Корпус недоступен. Аспекты на колесе это не затрагивает.
            </Text>
        );
    }

    const withText = queries.filter((q) => (byKey.get(aspectKeyOf(q.planet1, q.planet2, q.deg))?.length ?? 0) > 0);

    if (withText.length === 0) {
        return (
            <Text fontSize="sm" color="var(--ag-text-muted)">
                Для сегодняшних {queries.length} аспектов в корпусе толкований не нашлось.
            </Text>
        );
    }

    return (
        <VStack align="stretch" spacing={2}>
            <Accordion allowMultiple>
                {withText.map((q) => {
                    const entries = byKey.get(aspectKeyOf(q.planet1, q.planet2, q.deg)) ?? [];
                    const tone = ASPECT_TONE[q.deg] ?? 'gray';
                    return (
                        <AccordionItem key={`${q.planet1}-${q.planet2}-${q.deg}`} borderColor="var(--ag-border)">
                            <AccordionButton px={2}>
                                <HStack flex="1" spacing={2} textAlign="left">
                                    <Text fontSize="lg" color={`${tone}.400`} minW="6">
                                        {ASPECT_TOKEN[q.deg] ?? '·'}
                                    </Text>
                                    <Text fontSize="sm" fontWeight="600" color="var(--ag-text)">
                                        <GlossTerm kind="planet" term={q.planet1} />{' '}
                                        {ASPECT_LABEL[q.deg] ?? `${q.deg}°`}{' '}
                                        <GlossTerm kind="planet" term={q.planet2} />
                                    </Text>
                                    <Badge colorScheme={tone} variant="subtle" fontSize="10px">
                                        {entries.length} {entries.length === 1 ? 'источник' : 'источника'}
                                    </Badge>
                                </HStack>
                                <AccordionIcon />
                            </AccordionButton>

                            <AccordionPanel px={2} pb={4}>
                                <VStack align="stretch" spacing={3}>
                                    {entries.map((e) => (
                                        <Box
                                            key={e.id}
                                            borderLeft="2px solid"
                                            borderColor="var(--ag-border-strong)"
                                            pl={3}
                                        >
                                            <Text fontSize="11px" color="var(--ag-text-accent)" mb={1}>
                                                {e.author ?? e.sourceTitle}
                                            </Text>
                                            <Text fontSize="sm" color="var(--ag-text)" whiteSpace="pre-wrap">
                                                {preview(e.body)}
                                            </Text>
                                        </Box>
                                    ))}
                                </VStack>
                            </AccordionPanel>
                        </AccordionItem>
                    );
                })}
            </Accordion>

            <Text fontSize="10px" color="var(--ag-text-muted)">
                Тексты приведены дословно и принадлежат указанным авторам.
            </Text>
        </VStack>
    );
};
