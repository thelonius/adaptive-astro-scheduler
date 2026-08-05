import React, { useEffect, useState } from 'react';
import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Badge,
    Box,
    Card,
    CardBody,
    CardHeader,
    HStack,
    Heading,
    Spinner,
    Text,
    VStack,
} from '@chakra-ui/react';
import {
    houseRulerService,
    type HouseRulerPlacement,
} from '../../services/houseRulerService';
import { useLocationStore } from '../../store/locationStore';

const PLANET_GLYPH: Record<string, string> = {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const SIGN_RU: Record<string, string> = {
    Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнецы', Cancer: 'Рак',
    Leo: 'Лев', Virgo: 'Дева', Libra: 'Весы', Scorpio: 'Скорпион',
    Sagittarius: 'Стрелец', Capricorn: 'Козерог', Aquarius: 'Водолей', Pisces: 'Рыбы',
};

function preview(text: string, max = 240): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut) + '…';
}

interface Props {
    date: Date;
    system?: 'traditional' | 'modern';
}

/**
 * Управитель каждого дома и дом, в котором он стоит.
 *
 * Читается как «дела такой-то сферы решаются через такую-то»: управитель
 * первого дома в восьмом уводит вопросы себя в темы кризисов и чужих
 * ресурсов. Управитель, стоящий в своём же доме, помечается отдельно —
 * это замкнутая на себя сфера.
 */
export const HouseRulers: React.FC<Props> = ({ date, system = 'traditional' }) => {
    const { location } = useLocationStore();
    const [placements, setPlacements] = useState<HouseRulerPlacement[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    const dayKey = date.toISOString().split('T')[0];

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setFailed(false);
        houseRulerService
            .get(date, location.latitude, location.longitude, system)
            .then((res) => {
                if (!cancelled) setPlacements(res.placements ?? []);
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
        // Пересчитываем на смену суток и места, а не на каждый тик времени:
        // куспиды за минуты не сдвигаются настолько, чтобы менять дом.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dayKey, location.latitude, location.longitude, system]);

    return (
        <Card bg="var(--ag-surface)" borderColor="var(--ag-border)" borderWidth="1px">
            <CardHeader pb={2}>
                <Heading size="sm" color="var(--ag-text)">
                    🔑 Управители домов
                </Heading>
            </CardHeader>
            <CardBody pt={0}>
                {loading && placements.length === 0 ? (
                    <HStack color="var(--ag-text-muted)" fontSize="sm">
                        <Spinner size="sm" />
                        <Text>Считаю управителей…</Text>
                    </HStack>
                ) : failed ? (
                    <Text fontSize="sm" color="var(--ag-text-muted)">
                        Не удалось получить управителей домов.
                    </Text>
                ) : placements.length === 0 ? (
                    <Text fontSize="sm" color="var(--ag-text-muted)">
                        Управителей не нашлось: в ответе эфемерид нет нужных планет.
                    </Text>
                ) : (
                    <Accordion allowMultiple>
                        {placements.map((p) => (
                            <AccordionItem key={p.corpusTag + p.house} borderColor="var(--ag-border)">
                                <AccordionButton px={2}>
                                    <HStack flex="1" spacing={2} textAlign="left" minW={0}>
                                        <Badge
                                            colorScheme={p.isSelfContained ? 'purple' : 'gray'}
                                            variant="subtle"
                                            minW="7"
                                            textAlign="center"
                                        >
                                            {p.house}
                                        </Badge>
                                        <Text fontSize="sm" color="var(--ag-text)" noOfLines={1}>
                                            {SIGN_RU[p.sign] ?? p.sign} · {PLANET_GLYPH[p.ruler] ?? ''} {p.ruler}
                                            {' → '}
                                            <Text as="span" fontWeight="600">
                                                {p.rulerHouse} дом
                                            </Text>
                                        </Text>
                                        {p.isSelfContained && (
                                            <Badge colorScheme="purple" variant="outline" fontSize="9px">
                                                в своём
                                            </Badge>
                                        )}
                                    </HStack>
                                    <AccordionIcon />
                                </AccordionButton>

                                <AccordionPanel px={2} pb={4}>
                                    <VStack align="stretch" spacing={3}>
                                        {p.interpretations.length === 0 ? (
                                            <Text fontSize="sm" color="var(--ag-text-muted)">
                                                Толкования для {p.corpusTag} в корпусе нет.
                                            </Text>
                                        ) : (
                                            p.interpretations.map((e) => (
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
                                            ))
                                        )}
                                    </VStack>
                                </AccordionPanel>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardBody>
        </Card>
    );
};
