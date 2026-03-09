import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Text,
    HStack,
    VStack,
    Badge,
    Spinner,
    Tooltip,
    useColorModeValue,
    Select,
    Flex,
    Heading,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverArrow,
    PopoverBody,
    PopoverHeader,
    Divider,
} from '@chakra-ui/react';
import type { DispositorChainsResponse, DispositorChainEntry } from '@adaptive-astro/shared/types/astrology';
import { dispositorService } from '../../services/dispositorService';
import { useLocationStore } from '../../store/locationStore';
import './DispositorChains.css';

// ── Planet meta ──────────────────────────────────────────────────────────────
const PLANET_META: Record<string, { color: string; glyph: string }> = {
    Sun: { color: '#FFD700', glyph: '☉' },
    Moon: { color: '#C0C8D8', glyph: '☽' },
    Mercury: { color: '#A0C4FF', glyph: '☿' },
    Venus: { color: '#90EE90', glyph: '♀' },
    Mars: { color: '#FF6B6B', glyph: '♂' },
    Jupiter: { color: '#FFA500', glyph: '♃' },
    Saturn: { color: '#B8860B', glyph: '♄' },
    Uranus: { color: '#40E0D0', glyph: '♅' },
    Neptune: { color: '#6A5ACD', glyph: '♆' },
    Pluto: { color: '#8B4513', glyph: '♇' },
};

// ── Legend helpers ────────────────────────────────────────────────────────────
interface LegendRowProps {
    preview: React.ReactNode;
    label: string;
    desc: string;
}
const LegendRow: React.FC<LegendRowProps> = ({ preview, label, desc }) => (
    <HStack spacing={3} align="flex-start">
        <Box flexShrink={0} minW="32px" display="flex" justifyContent="center" alignItems="flex-start" pt="2px">
            {preview}
        </Box>
        <Box>
            <Text fontSize="12px" fontWeight="600" color="whiteAlpha.900">{label}</Text>
            <Text fontSize="11px" color="whiteAlpha.600" lineHeight="1.4">{desc}</Text>
        </Box>
    </HStack>
);

