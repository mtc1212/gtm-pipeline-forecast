import { addDays, currentQ, daysBetween, lastMonths, nextQ, parse, prevQ, toISO, today, type Quarter } from './dates'
import { SOURCES, type Account, type Activity, type ActivityType, type Contact, type ContactRole, type Deal, type DealType, type ForecastCategory, type FunnelRow, type Product, type Renewal, type Rep, type Segment, type Source, type Stage } from './types'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DEFAULT_SEED = 1069
let rand = mulberry32(DEFAULT_SEED)
const between = (min: number, max: number) => min + rand() * (max - min)
const int = (min: number, max: number) => Math.floor(between(min, max + 1))
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
const chance = (p: number) => rand() < p
const weightedWith = <T,>(rng: () => number, pairs: [T, number][]) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [v, w] of pairs) {
    r -= w
    if (r <= 0) return v
  }
  return pairs[pairs.length - 1][0]
}
const weighted = <T,>(pairs: [T, number][]) => weightedWith(() => rand(), pairs)

// Second generator for accounts, contacts, activities and funnel data, so they never shift the deal data above.
let aux = mulberry32(DEFAULT_SEED + 7)
const aBetween = (min: number, max: number) => min + aux() * (max - min)
const aInt = (min: number, max: number) => Math.floor(aBetween(min, max + 1))
const aPick = <T,>(arr: readonly T[]) => arr[Math.floor(aux() * arr.length)]
const aChance = (p: number) => aux() < p
const aWeighted = <T,>(pairs: [T, number][]) => weightedWith(() => aux(), pairs)
const round5k = (n: number) => Math.max(5000, Math.round(n / 5000) * 5000)

export const REPS: Rep[] = [
  { id: 'r1', name: 'Camila Souza', segment: 'Enterprise', territory: 'Brazil — Financial Services', quota: 900_000, rampedPct: 1 },
  { id: 'r2', name: 'Rafael Lima', segment: 'Enterprise', territory: 'Brazil — Retail, Telco & Industrial', quota: 850_000, rampedPct: 1 },
  { id: 'r3', name: 'Mariana Costa', segment: 'Enterprise', territory: 'Brazil — Tech, Consumer & Travel', quota: 700_000, rampedPct: 1 },
  { id: 'r4', name: 'Lucas Ferreira', segment: 'Commercial', territory: 'Brazil — Digital Natives', quota: 450_000, rampedPct: 0.75 },
  { id: 'r5', name: 'Beatriz Alves', segment: 'Commercial', territory: 'Brazil — Mid-Market', quota: 500_000, rampedPct: 1 },
]

interface AccountSeed {
  name: string
  industry: string
  country: string
  segment: Segment
  owner: string
}

