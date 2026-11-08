export type Stage =
  | 'Discovery'
  | 'Demo'
  | 'POC'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost'

export type ForecastCategory = 'Pipeline' | 'Best Case' | 'Commit' | 'Closed' | 'Omitted'
export type Segment = 'Enterprise' | 'Commercial'
export type Product = 'Devin' | 'Windsurf' | 'Devin + Windsurf'
export type Source = 'Inbound' | 'Outbound' | 'Partner' | 'Advisor' | 'Event'
export type DealType = 'New Logo' | 'Expansion'

export interface Rep {
  id: string
  name: string
  segment: Segment
  territory: string
  quota: number
  rampedPct: number
}

export interface Deal {
  id: string
  name: string
  account: string
  industry: string
  country: string
  segment: Segment
  ownerId: string
  product: Product
  type: DealType
  source: Source
  amount: number
  seats: number
  stage: Stage
  forecastCategory: ForecastCategory
  createdDate: string
  closeDate: string
  stageEnteredDate: string
  lastActivityDate: string
  nextStep: string
  nextStepDate: string | null
  champion: boolean
  economicBuyer: boolean
  pushCount: number
  lostReason?: string
  /** Furthest open stage a Closed Lost deal reached. */
  lostAtStage?: Stage
  notes?: string
}

export interface Renewal {
  id: string
  account: string
  industry: string
  country: string
  ownerId: string
  product: Product
  arr: number
  seatsPurchased: number
  seatsActive: number
  renewalDate: string
  execSponsor: boolean
  supportEscalations: number
  nps: number
  expansionSignal: boolean
}

export interface Account {
  name: string
  industry: string
  country: string
  segment: Segment
  ownerId: string
  city: string
  employees: number
  engineers: number
  tier: 'A' | 'B' | 'C'
}

export type ContactRole = 'Economic Buyer' | 'Champion' | 'Technical Evaluator' | 'Security / IT' | 'Procurement'

export interface Contact {
  id: string
  account: string
  name: string
  title: string
  role: ContactRole
  engaged: boolean
  lastContacted: string | null
}

export type ActivityType = 'Email' | 'Call' | 'Meeting' | 'Demo' | 'Note' | 'Stage change'

export interface Activity {
  id: string
  account: string
  dealId?: string
  date: string
  type: ActivityType
  subject: string
  ownerId: string
}

/** Monthly top-of-funnel volume per rep and source. Opportunities are counted live from deals. */
export interface FunnelRow {
  month: string
  source: Source
  ownerId: string
  leads: number
  mqls: number
  sqls: number
}

export const SOURCES: Source[] = ['Inbound', 'Outbound', 'Partner', 'Advisor', 'Event']

export interface Settings {
  staleDays: number
  stageProbabilities: Record<Stage, number>
  stageBenchmarkDays: Record<Stage, number>
  coverageTarget: number
}

export const OPEN_STAGES: Stage[] = ['Discovery', 'Demo', 'POC', 'Negotiation']
export const ALL_STAGES: Stage[] = [...OPEN_STAGES, 'Closed Won', 'Closed Lost']
export const CATEGORIES: ForecastCategory[] = ['Commit', 'Best Case', 'Pipeline', 'Closed', 'Omitted']

export const DEFAULT_SETTINGS: Settings = {
  staleDays: 14,
  coverageTarget: 3,
  stageProbabilities: {
    Discovery: 0.1,
    Demo: 0.25,
    POC: 0.5,
    Negotiation: 0.8,
    'Closed Won': 1,
    'Closed Lost': 0,
  },
  stageBenchmarkDays: {
    Discovery: 21,
    Demo: 21,
    POC: 30,
    Negotiation: 21,
    'Closed Won': 0,
    'Closed Lost': 0,
  },
}
