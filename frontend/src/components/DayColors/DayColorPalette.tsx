/**
 * DayColorPalette — визуальная карточка персонализированных цветов дня
 *
 * Показывает:
 * - Управитель дня недели + его цвет
 * - Личный управитель ASC (если есть натальная карта)
 * - Доминирующий транзит
 * - Цвета лунного дня
 * - Финальная смешанная палитра с градиентом
 */

import React, { useMemo } from 'react';
import {
    Box,
    Card,
    CardBody,
    CardHeader,
    Heading,
    Text,
    VStack,
    HStack,
    Tooltip,
    Badge,
    Divider,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import type { DayColorPalette as DayColorPaletteType } from '../../theme/natalDayColorEngine';
import { PLANET_COLORS } from '../../theme/planetColors';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

interface DayColorPaletteProps {
    palette: DayColorPaletteType;
    lunarDayColors?: string[];
    isCompact?: boolean;
}

/** Один цветовой кружок с тултипом */
const ColorDot: React.FC<{
    color: string;
    label: string;
    size?: string;
    animated?: boolean;
}> = ({ color, label, size = '32px', animated = false }) => (
    <Tooltip label={label} placement="top" hasArrow>
        <MotionBox
            w={size}
            h={size}
            borderRadius="full"
            bg={color}
            border="2px solid"
            borderColor="whiteAlpha.200"
            cursor="pointer"
            flexShrink={0}
            whileHover={{ scale: 1.15 }}
            animate={animated ? {
                boxShadow: [
                    `0 0 8px ${color}40`,
                    `0 0 20px ${color}70`,
                    `0 0 8px ${color}40`,
                ],
            } : undefined}
            transition={animated ? { duration: 2.5, repeat: Infinity } as any : undefined}
            style={{ boxShadow: `0 0 8px ${color}40` }}
        />
    </Tooltip>
);

/** Строка источника цвета */
const ColorSourceRow: React.FC<{
    planet: string;
    weight: number;
    label: string;
    reason: string;
    color: string;
    delay?: number;
}> = ({ planet, weight, label, reason, color, delay = 0 }) => {
    const planetInfo = PLANET_COLORS[planet as keyof typeof PLANET_COLORS];
    const mutedColor = 'var(--ag-text-muted)';
    const bgColor = 'var(--ag-day-glow)';

    return (
        <MotionBox
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay } as any}
        >
            <HStack
                p={3}
                borderRadius="lg"
                bg={bgColor}
                border="1px solid"
                borderColor={`${color}25`}
                spacing={3}
                _hover={{ borderColor: `${color}50`, bg: `${color}08` }}
                transition="all 0.2s ease"
            >
                {/* Цветовой кружок */}
                <Box
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    bg={color}
                    flexShrink={0}
                    boxShadow={`0 0 12px ${color}50`}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="16px"
                >
                    {planetInfo?.symbol || '●'}
                </Box>

                {/* Информация */}
                <VStack align="start" spacing={0} flex={1} minW={0}>
                    <HStack spacing={2}>
                        <Text fontWeight="600" fontSize="sm" color={color}>
                            {planetInfo?.nameRu || planet}
                        </Text>
                        <Badge
                            fontSize="xs"
                            px={1.5}
                            py={0.5}
                            borderRadius="full"
                            bg={`${color}20`}
                            color={color}
                            border="1px solid"
                            borderColor={`${color}40`}
                        >
                            {label}
                        </Badge>
                    </HStack>
                    <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                        {reason}
                    </Text>
                </VStack>

                {/* Вес */}
                <VStack spacing={0} align="end" flexShrink={0}>
                    <Text fontSize="xs" color={mutedColor}>вес</Text>
                    <Text fontWeight="700" fontSize="sm" color={color}>
                        {Math.round(weight * 100)}%
                    </Text>
                </VStack>
            </HStack>
        </MotionBox>
    );
};

