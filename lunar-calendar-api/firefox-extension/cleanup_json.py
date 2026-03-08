#!/usr/bin/env python3
"""
Clean up lunar_calendar.json by removing gradient arrays.
Gradients will be generated in the browser from base colors.
"""

import json
import os

def cleanup_json(input_file, output_file=None):
    """Remove gradient arrays from JSON file, keep only base colors."""

    if output_file is None:
        output_file = input_file

    # Read the original file
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Track statistics
    days_processed = 0
    gradients_removed = 0

    # Process each day's data
    if 'data' in data:
        for date, day_data in data['data'].items():
            days_processed += 1

            # Remove gradient array if it exists
            if 'colors' in day_data and 'gradient' in day_data['colors']:
                del day_data['colors']['gradient']
                gradients_removed += 1

            # Also check color_palette format (if used)
            if 'color_palette' in day_data and 'gradient' in day_data['color_palette']:
                del day_data['color_palette']['gradient']
                gradients_removed += 1

    # Write the cleaned data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Calculate file size reduction
    original_size = os.path.getsize(input_file)
    new_size = os.path.getsize(output_file)
    reduction = original_size - new_size
    reduction_percent = (reduction / original_size) * 100

    print(f"✓ Cleanup complete!")
    print(f"  Days processed: {days_processed}")
    print(f"  Gradients removed: {gradients_removed}")
    print(f"  Original size: {original_size:,} bytes ({original_size/1024:.1f} KB)")
    print(f"  New size: {new_size:,} bytes ({new_size/1024:.1f} KB)")
    print(f"  Reduction: {reduction:,} bytes ({reduction/1024:.1f} KB, {reduction_percent:.1f}%)")
    print(f"  Output file: {output_file}")

if __name__ == '__main__':
    input_file = 'data/lunar_calendar.json'

    if not os.path.exists(input_file):
        print(f"Error: File not found: {input_file}")
        exit(1)

    # Create backup first
    backup_file = 'data/lunar_calendar.json.backup'
    print(f"Creating backup: {backup_file}")
    with open(input_file, 'r') as src, open(backup_file, 'w') as dst:
        dst.write(src.read())

    # Clean up the file
    cleanup_json(input_file)
