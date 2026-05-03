/**
 * TraceStore: append-only JSONL persistence for TraceRecords.
 *
 * Phase 1: one file per UTC day at `var/traces/YYYY-MM-DD.jsonl`,
 * one trace per line. Easy to grep, no infra. Reads are random-
 * access but slow (linear scan).
 *
 * Phase 2: migrate to Postgres JSONB when scale demands.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import type { TraceRecord } from '../schema/trace';

export interface TraceStoreOptions {
    /** Directory where JSONL files live. Defaults to `var/traces`. */
    rootDir?: string;
}

export class TraceStore {
    private readonly rootDir: string;

    constructor(opts: TraceStoreOptions = {}) {
        this.rootDir = opts.rootDir ?? path.join(process.cwd(), 'var', 'traces');
    }

    private fileForTrace(trace: TraceRecord): string {
        const day = trace.timestamp.slice(0, 10); // YYYY-MM-DD from ISO
        return path.join(this.rootDir, `${day}.jsonl`);
    }

    private async ensureDir(): Promise<void> {
        await fs.promises.mkdir(this.rootDir, { recursive: true });
    }

    /** Append a trace to today's JSONL file. Creates dirs as needed. */
    async append(trace: TraceRecord): Promise<void> {
        await this.ensureDir();
        const file = this.fileForTrace(trace);
        const line = JSON.stringify(trace) + '\n';
        await fs.promises.appendFile(file, line, { encoding: 'utf-8' });
    }

    /**
     * Find a trace by request_id. Linear scan over the most recent
     * day file first, then earlier days. Returns null if not found.
     *
     * Cost: O(traces in store), so don't call this in a hot path.
     * Acceptable for the debug UI which is rate-limited to admins.
     */
    async findById(requestId: string): Promise<TraceRecord | null> {
        await this.ensureDir();
        const files = await fs.promises.readdir(this.rootDir);
        // Newest first by filename (which is YYYY-MM-DD).
        const sortedFiles = files
            .filter((f) => f.endsWith('.jsonl'))
            .sort()
            .reverse();
        for (const f of sortedFiles) {
            const found = await this.scanFile(path.join(this.rootDir, f), requestId);
            if (found) return found;
        }
        return null;
    }

    private async scanFile(filePath: string, requestId: string): Promise<TraceRecord | null> {
        try {
            const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
            const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
            for await (const line of rl) {
                if (!line.trim()) continue;
                if (!line.includes(`"request_id":"${requestId}"`)) continue;
                try {
                    const trace = JSON.parse(line) as TraceRecord;
                    if (trace.request_id === requestId) {
                        rl.close();
                        return trace;
                    }
                } catch {
                    // skip malformed line
                }
            }
        } catch (e) {
            // file may have rotated away; ignore
        }
        return null;
    }
}

/** Module-singleton for convenience. Tests construct their own. */
let _default: TraceStore | null = null;
export function getDefaultTraceStore(): TraceStore {
    if (!_default) _default = new TraceStore();
    return _default;
}
