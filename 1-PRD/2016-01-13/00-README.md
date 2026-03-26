# Pawser Platform - PRDs

> **Source:** CodeSpring Project `b879ea38-f94c-4b4d-8010-5698cfc39291`  
> **Exported:** January 14, 2026  
> **Project URL:** https://v2.codespring.app/project/b879ea38-f94c-4b4d-8010-5698cfc39291

---

## Overview

These Product Requirements Documents serve as the **guiding light** for building the Pawser Platform - a white-label, multi-tenant animal adoption portal powered by ShelterLuv.

## Document Index

| # | Type | Document | Description |
|---|------|----------|-------------|
| 01 | 🎨 Frontend | [Public Animal Portal](./01-frontend-public-animal-portal.md) | Adopter-facing portal with grid/detail views |
| 02 | 🎨 Frontend | [Admin Dashboard](./02-frontend-admin-dashboard.md) | Super admin tenant management UI |
| 03 | 🎨 Frontend | [WordPress Plugin](./03-frontend-wordpress-plugin.md) | Shortcode-based iframe embed |
| 04 | ⚙️ Backend | [Data Sync Pipeline](./04-backend-data-sync-pipeline.md) | ShelterLuv sync scheduler & worker |
| 05 | ⚙️ Backend | [Auth & RBAC](./05-backend-auth-rbac.md) | Multi-tenant auth with role-based access |
| 06 | ⚙️ Backend | [Stripe Billing](./06-backend-stripe-billing.md) | Subscription billing with trials |
| 07 | ⚙️ Backend | [Subdomain Access](./07-backend-subdomain-access.md) | Multi-tenant routing via subdomains |
| 08 | 🗄️ Database | [Schema & Multi-tenancy](./08-database-schema-multi-tenancy.md) | 19-table PostgreSQL schema with RLS |

## Reading Order (Suggested)

For building the development plan, read in this order:

1. **Database Schema** (08) - Foundation data model
2. **Auth & RBAC** (05) - Identity & access control
3. **Subdomain Access** (07) - Multi-tenant routing
4. **Data Sync Pipeline** (04) - Core sync functionality
5. **Stripe Billing** (06) - Subscription gating
6. **Public Portal** (01) - Main user-facing app
7. **Admin Dashboard** (02) - Internal management
8. **WordPress Plugin** (03) - Distribution channel

## Tech Stack Summary

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, Radix UI |
| Backend | Node.js, Express, BullMQ |
| Database | PostgreSQL 15, Prisma, Redis |
| Hosting | Vercel (apps), Fly.io (API/worker), Cloudflare R2 |
| Auth | JWT, Magic Links, RBAC |
| Billing | Stripe |

## Key Architecture Decisions

- **Multi-tenancy:** Row-level security (RLS) with `org_id` scoping
- **Sync intervals:** Tier-gated (Trial: 30m, Basic: 15m, Pro: 5m, Enterprise: 2m)
- **Credentials:** AES-256-GCM encryption at rest
- **Domains:** Subdomain-based routing (`{org}.pawser.app`)
- **Images:** Cloudflare R2 with optional Worker for resize/signing

## Success Metrics (Summary)

| Metric | Target |
|--------|--------|
| API latency (p95) | < 150ms |
| Sync job success | ≥ 99% |
| Core Web Vitals | ≥ 85% pass |
| Auth error rate | < 1% |
| Zero cross-tenant leaks | 100% |
