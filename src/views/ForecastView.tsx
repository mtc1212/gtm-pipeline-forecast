import { Lock } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ViewProps } from '../App'
import { Card, Empty, Kpi, PageHeader, Pill } from '../components/ui'
import { CATEGORY_COLOR } from '../lib/colors'
import { currentQ, fmtDate, quarterProgress, toISO, today } from '../lib/dates'
import { money, num, pct } from '../lib/format'
import { forecast, forecastChanges, repScores } from '../lib/metrics'
import { useStore } from '../lib/store'

export function ForecastView({ openDeal }: ViewProps) {
  const { state, dispatch, deals, reps, target, baseline, lastCall, repName } = useStore()
  const f = forecast(deals, state.settings)
  const t = quarterProgress()
  const gap = target - f.commitTotal
  const remaining = Math.max(0, target - f.closed)
  const coverage = remaining ? f.openInQuarter / remaining : Infinity
  const changes = forecastChanges(deals, baseline)
  const scores = repScores(reps, deals, state.settings)
  const filtered = state.filters.ownerId !== 'all' || state.filters.segment !== 'all'

  const history = [
    ...state.history.filter((h) => h.week !== toISO(today)),
    { week: toISO(today), closed: f.closed, commit: f.commitTotal, bestCase: f.bestCaseTotal },
  ].map((h) => ({ ...h, label: fmtDate(h.week), target }))

  const bar = (v: number) => `${Math.min(100, (v / Math.max(target, f.bestCaseTotal + f.pipeline)) * 100)}%`
  const scale = Math.max(target, f.bestCaseTotal + f.pipeline)

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${currentQ.label} Forecast`}
        description="Rep-submitted forecast categories rolled up against target, cross-checked with a stage-weighted model. Edit any deal and every number here recalculates."
        action={
          <button className="btn" onClick={() => dispatch({ type: 'lockCall' })} title="Snapshot today's forecast as the new baseline for week-over-week changes">
            <Lock size={14} /> Lock this week's call
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Target" value={money(target)} hint={`${reps.length} reps`} />
        <Kpi label="Closed Won" value={money(f.closed)} hint={`${pct(f.closed / target)} of target`} tone="good" />
        <Kpi label="Commit" value={money(f.commitTotal)} hint={`${pct(f.commitTotal / target)} · Δ ${money(f.commitTotal - lastCall.commitTotal)} WoW`} />
        <Kpi label="Best Case" value={money(f.bestCaseTotal)} hint={`${pct(f.bestCaseTotal / target)} of target`} />
        <Kpi label="Weighted (model)" value={money(f.weighted)} hint={`${pct(f.weighted / target)} · stage probabilities`} />
        <Kpi label="Gap to target" value={gap > 0 ? money(gap) : 'Covered'} hint="Target − Commit" tone={gap > 0 ? 'bad' : 'good'} />
        <Kpi label="Coverage" value={`${num(coverage)}×`} hint={`Open pipe ÷ remaining (goal ${state.settings.coverageTarget}×)`} tone={coverage >= state.settings.coverageTarget ? 'good' : coverage >= 2 ? 'warn' : 'bad'} />
      </div>

      <Card title="Path to target" subtitle={`Quarter is ${pct(t.pct)} elapsed — the marker shows where linear pacing says Closed Won should be today.`}>
        <div className="relative h-10 w-full overflow-hidden rounded-lg bg-slate-100">
          <div className="absolute inset-0 flex">
            {[
              ['Closed', f.closed],
              ['Commit', f.commit],
              ['Best Case', f.bestCase],
              ['Pipeline', f.pipeline],
            ].map(([k, v]) => (
              <div key={k as string} className="h-10" style={{ width: bar(v as number), background: CATEGORY_COLOR[k as keyof typeof CATEGORY_COLOR] }} title={`${k}: ${money(v as number)}`} />
            ))}
          </div>
          <div className="absolute inset-y-0 w-0.5 bg-slate-900" style={{ left: `${(target / scale) * 100}%` }} />
          <div className="absolute inset-y-0 w-0.5 border-l-2 border-dashed border-emerald-700" style={{ left: `${((target * t.pct) / scale) * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
          {(['Closed', 'Commit', 'Best Case', 'Pipeline'] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[k] }} />{k} {money(k === 'Closed' ? f.closed : k === 'Commit' ? f.commit : k === 'Best Case' ? f.bestCase : f.pipeline)}</span>
          ))}
          <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-slate-900" />Target {money(target)}</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 border-l-2 border-dashed border-emerald-700" />Pacing {money(target * t.pct)}</span>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Forecast trend" subtitle={filtered ? 'Weekly calls for the filtered team (prior weeks are team-level estimates).' : 'Weekly forecast calls this quarter — is the commit converging on target?'}>
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={history} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => money(v)} tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v) => money(Number(v), false)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="closed" name="Closed Won" fill="#a7f3d0" stroke="#059669" />
                <Line dataKey="commit" name="Commit" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                <Line dataKey="bestCase" name="Best Case" stroke="#818cf8" strokeDasharray="5 3" dot={false} />
                <Line dataKey="target" name="Target" stroke="#0f172a" dot={false} strokeWidth={1} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-2" title="Leadership call" subtitle="Rep roll-up vs. model vs. your judgment.">
          <div className="space-y-3 text-sm">
            <CallRow label="Rep roll-up (Commit)" value={f.commitTotal} target={target} />
            <CallRow label="Stage-weighted model" value={f.weighted} target={target} />
            <CallRow label="Best Case" value={f.bestCaseTotal} target={target} />
            <div className="border-t border-slate-100 pt-3">
              <label className="label mb-1 block">My call to Finance</label>
              <div className="flex items-center gap-2">
                <input
                  className="input"
                  type="number"
                  step={10000}
                  placeholder={`e.g. ${(Math.round((f.commitTotal + f.weighted) / 2 / 10000) * 10000).toLocaleString('en-US')}`}
                  value={state.myCall ?? ''}
                  onChange={(e) => dispatch({ type: 'setMyCall', value: e.target.value ? Number(e.target.value) : null })}
                />
                {state.myCall !== null && <Pill cls="bg-slate-100 text-slate-700">{pct(state.myCall / target)}</Pill>}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {Math.abs(f.commitTotal - f.weighted) / target > 0.08
                  ? `Rep commit and the model differ by ${money(Math.abs(f.commitTotal - f.weighted))} — ${f.commitTotal > f.weighted ? 'reps look optimistic; inspect commits lacking an economic buyer' : 'reps may be sandbagging; inspect late-stage Best Case deals'}.`
                  : 'Rep commit and the model agree within 8% of target — a good signal of forecast quality.'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Forecast by rep" subtitle="Closed, commit and best case vs. quota.">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr><th className="pb-2 font-medium">Rep</th><th className="pb-2 text-right font-medium">Quota</th><th className="pb-2 text-right font-medium">Closed</th><th className="pb-2 text-right font-medium">Commit</th><th className="pb-2 text-right font-medium">Best</th><th className="w-28 pb-2 pl-3 font-medium">Commit %</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scores.map((s) => (
                <tr key={s.rep.id}>
                  <td className="py-2"><div className="font-medium text-slate-800">{s.rep.name}</div><div className="text-xs text-slate-500">{s.rep.segment}</div></td>
                  <td className="py-2 text-right tabular-nums">{money(s.rep.quota)}</td>
                  <td className="py-2 text-right tabular-nums">{money(s.closed)}</td>
                  <td className="py-2 text-right tabular-nums">{money(s.commitTotal)}</td>
                  <td className="py-2 text-right tabular-nums">{money(s.bestCaseTotal)}</td>
                  <td className="py-2 pl-3"><div className="flex items-center gap-2"><div className="flex-1"><div className="h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${s.projected >= 1 ? 'bg-emerald-500' : s.projected >= 0.8 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${Math.min(100, s.projected * 100)}%` }} /></div></div><span className="w-9 text-right text-xs tabular-nums">{pct(s.projected)}</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="What changed since last call" subtitle={`Movement in the current-quarter forecast since ${fmtDate(state.baselineDate)}. Commit moved ${money(f.commitTotal - lastCall.commitTotal)}.`}>
          {changes.length === 0 ? (
            <Empty>No changes since the last locked call. Try dragging a deal on the Pipeline board.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {changes.slice(0, 8).map((c) => (
                <li key={c.id} className="flex cursor-pointer items-center gap-3 py-2 text-sm hover:bg-slate-50" onClick={() => openDeal(c.id)}>
                  <Pill cls={c.delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}>{c.kind}</Pill>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-500">{repName(c.ownerId)} · {c.detail}</div>
                  </div>
                  <span className={`tabular-nums ${c.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{c.delta >= 0 ? '+' : ''}{money(c.delta)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function CallRow({ label, value, target }: { label: string; value: number; target: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="tabular-nums"><b>{money(value)}</b> <span className="text-xs text-slate-500">({pct(value / target)})</span></span>
    </div>
  )
}
