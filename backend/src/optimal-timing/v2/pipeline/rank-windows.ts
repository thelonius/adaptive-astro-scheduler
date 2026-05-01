/**
 * Rank scored days into final output windows.
 *
 * Inputs: array of (ScoredDay, disqualified) tuples produced by
 * score-day.ts.
 *
 * Output: top-N surviving days with rank assigned 1..N, plus the
 * disqualified-day list separated out for the trace.
 */

import type { ScoredDay, DisqualifiedDay, StageOutput, StageScoring } from '../schema/trace';
import { SCORING_ENGINE_VERSION } from './score-day';

export interface RankInput {
    scored: ScoredDay;
    disqualified: boolean;
    disqualificationReasons: string[];
}

export interface RankResult {
    stage_scoring: StageScoring;
    stage_output: StageOutput;
    /** Survivor days with rank, ordered by rank ascending. */
    windows: ScoredDay[];
}

export function rankWindows(
    inputs: RankInput[],
    options: { topN: number },
): RankResult {
    const disqualified: DisqualifiedDay[] = [];
    const survivors: ScoredDay[] = [];

    for (const item of inputs) {
        if (item.disqualified) {
            disqualified.push({
                date: item.scored.date,
                reasons: item.disqualificationReasons,
            });
        } else {
            survivors.push(item.scored);
        }
    }

    // Sort by raw_score descending; tie-break by date ascending.
    survivors.sort((a, b) => b.raw_score - a.raw_score || a.date.localeCompare(b.date));

    const topSlice = survivors.slice(0, options.topN);
    topSlice.forEach((day, i) => {
        day.rank = i + 1;
    });

    const top = topSlice[0] ?? null;

    return {
        stage_scoring: {
            candidate_days_count: inputs.length,
            days_disqualified: disqualified,
            scored_days: inputs.map((i) => i.scored),
            scoring_engine_version: SCORING_ENGINE_VERSION,
        },
        stage_output: {
            windows_returned: topSlice.length,
            top_window_date: top ? top.date : null,
            response_summary: buildSummary(topSlice, inputs.length, disqualified.length),
        },
        windows: topSlice,
    };
}

function buildSummary(top: ScoredDay[], totalDays: number, disqualifiedCount: number): string {
    if (top.length === 0) {
        return `Out of ${totalDays} candidate days, ${disqualifiedCount} were disqualified and none of the survivors met the recipe's positive conditions.`;
    }
    const best = top[0];
    return `Top recommendation: ${best.date} (score ${best.raw_score}/100). ${disqualifiedCount}/${totalDays} days disqualified.`;
}
