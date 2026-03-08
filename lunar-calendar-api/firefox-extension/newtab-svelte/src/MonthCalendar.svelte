<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { generateGradient } from './colorUtils.js';

  export let currentBaseColors = ['#87CEEB', '#4682B4'];

  const dispatch = createEventDispatcher();

  let calendarData = [];
  let currentMonth = '';
  let loading = true;

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  onMount(async () => {
    await fetchCalendarMonth();
  });

  async function fetchCalendarMonth() {
    try {
      if (typeof browser === 'undefined' || !browser.runtime) {
        console.error('MonthCalendar: Browser API not available');
        loading = false;
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-based

      currentMonth = `${monthNames[month]} ${year}`;

      // Get first day of month and last day
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Get the day of week for first day (0=Sunday, 1=Monday, etc)
      // Convert to Monday=0 format
      let firstWeekDay = firstDay.getDay() - 1;
      if (firstWeekDay === -1) firstWeekDay = 6; // Sunday becomes 6

      const daysInMonth = lastDay.getDate();

      // Fetch lunar data for the entire range to find transitions
      const allLunarData = [];
      const seenLunarDays = new Set(); // Track which lunar days we've already added

      // Fetch a few days before and after to catch transitions
      for (let offset = -2; offset <= daysInMonth + 2; offset++) {
        const date = new Date(year, month, offset);
        const dateStr = date.toISOString();

        try {
          const response = await browser.runtime.sendMessage({
            action: 'getLunarData',
            date: dateStr
          });

          let data = null;
          if (response && response.success && response.data) {
            data = response.data;
          } else if (response && response.lunar_day) {
            data = response;
          }

          if (data && data.timing) {
            // Create unique key for this lunar day (day number + start time)
            const uniqueKey = `${data.lunar_day}-${data.timing.starts_at}`;

            // Only add if we haven't seen this exact lunar day before
            if (!seenLunarDays.has(uniqueKey)) {
              seenLunarDays.add(uniqueKey);
              const baseColors = data.colors?.base || data.color_palette?.base_colors || ['#87CEEB'];
              
              // Debug for first few days
              if (allLunarData.length < 3) {
                console.log('Lunar day', data.lunar_day, 'data structure:', {
                  hasColors: !!data.colors,
                  colorsBase: data.colors?.base,
                  hasColorPalette: !!data.color_palette,
                  colorPaletteBaseColors: data.color_palette?.base_colors,
                  finalBaseColors: baseColors
                });
              }
              
              const gradientColors = generateGradient(baseColors, 12);
              
              allLunarData.push({
                lunarDay: data.lunar_day,
                startsAt: new Date(data.timing.starts_at + '+03:00'), // Moscow time
                endsAt: new Date(data.timing.ends_at + '+03:00'),
                baseColors: baseColors,
                gradientColors: gradientColors
              });
            }
          }
        } catch (error) {
          // Ignore errors for out-of-range dates
        }
      }

      // Now build the calendar with transition info
      const monthData = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStart = new Date(year, month, day, 0, 0, 0);
        const dayEnd = new Date(year, month, day, 23, 59, 59);

        // Find all lunar days that overlap with this solar day
        const lunarDaysInThisDay = allLunarData.filter(ld => {
          return ld.startsAt < dayEnd && ld.endsAt > dayStart;
        });

        // Check if this day is today
        const isToday = (
          day === now.getDate() &&
          month === now.getMonth() &&
          year === now.getFullYear()
        );

        // Calculate gradient stops based on timing
        const gradientStops = [];

        if (lunarDaysInThisDay.length > 0) {
          lunarDaysInThisDay.forEach(ld => {
            // Calculate what percentage of the solar day this lunar day occupies
            const ldStart = ld.startsAt < dayStart ? dayStart : ld.startsAt;
            const ldEnd = ld.endsAt > dayEnd ? dayEnd : ld.endsAt;

            const startPercent = ((ldStart - dayStart) / (24 * 60 * 60 * 1000)) * 100;
            const endPercent = ((ldEnd - dayStart) / (24 * 60 * 60 * 1000)) * 100;

            gradientStops.push({
              lunarDay: ld.lunarDay,
              baseColors: ld.baseColors,
              gradientColors: ld.gradientColors, // Full 12-step gradient
              startPercent: Math.max(0, startPercent),
              endPercent: Math.min(100, endPercent)
            });
          });

          // Debug logging for today
          if (isToday) {
            console.log('Today gradient stops:', gradientStops);
            console.log('Lunar days:', lunarDaysInThisDay.map(ld => ({
              day: ld.lunarDay,
              starts: ld.startsAt.toLocaleString('ru-RU'),
              ends: ld.endsAt.toLocaleString('ru-RU')
            })));
            console.log('Solar day span:', dayStart.toLocaleString('ru-RU'), 'to', dayEnd.toLocaleString('ru-RU'));
          }

          // Sort gradient stops by start time to ensure proper order
          gradientStops.sort((a, b) => a.startPercent - b.startPercent);
        }

        // Add all days to monthData, even if no lunar data
        monthData.push({
          solarDay: day,
          date: new Date(year, month, day),
          isToday: isToday,
          gradientStops: gradientStops,
          lunarDays: lunarDaysInThisDay.length > 0 ? lunarDaysInThisDay.map(ld => ld.lunarDay).join('→') : ''
        });
      }

      // Build calendar grid with empty cells for alignment
      const calendar = [];

      // Add empty cells for days before month starts
      for (let i = 0; i < firstWeekDay; i++) {
        calendar.push({ isEmpty: true });
      }

      // Add all days of the month
      calendar.push(...monthData);

      calendarData = calendar;
      loading = false;

    } catch (error) {
      console.error('MonthCalendar: Failed to fetch calendar:', error);
      loading = false;
    }
  }

  function handleDayClick(dayInfo, lunarDayNumber = null) {
    if (!dayInfo.isEmpty) {
      // If a specific lunar day was clicked, use that
      // Otherwise, if it's today, find the current active lunar day
      let targetLunarDay = lunarDayNumber;
      
      if (!targetLunarDay && dayInfo.isToday && dayInfo.gradientStops.length > 0) {
        const now = new Date();
        // Find which lunar day is active right now
        for (const stop of dayInfo.gradientStops) {
          if (stop.startPercent <= 50 && stop.endPercent >= 50) {
            // This lunar day covers the middle of today
            targetLunarDay = stop.lunarDay;
            break;
          }
        }
        // If not found, use the first one
        if (!targetLunarDay) {
          targetLunarDay = dayInfo.gradientStops[0].lunarDay;
        }
      }
      
      dispatch('daySelected', { 
        day: dayInfo,
        lunarDay: targetLunarDay
      });
    }
  }

  function getContrastColor(baseColors) {
    const color = baseColors[0] || '#FFFFFF';
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }

  $: todayContrastColor = getContrastColor(currentBaseColors);
