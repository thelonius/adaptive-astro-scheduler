<script>
  export let gradient = [];

  // Create gradient string from array (can be 2 base colors or 12-step gradient)
  $: bgGradient = gradient.length >= 2
    ? `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[Math.floor(gradient.length/2)]} 50%, ${gradient[gradient.length-1]} 100%)`
    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
</script>

<div class="background" style="background: {bgGradient}"></div>

<style>
  .background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    transition: background 1.5s ease;
  }
</style>
