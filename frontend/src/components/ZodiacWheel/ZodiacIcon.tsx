import React from 'react';

interface ZodiacIconProps {
  sign: string;
  size?: number;
  color?: string;
}

// Custom SVG paths for zodiac signs based on traditional astrological symbols
const zodiacSVGPaths: Record<string, string> = {
  // Aries (♈) - Ram's horns
  'Овен': 'M6 12C6 8 9 5 12 5C15 5 18 8 18 12M6 12C6 16 9 19 12 19M18 12C18 16 15 19 12 19M4 10L8 6M20 10L16 6',

  // Taurus (♉) - Bull's head with horns
  'Телец': 'M12 4C8 4 5 7 5 11C5 15 8 18 12 18C16 18 19 15 19 11C19 7 16 4 12 4ZM8 8L6 6M16 8L18 6M12 18V22',

  // Gemini (♊) - The twins (Roman numeral II with connections)
  'Близнецы': 'M8 4V20M16 4V20M5 8H11M13 8H19M5 16H11M13 16H19',

  // Cancer (♋) - Crab claws in circular formation
  'Рак': 'M6 8C6 6 8 4 10 4C12 4 12 6 12 8C12 6 12 4 14 4C16 4 18 6 18 8M6 16C6 18 8 20 10 20C12 20 12 18 12 16C12 18 12 20 14 20C16 20 18 18 18 16M6 8C4 8 4 10 4 12C4 14 4 16 6 16M18 8C20 8 20 10 20 12C20 14 20 16 18 16',

  // Leo (♌) - Lion's mane and tail
  'Лев': 'M6 6C6 4 8 2 12 2C16 2 18 4 18 6C18 8 16 10 12 10C8 10 6 8 6 6ZM12 10V18M12 18C12 20 14 22 16 22M16 18C18 18 20 20 20 22',

  // Virgo (♍) - Stylized 'M' with curved tail
  'Дева': 'M4 20V8C4 6 6 4 8 4C10 4 12 6 12 8V16M12 8C12 6 14 4 16 4C18 4 20 6 20 8V16M20 16C20 18 18 20 16 20C14 20 14 18 16 18C18 18 20 16 20 16',

  // Libra (♎) - Scales/Balance
  'Весы': 'M4 14H20M7 14C7 12 9 10 12 10C15 10 17 12 17 14M4 18C4 16 6 14 8 14C10 14 12 16 12 18C12 16 14 14 16 14C18 14 20 16 20 18M12 6V10',

  // Scorpio (♏) - Scorpion with stinger
  'Скорпион': 'M4 20V8C4 6 6 4 8 4C10 4 12 6 12 8V16M12 8C12 6 14 4 16 4C18 4 20 6 20 8V16M20 16L22 14M20 16L22 18M20 16H18',

  // Sagittarius (♐) - Archer's arrow
  'Стрелец': 'M6 18L18 6M15 4H20V9M12 12L14 10M10 14L12 12',

  // Capricorn (♑) - Goat with fish tail
  'Козерог': 'M4 16C4 12 7 8 12 8C17 8 20 12 20 16M20 16C20 18 18 20 16 20C14 20 12 18 12 16M16 20C18 20 20 22 20 22M4 8L6 6',

  // Aquarius (♒) - Water waves
  'Водолей': 'M2 10C4 8 6 12 8 10C10 8 12 12 14 10C16 8 18 12 20 10C22 8 24 12 26 10M2 14C4 12 6 16 8 14C10 12 12 16 14 14C16 12 18 16 20 14C22 12 24 16 26 14',

  // Pisces (♓) - Two fish connected
  'Рыбы': 'M8 4C6 4 4 6 4 8C4 10 6 12 8 12C6 12 4 14 4 16C4 18 6 20 8 20M16 4C18 4 20 6 20 8C20 10 18 12 16 12C18 12 20 14 20 16C20 18 18 20 16 20M4 12H20'
};

// Fallback Unicode symbols
const zodiacSymbolMap: Record<string, string> = {
  'Овен': '♈',
  'Телец': '♉',
  'Близнецы': '♊',
  'Рак': '♋',
  'Лев': '♌',
  'Дева': '♍',
  'Весы': '♎',
  'Скорпион': '♏',
  'Стрелец': '♐',
  'Козерог': '♑',
  'Водолей': '♒',
  'Рыбы': '♓',
};

export const ZodiacIcon: React.FC<ZodiacIconProps> = ({
  sign,
  size = 24,
  color = 'currentColor'
}) => {
  const svgPath = zodiacSVGPaths[sign];

  if (svgPath) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'inline-block' }}
      >
        <path d={svgPath} />
      </svg>
    );
  }

  // Fallback to Unicode symbol
  return (
    <span
      style={{
        fontSize: size,
        color: color,
        fontFamily: 'serif',
        fontWeight: 'bold',
        display: 'inline-block',
        lineHeight: 1,
      }}
    >
      {zodiacSymbolMap[sign] || '?'}
    </span>
  );
};

export default ZodiacIcon;