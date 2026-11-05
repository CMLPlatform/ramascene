import type { ReactNode } from 'react';
import { chartGeometry, SMALL_CHART, type ChartSize } from './trend';
import { exactQuantity, formatQuantity, quantityParts } from './units';
import type { LegendItem, StackRow } from './stacks';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  title,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  title?: string;
  sub: string;
}) {
  return (
    <div className="stat">
      <span className="stat-value tabular" title={title}>
        {value}
        {unit && <span className="stat-unit"> {unit}</span>}
      </span>
      <span className="stat-label">{label}</span>
      <span className="stat-sub">{sub}</span>
    </div>
  );
}

export interface RankedRow {
  label: string;
  value: number;
  highlight: boolean;
}

// Numbered top-N list; the selected sector or region is highlighted.
export function RankList({ title, rows, unit }: { title: string; rows: RankedRow[]; unit: string }) {
  return (
    <div className="rank">
      <span className="bars-title">{title}</span>
      {rows.map((row, i) => (
        <div className={`rank-row${row.highlight ? ' selected' : ''}`} key={row.label}>
          <span className="rank-name" title={row.label}>{i + 1}. {row.label}</span>
          <span className="tabular" title={exactQuantity(row.value, unit)}>{formatQuantity(row.value, unit)}</span>
        </div>
      ))}
    </div>
  );
}

export function StackedBars({ title, rows, legend, unit }: { title: string; rows: StackRow[]; legend: LegendItem[]; unit: string }) {
  const max = Math.max(...rows.map((r) => r.total), 0);
  return (
    <div className="bars">
      <span className="bars-title">{title}</span>
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span className="bar-name" title={row.label}>{row.label}</span>
          <div className="bar-track stack-track">
            <div className="stack" style={{ width: `${max ? (row.total / max) * 100 : 0}%` }}>
              {row.segments.map((s) => (
                <div
                  key={s.label}
                  title={`${s.label}: ${formatQuantity(s.value, unit)}`}
                  style={{ flex: `${s.value} 1 0`, background: s.color }}
                />
              ))}
            </div>
          </div>
          <span className="bar-value tabular" title={exactQuantity(row.total, unit)}>{formatQuantity(row.total, unit)}</span>
        </div>
      ))}
      <div className="legend">
        {legend.map((item) => (
          <span key={item.label} title={item.label}>
            <span className="swatch" style={{ background: item.color }} />{item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({
  title,
  years,
  base,
  scenario,
  unit,
  size = SMALL_CHART,
}: {
  title: string;
  years: number[];
  base: (number | null)[];
  scenario: (number | null)[] | null;
  unit: string;
  size?: ChartSize;
}) {
  const hasData = base.some((v) => v !== null);
  const geometry = hasData ? chartGeometry(years, base, scenario, size) : null;
  const shown = [...base, ...(scenario ?? [])].filter((v): v is number => v !== null);
  const lo = Math.min(...shown);
  const hi = Math.max(...shown);
  const summary = geometry
    ? `Footprint from ${years[0]} to ${years[years.length - 1]}, between ${formatQuantity(lo, unit)} and ${formatQuantity(hi, unit)}.`
    : '';
  return (
    <div className="chart-card">
      <span className="field-label">{title}</span>
      {geometry ? (
        <svg viewBox={`0 0 ${size.width} ${size.height}`} width="100%" role="img" aria-label={`${summary} Baseline dashed${scenario ? ', scenario solid' : ''}.`}>
          <line x1="20" y1={size.height - 20} x2={size.width - 10} y2={size.height - 20} stroke="var(--border-strong)" strokeWidth="1" />
          <polyline points={geometry.base} fill="none" stroke="var(--bar)" strokeWidth="2" strokeDasharray="4 3" />
          {geometry.scenario && <polyline points={geometry.scenario} fill="none" stroke="var(--primary)" strokeWidth="2.5" />}
          <text x="2" y="18" fontSize="9" fill="var(--muted)">{quantityParts(hi, unit).number}</text>
          {lo !== hi && <text x="2" y={size.height - 22} fontSize="9" fill="var(--muted)">{quantityParts(lo, unit).number}</text>}
          {geometry.labels.map((l) => (
            <text key={l.year} x={l.x} y={size.height - 6} fontSize="10" fill="var(--muted)" textAnchor="middle">{l.year}</text>
          ))}
        </svg>
      ) : (
        <p className="muted small">Run an analysis to see the trend.</p>
      )}
      <div className="legend">
        {geometry && <span>Scale: {quantityParts(hi, unit).unit}</span>}
        <span><span className="swatch dash" />Baseline</span>
        <span><span className="swatch line" />Scenario</span>
      </div>
    </div>
  );
}

export function ConsentBanner({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <section className="consent" role="region" aria-label="Analytics consent">
      <span className="consent-text">
        We use analytics (Google Analytics) to understand how the tool is used. You can accept or decline.
      </span>
      <button className="consent-accept" onClick={onAccept}>Accept</button>
      <button className="consent-decline" onClick={onDecline}>Decline</button>
    </section>
  );
}
