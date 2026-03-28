# Super Admin User Management

> **Type:** Frontend PRD
> **Feature:** User Management Dashboard
> **Priority:** P0 (Critical — super admin only)
> **Status:** 🟡 Partial
> **Last Updated:** 2026-03-28
> **Depends On:** PRD-05 (Auth & RBAC)
>
> **Implementation Notes:**
> - ✅ API routes at `apps/api/src/routes/users.ts` (`GET /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id`)
> - ✅ User list page at `apps/admin/app/(dashboard)/users/page.tsx`
> - ✅ User detail page at `apps/admin/app/(dashboard)/users/[id]/page.tsx`
> - 🟡 Pages not yet wired to real API (still use mock data); need to call via `/api/proxy/users`
> - 🟡 Impersonation flow not implemented
> - 🟡 Disable/enable user action not tested end-to-end
> - Note: These screens are visible only to `super_admin` users; RBAC enforcement in API is in place.

---

## Feature Overview

Provide super admins a centralized UI to view, search, and manage all platform users across tenants. Includes user list with filters, user detail view with membership information, and administrative actions (disable, enable, impersonate). Enables support team to diagnose user issues and manage platform-wide user accounts.

## Requirements

### Access & RBAC
- **Super Admin only:** Full access to all user management features
- **Owner/Admin/Viewer:** No access (403 Forbidden)
- Unauthorized access attempts logged to audit trail

### User List View (`/users`)

**Table columns:**
| Column | Description |
|--------|-------------|
| Avatar/Name | Profile image + full name |
| Email | Primary email address |
| Status | Active / Disabled badge |
| Super Admin | Boolean indicator |
| Orgs | Count of organization memberships |
| Last Login | Timestamp with relative time |
| Created | Account creation date |
| Actions | Dropdown menu |

**Controls:**
- Global search (name, email)
- Filters:
  - Status: Active / Disabled
  - Role: Super Admin / Regular User
  - Has Org: Yes / No (orphan accounts)
- Sort: Name A-Z, Email, Last Login desc, Created desc
- Pagination: 25 per page, server-driven

**Row actions menu:**
- View Details
- Disable / Enable (toggle)
- Impersonate (with confirmation dialog)
- Copy User ID

**Empty states:**
- No results: "No users match your filters" + Clear filters button
- First-time: N/A (seed data always present)

**Loading:** Skeleton rows; error banner with retry

### User Detail View (`/users/[id]`)

**Header:**
- Avatar (large), Name, Email
- Status badge (Active/Disabled)
- Super Admin badge (if applicable)
- "More" menu: Disable/Enable, Impersonate, Copy ID

**Sections:**

#### Profile Section
| Field | Editable | Notes |
|-------|----------|-------|
| Name | Yes | Text input |
| Email | Read-only | Cannot change email |
| Super Admin | Yes (checkbox) | Confirmation required |
| Status | Yes (toggle) | Enable/Disable |
| Created At | Read-only | |
| Last Login | Read-only | |

#### Organization Memberships Section
- Table of all orgs user belongs to:
  - Org Name (link to org detail)
  - Role (owner/admin/viewer)
  - Joined At
  - Actions: Remove from org

#### Audit Trail Section
- Recent actions involving this user
- Timestamp, action, actor

### Impersonation Flow

**Trigger:** Click "Impersonate" from user list or detail

**Confirmation dialog:**
- Warning text: "You will be logged in as this user. Your actions will be logged."
- Show target user email
- Confirm / Cancel buttons

**On confirm:**
1. API generates impersonation token with audit trail
2. Redirect to portal/admin with impersonation banner
3. Banner shows: "Impersonating {user.email}" + "End Session" button
4. All actions logged with `impersonator_id` in audit

**End impersonation:**
- Click banner button or navigate to `/admin/end-impersonation`
- Redirect back to admin user list

### API Endpoints

```
GET    /api/v1/users
       Query: search, status, isSuperAdmin, hasOrg, sort, page, perPage
       Response: { users: User[], total: number }

GET    /api/v1/users/:id
       Response: { user: User, memberships: Membership[], auditLogs: AuditLog[] }

PUT    /api/v1/users/:id
       Body: { name?, isSuperAdmin?, disabled? }
       Response: { user: User }

DELETE /api/v1/users/:id/memberships/:orgId
       Response: { success: true }

POST   /api/v1/users/:id/impersonate
       Response: { token: string, redirectUrl: string }

POST   /api/v1/auth/end-impersonation
       Response: { success: true }
```

### UI Components

**Radix:** Dialog (impersonation confirm), DropdownMenu, Badge, Toggle, Tooltip, Toast

**Tailwind:**
- Responsive table → cards on mobile (<768px)
- Sticky header and controls
- Color-coded status badges

### Accessibility
- Full keyboard navigation
- Focus traps in dialogs
- ARIA roles for interactive elements
- Visible focus states
- Color contrast ≥ 4.5:1

## User Stories

1. As a super admin, I can search for a user by email to quickly find their account.
2. As a super admin, I can disable a user account to prevent access.
3. As a super admin, I can impersonate a user to diagnose their configuration issues.
4. As a super admin, I can view all orgs a user belongs to and their role in each.
5. As a super admin, I can remove a user from an org without affecting their other memberships.
6. As a super admin, I can grant or revoke super admin privileges.

## Technical Considerations

- Persist UI state (filters/sorts/page) via URL query params
- Impersonation tokens are short-lived (15 min) with jti for revocation
- All impersonation actions logged with original actor + impersonated user
- Fire analytics events:
  - `user_list_view`
  - `user_detail_view`
  - `user_status_change`
  - `user_impersonate_start`
  - `user_impersonate_end`
- Log UI errors to Sentry

## Success Criteria

| Metric | Target |
|--------|--------|
| Admin task completion | 95% without errors in staging UAT |
| List view render time | < 1.5s with 10k users |
| Search latency | < 500ms |
| Impersonation audit | 100% of sessions logged |
| RBAC enforcement | Zero unauthorized access |
