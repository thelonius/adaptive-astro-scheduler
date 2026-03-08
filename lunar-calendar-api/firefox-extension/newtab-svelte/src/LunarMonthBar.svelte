<script>
  import { onMount, createEventDispatcher } from 'svelte';

  export let currentGradient = ['#87CEEB', '#4682B4'];

  const dispatch = createEventDispatcher();

  let lunarMonthDays = [];
  let loading = true;

  onMount(async () => {
    await fetchLunarMonth();
  });

  async function fetchLunarMonth() {
    try {
      if (typeof browser === 'undefined' || !browser.runtime) {
        console.error('LunarMonthBar: Browser API not available');
        loading = false;
        return;
      }

      const today = new Date();
      const monthData = [];

      // Fetch data for offsets from -15 to +15 days to capture the full lunar month
      for (let offset = -15; offset <= 15; offset++) {
        const date = new Date(today);
        date.setDate(today.getDate() + offset);

        try {
          const response = await browser.runtime.sendMessage({
            action: 'getLunarData',
            date: date.toISOString()
          });

          let data = null;
          if (response && response.success && response.data) {
            data = response.data;
          } else if (response && response.lunar_day) {
            data = response;
          }

          if (data) {
            const dayInfo = {
              offset,
              dayNumber: data.lunar_day || 1,
              gradient: data.color_palette?.gradient || data.colors?.gradient || ['#87CEEB'],
              date: date,
              isCurrent: offset === 0
            };
            monthData.push(dayInfo);
          }
        } catch (error) {
          console.error(`LunarMonthBar: Failed to fetch data for offset ${offset}:`, error);
        }
      }

      // Sort by lunar day number
      lunarMonthDays = monthData.sort((a, b) => {
        // Handle wrap-around (day 30 -> day 1)
        let dayA = a.dayNumber;
        let dayB = b.dayNumber;

        // If we have both low numbers (1-5) and high numbers (26-30), it's a month boundary
        const hasLowDays = monthData.some(d => d.dayNumber <= 5);
        const hasHighDays = monthData.some(d => d.dayNumber >= 26);

        if (hasLowDays && hasHighDays) {
          // Put days 26-30 before days 1-5
          if (dayA >= 26 && dayB <= 5) return -1;
          if (dayA <= 5 && dayB >= 26) return 1;
        }

        return dayA - dayB;
      });

      loading = false;
    } catch (error) {
      console.error('LunarMonthBar: Failed to fetch lunar month:', error);
      loading = false;
    }
  }

  function handleDayClick(day) {
    dispatch('daySelected', { day });
  }

  function getContrastColor(gradient) {
    // Simple contrast calculation - if first color is dark, return white, else black
    const color = gradient[0] || '#FFFFFF';
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  $: todayContrastColor = getContrastColor(currentGradient);
</script>

<div class="lunar-month-bar">
  {#if loading}
    <div class="loading">Загрузка...</div>
  {:else}
    <div class="days-container">
      {#each lunarMonthDays as day (day.dayNumber + '-' + day.offset)}
        <button
          class="day-cell"
          class:is-current={day.isCurrent}
          style="
            background: linear-gradient(135deg, {day.gradient.join(', ')});
            {day.isCurrent ? `border-color: ${todayContrastColor};` : ''}
          "
          on:click={() => handleDayClick(day)}
          title="Лунный день {day.dayNumber} {day.isCurrent ? '(сегодня)' : ''}"
        >
          <div class="day-number">{day.dayNumber}</div>
          {#if day.isCurrent}
            <div class="day-label">Сегодня</div>
          {:else if day.offset !== 0}
            <div class="day-offset">
              {day.offset > 0 ? '+' : ''}{day.offset}д
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .lunar-month-bar {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 95vw;
    z-index: 15;
    pointer-events: auto;
  }

  .loading {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
  }

  .days-container {
    display: flex;
    gap: 6px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.85);
    border-radius: 12px;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    overflow-x: auto;
    max-width: 95vw;
  }

  .days-container::-webkit-scrollbar {
    height: 6px;
  }

  .days-container::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .days-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  .days-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  .day-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 50px;
    height: 60px;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 4px;
    font-family: inherit;
  }

  .day-cell:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .day-cell.is-current {
    border-width: 3px;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
  }

  .day-number {
    font-size: 20px;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
    line-height: 1;
  }

  .day-label {
    font-size: 9px;
    color: white;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
    margin-top: 4px;
    white-space: nowrap;
    font-weight: 600;
  }

  .day-offset {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.8);
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
    margin-top: 4px;
  }
</style>
