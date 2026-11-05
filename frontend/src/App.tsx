import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchCatalog, isAbortError, pollJob, startJob, type Catalog, type Intervention, type JobRequest, type JobResult, type Selection } from './api';
import { ConsentBanner, Field, RankList, Stat, StackedBars, TrendChart } from './components';
import { loadConsent, saveConsent, type Consent } from './consent';
import { deltaText, percent, percentChange, sortedEntries, tone } from './format';
import { exactQuantity, formatQuantity, quantityParts } from './units';
import { nuts2Regions, nuts2Share, nuts2Shares } from './nuts2';
import { buildPresets } from './presets';
import { loadPrecalculated } from './precalculated';
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
import About from './About';
import PanelToggle from './PanelToggle';
import { loadPanels, savePanels, type PanelState } from './panels';

const DEFAULT_COUNTRY = 'Netherlands';
const DEFAULT_YEAR = 2011;
const TOP_N = 5;
const DIRECT_ROWS = 10; // rows of the direct-impact table shown before "Show all"
const TASK_LABELS: Record<string, string> = {
  footprintCountry: 'Consumption footprint in country',
  footprintAll: 'Consumption footprint, all regions',
  produced: 'Production footprint, all regions',
  direct: 'Direct impacts, all regions',
  contributions: 'Contributing sectors',
  topSectors: 'Top sectors, all regions',
  topRegions: 'Top regions, all sectors',
};
const TREND_LABEL = 'Footprint trend (years)';

interface Results {
  footprintCountry: JobResult; // final demand of the country: what it buys, domestic and imported
  footprintAll: JobResult;
  produced: JobResult; // origins: footprint of each country's output to final demand, at home and abroad
  direct: JobResult;
  contributions: JobResult;
  topSectors: JobResult;
  topRegions: JobResult;
  trend: Record<number, number | null>; // footprint in the country per trend year
}

type QueryKey = Exclude<keyof Results, 'trend'>;

// What a result was calculated for, so the panels keep describing it after the selection changes.
interface ResultContext {
  sector: string;
  country: string;
  year: number;
  unit: string;
}

interface RunOutcome {
  baseline: Results;
  scenario: Results | null;
  years: number[];
  ctx: ResultContext;
  key: string; // the selection (sector, country, indicator, year) the result belongs to
  precalculated: boolean;
}

// Everything a run needs, copied when it starts.
interface RunSpec {
  sectorId: number;
  countryId: number;
  indicatorId: number;
  year: number;
  sectorName: string;
  countryName: string;
  unit: string;
  interventions: Intervention[] | null;
  years: number[];
  allCountries: number[];
  allSectors: number[];
}

// A query's job on the server and, once finished, its result.
interface CacheEntry {
  statusUrl?: string;
  result?: JobResult;
}

interface RunRecord {
  spec: RunSpec;
  cache: Map<string, CacheEntry>;
}

interface QueueItem {
  id: number;
  label: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
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

type Level = 'country' | 'nuts2';

async function cachedQuery(
  record: RunRecord,
  key: string,
  request: JobRequest,
  signal: AbortSignal,
): Promise<JobResult> {
  let entry = record.cache.get(key);
  if (!entry) {
    entry = {};
    record.cache.set(key, entry);
  }
  if (entry.result) return entry.result;
  if (!entry.statusUrl) entry.statusUrl = (await startJob(request, fetch, signal)).status_url;
  const job = await pollJob(entry.statusUrl, { signal });
  if (job.status === 'failed' || !job.result) {
    entry.statusUrl = undefined; // a retry starts a fresh job
    throw new Error('Calculation failed');
  }
  entry.result = job.result;
  return job.result;
}

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
  const [open, setOpen] = useState<PanelState>(() => loadPanels(window.innerWidth));
  const [helpOpen, setHelpOpen] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(() => loadConsent());
  const [page, setPage] = useState<'analysis' | 'about'>(() => (window.location.hash === '#about' ? 'about' : 'analysis'));
  const nextId = useRef(1);
  const controllers = useRef(new Map<number, AbortController>());
  const runs = useRef(new Map<number, RunRecord>());

  useEffect(() => savePanels(open), [open]);

