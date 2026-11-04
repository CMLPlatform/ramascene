import { describe, expect, it, vi } from 'vitest';
import { ApiError, isAbortError, pollJob, startJob } from './api';

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
    const started = await startJob({ action: 'default', querySelection: selection }, fetchImpl as unknown as typeof fetch);
    expect(started.job_id).toBe(7);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/jobs/');
    expect(JSON.parse(String(init.body))).toEqual({ action: 'default', querySelection: selection });
  });

  it('reports a busy server as an ApiError with status 429', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ detail: 'busy' }, 429));
    await expect(
      startJob({ action: 'default', querySelection: selection }, fetchImpl as unknown as typeof fetch),
    ).rejects.toMatchObject({ status: 429 });
  });
});

describe('startJob with a scenario', () => {
  it('sends the interventions with the model action', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ job_id: 8, status_url: '/api/jobs/8/' }, 202));
    const intervention = { originReg: [20], consumedReg: [21], product: [10], consumedBy: [276], techChange: [-20] };
    await startJob(
      { action: 'model', querySelection: selection, model_details: [intervention] },
      fetchImpl as unknown as typeof fetch,
    );
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).model_details).toEqual([intervention]);
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

describe('cancelling', () => {
  it('stops polling when the signal is aborted', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async () => jsonResponse({ job_id: 1, status: 'started', created: '' }));
    const sleep = vi.fn(async () => controller.abort());
    const error = await pollJob('/api/jobs/1/', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep,
      signal: controller.signal,
    }).catch((e) => e);
    expect(isAbortError(error)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not start a job after the signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn();
    const error = await startJob({ action: 'default', querySelection: selection }, fetchImpl as unknown as typeof fetch, controller.signal).catch((e) => e);
    expect(isAbortError(error)).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
