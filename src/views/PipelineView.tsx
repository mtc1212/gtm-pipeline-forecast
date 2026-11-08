import { AlertTriangle, LayoutGrid, Plus, Table } from 'lucide-react'
import { useState } from 'react'
import type { ViewProps } from '../App'
import { CategoryBadge, PageHeader, StageBadge } from '../components/ui'
import { addDays, currentQ, daysSince, fmtDate, inQuarter, nextQ, today, toISO } from '../lib/dates'
import { money } from '../lib/format'
import { hygieneIssues, isOpen } from '../lib/metrics'
import { useStore } from '../lib/store'
import { ALL_STAGES, type Deal, type Stage } from '../lib/types'

type Period = 'current' | 'next' | 'open' | 'all'

export function PipelineView({ openDeal }: ViewProps) {
  const { state, dispatch, deals, repName, reps } = useStore()
  const [period, setPeriod] = useState<Period>('current')
  const [mode, setMode] = useState<'board' | 'table'>('board')
  const [search, setSearch] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)

  const visible = deals.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    if (period === 'current') return inQuarter(d.closeDate, currentQ) || (isOpen(d) && d.closeDate < toISO(currentQ.start))
    if (period === 'next') return inQuarter(d.closeDate, nextQ)
    if (period === 'open') return isOpen(d)
    return true
  })

  const addDeal = () => {
    const owner = reps[0] ?? state.reps[0]
    const id = `D-${2000 + state.deals.length}`
    const deal: Deal = {
      id, name: 'New Opportunity', account: 'New Account', industry: 'Software', country: 'Brazil', segment: owner.segment,
      ownerId: owner.id, product: 'Devin', type: 'New Logo', source: 'Inbound', amount: 100_000, seats: 150,
      stage: 'Discovery', forecastCategory: 'Pipeline', createdDate: toISO(today), closeDate: toISO(addDays(today, 30)),
      stageEnteredDate: toISO(today), lastActivityDate: toISO(today), nextStep: 'Discovery call', nextStepDate: toISO(addDays(today, 5)),
      champion: false, economicBuyer: false, pushCount: 0,
    }
    dispatch({ type: 'addDeal', deal })
    openDeal(id)
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Drag deals between stages to update them — stage, forecast category and dates follow CRM rules automatically. Click any deal to edit it."
        action={<button className="btn-primary" onClick={addDeal}><Plus size={16} /> New deal</button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([['current', `Closing ${currentQ.label}`], ['next', `Closing ${nextQ.label}`], ['open', 'All open'], ['all', 'All deals']] as const).map(([k, l]) => (
          <button key={k} className={`rounded-full px-3 py-1 text-sm ${period === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`} onClick={() => setPeriod(k)}>{l}</button>
        ))}
        <input className="input ml-auto w-56" placeholder="Search deals…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex rounded-md ring-1 ring-slate-200">
          <button className={`p-1.5 ${mode === 'board' ? 'bg-slate-100' : 'bg-white'}`} onClick={() => setMode('board')} aria-label="Board"><LayoutGrid size={16} /></button>
          <button className={`p-1.5 ${mode === 'table' ? 'bg-slate-100' : 'bg-white'}`} onClick={() => setMode('table')} aria-label="Table"><Table size={16} /></button>
        </div>
      </div>

      {mode === 'board' ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {ALL_STAGES.map((stage) => {
            const col = visible.filter((d) => d.stage === stage).sort((a, b) => b.amount - a.amount)
            const total = col.reduce((s, d) => s + d.amount, 0)
            const weighted = total * state.settings.stageProbabilities[stage]
            return (
              <div
                key={stage}
                className={`flex min-h-64 flex-col rounded-xl p-2 transition ${overStage === stage ? 'bg-indigo-100 ring-2 ring-indigo-300' : 'bg-slate-100'}`}
                onDragOver={(e) => { e.preventDefault(); setOverStage(stage) }}
                onDragLeave={() => setOverStage(null)}
                onDrop={() => {
                  if (dragId) dispatch({ type: 'updateDeal', id: dragId, patch: { stage } })
                  setDragId(null)
                  setOverStage(null)
                }}
              >
                <div className="mb-2 px-1">
                  <div className="flex items-center justify-between">
                    <StageBadge stage={stage} />
                    <span className="text-xs text-slate-500">{col.length}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-slate-800">{money(total)}</div>
                  {isOpen({ stage }) && <div className="text-xs text-slate-500">Weighted {money(weighted)} · {Math.round(state.settings.stageProbabilities[stage] * 100)}%</div>}
                </div>
                <div className="flex flex-col gap-2">
                  {col.map((d) => {
                    const issues = hygieneIssues(d, state.settings)
                    return (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={() => setDragId(d.id)}
                        onClick={() => openDeal(d.id)}
                        className={`cursor-grab rounded-lg border bg-white p-2.5 text-sm shadow-sm hover:border-indigo-300 active:cursor-grabbing ${dragId === d.id ? 'opacity-50' : ''} ${issues.some((i) => i.severity === 'high') ? 'border-rose-200' : 'border-slate-200'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium leading-snug text-slate-800">{d.account}</div>
                          {issues.length > 0 && <span title={issues.map((i) => i.message).join('\n')} className="text-rose-500"><AlertTriangle size={14} /></span>}
                        </div>
                        <div className="text-xs text-slate-500">{d.product}{d.type === 'Expansion' ? ' · Expansion' : ''}</div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="font-semibold tabular-nums">{money(d.amount)}</span>
                          <span className="text-xs text-slate-500">{fmtDate(d.closeDate)}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-xs text-slate-500">{repName(d.ownerId).split(' ')[0]}</span>
                          {isOpen(d) && <CategoryBadge cat={d.forecastCategory} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>{['Deal', 'Owner', 'Stage', 'Category', 'Amount', 'Close', 'Last activity', 'Next step', 'Flags'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.sort((a, b) => b.amount - a.amount).map((d) => {
                const issues = hygieneIssues(d, state.settings)
                return (
                  <tr key={d.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDeal(d.id)}>
                    <td className="px-3 py-2"><div className="font-medium text-slate-800">{d.name}</div><div className="text-xs text-slate-500">{d.industry} · {d.country}</div></td>
                    <td className="px-3 py-2">{repName(d.ownerId)}</td>
                    <td className="px-3 py-2"><StageBadge stage={d.stage} /></td>
                    <td className="px-3 py-2"><CategoryBadge cat={d.forecastCategory} /></td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(d.amount)}</td>
                    <td className="px-3 py-2">{fmtDate(d.closeDate)}</td>
                    <td className="px-3 py-2">{isOpen(d) ? `${daysSince(d.lastActivityDate)}d ago` : '—'}</td>
                    <td className="max-w-56 truncate px-3 py-2 text-slate-600">{d.nextStep || <span className="text-rose-500">Missing</span>}</td>
                    <td className="px-3 py-2">{issues.length > 0 && <span className="text-xs text-rose-600">{issues.length} issue{issues.length > 1 ? 's' : ''}</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