// All company names are fictional.
const ACCOUNTS: AccountSeed[] = [
  { name: 'Banco Aurora', industry: 'Banking', country: 'Brazil', segment: 'Enterprise', owner: 'r1' },
  { name: 'Itaparica Seguros', industry: 'Insurance', country: 'Brazil', segment: 'Enterprise', owner: 'r1' },
  { name: 'Cruzeiro Investimentos', industry: 'Asset Management', country: 'Brazil', segment: 'Enterprise', owner: 'r1' },
  { name: 'Banco Horizonte', industry: 'Banking', country: 'Brazil', segment: 'Enterprise', owner: 'r1' },
  { name: 'PagaJá', industry: 'Fintech', country: 'Brazil', segment: 'Enterprise', owner: 'r1' },
  { name: 'Previdência Serra Azul', industry: 'Insurance', country: 'Brazil', segment: 'Enterprise', owner: 'r1' },
  { name: 'Cooperativa Sul Crédito', industry: 'Banking', country: 'Brazil', segment: 'Enterprise', owner: 'r1' },
  { name: 'Varejo Paulista', industry: 'Retail', country: 'Brazil', segment: 'Enterprise', owner: 'r2' },
  { name: 'Lojas Ipê', industry: 'Retail', country: 'Brazil', segment: 'Enterprise', owner: 'r2' },
  { name: 'Conecta Telecom', industry: 'Telco', country: 'Brazil', segment: 'Enterprise', owner: 'r2' },
  { name: 'Siderúrgica Atlântica', industry: 'Industrial', country: 'Brazil', segment: 'Enterprise', owner: 'r2' },
  { name: 'AgroVale', industry: 'Agribusiness', country: 'Brazil', segment: 'Enterprise', owner: 'r2' },
  { name: 'Rede Saúde Mais', industry: 'Healthcare', country: 'Brazil', segment: 'Enterprise', owner: 'r2' },
  { name: 'Energia Tropical', industry: 'Energy', country: 'Brazil', segment: 'Enterprise', owner: 'r2' },
  { name: 'Lojas Paraná Digital', industry: 'Retail', country: 'Brazil', segment: 'Enterprise', owner: 'r3' },
  { name: 'Banco Litoral', industry: 'Banking', country: 'Brazil', segment: 'Enterprise', owner: 'r3' },
  { name: 'Fibra Nordeste', industry: 'Telco', country: 'Brazil', segment: 'Enterprise', owner: 'r3' },
  { name: 'Carteira Verde', industry: 'Fintech', country: 'Brazil', segment: 'Enterprise', owner: 'r3' },
  { name: 'Aérea Tucano', industry: 'Travel', country: 'Brazil', segment: 'Enterprise', owner: 'r3' },
  { name: 'Bazar Bahia Online', industry: 'E-commerce', country: 'Brazil', segment: 'Enterprise', owner: 'r3' },
  { name: 'Entrega Rápida', industry: 'Logistics', country: 'Brazil', segment: 'Commercial', owner: 'r4' },
  { name: 'Codeflow Labs', industry: 'Software', country: 'Brazil', segment: 'Commercial', owner: 'r4' },
  { name: 'Viagem Fácil', industry: 'Travel', country: 'Brazil', segment: 'Commercial', owner: 'r4' },
  { name: 'EduPlus', industry: 'Edtech', country: 'Brazil', segment: 'Commercial', owner: 'r4' },
  { name: 'Saudável App', industry: 'Healthtech', country: 'Brazil', segment: 'Commercial', owner: 'r4' },
  { name: 'Imóvel Já', industry: 'Proptech', country: 'Brazil', segment: 'Commercial', owner: 'r4' },
  { name: 'Contábil Nuvem', industry: 'Software', country: 'Brazil', segment: 'Commercial', owner: 'r5' },
  { name: 'Moda Carioca', industry: 'Retail', country: 'Brazil', segment: 'Commercial', owner: 'r5' },
  { name: 'Logística Serra', industry: 'Logistics', country: 'Brazil', segment: 'Commercial', owner: 'r5' },
  { name: 'Clínica Digital', industry: 'Healthtech', country: 'Brazil', segment: 'Commercial', owner: 'r5' },
  { name: 'Gaúcha Foods', industry: 'Food & Beverage', country: 'Brazil', segment: 'Commercial', owner: 'r5' },
  { name: 'Fintech Capivara', industry: 'Fintech', country: 'Brazil', segment: 'Commercial', owner: 'r5' },
]

const NEXT_STEPS: Record<Stage, string[]> = {
  Discovery: ['Discovery call with VP Engineering', 'Map engineering org & tooling', 'Qualify use cases with platform team'],
  Demo: ['Tailored demo for dev leads', 'Technical deep-dive with security', 'Demo Devin on legacy COBOL migration'],
  POC: ['POC kickoff — define success criteria', 'POC mid-point review', 'POC readout with CTO', 'Security questionnaire review'],
  Negotiation: ['Send redlines to legal', 'Procurement call — pricing', 'Final proposal to CFO', 'Order form signature'],
  'Closed Won': ['Kickoff with CS'],
  'Closed Lost': [''],
}

const LOST_REASONS = ['Budget frozen', 'Chose competitor', 'No decision / status quo', 'Security / data residency', 'Timing — revisit next FY']

const productFor = (seg: Segment): Product =>
  weighted<Product>(seg === 'Enterprise' ? [['Devin', 5], ['Windsurf', 3], ['Devin + Windsurf', 3]] : [['Devin', 4], ['Windsurf', 5], ['Devin + Windsurf', 1]])

const amountFor = (seg: Segment, product: Product) => {
  const base = seg === 'Enterprise' ? between(100_000, 340_000) : between(30_000, 110_000)
  return round5k(product === 'Devin + Windsurf' ? base * 1.3 : base)
}

const sourceFor = (): Source =>
  weighted<Source>([['Inbound', 4], ['Outbound', 3], ['Partner', 2], ['Advisor', 1.5], ['Event', 1]])

