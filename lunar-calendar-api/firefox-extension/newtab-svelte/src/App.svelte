<script>
  import { onMount } from 'svelte';
  import DayMoon from './DayMoon.svelte';
  import Background from './Background.svelte';
  import LunarSequence from './LunarSequence.svelte';
  import LunarInfo from './LunarInfo.svelte';
  import MonthCalendar from './MonthCalendar.svelte';
  import DayDetails from './DayDetails.svelte';
  import ColorPalettes from './ColorPalettes.svelte';
  import { generateGradient } from './colorUtils.js';

  let dayData = null;
  let selectedDayData = null; // For when user clicks a different day
  let showDetails = false; // For showing day details at bottom
  let showPalettes = false; // For showing color palettes panel
  let loading = true;
  let error = null;

  onMount(async () => {
    try {
      // Check if browser API is available
      if (typeof browser !== 'undefined' && browser.runtime) {
        // Load data from background script
        const response = await browser.runtime.sendMessage({ action: 'getTodayData' });

        if (response.success && response.data) {
          dayData = response.data;
          loading = false;
        } else {
          throw new Error('No data received from background');
        }
      } else {
        throw new Error('Browser API not available');
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      error = err.message;
      loading = false;
    }
  });

  function handleMoonClick() {
    // Toggle details panel when moon is clicked
    showDetails = !showDetails;
  }

  function togglePalettes() {
    showPalettes = !showPalettes;
  }

  async function handleDaySelected(event) {
    const { day } = event.detail;

    if (day.isToday) {
      // If today is clicked, clear selection to show today's data
      selectedDayData = null;
      showDetails = false;
      return;
    }

    try {
      const response = await browser.runtime.sendMessage({
        action: 'getLunarData',
        date: day.date.toISOString()
      });

      let data = null;
      if (response && response.success && response.data) {
        data = response.data;
      } else if (response && response.lunar_day) {
        data = response;
      }

      if (data) {
        // Calculate offset from today
        const now = new Date();
        const daysDiff = Math.floor((day.date - now) / (1000 * 60 * 60 * 24));

        selectedDayData = {
          ...data,
          offset: daysDiff
        };
        showDetails = false; // Hide details when switching days
      }
    } catch (err) {
      console.error('Failed to load selected day:', err);
    }
  }

  // Use selected day data if available, otherwise use today's data
  $: displayData = selectedDayData || dayData;

  // Get base colors from data
  $: baseColors = displayData?.colors?.base || displayData?.color_palette?.base_colors || ['#87CEEB', '#4682B4'];

  // Generate gradient from base colors (fallback to stored gradient if exists)
  $: gradient = displayData?.colors?.gradient || displayData?.color_palette?.gradient ||
                generateGradient(baseColors, 12);

  // Convert illumination from percentage (0-100) to fraction (0-1)
  $: illumination = (displayData?.moon_phase?.illumination || 50) / 100;
  $: isWaxing = displayData?.moon_phase?.is_waxing === true;
  $: timeRemaining = selectedDayData
    ? `${selectedDayData.offset > 0 ? '+' : ''}${selectedDayData.offset} дней`
    : (displayData?.timing?.time_remaining_readable || 'неизвестно');
</script>

{#if loading}
  <div class="loading">
    <div class="spinner"></div>
    <p>Загрузка лунной энергии...</p>
  </div>
{:else if error}
  <div class="error">
    <div class="error-icon">🌙</div>
    <h2>Не удалось загрузить данные</h2>
    <p>{error}</p>
  </div>
{:else}
  <div class="app">
    <Background {gradient} />

    <!-- Palette toggle button -->
    <button class="palette-toggle" on:click={togglePalettes} title="Показать цветовые палитры">
      🎨
    </button>

    <MonthCalendar
      currentBaseColors={dayData?.colors?.base || dayData?.color_palette?.base_colors || ['#87CEEB', '#4682B4']}
      on:daySelected={handleDaySelected}
    />
    <LunarSequence />
    <DayMoon {gradient} {illumination} {isWaxing} {timeRemaining} on:click={handleMoonClick} />
    <LunarInfo dayData={displayData} />
    <DayDetails dayData={displayData} visible={showDetails} />
    <ColorPalettes baseColors={baseColors} visible={showPalettes} />
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  }

  .app {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .palette-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    color: white;
    font-size: 24px;
    cursor: pointer;
    z-index: 20;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }

  .palette-toggle:hover {
    transform: scale(1.1) rotate(15deg);
    background: rgba(0, 0, 0, 0.9);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  }

  .palette-toggle:active {
    transform: scale(0.95);
  }

  .loading,
  .error {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
    color: white;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading p {
    margin-top: 20px;
    font-size: 18px;
    opacity: 0.8;
  }

  .error-icon {
    font-size: 60px;
    margin-bottom: 20px;
  }

  .error h2 {
    margin: 0 0 10px 0;
  }

  .error p {
    opacity: 0.7;
  }
</style>