const LegendPopover: React.FC = () => (
    <Popover placement="bottom-start" trigger="hover" openDelay={150}>
        <PopoverTrigger>
            <Box as="button" className="legend-btn" aria-label="Легенда" title="Что означают элементы?">
                ℹ
            </Box>
        </PopoverTrigger>
        <PopoverContent className="legend-popover" maxW="310px" zIndex={2000}>
            <PopoverArrow bg="rgba(18,13,38,0.97)" />
            <PopoverHeader borderColor="rgba(138,43,226,0.3)" pb={2}>
                <Text fontSize="13px" fontWeight="700" color="purple.300">
                    ⛓️ Как читать цепочки
                </Text>
            </PopoverHeader>
            <PopoverBody>
                <VStack spacing={3} align="stretch">
                    <Text fontSize="11px" color="whiteAlpha.600" lineHeight="1.5">
                        Каждая планета «управляется» правителем знака, в котором стоит.
                        Цепочка показывает, куда ведёт эта связь.
                    </Text>

                    <Divider borderColor="rgba(255,255,255,0.08)" />
                    <Text fontSize="10px" fontWeight="700" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wider">
                        Узлы — планеты
                    </Text>

                    <LegendRow
                        preview={
                            <Box className="dispositor-node start-node" style={{ '--planet-color': '#9f7aea' } as React.CSSProperties} py="2px" px="5px" minW="auto">
                                <Text fontSize="11px" color="#9f7aea">♃</Text>
                            </Box>
                        }
                        label="Начальная планета (жирная обводка)"
                        desc="Планета, с которой начинается данная строка-цепочка"
                    />
                    <LegendRow
                        preview={
                            <Box className="dispositor-node cycle-node" style={{ '--planet-color': '#9f7aea' } as React.CSSProperties} py="2px" px="5px" minW="auto">
                                <Text fontSize="11px" color="#9f7aea">♃</Text>
                            </Box>
                        }
                        label="Узел цикла (пунктирная обводка)"
                        desc="Планета входит в замкнутый цикл — ни одна не является финальным управителем"
                    />
                    <LegendRow
                        preview={
                            <Box className="dispositor-node final-node" style={{ '--planet-color': 'gold' } as React.CSSProperties} py="2px" px="5px" minW="auto">
                                <Text fontSize="11px" color="gold">♃</Text>
                            </Box>
                        }
                        label="Финальный управитель ♛ (золотая обводка)"
                        desc="Планета стоит в своём знаке — цепочка здесь заканчивается (доминиум)"
                    />

                    <Divider borderColor="rgba(255,255,255,0.08)" />
                    <Text fontSize="10px" fontWeight="700" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wider">
                        Стрелки
                    </Text>

                    <LegendRow
                        preview={<Text className="chain-arrow" fontSize="16px" color="rgba(255,255,255,0.4)" m={0} p={0}>→</Text>}
                        label="Управляет"
                        desc="Планета слева управляется планетой справа через знак зодиака"
                    />
                    <LegendRow
                        preview={<Text className="chain-arrow cycle-arrow" fontSize="18px" m={0} p={0}>↺</Text>}
                        label="Замыкание цикла (мигает)"
                        desc="Цепочка вернулась к уже встреченной планете — цикл замкнулся"
                    />

                    <Divider borderColor="rgba(255,255,255,0.08)" />
                    <Text fontSize="10px" fontWeight="700" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wider">
                        Мини-бейдж на узле
                    </Text>

                    <LegendRow
                        preview={<Badge className="cycle-badge" fontSize="9px">↺</Badge>}
                        label="↺ на узле"
                        desc="Этот узел является частью цикла (не начало цепочки)"
                    />
                    <LegendRow
                        preview={<Badge className="final-badge" fontSize="9px">♛</Badge>}
                        label="♛ на узле"
                        desc="Финальный управитель — планета в доме своего управления"
                    />

                    <Divider borderColor="rgba(255,255,255,0.08)" />
                    <Text fontSize="10px" fontWeight="700" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wider">
                        Статус строки
                    </Text>

                    <LegendRow
                        preview={<Badge className="chain-status-badge cycle" fontSize="9px">🔄 cycle</Badge>}
                        label="cycle"
                        desc="Нет финального управителя — планеты управляют друг другом по кругу"
                    />
                    <LegendRow
                        preview={<Badge className="chain-status-badge linear" fontSize="9px">♛ Sun</Badge>}
                        label="ends at…"
                        desc="Линейная цепочка — заканчивается у планеты в собственном знаке"
                    />
                    <LegendRow
                        preview={<Badge className="chain-status-badge mutual_reception" fontSize="9px">⟷ mutual reception</Badge>}
                        label="mutual reception"
                        desc="Взаимная рецепция — две планеты управляют друг другом"
                    />

                    <Divider borderColor="rgba(255,255,255,0.08)" />
                    <Text fontSize="10px" fontWeight="700" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wider">
                        Бейджи в шапке
                    </Text>

                    <LegendRow
                        preview={<Badge bg="rgba(255,215,0,0.15)" color="gold" border="1px solid rgba(255,215,0,0.3)" fontSize="9px">♛ Sun</Badge>}
                        label="Финальные управители"
                        desc="Планеты, стоящие в своём знаке — самодостаточны, ни от кого не зависят"
                    />
                    <LegendRow
                        preview={<Badge colorScheme="purple" variant="subtle" fontSize="9px">⟷ V↔M</Badge>}
                        label="Взаимная рецепция"
                        desc="Две планеты стоят в знаках друг друга — взаимно усиливают и поддерживают"
                    />
                </VStack>
            </PopoverBody>
        </PopoverContent>
    </Popover>
);

// ── Planet Node ───────────────────────────────────────────────────────────────
interface PlanetNodeProps {
    name: string;
    sign: string;
    isCycleNode?: boolean;
    isFinal?: boolean;
    isStart?: boolean;
}

const PlanetNode: React.FC<PlanetNodeProps> = ({ name, sign, isCycleNode, isFinal, isStart }) => {
    const meta = PLANET_META[name] ?? { color: '#888', glyph: name[0] };
    return (
        <Tooltip label={`${name} in ${sign}`} placement="top" hasArrow>
            <Box
                className={[
                    'dispositor-node',
                    isCycleNode ? 'cycle-node' : '',
                    isFinal ? 'final-node' : '',
                    isStart ? 'start-node' : '',
                ].filter(Boolean).join(' ')}
                style={{ '--planet-color': meta.color } as React.CSSProperties}
            >
                <Text className="planet-glyph">{meta.glyph}</Text>
                <Text className="planet-name">{name}</Text>
                <Text className="planet-sign">{sign}</Text>
                {isFinal && <Badge className="final-badge">♛</Badge>}
                {isCycleNode && !isStart && <Badge className="cycle-badge">↺</Badge>}
            </Box>
        </Tooltip>
    );
};

// ── Chain Row ─────────────────────────────────────────────────────────────────
interface ChainRowProps {
    rootPlanet: string;
    entry: DispositorChainEntry;
    fullMap: Record<string, { sign: string; ruler: string }>;
}

