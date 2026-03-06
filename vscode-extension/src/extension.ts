/**
 * Antigravity VS Code Extension — Main Entry Point
 *
 * Автоматически обновляет тему редактора на основе:
 * - Хальдейского управителя дня недели
 * - Текущего планетарного часа  
 * - Астрологического расписания (через API)
 * - Времени суток (dark/light auto-switch)
 *
 * Переход между темами: анимированный через пошаговую
 * интерполяцию цветов (VS Code не поддерживает CSS transitions).
 */

import * as vscode from 'vscode';
import {
    PLANET_COLORS,
    WEEKDAY_RULERS,
    getPlanetaryHourRuler,
    type PlanetName,
} from './colors';
import {
    computeAstroThemeColors,
    getAutoColorMode,
    getMsUntilNextSolarTransition,
    computeSolarTimes,
    generateDarkColorCustomizations,
    generateLightColorCustomizations,
    generateTransitionSteps,
    type AstroThemeColors,
    type ColorMode,
} from './themeGenerator';

// ============================================================================
// STATE
// ============================================================================

let statusBarItem: vscode.StatusBarItem | undefined;
let autoUpdateTimer: NodeJS.Timeout | undefined;
let hourlyCheckTimer: NodeJS.Timeout | undefined;
let isTransitioning = false;
let currentColors: Record<string, string> = {};
let currentThemeColors: AstroThemeColors | undefined;

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

export function activate(context: vscode.ExtensionContext) {
    console.log('🌟 Antigravity Astro Theme activated');

    // Создаём статус-бар
    setupStatusBar(context);

    // Регистрируем команды
    const commands = [
        vscode.commands.registerCommand('antigravity.applyDayTheme', () => applyThemeNow()),
        vscode.commands.registerCommand('antigravity.toggleMode', () => toggleColorMode()),
        vscode.commands.registerCommand('antigravity.showPlanetaryInfo', () => showPlanetaryInfo()),
        vscode.commands.registerCommand('antigravity.startAutoUpdate', () => startAutoUpdate()),
        vscode.commands.registerCommand('antigravity.stopAutoUpdate', () => stopAutoUpdate()),
    ];

    context.subscriptions.push(...commands);

    // Запускаем авто-обновление (и первичное применение) если включено
    const config = vscode.workspace.getConfiguration('antigravity');
    if (config.get<boolean>('autoUpdate', false)) {
        applyThemeNow();
        startAutoUpdate();
    }

    // Слушаем изменения конфигурации
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('antigravity') ||
                e.affectsConfiguration('workbench.colorTheme') ||
                e.affectsConfiguration('window.autoDetectColorScheme')) {
                applyThemeNow();
            }
        })
    );

    // Слушаем реальные переключения активной темы (напр. от ОС)
    context.subscriptions.push(
        vscode.window.onDidChangeActiveColorTheme(e => {
            console.log('Antigravity: Active theme changed by system or user, updating colors...');
            applyThemeNow();
        })
    );

    vscode.window.showInformationMessage(
        `🌟 Antigravity: ${getPlanetaryGreeting()}`,
        'Show Info'
    ).then(action => {
        if (action === 'Show Info') {
            showPlanetaryInfo();
        }
    });
}

export function deactivate() {
    stopAutoUpdate();
    console.log('Antigravity Astro Theme deactivated');
}

// ============================================================================
// CORE THEME APPLICATION
// ============================================================================

