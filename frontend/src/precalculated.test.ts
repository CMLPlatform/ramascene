import { describe, expect, it, vi } from 'vitest';
import { loadPrecalculated } from './precalculated';

const valid = {
  context: { sector: 'S', country: 'C', indicator: 'I', year: 2011, years: [2011], generated: '2026-11-05' },
  results: { footprintAll: { unit: {}, rawResultData: {} } },
};

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('loadPrecalculated', () => {
  it('returns the analysis when the file is valid', async () => {
    expect((await loadPrecalculated(reply(valid)))?.context.sector).toBe('S');
  });

  it('returns null when the file is missing, malformed or unreachable', async () => {
    expect(await loadPrecalculated(reply({}, 404))).toBeNull();
    expect(await loadPrecalculated(reply({ nothing: true }))).toBeNull();
    expect(await loadPrecalculated(vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch)).toBeNull();
  });
});
