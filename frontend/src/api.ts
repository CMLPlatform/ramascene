// Client for the RaMa-Scene REST API (see ramascene/api.py).

export interface Product { global_id: number; name: string; code: string }
export interface Country { global_id: number; name: string; code: string }
export interface Indicator { global_id: number; name: string; unit: string; parent_id: number; level: number }

export interface Consumer { global_id: number; name: string; final: boolean }

export interface Nuts2Region {
  code: string;
  name: string;
}

export interface Catalog {
  years: number[];
  nowcast_years?: number[]; // years that are projections, not measured data
  unavailable?: Record<string, number[]>; // indicator ids without data, per year
  source?: string;
  products: Product[];
  countries: Country[];
  indicators: Indicator[];
  consumers: Consumer[];
  nuts2?: Record<string, Nuts2Region[]>; // NUTS2 regions per country name, from CircuMAT
}

export type DimType = 'Contribution' | 'Hotspot';
export type VizType = 'Geographic' | 'Sectoral';

export interface Selection {
  dimType: DimType;
  vizType: VizType;
  nodesSec: number[];
  nodesReg: number[];
  extn: number[];
  year: string[];
}

// One scenario change (see InterventionSerializer in ramascene/serializers.py).
export interface Intervention {
  originReg: number[];
  consumedReg: number[];
  product: number[];
  consumedBy: number[];
  techChange: number[];
}

export interface JobRequest {
  action: 'default' | 'model';
  querySelection: Selection;
  model_details?: Intervention[];
}

// Breakdown of a sector query by supplying sector and supplying country (route one only).
export interface Supply {
  cells: [string, string, number][]; // [supplying sector, supplying country, value], largest first
  countries: Record<string, number>; // total per supplying country
}

export interface JobResult {
  unit: Record<string, string>;
  rawResultData: Record<string, number>;
  consumed?: Record<string, number>; // route one: footprint per consumed sector
  origins?: Record<string, number>; // route one: footprint per country that makes the selected sectors
  supply?: Supply; // route one: where the supply chain sits
}

export interface JobStatus {
  job_id: number;
  name: string;
  status: 'started' | 'completed' | 'failed';
  created: string;
  result?: JobResult;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type FetchLike = typeof fetch;

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  signal?: AbortSignal; // aborting stops waiting for the result
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status})`;
    throw new ApiError(detail, response.status);
  }
  return body as T;
}

export async function fetchCatalog(fetchImpl: FetchLike = fetch): Promise<Catalog> {
  return readJson<Catalog>(await fetchImpl('/api/catalog/'));
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
}

export async function startJob(
  request: JobRequest,
  fetchImpl: FetchLike = fetch,
  signal?: AbortSignal,
): Promise<{ job_id: number; status_url: string }> {
  throwIfAborted(signal);
  const response = await fetchImpl('/api/jobs/', {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return readJson(response);
}

// Polls the job status until it is completed or failed.
export async function pollJob(statusUrl: string, options: PollOptions = {}): Promise<JobStatus> {
  const {
    intervalMs = 1000,
    timeoutMs = 15 * 60 * 1000,
    fetchImpl = fetch,
    signal,
    sleep = defaultSleep,
  } = options;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    throwIfAborted(signal);
    const job = await readJson<JobStatus>(await fetchImpl(statusUrl, { signal }));
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }
    if (Date.now() >= deadline) {
      throw new ApiError('The calculation is taking too long. Try again later.', 504);
    }
    await sleep(intervalMs);
    throwIfAborted(signal);
  }
}

// Starts a calculation and waits for its result.
export async function runQuery(request: JobRequest, options: PollOptions = {}): Promise<JobStatus> {
  const started = await startJob(request, options.fetchImpl, options.signal);
  return pollJob(started.status_url, options);
}
