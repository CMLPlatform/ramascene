import { describe, expect, it, vi } from 'vitest';
import { ApiError, pollJob, startJob } from './api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const selection = {
  dimType: 'Contribution' as const,
  vizType: 'Geographic' as const,
  nodesSec: [1],
  nodesReg: [2],
  extn: [3],
  year: ['2011'],
};

describe('startJob', () => {
  it('posts the query as a default action and returns the job id', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ job_id: 7, status_url: '/api/jobs/7/' }, 202));
    const started = await startJob(selection, fetchImpl as unknown as typeof fetch);
    expect(started.job_id).toBe(7);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/jobs/');
    expect(JSON.parse(String(init.body))).toEqual({ action: 'default', querySelection: selection });
  });

  it('reports a busy server as an ApiError with status 429', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ detail: 'busy' }, 429));
    await expect(startJob(selection, fetchImpl as unknown as typeof fetch)).rejects.toMatchObject({ status: 429 });
  });
});

describe('pollJob', () => {
  it('polls until the job is completed', async () => {
    const statuses = [
      { job_id: 7, name: 'x', status: 'started', created: '' },
      { job_id: 7, name: 'x', status: 'completed', created: '', result: { unit: {}, rawResultData: { NL: 1 } } },
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(statuses.shift()));
    const sleep = vi.fn(async () => undefined);
    const job = await pollJob('/api/jobs/7/', { fetchImpl: fetchImpl as unknown as typeof fetch, sleep });
    expect(job.status).toBe('completed');
    expect(job.result?.rawResultData).toEqual({ NL: 1 });
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('gives up after the timeout', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ job_id: 7, name: 'x', status: 'started', created: '' }));
    const sleep = vi.fn(async () => undefined);
    await expect(
      pollJob('/api/jobs/7/', { fetchImpl: fetchImpl as unknown as typeof fetch, sleep, timeoutMs: -1 }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
