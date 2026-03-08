<script>
  export let dayData = null;
  export let visible = false;

  // Russian translations
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

  $: russianPhaseName = dayData?.moon_phase?.name ?
    moonPhases[dayData.moon_phase.name] || dayData.moon_phase.name : '';

  $: russianPlanet = (dayData?.planet || dayData?.planetary_influence?.dominant_planet) ?
    planets[dayData?.planet || dayData?.planetary_influence?.dominant_planet] ||
    (dayData?.planet || dayData?.planetary_influence?.dominant_planet) : '';

  $: primaryColor = dayData?.colors?.base?.[0] || dayData?.color_palette?.base_colors?.[0] || '#B22222';
</script>

{#if visible && dayData}
<div class="day-details" style="--primary-color: {primaryColor};">
  <div class="details-content">
    <!-- Main info -->
    <div class="section main-section">
      <h3 class="section-title">
        <span class="day-number">{dayData.lunar_day}</span>
        <span class="phase-name">{russianPhaseName}</span>
        {#if russianPlanet}
          <span class="planet">🪐 {russianPlanet}</span>
        {/if}
      </h3>
    </div>

    <!-- Recommendations -->
    <div class="section recommendations-section">
      <div class="recommendations-group">
        <h4 class="group-title">✅ Рекомендуется</h4>
        <div class="recommendations-list">
          {#each (dayData.recommendations?.do || dayData.recommendations?.recommended || []) as item}
            <div class="recommendation-item do">{item}</div>
          {/each}
        </div>
      </div>

      <div class="recommendations-group">
        <h4 class="group-title">❌ Избегать</h4>
        <div class="recommendations-list">
          {#each (dayData.recommendations?.avoid || dayData.recommendations?.not_recommended || []) as item}
            <div class="recommendation-item avoid">{item}</div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Description -->
    {#if dayData.description || dayData.general_description}
    <div class="section description-section">
      <p class="description-text">{dayData.description || dayData.general_description}</p>
    </div>
    {/if}
  </div>
</div>
{/if}

<style>
  .day-details {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 20;
    pointer-events: auto;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .details-content {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(20px);
    padding: 24px;
    max-height: 40vh;
    overflow-y: auto;
    border-top: 3px solid var(--primary-color);
    box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.5);
  }

  .details-content::-webkit-scrollbar {
    width: 8px;
  }

  .details-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  .details-content::-webkit-scrollbar-thumb {
    background: var(--primary-color);
    border-radius: 4px;
  }

  .section {
    margin-bottom: 20px;
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .main-section .section-title {
    display: flex;
    align-items: center;
    gap: 16px;
    color: white;
    font-size: 18px;
    margin: 0;
    flex-wrap: wrap;
  }

  .day-number {
    font-size: 32px;
    font-weight: bold;
    color: var(--primary-color);
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }

  .phase-name {
    font-weight: 600;
  }

  .planet {
    color: rgba(255, 255, 255, 0.8);
    font-size: 16px;
  }

  .recommendations-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  @media (max-width: 768px) {
    .recommendations-section {
      grid-template-columns: 1fr;
    }
  }

  .recommendations-group {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
  }

  .group-title {
    color: white;
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 12px 0;
  }

  .recommendations-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .recommendation-item {
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;
    line-height: 1.5;
    padding-left: 20px;
    position: relative;
  }

  .recommendation-item.do::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: #4ade80;
    font-weight: bold;
  }

  .recommendation-item.avoid::before {
    content: '✗';
    position: absolute;
    left: 0;
    color: #f87171;
    font-weight: bold;
  }

  .description-section {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
  }

  .description-text {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
  }
</style>
