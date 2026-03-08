<script>
  export let dayData = null;

  // Toggle state for showing/hiding the info panel
  let isExpanded = false;

  function togglePanel() {
    isExpanded = !isExpanded;
  }

  // Russian translations for moon phases
  const moonPhases = {
    'New Moon': 'Новолуние',
    'Waxing Crescent': 'Растущий Серп',
    'First Quarter': 'Первая Четверть',
    'Waxing Gibbous': 'Растущая Луна',
    'Full Moon': 'Полнолуние',
    'Waning Gibbous': 'Убывающая Луна',
    'Last Quarter': 'Последняя Четверть',
    'Waning Crescent': 'Убывающий Серп'
  };

  // Russian translations for planets
  const planets = {
    'Sun': 'Солнце',
    'Moon': 'Луна',
    'Mercury': 'Меркурий',
    'Venus': 'Венера',
    'Mars': 'Марс',
    'Jupiter': 'Юпитер',
    'Saturn': 'Сатурн',
    'Uranus': 'Уран',
    'Neptune': 'Нептун',
    'Pluto': 'Плутон'
  };

  // Function to format time in Russian
  function formatRussianTime(isoString) {
    if (!isoString) return '';

    const date = new Date(isoString);
    const weekdays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                   'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    const weekday = weekdays[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${weekday}, ${day} ${month} в ${hours}:${minutes}`;
  }

  // Format timing data - use custom Russian formatting
  $: startTime = formatRussianTime(dayData?.timing?.starts_at);
  $: endTime = formatRussianTime(dayData?.timing?.ends_at);

  $: duration = dayData?.timing?.duration_hours ?
    `${dayData.timing.duration_hours.toFixed(1)} ч` : '';

  // Get primary color for styling (handle both formats)
  $: primaryColor = dayData?.colors?.base?.[0] || dayData?.color_palette?.base_colors?.[0] || '#B22222';
  $: secondaryColor = dayData?.colors?.base?.[1] || dayData?.color_palette?.base_colors?.[1] || '#8B0000';

  $: russianPhaseName = dayData?.moon_phase?.name ?
    moonPhases[dayData.moon_phase.name] || dayData.moon_phase.name : '';

  $: russianPlanet = (dayData?.planet || dayData?.planetary_influence?.dominant_planet) ?
    planets[dayData?.planet || dayData?.planetary_influence?.dominant_planet] ||
    (dayData?.planet || dayData?.planetary_influence?.dominant_planet) : '';
</script>

