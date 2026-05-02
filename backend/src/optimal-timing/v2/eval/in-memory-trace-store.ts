/**
 * In-memory TraceStore for tests. Captures appended traces so tests
 * can assert on them; never touches the filesystem.
 *
 * Subclassing TraceStore gives us API compatibility with the v2
 * pipeline without depending on `var/traces/*.jsonl` writes.
 */

import type { TraceRecord } from '../schema/trace';
import { TraceStore } from '../trace/store';

export class InMemoryTraceStore extends TraceStore {
    public appended: TraceRecord[] = [];

    constructor() {
        // rootDir is unused — every method is overridden — but the
        // base constructor still wants something path-like.
        super({ rootDir: '/dev/null/in-memory-trace-store' });
    }

    async append(trace: TraceRecord): Promise<void> {
        this.appended.push(trace);
    }

    async findById(requestId: string): Promise<TraceRecord | null> {
        return this.appended.find((t) => t.request_id === requestId) ?? null;
    }
}
