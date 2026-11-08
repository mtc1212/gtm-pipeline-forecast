import { ArrowRightLeft, Mail, Phone, Presentation, StickyNote, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ViewProps } from '../App'
import { Card, PageHeader, Pill, StageBadge } from '../components/ui'
import { fmtDate } from '../lib/dates'
import { money, num } from '../lib/format'
import { isOpen, isWon, renewalHealth } from '../lib/metrics'
import { useStore } from '../lib/store'
import type { ActivityType, ContactRole } from '../lib/types'

const ICON: Record<ActivityType, LucideIcon> = { Email: Mail, Call: Phone, Meeting: Users, Demo: Presentation, Note: StickyNote, 'Stage change': ArrowRightLeft }
const KEY_ROLES: ContactRole[] = ['Economic Buyer', 'Champion', 'Technical Evaluator', 'Security / IT', 'Procurement']
const TIER_CLS = { A: 'bg-indigo-100 text-indigo-700', B: 'bg-sky-100 text-sky-700', C: 'bg-slate-100 text-slate-600' }
const RISK_CLS = { Healthy: 'bg-emerald-100 text-emerald-700', Watch: 'bg-amber-100 text-amber-800', 'At Risk': 'bg-rose-100 text-rose-700' }
const accountFromHash = () => decodeURIComponent(window.location.hash.split('/')[1] ?? '')
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function AccountsView({ openDeal }: ViewProps) {
  const { state, dispatch, deals, accounts, contacts, activities, renewals, repName } = useStore()
  const [selected, setSelected] = useState(accountFromHash)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'Customer' | 'Prospect'>('all')
  const [showAll, setShowAll] = useState(false)
  const [note, setNote] = useState({ type: 'Call' as ActivityType, subject: '', dealId: '' })

  useEffect(() => {
    const onHash = () => setSelected(accountFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const rows = accounts.map((a) => {
    const ds = deals.filter((d) => d.account === a.name)
    const renewal = renewals.find((r) => r.account === a.name)
    const wonAmount = sum(ds.filter(isWon).map((d) => d.amount))
    return {
      a,
      deals: ds,
      open: sum(ds.filter(isOpen).map((d) => d.amount)),
      wonAmount,
      renewal,
      health: renewal ? renewalHealth(renewal) : null,
      status: renewal || wonAmount ? ('Customer' as const) : ('Prospect' as const),
    }
  })
  const shown = rows
    .filter((r) => (status === 'all' || r.status === status) && r.a.name.toLowerCase().includes(search.toLowerCase()))
    .sort((x, y) => y.open - x.open)
  const cur = rows.find((r) => r.a.name === selected) ?? shown[0]
  const select = (name: string) => (window.location.hash = `accounts/${encodeURIComponent(name)}`)

  return (
    <div className="space-y-5">
      <PageHeader title="Accounts" description="Every company in the territory with its buying committee, opportunities, renewal and full activity history: the single customer view reps and leaders work from." />
      <div className="grid gap-5 xl:grid-cols-5">
        <div className="card xl:col-span-2">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
            <input className="input flex-1" placeholder="Search accounts…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">All</option>
              <option>Customer</option>
              <option>Prospect</option>
            </select>
          </div>
          <div className="max-h-[760px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                <tr><th className="px-3 py-2 font-medium">Account</th><th className="px-3 py-2 font-medium">Tier</th><th className="px-3 py-2 text-right font-medium">Open pipe</th><th className="px-3 py-2 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => (
                  <tr key={r.a.name} className={`cursor-pointer ${cur?.a.name === r.a.name ? 'bg-indigo-50' : 'hover:bg-slate-50'}`} onClick={() => select(r.a.name)}>
                    <td className="px-3 py-2"><div className="font-medium text-slate-800">{r.a.name}</div><div className="text-xs text-slate-500">{r.a.industry} · {r.a.city}</div></td>
                    <td className="px-3 py-2"><Pill cls={TIER_CLS[r.a.tier]}>{r.a.tier}</Pill></td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.open ? money(r.open) : '—'}</td>
                    <td className="px-3 py-2">{r.health ? <Pill cls={RISK_CLS[r.health.risk]}>{r.health.risk}</Pill> : <span className="text-xs text-slate-500">{r.status}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {cur ? (
          <div className="space-y-5 xl:col-span-3">
            {renderDetail()}
          </div>
        ) : (
          <div className="card p-6 text-sm text-slate-500 xl:col-span-3">No accounts match.</div>
        )}
      </div>
    </div>
  )

  function renderDetail() {
    const r = cur!
    const a = r.a
    const liveDeals = state.deals.filter((d) => d.account === a.name && d.stage !== 'Closed Lost')
    const people = contacts
      .filter((c) => c.account === a.name)
      .map((c) => ({
        ...c,
        engaged: c.role === 'Economic Buyer' ? liveDeals.some((d) => d.economicBuyer) : c.role === 'Champion' ? liveDeals.some((d) => d.champion) : c.engaged,
      }))
    const covered = new Set(people.filter((p) => p.engaged).map((p) => p.role))
    const timeline = activities.filter((x) => x.account === a.name).sort((x, y) => y.date.localeCompare(x.date))
    const openDeals = r.deals.filter(isOpen)
    const warnings = [
      r.open > 0 && !covered.has('Economic Buyer') && `No engaged economic buyer on ${money(r.open)} of open pipeline. Book an exec-to-exec meeting.`,
      r.open > 0 && !covered.has('Champion') && 'No champion identified. Multi-thread into the platform / engineering leadership team.',
      r.health?.risk === 'At Risk' && `Renewal at risk: ${r.health.reasons.join('; ')}.`,
    ].filter(Boolean) as string[]

    const log = () => {
      if (!note.subject.trim()) return
      dispatch({ type: 'addActivity', account: a.name, ownerId: a.ownerId, activityType: note.type, subject: note.subject.trim(), dealId: note.dealId || undefined })
      setNote({ ...note, subject: '' })
    }

    return (
      <>
        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{a.name}</h2>
              <p className="text-sm text-slate-500">{a.industry} · {a.city}, {a.country} · {a.segment} · Owner: {repName(a.ownerId)}</p>
            </div>
            <div className="flex gap-2"><Pill cls={TIER_CLS[a.tier]}>ICP tier {a.tier}</Pill><Pill cls={r.status === 'Customer' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>{r.status}</Pill></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Stat k="Engineers / employees" v={`${num(a.engineers, 0)} / ${num(a.employees, 0)}`} />
            <Stat k="Open pipeline" v={`${money(r.open)} (${openDeals.length})`} />
            <Stat k="Closed won (2Q)" v={money(r.wonAmount)} />
            <Stat k="Renewal" v={r.renewal ? `${money(r.renewal.arr)} · ${fmtDate(r.renewal.renewalDate)}` : '—'} extra={r.health && <Pill cls={RISK_CLS[r.health.risk]}>{r.health.risk}</Pill>} />
          </div>
          {warnings.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {warnings.map((w) => <div key={w} className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{w}</div>)}
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Buying committee" subtitle={`${covered.size} of ${KEY_ROLES.length} key roles engaged`}>
            <ul className="divide-y divide-slate-100 text-sm">
              {people.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <div><div className="font-medium text-slate-800">{p.name}</div><div className="text-xs text-slate-500">{p.title} · {p.role}</div></div>
                  <div className="text-right">
                    <Pill cls={p.engaged ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}>{p.engaged ? 'Engaged' : 'Not engaged'}</Pill>
                    <div className="mt-0.5 whitespace-nowrap text-xs text-slate-400">{p.lastContacted ? `Last touch ${fmtDate(p.lastContacted)}` : 'Never contacted'}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1">
              {KEY_ROLES.map((role) => <Pill key={role} cls={covered.has(role) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}>{covered.has(role) ? '✓' : '✗'} {role}</Pill>)}
            </div>
          </Card>

          <Card title="Opportunities" subtitle="Click to open and edit.">
            <ul className="divide-y divide-slate-100 text-sm">
              {[...r.deals].sort((x, y) => y.closeDate.localeCompare(x.closeDate)).map((d) => (
                <li key={d.id} className="flex cursor-pointer items-center justify-between gap-2 py-2 hover:bg-slate-50" onClick={() => openDeal(d.id)}>
                  <div><div className="font-medium text-slate-800">{d.product}{d.type === 'Expansion' ? ' Expansion' : ''}</div><div className="text-xs text-slate-500">Close {fmtDate(d.closeDate)} · {d.source}</div></div>
                  <div className="flex items-center gap-2"><StageBadge stage={d.stage} /><span className="w-14 text-right tabular-nums">{money(d.amount)}</span></div>
                </li>
              ))}
              {!r.deals.length && <li className="py-2 text-slate-500">No opportunities yet.</li>}
            </ul>
          </Card>
        </div>

        <Card title="Activity timeline" subtitle={`${timeline.length} activities`}>
          <div className="mb-4 flex flex-wrap gap-2">
            <select className="input w-auto" value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value as ActivityType })}>
              {(['Call', 'Email', 'Meeting', 'Demo', 'Note'] as ActivityType[]).map((t) => <option key={t}>{t}</option>)}
            </select>
            <input className="input min-w-48 flex-1" placeholder="Log an activity, e.g. Call with CTO about POC scope" value={note.subject} onChange={(e) => setNote({ ...note, subject: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && log()} />
            <select className="input w-auto" value={note.dealId} onChange={(e) => setNote({ ...note, dealId: e.target.value })}>
              <option value="">No related deal</option>
              {openDeals.map((d) => <option key={d.id} value={d.id}>{d.product} · {d.stage}</option>)}
            </select>
            <button className="btn-primary" onClick={log}>Log</button>
          </div>
          <ol className="relative space-y-3 border-l border-slate-200 pl-5">
            {(showAll ? timeline : timeline.slice(0, 12)).map((x) => {
              const Icon = ICON[x.type]
              return (
                <li key={x.id} className="relative text-sm">
                  <span className="absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200"><Icon size={11} /></span>
                  <div className="flex justify-between gap-3"><span className="text-slate-800">{x.subject}</span><span className="shrink-0 text-xs text-slate-400">{fmtDate(x.date)}</span></div>
                  <div className="text-xs text-slate-500">{x.type} · {repName(x.ownerId)}{x.dealId ? ` · ${state.deals.find((d) => d.id === x.dealId)?.product ?? ''}` : ''}</div>
                </li>
              )
            })}
          </ol>
          {timeline.length > 12 && <button className="mt-3 text-sm text-indigo-600 hover:underline" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `Show all ${timeline.length}`}</button>}
        </Card>
      </>
    )
  }
}

function Stat({ k, v, extra }: { k: string; v: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{k}</div>
      <div className="mt-0.5 flex items-center gap-2 font-medium text-slate-800">{v}{extra}</div>
    </div>
  )
}
