# Pawser Platform — Product Requirements

> **Version:** 3.0 (2026-03-28)
> **Status:** Active Development
> **Last Updated:** March 28, 2026

---

## Product Definition

Pawser is a backend SaaS for animal shelters. Shelters pay a subscription, connect their ShelterLuv account via API key, and receive an embeddable JavaScript widget (`<script>` tag + `<div id="pawser-root">`) they drop into their existing website.

**This is not a hosted portal.** Pawser does not host adoption pages. It provides the infrastructure and embed bundle that powers adoption browsing on the shelter's own site.

---

## Architecture Summary

| Surface | URL | Tech | Purpose |
|---------|-----|------|---------|
| `apps/portal` | `getpawser.io` | Next.js 14 | Marketing site — explains product, drives sign-up |
| `apps/admin` | `app.getpawser.io` | Next.js 14 | Shelter dashboard — connect, configure, embed |
| `apps/widget` | `cdn.getpawser.io/widget.js` | Vite + React (IIFE) | Embeddable bundle — adopters browse animals |
| `apps/api` | `api.getpawser.io` | Express + Zod | REST API — all data operations |

| Layer | Tech |
|-------|------|
| Worker | BullMQ (inside `apps/api`) |
| Database | PostgreSQL + Prisma (25 models) |
| Cache | Redis |
| Storage | Cloudflare R2 |
| Billing | Stripe (scaffolded) |
| Email | Resend (scaffolded) |

---

## Architecture Changes from Original PRDs

Three decisions changed from v1:

**1. `apps/portal` is a marketing site, not a hosted animal portal.**
The original PRD-01 described a Next.js SSR portal at `{org}.pawser.app` that shelters would embed or send adopters to. That approach is superseded. The `apps/portal` Next.js app is now `getpawser.io` — a marketing site explaining the product with a hero, features section, pricing, and sign-up flow. The `apps/portal/app/[domain]/` routes are preserved as a demo/preview environment only, not the product.

**2. The public animal-browsing experience is `apps/widget` (Vite IIFE bundle), not Next.js SSR pages.**
Adopters browse animals on the shelter's own website via an embedded widget. The widget is a self-contained Vite-bundled IIFE (`widget.js` + `widget.css`) that mounts on `<div id="pawser-root">`, reads `window.pawserSettings`, and fetches data from the Pawser API. This replaces the hosted-portal and WordPress-iframe delivery models.

**3. The Kindred Slate design system (from Stitch) replaces all ad-hoc styling.**
All three front-end surfaces use Kindred Slate tokens: Source Sans 3 font, Material Symbols Outlined icons, `#00113f` primary, 6-level surface tonal hierarchy, ultra-diffuse shadows only. Full spec: `1-PRD/stitch-export/DESIGN.md`.

---

## PRD Status Tracker

### Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Complete — fully implemented |
| 🟡 | Partial — scaffolded or partly built, needs work |
| 🔲 | Planned — PRD exists, not started |
| ❌ | Superseded — original approach replaced by new architecture |

---

### Phase 1: Foundation

| PRD | Feature | Status | Notes |
|-----|---------|--------|-------|
| **01** | Public Animal Portal | ❌ Superseded | Next.js SSR portal replaced by `apps/widget`. `[domain]/` routes preserved as demo/preview only. |
| **02** | Admin Dashboard | 🟡 Partial | Kindred Slate shell built. All key screens exist. Widget builder settings not yet persisted to API. |
| **03** | WordPress Plugin | ❌ Superseded | Iframe-embed model replaced by universal script-tag IIFE bundle. |
| **04** | Data Sync Pipeline | ✅ Complete | BullMQ worker, ShelterLuv integration, tier-gated scheduling, manual trigger, sync history — all working. |
| **05** | Auth & RBAC | ✅ Complete | JWT access + refresh with httpOnly cookies, org-scoped RBAC, password reset UI, OrgProvider context. |
| **06** | Stripe Billing | 🔲 Planned | Route file + DB models exist. Stripe checkout/webhook/portal not implemented. |
| **07** | Subdomain Access | ❌ Superseded | `{org}.pawser.app` subdomain model replaced by three fixed domains. Org resolved by `orgSlug` in widget config. Subdomain route file kept for backward compat. |
| **08** | Database Schema | ✅ Complete | 25 Prisma models defined and migrated. |

### Phase 2: Enhanced Features

