import { useState } from 'react'
import type { ViewProps } from '../App'
import { Card, Kpi, PageHeader, StageBadge } from '../components/ui'
import { currentQ, daysBetween, fmtDate, inQuarter, parse, prevQ } from '../lib/dates'
import { money, pct } from '../lib/format'
import { isLost, isWon, stageConversion } from '../lib/metrics'
import { useStore } from '../lib/store'
import type { Deal } from '../lib/types'

const PERIODS = {
  both: { label: 'Last 2 quarters', qs: [prevQ, currentQ] },
  last: { label: prevQ.label, qs: [prevQ] },
  this: { label: `${currentQ.label} to date`, qs: [currentQ] },
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0)
const groupBy = (ds: Deal[], key: (d: Deal) => string) => {
  const m = new Map<string, Deal[]>()
  for (const d of ds) m.set(key(d), [...(m.get(key(d)) ?? []), d])
  return [...m.entries()]
}
const cycle = (d: Deal) => daysBetween(parse(d.createdDate), parse(d.closeDate))

export function WinLossView({ openDeal }: ViewProps) {
  const { deals, repName } = useStore()
  const [period, setPeriod] = useState<keyof typeof PERIODS>('both')
  const DIMS: Record<string, (d: Deal) => string> = {
    Source: (d) => d.source,
    Industry: (d) => d.industry,
    Segment: (d) => d.segment,
    Product: (d) => d.product,
    'Deal type': (d) => d.type,
    Rep: (d) => repName(d.ownerId),
  }
  const [dim, setDim] = useState('Source')

  const closed = deals.filter((d) => (isWon(d) || isLost(d)) && PERIODS[period].qs.some((q) => inQuarter(d.closeDate, q)))
  const won = closed.filter(isWon)
  const lost = closed.filter(isLost)
  const conv = stageConversion(closed)
  const steps = conv.slice(0, -1).map((c, i) => ({ from: c.stage, to: conv[i + 1].stage, rate: c.reached ? conv[i + 1].reached / c.reached : 0 }))
  const leak = [...steps].sort((a, b) => a.rate - b.rate)[0]

  const reasons = groupBy(lost, (d) => d.lostReason ?? 'Unknown')
    .map(([reason, ds]) => ({ reason, count: ds.length, amount: sum(ds.map((d) => d.amount)) }))
    .sort((a, b) => b.amount - a.amount)
  const maxReason = Math.max(1, ...reasons.map((r) => r.amount))

  const groups = groupBy(closed, DIMS[dim])
    .map(([key, ds]) => {
      const w = ds.filter(isWon)
      return { key, won: w.length, lost: ds.length - w.length, rate: w.length / ds.length, wonAmount: sum(w.map((d) => d.amount)), avgDeal: avg(w.map((d) => d.amount)) }
    })
    .sort((a, b) => b.rate - a.rate || b.wonAmount - a.wonAmount)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Win / Loss & Stage Conversion"
        description="Where deals are won, where they leak, and why they are lost. Use it to fix the sales process, sharpen the ICP and set realistic stage probabilities."
        action={
          <div className="flex gap-2">
            {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => (
              <button key={k} className={`rounded-full px-3 py-1 text-sm ${period === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`} onClick={() => setPeriod(k)}>{PERIODS[k].label}</button>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Win rate (count)" value={pct(closed.length ? won.length / closed.length : 0)} hint={`${won.length} won · ${lost.length} lost`} />
        <Kpi label="Win rate ($)" value={pct(sum(closed.map((d) => d.amount)) ? sum(won.map((d) => d.amount)) / sum(closed.map((d) => d.amount)) : 0)} hint="Won $ ÷ closed $" />
        <Kpi label="Avg won deal" value={money(avg(won.map((d) => d.amount)))} hint={`Avg lost ${money(avg(lost.map((d) => d.amount)))}`} />
        <Kpi label="Cycle — won" value={`${Math.round(avg(won.map(cycle)))}d`} hint="Created → closed" />
        <Kpi label="Cycle — lost" value={`${Math.round(avg(lost.map(cycle)))}d`} hint="Long losses waste capacity" tone="warn" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Stage conversion" subtitle="Closed deals by the furthest stage they reached.">
          <div className="space-y-3">
            {conv.map((c, i) => (
              <div key={c.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <StageBadge stage={c.stage} />
                  <span className="tabular-nums text-slate-600"><b className="text-slate-900">{c.reached}</b> reached{c.lostHere ? ` · ${c.lostHere} lost here` : ''}</span>
                </div>
                <div className="h-5 rounded bg-slate-100"><div className={`h-5 rounded ${c.stage === 'Closed Won' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${conv[0].reached ? (c.reached / conv[0].reached) * 100 : 0}%` }} /></div>
                {i < steps.length && (
                  <div className={`pt-1 text-center text-xs ${steps[i] === leak ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>↓ {pct(steps[i].rate)} advance{steps[i] === leak ? ' — biggest leak' : ''}</div>
                )}
              </div>
            ))}
          </div>
          {leak && (
            <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
              Biggest drop-off is <b>{leak.from} → {leak.to}</b> ({pct(leak.rate)}). Inspect exit criteria for {leak.from} and qualify harder before investing more time.
            </p>
          )}
        </Card>

        <Card title="Loss reasons" subtitle="Lost deals in the period, by value.">
          <div className="space-y-3">
            {reasons.map((r) => (
              <div key={r.reason}>
                <div className="mb-1 flex justify-between text-sm"><span>{r.reason}</span><span className="tabular-nums text-slate-600">{r.count} · <b className="text-slate-900">{money(r.amount)}</b></span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-rose-400" style={{ width: `${(r.amount / maxReason) * 100}%` }} /></div>
              </div>
            ))}
            {!reasons.length && <p className="text-sm text-slate-500">No losses in this period.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title="Win rate by"
          subtitle="Which customers and motions win most often. Feeds ICP and territory decisions."
          action={
            <select className="input w-auto" value={dim} onChange={(e) => setDim(e.target.value)}>
              {Object.keys(DIMS).map((k) => <option key={k}>{k}</option>)}
            </select>
          }
        >
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="pb-2 font-medium">{dim}</th><th className="pb-2 font-medium">Won / Lost</th><th className="pb-2 font-medium">Win rate</th><th className="pb-2 text-right font-medium">Won $</th><th className="pb-2 text-right font-medium">Avg deal</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((g) => (
                <tr key={g.key}>
                  <td className="py-2 font-medium text-slate-800">{g.key}</td>
                  <td className="py-2 tabular-nums">{g.won} / {g.lost}</td>
                  <td className="py-2"><div className="flex items-center gap-2"><div className="h-1.5 w-16 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${g.rate * 100}%` }} /></div><span className="tabular-nums">{pct(g.rate)}</span></div></td>
                  <td className="py-2 text-right tabular-nums">{money(g.wonAmount)}</td>
                  <td className="py-2 text-right tabular-nums">{g.won ? money(g.avgDeal) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-400">Small samples: treat groups with fewer than 5 closed deals as directional.</p>
        </Card>

        <Card title="Recently closed" subtitle="Click a deal to open it.">
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {[...closed].sort((a, b) => b.closeDate.localeCompare(a.closeDate)).map((d) => (
                  <tr key={d.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDeal(d.id)}>
                    <td className="py-2"><div className="font-medium text-slate-800">{d.account}</div><div className="text-xs text-slate-500">{repName(d.ownerId)} · {d.source}{isLost(d) ? ` · ${d.lostReason} (at ${d.lostAtStage ?? 'Discovery'})` : ''}</div></td>
                    <td className="py-2 pl-2"><StageBadge stage={d.stage} /></td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right text-xs text-slate-500">{fmtDate(d.closeDate)}</td>
                    <td className="py-2 pl-3 pr-1 text-right tabular-nums">{money(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
