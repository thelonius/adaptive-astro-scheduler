<script>
  import { onMount } from 'svelte';
  import * as THREE from 'three';

  export let gradient = ['#87CEEB'];
  export let illumination = 0.5; // 0-1 fraction
  export let isWaxing = true;

  let container;
  let scene, camera, renderer, moon, sunLight, ambientLight, rimLight;
  let animationId;

  onMount(() => {
    initScene();
    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  });

    function initScene() {
    // Scene
    scene = new THREE.Scene();

    // Camera - слегка наклонена для лучшего обзора серпа
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0.2, 3);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.setSize(800, 800);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Moon geometry - высокое разрешение для гладкой сферы
    const geometry = new THREE.SphereGeometry(1, 128, 128);

    // Используем цвет из градиента дня
    const dayColor = new THREE.Color(gradient[0] || '#cccccc');

    // Material - цвет луны соответствует дню
    const material = new THREE.MeshStandardMaterial({
      color: dayColor,
      roughness: 1.0,   // Матовая поверхность
      metalness: 0.0,   // Не металлическая
      flatShading: false // Гладкое затенение
    });

    moon = new THREE.Mesh(geometry, material);
    scene.add(moon);

    // Ambient light - увеличен для видимости тонкого серпа
    ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    // Sun light - основное направленное освещение
    sunLight = new THREE.DirectionalLight(0xffffff, 3.5);
    scene.add(sunLight);

    // Rim light - подсветка краев для видимости тонкого серпа
    rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 0, -5);
    scene.add(rimLight);

    updateLighting();
  }

  function updateLighting() {
    if (!sunLight) return;

    // Вычисляем угол освещения на основе фазы луны
    // illumination = 0: новолуние (солнце сзади, темная сторона к нам)
    // illumination = 0.5: четверть (солнце сбоку)
    // illumination = 1: полнолуние (солнце спереди, освещенная сторона к нам)

    let angle;

    if (isWaxing) {
      // Растущая луна: от 0 (новолуние) до 1 (полнолуние)
      // Свет движется справа налево
      angle = Math.PI - illumination * Math.PI;
    } else {
      // Убывающая луна: от 1 (полнолуние) до 0 (новолуние)
      // Свет движется слева направо
      angle = -Math.PI + illumination * Math.PI;
    }

    // Позиционируем источник света
    const distance = 5;
    sunLight.position.set(
      Math.sin(angle) * distance,
      0,
      Math.cos(angle) * distance
    );

    // Направляем свет на центр луны
    sunLight.target = moon;
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    // Медленная ротация для красоты
    if (moon) {
      moon.rotation.y += 0.001;
    }

    renderer.render(scene, camera);
  }

  // Реактивно обновляем освещение при изменении параметров
  $: if (moon && sunLight) {
    updateLighting();
  }

  // Реактивно обновляем цвет луны при изменении градиента
  $: if (moon && gradient && gradient[0]) {
    const dayColor = new THREE.Color(gradient[0]);
    moon.material.color = dayColor;
  }
</script>

<div class="moon-container" bind:this={container}></div>

<style>
  .moon-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .moon-container :global(canvas) {
    width: 100% !important;
    height: 100% !important;
    filter: drop-shadow(0 0 100px rgba(255, 255, 255, 0.3));
  }
</style>
