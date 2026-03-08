#!/usr/bin/env python3
"""
Ephemeris Calculator Examples

Demonstrates how to use the ephemeris calculator for various astronomical calculations.
"""

import asyncio
from datetime import datetime, timedelta
from app.core.ephemeris import (
    SkyfieldEphemerisAdapter,
    CachedEphemerisCalculator,
    DateTime,
    Location,
    PlanetName,
    AspectType,
)


async def example_planet_positions():
    """Example: Get planet positions for a specific date."""
    print("=" * 60)
    print("Example 1: Planet Positions")
    print("=" * 60)

    # Initialize calculator
    base_calculator = SkyfieldEphemerisAdapter()
    calculator = CachedEphemerisCalculator(base_calculator)

    # Moscow location
    moscow = Location(latitude=55.7558, longitude=37.6173)

    # Create date-time
    dt = DateTime(
        date=datetime(2026, 1, 15, 12, 0, 0),
        timezone="Europe/Moscow",
        location=moscow
    )

    # Get all planet positions
    positions = await calculator.get_planets_positions(dt)

    print(f"\nPlanet Positions for {dt.date}")
    print(f"Location: Moscow ({moscow.latitude}°N, {moscow.longitude}°E)\n")

    for planet in positions.to_list():
        retrograde = " (R)" if planet.is_retrograde else ""
        print(f"{planet.name.value:10} {planet.longitude:7.2f}° "
              f"{planet.zodiac_sign.symbol} {planet.zodiac_sign.name.value:12} "
              f"{planet.zodiac_sign.degree_in_sign:5.2f}° "
              f"Speed: {planet.speed:+6.2f}°/day{retrograde}")


async def example_moon_phases():
    """Example: Track moon phases over a month."""
    print("\n" + "=" * 60)
    print("Example 2: Moon Phases Over 30 Days")
    print("=" * 60)

    base_calculator = SkyfieldEphemerisAdapter()
    calculator = CachedEphemerisCalculator(base_calculator)

    moscow = Location(latitude=55.7558, longitude=37.6173)
    start_date = datetime(2026, 2, 1, 12, 0, 0)

    print(f"\nMoon Phases from {start_date.date()} for 30 days:\n")
    print(f"{'Date':12} {'Phase':20} {'Illumination':12} {'Emoji':5}")
    print("-" * 50)

    for day in range(30):
        current_date = start_date + timedelta(days=day)
        dt = DateTime(
            date=current_date,
            timezone="UTC",
            location=moscow
        )

        phase = await calculator.get_moon_phase(dt)
        illum_percent = phase.illumination * 100

        print(f"{current_date.date()} {phase.name:20} {illum_percent:5.1f}%      {phase.emoji}")


async def example_lunar_days():
    """Example: Get lunar day information."""
    print("\n" + "=" * 60)
    print("Example 3: Lunar Day Information")
    print("=" * 60)

    base_calculator = SkyfieldEphemerisAdapter()
    calculator = CachedEphemerisCalculator(base_calculator)

    moscow = Location(latitude=55.7558, longitude=37.6173)
    dt = DateTime(
        date=datetime(2026, 2, 15, 12, 0, 0),
        timezone="Europe/Moscow",
        location=moscow
    )

    lunar_day = await calculator.get_lunar_day(dt)

    print(f"\nLunar Day for {dt.date.date()}:")
    print(f"  Day Number: {lunar_day.number}")
    print(f"  Symbol: {lunar_day.symbol}")
    print(f"  Energy: {lunar_day.energy.value}")
    print(f"  Phase: {lunar_day.lunar_phase.value}")
    print(f"  Starts: {lunar_day.starts_at}")
    print(f"  Ends: {lunar_day.ends_at}")
    print(f"  Duration: {lunar_day.duration_hours:.1f} hours")


async def example_retrograde_planets():
    """Example: Find retrograde planets."""
    print("\n" + "=" * 60)
    print("Example 4: Retrograde Planets")
    print("=" * 60)

    base_calculator = SkyfieldEphemerisAdapter()
    calculator = CachedEphemerisCalculator(base_calculator)

    moscow = Location(latitude=55.7558, longitude=37.6173)

    # Check during Mercury retrograde (Feb 15 - Mar 10, 2026)
    dt = DateTime(
        date=datetime(2026, 2, 25, 12, 0, 0),
        timezone="UTC",
        location=moscow
    )

    retrogrades = await calculator.get_retrograde_planets(dt)

    print(f"\nRetrograde Planets on {dt.date.date()}:\n")

    if retrogrades:
        for planet in retrogrades:
            print(f"  {planet.name.value:10} at {planet.longitude:.2f}° "
                  f"in {planet.zodiac_sign.name.value}")
            print(f"             Speed: {planet.speed:.3f}°/day")
    else:
        print("  No planets in retrograde")


