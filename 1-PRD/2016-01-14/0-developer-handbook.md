# Pawser Platform — Developer Handbook

Status: Phase 2 Development  
Scope: Portal (Next.js), Admin (Next.js), API (Express), Worker (BullMQ)  
Runtime: Vercel (portal/admin), Fly.io (API/worker)  
Infra: Postgres, Redis, Cloudflare R2, Stripe, Resend, Sentry, GA4, PostHog

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
- Email System
- Billing & Tiers
- Analytics & Observability
- Security Baselines
- Testing Strategy
- CI/CD & Deployment
- Local Dev Playbook
- Phase 2 TODOs

## Quickstart

Prereqs
- Node 20+, pnpm, Docker
- Fly CLI, Vercel CLI, Cloudflare account
- Postgres + Redis locally (docker compose provided)

Install
```bash
pnpm i
pnpm -w build
```

Run (dev)
```bash
pnpm dev:portal    # localhost:3000
pnpm dev:admin     # localhost:3001
pnpm dev:api       # localhost:3002
pnpm dev:worker    # BullMQ worker
```

Database Commands
```bash
pnpm db:push       # Push schema changes
pnpm db:migrate    # Run migrations
pnpm db:seed       # Seed demo data
pnpm db:studio     # Open Prisma Studio
```

.env.example
```
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/pawser

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth
JWT_SECRET=your-32-byte-secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRY=30d

# Encryption
ENCRYPTION_KEY=your-64-char-hex-key

# Email (Resend)
RESEND_API_KEY=re_xxx
EMAIL_FROM=no-reply@pawser.app

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Cloudflare R2
CF_R2_ACCOUNT_ID=xxx
CF_R2_ACCESS_KEY_ID=xxx
CF_R2_SECRET_ACCESS_KEY=xxx
CF_R2_BUCKET=pawser-images

# Analytics
SENTRY_DSN=xxx
GA4_ID=G-XXXXXXX
POSTHOG_KEY=phc_xxx

# URLs
API_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3002
PAWSER_BASE_DOMAIN=localhost
```

## Monorepo & Code Standards

Structure
```
apps/
  portal/          # Next.js 14 App Router - Public animal portal
  admin/           # Next.js 14 App Router - Admin dashboard
  api/             # Express + Zod - REST API
  worker/          # BullMQ - Background jobs
packages/
  database/        # Prisma client + schema
  shared/          # Types, utils, crypto
  ui/              # Shared React components
1-PRD/
  {date}/          # Versioned PRD documents
```

Conventions
- TypeScript strict; eslint + prettier
- Commit: Conventional Commits
- Paths: use tsconfig baseUrl + path aliases (@pawser/database, @pawser/shared, @pawser/ui)
- Feature flags: via PostHog if needed
- Next.js: Use `'use client'` for interactive components

## Environments & Secrets

Envs
- dev (local), preview (PR), prod

Where secrets live
- Vercel: env vars per project (portal/admin)
- Fly.io: fly secrets set ... (api/worker)
- Prisma migrations run from apps/api

## Tenancy Model

Resolution
- Host header → slug extraction → Organization lookup
- URL path: `/[domain]/animals` for portal routing
- Subdomains: `{org}.pawser.app`
- Custom domains: Cloudflare-managed, automatic SSL

Rules
- All DB queries must filter by orgId
- Redis keys prefixed `tenant:{orgId}:*`
- R2 paths prefixed `tenant/{orgId}/...`

Roles (hierarchy)
1. `super_admin` (global platform access)
2. `owner` (org-level, can manage billing/members)
3. `admin` (org-level, can manage animals/settings)
4. `viewer` (org-level, read-only)

## Data Model (Prisma)

Core Tables (19 total)
- Organization, User, Membership
- PasswordCredential, MagicLink
- DomainMapping, IntegrationCredential, DataSource
- Location, Animal, MediaAsset
- SyncRun, SyncState
- Plan, Subscription, Invoice
- AuditLog, WebhookEvent, ApiToken

Key Relations
- User → Membership → Organization
- Organization → IntegrationCredential → DataSource
- DataSource → Animal → MediaAsset
- Organization → Subscription → Plan

Invariants
- No cross-tenant reads/writes (RLS enforced)
- Upserts keyed by (orgId, externalId)
- Credentials encrypted with AES-256-GCM

## API Contracts

Base URL: `/api/v1`

### Animals (org-scoped)
```
GET  /animals                    # List with filters
GET  /animals/:id               # Detail
```

### Auth
```
POST /auth/register             # Create user + org
POST /auth/login                # Email/password
POST /auth/magic-link           # Request magic link
POST /auth/magic-link/verify    # Verify magic link
POST /auth/refresh              # Refresh tokens
POST /auth/logout               # Revoke session
POST /auth/password/forgot      # Request reset
POST /auth/password/reset       # Reset password
GET  /auth/me                   # Current user
```

### Organizations
```
GET    /organizations           # List (super_admin)
POST   /organizations           # Create
GET    /organizations/:id       # Detail
PUT    /organizations/:id       # Update
DELETE /organizations/:id       # Archive
PUT    /organizations/:id/credentials  # Update API key
```