async function applyThemeNow(): Promise<void> {
    const config = vscode.workspace.getConfiguration('antigravity');
    const configMode = config.get<string>('colorMode', 'auto');
    const transitionDuration = config.get<number>('transitionDuration', 800);
    const lat = config.get<number>('latitude');
    const lon = config.get<number>('longitude');
    const solarPolicy = config.get<'strict' | 'civil' | 'nautical'>('solarPolicy', 'civil');

    const now = new Date();

    // Определяем режим на основе текущей активной темы VS Code!
    let mode: ColorMode;
    const activeKind = vscode.window.activeColorTheme.kind;

    if (activeKind === vscode.ColorThemeKind.Light || activeKind === vscode.ColorThemeKind.HighContrastLight) {
        mode = 'light';
    } else {
        mode = 'dark';
    }

    // Получаем personalPlanet из настроек или API
    const personalPlanet = await getPersonalPlanet(config);

    // Вычисляем цвета
    const themeColors = computeAstroThemeColors(now, mode, personalPlanet);

    // Генерируем colorCustomizations
    const newColors = mode === 'dark'
        ? generateDarkColorCustomizations(themeColors)
        : generateLightColorCustomizations(themeColors);

    // Применяем с анимированным переходом
    await applyColorsWithTransition(newColors, transitionDuration, mode);

    // Обновляем состояние
    currentThemeColors = themeColors;

    // Обновляем статус-бар
    updateStatusBar(themeColors);

    console.log(`Antigravity: Applied ${mode} theme — ${themeColors.description}`);
}

/**
 * Применить цвета с анимированным переходом
 * VS Code не поддерживает CSS transitions, поэтому применяем
 * цвета пошагово через setInterval (имитация твининга)
 */
async function applyColorsWithTransition(
    targetColors: Record<string, string>,
    durationMs: number,
    mode: ColorMode
): Promise<void> {
    if (isTransitioning) return;

    const fromColors = currentColors;
    const hasFromColors = Object.keys(fromColors).length > 0;

    // Если нет предыдущих цветов или переход мгновенный — применяем сразу
    if (!hasFromColors || durationMs === 0) {
        await setColorCustomizations(targetColors, mode);
        currentColors = targetColors;
        return;
    }

    isTransitioning = true;

    const STEPS = Math.max(3, Math.floor(durationMs / 50)); // ~20fps
    const STEP_DELAY = durationMs / STEPS;
    const frames = generateTransitionSteps(fromColors, targetColors, STEPS);

    return new Promise<void>((resolve) => {
        let frameIndex = 0;

        const tick = async () => {
            if (frameIndex >= frames.length) {
                // Финальный кадр — точные целевые цвета
                await setColorCustomizations(targetColors, mode);
                currentColors = targetColors;
                isTransitioning = false;
                resolve();
                return;
            }

            await setColorCustomizations(frames[frameIndex], mode);
            frameIndex++;
            setTimeout(tick, STEP_DELAY);
        };

        setTimeout(tick, STEP_DELAY);
    });
}

/**
 * Применить colorCustomizations через VS Code API (глобально, но с привязкой к конкретной теме!)
 */
async function setColorCustomizations(colors: Record<string, string>, mode: ColorMode): Promise<void> {
    try {
        const config = vscode.workspace.getConfiguration('workbench');
        const currentCustomizations = config.get<Record<string, any>>('colorCustomizations') || {};
        const themeKey = mode === 'dark' ? '[Antigravity Dark (Cosmic)]' : '[Antigravity Light (Solar)]';

        // Копируем существующие настройки, чтобы не затереть чужие
        const newCustomizations = { ...currentCustomizations };

        // Удаляем глобальные ключи, если они были записаны ранее по ошибке, 
        // чтобы они не перекрывали theme-specific настройки
        const keysToClean = Object.keys(colors);
        for (const key of keysToClean) {
            if (newCustomizations[key] !== undefined) {
                delete newCustomizations[key];
            }
        }

        // Записываем цвета строго в блок конкретной темы
        newCustomizations[themeKey] = colors;

        await config.update(
            'colorCustomizations',
            newCustomizations,
            vscode.ConfigurationTarget.Global
        );
    } catch (e) {
        console.error('Antigravity: Failed to set color customizations', e);
    }
}

// ============================================================================
// AUTO-UPDATE SCHEDULER
// ============================================================================

