# Cursor Rules

---  
Project
- Name: Pawser Platform
- Monorepo: Turborepo + pnpm
- Apps: portal (Next.js 14), admin (Next.js 14), api (Express), worker (BullMQ)
- Packages: database (Prisma), shared (types, tenancy, crypto), ui (shared components)

Hard constraints
- All DB/cache operations are scoped by organizationId (org_id)
- Encrypt/decrypt ShelterLuv API keys with AES‑256‑GCM (ENCRYPTION_KEY)
- Sync cadence by tier: trial=30m, basic=15m, pro=5m, enterprise=2m
- Handle ShelterLuv 429: exponential backoff + jitter; respect Retry‑After
- Never expose adopter PII; we store animal data only
- At least one owner per organization; prevent removal of last owner

Coding standards
- TypeScript strict; eslint+prettier
- Validate all inputs with zod
- Use async/await; no promise nesting
- Prefer pure functions in @pawser/shared and thin controllers in apps/api
- Error handling: never swallow; log to Sentry with context
- Use `'use client'` directive for interactive components in Next.js

Architecture patterns
- Tenancy: resolve org by Host header OR URL path param → attach orgId to request context
- Redis keys: tenant:{orgId}:animals:list and tenant:{orgId}:animal:{id}
- BullMQ job key: tenant:{orgId}:sync (dedupe)
- R2 path: tenant/{orgId}/{animalId}/{hash}.jpg
- Idempotent upsert: (organizationId, externalId)
- API surface (org‑scoped): GET /api/v1/animals, GET /api/v1/animals/:id
- Feature flags: PostHog when needed

Security
- JWT access+refresh with rotation; scrypt passwords (bcrypt fallback)
- RBAC: super_admin (global), owner, admin, viewer (org-scoped)
- CSP on Next.js; sanitize any HTML from ShelterLuv if present
- Rate limiting per tenant; audit sensitive actions
- Row-Level Security (RLS) in PostgreSQL for tenant isolation

Email
- Provider: Resend (primary)
- Templates: React Email components
- Queue: BullMQ for async delivery
- Types: magic-link, invitation, password-reset, trial-ending

Testing
- vitest for unit; msw for integration; Playwright for portal E2E
- tsc --noEmit and eslint must pass before merge

Git & CI
- Conventional Commits
- PRs require green checks: typecheck, lint, unit tests
- Build caching via Turbo in CI
- Preview deploys to Vercel; Fly deploys with tags

Docs
- 1-PRD/{date}/ contains versioned PRDs
- Developer handbook is source of truth
- Keep diagrams as Mermaid where possible

Package naming
- @pawser/database
- @pawser/shared
- @pawser/ui

---
