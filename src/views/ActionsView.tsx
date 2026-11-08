import { Check } from 'lucide-react'
import { useState } from 'react'
import type { ViewProps } from '../App'
import { Card, Empty, PageHeader, Pill, StageBadge } from '../components/ui'
import { money } from '../lib/format'
import { nextBestActions, type NextBestAction } from '../lib/metrics'
import { useStore } from '../lib/store'

const PLAYBOOK_CLS: Record<NextBestAction['playbook'], string> = {
  Executive: 'bg-rose-100 text-rose-700',
  'Re-engage': 'bg-amber-100 text-amber-800',
  'Multi-thread': 'bg-violet-100 text-violet-700',
  Accelerate: 'bg-emerald-100 text-emerald-700',
  'Update CRM': 'bg-sky-100 text-sky-700',
  Qualify: 'bg-slate-100 text-slate-700',
}

export function ActionsView({ openDeal }: ViewProps) {
  const { state, dispatch, deals, reps, repName } = useStore()
  const [groupByRep, setGroupByRep] = useState(false)
  const actions = nextBestActions(deals, state.settings)
  const top = actions.slice(0, 25)

  const done = (a: NextBestAction) => dispatch({ type: 'logActivity', id: a.deal.id, nextStep: a.action })

  const list = (items: NextBestAction[]) =>
    items.length === 0 ? <Empty>No recommended actions.</Empty> : (
      <ul className="divide-y divide-slate-100">
        {items.map((a, i) => (
          <li key={a.deal.id + a.action} className="flex items-start gap-3 py-3">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{i + 1}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{a.action}</span>
                <Pill cls={PLAYBOOK_CLS[a.playbook]}>{a.playbook}</Pill>
              </div>
              <div className="mt-0.5 text-sm text-slate-600">{a.why}</div>
              <button className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600" onClick={() => openDeal(a.deal.id)}>
                <span className="font-medium">{a.deal.account}</span> · {money(a.deal.amount)} · <StageBadge stage={a.deal.stage} /> · {repName(a.deal.ownerId)}
              </button>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Priority</div>
              <div className="font-semibold tabular-nums text-slate-700">{a.priority}</div>
              <button className="btn mt-1 px-2 py-1 text-xs" onClick={() => done(a)} title="Logs an activity and sets this as the deal's next step"><Check size={12} /> Done</button>
            </div>
          </li>
        ))}
      </ul>
    )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Next Best Actions"
        description="A rule-based engine that turns pipeline signals into a prioritized to-do list. Priority = rule weight × deal size × close-date urgency. Marking an action done logs activity on the deal, which clears related hygiene flags."
        action={<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={groupByRep} onChange={(e) => setGroupByRep(e.target.checked)} /> Group by rep</label>}
      />
      {groupByRep ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {reps.map((r) => {
            const mine = actions.filter((a) => a.deal.ownerId === r.id).slice(0, 5)
            return <Card key={r.id} title={r.name} subtitle={`Top ${mine.length} of ${actions.filter((a) => a.deal.ownerId === r.id).length} actions`}>{list(mine)}</Card>
          })}
        </div>
      ) : (
        <Card title={`Top ${top.length} actions across the team`} subtitle={`${actions.length} total recommendations`}>{list(top)}</Card>
      )}
    </div>
  )
}