{#if dayData}
<div class="lunar-info" style="--primary-color: {primaryColor}; --secondary-color: {secondaryColor};">
  <!-- Toggle Button - Always visible -->
  <button class="toggle-button" on:click={togglePanel} title="Показать/скрыть информацию">
    <div class="lunar-day-number">{dayData.lunar_day}</div>
    <div class="toggle-icon">{isExpanded ? '▼' : '▶'}</div>
  </button>

  <!-- Info Panel - Hidden by default -->
  {#if isExpanded}
  <div class="info-grid">
    <!-- Main Info Section -->
    <div class="info-card main-info">
      <h2 class="card-title">🌙 Лунный День</h2>
      <div class="main-content">
        <div class="phase-info">
          <div class="phase-name">{russianPhaseName}</div>
          <div class="phase-emoji">{dayData.moon_phase?.emoji || '🌙'}</div>
        </div>
      </div>
    </div>

    <!-- Moon Phase Details -->
    <div class="info-card moon-details">
      <h3 class="card-title">🌖 Фаза Луны</h3>
      <div class="detail-item">
        <span class="label">Освещённость:</span>
        <span class="value">{dayData.moon_phase?.illumination?.toFixed(1)}%</span>
      </div>
      <div class="detail-item">
        <span class="label">Направление:</span>
        <span class="value">{dayData.moon_phase?.is_waxing ? 'Растущая' : 'Убывающая'}</span>
      </div>
    </div>

    <!-- Timing Information -->
    <div class="info-card timing">
      <h3 class="card-title">⏰ Время</h3>
      <div class="detail-item">
        <span class="label">Начало:</span>
        <span class="value">{startTime}</span>
      </div>
      <div class="detail-item">
        <span class="label">Конец:</span>
        <span class="value">{endTime}</span>
      </div>
      <div class="detail-item">
        <span class="label">Продолжительность:</span>
        <span class="value">{duration}</span>
      </div>
    </div>

    <!-- Planetary Influence -->
    <div class="info-card planet">
      <h3 class="card-title">🪐 Планета</h3>
      <div class="planet-name">{russianPlanet}</div>
    </div>

    <!-- Health Information -->
    <div class="info-card health">
      <h3 class="card-title">🏥 Здоровье</h3>
      {#if (dayData.health?.organs?.length > 0) || (dayData.health?.affected_organs?.length > 0)}
        <div class="health-section">
          <span class="label">Органы:</span>
          <div class="health-list">
            {#each (dayData.health?.organs || dayData.health?.affected_organs || []) as organ}
              <span class="health-item">{organ}</span>
            {/each}
          </div>
        </div>
      {/if}
      {#if (dayData.health?.body_parts?.length > 0) || (dayData.health?.affected_body_parts?.length > 0)}
        <div class="health-section">
          <span class="label">Части тела:</span>
          <div class="health-list">
            {#each (dayData.health?.body_parts || dayData.health?.affected_body_parts || []) as part}
              <span class="health-item">{part}</span>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Recommendations - Do -->
    <div class="info-card recommendations-do">
      <h3 class="card-title">✅ Рекомендуется</h3>
      <div class="recommendation-list">
        {#each (dayData.recommendations?.do || dayData.recommendations?.recommended || []) as item}
          <div class="recommendation-item do">{item}</div>
        {/each}
      </div>
    </div>

    <!-- Recommendations - Avoid -->
    <div class="info-card recommendations-avoid">
      <h3 class="card-title">❌ Избегать</h3>
      <div class="recommendation-list">
        {#each (dayData.recommendations?.avoid || dayData.recommendations?.not_recommended || []) as item}
          <div class="recommendation-item avoid">{item}</div>
        {/each}
      </div>
    </div>

    <!-- Description -->
    <div class="info-card description">
      <h3 class="card-title">📖 Описание</h3>
      <p class="description-text">{dayData.description || dayData.general_description || ''}</p>
    </div>

    <!-- Color Palette -->
    <div class="info-card colors">
      <h3 class="card-title">🎨 Цвета</h3>
      <div class="color-section">
        <span class="label">Базовые:</span>
        <div class="color-palette">
          {#each (dayData.colors?.base || dayData.color_palette?.base_colors || []) as color}
            <div
              class="color-swatch"
              style="background-color: {color}"
              title="{color}"
            ></div>
          {/each}
        </div>
      </div>
      <div class="color-section">
        <span class="label">Градиент:</span>
        <div class="gradient-preview"
             style="background: linear-gradient(to right, {(dayData.colors?.gradient || dayData.color_palette?.gradient || []).join(', ')})">
        </div>
      </div>
    </div>
  </div>
  {/if}
</div>
{/if}

<style>
  .lunar-info {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 10;
    pointer-events: auto;
  }

  .toggle-button {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    border: none;
    border-radius: 50%;
    width: 80px;
    height: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    transition: all 0.3s ease;
    position: relative;
  }

  .toggle-button:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 30px rgba(0, 0, 0, 0.7);
  }

  .toggle-button:active {
    transform: scale(0.95);
  }

  .toggle-button .lunar-day-number {
    font-size: 32px;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    line-height: 1;
  }

  .toggle-icon {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 4px;
  }

  .info-grid {
    margin-top: 15px;
    width: 400px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr;
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .info-card {
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 16px;
    color: white;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
    border-left: 4px solid var(--primary-color);
  }

  .info-card:hover {
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
  }

  .card-title {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: bold;
    color: var(--primary-color);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .main-info {
    background: linear-gradient(135deg,
      rgba(var(--primary-color), 0.2),
      rgba(var(--secondary-color), 0.2)
    );
  }

  .main-content {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .phase-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .phase-name {
    font-size: 18px;
    font-weight: 500;
  }

  .phase-emoji {
    font-size: 32px;
    text-align: center;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding: 4px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .detail-item:last-child {
    margin-bottom: 0;
    border-bottom: none;
  }

  .label {
    font-weight: 500;
    opacity: 0.8;
    font-size: 14px;
  }

  .value {
    font-weight: bold;
    color: var(--primary-color);
    font-size: 14px;
  }

  .planet-name {
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    color: var(--primary-color);
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .health-section {
    margin-bottom: 12px;
  }

  .health-section:last-child {
    margin-bottom: 0;
  }

  .health-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .health-item {
    background: var(--primary-color);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .recommendation-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .recommendation-item {
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    border-left: 3px solid;
  }

  .recommendation-item.do {
    background: rgba(46, 204, 113, 0.2);
    border-left-color: #2ecc71;
    color: #2ecc71;
  }

  .recommendation-item.avoid {
    background: rgba(231, 76, 60, 0.2);
    border-left-color: #e74c3c;
    color: #e74c3c;
  }

  .description-text {
    margin: 0;
    line-height: 1.5;
    font-size: 14px;
    opacity: 0.9;
  }

  .color-section {
    margin-bottom: 12px;
  }

  .color-section:last-child {
    margin-bottom: 0;
  }

  .color-palette {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }

  .color-swatch {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .color-swatch:hover {
    transform: scale(1.1);
    border-color: rgba(255, 255, 255, 0.6);
  }

  .gradient-preview {
    height: 20px;
    border-radius: 10px;
    margin-top: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  /* Scrollbar styling */
  .lunar-info::-webkit-scrollbar {
    width: 6px;
  }

  .lunar-info::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .lunar-info::-webkit-scrollbar-thumb {
    background: var(--primary-color);
    border-radius: 3px;
  }

  .lunar-info::-webkit-scrollbar-thumb:hover {
    background: var(--secondary-color);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .lunar-info {
      width: calc(100vw - 40px);
      left: 20px;
      right: 20px;
    }
  }

  @media (max-height: 600px) {
    .lunar-info {
      top: 10px;
      max-height: calc(100vh - 20px);
    }

    .info-card {
      padding: 12px;
    }

    .card-title {
      font-size: 14px;
      margin-bottom: 8px;
    }
  }
</style>