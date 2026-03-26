# Cursor Rules

---  
Project
- Name: Pawser Platform
- Monorepo: Turborepo + pnpm
- Apps: portal (Next.js 14), admin (Next.js 14), api (Express), worker (BullMQ)
- Packages: db (Prisma), core (tenancy, SL API client, crypto), ui (shared)

Hard constraints
- All DB/cache operations are scoped by organizationId
- Encrypt/decrypt ShelterLuv API keys with AES‑256‑GCM (ENCRYPTION_KEY)
- Sync cadence by tier: trial=30m, basic=15m, pro=5m, enterprise=2m
- Handle ShelterLuv 429: exponential backoff + jitter; respect Retry‑After
- Never expose adopter PII; we store animal data only

Coding standards
- TypeScript strict; eslint+prettier
- Validate all inputs with zod
- Use async/await; no promise nesting
- Prefer pure functions in @core and thin controllers in apps/api
- Error handling: never swallow; log to Sentry with context

Architecture patterns
- Tenancy: resolve org by Host header → attach orgId to request context
- Redis keys: tenant:{orgId}:animals:list and tenant:{orgId}:animal:{id}
- BullMQ job key: tenant:{orgId}:sync (dedupe)
- R2 path: tenant/{orgId}/{animalId}/{hash}.jpg
- Idempotent upsert: (organizationId, shelterluvInternalId)
- API surface (org‑scoped): GET /api/animals, GET /api/animals/:id
- Feature flags: PostHog when needed

Security
- JWT access+refresh with rotation; Argon2id passwords
- RBAC: SUPER_ADMIN, OWNER, ADMIN, VIEWER
- CSP on Next.js; sanitize any HTML from ShelterLuv if present
- Rate limiting per tenant; audit sensitive actions

Testing
- vitest for unit; msw for integration; Playwright for portal E2E
- tsc --noEmit and eslint must pass before merge

Git & CI
- Conventional Commits
- PRs require green checks: typecheck, lint, unit tests
- Build caching via Turbo in CI
- Preview deploys to Vercel; Fly deploys with tags

Docs
- docs/dev-handbook.md is source of truth
- Feature specs in docs/features/*.md
- Keep diagrams as Mermaid where possible

---
