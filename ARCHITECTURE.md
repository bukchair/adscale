# AdScale AI — Production Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                     │
│   Dashboard  │  AI Modules (11 pages)  │  API Client      │
└──────────────────────────┬───────────────────────────────┘
                           │ REST API
┌──────────────────────────▼───────────────────────────────┐
│                BACKEND (Fastify + Node.js)                │
│  Auth │ Campaigns │ SearchTerms │ Recommendations         │
│  Approvals │ Audit │ Profitability │ Creative │ Budget     │
└────────┬──────────────────┬───────────────────────────────┘
         │                  │
┌────────▼──────┐   ┌───────▼────────────────────────────┐
│  PostgreSQL   │   │     Background Workers (BullMQ)     │
│  + Prisma ORM │   │  Sync │ Classify │ Optimize │ Alert │
└───────────────┘   └───────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    CORE ENGINES                         │
│  Intent Classifier  │  Query Scorer                    │
│  Negative KW Engine │  Profit Engine                   │
│  Budget Pacing      │  Creative Gen                    │
│  Optimization       │  Approval Workflow               │
│  Audit Log          │  Insights                        │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│               EXTERNAL INTEGRATIONS                     │
│  Google Ads API v19  │  Meta Graph API v19.0           │
│  WooCommerce REST v3 │  Shopify REST                   │
│  Claude AI (Anthropic)                                  │
└────────────────────────────────────────────────────────┘
```

## Implementation Roadmap

### MVP (Week 1-4)
1. Set up PostgreSQL + Redis + Prisma
2. Deploy Fastify backend with auth
3. Connect Google Ads + Meta + WooCommerce sync
4. Run basic intent classification + negative keyword detection
5. Show recommendations in dashboard

### V2 (Week 5-8)
1. Full profit engine with real COGS data
2. Budget pacing automation
3. Approval workflow for all actions
4. Audit trail
5. Automation policies

### V3 (Week 9-12)
1. Creative generation lab
2. AI-powered diagnostics
3. Multi-org / SaaS features
4. Advanced reporting
5. Shopify + TikTok integration

## Development Order

1. `cd backend && npm install`
2. `cp .env.example .env` → fill in DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY
3. `npm run db:generate` → generate Prisma client
4. `npm run db:migrate` → run migrations
5. `npm run dev` → start backend on :4000
6. `npm run worker` → start background workers
7. `cd ..` (frontend) → add NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1 to .env.local
8. Visit `http://localhost:3000/modules` to see AI modules

## Key Files

| File | Purpose |
|------|---------|
| `backend/prisma/schema.prisma` | Full database schema (25+ tables) |
| `backend/src/server.ts` | Fastify server entry point |
| `backend/src/engines/intent-classifier/` | Search intent AI engine |
| `backend/src/engines/query-scorer/` | Query scoring (0-100) |
| `backend/src/engines/negative-keyword/` | Negative KW detection |
| `backend/src/engines/profit/` | Real profit calculation |
| `backend/src/engines/budget-pacing/` | Budget pacing analysis |
| `backend/src/engines/creative-gen/` | Ad creative generation |
| `backend/src/engines/optimization/` | Decision engine |
| `backend/src/engines/approval/` | Approval workflow |
| `backend/src/engines/audit/` | Audit logging |
| `backend/src/jobs/worker.ts` | Background job worker |
| `app/modules/page.tsx` | AI modules main page |
| `app/modules/recommendations/` | Recommendations feed |
| `app/modules/search-terms/` | Search intelligence |
| `app/modules/negative-keywords/` | Negative KW center |
| `app/modules/profitability/` | Profitability center |
| `app/modules/budget/` | Budget control center |
| `app/modules/creative-lab/` | Creative generation |
| `app/modules/approvals/` | Approvals queue |
| `app/modules/audit-log/` | Audit log viewer |
| `app/modules/automation/` | Automation policies |
| `app/modules/integrations/` | Integration settings |
