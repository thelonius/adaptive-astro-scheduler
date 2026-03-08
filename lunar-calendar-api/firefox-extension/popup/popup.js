// Popup script for Lunar Calendar Extension

// Initialize localization immediately
let lunarL10n;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize localization first
    await initializeLocalization();

    await loadLunarData();

    // Add retry button listener
    document.getElementById('retryBtn').addEventListener('click', () => {
        loadLunarData();
    });

    // Add language switcher listeners
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            console.log('Language button clicked:', btn.dataset.lang);
            const newLang = btn.dataset.lang;
            await switchLanguage(newLang);
        });
    });

    // Add test button listener
    document.getElementById('testBtn').addEventListener('click', async () => {
        try {
            const response = await fetch('http://localhost:8000/api/v1/lunar-day');
            alert(`API Test: Status ${response.status} - ${response.ok ? 'Success' : 'Failed'}`);
        } catch (error) {
            alert(`API Test Failed: ${error.message}`);
        }
    });

    // Add debug button listener
    document.getElementById('debugBtn').addEventListener('click', () => {
        console.log('Debug info:');
        console.log('- window.location:', window.location);
        console.log('- fetch available:', typeof fetch !== 'undefined');
        console.log('- browser API:', typeof browser !== 'undefined');
        console.log('- chrome API:', typeof chrome !== 'undefined');
        alert('Debug info logged to console (F12)');
    });
});

async function loadLunarData() {
    showLoading();

    try {
        console.log('Starting to load lunar data...');

        // Use background script only (CORS safe)
        const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        console.log('Using browser API:', browserAPI ? 'available' : 'not available');

        if (!browserAPI || !browserAPI.runtime) {
            throw new Error('Browser runtime API not available');
        }

        const data = await browserAPI.runtime.sendMessage({ action: 'getLunarData' });
        console.log('Background script response:', data);

        if (data) {
            displayLunarData(data);
            showContent();
        } else {
            console.log('No data received from background script');
            showError();
        }
    } catch (error) {
        console.error('Error loading lunar data:', error);
        console.error('Error details:', error.message, error.stack);
        showError();
    }
}

function displayLunarData(data) {
    // Update lunar day info
    document.getElementById('dayNumber').textContent = data.lunar_day;

    // Store original phase name and use translation
    const phaseElement = document.getElementById('phaseName');
    phaseElement.dataset.originalPhase = data.moon_phase.name;

    if (lunarL10n && lunarL10n.translateMoonPhase) {
        phaseElement.textContent = lunarL10n.translateMoonPhase(data.moon_phase.name);
    } else {
        phaseElement.textContent = data.moon_phase.name;
    }

    document.getElementById('illumination').textContent = `${data.moon_phase.illumination.toFixed(1)}%`;

    // Update progress
    const progressPercent = data.timing.progress_percentage;
    document.getElementById('progressFill').style.width = `${progressPercent}%`;

    const progressElement = document.getElementById('progressText');
    progressElement.dataset.progress = progressPercent.toFixed(1);

    if (lunarL10n && lunarL10n.t) {
        progressElement.textContent = `${lunarL10n.t('popup.progressLabel')}: ${progressPercent.toFixed(1)}%`;
    } else {
        progressElement.textContent = `Day Progress: ${progressPercent.toFixed(1)}%`;
    }

    // Display color palette
    displayColorPalette(data.color_palette);
}