const ChainRow: React.FC<ChainRowProps> = ({ entry, fullMap }) => {
    // показываем цепочку до первого повтора (цикл замыкается)
    const seenAt: Record<string, number> = {};
    const displayChain: string[] = [];
    for (const p of entry.chain) {
        if (seenAt[p] !== undefined) {
            displayChain.push(p);
            break;
        }
        seenAt[p] = displayChain.length;
        displayChain.push(p);
    }

    return (
        <Box className="chain-row">
            <HStack spacing={0} align="center" flexWrap="wrap">
                {displayChain.map((planet, idx) => {
                    const isLast = idx === displayChain.length - 1;
                    const isRepeat = idx > 0 && displayChain.indexOf(planet) < idx;
                    const signInfo = fullMap[planet];
                    const sign = idx < entry.signs.length ? entry.signs[idx] : (signInfo?.sign ?? '?');
                    const isCycleNode = entry.cycle_nodes.includes(planet);
                    const isFinal = !!entry.final_dispositor && planet === entry.final_dispositor;
                    const isStart = idx === 0;

                    return (
                        <React.Fragment key={`${planet}-${idx}`}>
                            <PlanetNode
                                name={planet}
                                sign={sign}
                                isCycleNode={isCycleNode}
                                isFinal={isFinal}
                                isStart={isStart}
                            />
                            {!isLast && (
                                <Box className={`chain-arrow ${isRepeat ? 'cycle-arrow' : ''}`}>
                                    {isRepeat ? '↺' : '→'}
                                </Box>
                            )}
                        </React.Fragment>
                    );
                })}
            </HStack>
            <Badge className={`chain-status-badge ${entry.status}`} ml={2}>
                {(entry.status as string) === 'cycle' ? '🔄 cycle' :
                    `♛ ends at ${entry.final_dispositor}`}
            </Badge>
        </Box>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
interface DispositorChainsProps {
    date?: Date;
    onlyClassical?: boolean;
}

const CLASSICAL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

export const DispositorChains: React.FC<DispositorChainsProps> = ({
    date = new Date(),
    onlyClassical = true,
}) => {
    const [data, setData] = useState<DispositorChainsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [system, setSystem] = useState<'traditional' | 'modern'>('traditional');
    const [showAll, setShowAll] = useState(!onlyClassical);

    const { location } = useLocationStore();
    const bg = useColorModeValue('rgba(20,20,40,0.85)', 'rgba(10,10,25,0.9)');

    const fetchChains = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await dispositorService.getChains(
                date,
                location.latitude,
                location.longitude,
                system
            );
            setData(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load dispositor chains');
        } finally {
            setLoading(false);
        }
    }, [date, location, system]);

    useEffect(() => { fetchChains(); }, [fetchChains]);

    const planets = data
        ? Object.keys(data.chains).filter(p => showAll || CLASSICAL_PLANETS.includes(p))
        : [];

    return (
        <Box className="dispositor-chains" bg={bg}>
            {/* ── Header ── */}
            <Flex align="center" justify="space-between" mb={4} flexWrap="wrap" gap={2}>
                <HStack spacing={2}>
                    <LegendPopover />
                    <Heading size="sm" className="chains-title">
                        ⛓️ Цепочки управителей
                    </Heading>
                    {data?.mutual_receptions && data.mutual_receptions.length > 0 && (
                        <Tooltip label="Взаимная рецепция: две планеты в знаках друг друга" hasArrow>
                            <Badge colorScheme="purple" variant="subtle">
                                ⟷ {data.mutual_receptions.map(r => r.join('↔')).join(', ')}
                            </Badge>
                        </Tooltip>
                    )}
                    {data?.final_dispositors && data.final_dispositors.length > 0 && (
                        <Tooltip label="Финальные управители: стоят в своём знаке" hasArrow>
                            <Badge bg="rgba(255,215,0,0.15)" color="gold" border="1px solid rgba(255,215,0,0.25)">
                                ♛ {data.final_dispositors.join(', ')}
                            </Badge>
                        </Tooltip>
                    )}
                </HStack>

                <HStack spacing={2}>
                    <Select
                        size="xs"
                        value={system}
                        onChange={e => setSystem(e.target.value as 'traditional' | 'modern')}
                        width="130px"
                        className="system-select"
                    >
                        <option value="traditional">Traditional</option>
                        <option value="modern">Modern</option>
                    </Select>
                    <Badge
                        as="button"
                        onClick={() => setShowAll(v => !v)}
                        colorScheme="purple"
                        variant={showAll ? 'solid' : 'outline'}
                        cursor="pointer"
                        px={2} py={1}
                    >
                        {showAll ? 'All planets' : '7 classical'}
                    </Badge>
                </HStack>
            </Flex>

            {/* ── Content ── */}
            {loading && (
                <Flex justify="center" py={6}>
                    <Spinner color="purple.400" size="md" />
                </Flex>
            )}
            {error && <Box className="chains-error">{error}</Box>}
            {!loading && data && (
                <VStack spacing={3} align="stretch">
                    {planets.map(planet => (
                        <ChainRow
                            key={planet}
                            rootPlanet={planet}
                            entry={data.chains[planet]}
                            fullMap={data.full_map}
                        />
                    ))}
                </VStack>
            )}
        </Box>
    );
};
