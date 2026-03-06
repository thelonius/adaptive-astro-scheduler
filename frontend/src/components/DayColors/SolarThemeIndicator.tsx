/**
 * SolarThemeIndicator — компонент отображения солнечного времени
 * и статуса авто-переключения темы
 */
import React, { useMemo } from 'react';
import {
    Box, HStack, VStack, Text, Tooltip, Badge,
    useColorModeValue, Icon, Spinner,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SolarTimes, SolarPeriod } from '../../hooks/useSolarTimes';

const MotionBox = motion(Box);

interface SolarThemeIndicatorProps {
    solarTimes: SolarTimes | null;
    isTransitioning?: boolean;
    isLoading?: boolean;
    compact?: boolean;
}

/** Иконка + цвет для каждого солнечного периода */
const PERIOD_CONFIG: Record<SolarPeriod, {
    icon: string;
    labelRu: string;
    gradient: string;
    glowColor: string;
}> = {
    night: { icon: '🌑', labelRu: 'Ночь', gradient: 'linear(to-r, #080c18, #0f1626)', glowColor: '#4B5A9C' },
    astronomical_twilight: { icon: '🌌', labelRu: 'Астрон. сумерки', gradient: 'linear(to-r, #0a0d20, #1a1040)', glowColor: '#3060C0' },
    nautical_twilight: { icon: '🌃', labelRu: 'Морские сумерки', gradient: 'linear(to-r, #0d1530, #1e2848)', glowColor: '#4080D0' },
    civil_twilight: { icon: '🌅', labelRu: 'Гражданские сумерки', gradient: 'linear(to-r, #FF6030, #FF9060)', glowColor: '#FF7040' },
    day: { icon: '☀️', labelRu: 'День', gradient: 'linear(to-r, #FFD700, #FFA500)', glowColor: '#FFB020' },
};

/** Форматировать ISO строку в локальное время HH:MM */
function formatTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/** Прогресс дня (0–1) */
function getDayProgress(solarTimes: SolarTimes): number {
    if (!solarTimes.sunriseTs || !solarTimes.sunsetTs) return 0;
    const now = Date.now() / 1000;
    const total = solarTimes.sunsetTs - solarTimes.sunriseTs;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, (now - solarTimes.sunriseTs) / total));
}