async def example_aspects():
    """Example: Calculate planetary aspects."""
    print("\n" + "=" * 60)
    print("Example 5: Planetary Aspects")
    print("=" * 60)

    base_calculator = SkyfieldEphemerisAdapter()
    calculator = CachedEphemerisCalculator(base_calculator)

    moscow = Location(latitude=55.7558, longitude=37.6173)
    dt = DateTime(
        date=datetime(2026, 1, 15, 12, 0, 0),
        timezone="UTC",
        location=moscow
    )

    # Get planet positions
    positions = await calculator.get_planets_positions(dt)

    # Calculate aspects with 8° orb
    aspects = await calculator.calculate_aspects(positions.to_list(), orb=8.0)

    print(f"\nPlanetary Aspects on {dt.date.date()}:\n")

    # Group by aspect type
    aspect_groups = {}
    for aspect in aspects:
        aspect_type = aspect.aspect_type.value
        if aspect_type not in aspect_groups:
            aspect_groups[aspect_type] = []
        aspect_groups[aspect_type].append(aspect)

    for aspect_type in sorted(aspect_groups.keys()):
        print(f"\n{aspect_type.upper()}:")
        for aspect in aspect_groups[aspect_type]:
            exact = "⚡" if aspect.is_exact else " "
            applying = "→" if aspect.is_applying else "←"
            print(f"  {exact} {aspect.body1.name.value:10} {applying} "
                  f"{aspect.body2.name.value:10} (orb: {aspect.orb:.2f}°)")


async def example_sun_moon_aspect():
    """Example: Track Sun-Moon aspects (phase angle)."""
    print("\n" + "=" * 60)
    print("Example 6: Sun-Moon Phase Angle")
    print("=" * 60)

    base_calculator = SkyfieldEphemerisAdapter()
    calculator = CachedEphemerisCalculator(base_calculator)

    moscow = Location(latitude=55.7558, longitude=37.6173)

    print(f"\nSun-Moon separation over 30 days:\n")
    print(f"{'Date':12} {'Separation':12} {'Aspect':15} {'Phase':15}")
    print("-" * 55)

    start_date = datetime(2026, 2, 1, 12, 0, 0)

    for day in range(30):
        current_date = start_date + timedelta(days=day)
        dt = DateTime(
            date=current_date,
            timezone="UTC",
            location=moscow
        )

        positions = await calculator.get_planets_positions(dt)
        phase = await calculator.get_moon_phase(dt)

        # Calculate Sun-Moon separation
        sun_lon = positions.sun.longitude
        moon_lon = positions.moon.longitude
        separation = abs(moon_lon - sun_lon)
        if separation > 180:
            separation = 360 - separation

        # Determine aspect type
        if separation < 10:
            aspect = "Conjunction"
        elif 80 < separation < 100:
            aspect = "Square"
        elif 170 < separation < 190:
            aspect = "Opposition"
        else:
            aspect = "-"

        print(f"{current_date.date()} {separation:6.1f}°      {aspect:15} {phase.name:15}")


async def example_caching_performance():
    """Example: Demonstrate caching performance."""
    print("\n" + "=" * 60)
    print("Example 7: Caching Performance")
    print("=" * 60)

    import time

    base_calculator = SkyfieldEphemerisAdapter()
    calculator = CachedEphemerisCalculator(base_calculator)

    moscow = Location(latitude=55.7558, longitude=37.6173)
    dt = DateTime(
        date=datetime(2020, 1, 1, 12, 0, 0),  # Past date for permanent caching
        timezone="UTC",
        location=moscow
    )

    # Clear cache
    calculator.clear_cache()

    # First call (not cached)
    start = time.time()
    positions1 = await calculator.get_planets_positions(dt)
    time1 = (time.time() - start) * 1000

    # Second call (cached)
    start = time.time()
    positions2 = await calculator.get_planets_positions(dt)
    time2 = (time.time() - start) * 1000

    # Third call (still cached)
    start = time.time()
    positions3 = await calculator.get_planets_positions(dt)
    time3 = (time.time() - start) * 1000

    print(f"\nCaching Performance Test:")
    print(f"  First call (not cached):  {time1:.2f} ms")
    print(f"  Second call (cached):     {time2:.2f} ms")
    print(f"  Third call (cached):      {time3:.2f} ms")
    print(f"  Speedup: {time1/time2:.1f}x")

    stats = calculator.get_cache_stats()
    print(f"\nCache Statistics:")
    print(f"  Entries: {stats['size']}")
    print(f"  Backend: {stats['backend']}")


async def main():
    """Run all examples."""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 10 + "EPHEMERIS CALCULATOR EXAMPLES" + " " * 18 + "║")
    print("╚" + "=" * 58 + "╝")

    await example_planet_positions()
    await example_moon_phases()
    await example_lunar_days()
    await example_retrograde_planets()
    await example_aspects()
    await example_sun_moon_aspect()
    await example_caching_performance()

    print("\n" + "=" * 60)
    print("All examples completed successfully!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