const categoryFor = (stage: Stage): ForecastCategory => {
  switch (stage) {
    case 'Negotiation':
      return weighted([['Commit', 8], ['Best Case', 2]])
    case 'POC':
      return weighted([['Best Case', 6], ['Commit', 2], ['Pipeline', 2]])
    case 'Demo':
      return weighted([['Pipeline', 7], ['Best Case', 2.5], ['Commit', 0.5]])
    case 'Discovery':
      return weighted([['Pipeline', 9.5], ['Best Case', 0.5]])
    case 'Closed Won':
      return 'Closed'
    case 'Closed Lost':
      return 'Omitted'
  }
}

const dateIn = (q: Quarter, from?: Date, to?: Date) => {
  const start = from && from > q.start ? from : q.start
  const end = to && to < q.end ? to : q.end
  return addDays(start, int(0, Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))))
}

let seq = 0
function makeDeal(stage: Stage, closeDate: Date, preferredOwner?: string, sloppy = 0.3): Deal {
  const pool = preferredOwner ? ACCOUNTS.filter((a) => a.owner === preferredOwner) : ACCOUNTS
  const acct = pick(pool)
  const product = productFor(acct.segment)
  const type: DealType = chance(0.3) ? 'Expansion' : 'New Logo'
  const amount = amountFor(acct.segment, product) * (type === 'Expansion' ? 0.7 : 1)
  const cycle = acct.segment === 'Enterprise' ? int(70, 160) : int(35, 90)
  const created = addDays(closeDate, -cycle)
  const isOpen = stage !== 'Closed Won' && stage !== 'Closed Lost'
  const stageEntered = isOpen ? addDays(today, -weighted([[int(1, 14), 6], [int(15, 30), 3], [int(36, 60), 1.5 * sloppy]])) : closeDate
  const lastActivity = isOpen
    ? addDays(today, -weighted([[int(0, 6), 7], [int(7, 13), 2.5], [int(15, 40), 3 * sloppy]]))
    : closeDate
  const hasNextStep = !isOpen || !chance(0.25 * sloppy)
  const nextStepDate = isOpen && hasNextStep ? addDays(today, weighted([[int(1, 12), 9], [-int(2, 10), 3 * sloppy]])) : null
  const lateStage = stage === 'POC' || stage === 'Negotiation' || stage === 'Closed Won'
  seq += 1
  return {
    id: `D-${String(1000 + seq)}`,
    name: `${acct.name} — ${product}${type === 'Expansion' ? ' Expansion' : ''}`,
    account: acct.name,
    industry: acct.industry,
    country: acct.country,
    segment: acct.segment,
    ownerId: acct.owner,
    product,
    type,
    source: sourceFor(),
    amount: round5k(amount),
    seats: Math.round(amount / 650),
    stage,
    forecastCategory: (stage === 'Demo' || stage === 'POC') && chance(0.35 * sloppy) ? 'Commit' : categoryFor(stage),
    createdDate: toISO(created < stageEntered ? created : addDays(stageEntered, -int(10, 30))),
    closeDate: toISO(closeDate),
    stageEnteredDate: toISO(stageEntered),
    lastActivityDate: toISO(lastActivity > today ? today : lastActivity),
    nextStep: hasNextStep ? pick(NEXT_STEPS[stage]) : '',
    nextStepDate: nextStepDate ? toISO(nextStepDate) : null,
    champion: lateStage ? chance(0.85) : chance(0.35),
    economicBuyer: stage === 'Negotiation' || stage === 'Closed Won' ? !chance(0.4 * sloppy) : stage === 'POC' ? chance(0.6 - 0.3 * sloppy) : chance(0.15),
    pushCount: isOpen ? weighted([[0, 7], [1, 2.5], [2, 1.5 * sloppy], [3, 0.5 * sloppy]]) : 0,
    lostReason: stage === 'Closed Lost' ? pick(LOST_REASONS) : undefined,
    lostAtStage: stage === 'Closed Lost' ? aWeighted<Stage>([['Discovery', 2.5], ['Demo', 4], ['POC', 3], ['Negotiation', 1.5]]) : undefined,
  }
}

