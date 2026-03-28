# Stripe Billing & Trials

> **Type:** Backend PRD
> **Feature:** Stripe Billing & Subscription Management
> **Priority:** Phase 1
> **Status:** 🔲 Planned
> **Last Updated:** 2026-03-28
> **Source:** CodeSpring PRD `18925c52-0de0-4aa0-b896-e7c3da672714`
>
> **Implementation Notes:**
> - ✅ `Plan`, `Subscription`, `Invoice` Prisma models defined
> - ✅ Sync interval gated by plan tier (`syncIntervalSeconds` on `Plan` record)
> - ✅ `billing.ts` route file exists at `apps/api/src/routes/billing.ts`
> - ✅ Billing page scaffold at `apps/admin/app/(dashboard)/billing/page.tsx`
> - ✅ Seed script creates trial plan and assigns org to 14-day trial on first run
> - 🔲 Stripe SDK not integrated — no customer/subscription creation
> - 🔲 Checkout session (`POST /billing/checkout-session`) not implemented
> - 🔲 Billing portal session (`POST /billing/portal-session`) not implemented
> - 🔲 Stripe webhook handling not implemented
> - 🔲 Trial expiry enforcement not implemented
> - 🔲 Plan upgrade/downgrade UI not implemented

---

## Feature Overview

Implement tenant-scoped subscription billing via Stripe with a single 14-day trial per tenant, tiered products/prices, and robust webhook processing. Subscription status must gate data sync intervals per tier. Provide secure backend APIs for checkout, billing portal, plan discovery, and status.

## Requirements

### Data Model (PostgreSQL via Prisma)

**tenants table additions:**
- `stripe_customer_id`
- `stripe_subscription_id`
- `subscription_status` (enum: trialing|active|past_due|unpaid|canceled|incomplete|incomplete_expired)
- `plan_tier` (enum: free|basic|pro|enterprise)
- `plan_price_id`
- `current_period_end` (ts)
- `trial_end` (ts)
- `cancel_at` (ts|null)
- `cancel_at_period_end` (bool)
- `trial_used_at` (ts|null)
- `sync_interval_seconds` (int)
- `billing_email`

**billing_events table:**
- `id`
- `tenant_id`
- `stripe_event_id` (unique)
- `type`
- `payload` (jsonb)
- `processed_at`

**price_catalog table:**
- `stripe_price_id` (pk)
- `product_id`
- `nickname`
- `currency`
- `unit_amount`
- `interval` (month|year)
- `plan_tier`
- `sync_interval_seconds`
- `active` (bool)

### API Endpoints (JWT auth, tenant-scoped; RBAC: owner/admin only)

#### GET /api/billing/plans

Returns active plans from price_catalog.

**Response 200:**
```json
[{
  "priceId": "price_xxx",
  "tier": "pro",
  "amount": 9900,
  "currency": "usd",
  "interval": "month",
  "syncIntervalSeconds": 300,
  "trialDays": 14
}]
```

#### GET /api/billing/status

**Response:**
```json
{
  "status": "active",
  "tier": "pro",
  "priceId": "price_xxx",
  "trialEnd": "2026-01-28T00:00:00Z",
  "currentPeriodEnd": "2026-02-14T00:00:00Z",
  "cancelAt": null,
  "cancelAtPeriodEnd": false,
  "syncIntervalSeconds": 300
}
```

#### POST /api/billing/checkout-session

**Body:** `{ priceId, interval? }`

**Logic:**
- Validates `priceId` in `price_catalog.active` and tenant eligibility for trial
- Creates/attaches `stripe_customer` (metadata: tenantId), creates Checkout Session (mode=subscription, allow_promotion_codes=true)
- Trial: include `trial_period_days=14` only if `trial_used_at` is null and no active/trialing subscription

**Responses:**
- 200: `{ url, sessionId }`
- 400: invalid price
- 409: ineligible trial

#### POST /api/billing/portal-session

Creates Stripe Billing Portal session for tenant's customer.

**Response 200:** `{ url }`

#### POST /api/stripe/webhook (no JWT; Stripe signature required)

Verifies signature; idempotent on `stripe_event_id`; enqueues processing.

### Webhook Handling (enqueue with BullMQ; ack fast)

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Map session to tenant via metadata, persist customer/subscription IDs |
| `customer.subscription.created/updated` | Upsert subscription_status, plan_price_id, plan_tier (via price_catalog), current_period_end, trial_end, cancel flags; set trial_used_at when entering trialing first time; update tenant.sync_interval_seconds per plan |
| `customer.subscription.deleted` | Set subscription_status=canceled; downgrade tier to free; set sync_interval_seconds to free-tier |
| `invoice.payment_succeeded/failed` | Update status fields and emit analytics events |
| `customer.subscription.trial_will_end` | Update status, emit analytics |

**All webhook side effects must be idempotent and logged to billing_events.**

### Business Rules

- **One 14-day trial per tenant** (enforced by `trial_used_at`)
- Only active/trialing tenants retain paid-tier sync intervals; others revert to free-tier interval immediately on status change
- Proration: accept Stripe defaults
- Currency: USD. Stripe Tax out of scope.
- Only price IDs present in `price_catalog` (seeded/managed by ops) are allowed

### Validation and Security

- Tenant context from JWT; verify RBAC
- Verify `priceId` active; prohibit cross-tenant operations
- Webhook signature verification with endpoint secret; reject if invalid
- Do not store card PAN; store minimal Stripe IDs and timestamps

## User Stories

1. As a tenant owner, I can start a subscription with a 14-day trial and upgrade/downgrade plans.
2. As an admin, I can access the Stripe Billing Portal to update payment methods or cancel.
3. As the system, I automatically downgrade sync frequency when a subscription lapses or a trial ends.

## Technical Considerations

- **Idempotency:** dedupe webhook events by `stripe_event_id` (unique index); use Redis locks if needed
- **Performance:** webhook endpoint responds <500ms; heavy work offloaded to BullMQ; retry with exponential backoff
- **Consistency:** nightly job verifies subscription states against Stripe and reconciles tenant records
- **Observability:** Sentry for errors; PostHog/GA for key events; structured logs for billing_events
- **Configuration:** separate Stripe keys and webhook secrets per env; allowlist price IDs via price_catalog; metadata includes tenantId
- **Migration:** backfill price_catalog; add new columns to tenants; default existing tenants to free-tier

## Success Criteria

| Metric | Target |
|--------|--------|
| Webhook processing | 99% successful within 1 minute |
| Duplicate side effects | Zero |
| Checkout success | 95% for eligible tenants |
| Sync interval accuracy | 100% reflect current plan within 1 minute of Stripe event |
| Trial enforcement | 0 instances of multiple trials per tenant |
| Stripe/DB consistency | < 1% discrepancy (reconciled within 24h) |

## Implementation Status

✅ BillingService scaffolded  
✅ Billing routes scaffolded  
⚠️ Missing: Stripe API integration  
⚠️ Missing: Checkout flow  
⚠️ Missing: Webhook handlers  
⚠️ Missing: Admin billing UI
