import { Card, PageHeader } from '../components/ui'
import { useStore } from '../lib/store'
import { OPEN_STAGES } from '../lib/types'

export function SettingsView() {
  const { state, dispatch } = useStore()
  const s = state.settings
  const set = (patch: Partial<typeof s>) => dispatch({ type: 'updateSettings', settings: patch })

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title="Settings & Methodology" description="The assumptions behind every number. Change them and the whole app recalculates — useful for testing how sensitive the forecast is to the model." />
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Stage model" subtitle="Win probability drives the weighted forecast; benchmark days drive the 'stuck in stage' rule (flagged at 1.5×).">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="pb-2 font-medium">Stage</th><th className="pb-2 font-medium">Win probability</th><th className="pb-2 font-medium">Benchmark days</th></tr></thead>
            <tbody>
              {OPEN_STAGES.map((st) => (
                <tr key={st}>
                  <td className="py-1.5 font-medium">{st}</td>
                  <td className="py-1.5 pr-3"><div className="flex items-center gap-2"><input type="range" min={0} max={100} step={5} value={Math.round(s.stageProbabilities[st] * 100)} onChange={(e) => set({ stageProbabilities: { ...s.stageProbabilities, [st]: Number(e.target.value) / 100 } })} className="flex-1 accent-indigo-600" /><span className="w-10 text-right tabular-nums">{Math.round(s.stageProbabilities[st] * 100)}%</span></div></td>
                  <td className="py-1.5"><input className="input w-20" type="number" min={1} value={s.stageBenchmarkDays[st]} onChange={(e) => set({ stageBenchmarkDays: { ...s.stageBenchmarkDays, [st]: Number(e.target.value) || 1 } })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Thresholds">
          <div className="space-y-4 text-sm">
            <label className="block"><span className="label mb-1 block">Stale after (days without activity)</span><input className="input w-28" type="number" min={1} value={s.staleDays} onChange={(e) => set({ staleDays: Number(e.target.value) || 1 })} /></label>
            <label className="block"><span className="label mb-1 block">Pipeline coverage goal (×)</span><input className="input w-28" type="number" min={1} step={0.5} value={s.coverageTarget} onChange={(e) => set({ coverageTarget: Number(e.target.value) || 1 })} /></label>
          </div>
        </Card>
      </div>
      <Card title="Definitions">
        <dl className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
          {[
            ['Closed Won', 'Deals marked Closed Won with a close date in the current quarter.'],
            ['Commit', 'Closed Won + open deals the rep has categorized as Commit (≥90% confidence) closing this quarter.'],
            ['Best Case', 'Commit + open deals categorized as Best Case — the realistic upside.'],
            ['Weighted (model)', 'Closed Won + Σ(open amount × stage win probability). An independent check on rep judgment.'],
            ['Coverage', 'Open pipeline closing this quarter ÷ remaining target (target − closed). Goal is typically 3×.'],
            ['Gap to target', 'Target − Commit. What must be upgraded from Best Case or Pipeline.'],
            ['Hygiene score', 'Share of open opportunities that pass all data-quality rules.'],
            ['Forecast changes', 'Diff of every deal vs. the last locked weekly call: new, won, lost, pushed, pulled-in, up/downgraded, re-sized.'],
            ['Renewal health', '100 minus penalties for low utilization, no exec sponsor, escalations and detractor NPS.'],
            ['Lead → MQL → SQL → Opportunity', 'Lead: any new contact. MQL: fits the ICP and showed intent. SQL: first meeting held. Opportunity: qualified deal in the CRM.'],
            ['Pipeline plan', 'Next-quarter target × coverage goal − pipeline already open, converted to opps and leads with trailing 6-month rates.'],
            ['Stage conversion', 'For closed deals: share that advanced from each stage to the next (won deals reached every stage; lost deals record the stage they were lost at).'],
            ['Buying committee coverage', 'Key roles engaged on the account: economic buyer, champion, technical evaluator, security / IT and procurement.'],
            ['Next best action priority', 'Rule weight × deal size ($100k units) × urgency (past due 2×, ≤14 days 1.6×, this quarter 1.2×).'],
          ].map(([k, v]) => (
            <div key={k}><dt className="font-medium text-slate-900">{k}</dt><dd className="text-slate-600">{v}</dd></div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