// Each rep gets a deliberate "profile" so the dashboards tell a story worth discussing.
interface RepProfile {
  wins: number
  losses: number
  open: Partial<Record<Stage, number>>
  next: number
  sloppy: number
  history: [won: number, lost: number]
}
const PROFILES: Record<string, RepProfile> = {
  // Top performer, clean CRM.
  r1: { wins: 2, losses: 1, open: { Negotiation: 2, POC: 2, Demo: 2 }, next: 5, sloppy: 0.1, history: [4, 3] },
  // Behind plan, thin pipeline.
  r2: { wins: 1, losses: 1, open: { Negotiation: 1, POC: 2, Demo: 2 }, next: 4, sloppy: 0.35, history: [3, 4] },
  // Big pipeline but optimistic forecasting and stale deals.
  r3: { wins: 1, losses: 1, open: { Negotiation: 2, POC: 3, Demo: 3 }, next: 4, sloppy: 0.8, history: [3, 3] },
  // New hire ramping — small deals, high activity.
  r4: { wins: 2, losses: 0, open: { Negotiation: 2, POC: 2, Demo: 3 }, next: 4, sloppy: 0.2, history: [3, 2] },
  // Solid closer, weak CRM discipline.
  r5: { wins: 3, losses: 1, open: { Negotiation: 2, POC: 3, Demo: 2 }, next: 3, sloppy: 0.6, history: [4, 2] },
}

function buildDeals(): Deal[] {
  const deals: Deal[] = []
  const yesterday = addDays(today, -1)
  for (const rep of REPS) {
    const p = PROFILES[rep.id]
    for (let i = 0; i < p.wins; i++) deals.push(makeDeal('Closed Won', dateIn(currentQ, undefined, yesterday), rep.id))
    for (let i = 0; i < p.losses; i++) deals.push(makeDeal('Closed Lost', dateIn(currentQ, undefined, yesterday), rep.id))
    for (const [stage, count] of Object.entries(p.open) as [Stage, number][]) {
      for (let i = 0; i < count; i++) {
        const pastDue = chance(0.15 * p.sloppy)
        deals.push(makeDeal(stage, pastDue ? dateIn(currentQ, undefined, yesterday) : dateIn(currentQ, today), rep.id, p.sloppy))
      }
    }
    for (let i = 0; i < p.next; i++) deals.push(makeDeal(weighted<Stage>([['Discovery', 5], ['Demo', 3], ['POC', 1]]), dateIn(nextQ), rep.id, p.sloppy))
    for (let i = 0; i < p.history[0]; i++) deals.push(makeDeal('Closed Won', dateIn(prevQ), rep.id))
    for (let i = 0; i < p.history[1]; i++) deals.push(makeDeal('Closed Lost', dateIn(prevQ), rep.id))
  }
  return deals
}

function buildRenewals(): Renewal[] {
  const pool = ACCOUNTS.filter((_, i) => i % 2 === 0)
  return pool.map((acct, i) => {
    const product = productFor(acct.segment)
    const arr = round5k(acct.segment === 'Enterprise' ? between(120_000, 520_000) : between(30_000, 120_000))
    const seatsPurchased = Math.round(arr / 650)
    const util = weighted([[between(0.85, 1.15), 5], [between(0.6, 0.85), 3], [between(0.25, 0.6), 2]])
    return {
      id: `R-${200 + i}`,
      account: acct.name,
      industry: acct.industry,
      country: acct.country,
      ownerId: acct.owner,
      product,
      arr,
      seatsPurchased,
      seatsActive: Math.round(seatsPurchased * util),
      renewalDate: toISO(addDays(today, int(-10, 180))),
      execSponsor: chance(0.65),
      supportEscalations: weighted([[0, 6], [1, 3], [int(2, 5), 1.5]]),
      nps: weighted([[int(9, 10), 4], [int(7, 8), 4], [int(2, 6), 2]]),
      expansionSignal: util > 0.95 && chance(0.7),
    }
  })
}

export interface Snapshot {
  id: string
  amount: number
  forecastCategory: Deal['forecastCategory']
  closeDate: string
  stage: Stage
}

export interface CallHistoryPoint {
  week: string
  closed: number
  commit: number
  bestCase: number
}

export const snapshotOf = (deals: Deal[]): Snapshot[] =>
  deals.map(({ id, amount, forecastCategory, closeDate, stage }) => ({ id, amount, forecastCategory, closeDate, stage }))