</script>

<div class="month-calendar">
  {#if loading}
    <div class="loading">Загрузка календаря...</div>
  {:else}
    <div class="calendar-container">
      <div class="calendar-header">
        <h3>{currentMonth}</h3>
      </div>

      <div class="calendar-grid">
        <!-- Week day headers -->
        {#each weekDays as day}
          <div class="weekday-header">{day}</div>
        {/each}

        <!-- Calendar days -->
        {#each calendarData as dayInfo}
          {#if dayInfo.isEmpty}
            <div class="day-cell empty"></div>
          {:else}
            {@const gradientString = (() => {
              // If no lunar data, use default color
              if (!dayInfo.gradientStops || dayInfo.gradientStops.length === 0) {
                return '#87CEEB';
              }
              
              // Build gradient showing each lunar day's full 12-step gradient
              // with hard edges at boundaries (no transition blending)
              const stops = [];
              
              dayInfo.gradientStops.forEach((stop) => {
                const duration = stop.endPercent - stop.startPercent;
                
                // Map the 12-step gradient to this time range
                stop.gradientColors.forEach((color, colorIdx) => {
                  const colorPercent = stop.startPercent + (colorIdx / (stop.gradientColors.length - 1)) * duration;
                  stops.push(`${color} ${colorPercent.toFixed(2)}%`);
                });
              });
              
              const result = stops.length > 0 ? `linear-gradient(to bottom, ${stops.join(', ')})` : '#87CEEB';
              
              // Debug for first 3 days
              if (dayInfo.solarDay <= 3) {
                console.log(`Day ${dayInfo.solarDay} gradient:`, result);
                console.log(`Day ${dayInfo.solarDay} stops count:`, stops.length);
                console.log(`Day ${dayInfo.solarDay} gradientStops:`, dayInfo.gradientStops);
              }
              
              return result;
            })()}
            <div
              class="day-cell"
              class:is-today={dayInfo.isToday}
              style="
                background: {gradientString};
                {dayInfo.isToday ? `border-color: ${todayContrastColor};` : ''}
              "
              title="Лунный день: {dayInfo.lunarDays}"
            >
              <!-- Clickable sections for each lunar day -->
              {#if dayInfo.gradientStops && dayInfo.gradientStops.length > 0}
                {#each dayInfo.gradientStops as stop}
                  <button
                    class="lunar-section"
                    style="
                      position: absolute;
                      top: {stop.startPercent}%;
                      height: {stop.endPercent - stop.startPercent}%;
                      left: 0;
                      right: 0;
                      background: transparent;
                      border: none;
                      cursor: pointer;
                      z-index: 1;
                    "
                    on:click={() => handleDayClick(dayInfo, stop.lunarDay)}
                    title="Лунный день {stop.lunarDay}"
                  />
                {/each}
              {/if}
              
              <!-- Day numbers on top -->
              <div class="day-content">
                <div class="solar-day">{dayInfo.solarDay}</div>
                <div class="lunar-day">{dayInfo.lunarDays}</div>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .month-calendar {
    position: fixed;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 800px;
    width: 90vw;
    z-index: 15;
    pointer-events: auto;
  }

  .loading {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    text-align: center;
  }

  .calendar-container {
    background: rgba(0, 0, 0, 0.75);
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  }

  .calendar-header {
    text-align: center;
    margin-bottom: 12px;
  }

  .calendar-header h3 {
    margin: 0;
    color: white;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }

  .weekday-header {
    text-align: center;
    padding: 6px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .day-cell {
    aspect-ratio: 1;
    position: relative;
    border: 1.5px solid transparent;
    border-radius: 8px;
    transition: all 0.2s ease;
    min-height: 50px;
    overflow: hidden;
  }

  .day-cell.empty {
    background: transparent;
    cursor: default;
    border: none;
  }

  .day-cell:not(.empty):hover {
    transform: scale(1.08);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
    z-index: 1;
  }

  .day-cell.is-today {
    border-width: 2px;
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.4);
  }

  .lunar-section {
    padding: 0;
    margin: 0;
  }

  .lunar-section:hover {
    background: rgba(255, 255, 255, 0.1) !important;
  }

  .day-content {
    position: relative;
    z-index: 2;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
  }

  .solar-day {
    font-size: 16px;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
    line-height: 1.1;
  }

  .lunar-day {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.85);
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    margin-top: 3px;
    background: rgba(0, 0, 0, 0.35);
    padding: 2px 5px;
    border-radius: 3px;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .month-calendar {
      width: 95vw;
      max-width: 95vw;
    }

    .calendar-container {
      padding: 12px;
    }

    .calendar-grid {
      gap: 4px;
    }

    .day-cell {
      min-height: 45px;
      padding: 4px;
    }

    .solar-day {
      font-size: 13px;
    }

    .lunar-day {
      font-size: 8px;
      padding: 1px 3px;
    }

    .calendar-header h3 {
      font-size: 14px;
    }
  }
</style>
