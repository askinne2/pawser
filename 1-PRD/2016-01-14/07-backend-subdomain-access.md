# Subdomain Access

> **Type:** Backend PRD  
> **Feature:** Multi-Tenant Subdomain Routing  
> **Priority:** Phase 1  
> **Status:** ✅ Complete  
> **Source:** CodeSpring PRD `cfdc0076-f7a2-4c89-8e31-747b7cb1bf07`
>
> **Implementation Notes:**
> - ✅ Slug-based tenant resolution
> - ✅ Organization lookup by slug
> - ✅ Portal routing via `[domain]` param

---

## Feature Overview

Provide multi-tenant routing via subdomains in the format `{org}.pawser.app`. Incoming requests are mapped to an Organization (tenant) by subdomain, enforcing tenant scoping for all backend/API operations and enabling safe, cacheable public access. Supports slug assignment/updates with strict validation, uniqueness, and operational safeguards.

## Requirements

### Host-to-Tenant Resolution

- Resolve tenant by the first DNS label of the Host header: `slug = host.split('.')[0]`
- Only accept hosts ending with `.pawser.app`; reject apex and non-matching domains with 404 `TENANT_NOT_FOUND`
- Normalize to lowercase; ignore port. Do not trust X-Forwarded-Host unless from trusted proxies

**Tenant status handling:**
| Status | Response |
|--------|----------|
| suspended | 403 `ORG_SUSPENDED` |
| deleted/disabled | 410 `ORG_DISABLED` |
| unknown | 404 `TENANT_NOT_FOUND` |

### Tenant Context Enforcement

- All backend API routes (except auth callbacks and global status) must derive `tenantId` from host resolution and disallow cross-tenant identifiers in params/body
- For routes with explicit `orgId`, reject if `orgId != resolved tenantId` unless `role=super_admin`
- Attach `X-Tenant-Id` and `X-Tenant-Slug` headers on responses for observability (omitted for public pages if considered sensitive)

### Subdomain (Slug) Management

#### GET /orgs/subdomain/availability

**Query:** `?slug=`

**Response 200:**
```json
{
  "slug": "happy-tails",
  "available": true,
  "reason": "reserved" | "in_use" | "invalid"
}
```

#### PATCH /orgs/:orgId/subdomain

**Auth:** owner|admin of org; super_admin bypass

**Body:** `{ slug: string }`

**Validations:**
- Pattern: `^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$` (3–63 chars, lowercase alnum + hyphen, no leading/trailing hyphen)
- Disallow prefixes `xn--` and `--` (double hyphen at positions 3–4) to avoid IDN homograph (punycode)
- **Reserved slugs:** www, admin, api, app, portal, billing, status, static, cdn, files, images, sso, oauth, support, docs, help, mail, mta, ftp
- **Uniqueness:** case-insensitive across all orgs; enforce 90-day hold on previously used slugs
- **Cooldown:** max 1 change per org per 7 days; rate-limited 5/min per user, 30/hour per org

**Responses:**
| Status | Code |
|--------|------|
| 200 | `{ orgId, slug, previousSlug, changedAt }` |
| 400 | `INVALID_SLUG` |
| 403 | `RESERVED_SLUG` |
| 409 | `SLUG_TAKEN` |
| 429 | `RATE_LIMITED` |

**Side effects:** invalidate cache, audit log entry `SUBDOMAIN_CHANGED` with actor, before/after, IP

### Caching and Performance

- Cache host→tenant mapping in Redis: TTL 5m; negative-cache (not found) 1m
- **Target p95 tenant resolution latency:** ≤ 20ms from cache, ≤ 100ms on DB
- Evict/refresh cache on org status/slug updates

### Error Model (JSON)

```json
{
  "error": {
    "code": "TENANT_NOT_FOUND",
    "message": "Organization not found"
  }
}
```

### HTTP/Cache Headers

- Set `Vary: Host` on cacheable endpoints
- Enforce HTTPS; reject http with 308 redirect handled at edge/CDN
- Set `HSTS max-age=15552000 includeSubDomains preload` where permitted

## User Stories

1. **Visitor:** As an adopter, when I visit `{org}.pawser.app`, I see the correct organization's portal or receive a clear unavailable message if suspended.
2. **Org Owner/Admin:** I can set and update my organization's subdomain, receiving validation feedback and immediate routing changes.
3. **Support/SRE:** I can resolve a host to tenant metadata for debugging.

## Technical Considerations

### Internal Resolution API

**GET /internal/tenant/resolve**

**Query:** `?host={host}`

**Response 200:**
```json
{
  "tenantId": "uuid",
  "orgId": "uuid",
  "slug": "happy-tails",
  "status": "active",
  "plan": "pro",
  "canonicalHost": "happy-tails.pawser.app",
  "cacheTTL": 300
}
```

403/404/410 as per status, with error codes above.

**Restrictions:** trusted network/API key; rate limit 100 RPS per IP

### Security

- Trust proxy headers only from Cloudflare/Vercel IPs; otherwise use raw Host
- Cookies should be host-only (no parent-domain cookies) to prevent cross-tenant bleed; `SameSite=Lax`, `Secure`

### Logging/Monitoring

Log events:
- `unknown_host`
- `reserved_slug_attempt`
- `slug_change`

Metrics for cache hit/miss; tag Sentry/PostHog with `tenantId` and `slug`

## Success Criteria

| Metric | Target |
|--------|--------|
| Tenant isolation | 100% requests serve only resolved tenant data |
| Cross-tenant leakage | Zero in audits |
| Resolution latency (p95) | ≤ 20ms (cached) |
| Cache hit rate | ≥ 90% |
| Subdomain update propagation | ≤ 60 seconds globally |
| TENANT_NOT_FOUND error rate | ≤ 0.5% of total traffic |
| Internal endpoint success | ≥ 99.9% |

## Implementation Status

✅ Tenant resolution middleware  
✅ Redis caching for tenant lookup  
✅ Subdomain routes  
✅ URL path-based routing (local dev)  
⚠️ Missing: Custom domain UI management  
⚠️ Missing: DNS verification flow  
⚠️ Missing: Reserved slug enforcement
