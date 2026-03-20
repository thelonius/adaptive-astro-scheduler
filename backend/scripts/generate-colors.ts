import { computeDayColorPalette } from '../../frontend/src/theme/natalDayColorEngine';
import axios from 'axios';
import fs from 'fs';

async function generate() {
    console.log("Рассчитываем натальную карту...");
    const natalRes = await axios.post('http://176.123.166.252:3000/api/natal-chart/calculate', {
        birthDate: '1991-06-26',
        birthTime: '09:43',
        latitude: 55.7558,
        longitude: 37.6173,
        timezone: 'Europe/Moscow'
    });
    const natalChart = natalRes.data;

    let markdown = `# 🌈 Ваш персональный цветной календарь (на неделю)\n\n`;
    markdown += `> Рассчитан для карты: **26.06.1991 09:43**\n\n`;
    markdown += `Алгоритм *Antigravity Color Engine* смешивает цвета исходя из: энергии дня недели, управителя вашего Асцендента, главного планетарного транзита и влияния лунного дня.\n\n`;

    // 7 days from today
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        console.log(`Получаем транзиты для ${dateStr}...`);

        let transits = null;
        let lunarDay = null;

        try {
            const calendarRes = await axios.get(`http://176.123.166.252:3000/api/calendar/day`, {
                params: { date: dateStr, latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow' }
            });
            transits = calendarRes.data.transitData;
            lunarDay = calendarRes.data.lunarDay;
        } catch (e: any) {
            console.error("Ошибка при получении данных календаря: " + e.message);
        }

        const palette = computeDayColorPalette(d, natalChart, transits, lunarDay);

        const weekdayFormat = d.toLocaleDateString('ru-RU', { weekday: 'long', month: 'long', day: 'numeric' });

        markdown += `### 📅 ${weekdayFormat}\n`;
        markdown += `<div style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">`;
        markdown += `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: ${palette.primary}; box-shadow: 0 0 10px ${palette.dark.glowStrong}"></div>`;
        markdown += `<b>Основной оттенок дня:</b> <code>${palette.primary}</code>`;
        markdown += `</div>\n\n`;

        markdown += `**Из чего сложился цвет:**\n`;
        palette.sources.forEach(s => {
            markdown += `- **${s.label}** (${s.planet}, вес ${Math.round(s.weight * 100)}%): ${s.reason}\n`;
        });
        markdown += `\n---\n`;
    }

    fs.writeFileSync('/Users/eddubnitsky/.gemini/antigravity/brain/49eee244-798d-4ba6-9871-9cc83d04500c/colored_calendar.md', markdown);
    console.log('Artifact colored_calendar.md created');
}

generate().catch(console.error);