export const SolarThemeIndicator: React.FC<SolarThemeIndicatorProps> = ({
    solarTimes,
    isTransitioning = false,
    isLoading = false,
    compact = false,
}) => {
    const bg = 'var(--ag-surface)';
    const border = 'var(--ag-border)';
    const muted = 'var(--ag-text-muted)';

    const period = solarTimes?.currentPeriod ?? 'night';
    const cfg = PERIOD_CONFIG[period];
    const progress = useMemo(() => solarTimes ? getDayProgress(solarTimes) : 0, [solarTimes]);

    if (isLoading) {
        return (
            <HStack spacing={2} px={3} py={2}>
                <Spinner size="xs" color="blue.400" />
                <Text fontSize="xs" color={muted}>Загрузка данных солнца…</Text>
            </HStack>
        );
    }

    if (!solarTimes) return null;

    if (compact) {
        return (
            <Tooltip
                label={`${cfg.labelRu} · Восход ${formatTime(solarTimes.sunrise)} · Закат ${formatTime(solarTimes.sunset)}`}
                placement="bottom"
                hasArrow
            >
                <MotionBox
                    display="inline-flex"
                    alignItems="center"
                    gap={1.5}
                    px={2}
                    py={1}
                    borderRadius="full"
                    border="1px solid"
                    borderColor={`${cfg.glowColor}40`}
                    bg={`${cfg.glowColor}12`}
                    cursor="default"
                    whileHover={{ scale: 1.05 }}
                    animate={isTransitioning ? { opacity: [1, 0.6, 1] } : undefined}
                    transition={isTransitioning ? { duration: 1.2, repeat: Infinity } as any : undefined}
                >
                    <Text fontSize="14px" lineHeight={1}>{cfg.icon}</Text>
                    <Text fontSize="xs" fontWeight="600" color={cfg.glowColor}>
                        {cfg.labelRu}
                    </Text>
                    {isTransitioning && (
                        <Box w="6px" h="6px" borderRadius="full" bg={cfg.glowColor}
                            style={{ animation: 'pulse 1s infinite' }} />
                    )}
                </MotionBox>
            </Tooltip>
        );
    }

    return (
        <MotionBox
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 } as any}
            bg={bg}
            border="1px solid"
            borderColor={border}
            borderRadius="xl"
            overflow="hidden"
            position="relative"
        >
            {/* Верхняя полоска-градиент */}
            <Box
                h="3px"
                bgGradient={cfg.gradient}
                transition="all 1.5s ease"
            />

            {/* Световой ореол */}
            <Box
                position="absolute"
                top={0} left={0} right={0} h="60px"
                background={`radial-gradient(ellipse at top, ${cfg.glowColor}15 0%, transparent 70%)`}
                pointerEvents="none"
                transition="all 1.5s ease"
            />

            <Box px={4} py={3} position="relative">
                {/* Текущий период */}
                <HStack justify="space-between" mb={3}>
                    <HStack spacing={2}>
                        <AnimatePresence mode="wait">
                            <MotionBox
                                key={period}
                                initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
                                transition={{ duration: 0.4 } as any}
                                fontSize="22px"
                            >
                                {cfg.icon}
                            </MotionBox>
                        </AnimatePresence>
                        <VStack align="start" spacing={0}>
                            <Text fontWeight="700" fontSize="sm" color={cfg.glowColor}>
                                {cfg.labelRu}
                            </Text>
                            <Text fontSize="xs" color={muted}>
                                {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </VStack>
                    </HStack>

                    {isTransitioning && (
                        <Badge
                            fontSize="xs"
                            colorScheme="orange"
                            borderRadius="full"
                            px={2}
                            animation="pulse 1.5s infinite"
                        >
                            переход…
                        </Badge>
                    )}
                </HStack>

                {/* Прогресс-бар дня */}
                {solarTimes.sunriseTs && solarTimes.sunsetTs && (
                    <Box mb={3}>
                        <Box
                            h="4px"
                            bg="var(--ag-day-glow)"
                            borderRadius="full"
                            overflow="hidden"
                        >
                            <MotionBox
                                h="full"
                                borderRadius="full"
                                bgGradient="linear(to-r, #FF9060, #FFD700, #FF9060)"
                                animate={{ width: `${progress * 100}%` }}
                                transition={{ duration: 1.5, ease: 'easeOut' } as any}
                            />
                        </Box>
                        <HStack justify="space-between" mt={1}>
                            <Text fontSize="10px" color={muted}>🌅 {formatTime(solarTimes.sunrise)}</Text>
                            {solarTimes.dayLengthMinutes && (
                                <Text fontSize="10px" color={muted}>
                                    {Math.round(solarTimes.dayLengthMinutes / 60)}ч {Math.round(solarTimes.dayLengthMinutes % 60)}м
                                </Text>
                            )}
                            <Text fontSize="10px" color={muted}>🌇 {formatTime(solarTimes.sunset)}</Text>
                        </HStack>
                    </Box>
                )}

                {/* Ключевые события дня */}
                <Box>
                    <Text fontSize="10px" color={muted} textTransform="uppercase" letterSpacing="0.08em" mb={1.5}>
                        События дня
                    </Text>
                    <HStack spacing={3} flexWrap="wrap">
                        {[
                            { label: 'Астрон. рассвет', time: solarTimes.astronomicalDawn, icon: '🌌' },
                            { label: 'Восход', time: solarTimes.sunrise, icon: '🌅' },
                            { label: 'Полдень', time: solarTimes.solarNoon, icon: '🌞' },
                            { label: 'Закат', time: solarTimes.sunset, icon: '🌇' },
                            { label: 'Астрон. сумерки', time: solarTimes.astronomicalDusk, icon: '🌃' },
                        ].map(({ label, time, icon }) => (
                            time && (
                                <Tooltip key={label} label={label} hasArrow placement="top">
                                    <HStack
                                        spacing={1}
                                        px={2} py={0.5}
                                        borderRadius="md"
                                        bg="var(--ag-day-glow)"
                                        border="1px solid"
                                        borderColor={border}
                                        cursor="default"
                                    >
                                        <Text fontSize="11px">{icon}</Text>
                                        <Text fontSize="11px" fontWeight="500" fontFamily="mono">
                                            {formatTime(time)}
                                        </Text>
                                    </HStack>
                                </Tooltip>
                            )
                        ))}
                    </HStack>
                </Box>
            </Box>
        </MotionBox>
    );
};

export default SolarThemeIndicator;