function startAutoUpdate(): void {
    stopAutoUpdate(); // Очищаем предыдущий таймер

    const config = vscode.workspace.getConfiguration('antigravity');
    const interval = config.get<string>('updateInterval', 'onPlanetaryHour');

    if (interval === 'onPlanetaryHour') {
        scheduleOnPlanetaryHour();
    } else if (interval === 'hourly') {
        scheduleHourly();
    } else {
        scheduleDailyAtMidnight();
    }

    vscode.window.showInformationMessage('🌟 Antigravity: Auto-update started');
}

function stopAutoUpdate(): void {
    if (autoUpdateTimer) {
        clearTimeout(autoUpdateTimer);
        autoUpdateTimer = undefined;
    }
    if (hourlyCheckTimer) {
        clearInterval(hourlyCheckTimer);
        hourlyCheckTimer = undefined;
    }
}

/**
 * Планировать обновление при смене планетарного часа
 * Каждый новый час суток = новый планетарный управитель
 */
function scheduleOnPlanetaryHour(): void {
    const config = vscode.workspace.getConfiguration('antigravity');
    const lat = config.get<number>('latitude');
    const lon = config.get<number>('longitude');
    const solarPolicy = config.get<'strict' | 'civil' | 'nautical'>('solarPolicy', 'civil');

    const now = new Date();

    // Если есть координаты — планируем точно на восход/закат
    if (lat !== undefined && lon !== undefined) {
        const msUntilSolar = getMsUntilNextSolarTransition(now, lat, lon, solarPolicy);
        const solar = computeSolarTimes(now, lat, lon);
        console.log(
            `Antigravity: Next solar event in ${Math.round(msUntilSolar / 60000)} min` +
            ` (↑${solar.sunrise.toLocaleTimeString()} ↓${solar.sunset.toLocaleTimeString()})`
        );

        autoUpdateTimer = setTimeout(() => {
            applyThemeNow();
            // После первого солнечного события — снова планируем
            scheduleOnPlanetaryHour();
        }, msUntilSolar);
    } else {
        // Фолбэк: каждый час (нет координат)
        const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
        autoUpdateTimer = setTimeout(() => {
            applyThemeNow();
            hourlyCheckTimer = setInterval(() => { applyThemeNow(); }, 60 * 60 * 1000);
        }, msUntilNextHour);
        console.log(`Antigravity: No coordinates set — checking every hour`);
    }
}

function scheduleHourly(): void {
    hourlyCheckTimer = setInterval(() => {
        applyThemeNow();
    }, 60 * 60 * 1000);
}

function scheduleDailyAtMidnight(): void {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    autoUpdateTimer = setTimeout(() => {
        applyThemeNow();
        scheduleDailyAtMidnight(); // Рекурсивно
    }, msUntilMidnight);
}

// ============================================================================
// TOGGLE DARK/LIGHT
// ============================================================================

async function toggleColorMode(): Promise<void> {
    const config = vscode.workspace.getConfiguration('workbench');
    const currentTheme = config.get<string>('colorTheme', '');

    const nextTheme = currentTheme === 'Antigravity Dark (Cosmic)'
        ? 'Antigravity Light (Solar)'
        : 'Antigravity Dark (Cosmic)';

    await config.update('colorTheme', nextTheme, vscode.ConfigurationTarget.Global);

    // Принудительно запускаем пересчёт цветов для новой темы
    await applyThemeNow();

    const modeEmoji = nextTheme.includes('Dark') ? '🌙' : '☀️';
    vscode.window.showInformationMessage(`${modeEmoji} Antigravity: Switched to ${nextTheme.includes('Dark') ? 'Dark' : 'Light'} mode`);
}

// ============================================================================
// STATUS BAR
// ============================================================================

