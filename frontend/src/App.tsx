import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchCatalog, runQuery, type Catalog, type Intervention, type JobResult, type Selection } from './api';
import { ConsentBanner, Field, RankList, Stat, StackedBars, TrendChart } from './components';
import { loadConsent, saveConsent, type Consent } from './consent';
import { formatValue, percent, percentChange, sortedEntries, tone } from './format';
import { nuts2Codes, nuts2Share, nuts2Shares } from './nuts2';
import { buildPresets } from './presets';
import {
  CHANGE_LIMIT,
  compareRows,
  finalConsumerId,
  technologyConsumers,
  toIntervention,
  type Draft,
  type InterventionKind,
} from './scenario';
import { buildStacks } from './stacks';
import { trendYears } from './trend';

const DEFAULT_COUNTRY = 'Netherlands';
const DEFAULT_YEAR = 2011;
const TOP_N = 5;
const TASK_LABELS: Record<string, string> = {
  footprintCountry: 'Footprint in country',
  footprintAll: 'Footprint, all regions',
  direct: 'Direct impacts, all regions',
  contributions: 'Contributing sectors',
  topSectors: 'Top sectors, all regions',
  topRegions: 'Top regions, all sectors',
};
const TREND_LABEL = 'Footprint trend (years)';

interface Results {
  footprintCountry: JobResult;
  footprintAll: JobResult;
  direct: JobResult;
  contributions: JobResult;
  topSectors: JobResult;
  topRegions: JobResult;
  trend: Record<number, number | null>; // footprint in the country per trend year
}

type QueryKey = Exclude<keyof Results, 'trend'>;

interface RunOutcome {
  baseline: Results;
  scenario: Results | null;
  years: number[];
}

interface QueueItem {
  id: number;
  label: string;
  status: 'running' | 'completed' | 'failed';
  detail: string;
  tasks: TaskState[];
  summary?: string[];
}

// One query, or one group of queries (the trend), of a run. done counts finished queries.
interface TaskState {
  name: string;
  done: number;
  total: number;
  failed: boolean;
}

