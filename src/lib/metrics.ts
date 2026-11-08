import { currentQ, daysSince, daysUntil, inQuarter, nextQ, prevQ, quarterProgress, today, toISO, type Quarter } from './dates'
import { money } from './format'
import type { Snapshot } from './seed'
import { OPEN_STAGES, type Deal, type Renewal, type Rep, type Settings, type Stage } from './types'

export const isOpen = (d: { stage: Stage }) => OPEN_STAGES.includes(d.stage)
export const isWon = (d: { stage: Stage }) => d.stage === 'Closed Won'
export const isLost = (d: { stage: Stage }) => d.stage === 'Closed Lost'
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export interface ForecastSummary {
  closed: number
  commit: number
  bestCase: number
  pipeline: number
  weighted: number
  commitTotal: number
  bestCaseTotal: number
  openInQuarter: number
  openCount: number
}

export function forecast(deals: Deal[], settings: Settings, q: Quarter = currentQ): ForecastSummary {
  const inQ = deals.filter((d) => inQuarter(d.closeDate, q) || (isOpen(d) && d.closeDate < toISO(q.start) && q === currentQ))
  const won = inQ.filter(isWon)
  const open = inQ.filter(isOpen)
  const by = (cat: string) => sum(open.filter((d) => d.forecastCategory === cat).map((d) => d.amount))
  const closed = sum(won.map((d) => d.amount))
  const commit = by('Commit')
  const bestCase = by('Best Case')
  const pipeline = by('Pipeline')
  const weightedOpen = sum(open.map((d) => d.amount * settings.stageProbabilities[d.stage]))
  return {
    closed,
    commit,
    bestCase,
    pipeline,
    weighted: closed + weightedOpen,
    commitTotal: closed + commit,
    bestCaseTotal: closed + commit + bestCase,
    openInQuarter: commit + bestCase + pipeline,
    openCount: open.length,
  }
}

export function snapshotForecast(snap: Snapshot[], settings: Settings) {
  return forecast(snap as unknown as Deal[], settings)
}

export interface ForecastChange {
  id: string
  name: string
  ownerId: string
  kind: 'New' | 'Won' | 'Lost' | 'Upgraded' | 'Downgraded' | 'Pushed' | 'Pulled in' | 'Amount'
  delta: number
  detail: string
}

const CATEGORY_RANK: Record<string, number> = { Omitted: 0, Pipeline: 1, 'Best Case': 2, Commit: 3, Closed: 4 }

