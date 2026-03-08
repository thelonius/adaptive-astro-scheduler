<script>
  export let illumination = 0.5; // 0 = новолуние, 1 = полнолуние
  export let isWaxing = true; // растущая или убывающая

  // Calculate shadow position and size
  $: shadowOffset = isWaxing
    ? (1 - illumination) * 100 // Shadow moves from right to left when waxing
    : -illumination * 100; // Shadow moves from left to right when waning

  $: shadowScale = Math.abs(1 - illumination * 2); // 0 at full/new moon, 1 at half moon
</script>

<div class="moon-phase-shadow"
     class:waxing={isWaxing}
     class:waning={!isWaxing}
     class:new-moon={illumination < 0.02}
     class:full-moon={illumination > 0.98}
     style="
       --shadow-offset: {shadowOffset}%;
       --shadow-scale: {shadowScale};
     ">
</div>

<style>
  .moon-phase-shadow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2;
  }

  /* New moon - completely dark with subtle edge glow */
  .new-moon {
    background: radial-gradient(circle,
      rgba(0, 0, 0, 0.95) 0%,
      rgba(0, 0, 0, 0.98) 70%,
      rgba(0, 0, 0, 0.85) 100%);
    box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.03);
  }

  /* Full moon - no shadow, just subtle texture */
  .full-moon {
    background: transparent;
  }

  /* Waxing moon - shadow from right with realistic curve */
  .waxing:not(.new-moon):not(.full-moon) {
    background:
      /* Sharp terminator line - VERY SHARP boundary */
      linear-gradient(
        90deg,
        transparent 0%,
        transparent calc(50% + var(--shadow-offset) / 2 - 6%),
        rgba(0, 0, 0, 0.3) calc(50% + var(--shadow-offset) / 2 - 3%),
        rgba(0, 0, 0, 0.7) calc(50% + var(--shadow-offset) / 2 - 1%),
        rgba(0, 0, 0, 0.95) calc(50% + var(--shadow-offset) / 2 - 0.5%),
        rgba(0, 0, 0, 0.98) calc(50% + var(--shadow-offset) / 2),
        rgba(0, 0, 0, 0.98) 100%
      ),
      /* Curved terminator - tighter curve */
      radial-gradient(
        ellipse calc(50% - var(--shadow-offset) / 2 + 5%) 52% at calc(50% - var(--shadow-offset) / 4) 50%,
        rgba(0, 0, 0, 0) 0%,
        rgba(0, 0, 0, 0) 45%,
        rgba(0, 0, 0, 0.5) 65%,
        rgba(0, 0, 0, 0.85) 85%,
        rgba(0, 0, 0, 0.95) 100%
      ),
      /* Hard edge enhancement */
      radial-gradient(
        ellipse calc(48% - var(--shadow-offset) / 2) 48% at calc(50% - var(--shadow-offset) / 4 - 1%) 50%,
        transparent 0%,
        transparent 70%,
        rgba(0, 0, 0, 0.6) 90%,
        rgba(0, 0, 0, 0.8) 100%
      );
    /* Strong inner shadow along terminator */
    box-shadow:
      inset -20px 0 50px rgba(0, 0, 0, 0.5),
      inset -10px 0 20px rgba(0, 0, 0, 0.7);
  }

  /* Waning moon - shadow from left with realistic curve */
  .waning:not(.new-moon):not(.full-moon) {
    background:
      /* Sharp terminator line - VERY SHARP boundary */
      linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.98) 0%,
        rgba(0, 0, 0, 0.98) calc(50% - var(--shadow-offset) / 2),
        rgba(0, 0, 0, 0.95) calc(50% - var(--shadow-offset) / 2 + 0.5%),
        rgba(0, 0, 0, 0.7) calc(50% - var(--shadow-offset) / 2 + 1%),
        rgba(0, 0, 0, 0.3) calc(50% - var(--shadow-offset) / 2 + 3%),
        transparent calc(50% - var(--shadow-offset) / 2 + 6%),
        transparent 100%
      ),
      /* Curved terminator - tighter curve */
      radial-gradient(
        ellipse calc(50% + var(--shadow-offset) / 2 + 5%) 52% at calc(50% + var(--shadow-offset) / 4) 50%,
        rgba(0, 0, 0, 0) 0%,
        rgba(0, 0, 0, 0) 45%,
        rgba(0, 0, 0, 0.5) 65%,
        rgba(0, 0, 0, 0.85) 85%,
        rgba(0, 0, 0, 0.95) 100%
      ),
      /* Hard edge enhancement */
      radial-gradient(
        ellipse calc(48% + var(--shadow-offset) / 2) 48% at calc(50% + var(--shadow-offset) / 4 + 1%) 50%,
        transparent 0%,
        transparent 70%,
        rgba(0, 0, 0, 0.6) 90%,
        rgba(0, 0, 0, 0.8) 100%
      );
    /* Strong inner shadow along terminator */
    box-shadow:
      inset 20px 0 50px rgba(0, 0, 0, 0.5),
      inset 10px 0 20px rgba(0, 0, 0, 0.7);
  }
</style>