/** Градиентная полоса финальной палитры */
const GradientBar: React.FC<{
    colors: string[];
    height?: string;
}> = ({ colors, height = '12px' }) => {
    const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;

    return (
        <Box
            w="100%"
            h={height}
            borderRadius="full"
            background={gradient}
            boxShadow={`0 0 12px ${colors[0]}40`}
            position="relative"
            overflow="hidden"
        >
            {/* Шимер */}
            <MotionBox
                position="absolute"
                top={0}
                left="-100%"
                w="60%"
                h="100%"
                background="linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
                animate={{ left: ['−100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' } as any}
            />
        </Box>
    );
};

export const DayColorPalette: React.FC<DayColorPaletteProps> = ({
    palette,
    lunarDayColors = [],
    isCompact = false,
}) => {
    const cardBg = 'var(--ag-surface)';
    const borderColor = 'var(--ag-border)';
    const mutedColor = 'var(--ag-text-muted)';
    const headingColor = 'var(--ag-text)';

    // Цвет для источника (из PLANET_COLORS по теме)
    const getSourceColor = (planet: string): string => {
        const info = PLANET_COLORS[planet as keyof typeof PLANET_COLORS];
        return info?.base || '#808080';
    };

    // Финальные цвета для градиент-бара
    const paletteColors = useMemo(() => {
        const colors = [palette.primary, palette.secondary, palette.accent];
        if (lunarDayColors.length > 0) colors.push(...lunarDayColors.slice(0, 2));
        return colors;
    }, [palette, lunarDayColors]);

    return (
        <MotionCard
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 } as any}
            bg={cardBg}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            overflow="hidden"
            position="relative"
        >
            {/* Верхняя градиентная полоска */}
            <Box
                h="3px"
                background={`linear-gradient(90deg, ${palette.primary}, ${palette.secondary}, ${palette.accent})`}
            />

            {/* Тонкое свечение фона */}
            <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                h="120px"
                background={`radial-gradient(ellipse at top, ${palette.primary}12 0%, transparent 70%)`}
                pointerEvents="none"
            />

            <CardHeader pb={2} position="relative">
                <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={0}>
                        <Heading size="sm" color={headingColor} fontFamily="var(--ag-font-heading)">
                            🎨 Цвета дня
                        </Heading>
                        <Text fontSize="xs" color={mutedColor}>
                            Персональная палитра по натальной карте
                        </Text>
                    </VStack>

                    {/* Три финальных цвета */}
                    <HStack spacing={1.5}>
                        <ColorDot color={palette.primary} label="Основной цвет" size="24px" animated />
                        <ColorDot color={palette.secondary} label="Вторичный цвет" size="24px" />
                        <ColorDot color={palette.accent} label="Акцентный цвет" size="24px" />
                    </HStack>
                </HStack>
            </CardHeader>

            <CardBody pt={0}>
                <VStack align="stretch" spacing={3}>
                    {/* Градиент-бар */}
                    <GradientBar colors={paletteColors} />

                    {!isCompact && (
                        <>
                            <Divider />

                            {/* Источники цветов */}
                            <Text fontSize="xs" fontWeight="600" color={mutedColor} textTransform="uppercase" letterSpacing="0.05em">
                                Источники
                            </Text>

                            <VStack align="stretch" spacing={2}>
                                {palette.sources.map((source, i) => (
                                    <ColorSourceRow
                                        key={`${source.planet}-${i}`}
                                        planet={source.planet}
                                        weight={source.weight}
                                        label={source.label}
                                        reason={source.reason}
                                        color={getSourceColor(source.planet)}
                                        delay={i * 0.08}
                                    />
                                ))}
                            </VStack>

                            {/* Лунные цвета (если есть) */}
                            {lunarDayColors.length > 0 && (
                                <>
                                    <Divider />
                                    <VStack align="stretch" spacing={1.5}>
                                        <Text fontSize="xs" fontWeight="600" color={mutedColor} textTransform="uppercase" letterSpacing="0.05em">
                                            🌙 Цвета лунного дня
                                        </Text>
                                        <HStack spacing={2}>
                                            {lunarDayColors.map((c, i) => (
                                                <ColorDot key={i} color={c} label={`Лунный цвет ${i + 1}`} size="28px" />
                                            ))}
                                        </HStack>
                                    </VStack>
                                </>
                            )}
                        </>
                    )}

                    {/* Метка управителя дня */}
                    <Box
                        p={2.5}
                        borderRadius="md"
                        bg={`${palette.primary}12`}
                        border="1px solid"
                        borderColor={`${palette.primary}25`}
                    >
                        <HStack spacing={2}>
                            <Text fontSize="sm">
                                {PLANET_COLORS[palette.weekdayRuler]?.symbol || '⭐'}
                            </Text>
                            <Text fontSize="xs" color={palette.primary} fontWeight="600">
                                {PLANET_COLORS[palette.weekdayRuler]?.nameRu} управляет этим днём
                            </Text>
                        </HStack>
                    </Box>
                </VStack>
            </CardBody>
        </MotionCard>
    );
};

export default DayColorPalette;
