<script>
  import { createEventDispatcher } from 'svelte';
  import Moon3D from './Moon3D.svelte';

  export let gradient = ['#87CEEB', '#4682B4'];
  export let illumination = 0.5;
  export let isWaxing = true;
  export let timeRemaining = 'неизвестно';

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('click');
  }
</script>

<button
  class="day-moon"
  title="Освещённость: {(illumination * 100).toFixed(1)}% - Нажмите для подробностей"
  on:click={handleClick}
>
  <Moon3D {gradient} {illumination} {isWaxing} />

  <!-- Display remaining time on the moon -->
  <div class="time-overlay">
    <span class="time-remaining">Осталось: {timeRemaining}</span>
  </div>
</button>

<style>
  .day-moon {
    position: fixed;
    top: 15%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 20vmin;
    height: 20vmin;
    z-index: 2;
    opacity: 0.85;
    transition: all 0.3s ease;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .day-moon:hover {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.05);
  }

  .day-moon:active {
    transform: translate(-50%, -50%) scale(0.98);
  }

  .time-overlay {
    position: absolute;
    bottom: -4vmin;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);
    z-index: 10;
  }

  .time-remaining {
    font-weight: 500;
  }
</style>