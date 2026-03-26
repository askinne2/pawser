# Tenant Management (Admin Dashboard)

> **Type:** Frontend PRD  
> **Feature:** Admin Dashboard  
> **Source:** CodeSpring PRD `948fad95-3d4c-4fc8-ac51-55278283871c`

---

## Feature Overview

Provide super admins a centralized UI to view, create, and manage tenant organizations, including tier assignment, account status, trial/billing state, domains, and sync health. Includes a list view with filters/sorts and an organization detail view with editable profile, plan, and operational status.

## Requirements

### Access & RBAC
- **Super Admin:** full access (list/create/edit/suspend/archive/change tier/impersonate).
- **Owner/Admin (their org only):** read-only for tier/billing; can edit profile fields (name/logo/domains).
- **Viewer:** no access.
- Unauthorized states show 403 message with link back to dashboard.

### Tenant List View

**Table columns:**
- Name (logo + name + org ID tooltip)
- Tier (badge)
- Account Status (Active/Suspended/Archived)
- Billing Status (Trialing/Active/Past Due/Canceled)
- Domains (primary + count)
- Sync (Last/Next)
- Created At
- Actions

**Controls:**
- Global search (name, slug, domain, org ID)
- Filters (Tier multi-select, Account Status, Billing Status, Trial remaining: 0/1–7/8–14 days, Sync health)
- Sort (Name A/Z, Created desc, Last Sync desc)

**Pagination:** 25 per page; server-driven; query params persist filter/sort/page.

**Bulk actions (checkbox selection):** Suspend, Resume, Export CSV.

**Row actions menu:** View Details, Change Tier, Suspend/Resume, Archive, Impersonate (with confirmation), Copy Org ID.

**Empty states:** No results (show clear filters), First-time (prompt to "Create Organization").

**Loading:** skeleton rows; error banner with retry.

### Create Organization (Dialog)

**Fields:**
- Name (required)
- Slug (auto from name; editable; validate lowercase/[-a-z0-9])
- Owner Email (optional; info note)
- Tier (required; select)
- Start Trial (default 14 days; editable end date)
- Primary Domain (optional; validate)
- Timezone (default America/New_York)
- Locale (en-US)

**Buttons:** Create (enabled on valid), Cancel. Success shows toast and navigates to detail.

### Organization Detail View

**Header:** logo, name, org ID (copy), Tier badge, Account Status badge, Billing Status pill, Trial days remaining, "More" menu (Suspend/Resume, Archive, Impersonate).

**Tabs:**

#### Overview Tab
- Editable fields (Name, Logo upload, Slug, Contact email, Timezone, Locale)
- Domains section with list (domain, primary toggle, verification status)
- Add Domain (inline add; show required DNS record)
- Remove Domain (confirm)

#### Plan & Billing Tab
- Tier selector (change confirmation modal; show current/target sync interval; note billing impact)
- Billing Status readout
- Trial start/end
- Stripe links (Open customer/subscription in new tab)

#### Sync & Health Tab
- Last sync time/status badge
- Next scheduled
- Enable Sync toggle
- "Run Sync Now" button (disabled if suspended)
- Recent sync attempts list with status and message

**Form behavior:** Save/Cancel for form changes; dirty state warning on navigate.

**Destructive confirmations:**
- Suspend (explain effects)
- Archive (irreversible UI note; hides from default list)

**Audit trail (read-only):** recent admin actions with timestamp and actor.

### UI Components

**Radix:** Dialog, Tabs, DropdownMenu, Select, Toggle, Badge, Tooltip, Toast, AlertDialog.

**Tailwind:** for layout; responsive: table collapses to cards under 768px; sticky table header/controls.

### Accessibility
- Full keyboard navigation
- Focus traps in dialogs
- ARIA roles for tabs/dialogs
- Visible focus states
- Text alternatives for logos
- Color contrast AA

## User Stories

1. As a super admin, I can filter tenants by trial ending soon to prioritize outreach.
2. As a super admin, I can change a tenant's tier and immediately see the updated sync interval.
3. As a super admin, I can suspend a tenant, preventing sync and marking UI status accordingly.
4. As a super admin, I can impersonate a tenant to diagnose configuration issues.
5. As an owner, I can update my org's name and domains but not change tier.

## Technical Considerations

- Persist UI state (filters/sorts/page/tab) via URL query params.
- Fire analytics events (GA4/PostHog):
  - `tenant_list_view`
  - `tenant_filter_apply`
  - `tenant_create`
  - `tenant_tier_change`
  - `tenant_status_change`
  - `tenant_impersonate_start`
  - `tenant_domain_add/remove`
  - `sync_run_now`
- Display external data failures (e.g., Stripe fetch) as non-blocking banners; keep local edits usable.
- Mask sensitive values; never expose secrets.
- Confirm dialogs must require explicit action.
- Log UI errors to Sentry; avoid console errors.

## Success Criteria

| Metric | Target |
|--------|--------|
| Admin task completion | 95% without errors in staging UAT |
| List view render time | < 2s with 1k tenants |
| Interaction latency | < 150ms TTI for filters/sorts |
| Accessibility | No critical issues in automated checks (axe) |
| RBAC enforcement | Zero unauthorized access confirmed via tests |
| Flow completion rate | > 80% for change-tier and create-organization |
