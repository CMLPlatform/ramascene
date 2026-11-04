import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchCatalog, runQuery, type Catalog, type Intervention, type JobResult, type Selection } from './api';
import { formatDelta, formatValue, percent, percentChange, sortedEntries } from './format';
import {
  CHANGE_LIMIT,
  compareRows,
  finalConsumerId,
  technologyConsumers,
  toIntervention,
  type Draft,
  type InterventionKind,
} from './scenario';

const DEFAULT_COUNTRY = 'Netherlands';
const DEFAULT_YEAR = 2011;
const TOP_N = 5;

interface Results {
  footprintCountry: JobResult;
  footprintAll: JobResult;
  direct: JobResult;
  contributions: JobResult;
}

interface RunOutcome {
  baseline: Results;
  scenario: Results | null;
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
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [applyScenario, setApplyScenario] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [open, setOpen] = useState<Record<Panel, boolean>>({ left: true, right: true });
  const nextId = useRef(1);

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

  const newId = () => nextId.current++;

  function addDraft() {
    if (!catalog || sectorId === null || countryId === null) return;
    const consumer = technologyConsumers(catalog.consumers)[0];
    setDrafts((existing) => [
      ...existing,
      {
        id: newId(),
        kind: 'final',
        productId: sectorId,
        originId: countryId,
        consumedId: countryId,
        consumerId: consumer?.global_id ?? 0,
        change: -10,
      },
    ]);
  }

