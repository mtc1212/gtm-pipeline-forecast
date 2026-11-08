import { AlertTriangle, BarChart3, ClipboardList, Columns3, Lightbulb, RefreshCcw, Repeat, Settings2, Users } from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { DealDrawer } from './components/DealDrawer'
import { currentQ } from './lib/dates'
import { hygieneIssues, isOpen, nextBestActions, timeContext } from './lib/metrics'
import { useStore } from './lib/store'
import { ActionsView } from './views/ActionsView'
import { ForecastView } from './views/ForecastView'
import { HygieneView } from './views/HygieneView'
import { PipelineView } from './views/PipelineView'
import { QbrView } from './views/QbrView'
import { RenewalsView } from './views/RenewalsView'
import { RepsView } from './views/RepsView'
import { SettingsView } from './views/SettingsView'

export interface ViewProps {
  openDeal: (id: string) => void
}

const VIEWS: { id: string; label: string; icon: ComponentType<{ size?: number }>; component: ComponentType<ViewProps> }[] = [
  { id: 'forecast', label: 'Forecast', icon: BarChart3, component: ForecastView },
  { id: 'pipeline', label: 'Pipeline', icon: Columns3, component: PipelineView },
  { id: 'hygiene', label: 'Pipeline Hygiene', icon: AlertTriangle, component: HygieneView },
  { id: 'actions', label: 'Next Best Actions', icon: Lightbulb, component: ActionsView },
  { id: 'reps', label: 'Rep Scorecard', icon: Users, component: RepsView },
  { id: 'renewals', label: 'Renewals', icon: Repeat, component: RenewalsView },
  { id: 'qbr', label: 'QBR Summary', icon: ClipboardList, component: QbrView },
  { id: 'settings', label: 'Settings & Method', icon: Settings2, component: SettingsView },
]

const viewFromHash = () => VIEWS.find((v) => `#${v.id}` === window.location.hash)?.id ?? 'forecast'

export default function App() {
  const { state, dispatch, deals } = useStore()
  const [view, setView] = useState(viewFromHash)
  const [openDealId, setOpenDealId] = useState<string | null>(null)
  const t = timeContext()

  useEffect(() => {
    const onHash = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const counts: Record<string, number> = {
    hygiene: deals.filter((d) => isOpen(d) && hygieneIssues(d, state.settings).length > 0).length,
    actions: nextBestActions(deals, state.settings).length,
  }
  const Active = VIEWS.find((v) => v.id === view)!.component

  return (
    <div className="flex h-full">
      <nav className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex print:hidden">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">
            <BarChart3 size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-slate-900">GTM Command Center</div>
            <div className="text-xs text-slate-500">LATAM · {currentQ.label}</div>
          </div>
        </div>
        <ul className="flex-1 space-y-0.5 px-3">
          {VIEWS.map((v) => (
            <li key={v.id}>
              <a
                href={`#${v.id}`}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${view === v.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <v.icon size={16} />
                <span className="flex-1">{v.label}</span>
                {counts[v.id] ? <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{counts[v.id]}</span> : null}
              </a>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-100 p-4 text-xs text-slate-500">
          Simulated data for a fictional LATAM sales team. Edits are saved in your browser.
          <button className="mt-2 flex items-center gap-1 text-indigo-600 hover:underline" onClick={() => confirm('Reset all data to the original simulation?') && dispatch({ type: 'reset' })}>
            <RefreshCcw size={12} /> Reset data
          </button>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur print:hidden">
          <select className="input w-auto md:hidden" value={view} onChange={(e) => (window.location.hash = e.target.value)}>
            {VIEWS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
          <select className="input w-auto" value={state.filters.segment} onChange={(e) => dispatch({ type: 'setFilters', filters: { segment: e.target.value, ownerId: 'all' } })}>
            <option value="all">All segments</option>
            <option>Enterprise</option>
            <option>Commercial</option>
          </select>
          <select className="input w-auto" value={state.filters.ownerId} onChange={(e) => dispatch({ type: 'setFilters', filters: { ownerId: e.target.value } })}>
            <option value="all">All reps</option>
            {state.reps.filter((r) => state.filters.segment === 'all' || r.segment === state.filters.segment).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{currentQ.label}</span>
            <div className="w-32"><div className="h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${t.pct * 100}%` }} /></div></div>
            <span className="tabular-nums"><b>{t.remaining}</b> days left</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Active openDeal={setOpenDealId} />
        </main>
      </div>

      <DealDrawer dealId={openDealId} onClose={() => setOpenDealId(null)} />
    </div>
  )
}
