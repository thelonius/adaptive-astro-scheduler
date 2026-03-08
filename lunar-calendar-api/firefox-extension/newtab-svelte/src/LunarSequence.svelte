<script>
  import { onMount } from 'svelte';
  import Moon3D from './Moon3D.svelte';

  // Последовательность Фибоначчи для размеров (в процентах от базового размера)
  const fibonacciSizes = [100, 61.8, 38.2, 23.6, 14.6, 9.0]; // Базируется на золотом сечении

  let lunarDaysData = [];
  let loading = true;

  onMount(async () => {
    await fetchLunarDays();
  });

  async function fetchLunarDays() {
    console.log('LunarSequence: Starting fetchLunarDays...');
    try {
      if (typeof browser === 'undefined' || !browser.runtime) {
        console.error('LunarSequence: Browser API not available');
        loading = false;
        return;
      }

      const today = new Date();
      const daysData = [];

      // Получаем данные для прошлых и будущих дней
      // -4, -3, -2, -1 (прошлое), 0 (сегодня уже есть), +1, +2, +3, +4 (будущее)
      const offsets = [-4, -3, -2, -1, 1, 2, 3, 4];

      console.log('LunarSequence: Fetching data for offsets:', offsets);

      for (const offset of offsets) {
        const date = new Date(today);
        date.setDate(today.getDate() + offset);

        console.log(`LunarSequence: Fetching data for offset ${offset}, date:`, date.toISOString());

        try {
          const response = await browser.runtime.sendMessage({
            action: 'getLunarData',
            date: date.toISOString()
          });

          console.log(`LunarSequence: Response for offset ${offset}:`, response);

          // API может возвращать данные напрямую или через обёртку { success, data }
          let data = null;
          if (response && response.success && response.data) {
            data = response.data;
          } else if (response && response.lunar_day) {
            // Данные пришли напрямую без обёртки
            data = response;
          }

          if (data) {
            const dayInfo = {
              offset,
              dayNumber: data.lunar_day || 1,
              illumination: (data.moon_phase?.illumination || 50) / 100,
              isWaxing: data.moon_phase?.is_waxing === true,
              gradient: data.color_palette?.gradient || ['#87CEEB'],
              date: date
            };
            console.log(`LunarSequence: Parsed day info for offset ${offset}:`, dayInfo);
            daysData.push(dayInfo);
          } else {
            console.warn(`LunarSequence: Invalid response for offset ${offset}:`, response);
          }
        } catch (error) {
          console.error(`LunarSequence: Failed to fetch data for offset ${offset}:`, error);
        }
      }

      lunarDaysData = daysData;
      loading = false;
      console.log('LunarSequence: Loaded days:', daysData.length, daysData);
    } catch (error) {
      console.error('LunarSequence: Failed to fetch lunar days:', error);
      loading = false;
    }
  }

  // Разделяем дни на левую (прошлое) и правую (будущее) стороны
  // Левые луны идут от -1 к -4 (ближние к дальним)
  $: leftDays = lunarDaysData.filter(d => d.offset < 0).sort((a, b) => b.offset - a.offset); // От -1 к -4
  $: rightDays = lunarDaysData.filter(d => d.offset > 0); // От +1 к +4

  $: console.log('LunarSequence: leftDays:', leftDays.length, 'rightDays:', rightDays.length);
</script>

<div class="lunar-sequence">
  {#if loading}
    <div class="loading-indicator">Загрузка лунных дней...</div>
  {:else if lunarDaysData.length === 0}
    <div class="error-indicator">Нет данных о лунных днях</div>
  {:else}
    <!-- Левая сторона (прошлое) - HIDDEN -->
    <!--
    <div class="sequence-side left">
      {#each leftDays as day, index}
        {@const sizePercent = fibonacciSizes[index + 1] || 5}
        {@const size = (52.5 * sizePercent / 100)}
        {@const _ = console.log(`Left moon ${index}: offset=${day.offset}, sizePercent=${sizePercent}, size=${size}vmin`)}
        <div
          class="sequence-moon"
          style="
            width: {size}vmin;
            height: {size}vmin;
            opacity: {0.3 + (1 - index * 0.15)};
          "
          title="День {day.dayNumber}, размер: {sizePercent.toFixed(1)}%"
        >
          <Moon3D
            gradient={day.gradient}
            illumination={day.illumination}
            isWaxing={day.isWaxing}
          />
        </div>
      {/each}
    </div>
    -->

    <!-- Правая сторона (будущее) - HIDDEN -->
    <!--
    <div class="sequence-side right">
      {#each rightDays as day, index}
        {@const sizePercent = fibonacciSizes[index + 1] || 5}
        {@const size = (52.5 * sizePercent / 100)}
        {@const _ = console.log(`Right moon ${index}: offset=${day.offset}, sizePercent=${sizePercent}, size=${size}vmin`)}
        <div
          class="sequence-moon"
          style="
            width: {size}vmin;
            height: {size}vmin;
            opacity: {0.3 + (1 - index * 0.15)};
          "
          title="День {day.dayNumber}, размер: {sizePercent.toFixed(1)}%"
        >
          <Moon3D
            gradient={day.gradient}
            illumination={day.illumination}
            isWaxing={day.isWaxing}
          />
        </div>
      {/each}
    </div>
    -->
  {/if}
</div>

<style>
  .lunar-sequence {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
    z-index: 0;
  }

  .sequence-side {
    display: flex;
    align-items: center;
    gap: 1vw; /* Одинаковое расстояние между всеми лунами */
    padding: 0 3vw;
  }

  .sequence-side.left {
    flex-direction: row;
    justify-content: flex-end;
    margin-right: 26.25vmin; /* Половина размера центральной луны */
  }

  .sequence-side.right {
    flex-direction: row;
    justify-content: flex-start;
    margin-left: 26.25vmin; /* Половина размера центральной луны */
  }

  .sequence-moon {
    flex-shrink: 0;
    transition: all 0.5s ease;
    position: relative;
    z-index: 1;
  }

  .sequence-moon:hover {
    opacity: 1 !important;
    transform: scale(1.1);
  }

  .loading-indicator,
  .error-indicator {
    color: white;
    font-size: 16px;
    background: rgba(0, 0, 0, 0.5);
    padding: 10px 20px;
    border-radius: 8px;
  }

  .error-indicator {
    color: #ff6b6b;
  }
</style>