function setupStatusBar(context: vscode.ExtensionContext): void {
    const config = vscode.workspace.getConfiguration('antigravity');
    if (!config.get<boolean>('showStatusBar', true)) return;

    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'antigravity.showPlanetaryInfo';
    statusBarItem.text = '$(star) Antigravity';
    statusBarItem.tooltip = 'Click to show planetary info';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

function updateStatusBar(colors: AstroThemeColors): void {
    if (!statusBarItem) return;

    const dayInfo = WEEKDAY_RULERS[new Date().getDay()];
    const now = new Date();
    const hourRuler = getPlanetaryHourRuler(now);
    const hourPlanet = PLANET_COLORS[hourRuler];
    const dayPlanet = PLANET_COLORS[colors.dayRuler];
    const modeIcon = colors.mode === 'dark' ? '🌙' : '☀️';

    // Показать время восхода/заката если есть координаты
    const config2 = vscode.workspace.getConfiguration('antigravity');
    const lat2 = config2.get<number>('latitude');
    const lon2 = config2.get<number>('longitude');
    let solarSuffix = '';
    if (lat2 !== undefined && lon2 !== undefined) {
        const solar = computeSolarTimes(now, lat2, lon2);
        const rise = solar.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const set = solar.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        solarSuffix = ` ↑${rise} ↓${set}`;
    }

    statusBarItem.text = `${modeIcon} ${dayPlanet.symbol}${hourPlanet.symbol}${solarSuffix}`;
    statusBarItem.tooltip = new vscode.MarkdownString(
        `**Antigravity Astro Theme**\n\n` +
        `${modeIcon} Mode: **${colors.mode}**\n\n` +
        `${dayPlanet.symbol} Day Ruler: **${dayPlanet.nameRu}** (${dayInfo.nameRu})\n\n` +
        `${hourPlanet.symbol} Hour Ruler: **${hourPlanet.nameRu}**\n\n` +
        `🎨 Primary color: \`${colors.primary}\`\n\n` +
        `_Click to show full info_`
    );
    statusBarItem.tooltip.isTrusted = true;
}

// ============================================================================
// INFO PANEL
// ============================================================================

function showPlanetaryInfo(): void {
    const now = new Date();
    const dayInfo = WEEKDAY_RULERS[now.getDay()];
    const hourRuler = getPlanetaryHourRuler(now);
    const hourPlanet = PLANET_COLORS[hourRuler];
    const dayPlanet = PLANET_COLORS[dayInfo.planet];
    const mode = currentThemeColors?.mode || getAutoColorMode(now);

    const panel = vscode.window.createWebviewPanel(
        'antigravityInfo',
        '🌟 Antigravity Planetary Info',
        vscode.ViewColumn.Beside,
        { enableScripts: false, retainContextWhenHidden: false }
    );

    panel.webview.html = getPlanetaryInfoHtml(
        now, dayInfo, dayPlanet, hourPlanet, hourRuler, mode, currentThemeColors
    );
}

function getPlanetaryInfoHtml(
    now: Date,
    dayInfo: typeof WEEKDAY_RULERS[0],
    dayPlanet: typeof PLANET_COLORS[PlanetName],
    hourPlanet: typeof PLANET_COLORS[PlanetName],
    hourRuler: PlanetName,
    mode: ColorMode,
    colors?: AstroThemeColors
): string {
    const primary = colors?.primary || dayPlanet.base;
    const bg = mode === 'dark' ? '#080c18' : '#f0f4fc';
    const text = mode === 'dark' ? '#e8edf7' : '#1a2035';
    const surface = mode === 'dark' ? '#0f1626' : '#ffffff';
    const muted = mode === 'dark' ? '#6b7fa8' : '#5a6a8a';

    const planets = Object.entries(PLANET_COLORS) as Array<[PlanetName, typeof PLANET_COLORS[PlanetName]]>;

    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Antigravity Planetary Info</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: ${bg};
    color: ${text};
    padding: 24px;
    min-height: 100vh;
    background-image: radial-gradient(ellipse at top, ${primary}10 0%, transparent 60%);
  }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px;
       background: linear-gradient(135deg, ${primary}, ${colors?.accent || primary});
       -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { font-size: 12px; color: ${muted}; margin-bottom: 24px; }
  .card { background: ${surface}; border-radius: 12px; padding: 16px; margin-bottom: 12px;
          border: 1px solid ${primary}20; }
  .card h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
             color: ${muted}; margin-bottom: 12px; }
  .ruler-row { display: flex; align-items: center; gap: 12px; }
  .planet-icon { width: 44px; height: 44px; border-radius: 50%; display: flex;
                 align-items: center; justify-content: center; font-size: 22px;
                 box-shadow: 0 0 16px ${primary}50; }
  .ruler-info h4 { font-size: 15px; font-weight: 600; }
  .ruler-info small { font-size: 12px; color: ${muted}; }
  .color-strip { height: 6px; border-radius: 3px; margin-top: 12px;
                 background: linear-gradient(90deg, ${primary}, ${colors?.secondary || primary}, ${colors?.accent || primary}); }
  .planets-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .planet-cell { text-align: center; padding: 8px 4px; border-radius: 8px;
                 border: 1px solid transparent; cursor: default; }
  .planet-cell .p-symbol { font-size: 18px; margin-bottom: 4px; }
  .planet-cell .p-name { font-size: 10px; color: ${muted}; }
  .schedule { font-size: 12px; line-height: 1.8; }
  .hour-row { display: flex; justify-content: space-between; align-items: center;
              padding: 4px 8px; border-radius: 6px; }
  .hour-row.active { background: ${primary}15; font-weight: 600; }
  .mode-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px;
               font-weight: 600; background: ${primary}25; color: ${primary}; border: 1px solid ${primary}40; }
  .hex-chip { font-family: monospace; font-size: 11px; padding: 2px 8px;
              border-radius: 4px; background: ${primary}15; color: ${primary}; }
