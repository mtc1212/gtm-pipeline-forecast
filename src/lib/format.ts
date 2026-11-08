export const money = (n: number, compact = true) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n)

export const pct = (n: number, digits = 0) =>
  `${(Number.isFinite(n) ? n * 100 : 0).toFixed(digits)}%`

export const num = (n: number, digits = 1) => (Number.isFinite(n) ? n.toFixed(digits) : '—')
