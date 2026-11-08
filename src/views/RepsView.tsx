import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, PageHeader, Pill } from '../components/ui'
import { money, num, pct } from '../lib/format'
import { repScores } from '../lib/metrics'
import { useStore } from '../lib/store'

export function RepsView() {
  const { state, deals, reps } = useStore()
  const scores = repScores(reps, deals, state.settings)
  const chart = scores.map((s) => ({
    name: s.rep.name.split(' ')[0],
    Closed: s.closed / s.rep.quota,
    Commit: (s.commitTotal - s.closed) / s.rep.quota,
    'Best Case': (s.bestCaseTotal - s.commitTotal) / s.rep.quota,
  }))

  const flag = (s: (typeof scores)[number]) => {
    if (s.coverage < 2 && s.projected < 1) return { cls: 'bg-rose-100 text-rose-700', text: 'Needs pipeline' }
    if (s.hygiene < 0.6) return { cls: 'bg-amber-100 text-amber-800', text: 'Coach on hygiene' }
    if (s.projected >= 1) return { cls: 'bg-emerald-100 text-emerald-700', text: 'On track' }
    return { cls: 'bg-slate-100 text-slate-700', text: 'Monitor' }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Rep Scorecard" description="Attainment, pipeline health and efficiency per rep — the inputs for 1:1 coaching, territory and capacity planning. Win rate and cycle time use the trailing two quarters." />
      <Card title="Attainment vs. quota" subtitle="Stacked % of quota: Closed → Commit → Best Case. The line is 100%.">
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => pct(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => pct(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={1} stroke="#0f172a" />
              <Bar dataKey="Closed" stackId="a" fill="#059669" />
              <Bar dataKey="Commit" stackId="a" fill="#4f46e5" />
              <Bar dataKey="Best Case" stackId="a" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>{['Rep', 'Quota', 'Attainment', 'Projected (Commit)', 'Coverage', 'Win rate', 'Avg deal', 'Cycle', 'Next-Q pipe', 'Hygiene', 'Stale', 'Signal'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {scores.map((s) => {
              const f = flag(s)
              return (
                <tr key={s.rep.id}>
                  <td className="px-3 py-2.5"><div className="font-medium text-slate-800">{s.rep.name}</div><div className="text-xs text-slate-500">{s.rep.territory}{s.rep.rampedPct < 1 ? ` · ${pct(s.rep.rampedPct)} ramped` : ''}</div></td>
                  <td className="px-3 py-2.5 tabular-nums">{money(s.rep.quota)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{pct(s.attainment)}</td>
                  <td className={`px-3 py-2.5 tabular-nums font-medium ${s.projected >= 1 ? 'text-emerald-600' : s.projected >= 0.8 ? 'text-amber-600' : 'text-rose-600'}`}>{pct(s.projected)}</td>
                  <td className={`px-3 py-2.5 tabular-nums ${s.coverage >= state.settings.coverageTarget ? 'text-emerald-600' : s.coverage < 2 ? 'text-rose-600' : ''}`}>{Number.isFinite(s.coverage) ? `${num(s.coverage)}×` : '—'}</td>
                  <td className="px-3 py-2.5 tabular-nums">{pct(s.winRate)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{money(s.avgDeal)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{Math.round(s.cycleDays)}d</td>
                  <td className="px-3 py-2.5 tabular-nums">{money(s.nextQPipeline)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{pct(s.hygiene)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{s.staleCount}</td>
                  <td className="px-3 py-2.5"><Pill cls={f.cls}>{f.text}</Pill></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
