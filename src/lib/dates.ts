const DAY = 86_400_000

export const today = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()

export const toISO = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY)
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY)
export const daysSince = (iso: string) => daysBetween(parse(iso), today)
export const daysUntil = (iso: string) => daysBetween(today, parse(iso))

export interface Quarter {
  label: string
  start: Date
  end: Date
}

export const quarterOf = (d: Date, offset = 0): Quarter => {
  const idx = d.getFullYear() * 4 + Math.floor(d.getMonth() / 3) + offset
  const year = Math.floor(idx / 4)
  const q = idx % 4
  const start = new Date(year, q * 3, 1)
  const end = new Date(year, q * 3 + 3, 0)
  return { label: `Q${q + 1} ${year}`, start, end }
}

export const currentQ = quarterOf(today)
export const nextQ = quarterOf(today, 1)
export const prevQ = quarterOf(today, -1)

export const inQuarter = (iso: string, q: Quarter) => {
  const d = parse(iso)
  return d >= q.start && d <= q.end
}

export const quarterProgress = () => {
  const total = daysBetween(currentQ.start, currentQ.end) + 1
  const elapsed = daysBetween(currentQ.start, today) + 1
  return { total, elapsed, remaining: total - elapsed, pct: elapsed / total }
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? parse(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

export const monthKey = (d: Date) => toISO(d).slice(0, 7)
export const lastMonths = (n: number) =>
  Array.from({ length: n }, (_, i) => monthKey(new Date(today.getFullYear(), today.getMonth() - (n - 1 - i), 1)))
export const monthsOf = (q: Quarter) => [0, 1, 2].map((i) => monthKey(new Date(q.start.getFullYear(), q.start.getMonth() + i, 1)))
export const fmtMonth = (key: string) => parse(`${key}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
