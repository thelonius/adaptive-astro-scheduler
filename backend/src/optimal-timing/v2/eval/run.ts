/**
 * Eval runner — phase 1.
 *
 * Loads queries.yaml, runs each through the LLM recipe-generator,
 * scores recipe-correctness against the expected block, writes a
 * Markdown report to backend/var/eval-reports/{timestamp}.md.
 *
 * Run with:
 *   npm --prefix backend run eval
 *
 * Exits 0 if every query passes (every must_* check matches),
 * 1 otherwise. Wire in CI when the gold-set stabilizes.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { generateRecipe } from '../llm/recipe-generator';
import { QueryFileSchema, type Query, type QueryResult, type RunResult } from './types';
import { checkPredicateList, isPass, recall } from './metrics';

const QUERIES_PATH = path.join(__dirname, 'queries.yaml');
const REPORTS_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'var', 'eval-reports');

async function runQuery(query: Query): Promise<QueryResult> {
    const t0 = Date.now();
    let generation;
    try {
        generation = await generateRecipe({
            intent: query.prompt,
            language: query.language,
            // Bypass cache so each eval run gets a fresh LLM call —
            // otherwise a single cached recipe would mask regressions.
            bypassCache: true,
        });
    } catch (e) {
        return {
            queryId: query.id,
            prompt: query.prompt,
            error: e instanceof Error ? e.message : String(e),
            llm: null,
            disqualifierChecks: [],
            weightedMustChecks: [],
            weightedShouldChecks: [],
            metrics: {
                disqualifierRecall: 0,
                weightedMustRecall: 0,
                weightedShouldRecall: 0,
                overallPass: false,
            },
        };
    }
    const latencyMs = Date.now() - t0;

    const recipe = generation.recipe;
    const disqAsRecords = recipe.disqualifiers as unknown as Array<Record<string, unknown>>;
    const weightedPreds = recipe.weighted_conditions.map((w) => w.predicate as unknown as Record<string, unknown>);

    const disqualifierChecks = checkPredicateList(
        query.expected.must_disqualifiers,
        disqAsRecords,
    );
    const weightedMustChecks = checkPredicateList(
        query.expected.must_weighted_predicates,
        weightedPreds,
    );
    const weightedShouldChecks = checkPredicateList(
        query.expected.should_weighted_predicates,
        weightedPreds,
    );

    return {
        queryId: query.id,
        prompt: query.prompt,
        llm: {
            model: generation.model,
            promptVersion: generation.promptVersion,
            attempts: generation.attempts,
            cached: generation.cached,
            latencyMs,
        },
        generatedRecipe: {
            intent: recipe.intent,
            rationale: recipe.rationale,
            disqualifierCount: recipe.disqualifiers.length,
            weightedConditionCount: recipe.weighted_conditions.length,
        },
        disqualifierChecks,
        weightedMustChecks,
        weightedShouldChecks,
        metrics: {
            disqualifierRecall: recall(disqualifierChecks),
            weightedMustRecall: recall(weightedMustChecks),
            weightedShouldRecall: recall(weightedShouldChecks),
            overallPass: isPass(disqualifierChecks, weightedMustChecks),
        },
    };
}

function fmtPercent(x: number): string {
    return `${(x * 100).toFixed(0)}%`;
}

function fmtPredicate(p: Record<string, unknown>): string {
    const args = Object.entries(p)
        .filter(([k]) => k !== 'type')
        .map(([k, v]) => {
            if (Array.isArray(v)) return `${k}=[${v.join(',')}]`;
            if (typeof v === 'object' && v !== null) return `${k}=${JSON.stringify(v)}`;
            return `${k}=${String(v)}`;
        });
    const t = String(p.type ?? '?');
    return args.length ? `${t}(${args.join(', ')})` : t;
}

function buildMarkdown(result: RunResult): string {
    const lines: string[] = [];
    lines.push(`# v2 eval report — ${result.timestamp}`);
    lines.push('');
    lines.push(`- **model**: \`${result.model}\``);
    lines.push(`- **prompt**: \`${result.promptVersion}\``);
    lines.push(`- **queries**: ${result.aggregate.totalQueries}`);
    lines.push(`- **passed**: ${result.aggregate.passedQueries} / ${result.aggregate.totalQueries}`);
    lines.push(
        `- **avg recall**: disqualifiers ${fmtPercent(result.aggregate.avgDisqRecall)}, ` +
        `must-weighted ${fmtPercent(result.aggregate.avgMustRecall)}, ` +
        `should-weighted ${fmtPercent(result.aggregate.avgShouldRecall)}`,
    );
    lines.push('');
    lines.push('## Summary table');
    lines.push('');
    lines.push('| query | pass | disq recall | must recall | should recall | attempts | cached | latency |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const q of result.queries) {
        const pass = q.metrics.overallPass ? '✅' : '❌';
        const llm = q.llm;
        lines.push(
            `| \`${q.queryId}\` | ${pass} | ${fmtPercent(q.metrics.disqualifierRecall)} | ` +
            `${fmtPercent(q.metrics.weightedMustRecall)} | ${fmtPercent(q.metrics.weightedShouldRecall)} | ` +
            `${llm?.attempts ?? '-'} | ${llm?.cached ? 'yes' : 'no'} | ${llm?.latencyMs ?? '-'}ms |`,
        );
    }
    lines.push('');

    for (const q of result.queries) {
        lines.push(`## \`${q.queryId}\``);
        lines.push('');
        lines.push(`**Prompt**: \`${q.prompt}\``);
        lines.push('');
        if (q.error) {
            lines.push(`**ERROR**: ${q.error}`);
            lines.push('');
            continue;
        }
        if (q.generatedRecipe) {
            lines.push(`**LLM intent**: ${q.generatedRecipe.intent}`);
            lines.push('');
            lines.push(`**Rationale**: ${q.generatedRecipe.rationale}`);
            lines.push('');
            lines.push(
                `Generated recipe has ${q.generatedRecipe.disqualifierCount} disqualifiers ` +
                `and ${q.generatedRecipe.weightedConditionCount} weighted conditions.`,
            );
            lines.push('');
        }

        lines.push('### Disqualifiers (must)');
        lines.push('');
        for (const c of q.disqualifierChecks) {
            const mark = c.matched ? '✅' : '❌';
            const matched = c.matchedAgainst ? ` → matched \`${fmtPredicate(c.matchedAgainst)}\`` : '';
            lines.push(`- ${mark} \`${fmtPredicate(c.expected as Record<string, unknown>)}\`${matched}`);
        }
        lines.push('');

        lines.push('### Weighted predicates (must)');
        lines.push('');
        for (const c of q.weightedMustChecks) {
            const mark = c.matched ? '✅' : '❌';
            const matched = c.matchedAgainst ? ` → matched \`${fmtPredicate(c.matchedAgainst)}\`` : '';
            lines.push(`- ${mark} \`${fmtPredicate(c.expected as Record<string, unknown>)}\`${matched}`);
        }
        lines.push('');

        if (q.weightedShouldChecks.length > 0) {
            lines.push('### Weighted predicates (should — soft)');
            lines.push('');
            for (const c of q.weightedShouldChecks) {
                const mark = c.matched ? '✅' : '·';
                const matched = c.matchedAgainst ? ` → matched \`${fmtPredicate(c.matchedAgainst)}\`` : '';
                lines.push(`- ${mark} \`${fmtPredicate(c.expected as Record<string, unknown>)}\`${matched}`);
            }
            lines.push('');
        }
    }

    return lines.join('\n');
}

async function main(): Promise<void> {
    const raw = fs.readFileSync(QUERIES_PATH, 'utf8');
    const parsed = QueryFileSchema.parse(yaml.load(raw));
    console.log(`[eval] loaded ${parsed.queries.length} queries from queries.yaml`);

    const queryResults: QueryResult[] = [];
    for (const q of parsed.queries) {
        process.stdout.write(`[eval] ${q.id} ... `);
        const t0 = Date.now();
        const result = await runQuery(q);
        const dt = Date.now() - t0;
        const pass = result.metrics.overallPass ? 'PASS' : 'FAIL';
        const errSuffix = result.error ? ` (${result.error.slice(0, 80)})` : '';
        console.log(
            `${pass} ` +
            `disq=${(result.metrics.disqualifierRecall * 100).toFixed(0)}% ` +
            `must=${(result.metrics.weightedMustRecall * 100).toFixed(0)}% ` +
            `should=${(result.metrics.weightedShouldRecall * 100).toFixed(0)}% ` +
            `(${dt}ms)${errSuffix}`,
        );
        queryResults.push(result);
    }

    const total = queryResults.length;
    const passed = queryResults.filter((q) => q.metrics.overallPass).length;
    const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

    const firstWithLlm = queryResults.find((q) => q.llm);
    const result: RunResult = {
        timestamp: new Date().toISOString(),
        model: firstWithLlm?.llm?.model ?? 'unknown',
        promptVersion: firstWithLlm?.llm?.promptVersion ?? 'unknown',
        queries: queryResults,
        aggregate: {
            totalQueries: total,
            passedQueries: passed,
            avgDisqRecall: avg(queryResults.map((q) => q.metrics.disqualifierRecall)),
            avgMustRecall: avg(queryResults.map((q) => q.metrics.weightedMustRecall)),
            avgShouldRecall: avg(queryResults.map((q) => q.metrics.weightedShouldRecall)),
        },
    };

    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const filename = `${result.timestamp.replace(/[:.]/g, '-')}.md`;
    const reportPath = path.join(REPORTS_DIR, filename);
    fs.writeFileSync(reportPath, buildMarkdown(result), 'utf8');

    // Also emit the raw JSON next to the Markdown for diffing tools.
    fs.writeFileSync(
        reportPath.replace(/\.md$/, '.json'),
        JSON.stringify(result, null, 2),
        'utf8',
    );

    console.log('');
    console.log(`[eval] passed ${passed}/${total}`);
    console.log(
        `[eval] avg recall: disq=${(result.aggregate.avgDisqRecall * 100).toFixed(0)}%, ` +
        `must=${(result.aggregate.avgMustRecall * 100).toFixed(0)}%, ` +
        `should=${(result.aggregate.avgShouldRecall * 100).toFixed(0)}%`,
    );
    console.log(`[eval] report: ${reportPath}`);

    if (passed < total) process.exit(1);
}

main().catch((e) => {
    console.error('[eval] fatal:', e);
    process.exit(1);
});
