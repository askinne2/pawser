# Pawser Platform — Developer Handbook

Status: MVP build  
Scope: Portal (Next.js), Admin (Next.js), API (Express), Worker (BullMQ)  
Runtime: Vercel (portal/admin), Fly.io (API/worker)  
Infra: Postgres, Redis, Cloudflare R2, Stripe, Sentry, GA4, PostHog

Contents
- Quickstart
- Monorepo & Code Standards
- Environments & Secrets
- Tenancy Model
- Data Model
- API Contracts
- Sync Pipeline
- Images & CDN
- Auth & RBAC
- Billing & Tiers
- Analytics & Observability
- Security Baselines
- Testing Strategy
- CI/CD & Deployment
- Local Dev Playbook
- Open TODOs

## Quickstart

Prereqs
- Node 20+, pnpm, Docker
- Fly CLI, Vercel CLI, Cloudflare account
- Postgres + Redis locally (docker compose provided)

Install
- pnpm i
- pnpm -w build

Run (dev)
- pnpm dev:portal
- pnpm dev:admin
- pnpm dev:api
- pnpm dev:worker

.env.examples (copy to each app as needed)
- DATABASE_URL=postgresql://user:pass@localhost:5432/pawser
- REDIS_URL=redis://localhost:6379
- ENCRYPTION_KEY=32-byte-hex-or-base64
- SHELTERLUV_BASE_URL=https://www.shelterluv.com/api/v1
- STRIPE_SECRET_KEY=sk_test_...
- STRIPE_WEBHOOK_SECRET=whsec_...
- SENTRY_DSN=...
- GA4_ID=G-XXXXXXX
- POSTHOG_KEY=phc_...
- CF_R2_ACCOUNT_ID=...
- CF_R2_ACCESS_KEY_ID=...
- CF_R2_SECRET_ACCESS_KEY=...
- CF_R2_BUCKET=pawser-images
- JWT_SECRET=32-byte-hex
- EMAIL_FROM=no-reply@pawser.app
- EMAIL_PROVIDER_API_KEY=...

## Monorepo & Code Standards

Structure
- apps/
  - portal (Next.js 14 App Router)
  - admin (Next.js 14 App Router)
  - api (Express + zod)
  - worker (BullMQ)
- packages/
  - db (Prisma client + schema)
  - core (tenancy, SL API client, crypto)
  - ui (shared components)
- docs/ (this handbook, feature specs)

Conventions
- TypeScript strict; eslint + prettier
- Commit: Conventional Commits
- Paths: use tsconfig baseUrl + path aliases (@pawser/database, @pawser/shared, @pawser/ui)
- Feature flags: via PostHog if needed

## Environments & Secrets

Envs
- dev (local), preview (PR), prod

Where secrets live
- Vercel: env vars per project (portal/admin)
- Fly.io: fly secrets set ... (api/worker)
- Prisma migrations run from apps/api

## Tenancy Model

Resolution
- Host header → OrganizationDomain → organizationId
- Subdomains: {org}.pawser.app
- Custom domains: Cloudflare-managed, automatic SSL

Rules
- All DB queries must filter by organizationId
- Redis keys prefixed tenant:{orgId}:*
- R2 paths prefixed tenant/{orgId}/...

Roles
- SUPER_ADMIN (platform), OWNER (org), ADMIN, VIEWER

## Data Model (Prisma overview)

Tables
- Organization(id, slug, name, subdomain, status, subscriptionTier, stripeCustomerId?, stripeSubscriptionId?, createdAt, updatedAt)
- OrganizationDomain(id, organizationId, domain, isPrimary, verifiedAt?)
- OrganizationCredentials(id, organizationId, apiKeyCiphertext, apiKeyNonce, updatedAt)
- OrganizationSetting(id, organizationId, key, value JSONB)
- CachedAnimal(id, organizationId, shelterluvInternalId, animalData JSONB, cachedAt, expiresAt, UNIQUE(orgId, shelterluvInternalId))
- User(id, email, passwordHash, fullName)
- OrganizationUser(id, organizationId, userId, role)