| PRD | Feature | Status | Notes |
|-----|---------|--------|-------|
| **09** | User Management | 🟡 Partial | API routes + admin UI pages exist (`/users`, `/users/[id]`). End-to-end untested. |
| **10** | Team Members | 🟡 Partial | API routes + admin UI pages exist (`/organizations/[id]/members`). Invitation flow depends on PRD-12. |
| **11** | Org Settings | 🟡 Partial | API routes + settings page exist. Persistence and logo upload untested. |
| **12** | Email System | 🟡 Partial | EmailService + BullMQ worker exist. React Email templates not created. Resend integration untested. |
| **13** | Password Reset | 🟡 Partial | API + admin UI pages (`/forgot-password`, `/reset-password`) exist. End-to-end flow untested. |
| **14** | Portal Filters | ❌ Superseded | FilterSidebar + FilterDrawer moved to `apps/widget`. Widget scope now owns filtering UX. |
| **15** | Portal Customization | 🟡 Partial | Widget builder screen exists in admin. Settings form exists but does not yet save to API. |
| **16** | Widget Embed Bundle | 🟡 Partial | All scaffold files exist: 8 components, 2 hooks, types, Vite IIFE config. Build produces `dist/widget.js` + `dist/widget.css`. Components need production-readiness pass. |

---

## Roadmap

### P0 — Critical path to first paying customer

- [ ] `apps/widget`: Production-ready AnimalGrid, AnimalCard (hover swap), AnimalDetail (lightbox), FilterSidebar, FilterDrawer (mobile), Pagination, SkeletonCard, EmptyState
- [ ] `apps/admin`: Widget builder settings panel saves to `PUT /api/v1/organizations/:id/settings`
- [ ] `apps/admin`: Embed code page shows pre-filled script tag from live org context
- [ ] `apps/admin`: Integration onboarding wizard wired to real API (API key → test → save → first sync)
- [ ] `apps/portal`: Marketing homepage live at `getpawser.io`

### P1 — Important for launch

- [ ] Stripe billing fully wired (checkout flow, webhook handlers, plan gating)
- [ ] `apps/admin`: Billing page with current plan + Stripe portal link
- [ ] Email system (Resend integration — magic link, invitation, trial-ending templates)
- [ ] Password reset end-to-end flow tested and verified

### P2 — Post-launch

- [ ] `apps/widget`: Status configuration (PRD-15 scope — sync/display status multi-select)
- [ ] `apps/admin`: Team member management UI tested end-to-end
- [ ] Custom domain management UI
- [ ] R2 media worker (photo CDN caching) verified
- [ ] Analytics dashboard (PostHog + GA4)

---

## PRD Documents

### Phase 1 (Foundation)
- [PRD-01: Public Animal Portal](./01-frontend-public-animal-portal.md) — ❌ Superseded
- [PRD-02: Admin Dashboard](./02-frontend-admin-dashboard.md) — 🟡 Partial
- [PRD-03: WordPress Plugin](./03-frontend-wordpress-plugin.md) — ❌ Superseded
- [PRD-04: Data Sync Pipeline](./04-backend-data-sync-pipeline.md) — ✅ Complete
- [PRD-05: Auth & RBAC](./05-backend-auth-rbac.md) — ✅ Complete
- [PRD-06: Stripe Billing](./06-backend-stripe-billing.md) — 🔲 Planned
- [PRD-07: Subdomain Access](./07-backend-subdomain-access.md) — ❌ Superseded
- [PRD-08: Database Schema](./08-database-schema-multi-tenancy.md) — ✅ Complete

### Phase 2 (Enhanced Features)
- [PRD-09: User Management](./09-frontend-user-management.md) — 🟡 Partial
- [PRD-10: Team Member Management](./10-frontend-team-member-management.md) — 🟡 Partial
- [PRD-11: Organization Settings](./11-frontend-org-settings-whitelabel.md) — 🟡 Partial
- [PRD-12: Email System](./12-backend-email-system.md) — 🟡 Partial
- [PRD-13: Password Reset](./13-backend-password-reset.md) — 🟡 Partial
- [PRD-14: Portal Filters](./14-frontend-portal-filter-enhancements.md) — ❌ Superseded
- [PRD-15: Portal Customization](./15-frontend-portal-customization-settings.md) — 🟡 Partial
- [PRD-16: Widget Embed Bundle](./16-widget-embed-bundle.md) — 🟡 Partial

## Quick Links

- [Developer Handbook](./0-developer-handbook.md)
- [Cursor Rules](./0-cursorrules.md)
- [Design System](../stitch-export/DESIGN.md)
- [Database Schema (PRD-08)](./08-database-schema-multi-tenancy.md)
