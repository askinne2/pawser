# Database Schema & Multi-Tenancy

> **Type:** Database PRD  
> **Feature:** Database Schema & Multi-Tenancy  
> **Priority:** Phase 1  
> **Status:** ✅ Complete  
> **Source:** CodeSpring PRD `bc169afb-40a8-48e5-b76f-1e1f6b371b42`
>
> **Implementation Notes:**
> - ✅ All models defined in `packages/database/prisma/schema.prisma`
> - ✅ Organization, User, Membership models
> - ✅ Animal, MediaAsset, SyncRun models
> - ✅ DataSource with encrypted credentials
> - ✅ Subscription, Plan for billing
> - 🟡 RLS (Row Level Security) not fully enforced
> - See PRD-15 for additional OrganizationSetting fields

---

## Feature Overview

Tenant-safe, row-level multi-tenancy for ShelterLuv-powered adoption data with org-scoped tables, encrypted integration secrets, white-label domains, and subscription-gated sync cadence. Schema supports RBAC, syncing from ShelterLuv, media storage references, auditing, and Stripe billing linkage.

## Requirements

### Multi-tenancy
- All tenant data carries `org_id`
- Enforce Postgres RLS so users only access rows for orgs where they are members
- Super admins bypass RLS

### RBAC
- Roles: `owner`, `admin`, `viewer` at membership level
- At least one owner per org
- `super_admin` at user level (global)

### White-label Domains
- Map multiple domains per org, exactly one primary
- Uniqueness across all orgs

### Integrations
- Store ShelterLuv API credentials encrypted at rest (AES-256-GCM, versioned)
- Allow multiple `data_sources` per org
- Track validation status

### Sync Governance
- Record `sync_runs` and `sync_state` per resource
- Compute `next_eligible_at` from `plan.sync_interval_seconds`
- Support manual and scheduled triggers

### Animal Catalog
- Animals linked to org and data_source, with `external_id`, `attributes` JSON, and `media_assets` referencing Cloudflare R2 URLs/keys
- Publish flags for portal

### Billing
- Plans with `sync_interval_seconds`
- Subscriptions linking orgs to Stripe entities
- Invoices snapshot key billing data

### Security & Audit
- API tokens hashed
- `audit_logs` for security-relevant changes and access
- `webhook_events` for inbound Stripe and ShelterLuv

### Constraints
- Composite uniqueness includes `org_id` where applicable
- Soft-delete supported via `deleted_at` where included

## Database Tables (19)

### organizations
| Column | Type |
|--------|------|
| id | UUID |
| name | VARCHAR(255) |
| slug | VARCHAR(64) |
| status | VARCHAR(32) |
| stripe_customer_id | VARCHAR(255) |
| timezone | VARCHAR(64) |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |
| deleted_at | TIMESTAMP |

### users
| Column | Type |
|--------|------|
| id | UUID |
| email | VARCHAR(320) |
| name | VARCHAR(255) |
| is_super_admin | BOOLEAN |
| disabled | BOOLEAN |
| last_login_at | TIMESTAMP |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### memberships
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| user_id | UUID |
| role | VARCHAR(16) |
| invited_by_user_id | UUID |
| accepted_at | TIMESTAMP |
| created_at | TIMESTAMP |

### domain_mappings
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| domain | VARCHAR(255) |
| is_primary | BOOLEAN |
| verification_status | VARCHAR(32) |
| ssl_status | VARCHAR(32) |
| cloudflare_zone_id | VARCHAR(64) |
| dns_validation_token | VARCHAR(64) |
| verified_at | TIMESTAMP |
| created_at | TIMESTAMP |

### integration_credentials
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| provider | VARCHAR(32) |
| account_label | VARCHAR(255) |
| external_account_id | VARCHAR(128) |
| scope | VARCHAR(64) |
| secret_ciphertext | TEXT |
| secret_iv | TEXT |
| secret_tag | TEXT |
| enc_version | INT |
| status | VARCHAR(32) |
| last_validated_at | TIMESTAMP |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### data_sources
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| provider | VARCHAR(32) |
| credentials_id | UUID |
| external_account_id | VARCHAR(128) |
| name | VARCHAR(255) |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### locations
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| data_source_id | UUID |
| external_id | VARCHAR(128) |
| name | VARCHAR(255) |
| address | TEXT |
| city | VARCHAR(128) |
| state | VARCHAR(64) |
| postal_code | VARCHAR(32) |
| phone | VARCHAR(32) |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### animals
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| data_source_id | UUID |
| external_id | VARCHAR(128) |
| location_id | UUID |
| name | VARCHAR(255) |
| slug | VARCHAR(255) |
| species | VARCHAR(64) |
| breed_primary | VARCHAR(128) |
| breed_secondary | VARCHAR(128) |
| age_years | INT |
| sex | VARCHAR(16) |
| size | VARCHAR(16) |
| color | VARCHAR(64) |
| status | VARCHAR(32) |
| description | TEXT |
| attributes | JSONB |
| published | BOOLEAN |
| published_at | TIMESTAMP |
| intake_date | DATE |
| birth_date | DATE |
| last_seen_at | TIMESTAMP |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### media_assets
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| animal_id | UUID |
| r2_key | VARCHAR(512) |
| url | VARCHAR(2048) |
| is_primary | BOOLEAN |
| order_index | INT |
| width | INT |
| height | INT |
| etag | VARCHAR(128) |
| sha256 | VARCHAR(64) |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### sync_runs
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| data_source_id | UUID |
| started_at | TIMESTAMP |
| finished_at | TIMESTAMP |
| status | VARCHAR(16) |
| error | TEXT |
| items_fetched | INT |
| items_upserted | INT |
| items_deleted | INT |
| trigger | VARCHAR(16) |
| created_by_user_id | UUID |

