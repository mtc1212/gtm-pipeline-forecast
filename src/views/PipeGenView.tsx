import { useState } from 'react'
import { Bar as RBar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, Kpi, PageHeader } from '../components/ui'
import { currentQ, daysBetween, fmtMonth, inQuarter, lastMonths, monthsOf, nextQ, prevQ, today } from '../lib/dates'
import { money, num, pct } from '../lib/format'
import { isLost, isOpen, isWon } from '../lib/metrics'
import { useStore } from '../lib/store'
import { SOURCES, type Source } from '../lib/types'

const SOURCE_COLOR: Record<Source, string> = { Inbound: '#4f46e5', Outbound: '#0ea5e9', Partner: '#8b5cf6', Advisor: '#059669', Event: '#f59e0b' }
const PERIODS = {
  six: { label: 'Last 6 months', months: lastMonths(6) },
  last: { label: prevQ.label, months: monthsOf(prevQ) },
  this: { label: `${currentQ.label} to date`, months: monthsOf(currentQ) },
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function PipeGenView() {
  const { state, deals, funnel, target } = useStore()
  const [period, setPeriod] = useState<keyof typeof PERIODS>('six')
  const months = new Set(PERIODS[period].months)
  const rows = funnel.filter((r) => months.has(r.month))
  const created = deals.filter((d) => months.has(d.createdDate.slice(0, 7)))

  const bySource = SOURCES.map((source) => {
    const fr = rows.filter((r) => r.source === source)
    const ds = created.filter((d) => d.source === source)
    const won = ds.filter(isWon)
    const closed = ds.filter((d) => isWon(d) || isLost(d))
    const leads = sum(fr.map((r) => r.leads))
    const pipeline = sum(ds.map((d) => d.amount))
    return {
      source,
      leads,
      mqls: sum(fr.map((r) => r.mqls)),
      sqls: sum(fr.map((r) => r.sqls)),
      opps: ds.length,
      won: won.length,
      pipeline,
      wonAmount: sum(won.map((d) => d.amount)),
      winRate: closed.length ? won.length / closed.length : null,
      closedCount: closed.length,
      per100: leads ? (pipeline / leads) * 100 : 0,
    }
  })
  const tot = {
    leads: sum(bySource.map((s) => s.leads)),
    mqls: sum(bySource.map((s) => s.mqls)),
    sqls: sum(bySource.map((s) => s.sqls)),
    opps: created.length,
    won: created.filter(isWon).length,
    pipeline: sum(created.map((d) => d.amount)),
  }
  const stages = [
    { label: 'Leads', value: tot.leads },
    { label: 'MQLs', value: tot.mqls },
    { label: 'SQLs (meeting held)', value: tot.sqls },
    { label: 'Opportunities', value: tot.opps },
    { label: 'Closed Won', value: tot.won },
  ]

  const chart = lastMonths(6).map((m) => ({
    month: fmtMonth(m),
    ...Object.fromEntries(SOURCES.map((s) => [s, sum(deals.filter((d) => d.createdDate.startsWith(m) && d.source === s).map((d) => d.amount))])),
  }))

  // Plan: how much pipeline must be created to cover next quarter.
  const six = new Set(lastMonths(6))
  const sixDeals = deals.filter((d) => six.has(d.createdDate.slice(0, 7)))
  const sixLeads = sum(funnel.filter((r) => six.has(r.month)).map((r) => r.leads))
  const avgOpp = sixDeals.length ? sum(sixDeals.map((d) => d.amount)) / sixDeals.length : 50_000
  const leadToOpp = sixLeads ? sixDeals.length / sixLeads : 0.05
  const nextTarget = target * 1.15
  const goal = Math.max(1, state.settings.coverageTarget - 1)
  const nextPipe = sum(deals.filter((d) => isOpen(d) && inQuarter(d.closeDate, nextQ)).map((d) => d.amount))
  const gap = Math.max(0, nextTarget * goal - nextPipe)
  const oppsNeeded = Math.ceil(gap / avgOpp)
  const leadsNeeded = Math.ceil(oppsNeeded / leadToOpp)
  const weeks = Math.max(1, Math.round(daysBetween(today, nextQ.start) / 7))
  const best = [...bySource].filter((s) => s.leads > 0).sort((a, b) => b.per100 - a.per100)[0]
  const biggest = [...bySource].sort((a, b) => b.pipeline - a.pipeline)[0]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pipeline Generation"
        description="Top of funnel by source: how leads become opportunities and revenue, and how much new pipeline next quarter needs. This is where Marketing, the Advisor program and outbound get measured."
        action={
          <div className="flex gap-2">
            {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => (
              <button key={k} className={`rounded-full px-3 py-1 text-sm ${period === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`} onClick={() => setPeriod(k)}>{PERIODS[k].label}</button>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Leads" value={num(tot.leads, 0)} hint={PERIODS[period].label} />
        <Kpi label="Opportunities created" value={tot.opps} hint={`${pct(tot.leads ? tot.opps / tot.leads : 0)} lead → opp`} />
        <Kpi label="Pipeline created" value={money(tot.pipeline)} hint={`Avg ${money(tot.opps ? tot.pipeline / tot.opps : 0)} per opp`} />
        <Kpi label={`${nextQ.label} pipeline gap`} value={money(gap)} hint={`To reach ${goal}× coverage`} tone={gap > 0 ? 'bad' : 'good'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-2" title="Funnel" subtitle="Volume at each step and the conversion to the next one.">
          <div className="space-y-2">
            {stages.map((s, i) => (
              <div key={s.label}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-slate-700">{s.label}</span><span className="font-medium tabular-nums">{num(s.value, 0)}</span></div>
                <div className="h-6 rounded bg-slate-100"><div className="h-6 rounded bg-indigo-500" style={{ width: `${tot.leads ? Math.max(1.5, (s.value / tot.leads) * 100) : 0}%` }} /></div>
                {i < stages.length - 1 && (
                  <div className="py-1 text-center text-xs text-slate-500">↓ {pct(s.value ? stages[i + 1].value / s.value : 0)} convert{i === stages.length - 2 ? ' (won so far — many opps are still open)' : ''}</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-3" title="Pipeline created per month" subtitle="New opportunity value by source (last 6 months).">
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => money(Number(v))} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {SOURCES.map((s, i) => <RBar key={s} dataKey={s} stackId="a" fill={SOURCE_COLOR[s]} radius={i === SOURCES.length - 1 ? [4, 4, 0, 0] : undefined} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="card overflow-x-auto xl:col-span-3">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>{['Source', 'Leads', 'MQL', 'SQL', 'Opps', 'Lead → Opp', 'Pipeline', 'Pipeline / 100 leads', 'Win rate'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bySource.map((s) => (
                <tr key={s.source}>
                  <td className="px-3 py-2.5 font-medium"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: SOURCE_COLOR[s.source] }} />{s.source}</td>
                  <td className="px-3 py-2.5 tabular-nums">{s.leads}</td>
                  <td className="px-3 py-2.5 tabular-nums">{s.mqls}</td>
                  <td className="px-3 py-2.5 tabular-nums">{s.sqls}</td>
                  <td className="px-3 py-2.5 tabular-nums">{s.opps}</td>
                  <td className="px-3 py-2.5 tabular-nums">{pct(s.leads ? s.opps / s.leads : 0)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{money(s.pipeline)}</td>
                  <td className={`px-3 py-2.5 tabular-nums ${s === best ? 'font-semibold text-emerald-600' : ''}`}>{money(s.per100)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{s.winRate === null ? '—' : <>{pct(s.winRate)} <span className="text-xs text-slate-400">({s.closedCount})</span></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            {best && <><b className="text-slate-700">{best.source}</b> is the most efficient source ({money(best.per100)} of pipeline per 100 leads). </>}
            {biggest && <><b className="text-slate-700">{biggest.source}</b> creates the most pipeline ({pct(tot.pipeline ? biggest.pipeline / tot.pipeline : 0)} of total).</>}
          </div>
        </div>

        <Card className="xl:col-span-2" title={`${nextQ.label} pipeline plan`} subtitle="Working backwards from next quarter's target with your trailing conversion rates.">
          <dl className="space-y-2 text-sm">
            {[
              [`${nextQ.label} target (assumed +15% QoQ)`, money(nextTarget)],
              [`Pipeline needed at ${goal}× coverage`, money(nextTarget * goal)],
              [`Already open for ${nextQ.label}`, money(nextPipe)],
              ['Gap to create', money(gap)],
              ['Avg opportunity size (6 mo.)', money(avgOpp)],
              ['Lead → opportunity rate (6 mo.)', pct(leadToOpp)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-slate-600">{k}</dt><dd className="font-medium tabular-nums">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
            {gap > 0 ? (
              <>Create <b>{oppsNeeded} more opportunities</b> (about <b>{num(leadsNeeded, 0)} leads</b>) in the next {weeks} weeks. That's ~{num(oppsNeeded / weeks)} opps per week.{best ? ` Lean on ${best.source}: it turns leads into pipeline most efficiently.` : ''}</>
            ) : (
              <>{nextQ.label} already has {goal}× coverage. Focus on progressing deals.</>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