type Panel = 'left' | 'right';
type Level = 'country' | 'nuts2';

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sectorId, setSectorId] = useState<number | null>(null);
  const [countryId, setCountryId] = useState<number | null>(null);
  const [indicatorId, setIndicatorId] = useState<number | null>(null);
  const [year, setYear] = useState<number>(DEFAULT_YEAR);
  const [level, setLevel] = useState<Level>('country');
  const [nuts2Code, setNuts2Code] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [applyScenario, setApplyScenario] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [open, setOpen] = useState<Record<Panel, boolean>>({ left: true, right: true });
  const [helpOpen, setHelpOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(() => loadConsent());
  const nextId = useRef(1);

  useEffect(() => {
    fetchCatalog()
      .then((data) => {
        setCatalog(data);
        const country = data.countries.find((c) => c.name === DEFAULT_COUNTRY) ?? data.countries[0];
        setCountryId(country?.global_id ?? null);
        setSectorId((data.products.find((p) => /^electricity nec/i.test(p.name)) ?? data.products[0])?.global_id ?? null);
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

  // NUTS2 view: a placeholder split of the country total until regional data is loaded.
  const codes = nuts2Codes(selectedCountry);
  const useNuts2 = level === 'nuts2' && codes.length > 0;
  const selectedCode = nuts2Code && codes.includes(nuts2Code) ? nuts2Code : codes[0] ?? null;
  const share = useNuts2 && selectedCode ? nuts2Share(codes, selectedCode) : 1;
  const unitName = useNuts2 && selectedCode ? selectedCode : selectedCountry;

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

  function answerConsent(value: Consent) {
    saveConsent(value);
    setConsent(value);
  }

  // Runs the analysis queries; with interventions they use the scenario ("model") action.
  async function runSet(
    interventions: Intervention[] | null,
    years: number[],
    taskName: (label: string) => string,
    onTask: (name: string, failed?: boolean) => void,
  ): Promise<Results> {
    if (!catalog || sectorId === null || countryId === null || indicatorId === null) {
      throw new Error('The catalog is not loaded yet');
    }
    const allCountries = catalog.countries.map((c) => c.global_id);
    const allSectors = catalog.products.map((p) => p.global_id);
    const common = { extn: [indicatorId], year: [String(year)] };
    const one = { ...common, nodesSec: [sectorId] };
    const everySector = { ...common, nodesSec: allSectors };
    const requests: Record<QueryKey, Selection> = {
      footprintCountry: { ...one, dimType: 'Contribution', vizType: 'Geographic', nodesReg: [countryId] },
      footprintAll: { ...one, dimType: 'Contribution', vizType: 'Geographic', nodesReg: allCountries },
      direct: { ...one, dimType: 'Hotspot', vizType: 'Geographic', nodesReg: allCountries },
      contributions: { ...one, dimType: 'Contribution', vizType: 'Sectoral', nodesReg: [countryId] },
      topSectors: { ...everySector, dimType: 'Contribution', vizType: 'Sectoral', nodesReg: allCountries },
      topRegions: { ...everySector, dimType: 'Contribution', vizType: 'Geographic', nodesReg: allCountries },
    };
    const action = interventions ? 'model' : 'default';
    const model_details = interventions ?? undefined;

    const main = Promise.all(
      (Object.entries(requests) as [QueryKey, Selection][]).map(async ([key, selection]) => {
        const name = taskName(TASK_LABELS[key]);
        try {
          const job = await runQuery({ action, querySelection: selection, model_details });
          if (job.status === 'failed' || !job.result) throw new Error('Calculation failed');
          onTask(name);
          return [key, job.result] as const;
        } catch (error) {
          onTask(name, true);
          throw error;
        }
      }),
    );
    // The trend is secondary: a failed year leaves a gap instead of failing the run.
    const trend = Promise.all(
      years
        .filter((y) => y !== year)
        .map(async (y) => {
          try {
            const job = await runQuery({
              action,
              querySelection: { ...requests.footprintCountry, year: [String(y)] },
              model_details,
            });
            const value = job.status === 'completed' ? job.result?.rawResultData[selectedCountry] ?? null : null;
            return [y, value] as const;
          } catch {
            return [y, null] as const;
          } finally {
            onTask(taskName(TREND_LABEL));
          }
        }),
    );
    const [settled, trendEntries] = await Promise.all([main, trend]);
    const collected: Partial<Results> = {};
    for (const [key, result] of settled) collected[key] = result;
    collected.trend = Object.fromEntries(trendEntries);
    collected.trend[year] = collected.footprintCountry?.rawResultData[selectedCountry] ?? null;
    return collected as Results;
  }

  // Short result lines for a queue entry.
  function summarize(base: Results, scen: Results | null): string[] {
    const own = base.footprintCountry.rawResultData[selectedCountry] ?? 0;
    const all = sortedEntries(base.footprintAll.rawResultData);
    const global = all.reduce((sum, [, value]) => sum + value, 0);
    const position = all.findIndex(([name]) => name === selectedCountry) + 1;
    const lines = [
      `Footprint in ${selectedCountry}: ${formatValue(own)} ${unit}`,
      `${percent(own, global)} of global${position > 0 ? ` · rank #${position}` : ''}`,
    ];
    const top = sortedEntries((scen ?? base).contributions.rawResultData)[0];
    if (top) lines.push(`Top supplying sector: ${top[0]}`);
    if (scen) {
      const changed = scen.footprintCountry.rawResultData[selectedCountry] ?? 0;
      lines.push(`Scenario: ${formatValue(changed)} ${unit} (${percentChange(own, changed)})`);
    }
    return lines;
  }

  async function run(forceScenario = false) {
    if (!catalog || sectorId === null || countryId === null || indicatorId === null) return;
    const withScenario = applyScenario || forceScenario;
    const finalId = finalConsumerId(catalog.consumers);
    let interventions: Intervention[] | null = null;
    if (withScenario) {
      if (drafts.length === 0) {
        setRunError('Add at least one intervention, or switch the scenario off.');
        return;
      }
      if (finalId === null) {
        setRunError('The catalog has no final consumption entry.');
        return;
      }
      interventions = drafts.map((d) => toIntervention(d, finalId));
    }
    if (forceScenario) setApplyScenario(true);

    const years = trendYears(catalog.years, year);
    const trendCount = years.filter((y) => y !== year).length;
    const nameFor = (prefix: string | null) => (label: string) => (prefix ? `${prefix}: ${label}` : label);
    const baselineName = nameFor(interventions ? 'Baseline' : null);
    const scenarioName = nameFor('Scenario');
    const setTasks = (name: (label: string) => string): TaskState[] => [
      ...Object.values(TASK_LABELS).map((label) => ({ name: name(label), done: 0, total: 1, failed: false })),
      ...(trendCount > 0 ? [{ name: name(TREND_LABEL), done: 0, total: trendCount, failed: false }] : []),
    ];
    const tasks = [...setTasks(baselineName), ...(interventions ? setTasks(scenarioName) : [])];
    setBusy(true);
    setRunError(null);
    const runId = newId();
    setQueue((existing) => [
      {
        id: runId,
        label: `${selectedSector} · ${selectedCountry} · ${year}${interventions ? ' · with scenario' : ''}`,
        status: 'running',
        detail: 'Started',
        tasks,
      },
      ...existing,
    ]);
    const onTask = (name: string, failed = false) =>
      setQueue((items) =>
        items.map((item) =>
          item.id === runId
            ? {
                ...item,
                tasks: item.tasks.map((t) =>
                  t.name === name ? { ...t, done: failed ? t.done : t.done + 1, failed: t.failed || failed } : t,
                ),
              }
            : item,
        ),
      );
    try {
      const [baseline, scenario] = await Promise.all([
        runSet(null, years, baselineName, onTask),
        interventions ? runSet(interventions, years, scenarioName, onTask) : Promise.resolve(null),
      ]);
      setOutcome({ baseline, scenario, years });
      setQueueItem(runId, { summary: summarize(baseline, scenario), status: 'completed', detail: `Finished ${new Date().toLocaleTimeString()}` });
    } catch (error) {
      setRunError((error as Error).message);
      setQueueItem(runId, { status: 'failed', detail: (error as Error).message });
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
  const view = scenario ?? baseline; // what the panels show; the baseline is the reference for changes

  // Question 1
  const countryFootprint = (r: Results | null) => (r?.footprintCountry.rawResultData[selectedCountry] ?? 0) * share;
  const baseFootprint = countryFootprint(baseline);
  const viewFootprint = countryFootprint(view);
  const globalOf = (r: Results | null) =>
    Object.values(r?.footprintAll.rawResultData ?? {}).reduce((sum, value) => sum + value, 0);
  const baseGlobal = globalOf(baseline);
  const viewGlobal = globalOf(view);
  const rank = view
    ? sortedEntries(view.footprintAll.rawResultData).findIndex(([name]) => name === selectedCountry) + 1
    : 0;
  const topSectors = view ? sortedEntries(view.topSectors.consumed ?? {}).slice(0, TOP_N) : [];
  const topRegions = view ? sortedEntries(view.topRegions.rawResultData).slice(0, TOP_N) : [];

  // Question 2
  const stacks = view ? buildStacks(view.contributions, TOP_N) : null;

  // Question 3
  const directBase = baseline?.direct.rawResultData ?? {};
  const directScenario = scenario?.direct.rawResultData ?? null;
  const directRows = baseline
    ? useNuts2
      ? nuts2Rows(codes, directBase[selectedCountry] ?? 0, directScenario ? directScenario[selectedCountry] ?? 0 : null)
      : compareRows(directBase, directScenario)
    : [];
  const maxDirect = Math.max(...directRows.map((r) => r.scenario ?? r.base), 0);
  const highlighted = useNuts2 ? selectedCode : selectedCountry;

  // Trend chart
  const trendBase = outcome ? outcome.years.map((y) => scaled(outcome.baseline.trend[y], share)) : [];
  const trendScenario = outcome?.scenario ? outcome.years.map((y) => scaled(outcome.scenario!.trend[y], share)) : null;

  const presets = buildPresets(catalog, countryId, sectorId);
  const scenarioNote = useNuts2
    ? `NUTS2 view: ${selectedCode} values are a placeholder split of ${selectedCountry}.`
    : scenario
      ? 'Scenario applied: results show the scenario, with change against the baseline.'
      : `Baseline results for ${year}. Open Scenario modelling on the left and tick "Apply" to see the effect.`;

  return (
    <Shell>
      <header className="topbar">
        <span className="brand"><span className="brand-mark" aria-hidden="true" />RaMa-Scene</span>
        <div className="spacer" />
        <nav className="nav" aria-label="Main">
          <a href="#analysis" aria-current="page">Analysis</a>
          <a href="/docs/">Docs</a>
        </nav>
        <span className="pill">EXIOBASE 3.3 · dataset v4</span>
        <button className="ghost" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)}>Help</button>
      </header>
      {helpOpen && (
        <section className="help" aria-label="Help">
          <p><strong>Choose</strong> a sector, a country, an indicator and a year, then press Run analysis.</p>
          <p><strong>Scenario modelling</strong> (left): add interventions, tick Apply, and run. Results then show the scenario with the change against the baseline.</p>
          <p><strong>Analysis queue</strong> (right) shows each run and its progress.</p>
        </section>
      )}

      <div className="layout">
        {open.left ? (
          <aside className="side" id="scenario">
            <div className="side-head">
              <h2>Scenario modelling</h2>
              <button className="ghost small" onClick={() => setOpen({ ...open, left: false })}>Close ◂</button>
            </div>
            <label className="check">
              <input type="checkbox" checked={applyScenario} onChange={(e) => setApplyScenario(e.target.checked)} />
              {' '}Apply scenario to results
            </label>
            <p className="muted small side-note">
              Each intervention changes the model before it runs. Results show the change against the baseline.
            </p>
            <TrendChart
              title={`${selectedSector} footprint over time${unit ? ` (${unit})` : ''}`}
              years={outcome?.years ?? []}
              base={trendBase}
              scenario={trendScenario}
            />
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
            <button className="add-intervention" onClick={addDraft}>+ Add intervention</button>
            {presetsOpen && (
              <div className="preset-menu" role="menu" aria-label="Presets">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    role="menuitem"
                    onClick={() => {
                      setDrafts(preset.build(newId));
                      setPresetsOpen(false);
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}
            <div className="side-actions">
              <button className="ghost" aria-expanded={presetsOpen} onClick={() => setPresetsOpen(!presetsOpen)}>Load preset</button>
              <button className="primary" onClick={() => run(true)} disabled={busy}>Run scenario</button>
            </div>
          </aside>
        ) : (
          <aside className="rail">
            <button className="rail-button" onClick={() => setOpen({ ...open, left: true })}>Scenario modelling ▸</button>
          </aside>
        )}

        <main className="main" id="analysis">
          <section className="controls">
            <Field label="Sector">
              <select value={sectorId} onChange={(e) => setSectorId(Number(e.target.value))}>
                {catalog.products.map((p) => <option key={p.global_id} value={p.global_id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Country">
              <select
                value={countryId}
                onChange={(e) => {
                  setCountryId(Number(e.target.value));
                  setNuts2Code(null);
                }}
              >
                {catalog.countries.map((c) => <option key={c.global_id} value={c.global_id}>{c.name}</option>)}
              </select>
            </Field>
            {level === 'nuts2' && (
              <Field label="NUTS2 region">
                <select
                  value={selectedCode ?? ''}
                  disabled={codes.length === 0}
                  onChange={(e) => setNuts2Code(e.target.value)}
                >
                  {codes.length === 0 && <option value="">None for {selectedCountry}</option>}
                  {codes.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </Field>
            )}
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
                <button className={level === 'country' ? 'on' : ''} aria-pressed={level === 'country'} onClick={() => setLevel('country')}>Country</button>
                <button className={level === 'nuts2' ? 'on' : ''} aria-pressed={level === 'nuts2'} onClick={() => setLevel('nuts2')}>NUTS2</button>
              </div>
            </Field>
            <button className="primary" onClick={() => run()} disabled={busy}>
              {busy ? 'Running…' : 'Run analysis'}
            </button>
          </section>

          <p className="scenario-note">{scenarioNote}</p>
          {level === 'nuts2' && codes.length === 0 && (
            <p className="muted small">No NUTS2 regions are available for {selectedCountry}; showing country values.</p>
          )}
          {runError && <p className="error">{runError}</p>}
          {!baseline && !busy && <p className="muted">Choose a sector and run the analysis.</p>}

          {baseline && view && (
            <>
              <section className="card">
                <h2>1. What are the footprint impacts of {selectedSector} in {unitName}?</h2>
                <div className="cards">
                  <Stat
                    label={`Footprint in ${unitName}`}
                    value={formatValue(viewFootprint)}
                    sub={scenario ? `${percentChange(baseFootprint, viewFootprint)} vs baseline` : `Baseline ${year} · ${unit}`}
                  />
                  <Stat
                    label={`Global footprint of ${selectedSector}`}
                    value={formatValue(viewGlobal)}
                    sub={scenario ? `${percentChange(baseGlobal, viewGlobal)} vs baseline` : `All regions · ${unit}`}
                  />
                  <Stat
                    label="Share of global footprint"
                    value={percent(viewFootprint, viewGlobal)}
                    sub={`${unitName} as share of global`}
                  />
                  <Stat
                    label="Rank among regions"
                    value={useNuts2 ? '—' : rank > 0 ? `#${rank}` : '—'}
                    sub={useNuts2 ? 'Rank shown at country level' : `For ${selectedSector}`}
                  />
                </div>
                <div className="split">
                  <RankList
                    title="Top sectors, global footprint"
                    rows={topSectors.map(([label, value]) => ({ label, value, highlight: label === selectedSector }))}
                  />
                  <RankList
                    title="Top regions, global footprint (all sectors)"
                    rows={topRegions.map(([label, value]) => ({ label, value, highlight: label === selectedCountry }))}
                  />
                </div>
              </section>

              <section className="card">
                <h2>2. What is the contribution of other sectors to {selectedSector} in {selectedCountry}, and where are they located?</h2>
                {stacks ? (
                  <div className="split">
                    <StackedBars title="Top contributing sectors (stacks by country)" rows={stacks.sectors} legend={stacks.countryLegend} />
                    <StackedBars title="Top contributing countries (stacks by sector)" rows={stacks.countries} legend={stacks.sectorLegend} />
                  </div>
                ) : (
                  <p className="muted small">The server returned no supply-chain breakdown.</p>
                )}
              </section>

              <section className="card">
                <h2>
                  {useNuts2
                    ? `3. What are the direct impacts of ${selectedSector} in each NUTS2 region of ${selectedCountry}?`
                    : `3. What are the direct impacts of ${selectedSector} in each region?`}
                </h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{useNuts2 ? 'NUTS2 region' : 'Region'}</th>
                      <th>Share of direct impact</th>
                      <th className="right">Value ({unit})</th>
                      {scenario && <th className="right">Δ</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {directRows.map((row) => {
                      const value = row.scenario ?? row.base;
                      const selected = row.name === highlighted;
                      return (
                        <tr key={row.name} className={selected ? 'selected' : undefined}>
                          <td>{row.name}{selected ? '  ← selected' : ''}</td>
                          <td>
                            <div className="bar-track"><div className="bar-fill" style={{ width: `${maxDirect ? (value / maxDirect) * 100 : 0}%` }} /></div>
                          </td>
                          <td className="right tabular">{formatValue(value)}</td>
                          {row.scenario !== null && (
                            <td className={`right tabular delta-${tone(row.base, row.scenario)}`}>
                              {percentChange(row.base, row.scenario)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            </>
          )}

          <p className="footnote">
            Source: EXIOBASE 3.3, RaMa-Scene dataset v4. NUTS2 values are a placeholder split of the country total until
            regional EXIOBASE data is loaded. Δ compares the scenario with the baseline and shows only when the scenario is applied.
          </p>

          {consent === null && (
            <ConsentBanner onAccept={() => answerConsent('accepted')} onDecline={() => answerConsent('declined')} />
          )}
          {consent !== null && (
            <p className="consent-note">
              {consent === 'accepted'
                ? 'Analytics accepted. You can change this in a future release.'
                : 'Analytics declined. The tool runs without analytics.'}
            </p>
          )}
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
                  {queue.length > 1 && (
                    <button
                      className="ghost small job-delete"
                      aria-label="Delete this analysis"
                      title="Delete this analysis"
                      onClick={() => setQueue((items) => items.filter((i) => i.id !== item.id))}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={item.tasks.reduce((n, t) => n + t.total, 0)}
                  aria-valuenow={item.tasks.reduce((n, t) => n + t.done, 0)}
                >
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(item.tasks.reduce((n, t) => n + t.done, 0) / item.tasks.reduce((n, t) => n + t.total, 0)) * 100}%`,
                    }}
                  />
                </div>
                <ul className="tasks">
                  {item.tasks.map((task) => {
                    const state = task.failed ? 'failed' : task.done >= task.total ? 'done' : 'running';
                    return (
                      <li key={task.name} className={`task ${state}`}>
                        <span className="task-mark" aria-hidden="true">
                          {state === 'done' ? '✓' : state === 'failed' ? '✕' : '…'}
                        </span>
                        {task.name}
                        {task.total > 1 && <span className="tabular"> ({task.done}/{task.total})</span>}
                      </li>
                    );
                  })}
                </ul>
                {item.summary && (
                  <ul className="summary">
                    {item.summary.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                )}
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

function scaled(value: number | null | undefined, share: number): number | null {
  return value === null || value === undefined ? null : value * share;
}

// Direct-impact rows for the NUTS2 regions of one country: a placeholder split of the country value.
function nuts2Rows(codes: string[], base: number, scenario: number | null) {
  return nuts2Shares(codes)
    .map((s, i) => ({
      name: codes[i],
      base: base * s,
      scenario: scenario === null ? null : scenario * s,
      delta: scenario === null ? null : (scenario - base) * s,
    }))
    .sort((a, b) => b.base - a.base);
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
  const sign = draft.change > 0 ? '+' : draft.change < 0 ? '−' : '';
  return (
    <div className="intervention">
      <div className="intervention-head">
        <span className="field-label">Intervention {index + 1}</span>
        <button className="remove" onClick={onRemove}>Remove</button>
      </div>
      <Field label="Type">
        <select value={draft.kind} onChange={(e) => onChange({ kind: e.target.value as InterventionKind })}>
          <option value="final">Final demand</option>
          <option value="tech">Technology change</option>
        </select>
      </Field>
      <select
        aria-label="Product"
        value={draft.productId}
        onChange={(e) => onChange({ productId: Number(e.target.value) })}
      >
        {catalog.products.map((p) => <option key={p.global_id} value={p.global_id}>{p.name}</option>)}
      </select>
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
      <label className="field">
        <span className="field-label">
          {draft.kind === 'tech' ? 'Technology change' : 'Final demand change'}: {sign}{Math.abs(draft.change)}%
        </span>
        <input
          type="range"
          min={-CHANGE_LIMIT}
          max={CHANGE_LIMIT}
          step={1}
          value={draft.change}
          onChange={(e) => onChange({ change: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="app">{children}</div>;
}
