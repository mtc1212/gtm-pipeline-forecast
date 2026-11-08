# GTM Pipeline & Forecast — Brazil

An interactive CRM and forecasting simulator for a fictional Brazil sales team selling Devin and Windsurf. It walks through a weekly Strategy & GTM Operations workflow: pipeline review, forecast call, data-quality checks, next-best actions, rep coaching, renewals and QBR prep.

All companies, people and numbers are fictional. Nothing connects to a real CRM. Edits are saved in your browser (`localStorage`). **Reset data** in the sidebar restores the seed.

## Views

| View | What it shows |
| --- | --- |
| **Forecast** | Target vs. Closed Won, Commit, Best Case and a stage-weighted model. Includes gap to target, coverage, pacing marker, weekly trend, rep roll-up, a "My call to Finance" input, and what changed since the last locked call. |
| **Pipeline** | Kanban board by stage (drag to move) or table. Filter by quarter, rep, segment or search. Click a deal to edit it. |
| **Pipeline Generation** | Lead → MQL → SQL → Opportunity → Won funnel by source (Inbound, Outbound, Partner, Advisor, Event), pipeline created per month, pipeline per 100 leads, and a next-quarter plan that works back from target to the opps and leads needed. |
| **Accounts** | Company list with ICP tier, open pipeline and renewal health. Each account page shows the buying committee (role coverage), opportunities, renewal and an activity timeline where you can log calls and emails. Deal panels link to their account. |
| **Pipeline Hygiene** | Eight data-quality rules: past-due close date, stale activity, missing or overdue next step, stuck in stage, Commit without an economic buyer, Commit in an early stage, repeatedly pushed. Score by rep. |
| **Next Best Actions** | Rule-based recommendations ranked by deal value × urgency (Executive, Re-engage, Multi-thread, Accelerate, Update CRM, Qualify). |
| **Win / Loss** | Win rate by count and value, sales cycle for won vs. lost, stage-by-stage conversion with the biggest leak flagged, loss reasons, and win rate by source, industry, segment, product, deal type or rep. |
| **Rep Scorecard** | Attainment, projected attainment, coverage, win rate, average deal, cycle time, next-quarter pipeline, hygiene and a coaching signal. |
| **Renewals** | Health score from utilization, sponsor, escalations, NPS and expansion signal. Expected GRR. |
| **QBR Summary** | Auto-generated one-pager (highlights, risks, asks, top deals, source mix, loss reasons). Use Print / PDF to export it. |
| **Settings & Method** | Editable stage probabilities, stage-age benchmarks, stale threshold, coverage goal, and definitions. |

## Demo script (2 minutes)

1. **Forecast:** Commit is below target, but the weighted model is close to it. Ask which Best Case deals can move up.
2. **Pipeline:** drag a Negotiation deal to Closed Won. Go back to Forecast and the totals and "What changed" list update.
3. **Hygiene:** open a flagged deal, tick "Economic buyer engaged", then click "Log activity today". The flag clears.
4. **Rep Scorecard:** compare a rep with high coverage and poor hygiene against one with clean data and thin pipeline.
5. **QBR:** click Print / PDF.

## Run locally

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static site in dist/
npm run build:single  # one offline file: dist-single/GTM-Command-Center.html (double-click to open)
```

Built with Vite, React, TypeScript, Tailwind CSS and Recharts. Seed data is deterministic and is generated relative to today's date, so the current quarter always contains live deals.

## Code map

- `src/lib/seed.ts`: reps, accounts, deals, renewals and the baseline snapshot
- `src/lib/metrics.ts`: forecast, hygiene rules, next-best actions, rep scores, renewal health
- `src/lib/store.tsx`: state, CRM stage rules, persistence
- `src/views/*`: one file per screen
