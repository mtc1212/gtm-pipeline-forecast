import type { ReactNode } from 'react'
import type { Severity } from '../lib/metrics'
import type { ForecastCategory, Stage } from '../lib/types'

export function Card({ title, subtitle, action, children, className = '' }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Kpi({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'good' | 'bad' | 'warn' }) {
  const toneCls = { default: 'text-slate-900', good: 'text-emerald-600', bad: 'text-rose-600', warn: 'text-amber-600' }[tone]
  return (
    <div className="card px-4 py-3">
      <div className="label">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

const STAGE_CLS: Record<Stage, string> = {
  Discovery: 'bg-slate-100 text-slate-700',
  Demo: 'bg-sky-100 text-sky-700',
  POC: 'bg-violet-100 text-violet-700',
  Negotiation: 'bg-amber-100 text-amber-800',
  'Closed Won': 'bg-emerald-100 text-emerald-700',
  'Closed Lost': 'bg-rose-100 text-rose-700',
}
export const StageBadge = ({ stage }: { stage: Stage }) => <Pill cls={STAGE_CLS[stage]}>{stage}</Pill>

const CAT_CLS: Record<ForecastCategory, string> = {
  Closed: 'bg-emerald-100 text-emerald-700',
  Commit: 'bg-indigo-100 text-indigo-700',
  'Best Case': 'bg-indigo-50 text-indigo-500',
  Pipeline: 'bg-slate-100 text-slate-600',
  Omitted: 'bg-rose-50 text-rose-600',
}
export const CategoryBadge = ({ cat }: { cat: ForecastCategory }) => <Pill cls={CAT_CLS[cat]}>{cat}</Pill>

const SEV_CLS: Record<Severity, string> = { high: 'bg-rose-100 text-rose-700', medium: 'bg-amber-100 text-amber-800', low: 'bg-slate-100 text-slate-600' }
export const SeverityBadge = ({ sev }: { sev: Severity }) => <Pill cls={SEV_CLS[sev]}>{sev}</Pill>

export function Pill({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}

export function Bar({ value, max = 1, marker, color = 'bg-indigo-500' }: { value: number; max?: number; marker?: number; color?: string }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="relative h-2 w-full rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${w}%` }} />
      {marker !== undefined && <div className="absolute -top-1 h-4 w-0.5 bg-slate-500" style={{ left: `${Math.min(100, (marker / max) * 100)}%` }} />}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{children}</div>
}

export function PageHeader({ title, description, action }: { title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}
