import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchCatalog, runQuery, type Catalog, type JobResult, type Selection } from './api';
import { formatValue, percent, sortedEntries } from './format';

const DEFAULT_COUNTRY = 'Netherlands';
const DEFAULT_YEAR = 2011;
const TOP_N = 5;

interface Results {
  footprintCountry: JobResult;
  footprintAll: JobResult;
  direct: JobResult;
  contributions: JobResult;
}

interface QueueItem {
  id: number;
  label: string;
  status: 'running' | 'completed' | 'failed';
  detail: string;
}

type Panel = 'left' | 'right';

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sectorId, setSectorId] = useState<number | null>(null);
  const [countryId, setCountryId] = useState<number | null>(null);
  const [indicatorId, setIndicatorId] = useState<number | null>(null);
  const [year, setYear] = useState<number>(DEFAULT_YEAR);
  const [results, setResults] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [open, setOpen] = useState<Record<Panel, boolean>>({ left: true, right: true });

  useEffect(() => {
    fetchCatalog()
      .then((data) => {
        setCatalog(data);
        const country = data.countries.find((c) => c.name === DEFAULT_COUNTRY) ?? data.countries[0];
        setCountryId(country?.global_id ?? null);
        setSectorId(data.products[0]?.global_id ?? null);
        const indicator = data.indicators.find((i) => /GHG/i.test(i.name)) ?? data.indicators[0];
        setIndicatorId(indicator?.global_id ?? null);
      })
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  const names = useMemo(() => {
    const countryName = new Map(catalog?.countries.map((c) => [c.global_id, c.name]) ?? []);
    const productName = new Map(catalog?.products.map((p) => [p.global_id, p.name]) ?? []);
    return { countryName, productName };
  }, [catalog]);

  const unit = useMemo(() => {
    const indicator = catalog?.indicators.find((i) => i.global_id === indicatorId);
    return indicator?.unit ?? '';
  }, [catalog, indicatorId]);

  const selectedCountry = countryId !== null ? names.countryName.get(countryId) ?? '' : '';
  const selectedSector = sectorId !== null ? names.productName.get(sectorId) ?? '' : '';

  const setQueueItem = (id: number, patch: Partial<QueueItem>) =>
    setQueue((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  async function run() {
    if (!catalog || sectorId === null || countryId === null || indicatorId === null) return;
    const allCountries = catalog.countries.map((c) => c.global_id);
    const common = { nodesSec: [sectorId], extn: [indicatorId], year: [String(year)] };
    const requests: Record<keyof Results, Selection & { label: string }> = {
      footprintCountry: { ...common, dimType: 'Contribution', vizType: 'Geographic', nodesReg: [countryId], label: 'Footprint in country' },
      footprintAll: { ...common, dimType: 'Contribution', vizType: 'Geographic', nodesReg: allCountries, label: 'Footprint, all regions' },
      direct: { ...common, dimType: 'Hotspot', vizType: 'Geographic', nodesReg: allCountries, label: 'Direct impacts, all regions' },
      contributions: { ...common, dimType: 'Contribution', vizType: 'Sectoral', nodesReg: [countryId], label: 'Contributing sectors' },
    };

    setBusy(true);
    setRunError(null);
    const label = `${selectedSector} · ${selectedCountry} · ${year}`;
    const items = Object.values(requests).map((request, index) => ({
      id: Date.now() + index,
      label: `${request.label} · ${label}`,
      status: 'running' as const,
      detail: 'Queued',
    }));
    setQueue((existing) => [...items, ...existing]);

    const entries = Object.entries(requests) as [keyof Results, Selection & { label: string }][];
    try {
      const settled = await Promise.all(
        entries.map(async ([key, request], index) => {
          const { label: _label, ...selection } = request;
          const item = items[index];
          try {
            const job = await runQuery(selection);
            if (job.status === 'failed' || !job.result) {
              setQueueItem(item.id, { status: 'failed', detail: 'Calculation failed' });
              throw new Error(`${request.label} failed`);
            }
            setQueueItem(item.id, { status: 'completed', detail: `Finished ${new Date().toLocaleTimeString()}` });
            return [key, job.result] as const;
          } catch (error) {
            setQueueItem(item.id, { status: 'failed', detail: (error as Error).message });
            throw error;
          }
        }),
      );
      const collected: Partial<Results> = {};
      for (const [key, result] of settled) collected[key] = result;
      setResults(collected as Results);
    } catch (error) {
      setRunError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return <Shell><p className="error">Could not load the catalog: {loadError}</p></Shell>;
  }
  if (!catalog || sectorId === null || countryId === null) {
    return <Shell><p className="muted">Loading…</p></Shell>;
  }

  const footprintInCountry = results ? results.footprintCountry.rawResultData[selectedCountry] ?? 0 : 0;
  const allFootprints = results ? sortedEntries(results.footprintAll.rawResultData) : [];
  const globalFootprint = allFootprints.reduce((sum, [, value]) => sum + value, 0);
  const rank = allFootprints.findIndex(([name]) => name === selectedCountry) + 1;
  const topContributors = results ? sortedEntries(results.contributions.rawResultData).slice(0, TOP_N) : [];
  const maxContributor = topContributors[0]?.[1] ?? 0;
  const directRows = results ? sortedEntries(results.direct.rawResultData) : [];
  const maxDirect = directRows[0]?.[1] ?? 0;

  return (
    <Shell>
      <header className="topbar">
        <span className="brand">RaMa-Scene</span>
        <div className="spacer" />
        <span className="pill">EXIOBASE 3.3 · dataset v4</span>
      </header>

      <div className="layout">
        {open.left ? (
          <aside className="side">
            <div className="side-head">
              <h2>Scenario modelling</h2>
              <button className="ghost small" onClick={() => setOpen({ ...open, left: false })}>Close ◂</button>
            </div>
            <p className="muted small">
              Scenario runs are not wired up yet. They use the same query API with the
              intervention list, and come in the next step.
            </p>
            <label className="check">
              <input type="checkbox" disabled /> Apply scenario to results
            </label>
          </aside>
        ) : (
          <aside className="rail">
            <button className="rail-button" onClick={() => setOpen({ ...open, left: true })}>Scenario modelling ▸</button>
          </aside>
        )}

        <main className="main">
          <section className="controls">
            <Field label="Sector">
              <select value={sectorId} onChange={(e) => setSectorId(Number(e.target.value))}>
                {catalog.products.map((p) => <option key={p.global_id} value={p.global_id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Country">
              <select value={countryId} onChange={(e) => setCountryId(Number(e.target.value))}>
                {catalog.countries.map((c) => <option key={c.global_id} value={c.global_id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Indicator">
              <select value={indicatorId ?? ''} onChange={(e) => setIndicatorId(Number(e.target.value))}>
                {catalog.indicators.map((i) => <option key={i.global_id} value={i.global_id}>{i.name}</option>)}
              </select>
            </Field>
            <Field label="Year">
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {catalog.years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Level">
              <div className="segmented">
                <button className="on" aria-pressed="true">Country</button>
                <button disabled title="NUTS2 is added with the CircuMAT merge">NUTS2</button>
              </div>
            </Field>
            <button className="primary" onClick={run} disabled={busy}>
              {busy ? 'Running…' : 'Run analysis'}
            </button>
          </section>

          {runError && <p className="error">{runError}</p>}
          {!results && !busy && <p className="muted">Choose a sector and run the analysis.</p>}

          {results && (
            <>
              <section className="card">
                <h2>1. What are the footprint impacts of {selectedSector} in {selectedCountry}?</h2>
                <div className="cards">
                  <Stat label={`Footprint in ${selectedCountry}`} value={formatValue(footprintInCountry)} sub={unit} />
                  <Stat label={`Global footprint of ${selectedSector}`} value={formatValue(globalFootprint)} sub={`${unit}, all regions`} />
                  <Stat label="Share of global footprint" value={percent(footprintInCountry, globalFootprint)} sub={`${selectedCountry} as share of global`} />
                  <Stat label="Rank among regions" value={rank > 0 ? `#${rank}` : '—'} sub={`For ${selectedSector}`} />
                </div>
              </section>

              <section className="card">
                <h2>2. What is the contribution of other sectors to {selectedSector} in {selectedCountry}?</h2>
                <Bars title="Top contributing sectors" rows={topContributors.map(([name, value]) => ({ name, value, max: maxContributor }))} unit={unit} />
                <p className="muted small">
                  Stacks by country of origin are added once the API returns origin-by-sector results.
                </p>
              </section>

              <section className="card">
                <h2>3. What are the direct impacts of {selectedSector} in each region?</h2>
                <table className="table">
                  <thead>
                    <tr><th>Region</th><th>Share of direct impact</th><th className="right">Value ({unit})</th></tr>
                  </thead>
                  <tbody>
                    {directRows.map(([name, value]) => (
                      <tr key={name} className={name === selectedCountry ? 'selected' : undefined}>
                        <td>{name}{name === selectedCountry ? '  ← selected' : ''}</td>
                        <td>
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${maxDirect ? (value / maxDirect) * 100 : 0}%` }} /></div>
                        </td>
                        <td className="right tabular">{formatValue(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}

          <p className="muted tiny">
            Source: EXIOBASE 3.3, RaMa-Scene dataset v4. Years 1995–2011.
          </p>
        </main>

        {open.right ? (
          <aside className="side">
            <div className="side-head">
              <h2>Analysis queue</h2>
              <button className="ghost small" onClick={() => setOpen({ ...open, right: false })}>Close ▸</button>
            </div>
            {queue.length === 0 && <p className="muted small">No analyses yet.</p>}
            {queue.map((item) => (
              <div className="job" key={item.id}>
                <div className="job-head">
                  <span className="job-name">{item.label}</span>
                  <span className={`status ${item.status}`}>{item.status}</span>
                </div>
                <span className="muted small">{item.detail}</span>
              </div>
            ))}
          </aside>
        ) : (
          <aside className="rail">
            <button className="rail-button" onClick={() => setOpen({ ...open, right: true })}>◂ Analysis queue</button>
          </aside>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="app">{children}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="stat">
      <span className="stat-value tabular">{value}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-sub">{sub}</span>
    </div>
  );
}

function Bars({ title, rows, unit }: { title: string; rows: { name: string; value: number; max: number }[]; unit: string }) {
  return (
    <div className="bars">
      <span className="bars-title">{title}</span>
      {rows.map((row) => (
        <div className="bar-row" key={row.name}>
          <span className="bar-name">{row.name}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${row.max ? (row.value / row.max) * 100 : 0}%` }} /></div>
          <span className="bar-value tabular" title={unit}>{formatValue(row.value)}</span>
        </div>
      ))}
    </div>
  );
}