</style>
</head>
<body>
<h1>🌟 Antigravity Astro Theme</h1>
<div class="subtitle">${now.toLocaleString('ru-RU')} · <span class="mode-badge">${mode === 'dark' ? '🌙 Тёмная' : '☀️ Светлая'}</span></div>

<div class="card">
  <h3>Управитель дня</h3>
  <div class="ruler-row">
    <div class="planet-icon" style="background:${dayPlanet.base}20; border: 1px solid ${dayPlanet.base}40">${dayPlanet.symbol}</div>
    <div class="ruler-info">
      <h4 style="color:${dayPlanet.base}">${dayPlanet.nameRu}</h4>
      <small>${dayInfo.nameRu} · ${dayPlanet.archetype}</small>
    </div>
  </div>
  <div class="color-strip" style="background: linear-gradient(90deg, ${dayPlanet.dark}, ${dayPlanet.base}, ${dayPlanet.light})"></div>
</div>

<div class="card">
  <h3>Текущий планетарный час</h3>
  <div class="ruler-row">
    <div class="planet-icon" style="background:${hourPlanet.base}20; border: 1px solid ${hourPlanet.base}40; animation: pulse 3s infinite">
      ${hourPlanet.symbol}
    </div>
    <div class="ruler-info">
      <h4 style="color:${hourPlanet.base}">${hourPlanet.nameRu}</h4>
      <small>${now.getHours()}:00 – ${now.getHours() + 1}:00 · ${hourPlanet.archetype}</small>
    </div>
  </div>
</div>

<div class="card">
  <h3>Палитра дня</h3>
  <div style="display:flex; gap:8px; margin-bottom:8px; align-items:center">
    <div style="width:36px;height:36px;border-radius:50%;background:${colors?.primary || primary};box-shadow:0 0 12px ${primary}50"></div>
    <div style="width:28px;height:28px;border-radius:50%;background:${colors?.secondary || primary}"></div>
    <div style="width:22px;height:22px;border-radius:50%;background:${colors?.accent || primary}"></div>
    <span class="hex-chip">${primary}</span>
    <span class="hex-chip">${colors?.secondary || '—'}</span>
  </div>
  <div class="color-strip"></div>
