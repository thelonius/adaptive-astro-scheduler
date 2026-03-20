import { computeDayColorPalette } from '../../frontend/src/theme/natalDayColorEngine';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Artifact Path (using current conversation artifact directory if available)
const ARTIFACT_PATH = '/Users/eddubnitsky/.gemini/antigravity/brain/a6106649-1df2-4e82-8c40-4facb0a10f58/lunar_cycle_colors.md'

async function generate() {
    console.log("🚀 Starting lunar cycle color generation...");

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

    // Define current lunar cycle (Approx Feb 17 - March 18, 2026)
    // We'll calculate for 31 days from Feb 17 to include the whole cycle
    const cycleStart = new Date('2026-02-17T12:00:00');
    const daysCount = 31;

    let markdown = `# 🌑 Цвета текущего лунного цикла (Февраль - Март 2026)\n\n`;
    markdown += `**Данные:** Никита, 26.06.1991 09:43, Москва\n\n`;
    markdown += `| Дата | Лунный день | Основной цвет | Значение | Управитель |\n`;
    markdown += `| :--- | :--- | :--- | :--- | :--- |\n`;

    for (let i = 0; i < daysCount; i++) {
        const d = new Date(cycleStart);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        process.stdout.write(`Processing ${dateStr}... \r`);

        let transits = null;
        let lunarDay = null;

        try {
            // Get lunar day and transit data from our calendar API
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
            console.error(`\nError for ${dateStr}: \${e.message}`);
        }

        const palette = computeDayColorPalette(d, natalChart, transits, lunarDay);

        const weekdayFormat = d.toLocaleDateString('ru-RU', { weekday: 'short', month: 'numeric', day: 'numeric' });
        const colorName = palette.primary.toUpperCase();

        // Construct table row
        markdown += `| ${weekdayFormat} | ${lunarDay?.number || '?'} | <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${palette.primary};border:1px solid #333;margin-right:8px;"></span> \`${colorName}\` | ${lunarDay?.symbol || ''} | ${palette.weekdayRuler} |\n`;
    }

    markdown += `\n\n### 🧬 Алгоритм расчета\n`;
    markdown += `Для каждого дня мы смешиваем:\n`;
    markdown += `1. **Управителя дня недели** (35%) — задает базовый ритм.\n`;
    markdown += `2. **Вашего натального управителя ASC** (30%) — Меркурий (так как вы Близнецы/Девы по ASC в 1991.06.26?)\n`;
    markdown += `3. **Доминирующий транзит дня** (25%) — самая интенсивная энергия момента.\n`;
    markdown += `4. **Цвет лунного дня** (10%) — эмоциональную окраску цикла.\n`;

    fs.writeFileSync(ARTIFACT_PATH, markdown);
    console.log(`\n✅ Artifact created at: \${ARTIFACT_PATH}`);
}

generate().catch(console.error);
