import React, { useEffect, useState, useMemo } from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';

interface AsciiCelestialArtProps {
    time: Date;
    width?: number | string;
    height?: number | string;
}

const SUN_ART = `
      \\   |   /
    '.  \\ | /  .'
      '.  *  .'
    - -  (O)  - -
      .'  *  '.
    .'  / | \\  '.
      /   |   \\
`;

const MOON_ART_FULL = `
       _..._
     .:::::::.
    :::::::::::
    :::::::::::
    ':::::::::'
      ':::::'
`;

const MOON_ART_CRESCENT = `
       _..._
     .::::. \`.
    :::::::.  :
    ::::::::  :
    '::::::' .'
      '::'..'
`;

// Helper to get art based on hour
const getCelestialArt = (date: Date) => {
    const hours = date.getHours();
    // Simple day/night
    if (hours >= 6 && hours < 18) {
        return { art: SUN_ART, type: 'sun', color: 'yellow.400' };
    } else {
        // Night - simplified phase logic based on day of month for demo
        // In reality would use moon phase
        const day = date.getDate();
        const isFull = day > 10 && day < 20;
        return {
            art: isFull ? MOON_ART_FULL : MOON_ART_CRESCENT,
            type: 'moon',
            color: 'gray.300'
        };
    }
};

const AsciiCelestialArtBase: React.FC<AsciiCelestialArtProps> = ({
    time,
    width = '100%',
    height = '300px'
}) => {
    const [frame, setFrame] = useState(0);
    const bgColor = useColorModeValue('gray.900', 'black');
    const textColor = useColorModeValue('green.400', 'green.300');

    // Animation loop
    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(f => f + 1);
        }, 200); // 5fps
        return () => clearInterval(interval);
    }, []);

    const { art, type, color } = useMemo(() => getCelestialArt(time), [time]);

    // Generate background stars
    const background = useMemo(() => {
        const rows = 15;
        const cols = 40;
        let grid = '';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Random stars
                // Animate specific positions based on frame
                const isStar = (Math.sin(r * 32 + c * 43 + frame) > 0.95);
                if (isStar) {
                    const char = ['.', '*', '+', '°'][Math.floor(Math.random() * 4)];
                    grid += char;
                } else {
                    grid += ' ';
                }
            }
            grid += '\n';
        }
        return grid;
    }, [type, frame]); // Re-generate on frame tick

    // Overlay main art on background
    const finalArt = useMemo(() => {
        const bgLines = background.split('\n');
        const artLines = art.split('\n').filter(l => l.length > 0);

        // Center the art
        const startRow = Math.floor((bgLines.length - artLines.length) / 2);
        const startCol = Math.floor((40 - artLines[0].length) / 2); // Assuming 40 width

        let combined = [...bgLines];

        artLines.forEach((line, i) => {
            if (startRow + i >= 0 && startRow + i < combined.length) {
                const bgLine = combined[startRow + i];
                // Simple replace
                // A better way would be character by character
                // But let's just use CSS positioning to overlay for simplicity and better color control?
                // User asked for "Ascii", so pure text is best.
                // But overlaying strings is tricky with varying lengths.
                // Let's render them separately on top of each other!
            }
        });

        return background; // We will render main art absolutely positioned
    }, [background, art]);

    return (
        <Box
            w={width}
            h={height}
            bg={bgColor}
            color={textColor}
            fontFamily="monospace"
            fontSize="12px"
            whiteSpace="pre"
            overflow="hidden"
            position="relative"
            borderRadius="md"
            p={4}
            border="1px solid"
            borderColor="green.800"
            display="flex"
            alignItems="center"
            justifyContent="center"
        >
            {/* Background Stars (Always animating) */}
            <Text position="absolute" top={0} left={0} w="100%" h="100%" lineHeight="1.2" opacity={0.5}>
                {background}
            </Text>

            {/* Main Celestial Body */}
            <Text
                position="relative"
                color={color}
                fontWeight="bold"
                textShadow={`0 0 10px ${color}`}
                lineHeight="1.2"
                zIndex={1}
            >
                {art}
            </Text>

            {/* Time Stamp */}
            <Text position="absolute" bottom={2} right={4} fontSize="xs" color="gray.500">
                {time.toLocaleTimeString()}
            </Text>
        </Box>
    );
};

export const AsciiCelestialArt = React.memo(AsciiCelestialArtBase, (prev, next) => {
    return prev.time.getSeconds() === next.time.getSeconds() &&
        prev.width === next.width &&
        prev.height === next.height;
});
