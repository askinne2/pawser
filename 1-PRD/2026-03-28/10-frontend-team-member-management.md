# Team Member Management

> **Type:** Frontend PRD
> **Feature:** Organization Team Management
> **Priority:** P0 (Critical)
> **Status:** 🟡 Partial
> **Last Updated:** 2026-03-28
> **Depends On:** PRD-05 (Auth & RBAC), PRD-09 (User Management)
>
> **Implementation Notes:**
> - ✅ API routes at `apps/api/src/routes/members.ts`
> - ✅ Team members page at `apps/admin/app/(dashboard)/organizations/[id]/members/page.tsx`
> - ✅ `Invitation` model in schema supports invite-by-email flow
> - 🟡 Invitation flow untested (email delivery depends on PRD-12)
> - 🟡 Role change action not tested end-to-end
> - 🟡 Remove member action not tested end-to-end
> - 🟡 "Last owner" guard (cannot remove last owner) present in API but untested
> - 🟡 Page not yet wired to `/api/proxy/` — uses mock data

---

## Feature Overview

Enable organization owners and admins to manage their team members directly from the admin dashboard. Includes inviting new members via email, viewing current team, changing roles, and removing members. Enforces RBAC rules including last-owner protection.

## Requirements

### Access & RBAC

| Role | Permissions |
|------|-------------|
| Super Admin | Full access to any org's team |
| Owner | Invite, view, change roles, remove (except last owner) |
| Admin | Invite, view (cannot change owner roles or remove owners) |
| Viewer | No access |

### Team Members Page (`/organizations/[id]/members`)

**Page Header:**
- Organization name + breadcrumb
- "Invite Member" button (primary)
- Member count badge

**Members Table:**
| Column | Description |
|--------|-------------|
| Avatar/Name | Profile image + full name (or email if no name) |
| Email | User email address |
| Role | owner / admin / viewer (badge) |
| Status | Active / Pending (for unaccepted invites) |
| Joined | Timestamp or "Invited on {date}" |
| Actions | Role dropdown + Remove button |

**Pending Invitations Section:**
- Separate section below active members
- Show: Email, Invited Role, Invited By, Expires At
- Actions: Resend, Cancel

**Empty state:** "No team members yet. Invite your first team member to get started."

### Invite Member Dialog

**Trigger:** "Invite Member" button

**Form fields:**
| Field | Type | Validation |
|-------|------|------------|
| Email | email input | Required, valid email format |
| Role | select | owner / admin / viewer (default: admin) |
| Personal message | textarea | Optional, max 500 chars |

**Behavior:**
- On submit: create invitation, send email, show success toast
- If email exists as user: show note "This user will be added to your organization"
- If email is new: show note "An invitation will be sent to create an account"

**Buttons:** Send Invite, Cancel

### Role Change Flow

**Trigger:** Click role dropdown in member row

**Options:** owner / admin / viewer

**Rules:**
- Owner can change any role except:
  - Cannot demote self if last owner
  - Cannot demote other owner to below admin without confirmation
- Admin can only change: admin ↔ viewer (not owner roles)

**Confirmation (for owner demotion):**
- Dialog: "Demote {name} from Owner?"
- Warning: "They will lose billing and team management access"
- Confirm / Cancel

### Remove Member Flow

**Trigger:** Click "Remove" in actions

**Confirmation dialog:**
- "Remove {name} from {org}?"
- Warning: "They will immediately lose access to this organization"
- For owners: "You cannot remove the last owner. Transfer ownership first."

**On confirm:**
- Remove membership
- Revoke active sessions for that org
- Show success toast
- Refresh member list

### Transfer Ownership (Owner only)

**Trigger:** "Transfer Ownership" in page header dropdown

**Flow:**
1. Select new owner from existing admin/owner list
2. Confirmation: "Transfer ownership to {name}? You will become an Admin."
3. On confirm: update roles, audit log entry

### API Endpoints

```
GET    /api/v1/tenants/:tenantId/members
       Response: { members: Member[], invitations: Invitation[] }

POST   /api/v1/tenants/:tenantId/invitations
       Body: { email, role, message? }
       Response: { invitation: Invitation }

DELETE /api/v1/tenants/:tenantId/invitations/:id
       Response: { success: true }

POST   /api/v1/tenants/:tenantId/invitations/:id/resend
       Response: { success: true }

PUT    /api/v1/tenants/:tenantId/members/:userId/role
       Body: { role }
       Response: { member: Member }

DELETE /api/v1/tenants/:tenantId/members/:userId
       Response: { success: true }

POST   /api/v1/tenants/:tenantId/transfer-ownership
       Body: { newOwnerId }
       Response: { success: true }
```

### UI Components

**Radix:** Dialog, DropdownMenu, Select, Badge, Toast, AlertDialog

**Tailwind:**
- Responsive table → list on mobile
- Role badges with semantic colors (owner=purple, admin=blue, viewer=gray)
- Pending invitation rows with dashed border

### Accessibility
- Keyboard navigation for all actions
- Focus management in dialogs
- ARIA labels for role selects
- Screen reader announcements for role changes

## User Stories

1. As an owner, I can invite new team members by email to collaborate on my organization.
2. As an owner, I can promote an admin to owner to share billing responsibilities.
3. As an owner, I can demote an admin to viewer to restrict their access.
4. As an owner, I can remove a team member who no longer needs access.
5. As an admin, I can invite new members but cannot modify owner permissions.
6. As an owner, I receive an error if I try to remove myself as the last owner.
7. As an invitee, I receive an email with a link to accept the invitation.

## Technical Considerations

- Invitation tokens: 7-day TTL, single-use, stored hashed
- Resend invitation: extends expiry, rate-limited (max 3 per hour per email)
- Session revocation: on role change or removal, invalidate affected JWT refresh tokens
- Email delivery via Resend (see PRD-12)
- Audit events:
  - `member_invited`
  - `member_role_changed`
  - `member_removed`
  - `ownership_transferred`
- Last owner protection enforced at API level with clear error messages

## Success Criteria

| Metric | Target |
|--------|--------|
| Invite completion rate | ≥ 90% of invites accepted within 7 days |
| Role change latency | < 500ms |
| Last owner protection | 100% enforced (no orphan orgs) |
| Invitation delivery | 99% delivered within 1 minute |
| RBAC enforcement | Zero unauthorized role changes |
