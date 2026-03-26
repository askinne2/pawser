# Pawser Platform — Product Requirements

> **Version:** 2.1 (2016-01-14)  
> **Status:** Active Development  
> **Last Updated:** January 14, 2026

---

## Overview

Pawser is a multi-tenant SaaS platform that synchronizes animal data from ShelterLuv and serves white-labeled public adoption portals. This document set defines Phase 1 & 2 requirements.

## Architecture Summary

| Layer | Tech Stack |
|-------|------------|
| **Portal** | Next.js 14 (App Router), SSR |
| **Admin** | Next.js 14 (App Router), Client Components |
| **API** | Express.js, Zod validation |
| **Worker** | BullMQ, Redis |
| **Database** | PostgreSQL + Prisma ORM |
| **Cache** | Redis |
| **Storage** | Cloudflare R2 |
| **Billing** | Stripe |
| **Email** | Resend |

## Domain Conventions

| Environment | Portal | Admin | API |
|-------------|--------|-------|-----|
| Local | `http://{slug}.localhost:3000` | `http://localhost:3001` | `http://localhost:3002` |
| Production | `https://{slug}.pawser.app` | `https://admin.pawser.app` | `https://api.pawser.app` |

---

## PRD Status Tracker

### Phase 1: Foundation ✅

| PRD | Feature | Status | Notes |
|-----|---------|--------|-------|
| **01** | Public Animal Portal | ✅ Complete | Basic portal working, needs customization (PRD-15) |
| **02** | Admin Dashboard | 🟡 Partial | Organization list/detail working, needs polish |
| **03** | WordPress Plugin | ✅ Complete | Shortcode embedding working |
| **04** | Data Sync Pipeline | ✅ Complete | ShelterLuv sync working (status filtering fixed) |
| **05** | Auth & RBAC | 🟡 Partial | JWT auth working, some RBAC enforcement needed |
| **06** | Stripe Billing | 🔲 Scaffolded | Models exist, integration pending |
| **07** | Subdomain Access | ✅ Complete | Multi-tenant routing working |
| **08** | Database Schema | ✅ Complete | All models defined |

### Phase 2: Enhanced Features

| PRD | Feature | Status | Notes |
|-----|---------|--------|-------|
| **09** | User Management | 🟡 Scaffolded | API + UI scaffolded, needs testing |
| **10** | Team Members | 🟡 Scaffolded | API + UI scaffolded, needs testing |
| **11** | Org Settings | 🟡 Scaffolded | API + UI scaffolded, needs testing |
| **12** | Email System | 🟡 Scaffolded | Service + worker created, needs testing |
| **13** | Password Reset | 🟡 Scaffolded | API + UI created, needs testing |
| **14** | Portal Filters | 🟡 Scaffolded | FilterSidebar created, needs testing |
| **15** | Portal Customization | 🔲 Planning | Status config + appearance settings |

### Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Complete - Feature fully implemented and tested |
| 🟡 | Partial/Scaffolded - Code exists but needs testing/polish |
| 🔲 | Planning - PRD defined, implementation not started |
| ❌ | Blocked - Cannot proceed (dependency/blocker) |

---

## Next Steps (Recommended Order)

### Immediate (Bug Fixes)
1. ✅ Fix sync status filtering (`Available For Adoption` vs `Available`) — **DONE**
2. Test sync completion and verify animals appear on portal
3. Test password reset flow end-to-end

### Short Term (Phase 2 Testing)
4. Test PRD-09: User Management (super admin features)
5. Test PRD-10: Team Member invitations and role changes
6. Test PRD-11: Organization settings persistence
7. Test PRD-12: Email delivery (magic links, invitations)
8. Test PRD-14: Portal filter sidebar/drawer

### Medium Term (New Development)
9. Implement PRD-15: Portal Customization Settings
   - Status configuration (multi-select sync/display statuses)
   - Appearance settings (colors, styles, custom CSS)
10. Complete PRD-06: Stripe Billing integration

---

## PRD Documents

### Phase 1 (Foundation)
- [PRD-01: Public Animal Portal](./01-frontend-public-animal-portal.md)
- [PRD-02: Admin Dashboard](./02-frontend-admin-dashboard.md)
- [PRD-03: WordPress Plugin](./03-frontend-wordpress-plugin.md)
- [PRD-04: Data Sync Pipeline](./04-backend-data-sync-pipeline.md)
- [PRD-05: Auth & RBAC](./05-backend-auth-rbac.md)
- [PRD-06: Stripe Billing](./06-backend-stripe-billing.md)
- [PRD-07: Subdomain Access](./07-backend-subdomain-access.md)
- [PRD-08: Database Schema](./08-database-schema-multi-tenancy.md)

### Phase 2 (Enhanced Features)
- [PRD-09: User Management](./09-frontend-user-management.md)
- [PRD-10: Team Member Management](./10-frontend-team-member-management.md)
- [PRD-11: Organization Settings](./11-frontend-org-settings-whitelabel.md)
- [PRD-12: Email System](./12-backend-email-system.md)
- [PRD-13: Password Reset](./13-backend-password-reset.md)
- [PRD-14: Portal Filters](./14-frontend-portal-filter-enhancements.md)
- [PRD-15: Portal Customization](./15-frontend-portal-customization-settings.md)

## Quick Links

- [Developer Handbook](./0-developer-handbook.md)
- [Cursor Rules](./0-cursorrules.md)
- [Database Schema (PRD-08)](./08-database-schema-multi-tenancy.md)
