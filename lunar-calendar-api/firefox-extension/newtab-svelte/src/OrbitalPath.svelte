<script>
  import { onMount } from 'svelte';

  let width = 0;
  let height = 0;
  let pathD = '';

  // Вычисляем SVG path на основе размеров экрана
  function calculatePath() {
    if (typeof window === 'undefined') return '';

    width = window.innerWidth;
    height = window.innerHeight;

    // Отступы от краев (примерно 1/3)
    const marginX = width * 0.33;
    const marginY = height * 0.33;

    // Рабочая область
    const innerWidth = width - marginX * 2;
    const innerHeight = height - marginY * 2;

    // Центр
    const cx = width / 2;
    const cy = height / 2;

    // Радиусы эллипса
    const rx = innerWidth / 2;
    const ry = innerHeight / 2;

    // Создаем плавный эллиптический путь с помощью кубических кривых Безье
    // Это создает идеально гладкую форму
    const kappa = 0.5522848; // магическая константа для аппроксимации круга/эллипса кривыми Безье
    const ox = rx * kappa; // control point offset x
    const oy = ry * kappa; // control point offset y

    // Начинаем сверху и идем по часовой стрелке
    pathD = `
      M ${cx},${cy - ry}
      C ${cx + ox},${cy - ry} ${cx + rx},${cy - oy} ${cx + rx},${cy}
      C ${cx + rx},${cy + oy} ${cx + ox},${cy + ry} ${cx},${cy + ry}
      C ${cx - ox},${cy + ry} ${cx - rx},${cy + oy} ${cx - rx},${cy}
      C ${cx - rx},${cy - oy} ${cx - ox},${cy - ry} ${cx},${cy - ry}
      Z
    `.trim().replace(/\s+/g, ' ');
  }

  onMount(() => {
    calculatePath();

    // Реактивно пересчитываем путь при изменении размера окна
    const handleResize = () => {
      calculatePath();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  // Реактивно обновляем путь
  $: if (typeof window !== 'undefined') {
    calculatePath();
  }
</script>

<svg class="orbital-path" {width} {height} xmlns="http://www.w3.org/2000/svg">
  <path
    d={pathD}
    fill="none"
    stroke="rgba(255, 255, 255, 0.15)"
    stroke-width="2"
    stroke-dasharray="10 15"
    class="path-line"
  />
</svg>

<style>
  .orbital-path {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 1;
  }

  .path-line {
    animation: dashOffset 60s linear infinite;
  }

  @keyframes dashOffset {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: -1000;
    }
  }
</style>