function displayColorPalette(colorPalette) {
    const paletteContainer = document.getElementById('colorPalette');
    paletteContainer.innerHTML = '';

    // Display base colors
    if (colorPalette.base_colors && colorPalette.base_colors.length > 0) {
        const baseRow = document.createElement('div');
        baseRow.className = 'color-row';

        const baseLabel = document.createElement('div');
        if (lunarL10n && lunarL10n.t) {
            baseLabel.textContent = lunarL10n.t('popup.colorsLabel.base');
        } else {
            baseLabel.textContent = 'Base Colors';
        }
        baseLabel.style.fontSize = '12px';
        baseLabel.style.fontWeight = 'bold';
        baseLabel.style.marginBottom = '5px';
        paletteContainer.appendChild(baseLabel);

        colorPalette.base_colors.forEach((color, index) => {
            const swatch = createColorSwatch(color, `Base ${index + 1}`);
            baseRow.appendChild(swatch);
        });
        paletteContainer.appendChild(baseRow);
    }

    // Display gradient colors
    if (colorPalette.gradient && colorPalette.gradient.length > 0) {
        const gradientLabel = document.createElement('div');
        if (lunarL10n && lunarL10n.t) {
            gradientLabel.textContent = lunarL10n.t('popup.colorsLabel.gradient');
        } else {
            gradientLabel.textContent = 'Gradient';
        }
        gradientLabel.style.fontSize = '12px';
        gradientLabel.style.fontWeight = 'bold';
        gradientLabel.style.marginTop = '10px';
        gradientLabel.style.marginBottom = '5px';
        paletteContainer.appendChild(gradientLabel);

        // Group gradient colors into rows of 4
        const colorsPerRow = 4;
        for (let i = 0; i < colorPalette.gradient.length; i += colorsPerRow) {
            const row = document.createElement('div');
            row.className = 'color-row';

            for (let j = i; j < Math.min(i + colorsPerRow, colorPalette.gradient.length); j++) {
                const color = colorPalette.gradient[j];
                const swatch = createColorSwatch(color, `Step ${j + 1}`);
                row.appendChild(swatch);
            }

            paletteContainer.appendChild(row);
        }
    }
}

function createColorSwatch(colorValue, label) {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = colorValue;
    swatch.setAttribute('data-color', colorValue);
    swatch.title = `${label}: ${colorValue}`;

    // Add click to copy color
    swatch.addEventListener('click', () => {
        copyToClipboard(colorValue);
        showCopyFeedback(swatch);
    });

    // Determine text color based on background brightness
    const textColor = getContrastColor(colorValue);
    swatch.style.color = textColor;

    // Add label for color name
    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    labelElement.style.fontSize = '10px';
    swatch.appendChild(labelElement);

    return swatch;
}

function formatColorName(colorKey) {
    return colorKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#000000' : '#ffffff';
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error('Failed to copy color to clipboard:', err);
    }
}

function showCopyFeedback(element) {
    const originalText = element.innerHTML;

    let feedbackText = 'Copied!';
    if (lunarL10n && lunarL10n.t) {
        feedbackText = lunarL10n.t('popup.copyFeedback');
    }

    element.innerHTML = `<span style="font-weight: bold;">${feedbackText}</span>`;

    setTimeout(() => {
        element.innerHTML = originalText;
    }, 1000);
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('content').style.display = 'none';
    document.getElementById('error').style.display = 'none';
}

function showContent() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    document.getElementById('error').style.display = 'none';
}

function showError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'none';
    document.getElementById('error').style.display = 'block';
}

// Localization functions
async function initializeLocalization() {
    // Make sure global instance is available
    if (!window.lunarL10n) {
        console.error('Localization not loaded!');
        return;
    }

    lunarL10n = window.lunarL10n;

    // Load saved language preference
    lunarL10n.loadLanguagePreference();

    // Load translations
    await lunarL10n.loadTranslations();

    console.log('Localization initialized, current language:', lunarL10n.getCurrentLanguage());

    // Apply translations to current page
    translatePage();

    // Update language switcher UI
    updateLanguageSwitcher();
}

function translatePage() {
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (lunarL10n && lunarL10n.t) {
            element.textContent = lunarL10n.t(key);
        }
    });
}

function updateLanguageSwitcher() {
    if (!lunarL10n) return;

    const currentLang = lunarL10n.getCurrentLanguage();
    console.log('Updating language switcher, current language:', currentLang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
}

async function switchLanguage(langCode) {
    console.log('Switching language to:', langCode);

    if (!lunarL10n) {
        console.error('Localization not available');
        return;
    }

    await lunarL10n.switchLanguage(langCode);
    console.log('Language switched, now:', lunarL10n.getCurrentLanguage());

    translatePage();
    updateLanguageSwitcher();

    // Re-translate any displayed data
    const content = document.getElementById('content');
    if (content.style.display !== 'none') {
        // Re-apply translations to dynamic content
        const phaseElement = document.getElementById('phaseName');
        if (phaseElement.dataset.originalPhase) {
            phaseElement.textContent = lunarL10n.translateMoonPhase(phaseElement.dataset.originalPhase);
        }

        const progressElement = document.getElementById('progressText');
        if (progressElement.dataset.progress) {
            const progress = progressElement.dataset.progress;
            progressElement.textContent = lunarL10n.t('popup.progressLabel') + ': ' + progress + '%';
        }
    }
}