Invariants
- No cross-tenant reads/writes
- Upserts keyed by (organizationId, shelterluvInternalId)
- Credentials encrypted with AES-256-GCM using ENCRYPTION_KEY

## API Contracts (org-scoped by host)

GET /api/animals
- Query: species? (dog|cat|other), q?, page=1, pageSize=24
- Returns: { items: AnimalCard[], page, pageSize, total }

GET /api/animals/:id
- Returns: full animal detail

Responses (normalized)
- AnimalCard: { id, name, species, breed, age, size, gender, status, photoUrl }
- AnimalDetail adds: photos[], description, temperament flags, weight, spayNeuter, vaccinations

CORS
- Allow portal/admin origins only; env-based

## Sync Pipeline

Intervals (hard-gated)
- trial: 30m, basic: 15m, pro: 5m, enterprise: 2m

Flow
1) Scheduler enqueues tenant:sync jobs respecting tier
2) Worker fetches decrypted API key
3) ShelterLuv GET /animals?status_type=publishable (paginate)
4) Transform → upsert CachedAnimal per record
5) Delete stale (not seen this run)
6) Invalidate Redis caches
7) Update lastSyncAt

Resilience
- 429: honor Retry-After; backoff: 2^n + jitter
- Dedupe key: tenant:{orgId}:sync
- Concurrency: 1 per tenant, global limiter
- Telemetry: job metrics + Sentry capture

## Images & CDN

Source
- ShelterLuv image URLs

Storage
- Worker copies originals to Cloudflare R2 at tenant/{orgId}/{animalId}/{hash}.jpg

Delivery
- Option A (default): public R2 + Cloudflare cache
- Option B: R2 private + signed URLs (Cloudflare Worker)

Variants
- Consider a Worker to resize on-the-fly (thumb, card, detail)

## Auth & RBAC

AuthN
- Email/password (Argon2id) + magic link (time-limited token)

AuthZ
- SUPER_ADMIN: platform management
- OWNER/ADMIN/VIEWER: scoped by organizationId

Tokens
- JWT access + refresh (rotation, revoke on logout)

## Billing & Tiers (Stripe)

Products/Prices
- Basic $49, Pro $99, Enterprise $249 (monthly+annual)
- Trial: 14 days

Webhooks (api)
- customer.subscription.updated → update Organization.subscriptionTier
- invoice.payment_failed → flag org

Enforcement
- Scheduler reads tier to set sync cadence

## Analytics & Observability

- GA4 on portal
- PostHog on admin/app (events, optional feature flags)
- Sentry: portal, admin, api, worker (release tags)
- Uptime: Better Stack monitors for portal, api

## Security Baselines

- HTTPS required everywhere
- Prisma parameterized queries
- Input validation: zod on all handlers
- CSP headers on Next.js
- Rate limiting: per-tenant at API gateway
- Audit log sensitive ops (credentials update)

## Testing Strategy

- Unit: vitest (core, API handlers)
- Integration: msw for API, Prisma test DB
- E2E: Playwright for portal critical flows
- Worker: job tests with test Redis
- Lint/type: eslint, tsc --noEmit in CI

## CI/CD & Deployment

CI (GitHub Actions)
- pnpm install, turbo cache, lint, typecheck, tests
- build per app
- preview deployments to Vercel
- Fly deploy api/worker on main (or with release tags)

Prod
- Vercel: portal/admin
- Fly.io: api/worker + Postgres (Fly PG) + Redis (Upstash/Fly)
- Cloudflare: DNS (wildcard + custom domains), R2

## Local Dev Playbook

- Add a tenant: seed script creates Organization, OrganizationDomain
- Add credentials: POST /admin/org/:id/credentials with API key (encrypted)
- Trigger sync: POST /admin/org/:id/sync-now or BullMQ UI
- View portal: http://{subdomain}.localhost:3000

## Open TODOs (MVP)

- Decide PostHog vs Mixpanel (default: PostHog)
- Cloudflare Worker for image resizing (optional)
- Stripe tax settings (USD default)
