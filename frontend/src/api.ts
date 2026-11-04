// Client for the RaMa-Scene REST API (see ramascene/api.py).

export interface Product { global_id: number; name: string; code: string }
export interface Country { global_id: number; name: string; code: string }
export interface Indicator { global_id: number; name: string; unit: string }

export interface Catalog {
  years: number[];
  products: Product[];
  countries: Country[];
  indicators: Indicator[];
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

export interface JobResult {
  unit: Record<string, string>;
  rawResultData: Record<string, number>;
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

export async function startJob(
  selection: Selection,
  fetchImpl: FetchLike = fetch,
): Promise<{ job_id: number; status_url: string }> {
  const response = await fetchImpl('/api/jobs/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'default', querySelection: selection }),
  });
  return readJson(response);
}

// Polls the job status until it is completed or failed.
export async function pollJob(statusUrl: string, options: PollOptions = {}): Promise<JobStatus> {
  const {
    intervalMs = 1000,
    timeoutMs = 15 * 60 * 1000,
    fetchImpl = fetch,
    sleep = defaultSleep,
  } = options;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const job = await readJson<JobStatus>(await fetchImpl(statusUrl));
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }
    if (Date.now() >= deadline) {
      throw new ApiError('The calculation is taking too long. Try again later.', 504);
    }
    await sleep(intervalMs);
  }
}

// Starts a calculation and waits for its result.
export async function runQuery(selection: Selection, options: PollOptions = {}): Promise<JobStatus> {
  const started = await startJob(selection, options.fetchImpl);
  return pollJob(started.status_url, options);
}
