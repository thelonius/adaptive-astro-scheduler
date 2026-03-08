<script>
  import chroma from 'chroma-js';

  export let baseColors = ['#FFD700', '#FFA500'];
  export let visible = false;

  // Generate different palette types from base colors
  function generatePalettes(colors) {
    const baseColor = chroma(colors[0]);
    const secondaryColor = colors[1] ? chroma(colors[1]) : baseColor.brighten(1);

    return {
      // Original gradient
      original: {
        name: 'Оригинальный',
        colors: colors
      },

      // Monochromatic - different shades of the same hue
      monochromatic: {
        name: 'Монохром',
        colors: [
          baseColor.darken(2).hex(),
          baseColor.darken(1).hex(),
          baseColor.hex(),
          baseColor.brighten(1).hex(),
          baseColor.brighten(2).hex()
        ]
      },

      // Analogous - colors next to each other on color wheel
      analogous: {
        name: 'Аналоговые',
        colors: [
          baseColor.set('hsl.h', '-30').hex(),
          baseColor.set('hsl.h', '-15').hex(),
          baseColor.hex(),
          baseColor.set('hsl.h', '+15').hex(),
          baseColor.set('hsl.h', '+30').hex()
        ]
      },

      // Complementary - opposite on color wheel
      complementary: {
        name: 'Комплементарные',
        colors: [
          baseColor.hex(),
          baseColor.set('hsl.h', '+180').hex(),
          chroma.mix(baseColor, baseColor.set('hsl.h', '+180'), 0.25).hex(),
          chroma.mix(baseColor, baseColor.set('hsl.h', '+180'), 0.5).hex(),
          chroma.mix(baseColor, baseColor.set('hsl.h', '+180'), 0.75).hex()
        ]
      },

      // Triadic - three colors equally spaced on color wheel
      triadic: {
        name: 'Триадные',
        colors: [
          baseColor.hex(),
          baseColor.set('hsl.h', '+120').hex(),
          baseColor.set('hsl.h', '+240').hex(),
          chroma.mix(baseColor, baseColor.set('hsl.h', '+120'), 0.5).hex(),
          chroma.mix(baseColor.set('hsl.h', '+120'), baseColor.set('hsl.h', '+240'), 0.5).hex()
        ]
      },

      // Split complementary
      splitComplementary: {
        name: 'Расщепленные',
        colors: [
          baseColor.hex(),
          baseColor.set('hsl.h', '+150').hex(),
          baseColor.set('hsl.h', '+210').hex(),
          chroma.mix(baseColor, baseColor.set('hsl.h', '+150'), 0.5).hex(),
          chroma.mix(baseColor, baseColor.set('hsl.h', '+210'), 0.5).hex()
        ]
      },

      // Warm gradient
      warm: {
        name: 'Теплые',
        colors: chroma.scale([
          baseColor.set('hsl.h', '-30').saturate(1).hex(),
          baseColor.hex(),
          baseColor.set('hsl.h', '+30').saturate(1).hex()
        ]).mode('lab').colors(5)
      },

      // Cool gradient
      cool: {
        name: 'Холодные',
        colors: chroma.scale([
          baseColor.set('hsl.h', '+90').hex(),
          baseColor.set('hsl.h', '+180').hex(),
          baseColor.set('hsl.h', '+270').hex()
        ]).mode('lab').colors(5)
      },

      // Pastel version
      pastel: {
        name: 'Пастель',
        colors: [
          baseColor.brighten(2).desaturate(2).hex(),
          baseColor.brighten(1.5).desaturate(1.5).hex(),
          baseColor.brighten(1).desaturate(1).hex(),
          secondaryColor.brighten(1).desaturate(1).hex(),
          secondaryColor.brighten(1.5).desaturate(1.5).hex()
        ]
      },

      // Vivid/saturated version
      vivid: {
        name: 'Яркие',
        colors: [
          baseColor.saturate(2).darken(0.5).hex(),
          baseColor.saturate(1.5).hex(),
          baseColor.saturate(1).hex(),
          secondaryColor.saturate(1).hex(),
          secondaryColor.saturate(1.5).hex()
        ]
      },

      // Earth tones
      earth: {
        name: 'Земляные',
        colors: chroma.scale([
          '#8B4513',
          baseColor.set('hsl.s', '0.4').darken(1).hex(),
          baseColor.set('hsl.s', '0.5').hex(),
          '#D2691E',
          '#CD853F'
        ]).mode('lab').colors(5)
      }
    };
  }

  $: palettes = generatePalettes(baseColors);
  $: paletteEntries = Object.entries(palettes);
</script>

{#if visible}
<div class="color-palettes">
  <div class="palettes-header">
    <h3>🎨 Цветовые палитры дня</h3>
  </div>

  <div class="palettes-grid">
    {#each paletteEntries as [key, palette]}
      <div class="palette-card">
        <div class="palette-name">{palette.name}</div>
        <div class="palette-colors">
          {#each palette.colors as color}
            <div
              class="color-swatch"
              style="background-color: {color}"
              title={color}
            ></div>
          {/each}
        </div>
        <div class="palette-gradient" style="background: linear-gradient(to right, {palette.colors.join(', ')})"></div>
      </div>
    {/each}
  </div>
</div>
{/if}

<style>
  .color-palettes {
    position: fixed;
    right: 20px;
    top: 100px;
    max-width: 320px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    z-index: 15;
    pointer-events: auto;
    animation: slideInRight 0.3s ease;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .palettes-header {
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    padding: 16px;
    border-radius: 12px 12px 0 0;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  }

  .palettes-header h3 {
    margin: 0;
    color: white;
    font-size: 16px;
    font-weight: 600;
  }

  .color-palettes::-webkit-scrollbar {
    width: 6px;
  }

  .color-palettes::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  .color-palettes::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  .palettes-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    padding: 12px;
    border-radius: 0 0 12px 12px;
  }

  .palette-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 12px;
    transition: all 0.2s ease;
  }

  .palette-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(-4px);
  }

  .palette-name {
    color: white;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .palette-colors {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }

  .color-swatch {
    flex: 1;
    height: 32px;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .color-swatch:hover {
    transform: scale(1.1);
    z-index: 1;
  }

  .palette-gradient {
    height: 8px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
</style>