export function buildSeed(seedNumber = DEFAULT_SEED) {
  rand = mulberry32(seedNumber)
  aux = mulberry32(seedNumber + 7)
  seq = 0
  const deals = buildDeals()

  // "Last week's call": a few deals looked different, so the change log has a story to tell.
  const baseline = snapshotOf(deals)
  const open = baseline.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost' && d.closeDate <= toISO(currentQ.end))
  const upgraded = open.find((d) => d.forecastCategory === 'Commit')
  if (upgraded) upgraded.forecastCategory = 'Best Case'
  const pushedIdx = deals.findIndex((d) => d.stage === 'Demo' && d.closeDate > toISO(currentQ.end))
  if (pushedIdx >= 0) {
    baseline[pushedIdx].closeDate = toISO(addDays(currentQ.end, -10))
    baseline[pushedIdx].forecastCategory = 'Best Case'
    deals[pushedIdx].pushCount += 1
  }
  const shrunk = open.find((d) => d.forecastCategory === 'Best Case' && d.amount > 100_000)
  if (shrunk) shrunk.amount = round5k(shrunk.amount * 1.35)
  const recentWin = baseline.find((d) => d.stage === 'Closed Won' && d.closeDate >= toISO(addDays(today, -7)) && d.closeDate <= toISO(currentQ.end))
  if (recentWin) {
    recentWin.stage = 'Negotiation'
    recentWin.forecastCategory = 'Commit'
  }

  const renewals = buildRenewals()
  const accounts = buildAccounts()
  return {
    reps: REPS,
    deals,
    renewals,
    baseline,
    accounts,
    contacts: buildContacts(accounts, deals),
    activities: buildActivities(deals),
    funnel: buildFunnel(deals),
  }
}

