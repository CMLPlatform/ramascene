import type { ReactNode } from 'react';
import { chartGeometry } from './trend';
import { formatValue } from './format';
import type { LegendItem, StackRow } from './stacks';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="stat">
      <span className="stat-value tabular">{value}</span>
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
export function RankList({ title, rows }: { title: string; rows: RankedRow[] }) {
  return (
    <div className="rank">
      <span className="bars-title">{title}</span>
      {rows.map((row, i) => (
        <div className={`rank-row${row.highlight ? ' selected' : ''}`} key={row.label}>
          <span className="rank-name" title={row.label}>{i + 1}. {row.label}</span>
          <span className="tabular">{formatValue(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function StackedBars({ title, rows, legend }: { title: string; rows: StackRow[]; legend: LegendItem[] }) {
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
                  title={`${s.label}: ${formatValue(s.value)}`}
                  style={{ flex: `${s.value} 1 0`, background: s.color }}
                />
              ))}
            </div>
          </div>
          <span className="bar-value tabular">{formatValue(row.total)}</span>
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
}: {
  title: string;
  years: number[];
  base: (number | null)[];
  scenario: (number | null)[] | null;
}) {
  const hasData = base.some((v) => v !== null);
  const geometry = hasData ? chartGeometry(years, base, scenario) : null;
  return (
    <div className="chart-card">
      <span className="field-label">{title}</span>
      {geometry ? (
        <svg viewBox="0 0 260 130" width="100%" role="img" aria-label="Footprint over time, baseline and scenario">
          <line x1="20" y1="110" x2="250" y2="110" stroke="var(--border-strong)" strokeWidth="1" />
          <polyline points={geometry.base} fill="none" stroke="var(--bar)" strokeWidth="2" strokeDasharray="4 3" />
          {geometry.scenario && <polyline points={geometry.scenario} fill="none" stroke="var(--primary)" strokeWidth="2.5" />}
          {geometry.labels.map((l) => (
            <text key={l.year} x={l.x} y="124" fontSize="10" fill="var(--muted)" textAnchor="middle">{l.year}</text>
          ))}
        </svg>
      ) : (
        <p className="muted small">Run an analysis to see the trend.</p>
      )}
      <div className="legend">
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
