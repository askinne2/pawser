# Auth & RBAC

> **Type:** Backend PRD  
> **Feature:** Authentication & Role-Based Access Control  
> **Priority:** Phase 1  
> **Status:** 🟡 Partial  
> **Source:** CodeSpring PRD `701707f1-8294-41f9-8669-00c741c40d59`
>
> **Implementation Notes:**
> - ✅ JWT authentication working
> - ✅ Login/logout flow
> - ✅ Role definitions (super_admin, owner, admin, viewer)
> - ✅ Middleware for auth protection
> - 🟡 Magic link flow needs testing
> - 🟡 Session invalidation on password change needs testing
> - 🟡 Some RBAC enforcement gaps in API routes

---

## Feature Overview

Implements multi-tenant authentication (email/password and magic link) and role-based access control. Supports global super_admin and tenant-scoped owner, admin, viewer roles. Ensures secure session management, token lifecycle, invitation flows, and strict tenant isolation.

## Requirements

### Identity

- Unique email per user (case-insensitive), optional password (magic-link-only accounts allowed)
- **Password policy:** min 10 chars; block known-compromised passwords; scrypt hashing (bcrypt fallback)
- Email verification via magic link for first login; single-use, 15-minute TTL

### Sessions & Tokens

- Access token (JWT, 15 min or 24h in dev) + refresh token (rolling, 30 days). Refresh revocable server-side.
- Store refresh sessions (Redis) by jti; revoke on logout, password change, role/membership changes, or admin action.
- Support `httpOnly`, `Secure`, `SameSite=Lax` cookies and `Authorization: Bearer` header.

### Magic Link

- Issue for login and invitations; 15-minute TTL; single-use; 202 response on request (no user enumeration)

### Multi-Tenant & RBAC

**Roles:**
- `super_admin` (global)
- `owner`, `admin`, `viewer` (tenant-scoped)

**Rules:**
- A user may belong to multiple tenants with different roles
- At least one owner per tenant; prevent demote/remove of last owner
- Role hierarchy: `super_admin > owner > admin > viewer`
- Tenant context resolved from Host header (custom domain) or X-Tenant-Id; super_admin may specify any tenant

**Authorization gate checks:**
- Account enabled
- Email verified
- Tenant status not suspended
- If tenant past_due/canceled, restrict to billing/owner-only endpoints (read-only otherwise)

### Invitations

- Owner/admin can invite by email with target role
- Token TTL 7 days; idempotent create
- Existing users join on accept

### Security & Abuse Controls

- **Rate limit:** login/magic-link/reset (e.g., 5/min per IP and email), global burst protection
- **Lockout:** after 10 failed password attempts, 15-minute lock; return generic error
- Encrypt sensitive tokens at rest (AES-256-GCM). All endpoints require TLS.

### Audit

**Log events:**
- `login_success/failure`
- `magic_link_issued/redeemed`
- `password_reset_requested/completed`
- `role_changed`
- `member_added/removed`
- `session_revoked`

## API Endpoints

### POST /v1/auth/register

**Body:** `{ email, password?, tenantName }`

Creates user, tenant, membership(owner). Returns tokens and user + memberships. 409 if email exists.

### POST /v1/auth/login

**Body:** `{ email, password }`

**Response:** `{ access_token, refresh_token, user, memberships }`

401 on failure; 423 if locked.

### POST /v1/auth/magic-link

**Body:** `{ email, purpose: "login" | "invite" }`

**Response:** 202 Accepted always.

### POST /v1/auth/magic-link/verify

**Body:** `{ token }`

Returns tokens and user + memberships; consumes token. 400/410 if invalid/expired/used.

### POST /v1/auth/refresh

**Body:** `{ refresh_token }` or cookie

Returns new tokens; rotates refresh. 401/403 if revoked.

### POST /v1/auth/logout

**Body:** `{ refresh_token? }` or current session

Revokes session; 204 No Content.

### POST /v1/auth/password/forgot

**Body:** `{ email }`

202 Accepted; issues reset token (1-hour TTL).

### POST /v1/auth/password/reset

**Body:** `{ token, newPassword }`

204 No Content; revokes sessions for user.

### GET /v1/auth/me

**Response:** `{ user, memberships, sessions? }`

### RBAC Management (tenant-scoped)

**GET /v1/tenants/:tenantId/members** (admin+)

**POST /v1/tenants/:tenantId/invitations** `{ email, role }` (admin+)

**PUT /v1/tenants/:tenantId/members/:userId/role** `{ role }` (owner only; prevent removing last owner)

**DELETE /v1/tenants/:tenantId/members/:userId** (owner; not last owner; cannot remove self if sole owner)

## Technical Considerations

### JWT Claims

```json
{
  "sub": "userId",
  "tid": "tenantId context",
  "roles": ["array per tenant"],
  "rid": "active role",
  "jti": "unique id",
  "iat": "issued at",
  "exp": "expiration",
  "ver": "version"
}
```

On tenant-scoped requests, require `tid` present and membership validation.

### Data Model (key fields)

```
users(id, email, password_hash?, is_super_admin, email_verified_at, disabled_at, created_at)
tenants(id, name, slug, status, plan_tier, trial_ends_at)
memberships(user_id, tenant_id, role, created_at) unique(user_id, tenant_id)
sessions(id/jti, user_id, refresh_hash, user_agent, ip, expires_at, revoked_at)
invitations(id, tenant_id, email, role, token_hash, expires_at, accepted_at)
```

### Error Codes

| Status | Code |
|--------|------|
| 400 | validation_error |
| 401 | unauthorized |
| 403 | forbidden |
| 404 | not_found |
| 409 | conflict |
| 410 | gone |
| 423 | locked |
| 429 | rate_limited |

## User Stories

1. As a tenant owner, I can invite an admin via email and they can join via magic link.
2. As an admin, I can manage members but cannot change billing or remove the last owner.
3. As a user, I can log in with password or magic link and switch between my tenants.
4. As a super_admin, I can access any tenant's admin endpoints for support.

## Success Criteria

| Metric | Target |
|--------|--------|
| Auth-related error rate | < 1% |
| Login latency (P95) | < 300ms (excluding email delivery) |
| Token rotation | Verified working; no active sessions after password reset |
| RBAC enforcement | Unit/integration tests cover role and tenant boundaries |
| Last owner protection | Attempts to demote blocked |
| Audit logging | All sensitive actions logged and visible in Sentry/analytics |

## Implementation Status

✅ Email/password login  
✅ JWT access/refresh tokens  
✅ Role hierarchy checks  
✅ Basic auth middleware  
⚠️ Missing: Magic link UI flow  
⚠️ Missing: Password reset UI (see PRD-13)  
⚠️ Missing: Rate limiting  
⚠️ Missing: Account lockout
