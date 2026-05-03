// Minimal shim for js-yaml — full @types/js-yaml not installed.
// Only the surface we use here.
declare module 'js-yaml' {
    export function load(input: string, options?: unknown): unknown;
    export function dump(obj: unknown, options?: unknown): string;
}