  useEffect(() => {
    const onHash = () => setPage(window.location.hash === '#about' ? 'about' : 'analysis');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    fetchCatalog()
      .then((data) => {
        setCatalog(data);
        const country = data.countries.find((c) => c.name === DEFAULT_COUNTRY) ?? data.countries[0];
        setCountryId(country?.global_id ?? null);
        setSectorId((data.products.find((p) => /^electricity nec/i.test(p.name)) ?? data.products[0])?.global_id ?? null);
        const indicator = data.indicators.find((i) => /GHG/i.test(i.name)) ?? data.indicators[0];
        setIndicatorId(indicator?.global_id ?? null);
        return loadPrecalculated().then((pre) => {
          if (!pre) return;
          const sector = data.products.find((p) => p.name === pre.context.sector);
          const home = data.countries.find((c) => c.name === pre.context.country);
          const pick = data.indicators.find((i) => i.name === pre.context.indicator);
          if (!sector || !home || !pick || !data.years.includes(pre.context.year)) return;
          setSectorId(sector.global_id);
          setCountryId(home.global_id);
          setIndicatorId(pick.global_id);
          setYear(pre.context.year);
          const baselineResults: Results = {
            ...pre.results,
            produced: pre.results.produced ?? { unit: {}, rawResultData: {}, origins: {} },
            trend: Object.fromEntries(Object.entries(pre.results.trend).map(([y, v]) => [Number(y), v])),
          };
          const trendCount = pre.context.years.filter((y) => y !== pre.context.year).length;
          setQueue((existing) =>
            existing.some((item) => item.detail.startsWith('Precalculated')) ? existing : [
            {
              id: newId(),
              label: `${sector.name} · ${home.name} · ${pre.context.year} · precalculated`,
              status: 'completed',
              detail: `Precalculated, generated ${pre.context.generated}`,
              tasks: [
                ...Object.values(TASK_LABELS).map((label) => ({ name: label, done: 1, total: 1, failed: false })),
                ...(trendCount > 0 ? [{ name: TREND_LABEL, done: trendCount, total: trendCount, failed: false }] : []),
              ],
              summary: summarize(baselineResults, null, { countryName: home.name, unit: pick.unit } as RunSpec),
            },
            ...existing,
          ]);
          setOutcome({
            baseline: baselineResults,
            scenario: null,
            years: pre.context.years,
            ctx: { sector: sector.name, country: home.name, year: pre.context.year, unit: pick.unit },
            key: `${sector.global_id}|${home.global_id}|${pick.global_id}|${pre.context.year}`,
            precalculated: true,
          });
        });
      })
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  const names = useMemo(() => {
    const countryName = new Map(catalog?.countries.map((c) => [c.global_id, c.name]) ?? []);
    const productName = new Map(catalog?.products.map((p) => [p.global_id, p.name]) ?? []);
    return { countryName, productName };
  }, [catalog]);

  const selectedUnit = useMemo(() => {
    const indicator = catalog?.indicators.find((i) => i.global_id === indicatorId);
    return indicator?.unit ?? '';
  }, [catalog, indicatorId]);

  const selectedCountry = countryId !== null ? names.countryName.get(countryId) ?? '' : '';
  const selectedSector = sectorId !== null ? names.productName.get(sectorId) ?? '' : '';

  // The panels describe the result on screen, which can differ from the selection after a change.
  const ctx = outcome?.ctx ?? null;
  const shownSector = ctx?.sector ?? selectedSector;
  const shownCountry = ctx?.country ?? selectedCountry;
  const shownYear = ctx?.year ?? year;
  const unit = ctx?.unit ?? selectedUnit;
  const stale = outcome !== null && outcome.key !== `${sectorId}|${countryId}|${indicatorId}|${year}`;

  // NUTS2 view: a placeholder split of the country total until regional data is loaded.
  const regionNames = new Map(Object.values(catalog?.nuts2 ?? {}).flat().map((r) => [r.code, r.name]));
  const regionLabel = (code: string) => (regionNames.has(code) ? `${code} ${regionNames.get(code)}` : code);
  const controlRegions = nuts2Regions(catalog?.nuts2, selectedCountry);
  const controlCodes = controlRegions.map((r) => r.code);
  const controlCode = nuts2Code && controlCodes.includes(nuts2Code) ? nuts2Code : controlCodes[0] ?? null;
  const codes = nuts2Regions(catalog?.nuts2, shownCountry).map((r) => r.code);
  const useNuts2 = level === 'nuts2' && codes.length > 0;
  const selectedCode = nuts2Code && codes.includes(nuts2Code) ? nuts2Code : codes[0] ?? null;
  const share = useNuts2 && selectedCode ? nuts2Share(codes, selectedCode) : 1;
  const unitName = useNuts2 && selectedCode ? regionLabel(selectedCode) : shownCountry;

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

  // Runs the analysis queries of one set; with interventions they use the scenario ("model") action.
  // Queries that already finished, or were already started on the server, are not started again,
  // which is what lets a stopped run resume.
  async function runSet(
    record: RunRecord,
    setKey: 'base' | 'scen',
    taskName: (label: string) => string,
    onTask: (name: string, failed?: boolean) => void,
    signal: AbortSignal,
  ): Promise<Results> {
    const { spec } = record;
    const common = { extn: [spec.indicatorId], year: [String(spec.year)] };
    const one = { ...common, nodesSec: [spec.sectorId] };
    const everySector = { ...common, nodesSec: spec.allSectors };
    const requests: Record<QueryKey, Selection> = {
      footprintCountry: { ...one, dimType: 'Contribution', vizType: 'Geographic', nodesReg: [spec.countryId] },
      footprintAll: { ...one, dimType: 'Contribution', vizType: 'Geographic', nodesReg: spec.allCountries },
      produced: { ...one, dimType: 'Contribution', vizType: 'Sectoral', nodesReg: spec.allCountries },
      direct: { ...one, dimType: 'Hotspot', vizType: 'Geographic', nodesReg: spec.allCountries },
      contributions: { ...one, dimType: 'Contribution', vizType: 'Sectoral', nodesReg: [spec.countryId] },
      topSectors: { ...everySector, dimType: 'Contribution', vizType: 'Sectoral', nodesReg: spec.allCountries },
      topRegions: { ...everySector, dimType: 'Contribution', vizType: 'Geographic', nodesReg: spec.allCountries },
    };
    const action = spec.interventions ? 'model' : 'default';
    const model_details = spec.interventions ?? undefined;

    const main = Promise.all(
      (Object.entries(requests) as [QueryKey, Selection][]).map(async ([key, selection]) => {
        const name = taskName(TASK_LABELS[key]);
        try {
          const result = await cachedQuery(record, `${setKey}:${key}`, { action, querySelection: selection, model_details }, signal);
          onTask(name);
          return [key, result] as const;
        } catch (error) {
          if (!isAbortError(error)) onTask(name, true);
          throw error;
        }
      }),
    );
    // The trend is secondary: a failed year leaves a gap instead of failing the run.
    const trend = Promise.all(
      spec.years
        .filter((y) => y !== spec.year)
        .map(async (y) => {
          try {
            const result = await cachedQuery(
              record,
              `${setKey}:trend:${y}`,
              { action, querySelection: { ...requests.footprintCountry, year: [String(y)] }, model_details },
              signal,
            );
            onTask(taskName(TREND_LABEL));
            return [y, result.rawResultData[spec.countryName] ?? null] as const;
          } catch (error) {
            if (isAbortError(error)) throw error;
            onTask(taskName(TREND_LABEL));
            return [y, null] as const;
          }
        }),
    );
    const [settled, trendEntries] = await Promise.all([main, trend]);
    const collected: Partial<Results> = {};
    for (const [key, result] of settled) collected[key] = result;
    collected.trend = Object.fromEntries(trendEntries);
    collected.trend[spec.year] = collected.footprintCountry?.rawResultData[spec.countryName] ?? null;
    return collected as Results;
  }

  // Short result lines for a queue entry.
  function summarize(base: Results, scen: Results | null, spec: RunSpec): string[] {
    const own = base.footprintCountry.rawResultData[spec.countryName] ?? 0;
    const all = sortedEntries(base.footprintAll.rawResultData);
    const global = all.reduce((sum, [, value]) => sum + value, 0);
    const position = all.findIndex(([name]) => name === spec.countryName) + 1;
    const made = base.produced?.origins?.[spec.countryName];
    const lines = [
      `Consumption footprint in ${spec.countryName}: ${formatQuantity(own, spec.unit)}`,
      `${percent(own, global)} of global${position > 0 ? ` · rank #${position}` : ''}`,
    ];
    if (made !== undefined) lines.push(`Production footprint: ${formatQuantity(made, spec.unit)}`);
    const top = sortedEntries((scen ?? base).contributions.rawResultData)[0];
    if (top) lines.push(`Top supplying sector: ${top[0]}`);
    if (scen) {
      const changed = scen.footprintCountry.rawResultData[spec.countryName] ?? 0;
      lines.push(`Scenario: ${formatQuantity(changed, spec.unit)} (${percentChange(own, changed)})`);
    }
    return lines;
  }

  // Starts, or resumes, the run in the record. Progress and results go to its queue entry.
  async function execute(runId: number, record: RunRecord) {
    const { spec } = record;
    const trendCount = spec.years.filter((y) => y !== spec.year).length;
    const nameFor = (prefix: string | null) => (label: string) => (prefix ? `${prefix}: ${label}` : label);
    const baselineName = nameFor(spec.interventions ? 'Baseline' : null);
    const scenarioName = nameFor('Scenario');
    const setTasks = (name: (label: string) => string): TaskState[] => [
      ...Object.values(TASK_LABELS).map((label) => ({ name: name(label), done: 0, total: 1, failed: false })),
      ...(trendCount > 0 ? [{ name: name(TREND_LABEL), done: 0, total: trendCount, failed: false }] : []),
    ];
    const controller = new AbortController();
    controllers.current.set(runId, controller);
    setBusy(true);
    setRunError(null);
    setQueueItem(runId, {
      status: 'running',
      detail: 'Started',
      summary: undefined,
      tasks: [...setTasks(baselineName), ...(spec.interventions ? setTasks(scenarioName) : [])],
    });
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
        runSet(record, 'base', baselineName, onTask, controller.signal),
        spec.interventions ? runSet(record, 'scen', scenarioName, onTask, controller.signal) : Promise.resolve(null),
      ]);
      setOutcome({
        baseline,
        scenario,
        years: spec.years,
        ctx: { sector: spec.sectorName, country: spec.countryName, year: spec.year, unit: spec.unit },
        key: `${spec.sectorId}|${spec.countryId}|${spec.indicatorId}|${spec.year}`,
        precalculated: false,
      });
      setQueueItem(runId, { summary: summarize(baseline, scenario, spec), status: 'completed', detail: `Finished ${new Date().toLocaleTimeString()}` });
    } catch (error) {
      controller.abort(); // stop waiting for the queries that are still running
      if (isAbortError(error)) {
        setQueueItem(runId, { status: 'cancelled', detail: 'Stopped. Resume continues with what is left.' });
      } else {
        setRunError((error as Error).message);
        setQueueItem(runId, { status: 'failed', detail: (error as Error).message });
      }
    } finally {
      controllers.current.delete(runId);
      setBusy(controllers.current.size > 0);
    }
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

