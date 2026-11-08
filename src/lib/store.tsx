import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { addDays, currentQ, daysBetween, inQuarter, today, toISO } from './dates'
import { forecast, snapshotForecast } from './metrics'
import { buildSeed, snapshotOf, type CallHistoryPoint, type Snapshot } from './seed'
import { DEFAULT_SETTINGS, type Deal, type ForecastCategory, type Renewal, type Rep, type Settings, type Stage } from './types'

export interface Filters {
  ownerId: string
  segment: string
}

interface State {
  version: number
  seededOn: string
  reps: Rep[]
  deals: Deal[]
  renewals: Renewal[]
  settings: Settings
  baseline: Snapshot[]
  baselineDate: string
  history: CallHistoryPoint[]
  myCall: number | null
  filters: Filters
}

type Action =
  | { type: 'updateDeal'; id: string; patch: Partial<Deal> }
  | { type: 'addDeal'; deal: Deal }
  | { type: 'logActivity'; id: string; nextStep?: string }
  | { type: 'lockCall' }
  | { type: 'setMyCall'; value: number | null }
  | { type: 'setFilters'; filters: Partial<Filters> }
  | { type: 'updateSettings'; settings: Partial<Settings> }
  | { type: 'reset' }

const VERSION = 3
const KEY = 'gtm-pipeline-forecast'

const defaultCategory = (stage: Stage): ForecastCategory =>
  stage === 'Closed Won' ? 'Closed' : stage === 'Closed Lost' ? 'Omitted' : stage === 'Negotiation' ? 'Commit' : stage === 'POC' ? 'Best Case' : 'Pipeline'

function buildHistory(baseline: Snapshot[], settings: Settings): CallHistoryPoint[] {
  const end = forecast(baseline as unknown as Deal[], settings)
  const points: CallHistoryPoint[] = []
  const lastWeek = addDays(today, -7)
  const span = Math.max(1, daysBetween(currentQ.start, lastWeek))
  const wobble = [0, 0.04, -0.03, 0.05, -0.02, 0.03, -0.04, 0.02, 0.01, -0.01, 0.02, 0]
  let i = 0
  for (let d = new Date(currentQ.start); d <= lastWeek; d = addDays(d, 7), i++) {
    const f = Math.min(1, daysBetween(currentQ.start, d) / span)
    const w = wobble[i % wobble.length] * (1 - f)
    points.push({
      week: toISO(d),
      closed: Math.round(end.closed * Math.pow(f, 1.3)),
      commit: Math.round(end.commitTotal * (0.62 + 0.38 * f + w)),
      bestCase: Math.round(end.bestCaseTotal * (0.85 + 0.15 * f - w)),
    })
  }
  return points
}

function freshState(): State {
  const seed = buildSeed()
  return {
    version: VERSION,
    seededOn: toISO(today),
    reps: seed.reps,
    deals: seed.deals,
    renewals: seed.renewals,
    settings: DEFAULT_SETTINGS,
    baseline: seed.baseline,
    baselineDate: toISO(addDays(today, -7)),
    history: buildHistory(seed.baseline, DEFAULT_SETTINGS),
    myCall: null,
    filters: { ownerId: 'all', segment: 'all' },
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as State
      // Seed data is generated relative to "today"; refresh it if it is from another day.
      if (s.version === VERSION && s.seededOn === toISO(today)) return s
    }
  } catch {
    /* ignore corrupt storage */
  }
  return freshState()
}

function reducer(state: State, action: Action): State {
  const now = toISO(today)
  switch (action.type) {
    case 'updateDeal':
      return {
        ...state,
        deals: state.deals.map((d) => {
          if (d.id !== action.id) return d
          const next: Deal = { ...d, ...action.patch }
          if (action.patch.stage && action.patch.stage !== d.stage) {
            next.stageEnteredDate = now
            next.lastActivityDate = now
            if (!action.patch.forecastCategory) next.forecastCategory = defaultCategory(next.stage)
            if (next.stage === 'Closed Won' || next.stage === 'Closed Lost') {
              if (next.closeDate > now) next.closeDate = now
              next.nextStep = next.stage === 'Closed Won' ? 'Kickoff with CS' : ''
              next.nextStepDate = null
            }
            if (next.stage === 'Closed Lost' && !next.lostReason) next.lostReason = 'No decision / status quo'
          }
          if (action.patch.closeDate && action.patch.closeDate > d.closeDate && inQuarter(d.closeDate, currentQ) && !inQuarter(action.patch.closeDate, currentQ))
            next.pushCount = d.pushCount + 1
          return next
        }),
      }
    case 'addDeal':
      return { ...state, deals: [action.deal, ...state.deals] }
    case 'logActivity':
      return {
        ...state,
        deals: state.deals.map((d) =>
          d.id === action.id
            ? { ...d, lastActivityDate: now, ...(action.nextStep ? { nextStep: action.nextStep, nextStepDate: toISO(addDays(today, 7)) } : {}) }
            : d,
        ),
      }
    case 'lockCall': {
      const f = forecast(state.deals, state.settings)
      const history = state.history.filter((h) => h.week !== now)
      return {
        ...state,
        baseline: snapshotOf(state.deals),
        baselineDate: now,
        history: [...history, { week: now, closed: f.closed, commit: f.commitTotal, bestCase: f.bestCaseTotal }],
      }
    }
    case 'setMyCall':
      return { ...state, myCall: action.value }
    case 'setFilters':
      return { ...state, filters: { ...state.filters, ...action.filters } }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.settings } }
    case 'reset':
      return freshState()
  }
}

interface Ctx {
  state: State
  dispatch: React.Dispatch<Action>
  /** Deals after applying the global rep / segment filters. */
  deals: Deal[]
  reps: Rep[]
  renewals: Renewal[]
  baseline: Snapshot[]
  target: number
  repName: (id: string) => string
  lastCall: ReturnType<typeof snapshotForecast>
}

const StoreContext = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<Ctx>(() => {
    const { ownerId, segment } = state.filters
    const reps = state.reps.filter((r) => (ownerId === 'all' || r.id === ownerId) && (segment === 'all' || r.segment === segment))
    const ids = new Set(reps.map((r) => r.id))
    const deals = state.deals.filter((d) => ids.has(d.ownerId))
    const renewals = state.renewals.filter((r) => ids.has(r.ownerId))
    const dealOwner = new Map(state.deals.map((d) => [d.id, d.ownerId]))
    const baseline = state.baseline.filter((s) => ids.has(dealOwner.get(s.id) ?? ''))
    const names = new Map(state.reps.map((r) => [r.id, r.name]))
    return {
      state,
      dispatch,
      deals,
      reps,
      renewals,
      baseline,
      target: reps.reduce((s, r) => s + r.quota, 0),
      repName: (id) => names.get(id) ?? id,
      lastCall: snapshotForecast(baseline, state.settings),
    }
  }, [state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