const CITY_HINT: Record<string, string> = {
  'Varejo Paulista': 'São Paulo',
  'Moda Carioca': 'Rio de Janeiro',
  'Gaúcha Foods': 'Porto Alegre',
  'Bazar Bahia Online': 'Salvador',
  'Fibra Nordeste': 'Recife',
  'Lojas Paraná Digital': 'Curitiba',
  'Banco Litoral': 'Florianópolis',
}
const CITIES = ['São Paulo', 'São Paulo', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Campinas', 'Curitiba', 'Brasília', 'Porto Alegre']
const FIRST = ['Ana', 'Bruno', 'Carla', 'Diego', 'Fernanda', 'Gustavo', 'Helena', 'Igor', 'Juliana', 'Leonardo', 'Larissa', 'Marcelo', 'Natália', 'Otávio', 'Paula', 'Renato', 'Sofia', 'Thiago', 'Vanessa', 'Vinícius', 'Patrícia', 'Eduardo', 'Aline', 'Rodrigo', 'Gabriela', 'Felipe', 'Tatiane', 'André']
const LAST = ['Ribeiro', 'Oliveira', 'Santos', 'Pereira', 'Carvalho', 'Rocha', 'Almeida', 'Nascimento', 'Barbosa', 'Mendes', 'Cardoso', 'Teixeira', 'Moreira', 'Araújo', 'Gomes', 'Martins', 'Vieira', 'Monteiro', 'Freitas', 'Duarte']
const PRIORITY_INDUSTRIES = ['Banking', 'Fintech', 'Insurance', 'Telco', 'Software']

function buildAccounts(): Account[] {
  return ACCOUNTS.map((a) => {
    const engineers = a.segment === 'Enterprise' ? aInt(300, 3500) : aInt(30, 280)
    const tier = engineers >= 1000 || (a.segment === 'Enterprise' && PRIORITY_INDUSTRIES.includes(a.industry)) ? 'A' : engineers >= 150 ? 'B' : 'C'
    return {
      name: a.name,
      industry: a.industry,
      country: a.country,
      segment: a.segment,
      ownerId: a.owner,
      city: CITY_HINT[a.name] ?? aPick(CITIES),
      engineers,
      employees: Math.round((engineers * aBetween(4, 12)) / 10) * 10,
      tier,
    }
  })
}

function buildContacts(accounts: Account[], deals: Deal[]): Contact[] {
  const out: Contact[] = []
  for (const a of accounts) {
    const ds = deals.filter((d) => d.account === a.name && d.stage !== 'Closed Lost')
    const last = ds.map((d) => d.lastActivityDate).sort().pop() ?? toISO(addDays(today, -60))
    const ent = a.segment === 'Enterprise'
    const hasChampion = ds.some((d) => d.champion)
    const roles: [ContactRole, string, boolean][] = [
      ['Economic Buyer', aPick(ent ? ['CTO', 'CIO', 'VP Engineering'] : ['CTO', 'Co-founder & CTO']), ds.some((d) => d.economicBuyer)],
      [hasChampion ? 'Champion' : 'Technical Evaluator', aPick(['Head of Platform Engineering', 'Director of Engineering', 'Engineering Manager']), true],
      ['Technical Evaluator', aPick(['Staff Engineer', 'Tech Lead', 'Principal Engineer']), aChance(0.8)],
    ]
    if (ent && aChance(0.7)) roles.push(['Security / IT', aPick(['CISO', 'Head of Information Security']), aChance(0.5)])
    if (ds.some((d) => d.stage === 'Negotiation' || d.stage === 'Closed Won')) roles.push(['Procurement', 'Procurement Manager', true])
    for (const [role, title, engaged] of roles) {
      out.push({
        id: `C-${out.length + 1}`,
        account: a.name,
        name: `${aPick(FIRST)} ${aPick(LAST)}`,
        title,
        role,
        engaged,
        lastContacted: engaged ? toISO(addDays(parse(last), -aInt(0, 12))) : aChance(0.5) ? toISO(addDays(today, -aInt(45, 120))) : null,
      })
    }
  }
  return out
}

const TIMELINE: [ActivityType, string][] = [
  ['Email', 'Intro email — AI software engineering for the dev org'],
  ['Call', 'Discovery call with engineering leadership'],
  ['Meeting', 'Use-case workshop: legacy migration & test coverage'],
  ['Demo', 'Tailored demo for dev leads'],
  ['Email', 'Sent security & data-residency documentation (LGPD)'],
  ['Meeting', 'POC kickoff — success criteria agreed'],
  ['Call', 'POC mid-point check-in'],
  ['Meeting', 'POC readout with CTO'],
  ['Email', 'Proposal and pricing sent'],
  ['Call', 'Procurement & legal review'],
]
const STAGE_REACH: Record<Stage, number> = { Discovery: 2, Demo: 4, POC: 7, Negotiation: 9, 'Closed Won': 9, 'Closed Lost': 0 }

function buildActivities(deals: Deal[]): Activity[] {
  const out: Activity[] = []
  const add = (d: Deal, date: Date, type: ActivityType, subject: string) =>
    out.push({ id: `A-${out.length + 1}`, account: d.account, dealId: d.id, date: toISO(date), type, subject, ownerId: d.ownerId })
  for (const d of deals) {
    const closed = d.stage === 'Closed Won' || d.stage === 'Closed Lost'
    const steps = TIMELINE.slice(0, (d.stage === 'Closed Lost' ? STAGE_REACH[d.lostAtStage ?? 'Discovery'] : STAGE_REACH[d.stage]) + 1)
    const n = aInt(Math.min(3, steps.length), steps.length)
    const idx = [...new Set(Array.from({ length: n }, (_, i) => Math.round((i * (steps.length - 1)) / Math.max(1, n - 1))))]
    const start = parse(d.createdDate)
    const end = closed ? addDays(parse(d.closeDate), -aInt(1, 6)) : parse(d.lastActivityDate)
    const span = Math.max(0, daysBetween(start, end))
    idx.forEach((k, i) => add(d, addDays(start, Math.round((span * i) / Math.max(1, idx.length - 1))), ...steps[k]))
    if (d.stage === 'Closed Won') add(d, parse(d.closeDate), 'Note', 'Order form signed — handoff to Customer Success')
    if (d.stage === 'Closed Lost') add(d, parse(d.closeDate), 'Note', `Closed lost — ${d.lostReason}`)
  }
  return out
}

// Typical conversion rates by source: lead→MQL, MQL→SQL, SQL→opportunity.
const FUNNEL_RATES: Record<Source, [number, number, number]> = {
  Inbound: [0.35, 0.3, 0.55],
  Outbound: [0.12, 0.35, 0.5],
  Partner: [0.5, 0.45, 0.6],
  Advisor: [0.7, 0.6, 0.7],
  Event: [0.25, 0.2, 0.45],
}

function buildFunnel(deals: Deal[]): FunnelRow[] {
  const rows: FunnelRow[] = []
  const noise = () => aBetween(0.8, 1.25)
  for (const month of lastMonths(7)) {
    for (const source of SOURCES) {
      for (const rep of REPS) {
        const opps = deals.filter((d) => d.createdDate.startsWith(month) && d.source === source && d.ownerId === rep.id).length
        const [lm, ms, so] = FUNNEL_RATES[source]
        const sqls = Math.max(opps, Math.round((opps || (aChance(0.5) ? 0.6 : 0)) / so * noise()))
        const mqls = Math.max(sqls, Math.round(Math.max(sqls, 0.5) / ms * noise()))
        const leads = Math.max(mqls, Math.round(mqls / lm * noise()))
        rows.push({ month, source, ownerId: rep.id, leads, mqls, sqls })
      }
    }
  }
  return rows
}
