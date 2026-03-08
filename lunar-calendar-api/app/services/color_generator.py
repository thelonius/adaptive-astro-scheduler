import numpy as np
from typing import List, Tuple
from app.models.lunar_day import ColorPalette


class ColorGenerator:
    """Generate color palettes and gradients for lunar days."""

    def __init__(self):
        """Initialize the color generator."""
        pass

    def generate_palette(self, base_colors: List[str], gradient_steps: int = 10) -> ColorPalette:
        """
        Generate a color palette with gradients from base colors.

        Args:
            base_colors: List of hex color codes (e.g., ['#FF5733', '#33FF57'])
            gradient_steps: Number of gradient steps between colors

        Returns:
            ColorPalette object with base colors and generated gradient
        """
        if not base_colors:
            # Default to grayscale if no colors provided
            base_colors = ['#808080']

        # Generate gradient
        gradient = self._create_gradient(base_colors, gradient_steps)

        return ColorPalette(
            base_colors=base_colors,
            gradient=gradient
        )

    def _create_gradient(self, colors: List[str], steps: int) -> List[str]:
        """
        Create a smooth gradient between multiple colors.

        Args:
            colors: List of hex color codes
            steps: Total number of colors in the gradient

        Returns:
            List of hex color codes forming a gradient
        """
        if len(colors) == 1:
            # If only one color, create a lighter/darker variation
            return self._create_monochrome_gradient(colors[0], steps)

        # Convert hex to RGB
        rgb_colors = [self._hex_to_rgb(color) for color in colors]

        # Calculate steps between each pair of colors
        num_transitions = len(colors) - 1
        steps_per_transition = steps // num_transitions

        gradient = []

        for i in range(num_transitions):
            start_color = rgb_colors[i]
            end_color = rgb_colors[i + 1]

            # Generate gradient between two colors
            for j in range(steps_per_transition):
                if i == num_transitions - 1 and j == steps_per_transition - 1:
                    # Last color
                    gradient.append(self._rgb_to_hex(end_color))
                else:
                    t = j / steps_per_transition
                    interpolated = self._interpolate_color(start_color, end_color, t)
                    gradient.append(self._rgb_to_hex(interpolated))

        # Ensure we have exactly the requested number of steps
        while len(gradient) < steps:
            gradient.append(gradient[-1])

        return gradient[:steps]

    def _create_monochrome_gradient(self, base_color: str, steps: int) -> List[str]:
        """
        Create a gradient from darker to lighter shades of a single color.

        Args:
            base_color: Hex color code
            steps: Number of gradient steps

        Returns:
            List of hex color codes
        """
        rgb = self._hex_to_rgb(base_color)
        gradient = []

        for i in range(steps):
            # Create gradient from dark to light
            t = i / (steps - 1)
            # Darken at the start, lighten at the end
            if t < 0.5:
                # Dark to base
                factor = t * 2
                new_rgb = tuple(int(c * factor) for c in rgb)
            else:
                # Base to light
                factor = (t - 0.5) * 2
                new_rgb = tuple(int(c + (255 - c) * factor) for c in rgb)

            gradient.append(self._rgb_to_hex(new_rgb))

        return gradient

    def _interpolate_color(self, color1: Tuple[int, int, int],
                          color2: Tuple[int, int, int],
                          t: float) -> Tuple[int, int, int]:
        """
        Interpolate between two RGB colors.

        Args:
            color1: First RGB color (r, g, b)
            color2: Second RGB color (r, g, b)
            t: Interpolation factor (0 to 1)

        Returns:
            Interpolated RGB color
        """
        r = int(color1[0] + (color2[0] - color1[0]) * t)
        g = int(color1[1] + (color2[1] - color1[1]) * t)
        b = int(color1[2] + (color2[2] - color1[2]) * t)

        return (r, g, b)

    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """
        Convert hex color to RGB tuple.

        Args:
            hex_color: Hex color code (e.g., '#FF5733')

        Returns:
            RGB tuple (r, g, b)
        """
        # Remove '#' if present
        hex_color = hex_color.lstrip('#')

        # Convert to RGB
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def _rgb_to_hex(self, rgb: Tuple[int, int, int]) -> str:
        """
        Convert RGB tuple to hex color.

        Args:
            rgb: RGB tuple (r, g, b)

        Returns:
            Hex color code (e.g., '#FF5733')
        """
        # Clamp values to 0-255
        r, g, b = [max(0, min(255, c)) for c in rgb]
        return f'#{r:02X}{g:02X}{b:02X}'

    def blend_colors(self, colors: List[str], weights: List[float] = None) -> str:
        """
        Blend multiple colors together with optional weights.

        Args:
            colors: List of hex color codes
            weights: Optional weights for each color (defaults to equal weights)

        Returns:
            Blended hex color code
        """
        if not colors:
            return '#808080'

        if weights is None:
            weights = [1.0 / len(colors)] * len(colors)

        # Normalize weights
        total_weight = sum(weights)
        weights = [w / total_weight for w in weights]

        # Convert to RGB and blend
        rgb_colors = [self._hex_to_rgb(color) for color in colors]

        blended_r = sum(rgb[0] * w for rgb, w in zip(rgb_colors, weights))
        blended_g = sum(rgb[1] * w for rgb, w in zip(rgb_colors, weights))
        blended_b = sum(rgb[2] * w for rgb, w in zip(rgb_colors, weights))

        return self._rgb_to_hex((int(blended_r), int(blended_g), int(blended_b)))
