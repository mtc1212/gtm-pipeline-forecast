import { Card, Kpi, PageHeader, Pill } from '../components/ui'
import { daysUntil, fmtDate } from '../lib/dates'
import { money, pct } from '../lib/format'
import { renewalHealth, RISK_RETENTION } from '../lib/metrics'
import { useStore } from '../lib/store'

const RISK_CLS = { Healthy: 'bg-emerald-100 text-emerald-700', Watch: 'bg-amber-100 text-amber-800', 'At Risk': 'bg-rose-100 text-rose-700' }

export function RenewalsView() {
  const { renewals, repName } = useStore()
  const rows = renewals.map((r) => ({ r, h: renewalHealth(r), days: daysUntil(r.renewalDate) })).sort((a, b) => a.days - b.days)
  const next90 = rows.filter((x) => x.days <= 90)
  const arr90 = next90.reduce((s, x) => s + x.r.arr, 0)
  const atRisk = rows.filter((x) => x.h.risk === 'At Risk')
  const expected = rows.reduce((s, x) => s + x.r.arr * RISK_RETENTION[x.h.risk], 0)
  const total = rows.reduce((s, x) => s + x.r.arr, 0)
  const expansion = rows.filter((x) => x.r.expansionSignal)

  return (
    <div className="space-y-5">
      <PageHeader title="Renewals" description="Renewal book for the next 180 days with a health score built from seat utilization, executive sponsorship, support escalations and NPS. Expected GRR applies a retention assumption per risk tier (Healthy 100%, Watch 90%, At Risk 60%)." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="ARR renewing ≤ 90 days" value={money(arr90)} hint={`${next90.length} accounts`} />
        <Kpi label="ARR at risk" value={money(atRisk.reduce((s, x) => s + x.r.arr, 0))} hint={`${atRisk.length} accounts`} tone="bad" />
        <Kpi label="Expected GRR" value={pct(expected / total, 1)} hint={`${money(expected)} of ${money(total)}`} tone={expected / total >= 0.9 ? 'good' : 'warn'} />
        <Kpi label="Expansion signals" value={expansion.length} hint={money(expansion.reduce((s, x) => s + x.r.arr, 0)) + ' ARR over-utilized'} tone="good" />
      </div>
      <Card title="Renewal book" subtitle="Sorted by renewal date.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>{['Account', 'Owner', 'Product', 'ARR', 'Renews', 'Seat utilization', 'Health', 'Drivers'].map((h) => <th key={h} className="pb-2 pr-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ r, h, days }) => (
                <tr key={r.id}>
                  <td className="py-2.5 pr-3"><div className="font-medium text-slate-800">{r.account}</div><div className="text-xs text-slate-500">{r.industry} · {r.country}</div></td>
                  <td className="py-2.5 pr-3">{repName(r.ownerId)}</td>
                  <td className="py-2.5 pr-3">{r.product}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{money(r.arr)}</td>
                  <td className={`py-2.5 pr-3 ${days < 0 ? 'font-medium text-rose-600' : days <= 30 ? 'font-medium text-amber-600' : ''}`}>{fmtDate(r.renewalDate)}<div className="text-xs text-slate-500">{days < 0 ? `${-days}d overdue` : `in ${days}d`}</div></td>
                  <td className="w-40 py-2.5 pr-3">
                    <div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${h.utilization >= 0.8 ? 'bg-emerald-500' : h.utilization >= 0.5 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${Math.min(100, h.utilization * 100)}%` }} /></div><span className="w-10 text-right text-xs tabular-nums">{pct(h.utilization)}</span></div>
                    <div className="text-xs text-slate-500">{r.seatsActive}/{r.seatsPurchased} seats</div>
                  </td>
                  <td className="py-2.5 pr-3"><Pill cls={RISK_CLS[h.risk]}>{h.risk} · {h.score}</Pill></td>
                  <td className="py-2.5 text-xs text-slate-600">{h.reasons.join(' · ') || 'No risk signals'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