  function updateDraft(id: number, patch: Partial<Draft>) {
    setDrafts((existing) => existing.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDraft(id: number) {
    setDrafts((existing) => existing.filter((d) => d.id !== id));
  }

  // Runs the four analysis queries; with interventions they use the scenario ("model") action.
  async function runSet(prefix: string, interventions: Intervention[] | null): Promise<Results> {
    if (!catalog || sectorId === null || countryId === null || indicatorId === null) {
      throw new Error('The catalog is not loaded yet');
    }
    const allCountries = catalog.countries.map((c) => c.global_id);
    const common = { nodesSec: [sectorId], extn: [indicatorId], year: [String(year)] };
    const requests: Record<keyof Results, Selection & { label: string }> = {
      footprintCountry: { ...common, dimType: 'Contribution', vizType: 'Geographic', nodesReg: [countryId], label: 'Footprint in country' },
      footprintAll: { ...common, dimType: 'Contribution', vizType: 'Geographic', nodesReg: allCountries, label: 'Footprint, all regions' },
      direct: { ...common, dimType: 'Hotspot', vizType: 'Geographic', nodesReg: allCountries, label: 'Direct impacts, all regions' },
      contributions: { ...common, dimType: 'Contribution', vizType: 'Sectoral', nodesReg: [countryId], label: 'Contributing sectors' },
    };
    const entries = Object.entries(requests) as [keyof Results, Selection & { label: string }][];
    const label = `${selectedSector} · ${selectedCountry} · ${year}`;
    const items: QueueItem[] = entries.map(([, request]) => ({
      id: newId(),
      label: `${prefix}: ${request.label} · ${label}`,
      status: 'running',
      detail: 'Queued',
    }));
    setQueue((existing) => [...items, ...existing]);

    const settled = await Promise.all(
      entries.map(async ([key, request], index) => {
        const item = items[index];
        const { label: _label, ...selection } = request;
        try {
          const job = await runQuery({
            action: interventions ? 'model' : 'default',
            querySelection: selection,
            model_details: interventions ?? undefined,
          });
          if (job.status === 'failed' || !job.result) throw new Error('Calculation failed');
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
    return collected as Results;
  }

  async function run() {
    if (!catalog || sectorId === null || countryId === null || indicatorId === null) return;
    const finalId = finalConsumerId(catalog.consumers);
    let interventions: Intervention[] | null = null;
    if (applyScenario) {
      if (drafts.length === 0) {
        setRunError('Add at least one change, or switch the scenario off.');
        return;
      }
      if (finalId === null) {
        setRunError('The catalog has no final consumption entry.');
        return;
      }
      interventions = drafts.map((d) => toIntervention(d, finalId));
    }

    setBusy(true);
    setRunError(null);
    try {
      const [baseline, scenario] = await Promise.all([
        runSet('Baseline', null),
        interventions ? runSet('Scenario', interventions) : Promise.resolve(null),
      ]);
      setOutcome({ baseline, scenario });
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

  const baseline = outcome?.baseline ?? null;
  const scenario = outcome?.scenario ?? null;
  const footprintInCountry = baseline?.footprintCountry.rawResultData[selectedCountry] ?? 0;
  const scenarioFootprint = scenario?.footprintCountry.rawResultData[selectedCountry] ?? 0;
  const allFootprints = baseline ? sortedEntries(baseline.footprintAll.rawResultData) : [];
  const globalFootprint = allFootprints.reduce((sum, [, value]) => sum + value, 0);
  const rank = allFootprints.findIndex(([name]) => name === selectedCountry) + 1;
  const contributionSource = scenario ?? baseline;
  const topContributors = contributionSource
    ? sortedEntries(contributionSource.contributions.rawResultData).slice(0, TOP_N)
    : [];
  const maxContributor = topContributors[0]?.[1] ?? 0;
  const directRows = baseline ? compareRows(baseline.direct.rawResultData, scenario?.direct.rawResultData ?? null) : [];
  const maxDirect = directRows[0]?.base ?? 0;

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
            <label className="check">
              <input type="checkbox" checked={applyScenario} onChange={(e) => setApplyScenario(e.target.checked)} />
              {' '}Apply scenario to results
            </label>
            <p className="muted small">
              Changes are percentages of the chosen flow. Each run is shown next to the baseline.
            </p>
            {drafts.length === 0 && <p className="muted small">No changes yet.</p>}
            {drafts.map((draft, index) => (
              <InterventionCard
                key={draft.id}
                index={index}
                draft={draft}
                catalog={catalog}
                onChange={(patch) => updateDraft(draft.id, patch)}
                onRemove={() => removeDraft(draft.id)}
              />
            ))}
            <button className="ghost small" onClick={addDraft} style={{ marginTop: 12 }}>+ Add change</button>
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
          {!baseline && !busy && <p className="muted">Choose a sector and run the analysis.</p>}

          {baseline && (
            <>
              <section className="card">
                <h2>1. What are the footprint impacts of {selectedSector} in {selectedCountry}?</h2>
                <div className="cards">
                  <Stat label={`Footprint in ${selectedCountry}`} value={formatValue(footprintInCountry)} sub={unit} />
                  <Stat label={`Global footprint of ${selectedSector}`} value={formatValue(globalFootprint)} sub={`${unit}, all regions`} />
                  <Stat label="Share of global footprint" value={percent(footprintInCountry, globalFootprint)} sub={`${selectedCountry} as share of global`} />
                  <Stat label="Rank among regions" value={rank > 0 ? `#${rank}` : '—'} sub={`For ${selectedSector}`} />
                  {scenario && (
                    <Stat
                      label={`Scenario footprint in ${selectedCountry}`}
                      value={formatValue(scenarioFootprint)}
                      sub={`${formatDelta(scenarioFootprint - footprintInCountry)} · ${percentChange(footprintInCountry, scenarioFootprint)}`}
                    />
                  )}
                </div>
              </section>

              <section className="card">
                <h2>2. What is the contribution of other sectors to {selectedSector} in {selectedCountry}?</h2>
                <Bars
                  title={scenario ? 'Top supplying sectors (scenario)' : 'Top supplying sectors'}
                  rows={topContributors.map(([name, value]) => ({ name, value, max: maxContributor }))}
                  unit={unit}
                />
                <p className="muted small">
                  Values are summed over the supplying countries. Stacks by country of origin come next.
                </p>
              </section>

              <section className="card">
                <h2>3. What are the direct impacts of {selectedSector} in each region?</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Region</th>
                      <th>Share of direct impact</th>
                      <th className="right">{scenario ? 'Baseline' : 'Value'} ({unit})</th>
                      {scenario && <th className="right">Scenario</th>}
                      {scenario && <th className="right">Δ</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {directRows.map((row) => (
                      <tr key={row.name} className={row.name === selectedCountry ? 'selected' : undefined}>
                        <td>{row.name}{row.name === selectedCountry ? '  ← selected' : ''}</td>
                        <td>
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${maxDirect ? (row.base / maxDirect) * 100 : 0}%` }} /></div>
                        </td>
                        <td className="right tabular">{formatValue(row.base)}</td>
                        {row.scenario !== null && <td className="right tabular">{formatValue(row.scenario)}</td>}
                        {row.delta !== null && <td className="right tabular">{formatDelta(row.delta)}</td>}
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

function InterventionCard({
  index,
  draft,
  catalog,
  onChange,
  onRemove,
}: {
  index: number;
  draft: Draft;
  catalog: Catalog;
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
}) {
  const sign = draft.change > 0 ? '+' : '';
  return (
    <div className="intervention">
      <div className="intervention-head">
        <span className="field-label">Change {index + 1}</span>
        <button className="ghost small" onClick={onRemove}>Remove</button>
      </div>
      <Field label="Type">
        <select value={draft.kind} onChange={(e) => onChange({ kind: e.target.value as InterventionKind })}>
          <option value="final">Final demand</option>
          <option value="tech">Technology change</option>
        </select>
      </Field>
      <Field label="Sector">
        <select value={draft.productId} onChange={(e) => onChange({ productId: Number(e.target.value) })}>
          {catalog.products.map((p) => <option key={p.global_id} value={p.global_id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Produced in">
        <select value={draft.originId} onChange={(e) => onChange({ originId: Number(e.target.value) })}>
          {catalog.countries.map((c) => <option key={c.global_id} value={c.global_id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Consumed in">
        <select value={draft.consumedId} onChange={(e) => onChange({ consumedId: Number(e.target.value) })}>
          {catalog.countries.map((c) => <option key={c.global_id} value={c.global_id}>{c.name}</option>)}
        </select>
      </Field>
      {draft.kind === 'tech' && (
        <Field label="Consuming sector">
          <select value={draft.consumerId} onChange={(e) => onChange({ consumerId: Number(e.target.value) })}>
            {technologyConsumers(catalog.consumers).map((c) => <option key={c.global_id} value={c.global_id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      <Field label={`Change ${sign}${draft.change}%`}>
        <input
          type="range"
          min={-CHANGE_LIMIT}
          max={CHANGE_LIMIT}
          step={1}
          value={draft.change}
          onChange={(e) => onChange({ change: Number(e.target.value) })}
        />
      </Field>
    </div>
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