### Users (super_admin)
```
GET    /users                   # List all users
GET    /users/:id               # User detail
PUT    /users/:id               # Update user
DELETE /users/:id               # Disable user
```

### Tenants (org-scoped)
```
GET    /tenants/:id/members     # List members
POST   /tenants/:id/invitations # Invite member
PUT    /tenants/:id/members/:userId/role  # Change role
DELETE /tenants/:id/members/:userId       # Remove member
```

### Billing
```
GET  /billing/plans             # Available plans
GET  /billing/status            # Current subscription
POST /billing/checkout-session  # Create Stripe checkout
POST /billing/portal-session    # Create billing portal
POST /stripe/webhook            # Stripe webhooks
```

## Sync Pipeline

Intervals (tier-gated)
- trial: 30m, basic: 15m, pro: 5m, enterprise: 2m

Flow
1. Scheduler enqueues `tenant:sync` jobs by tier
2. Worker fetches decrypted API key from IntegrationCredential
3. ShelterLuv GET /animals with pagination
4. Transform → upsert Animal records
5. Queue media upload jobs
6. Mark stale animals (deletedAt)
7. Update SyncRun, invalidate Redis cache

Resilience
- 429: honor Retry-After; exponential backoff
- Dedupe key: `tenant:{orgId}:sync`
- Concurrency: 1 per tenant
- Telemetry: job metrics + Sentry

## Images & CDN

Flow
1. Sync extracts image URLs from ShelterLuv
2. Media worker downloads to R2: `tenant/{orgId}/{animalId}/{hash}.jpg`
3. Public URL via Cloudflare CDN

Variants (future)
- On-the-fly resize via Cloudflare Worker

## Auth & RBAC

AuthN
- Email/password (scrypt hash, bcrypt fallback)
- Magic link (15-min TTL, single-use)

AuthZ
- super_admin: full platform access
- owner/admin/viewer: org-scoped

Tokens
- Access JWT (15 min or 24h dev)
- Refresh token (30 days, rotation)

## Email System

Provider: Resend

Templates
- `magic-link`: Login/signup magic link
- `invitation`: Team member invite
- `password-reset`: Reset password link
- `trial-ending`: Trial expiration warning

Queue
- BullMQ `email` queue
- Retry with exponential backoff

## Billing & Tiers

Stripe Products
| Tier | Price | Sync Interval |
|------|-------|---------------|
| Basic | $49/mo | 15 min |
| Pro | $99/mo | 5 min |
| Enterprise | $249/mo | 2 min |

Trial: 14 days (one per tenant)

Webhooks
- `checkout.session.completed` → activate subscription
- `customer.subscription.updated` → update tier
- `customer.subscription.deleted` → downgrade to free
- `invoice.payment_failed` → flag org

## Analytics & Observability

- GA4 on portal (pageviews, adopt clicks)
- PostHog on admin (events, feature flags)
- Sentry: all apps (errors, releases)
- Structured logging: JSON, correlation IDs

## Security Baselines

- HTTPS required everywhere
- Prisma parameterized queries (no raw SQL)
- Input validation: Zod on all handlers
- CSP headers on Next.js
- Rate limiting: per-tenant, per-IP
- Audit log: sensitive operations
- RLS: PostgreSQL row-level security

## Testing Strategy

- Unit: Vitest (services, utils)
- Integration: MSW for API mocking
- E2E: Playwright for portal flows
- Worker: BullMQ test utilities
- Lint/Type: ESLint, tsc --noEmit in CI

## CI/CD & Deployment

CI (GitHub Actions)
1. pnpm install + Turbo cache
2. Lint + typecheck
3. Unit tests
4. Build all apps
5. Preview deploy (Vercel)

Prod
- Vercel: portal, admin
- Fly.io: api, worker
- Cloudflare: DNS, R2, CDN

## Local Dev Playbook

1. Start Docker services:
   ```bash
   cd shelterluv-saas/docker
   docker-compose up -d postgres redis
   ```

2. Setup database:
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

3. Start apps:
   ```bash
   pnpm dev:api      # Terminal 1
   pnpm dev:portal   # Terminal 2
   pnpm dev:admin    # Terminal 3
   ```

4. Access:
   - Portal: http://localhost:3000/demo-shelter/animals
   - Admin: http://localhost:3001/login
   - API: http://localhost:3002/health

5. Test credentials:
   - Email: `admin@pawser.io`
   - Password: `merrimack1`

## Phase 2 TODOs

### P0 - Critical
- [ ] User management pages (super_admin)
- [ ] Team member management UI
- [ ] Create organization form
- [ ] Organization settings page

### P1 - Important
- [ ] Email system (Resend integration)
- [ ] Password reset flow
- [ ] Magic link UI
- [ ] White-label theming expansion

### P2 - Nice to Have
- [ ] Portal filter enhancements
- [ ] Custom domain management UI
- [ ] Analytics dashboard
- [ ] RLS policy enforcement
