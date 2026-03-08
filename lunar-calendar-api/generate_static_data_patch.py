#!/usr/bin/env python3
"""
Patch to remove gradient generation from generate_static_data.py
"""

import re

# Read the file
with open('generate_static_data.py', 'r') as f:
    content = f.read()

# Remove the gradient generation line
content = re.sub(
    r'\s*# Generate colors\n\s*palette = color_gen\.generate_palette\(lunar_data\.base_colors, gradient_steps=12\)',
    '\n            # Colors - gradients generated in browser',
    content
)

# Remove gradient from colors dict
content = re.sub(
    r'(\s*"colors": \{\s*\n\s*"base": lunar_data\.base_colors,\s*\n)\s*"gradient": palette\.gradient\s*\n(\s*\})',
    r'\1\2',
    content
)

# Remove ColorGenerator import if it's only used for gradients
content = re.sub(
    r'from app\.services\.color_generator import ColorGenerator\n',
    '',
    content
)

# Remove color_gen initialization
content = re.sub(
    r'\s*color_gen = ColorGenerator\(\)\n',
    '',
    content
)

# Write back
with open('generate_static_data.py', 'w') as f:
    f.write(content)

print("✓ Patched generate_static_data.py to remove gradient generation")
print("✓ Backup saved as generate_static_data.py.backup")