    // Everything the run needs is copied here, so later changes to the selection do not affect it.
    const spec: RunSpec = {
      sectorId,
      countryId,
      indicatorId,
      year,
      sectorName: selectedSector,
      countryName: selectedCountry,
      unit: selectedUnit,
      interventions,
      years: trendYears(catalog.years, year),
      allCountries: catalog.countries.map((c) => c.global_id),
      allSectors: catalog.products.map((p) => p.global_id),
    };
    const runId = newId();
    runs.current.set(runId, { spec, cache: new Map() });
    setQueue((existing) => [
      {
        id: runId,
        label: `${selectedSector} · ${selectedCountry} · ${year}${interventions ? ' · with scenario' : ''}`,
        status: 'running',
        detail: 'Started',
        tasks: [],
      },
      ...existing,
    ]);
    await execute(runId, runs.current.get(runId)!);
  }

  // Continues a stopped or failed run: finished queries are kept, and jobs the server already
  // started are waited for instead of being started again.
  function resumeRun(id: number) {
    const record = runs.current.get(id);
    if (record && controllers.current.size === 0) void execute(id, record);
  }

  // Stops waiting for a run. The server may still finish calculations it has already started.
  function stopRun(id: number) {
    controllers.current.get(id)?.abort();
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
  const countryFootprint = (r: Results | null) => (r?.footprintCountry.rawResultData[shownCountry] ?? 0) * share;
  const baseFootprint = countryFootprint(baseline);
  const viewFootprint = countryFootprint(view);
  const globalOf = (r: Results | null) =>
    Object.values(r?.footprintAll.rawResultData ?? {}).reduce((sum, value) => sum + value, 0);
  const baseGlobal = globalOf(baseline);
  const viewGlobal = globalOf(view);
  const producedFootprint = (r: Results | null) => {
    const value = r?.produced?.origins?.[shownCountry];
    return value === undefined ? null : value * share;
  };
  const producedRank = (r: Results | null) =>
    r ? sortedEntries(r.produced?.origins ?? {}).findIndex(([name]) => name === shownCountry) + 1 : 0;
  const baseProduced = producedFootprint(baseline);
  const viewProduced = producedFootprint(view);
  const regionCount = view ? Object.keys(view.footprintAll.rawResultData).length : 0;
  const rank = view
    ? sortedEntries(view.footprintAll.rawResultData).findIndex(([name]) => name === shownCountry) + 1
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
      ? nuts2Rows(codes, directBase[shownCountry] ?? 0, directScenario ? directScenario[shownCountry] ?? 0 : null)
      : compareRows(directBase, directScenario)
    : [];
  const highlighted = useNuts2 ? selectedCode : shownCountry;
  // The table shows the largest rows and always the selected one, even when it is further down.
  const rankedRows = directRows.map((row, index) => ({ row, rank: index + 1 }));
  const shownRows = showAllRows
    ? rankedRows
    : [
        ...rankedRows.slice(0, DIRECT_ROWS),
        ...rankedRows.slice(DIRECT_ROWS).filter(({ row }) => row.name === highlighted),
      ];
  const hiddenRows = rankedRows.length - shownRows.length;
  const maxDirect = Math.max(...directRows.map((r) => r.scenario ?? r.base), 0);

  // Trend chart
  const trendBase = outcome ? outcome.years.map((y) => scaled(outcome.baseline.trend[y], share)) : [];
  const trendScenario = outcome?.scenario ? outcome.years.map((y) => scaled(outcome.scenario!.trend[y], share)) : null;

  const presets = buildPresets(catalog, countryId, sectorId);
  const scenarioNote = useNuts2
    ? `NUTS2 view: ${selectedCode ? regionLabel(selectedCode) : ""} values are a placeholder split of ${shownCountry}.`
    : scenario
      ? 'Scenario applied: results show the scenario, with change against the baseline.'
      : `Baseline results for ${shownYear}. Open Scenario modelling on the left and tick "Apply" to see the effect.`;

  return (
    <Shell>
      <header className="topbar">
        <span className="brand"><span className="brand-mark" aria-hidden="true" />RaMa-Scene</span>
        <div className="spacer" />
        <nav className="nav" aria-label="Main">
          <a href="#analysis" aria-current={page === 'analysis' ? 'page' : undefined}>Analysis</a>
          <a href="#about" aria-current={page === 'about' ? 'page' : undefined}>About</a>
          <a href="https://rama-scene.readthedocs.io/en/latest/" target="_blank" rel="noopener noreferrer">Docs</a>
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

      {page === 'about' && <About />}
      <div className="layout" hidden={page === 'about'}>
        <aside className={`side${open.left ? '' : ' collapsed'}`} id="scenario">
          <PanelToggle side="left" open={open.left} label="Scenario modelling" controls="scenario-body"
            onToggle={() => setOpen((p) => ({ ...p, left: !p.left }))} />
          <div className="side-body" id="scenario-body" inert={!open.left}>
            <div className="side-head">
              <h2>Scenario modelling</h2>
            </div>
            <label className="check">
              <input type="checkbox" checked={applyScenario} onChange={(e) => setApplyScenario(e.target.checked)} />
              {' '}Apply scenario to results
            </label>
            <p className="muted small side-note">
              Each intervention changes the model before it runs. Results show the change against the baseline.
            </p>
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
          </div>
        </aside>

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
                  value={controlCode ?? ''}
                  disabled={controlCodes.length === 0}
                  onChange={(e) => setNuts2Code(e.target.value)}
                >
                  {controlCodes.length === 0 && <option value="">None for {selectedCountry}</option>}
                  {controlRegions.map((r) => <option key={r.code} value={r.code}>{r.code} · {r.name}</option>)}
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
            {busy && (
              <button className="stop" onClick={() => [...controllers.current.keys()].forEach(stopRun)}>
                Stop
              </button>
            )}
          </section>

          <p className="scenario-note">{scenarioNote}</p>
          {level === 'nuts2' && controlCodes.length === 0 && (
            <p className="muted small">No NUTS2 regions are available for {selectedCountry}; showing country values.</p>
          )}
          {runError && <p className="error">{runError}</p>}
          {!baseline && !busy && <p className="muted">Choose a sector and run the analysis.</p>}

          {outcome?.precalculated && !stale && (
            <p className="notice" role="status">
              <strong>Precalculated example:</strong> {shownSector} in {shownCountry}, {shownYear}. Choose your own sector,
              country and year, then press Run analysis.
            </p>
          )}
          {stale && (
            <p className="notice" role="status">
              The results below are for {shownSector} in {shownCountry}, {shownYear}. You changed the selection; press
              Run analysis to update them.
            </p>
          )}

          {baseline && view && (
            <div className={`results${stale ? ' stale' : ''}`}>
              <section className="card">
                <h2>1. What are the footprint impacts of {shownSector} in {unitName}?</h2>
                <div className="cards">
                  <Stat
                    label={`Consumption footprint, ${unitName}`}
                    value={quantityParts(viewFootprint, unit).number}
                    unit={quantityParts(viewFootprint, unit).unit}
                    title={exactQuantity(viewFootprint, unit)}
                    sub={scenario ? `${deltaText(baseFootprint, viewFootprint)} vs baseline` : `What ${unitName} buys: domestic + imports`}
                  />
                  {viewProduced !== null && (
                    <Stat
                      label={`Production footprint, ${unitName}`}
                      value={quantityParts(viewProduced, unit).number}
                      unit={quantityParts(viewProduced, unit).unit}
                      title={exactQuantity(viewProduced, unit)}
                      sub={scenario && baseProduced !== null
                        ? `${deltaText(baseProduced, viewProduced)} vs baseline`
                        : `What ${unitName} delivers: domestic + exports`}
                    />
                  )}
                  <Stat
                    label={`Global footprint of ${shownSector}`}
                    value={quantityParts(viewGlobal, unit).number}
                    unit={quantityParts(viewGlobal, unit).unit}
                    title={exactQuantity(viewGlobal, unit)}
                    sub={scenario ? `${deltaText(baseGlobal, viewGlobal)} vs baseline` : 'Sum over all regions'}
                  />
                  <Stat
                    label="Share of global footprint"
                    value={percent(viewFootprint, viewGlobal)}
                    sub={viewProduced !== null
                      ? `Consumption · production side: ${percent(viewProduced, viewGlobal)}`
                      : `${unitName} as share of global`}
                  />
                  <Stat
                    label="Rank among regions"
                    value={useNuts2 ? '—' : rank > 0 ? `#${rank}` : '—'}
                    unit={!useNuts2 && rank > 0 ? `of ${regionCount}` : undefined}
                    sub={useNuts2
                      ? 'Rank shown at country level'
                      : `Consumption, 1 is highest${!useNuts2 && producedRank(view) > 0 ? ` · production side: #${producedRank(view)}` : ''}`}
                  />
                </div>
                <p className="muted small definition">
                  Both footprints count the greenhouse gases (or the chosen indicator) emitted anywhere in the world along
                  the supply chain of the final demand for {shownSector}. Final demand covers all categories (households,
                  government, investment) and is counted by where the product is made and where it is bought.{' '}
                  <strong>Consumption</strong>: what {unitName} itself buys, wherever it is made.{' '}
                  <strong>Production</strong>: what {shownSector} made in {unitName} delivers to final demand, at home and abroad.
                  Both add up to the same global total.
                </p>
                <div className="split">
                  <RankList
                    title="Top sectors, global footprint"
                    unit={unit}
                    rows={topSectors.map(([label, value]) => ({ label, value, highlight: label === shownSector }))}
                  />
                  <RankList
                    title="Top regions, global footprint (all sectors)"
                    unit={unit}
                    rows={topRegions.map(([label, value]) => ({ label, value, highlight: label === shownCountry }))}
                  />
                </div>
              </section>

              <section className="card">
                <h2>2. How did the footprint of {shownSector} in {unitName} evolve through time?</h2>
                <TrendChart
                  title={`Consumption footprint in ${unitName}`}
                  unit={unit}
                  years={outcome?.years ?? []}
                  base={trendBase}
                  scenario={trendScenario}
                  size={{ width: 720, height: 220 }}
                />
              </section>

              <section className="card">
                <h2>3. What is the contribution of other sectors to {shownSector} in {shownCountry}, and where are they located?</h2>
                {stacks ? (
                  <div className="split">
                    <StackedBars title="Top contributing sectors (stacks by country)" rows={stacks.sectors} legend={stacks.countryLegend} unit={unit} />
                    <StackedBars title="Top contributing countries (stacks by sector)" rows={stacks.countries} legend={stacks.sectorLegend} unit={unit} />
                  </div>
                ) : (
                  <p className="muted small">The server returned no supply-chain breakdown.</p>
                )}
              </section>

              <section className="card">
                <h2>
                  {useNuts2
                    ? `4. What are the direct impacts of ${shownSector} in each NUTS2 region of ${shownCountry}?`
                    : `4. What are the direct impacts of ${shownSector} in each region?`}
                </h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{useNuts2 ? 'NUTS2 region' : 'Region'}</th>
                      <th>Share of direct impact</th>
                      <th className="right">Value</th>
                      {scenario && <th className="right">Change vs baseline</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map(({ row, rank: rowRank }) => {
                      const value = row.scenario ?? row.base;
                      const selected = row.name === highlighted;
                      return (
                        <tr key={row.name} className={selected ? 'selected' : undefined}>
                          <td><span className="muted">{rowRank}.</span> {useNuts2 ? regionLabel(row.name) : row.name}{selected ? '  ← selected' : ''}</td>
                          <td>
                            <div className="bar-track"><div className="bar-fill" style={{ width: `${maxDirect ? (value / maxDirect) * 100 : 0}%` }} /></div>
                          </td>
                          <td className="right tabular" title={exactQuantity(value, unit)}>{formatQuantity(value, unit)}</td>
                          {row.scenario !== null && (
                            <td className={`right tabular delta-${tone(row.base, row.scenario)}`}>
                              {deltaText(row.base, row.scenario)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rankedRows.length > DIRECT_ROWS && (
                  <button className="ghost small show-all" onClick={() => setShowAllRows(!showAllRows)}>
                    {showAllRows ? `Show top ${DIRECT_ROWS} only` : `Show all ${rankedRows.length} (${hiddenRows} more)`}
                  </button>
                )}
              </section>
            </div>
          )}

          <p className="footnote">
            Source: EXIOBASE 3.3, RaMa-Scene dataset v4. NUTS2 values are a placeholder split of the country total until
            regional EXIOBASE data is loaded. Changes compare the scenario with the baseline and show only when the scenario is applied.
            Values are shown in the most readable unit for their size{unit ? ` (indicator unit: ${quantityParts(1, unit).unit || unit})` : ''}; hover a value for the exact number.
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

        <aside className={`side${open.right ? '' : ' collapsed'}`} id="queue">
          <PanelToggle side="right" open={open.right} label="Analysis queue" controls="queue-body"
            onToggle={() => setOpen((p) => ({ ...p, right: !p.right }))} />
          <div className="side-body" id="queue-body" inert={!open.right}>
            <div className="side-head">
              <h2>Analysis queue</h2>
            </div>
            {queue.length === 0 && <p className="muted small">No analyses yet.</p>}
            {queue.map((item) => (
              <div className="job" key={item.id}>
                <div className="job-head">
                  <span className="job-name">{item.label}</span>
                  <span className={`status ${item.status}`}>{item.status}</span>
                  {item.status === 'running' && (
                    <button
                      className="stop small"
                      aria-label={`Stop ${item.label}`}
                      title="Stop this analysis"
                      onClick={() => stopRun(item.id)}
                    >
                      Stop
                    </button>
                  )}
                  {(item.status === 'cancelled' || item.status === 'failed') && runs.current.has(item.id) && (
                    <button
                      className="resume small"
                      aria-label={`${item.status === 'cancelled' ? 'Resume' : 'Retry'} ${item.label}`}
                      title="Continue with the queries that are not finished"
                      disabled={busy}
                      onClick={() => resumeRun(item.id)}
                    >
                      {item.status === 'cancelled' ? 'Resume' : 'Retry'}
                    </button>
                  )}
                  {queue.length > 1 && item.status !== 'running' && (
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
          </div>
        </aside>
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