/** Changes to the current-quarter commit view since the last locked forecast call. */
export function forecastChanges(deals: Deal[], baseline: Snapshot[]): ForecastChange[] {
  const prev = new Map(baseline.map((s) => [s.id, s]))
  const changes: ForecastChange[] = []
  const inQ = (s: { closeDate: string; stage: Stage }) => inQuarter(s.closeDate, currentQ) || (isOpen(s) && s.closeDate < toISO(currentQ.start))
  for (const d of deals) {
    const p = prev.get(d.id)
    const nowIn = inQ(d) && !isLost(d)
    if (!p) {
      if (nowIn) changes.push({ id: d.id, name: d.name, ownerId: d.ownerId, kind: 'New', delta: d.amount, detail: `Created in ${d.stage}` })
      continue
    }
    const wasIn = inQ(p) && !isLost(p)
    if (isWon(d) && !isWon(p) && nowIn) {
      changes.push({ id: d.id, name: d.name, ownerId: d.ownerId, kind: 'Won', delta: d.amount, detail: `${p.stage} → Closed Won` })
    } else if (isLost(d) && !isLost(p) && wasIn) {
      changes.push({ id: d.id, name: d.name, ownerId: d.ownerId, kind: 'Lost', delta: -p.amount, detail: `${p.stage} → Closed Lost` })
    } else if (wasIn && !nowIn) {
      changes.push({ id: d.id, name: d.name, ownerId: d.ownerId, kind: 'Pushed', delta: -p.amount, detail: `Close date ${p.closeDate} → ${d.closeDate}` })
    } else if (!wasIn && nowIn) {
      changes.push({ id: d.id, name: d.name, ownerId: d.ownerId, kind: 'Pulled in', delta: d.amount, detail: `Close date ${p.closeDate} → ${d.closeDate}` })
    } else if (nowIn && d.forecastCategory !== p.forecastCategory) {
      const up = CATEGORY_RANK[d.forecastCategory] > CATEGORY_RANK[p.forecastCategory]
      changes.push({ id: d.id, name: d.name, ownerId: d.ownerId, kind: up ? 'Upgraded' : 'Downgraded', delta: up ? d.amount : -d.amount, detail: `${p.forecastCategory} → ${d.forecastCategory}` })
    } else if (nowIn && d.amount !== p.amount) {
      changes.push({ id: d.id, name: d.name, ownerId: d.ownerId, kind: 'Amount', delta: d.amount - p.amount, detail: `${money(p.amount)} → ${money(d.amount)}` })
    }
  }
  return changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

export type Severity = 'high' | 'medium' | 'low'
export interface HygieneIssue {
  rule: string
  severity: Severity
  message: string
}

export const HYGIENE_RULES = [
  'Past-due close date',
  'Stale — no recent activity',
  'Missing next step',
  'Overdue next step',
  'Stuck in stage',
  'Commit without economic buyer',
  'Commit in early stage',
  'Repeatedly pushed',
] as const

export function hygieneIssues(d: Deal, s: Settings): HygieneIssue[] {
  if (!isOpen(d)) return []
  const issues: HygieneIssue[] = []
  const due = daysUntil(d.closeDate)
  if (due < 0) issues.push({ rule: 'Past-due close date', severity: 'high', message: `Close date passed ${-due}d ago` })
  const idle = daysSince(d.lastActivityDate)
  if (idle > s.staleDays) issues.push({ rule: 'Stale — no recent activity', severity: idle > s.staleDays * 2 ? 'high' : 'medium', message: `No activity in ${idle} days` })
  if (!d.nextStep.trim()) issues.push({ rule: 'Missing next step', severity: 'medium', message: 'No next step recorded' })
  else if (d.nextStepDate && daysUntil(d.nextStepDate) < 0) issues.push({ rule: 'Overdue next step', severity: 'low', message: `Next step was due ${-daysUntil(d.nextStepDate)}d ago` })
  const inStage = daysSince(d.stageEnteredDate)
  const bench = s.stageBenchmarkDays[d.stage]
  if (bench && inStage > bench * 1.5) issues.push({ rule: 'Stuck in stage', severity: 'medium', message: `${inStage}d in ${d.stage} (benchmark ${bench}d)` })
  if (d.forecastCategory === 'Commit' && !d.economicBuyer) issues.push({ rule: 'Commit without economic buyer', severity: 'high', message: 'Committed but economic buyer not identified' })
  if (d.forecastCategory === 'Commit' && (d.stage === 'Discovery' || d.stage === 'Demo')) issues.push({ rule: 'Commit in early stage', severity: 'high', message: `Committed while still in ${d.stage}` })
  if (d.pushCount >= 2) issues.push({ rule: 'Repeatedly pushed', severity: 'medium', message: `Close date pushed ${d.pushCount}×` })
  return issues
}

export function hygieneScore(deals: Deal[], s: Settings) {
  const open = deals.filter(isOpen)
  if (!open.length) return 1
  return open.filter((d) => hygieneIssues(d, s).length === 0).length / open.length
}

export interface NextBestAction {
  deal: Deal
  action: string
  why: string
  priority: number
  playbook: 'Multi-thread' | 'Re-engage' | 'Update CRM' | 'Accelerate' | 'Executive' | 'Qualify'
}

/** Rule-based next-best-action engine. Priority = rule weight × deal size × urgency. */
export function nextBestActions(deals: Deal[], s: Settings): NextBestAction[] {
  const actions: NextBestAction[] = []
  for (const d of deals.filter(isOpen)) {
    const due = daysUntil(d.closeDate)
    const idle = daysSince(d.lastActivityDate)
    const urgency = due < 0 ? 2 : due <= 14 ? 1.6 : inQuarter(d.closeDate, currentQ) ? 1.2 : 0.7
    const size = d.amount / 100_000
    const add = (weight: number, a: Omit<NextBestAction, 'deal' | 'priority'>) =>
      actions.push({ deal: d, priority: Math.round(weight * size * urgency * 10) / 10, ...a })

    if (due < 0) add(5, { playbook: 'Update CRM', action: 'Re-forecast close date with the buyer', why: `Close date passed ${-due}d ago — forecast is inaccurate until updated.` })
    if ((d.stage === 'Negotiation' || d.forecastCategory === 'Commit') && !d.economicBuyer)
      add(4.5, { playbook: 'Executive', action: 'Book exec-to-exec meeting to reach the economic buyer', why: `${d.forecastCategory} deal with no economic buyer engaged.` })
    if (idle > s.staleDays && d.stage !== 'Discovery')
      add(4, { playbook: 'Re-engage', action: 'Re-engage champion with a POC results / ROI summary', why: `${idle} days without activity in ${d.stage}.` })
    if ((d.stage === 'POC' || d.stage === 'Negotiation') && !d.champion)
      add(3.5, { playbook: 'Multi-thread', action: 'Identify and enable an internal champion', why: `Late-stage (${d.stage}) without a confirmed champion.` })
    if (!d.nextStep.trim() || (d.nextStepDate && daysUntil(d.nextStepDate) < 0))
      add(3, { playbook: 'Update CRM', action: 'Set a dated next step agreed with the customer', why: d.nextStep ? 'Next step is overdue.' : 'No next step on the opportunity.' })
    if (d.stage === 'POC' && daysSince(d.stageEnteredDate) > s.stageBenchmarkDays.POC)
      add(3, { playbook: 'Accelerate', action: 'Schedule POC readout and propose a mutual close plan', why: `POC running ${daysSince(d.stageEnteredDate)}d (benchmark ${s.stageBenchmarkDays.POC}d).` })
    if (d.stage === 'Negotiation' && due >= 0 && due <= 21 && d.economicBuyer)
      add(2.5, { playbook: 'Accelerate', action: 'Send order form and confirm procurement & legal timeline', why: `Closing in ${due}d — remove paperwork risk early.` })
    if (d.stage === 'Discovery' && daysSince(d.stageEnteredDate) > s.stageBenchmarkDays.Discovery)
      add(1.5, { playbook: 'Qualify', action: 'Qualify out or advance to Demo', why: `In Discovery ${daysSince(d.stageEnteredDate)}d — keep pipeline honest.` })
  }
  return actions.sort((a, b) => b.priority - a.priority)
}

export interface RepScore {
  rep: Rep
  closed: number
  commitTotal: number
  bestCaseTotal: number
  weighted: number
  attainment: number
  projected: number
  coverage: number
  winRate: number
  avgDeal: number
  cycleDays: number
  openPipeline: number
  nextQPipeline: number
  hygiene: number
  staleCount: number
}

export function repScores(reps: Rep[], deals: Deal[], s: Settings): RepScore[] {
  return reps.map((rep) => {
    const mine = deals.filter((d) => d.ownerId === rep.id)
    const f = forecast(mine, s)
    const closedHist = mine.filter((d) => (isWon(d) || isLost(d)) && (inQuarter(d.closeDate, currentQ) || inQuarter(d.closeDate, prevQ)))
    const wonHist = closedHist.filter(isWon)
    const remaining = Math.max(0, rep.quota - f.closed)
    return {
      rep,
      closed: f.closed,
      commitTotal: f.commitTotal,
      bestCaseTotal: f.bestCaseTotal,
      weighted: f.weighted,
      attainment: f.closed / rep.quota,
      projected: f.commitTotal / rep.quota,
      coverage: remaining ? f.openInQuarter / remaining : Infinity,
      winRate: closedHist.length ? wonHist.length / closedHist.length : 0,
      avgDeal: wonHist.length ? sum(wonHist.map((d) => d.amount)) / wonHist.length : 0,
      cycleDays: wonHist.length ? sum(wonHist.map((d) => daysSince(d.createdDate) - daysSince(d.closeDate))) / wonHist.length : 0,
      openPipeline: f.openInQuarter,
      nextQPipeline: sum(mine.filter((d) => isOpen(d) && inQuarter(d.closeDate, nextQ)).map((d) => d.amount)),
      hygiene: hygieneScore(mine, s),
      staleCount: mine.filter((d) => isOpen(d) && daysSince(d.lastActivityDate) > s.staleDays).length,
    }
  })
}

export interface RenewalHealth {
  score: number
  risk: 'Healthy' | 'Watch' | 'At Risk'
  utilization: number
  reasons: string[]
}

export function renewalHealth(r: Renewal): RenewalHealth {
  const utilization = r.seatsActive / r.seatsPurchased
  let score = 100
  const reasons: string[] = []
  if (utilization < 0.5) { score -= 40; reasons.push(`Low seat utilization (${Math.round(utilization * 100)}%)`) }
  else if (utilization < 0.8) { score -= 20; reasons.push(`Utilization below 80% (${Math.round(utilization * 100)}%)`) }
  if (!r.execSponsor) { score -= 15; reasons.push('No executive sponsor') }
  if (r.supportEscalations >= 2) { score -= 15; reasons.push(`${r.supportEscalations} support escalations`) }
  if (r.nps <= 6) { score -= 20; reasons.push(`Detractor NPS (${r.nps})`) }
  if (r.expansionSignal) reasons.push('Expansion signal: seats over-utilized')
  score = Math.max(0, score)
  return { score, risk: score >= 75 ? 'Healthy' : score >= 50 ? 'Watch' : 'At Risk', utilization, reasons }
}

export const RISK_RETENTION: Record<RenewalHealth['risk'], number> = { Healthy: 1, Watch: 0.9, 'At Risk': 0.6 }

export function funnel(deals: Deal[], q: Quarter) {
  const created = deals.filter((d) => inQuarter(d.closeDate, q) || isOpen(d))
  return OPEN_STAGES.map((stage) => {
    const ds = created.filter((d) => d.stage === stage)
    return { stage, count: ds.length, amount: sum(ds.map((d) => d.amount)) }
  })
}

export const timeContext = () => ({ ...quarterProgress(), today: toISO(today) })

/** Furthest-stage-reached funnel for closed deals: won deals reached every stage, lost deals reached `lostAtStage`. */
export function stageConversion(closed: Deal[]) {
  const reach = (d: Deal) => (isWon(d) ? OPEN_STAGES.length : OPEN_STAGES.indexOf(d.lostAtStage ?? 'Discovery'))
  return [...OPEN_STAGES, 'Closed Won' as Stage].map((stage, i) => ({
    stage,
    reached: closed.filter((d) => reach(d) >= i).length,
    lostHere: closed.filter((d) => isLost(d) && reach(d) === i).length,
  }))
}
