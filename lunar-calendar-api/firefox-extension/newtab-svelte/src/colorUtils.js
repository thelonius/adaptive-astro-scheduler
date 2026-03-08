import chroma from 'chroma-js';

/**
 * Generate a smooth gradient array from base colors
 * @param {string[]} baseColors - Array of 2 base colors (hex)
 * @param {number} steps - Number of gradient steps (default: 12)
 * @returns {string[]} Array of hex colors forming a gradient
 */
export function generateGradient(baseColors, steps = 12) {
  if (!baseColors || baseColors.length < 2) {
    return baseColors || ['#87CEEB'];
  }

  try {
    // Use chroma-js to create smooth gradient
    const scale = chroma.scale(baseColors).mode('lab').colors(steps);
    return scale;
  } catch (error) {
    console.error('Error generating gradient:', error);
    return baseColors;
  }
}
