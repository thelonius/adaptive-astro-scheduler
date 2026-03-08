# Lunar Day Timing Bug Fix

## Problem
The `get_lunar_day_timing()` method in `lunar_calculator.py` had an indexing bug when calculating lunar day start and end times from moonrise data.

## Root Cause
The moonrise indexing was offset by 2:
- **Before**: `starts_at = moonrise_times[lunar_day - 4]` and `ends_at = moonrise_times[lunar_day - 3]`
- **After**: `starts_at = moonrise_times[lunar_day - 2]` and `ends_at = moonrise_times[lunar_day - 1]`

## Logic
The correct mapping should be:
- **Lunar Day 1**: New moon → 1st moonrise (index 0)
- **Lunar Day 2**: 1st moonrise (index 0) → 2nd moonrise (index 1)
- **Lunar Day N**: (N-2)th moonrise → (N-1)th moonrise

## Changes Made
1. Fixed the indexing formula from `lunar_day - 4` to `lunar_day - 2` for `starts_at`
2. Fixed the indexing formula from `lunar_day - 3` to `lunar_day - 1` for `ends_at`
3. Added bounds checking to ensure indices are valid before accessing the moonrise array
4. Removed duplicate `_find_moonrises_after()` method definition

## Testing
To verify the fix works:
1. Start the API: `./start_api.sh` or `python run.py`
2. Query a lunar day: `curl "http://localhost:8000/api/v1/lunar-day?date=2025-11-16"`
3. Verify that `starts_at` and `ends_at` times align with actual moonrise times for that location

## Files Modified
- `app/services/lunar_calculator.py` (lines 327-340)
