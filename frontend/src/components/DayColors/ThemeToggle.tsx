/**
 * ThemeToggle — кнопка переключения тёмной/светлой темы
 */

import React from 'react';
import { IconButton, Tooltip, useColorMode } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion.div;

interface ThemeToggleProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'ghost' | 'outline' | 'solid';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
    size = 'md',
    variant = 'ghost',
}) => {
    const { colorMode, toggleColorMode } = useColorMode();
    const isDark = colorMode === 'dark';

    const bg = 'transparent';
    const hoverBg = 'var(--ag-surface-hover)';
    const borderColor = 'var(--ag-border)';

    return (
        <Tooltip
            label={isDark ? 'Светлая тема' : 'Тёмная тема'}
            placement="bottom"
            hasArrow
        >
            <IconButton
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleColorMode}
                size={size}
                variant={variant}
                bg={bg}
                _hover={{ bg: hoverBg }}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="full"
                icon={
                    <AnimatePresence mode="wait" initial={false}>
                        <MotionBox
                            key={isDark ? 'moon' : 'sun'}
                            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <span style={{ fontSize: size === 'sm' ? '14px' : '18px' }}>
                                {isDark ? '☀️' : '🌙'}
                            </span>
                        </MotionBox>
                    </AnimatePresence>
                }
            />
        </Tooltip>
    );
};

export default ThemeToggle;
