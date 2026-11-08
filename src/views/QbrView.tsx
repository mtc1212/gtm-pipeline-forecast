import { Printer } from 'lucide-react'
import { Card, PageHeader } from '../components/ui'
import { currentQ, inQuarter, nextQ, prevQ, quarterProgress } from '../lib/dates'
import { money, num, pct } from '../lib/format'
import { forecast, hygieneScore, isLost, isOpen, isWon, nextBestActions, renewalHealth, repScores } from '../lib/metrics'
import { useStore } from '../lib/store'
import type { Deal } from '../lib/types'

const sum = (ds: Deal[]) => ds.reduce((s, d) => s + d.amount, 0)

export function QbrView() {
  const { state, deals, reps, renewals, target, repName } = useStore()
  const s = state.settings
  const f = forecast(deals, s)
  const t = quarterProgress()
  const scores = repScores(reps, deals, s)
  const wonQ = deals.filter((d) => isWon(d) && inQuarter(d.closeDate, currentQ))
  const lostQ = deals.filter((d) => isLost(d) && inQuarter(d.closeDate, currentQ))
  const prevWon = deals.filter((d) => isWon(d) && inQuarter(d.closeDate, prevQ))
  const prevLost = deals.filter((d) => isLost(d) && inQuarter(d.closeDate, prevQ))
  const winRate = (w: Deal[], l: Deal[]) => (w.length + l.length ? w.length / (w.length + l.length) : 0)
  const nextPipe = deals.filter((d) => isOpen(d) && inQuarter(d.closeDate, nextQ))
  const nextTarget = target * 1.15
  const nextGoal = Math.max(1, s.coverageTarget - 1)
  const topDeals = deals.filter((d) => isOpen(d) && inQuarter(d.closeDate, currentQ)).sort((a, b) => b.amount - a.amount).slice(0, 5)
  const actions = nextBestActions(deals, s)
  const atRiskRenewals = renewals.filter((r) => renewalHealth(r).risk === 'At Risk')
  const lostReasons = Object.entries(
    [...lostQ, ...prevLost].reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.lostReason ?? 'Unknown']: (acc[d.lostReason ?? 'Unknown'] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1])
  const bySource = Object.entries(
    deals.filter((d) => isOpen(d) || (isWon(d) && inQuarter(d.closeDate, currentQ))).reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.source]: (acc[d.source] ?? 0) + d.amount }), {}),
  ).sort((a, b) => b[1] - a[1])
  const totalSource = bySource.reduce((a, [, v]) => a + v, 0)
  const best = [...scores].sort((a, b) => b.projected - a.projected)[0]
  const behind = scores.filter((x) => x.projected < 0.8)

  const highlights = [
    `Closed ${money(f.closed)} (${pct(f.closed / target)} of target) with ${t.remaining} days left; quarter is ${pct(t.pct)} elapsed.`,
    `Commit stands at ${money(f.commitTotal)} (${pct(f.commitTotal / target)}); stage-weighted model says ${money(f.weighted)} (${pct(f.weighted / target)}).`,
    best ? `${best.rep.name} leads the team at ${pct(best.projected)} of quota on commit.` : '',
    `Win rate ${pct(winRate(wonQ, lostQ))} this quarter vs ${pct(winRate(prevWon, prevLost))} last quarter.`,
  ].filter(Boolean)

  const risks = [
    f.commitTotal < target ? `Commit gap of ${money(target - f.commitTotal)} — needs ${money(target - f.commitTotal)} upgraded from ${money(f.bestCase)} Best Case.` : '',
    behind.length ? `${behind.map((b) => b.rep.name).join(', ')} below 80% projected attainment.` : '',
    `Pipeline hygiene at ${pct(hygieneScore(deals, s))}; ${actions.filter((a) => a.playbook === 'Executive').length} commit/late-stage deals lack an economic buyer.`,
    atRiskRenewals.length ? `${atRiskRenewals.length} renewal${atRiskRenewals.length === 1 ? '' : 's'} at risk (${money(atRiskRenewals.reduce((a, r) => a + r.arr, 0))} ARR).` : '',
    sum(nextPipe) / nextTarget < nextGoal ? `${nextQ.label} coverage only ${num(sum(nextPipe) / nextTarget)}× against an assumed ${money(nextTarget)} target (+15% QoQ); goal is ${nextGoal}× this early.` : '',
  ].filter(Boolean)

  const asks = [
    'Exec sponsorship on the top 5 commit deals without an economic buyer.',
    `Pipeline generation sprint: ${money(Math.max(0, nextTarget * nextGoal - sum(nextPipe)))} of new ${nextQ.label} pipeline needed to reach ${nextGoal}× coverage — Marketing + Advisor program.`,
    atRiskRenewals.length ? 'CS-led adoption plan for low-utilization renewal accounts.' : 'Maintain renewal cadence; push expansion on over-utilized accounts.',
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title={`QBR Snapshot — Brazil ${currentQ.label}`}
        description="Auto-generated from live CRM data. Every sentence below recalculates when deals change. Use Print to export a one-pager."
        action={<button className="btn print:hidden" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Target', money(target)],
          ['Closed', money(f.closed)],
          ['Commit', money(f.commitTotal)],
          ['Win rate (2Q)', pct(winRate([...wonQ, ...prevWon], [...lostQ, ...prevLost]))],
          [`${nextQ.label} pipe`, money(sum(nextPipe))],
        ].map(([k, v]) => (
          <div key={k} className="card px-4 py-3"><div className="label">{k}</div><div className="mt-1 text-xl font-semibold tabular-nums">{v}</div></div>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Card title="Highlights"><Bullets items={highlights} color="bg-emerald-500" /></Card>
        <Card title="Risks"><Bullets items={risks} color="bg-rose-500" /></Card>
        <Card title="Asks & next steps"><Bullets items={asks} color="bg-indigo-500" /></Card>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Top 5 deals to close this quarter">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {topDeals.map((d) => (
                <tr key={d.id}><td className="py-1.5"><div className="font-medium">{d.account}</div><div className="text-xs text-slate-500">{repName(d.ownerId)} · {d.stage} · {d.forecastCategory}</div></td><td className="py-1.5 text-right tabular-nums">{money(d.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Pipeline mix & loss analysis">
          <div className="label mb-1">Pipeline by source</div>
          {bySource.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 py-0.5 text-sm"><span className="w-20">{k}</span><div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${(v / totalSource) * 100}%` }} /></div><span className="w-12 text-right text-xs tabular-nums">{pct(v / totalSource)}</span></div>
          ))}
          <div className="label mb-1 mt-3">Top loss reasons (2Q)</div>
          {lostReasons.slice(0, 4).map(([k, v]) => <div key={k} className="flex justify-between py-0.5 text-sm"><span>{k}</span><span className="tabular-nums text-slate-500">{v}</span></div>)}
        </Card>
      </div>
    </div>
  )
}

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <ul className="space-y-2 text-sm text-slate-700">
      {items.map((i) => <li key={i} className="flex gap-2"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />{i}</li>)}
    </ul>
  )
}
