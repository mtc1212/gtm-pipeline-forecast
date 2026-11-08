import { useState } from 'react'
import type { ViewProps } from '../App'
import { Card, Empty, Kpi, PageHeader, SeverityBadge, StageBadge } from '../components/ui'
import { money, pct } from '../lib/format'
import { HYGIENE_RULES, hygieneIssues, hygieneScore, isOpen, repScores } from '../lib/metrics'
import { useStore } from '../lib/store'

export function HygieneView({ openDeal }: ViewProps) {
  const { state, deals, reps, repName } = useStore()
  const [rule, setRule] = useState<string | null>(null)
  const open = deals.filter(isOpen)
  const rows = open.flatMap((d) => hygieneIssues(d, state.settings).map((i) => ({ deal: d, ...i })))
  const flaggedDeals = new Set(rows.map((r) => r.deal.id))
  const atRisk = open.filter((d) => flaggedDeals.has(d.id)).reduce((s, d) => s + d.amount, 0)
  const score = hygieneScore(deals, state.settings)
  const byRule = HYGIENE_RULES.map((r) => ({ rule: r, items: rows.filter((x) => x.rule === r) }))
  const sevRank = { high: 0, medium: 1, low: 2 }
  const shown = rows.filter((r) => !rule || r.rule === rule).sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.deal.amount - a.deal.amount)
  const scores = repScores(reps, deals, state.settings)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pipeline Hygiene"
        description="Automated data-quality checks that run on every open opportunity. Clean data is the foundation of a trustworthy forecast — fix an issue in the deal drawer and it disappears from this list."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Hygiene score" value={pct(score)} hint="% of open deals with zero issues" tone={score >= 0.8 ? 'good' : score >= 0.6 ? 'warn' : 'bad'} />
        <Kpi label="Deals flagged" value={`${flaggedDeals.size} / ${open.length}`} hint="Open opportunities" />
        <Kpi label="Pipeline at risk" value={money(atRisk)} hint="Value of flagged deals" tone="warn" />
        <Kpi label="High-severity issues" value={rows.filter((r) => r.severity === 'high').length} hint="Forecast-impacting" tone="bad" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card title="Issues by rule" subtitle="Click a rule to filter.">
          <ul className="space-y-1">
            {byRule.map(({ rule: r, items }) => (
              <li key={r}>
                <button className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${rule === r ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`} onClick={() => setRule(rule === r ? null : r)}>
                  <span>{r}</span>
                  <span className="tabular-nums text-slate-500">{items.length}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="label mb-2">Hygiene by rep</div>
            {scores.map((s) => (
              <div key={s.rep.id} className="flex items-center gap-2 py-1 text-sm">
                <span className="w-32 truncate">{s.rep.name}</span>
                <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${s.hygiene >= 0.8 ? 'bg-emerald-500' : s.hygiene >= 0.6 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${s.hygiene * 100}%` }} /></div>
                <span className="w-10 text-right tabular-nums text-xs">{pct(s.hygiene)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-2" title={rule ?? 'All issues'} subtitle={`${shown.length} issue${shown.length === 1 ? '' : 's'} — sorted by severity, then deal size.`}>
          {shown.length === 0 ? (
            <Empty>No issues — nice and clean.</Empty>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                  <tr><th className="pb-2 font-medium">Severity</th><th className="pb-2 font-medium">Deal</th><th className="pb-2 font-medium">Issue</th><th className="pb-2 text-right font-medium">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map((r) => (
                    <tr key={r.deal.id + r.rule} className="cursor-pointer hover:bg-slate-50" onClick={() => openDeal(r.deal.id)}>
                      <td className="py-2"><SeverityBadge sev={r.severity} /></td>
                      <td className="py-2"><div className="font-medium text-slate-800">{r.deal.account}</div><div className="flex items-center gap-1.5 text-xs text-slate-500">{repName(r.deal.ownerId)} · <StageBadge stage={r.deal.stage} /></div></td>
                      <td className="py-2"><div>{r.rule}</div><div className="text-xs text-slate-500">{r.message}</div></td>
                      <td className="py-2 text-right tabular-nums">{money(r.deal.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
