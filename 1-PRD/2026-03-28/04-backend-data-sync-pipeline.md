# Data Sync Pipeline

> **Type:** Backend PRD
> **Feature:** Data Sync Pipeline
> **Priority:** Phase 1
> **Status:** ✅ Complete
> **Last Updated:** 2026-03-28
> **Source:** CodeSpring PRD `31207066-e7e9-4474-a68d-370a9f6d3b2f`
>
> **Implementation Notes:**
> - ✅ BullMQ worker at `apps/api/src/jobs/sync-animals.ts` — auto-starts on API import
> - ✅ ShelterLuv API integration via `ShelterLuvService` (paginated fetch, type transforms)
> - ✅ Status filtering: filters for `Available For Adoption` from ShelterLuv
> - ✅ Manual sync trigger via `POST /api/v1/sync/:orgId`
> - ✅ Sync history and status via `GET /api/v1/sync/:orgId/status`
> - ✅ Tier-gated scheduling: trial=30m, basic=15m, pro=5m, enterprise=2m
> - ✅ Idempotent upserts keyed by `(orgId, externalId)`
> - ✅ 429 handling: exponential backoff with jitter
> - ✅ `SyncRun` + `SyncState` records created per job
> - 🟡 Status configuration pending (PRD-15 — multi-select sync/display statuses)
> - 🟡 R2 media upload worker needs production testing
> - 🟡 Email alerts on sync failure not implemented (depends on PRD-12)

---

## Feature Overview

Automated, multi-tenant pipeline to fetch data from ShelterLuv, transform to the platform's canonical schema, upsert into PostgreSQL, sync media to R2, and invalidate caches. Supports tier-gated scheduling, manual triggers, idempotent jobs, and reliable retries. Ensures low-latency updates while respecting external API limits and tenant isolation.

## Requirements

### Scheduling

- **Per-tenant cadence enforced by plan:**
  - Trial: 30 min
  - Basic: 15 min
  - Pro: 5 min
  - Enterprise: 2 min
- Single active sync per tenant (distributed lock). Queue subsequent requests.
- Store `last_successful_sync_at` and `last_attempted_sync_at` per tenant.

### Job Orchestration

- **BullMQ queues:** `sync:enqueue`, `sync:worker`, `media:worker`
- **Job types:** incremental (default since last_successful_sync_at), full (backfill), media-only
- Exponential backoff (max 5 retries), dead-letter queue, job metrics (duration, records processed, failures)

### External Fetch

- Use tenant-scoped ShelterLuv credentials (AES-256-GCM encrypted at rest)
- Incremental fetch preferred (If-Modified-Since/ETag if supported; fallback to since timestamp)
- Rate limit: default 5 r/s per tenant; global ceiling configurable. Respect 429 with retry-after.

### Transform & Validation

- Normalize species, breed, sex, age, size, color, status to canonical enums; reject/flag unknowns
- Timezone normalization to UTC; ISO-8601 formatting
- Sanitize text (strip HTML, control chars); limit length (name 128, description 10k)
- Drop PII fields not required for public listings
- Validate referential integrity (locations, organizations); create or map as needed

### Upsert & Delete Handling

- Upsert keyed by `external_id + tenant_id`; compare source `updated_at` to prevent stale overwrites
- Soft-delete records not present in source on incremental (tombstone with `deleted_at`); full sync reconciles
- Maintain `external_entity_map` for cross-references

### Media Sync (Photos/Videos)

- Resolve media URLs, dedupe by content hash/etag, upload to Cloudflare R2, set cache-control
- Update DB with R2 URLs; mark missing/broken media; retry transient failures
- Purge/refresh CDN if asset replaced

### Cache Invalidation

- On upsert/delete, publish events to Redis pub/sub: `entity.updated|deleted` with `tenant_id`, `entity`, `ids`
- Evict Redis API caches for affected keys; trigger page revalidation hooks where applicable
- **Target cache purge latency:** < 2s from DB commit

### Security & Auth

- Admin/manual endpoints require JWT with RBAC: owner/admin; super admin for cross-tenant ops
- Verify active subscription/trial before scheduling; enforce cadence floor by plan
- Encrypt external credentials; audit access and changes

### Observability

- Log per job: counts (fetched/transformed/upserted/deleted), duration, error summary
- Emit metrics (success rate, age of data per tenant, API error rates). Alert on failure spikes
- Sentry error reporting with tenant context (no PII)

### Performance Targets

- Handle 50k animals/tenant; chunk processing (≤500 records/batch)
- Typical incremental sync p95 < 60s; end-to-end staleness within plan cadence + 2 min
- Postgres upsert p95 < 50ms/record under load

## API Endpoints

### POST /api/v1/tenants/{tenantId}/sync

**Auth:** owner/admin JWT

**Body:**
```json
{
  "mode": "incremental" | "full",
  "entities": ["animals", "media", "locations"],
  "idempotencyKey": "string",
  "reason": "string"
}
```

**Response:** `202 { jobId, scheduledAt }`

### GET /api/v1/tenants/{tenantId}/sync/status

**Query:** `?jobId={id}`

**Auth:** owner/admin

**Response:**
```json
{
  "status": "queued" | "running" | "succeeded" | "failed",
  "startedAt": "timestamp",
  "finishedAt": "timestamp",
  "stats": {},
  "error": "string"
}
```

### GET /api/v1/tenants/{tenantId}/sync/config

**Auth:** owner/admin

**Response:**
```json
{
  "planCadenceMinutes": 15,
  "nextRunAt": "timestamp",
  "lastSuccessfulSyncAt": "timestamp"
}
```

### POST /api/v1/webhooks/shelterluv (optional)

**Auth:** HMAC header

Triggers targeted incremental sync. Respond `202`.

## User Stories

1. As an owner, I can manually trigger a full sync and track status to resolve data drift.
2. As an admin, my portal reflects ShelterLuv changes within my plan's cadence.
3. As support, I can initiate a cross-tenant re-sync and see clear failure reasons.

## Technical Considerations

- Prevent concurrent tenant syncs via Redis lock (ttl ≥ job timeout)
- Idempotency: accept Idempotency-Key header or derive from tenantId+time window to dedupe enqueues
- **Store fields:** `tenant_integrations(api_key iv, tag)`, `sync_runs(jobId, mode, stats)`, `external_entity_map`, `media_assets`
- Respect ShelterLuv schema changes by feature-flagged mappers; unknown fields logged, not fatal

## Success Criteria

| Metric | Target |
|--------|--------|
| Job success rate | ≥ 99% over 7-day rolling window |
| Data staleness (p95) | Within cadence + 2 minutes |
| PII leakage | Zero to public indices |
| Credentials logging | Never |
| Cache invalidation (p95) | < 2 seconds from upsert/delete |
| Diagnostics | Support can diagnose failures from logs/metrics |

## Implementation Status

✅ Basic sync worker implemented  
✅ Tier-gated scheduling  
✅ ShelterLuv API integration  
✅ Animal upsert/transform  
⚠️ Missing: Media worker (R2 upload)  
⚠️ Missing: Cache invalidation pub/sub  
⚠️ Missing: Full job metrics dashboard
