/**
 * HTTP client for the Python Chart API (/api/v1/chart/*).
 * Distinct from the ephemeris query API — handles full chart calculations.
 */

const CHART_API_BASE = process.env.EPHEMERIS_API_URL || 'http://localhost:8000';

export interface ChartApiChartRequest {
  datetime_utc: string;
  latitude: number;
  longitude: number;
  house_system?: string;
}

export class ChartApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = 'ChartApiError';
  }
}

export async function postChartApi<T>(
  endpoint: string,
  body: unknown
): Promise<T> {
  const url = `${CHART_API_BASE}/api/v1/chart${endpoint}`;

  const response = await globalThis.fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    throw new ChartApiError(
      `Chart API ${endpoint} failed: ${response.status}`,
      response.status,
      detail
    );
  }

  return (await response.json()) as T;
}
