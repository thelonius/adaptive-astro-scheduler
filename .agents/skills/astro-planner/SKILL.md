---
name: astro-planner
description: Comprehensive tool for planning optimal opportunities using the adaptive-astro-scheduler ephemeris and natal chart data. Use when the user requests a customized calendar or wants to plan best opportunities using their astrological data across a specific date range.
---

# Astro-Planner Skill

## When to Use This Skill
Use this skill whenever you need to create a customized astrological calendar, plan favorable days, or find the best opportunities for a user's specific goals (job search, project launch, inner work) based on their natal chart and current transits.

## How to Execute
1. Identify the user's focus (e.g., job search, relationship, creative work) and the time window (e.g., next 30 days, specific month). Ensure you have their natal chart data (birth date, time, and location).
2. Use the provided script `scripts/plan_opportunities.ts` to calculate optimal windows.
   - Example: `npx tsx scripts/plan_opportunities.ts --intention="career-change" --start="2026-02-23" --end="2026-03-25" --birthDate="1984-09-11" --birthTime="01:40" --lat="55.7558" --lon="37.6173" --tz="Europe/Moscow"`
3. Summarize the output from the script into a premium, user-friendly customized calendar. Highlight peaks (both positive and negative) and translate the data into actionable advice.

## Resources
- **scripts/plan_opportunities.ts**: Queries local ephemeris databases to run complex transit overlaps against natal charts, returning scored days.
