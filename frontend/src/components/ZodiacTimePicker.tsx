import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { motion } from 'framer-motion';

// Zodiac signs with approximate starting hours for a 24h "Day Clock" mapping
// This maps the 24h day to the zodiac circle (Aries = 6AM roughly)
const ZODIAC_SIGNS = [
    { symbol: '♈', name: 'Aries', color: '#FF5733', startHour: 6 },
    { symbol: '♉', name: 'Taurus', color: '#C70039', startHour: 8 },
    { symbol: '♊', name: 'Gemini', color: '#900C3F', startHour: 10 },
    { symbol: '♋', name: 'Cancer', color: '#581845', startHour: 12 },
    { symbol: '♌', name: 'Leo', color: '#FFC300', startHour: 14 },
    { symbol: '♍', name: 'Virgo', color: '#DAF7A6', startHour: 16 },
    { symbol: '♎', name: 'Libra', color: '#33FF57', startHour: 18 },
    { symbol: '♏', name: 'Scorpio', color: '#33C7FF', startHour: 20 },
    { symbol: '♐', name: 'Sagittarius', color: '#3357FF', startHour: 22 },
    { symbol: '♑', name: 'Capricorn', color: '#8333FF', startHour: 0 },
    { symbol: '♒', name: 'Aquarius', color: '#C833FF', startHour: 2 },
    { symbol: '♓', name: 'Pisces', color: '#FF33A8', startHour: 4 },
];

interface ZodiacTimePickerProps {
    value: Date;
    onChange: (date: Date) => void;
    size?: number;
}

export const ZodiacTimePicker: React.FC<ZodiacTimePickerProps> = ({
    value,
    onChange,
    size = 200
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const wheelRef = useRef<HTMLDivElement>(null);
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const textColor = useColorModeValue('gray.800', 'white');

    const getAngleFromTime = (date: Date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        // 00:00 -> 0 degrees (Top)
        // 360 degrees = 24 hours
        return (totalMinutes / (24 * 60)) * 360;
    };

    const getTimeFromAngle = (angle: number) => {
        let normalized = angle % 360;
        if (normalized < 0) normalized += 360;

        // Convert angle to time
        const totalMinutes = (normalized / 360) * 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);

        const newDate = new Date(value);
        newDate.setHours(hours);
        newDate.setMinutes(minutes);
        return newDate;
    };

    const handleInteraction = (clientX: number, clientY: number) => {
        if (!wheelRef.current) return;
        const rect = wheelRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = clientX - centerX;
        const dy = clientY - centerY;

        // Calculate angle. Atan2(y,x) is standard.
        // We want 0 at top (-Y). 
        // angle = atan2(x, -y) gives 0 at top, increasing clockwise.
        let angleRad = Math.atan2(dx, -dy);
        let angleDeg = angleRad * (180 / Math.PI);

        onChange(getTimeFromAngle(angleDeg));
    };

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleInteraction(e.clientX, e.clientY);
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isDragging) handleInteraction(e.clientX, e.clientY);
        };
        const onMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging]);

    const currentAngle = getAngleFromTime(value);

    return (
        <Box
            ref={wheelRef}
            onMouseDown={onMouseDown}
            position="relative"
            width={`${size}px`}
            height={`${size}px`}
            borderRadius="full"
            bg={bgColor}
            border="4px solid"
            borderColor={borderColor}
            boxShadow="lg"
            cursor="pointer"
            userSelect="none"
            _hover={{ boxShadow: 'xl' }}
            transition="box-shadow 0.2s"
        >
            {/* Zodiac Sectors */}
            {ZODIAC_SIGNS.map((sign, index) => {
                const rotation = (sign.startHour / 24) * 360;
                return (
                    <Box
                        key={index}
                        position="absolute"
                        top="0"
                        left="50%"
                        height="50%"
                        width="2px"
                        transformOrigin="bottom center"
                        transform={`translateX(-50%) rotate(${rotation}deg)`}
                        pointerEvents="none"
                    >
                        {/* Tick */}
                        <Box width="2px" height="10px" bg={borderColor} />
                        {/* Symbol */}
                        <Text
                            position="absolute"
                            top="12px"
                            left="50%"
                            transform="translateX(-50%) rotate(0deg)" // Keeps symbol upright relative to tick? No, rotate with wheel
                            fontSize="xs"
                            fontWeight="bold"
                            color={sign.color}
                        >
                            {sign.symbol}
                        </Text>
                    </Box>
                );
            })}

            {/* Clock Hand */}
            <Box
                position="absolute"
                top="10%"
                left="50%"
                width="4px"
                height="40%"
                borderRadius="full"
                bgGradient="linear(to-t, purple.500, purple.300)"
                transformOrigin="bottom center"
                transform={`translateX(-50%) rotate(${currentAngle}deg)`}
                transition={isDragging ? 'none' : 'transform 0.1s'}
                pointerEvents="none"
                zIndex={2}
            >
                <Box
                    position="absolute"
                    top="-6px"
                    left="50%"
                    transform="translateX(-50%)"
                    width="12px"
                    height="12px"
                    borderRadius="full"
                    bg="purple.500"
                    boxShadow="0 0 10px var(--chakra-colors-purple-400)"
                />
            </Box>

            {/* Center Digital Time */}
            <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                textAlign="center"
                zIndex={3}
                bg={bgColor}
                borderRadius="full"
                p={2}
                boxShadow="sm"
            >
                <Text fontSize="xl" fontWeight="bold" color={textColor} fontFamily="monospace">
                    {value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
            </Box>
        </Box>
    );
};