</div>

<div class="card">
  <h3>Все планеты</h3>
  <div class="planets-grid">
    ${planets.map(([name, p]) => `
      <div class="planet-cell" style="border-color:${p.base}25; background:${p.base}08">
        <div class="p-symbol">${p.symbol}</div>
        <div class="p-name" style="color:${p.base}">${p.nameRu}</div>
      </div>
    `).join('')}
  </div>
</div>

<style>
@keyframes pulse { 0%,100% { box-shadow: 0 0 8px ${hourPlanet.base}40; } 50% { box-shadow: 0 0 24px ${hourPlanet.base}80; } }
</style>
</body>
</html>`;
}

// ============================================================================
// HELPERS
// ============================================================================

async function getPersonalPlanet(config: vscode.WorkspaceConfiguration): Promise<PlanetName | null> {
    const apiUrl = config.get<string>('apiUrl', 'http://localhost:3001');
    const chartId = config.get<string>('natalChartId', '');

    if (!chartId) return null;

    try {
        // Dynamic import для http (Node.js built-in)
        const https = await import('https');
        const http = await import('http');
        const client = apiUrl.startsWith('https') ? https : http;

        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 2000);
            client.get(`${apiUrl}/api/natal-chart/${chartId}`, (res) => {
                clearTimeout(timeout);
                let data = '';
                res.on('data', (chunk: string) => data += chunk);
                res.on('end', () => {
                    try {
                        const chart = JSON.parse(data);
                        // Берём знак ASC → управитель
                        const ascHouse = chart.data?.houses?.find((h: any) => h.number === 1);
                        if (ascHouse?.zodiacSign) {
                            const sign = typeof ascHouse.zodiacSign === 'string'
                                ? ascHouse.zodiacSign
                                : ascHouse.zodiacSign?.name;
                            const ruler = sign ? PLANET_COLORS[getSignRuler(sign) as PlanetName] : null;
                            resolve(ruler ? getSignRuler(sign) as PlanetName : null);
                        } else {
                            resolve(null);
                        }
                    } catch {
                        resolve(null);
                    }
                });
                res.on('error', () => { clearTimeout(timeout); resolve(null); });
            }).on('error', () => { clearTimeout(timeout); resolve(null); });
        });
    } catch {
        return null;
    }
}

function getSignRuler(sign: string): string {
    const rulers: Record<string, string> = {
        aries: 'Mars', taurus: 'Venus', gemini: 'Mercury', cancer: 'Moon',
        leo: 'Sun', virgo: 'Mercury', libra: 'Venus', scorpio: 'Pluto',
        sagittarius: 'Jupiter', capricorn: 'Saturn', aquarius: 'Uranus', pisces: 'Neptune',
        // Русские названия
        овен: 'Mars', телец: 'Venus', близнецы: 'Mercury', рак: 'Moon',
        лев: 'Sun', дева: 'Mercury', весы: 'Venus', скорпион: 'Pluto',
        стрелец: 'Jupiter', козерог: 'Saturn', водолей: 'Uranus', рыбы: 'Neptune',
    };
    return rulers[sign.toLowerCase()] || 'Sun';
}

function getPlanetaryGreeting(): string {
    const now = new Date();
    const dayInfo = WEEKDAY_RULERS[now.getDay()];
    const hourRuler = getPlanetaryHourRuler(now);
    const dayPlanet = PLANET_COLORS[dayInfo.planet];
    const hourPlanet = PLANET_COLORS[hourRuler];
    return `${dayPlanet.symbol} ${dayPlanet.nameRu} · ${hourPlanet.symbol} ${hourPlanet.nameRu} · ${dayInfo.nameRu}`;
}