### sync_state
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| data_source_id | UUID |
| resource | VARCHAR(32) |
| cursor | JSONB |
| last_synced_at | TIMESTAMP |
| next_eligible_at | TIMESTAMP |
| backoff_seconds | INT |

### webhook_events
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| provider | VARCHAR(32) |
| event_type | VARCHAR(128) |
| external_id | VARCHAR(255) |
| payload | JSONB |
| received_at | TIMESTAMP |
| processed_at | TIMESTAMP |
| status | VARCHAR(16) |
| error | TEXT |

### audit_logs
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| actor_user_id | UUID |
| actor_type | VARCHAR(16) |
| action | VARCHAR(64) |
| entity_type | VARCHAR(64) |
| entity_id | UUID |
| metadata | JSONB |
| ip_address | VARCHAR(45) |
| created_at | TIMESTAMP |

### plans
| Column | Type |
|--------|------|
| id | UUID |
| code | VARCHAR(32) |
| name | VARCHAR(64) |
| description | TEXT |
| sync_interval_seconds | INT |
| max_admins | INT |
| price_cents | INT |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### subscriptions
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| plan_id | UUID |
| status | VARCHAR(32) |
| stripe_customer_id | VARCHAR(255) |
| stripe_subscription_id | VARCHAR(255) |
| trial_end | TIMESTAMP |
| current_period_end | TIMESTAMP |
| cancel_at | TIMESTAMP |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### invoices
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| stripe_invoice_id | VARCHAR(255) |
| status | VARCHAR(32) |
| amount_due_cents | INT |
| amount_paid_cents | INT |
| period_start | TIMESTAMP |
| period_end | TIMESTAMP |
| hosted_invoice_url | VARCHAR(2048) |
| created_at | TIMESTAMP |

### api_tokens
| Column | Type |
|--------|------|
| id | UUID |
| org_id | UUID |
| name | VARCHAR(255) |
| token_hash | VARCHAR(64) |
| scopes | VARCHAR(255) |
| last_used_at | TIMESTAMP |
| expires_at | TIMESTAMP |
| created_by_user_id | UUID |
| created_at | TIMESTAMP |

### password_credentials
| Column | Type |
|--------|------|
| user_id | UUID |
| password_hash | VARCHAR(255) |
| password_updated_at | TIMESTAMP |

### magic_links
| Column | Type |
|--------|------|
| id | UUID |
| user_id | UUID |
| org_id | UUID |
| token_hash | VARCHAR(64) |
| expires_at | TIMESTAMP |
| consumed_at | TIMESTAMP |
| created_at | TIMESTAMP |

## Technical Considerations

### RLS (Row-Level Security)
- Enable RLS on all org-scoped tables
- Policy grants to users with `memberships.role` in (owner, admin, viewer) for that org
- Super_admin may use a dedicated role or bypass connection
- Reject NULL `org_id`

### Indexes (Recommended)

| Table | Index |
|-------|-------|
| animals | `(org_id, published, status)` |
| animals | `(org_id, species)` |
| media_assets | `(animal_id, is_primary)` |
| memberships | `(org_id, user_id)` |
| domain_mappings | `(domain)` |
| sync_state | `(org_id, data_source_id, resource)` |

**Partial index:** `animals(org_id, status) WHERE published = true`

### Constraints
- Unique `(org_id, user_id)` on memberships
- Unique domain globally
- Single primary domain per org via partial unique index `WHERE is_primary = true`
- Unique `(org_id, data_source_id, external_id)` on animals and locations

### Encryption
- `integration_credentials.secret_*` stores base64-encoded AES-256-GCM ciphertext, iv, tag
- Rotate via `enc_version`
- Store `last_validated_at` and status

### Query Optimization
- Avoid cross-tenant sequential scans by prefixing queries with `org_id`
- Always include `org_id` in composite indexes
- Minimize large JSON payloads in hot paths
- Denormalize species/breed strings for filters

## Data Migration Strategies

| Phase | Description |
|-------|-------------|
| 1 | Create base tables with nullable `org_id` for backfill; add essential indexes |
| 2 | Backfill `org_id`, `external_id`, and slugs; validate uniqueness within org |
| 3 | Add NOT NULL to `org_id`; create composite uniques; enable RLS and policies |
| 4 | Migrate integration secrets to encrypted fields; set `enc_version=1`; revoke old storage |
| 5 | Create partial indexes for published animals; add foreign keys; analyze tables |
| 6 | Data retention: prune `webhook_events` and `audit_logs` > 180 days (configurable) |

## User Stories

1. As an owner, I can invite a user to my org with role admin and they see only my org's data.
2. As an admin, I can configure a custom domain and set it primary after verification.
3. As an owner, I can rotate my ShelterLuv API key without downtime; old secrets are revoked.
4. As a super admin, I can query cross-tenant metrics without RLS restrictions.

## Success Criteria

| Metric | Target |
|--------|--------|
| RLS enforcement | 100% of org-scoped queries constrained; zero cross-tenant leaks |
| Sync cadence | Enforced by `plan.sync_interval_seconds` with < 1% overdue runs |
| Query performance | P95 list-animals < 150ms for orgs up to 50k animals |
| Credential rotation | Successful without data loss; audit trail present |
| Domain uniqueness | Enforced at DB level; single primary per org |
| Stripe linkage | Consistent across billing tables |

## Implementation Status

✅ All 19 tables created in Prisma schema  
✅ AES-256-GCM encryption for credentials  
✅ Seed script with demo data  
⚠️ Missing: RLS policies enabled  
⚠️ Missing: Partial indexes  
⚠️ Missing: Data retention job
