<script>
  import chroma from 'chroma-js';

  export let gradient = [];

  // Generate lighting colors from gradient
  $: lightColor = gradient.length > 0
    ? chroma(gradient[0]).brighten(2).saturate(1).hex()
    : '#FFF8DC';

  $: highlightColor = gradient.length > 0
    ? chroma(gradient[0]).brighten(3).saturate(0.5).hex()
    : '#FFFACD';

  $: ambientColor = gradient.length > 0
    ? chroma(gradient[Math.floor(gradient.length / 2)]).brighten(1.5).hex()
    : '#FFE4B5';
</script>

<div
  class="moon-lighting"
  style="
    --light-color: {lightColor};
    --highlight-color: {highlightColor};
    --ambient-color: {ambientColor};
  "
>
  <!-- Main light source (sun) hitting the illuminated side -->
  <div class="sunlight"></div>

  <!-- Subtle ambient light for visibility in shadow -->
  <div class="ambient-light"></div>

  <!-- Bright highlight for 3D effect -->
  <div class="specular-highlight"></div>
</div>

<style>
  .moon-lighting {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    pointer-events: none;
    z-index: 3;
  }

  /* Main sunlight - strong directional light */
  .sunlight {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(
      ellipse 140% 140% at 30% 25%,
      var(--light-color) 0%,
      var(--light-color) 10%,
      transparent 60%
    );
    opacity: 0.6;
    mix-blend-mode: screen;
  }

  /* Ambient light - subtle fill light in shadows */
  .ambient-light {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(
      circle at 50% 50%,
      var(--ambient-color) 0%,
      var(--ambient-color) 20%,
      transparent 80%
    );
    opacity: 0.35;
    mix-blend-mode: screen;
  }

  /* Specular highlight - bright spot for realism */
  .specular-highlight {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(
      circle at 38% 32%,
      var(--highlight-color) 0%,
      var(--highlight-color) 5%,
      transparent 20%
    );
    opacity: 0.7;
    mix-blend-mode: overlay;
  }
</style>
