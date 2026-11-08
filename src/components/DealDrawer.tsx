import { Activity, X } from 'lucide-react'
import { daysSince, fmtDate } from '../lib/dates'
import { money } from '../lib/format'
import { hygieneIssues, nextBestActions } from '../lib/metrics'
import { useStore } from '../lib/store'
import { ALL_STAGES, CATEGORIES, type Deal } from '../lib/types'
import { SeverityBadge, StageBadge } from './ui'

export function DealDrawer({ dealId, onClose }: { dealId: string | null; onClose: () => void }) {
  const { state, dispatch, repName } = useStore()
  const deal = state.deals.find((d) => d.id === dealId)
  if (!deal) return null
  const update = (patch: Partial<Deal>) => dispatch({ type: 'updateDeal', id: deal.id, patch })
  const issues = hygieneIssues(deal, state.settings)
  const actions = nextBestActions([deal], state.settings)
  const prob = state.settings.stageProbabilities[deal.stage]

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={onClose}>
      <aside className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <div className="text-xs text-slate-500">{deal.id} · {deal.industry} · {deal.country}</div>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900">{deal.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <StageBadge stage={deal.stage} />
              <span>{money(deal.amount, false)}</span>
              <span className="text-slate-400">·</span>
              <span>Weighted {money(deal.amount * prob)}</span>
            </div>
          </div>
          <button className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 p-5">
          {(issues.length > 0 || actions.length > 0) && (
            <div className="space-y-2">
              {issues.map((i) => (
                <div key={i.rule} className="flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  <SeverityBadge sev={i.severity} /> {i.message}
                </div>
              ))}
              {actions.slice(0, 3).map((a) => (
                <div key={a.action} className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                  <span className="font-medium">Next best action:</span> {a.action}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <select className="input" value={deal.stage} onChange={(e) => update({ stage: e.target.value as Deal['stage'] })}>
                {ALL_STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Forecast category">
              <select className="input" value={deal.forecastCategory} onChange={(e) => update({ forecastCategory: e.target.value as Deal['forecastCategory'] })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Amount (ACV, USD)">
              <input className="input" type="number" step={5000} min={0} value={deal.amount} onChange={(e) => update({ amount: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Close date">
              <input className="input" type="date" value={deal.closeDate} onChange={(e) => e.target.value && update({ closeDate: e.target.value })} />
            </Field>
            <Field label="Owner">
              <select className="input" value={deal.ownerId} onChange={(e) => update({ ownerId: e.target.value })}>
                {state.reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Product">
              <select className="input" value={deal.product} onChange={(e) => update({ product: e.target.value as Deal['product'] })}>
                {['Devin', 'Windsurf', 'Devin + Windsurf'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Next step" className="col-span-2">
              <input className="input" value={deal.nextStep} placeholder="e.g. POC readout with CTO" onChange={(e) => update({ nextStep: e.target.value })} />
            </Field>
            <Field label="Next step date">
              <input className="input" type="date" value={deal.nextStepDate ?? ''} onChange={(e) => update({ nextStepDate: e.target.value || null })} />
            </Field>
            {deal.stage === 'Closed Lost' && (
              <Field label="Lost reason">
                <input className="input" value={deal.lostReason ?? ''} onChange={(e) => update({ lostReason: e.target.value })} />
              </Field>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={deal.champion} onChange={(e) => update({ champion: e.target.checked })} /> Champion identified</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={deal.economicBuyer} onChange={(e) => update({ economicBuyer: e.target.checked })} /> Economic buyer engaged</label>
          </div>

          <Field label="Notes">
            <textarea className="input min-h-20" value={deal.notes ?? ''} onChange={(e) => update({ notes: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            <Meta k="Owner" v={repName(deal.ownerId)} />
            <Meta k="Segment" v={deal.segment} />
            <Meta k="Type" v={deal.type} />
            <Meta k="Source" v={deal.source} />
            <Meta k="Created" v={fmtDate(deal.createdDate)} />
            <Meta k="In stage since" v={`${fmtDate(deal.stageEnteredDate)} (${daysSince(deal.stageEnteredDate)}d)`} />
            <Meta k="Last activity" v={`${fmtDate(deal.lastActivityDate)} (${daysSince(deal.lastActivityDate)}d ago)`} />
            <Meta k="Times pushed" v={String(deal.pushCount)} />
          </div>

          <button className="btn-primary w-full justify-center" onClick={() => dispatch({ type: 'logActivity', id: deal.id })}>
            <Activity size={16} /> Log activity today
          </button>
        </div>
      </aside>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      {children}
    </label>
  )
}

const Meta = ({ k, v }: { k: string; v: string }) => (
  <div>
    <div className="text-xs text-slate-500">{k}</div>
    <div className="font-medium text-slate-800">{v}</div>
  </div>
)
