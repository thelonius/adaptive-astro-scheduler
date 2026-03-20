import { computeDayColorPalette } from '../../frontend/src/theme/natalDayColorEngine';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Artifact Path
const ARTIFACT_PATH = '/Users/eddubnitsky/.gemini/antigravity/brain/a6106649-1df2-4e82-8c40-4facb0a10f58/march_end_colors.md'

async function generate() {
    console.log("🚀 Starting color generation for the end of March...");

    // User data (Nikita)
    const birthData = {
        birthDate: '1991-06-26',
        birthTime: '09:43',
        latitude: 55.7558,
        longitude: 37.6173,
        timezone: 'Europe/Moscow'
    };

    // Calculate natal chart
    console.log("📊 Calculating natal chart...");
    const natalRes = await axios.post('http://localhost:3001/api/natal-chart/calculate', birthData);
    const natalChart = natalRes.data;

    // Dates from March 11 to March 31
    const startDate = new Date('2026-03-11T12:00:00');
    const daysCount = 21;

    let markdown = `# 🌈 Палитра цветов: 11 – 31 Марта 2026\n\n`;
    markdown += `**Для карты:** Никита, 26.06.1991 09:43, Москва\n\n`;
    markdown += `| Дата | Лунный день | Основной цвет | Акцентный цвет | Доминирует |
| :--- | :--- | :--- | :--- | :--- |\n`;

    for (let i = 0; i < daysCount; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        process.stdout.write(`Processing ${dateStr}... \r`);

        let transits = null;
        let lunarDay = null;

        try {
            const calendarRes = await axios.get('http://localhost:3001/api/calendar/day', {
                params: {
                    date: dateStr,
                    latitude: birthData.latitude,
                    longitude: birthData.longitude,
                    timezone: birthData.timezone
                }
            });
            transits = calendarRes.data.data.transitData || {};
            lunarDay = calendarRes.data.data.lunarDay;
        } catch (e: any) {
            console.error(`\nError for ${dateStr}: ${e.message}`);
        }

        const palette = computeDayColorPalette(d, natalChart, transits, lunarDay);

        const weekdayFormat = d.toLocaleDateString('ru-RU', { weekday: 'short', month: 'numeric', day: 'numeric' });

        markdown += `| ${weekdayFormat} | ${lunarDay?.number || '?'} | <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${palette.primary};border:1px solid #333;"></span> \`${palette.primary.toUpperCase()}\` | <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${palette.accent};border:1px solid #333;"></span> \`${palette.accent.toUpperCase()}\` | ${palette.transitRuler || palette.weekdayRuler} |\n`;
    }

    markdown += `\n\n### 🧬 Как использовать палитру\n`;
    markdown += `- **Основной цвет**: Идеален для базовых элементов одежды или фона рабочего стола.\n`;
    markdown += `- **Акцентный цвет**: Используйте для аксессуаров или выделения важных задач в планере.\n`;
    markdown += `- **Доминирует**: Планета, чья энергия наиболее проявлена в этот день через транзиты или управление.\n`;

    fs.writeFileSync(ARTIFACT_PATH, markdown);
    console.log(`\n✅ Artifact created at: ${ARTIFACT_PATH}`);
}

generate().catch(console.error);
