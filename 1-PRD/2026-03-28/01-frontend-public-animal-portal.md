# Public Animal Portal

> **Type:** Frontend PRD
> **Feature:** Public Animal Portal
> **Priority:** Phase 1
> **Status:** ❌ Superseded
> **Last Updated:** 2026-03-28
> **Source:** CodeSpring PRD `8cbcd0a6-a423-4778-95d1-7bbce44c6ee4`
>
> **Implementation Notes:**
> - The Next.js SSR hosted-portal approach described in this PRD is superseded.
> - Public animal browsing is now delivered by `apps/widget` (Vite IIFE bundle, PRD-16).
> - The shelter's adopters see the widget embedded in the shelter's own website — not a Pawser-hosted page.
> - `apps/portal` is now the marketing site at `getpawser.io`, not an adoption portal.
> - The existing `apps/portal/app/[domain]/animals/` routes are preserved as a **demo/preview environment** only (sales tool, not product).
> - Filter UI (FilterSidebar, FilterDrawer) was built here but the canonical location is now `apps/widget/src/components/`.
> - See PRD-16 for the widget embed bundle specification.

---

## Feature Overview

Adopter-facing, white-labeled portal to browse, filter, and view adoptable animals from ShelterLuv-synced inventories. Optimized for SEO, performance, accessibility, and mobile-first usage with tenant-specific branding and domains.

## Requirements

### Navigation/Branding
- Tenant-branded header with logo, shelter name, primary nav ("Adopt"), and optional links (About, Contact) from tenant config.
- Footer with shelter contact info, social links, and legal (configurable). Custom domain and favicon per tenant.

### Animals Grid (List Page)
- **URL:** `/animals` with query-driven state (species, age, size, sex, color, breed, location radius if available, status; good-with dogs/cats/kids; special-needs; name search).
- **Sort:** Newest, Longest stay, Name A–Z, Distance (when location provided).
- **Cards:** 4:3 image (lazy, object-cover), name, primary breed, sex, age, size; status ribbon (Adoptable, Coming Soon, Adoption Pending), badges (good with, special needs). Clickable entire card.
- **Pagination:** 24 per page default; numbered pagination with Prev/Next; expose total results.

### Filters/Search
- **Desktop:** left sticky sidebar
- **Mobile:** top "Filters" button opening full-screen drawer with Apply/Clear.
- Multi-select facets with counts; "Clear all" and per-facet clear. Name/ID search with 300ms debounce.
- **URL sync:** all filters/sort/page encoded in query; copy/pasteable and back/forward-compatible.

### Animal Detail
- **URL:** `/animals/[slug-id]`; breadcrumb back to results (preserve query).
- Hero gallery with thumbnails; swipe on mobile; keyboard navigable; alt text.
- **Header block:** name, species, sex, age, size, weight (if provided), primary/secondary breed, status, ID.
- **Tags:** good-with, housetrained, special needs.
- **Sections:** About (sanitized rich text), Medical/Behavior notes (optional), Location (city/state only), Last updated.
- **CTA bar:** "Adopt me" (links to ShelterLuv/apply URL or contact route), Share (copy link, Facebook, X), Print. Mobile: sticky bottom CTA.
- **Shelter snippet:** logo, name, contact methods (email, phone), hours (optional).

### States
- Loading skeletons for cards/detail
- Empty state with "Adjust filters" tips
- Error with retry
- No-image placeholder

### Accessibility
- Semantic roles and labels
- Focus management for modals/drawers
- Keyboard navigable filters/gallery
- Visible focus; color contrast ≥ 4.5:1
- Skip to content; ARIA live for results count

### Responsive
- **Grid columns:** 1 (≤640px), 2 (641–768), 3 (769–1024), 4 (≥1025)
- Sticky filters on desktop; full-screen filter drawer on mobile
- Images responsive with srcset

### Theming
- Tenant theme tokens (primary/neutral colors, font family) applied via CSS variables
- Dark text on light backgrounds by default
- Status ribbons theme-aware

### SEO
- Server-render list and detail with unique meta titles/descriptions, canonical URLs, OpenGraph/Twitter cards.
- schema.org Pet JSON-LD on detail; Organization on global.
- XML sitemap per tenant; robots: noindex for hidden/non-adoptable.

### Analytics/Telemetry
**Events:**
- `view_list`
- `view_item`
- `filter_change`
- `sort_change`
- `paginate`
- `adopt_click`
- `share_click`
- `contact_click`
- `print_click`

Page view and engagement time to GA4/PostHog; Sentry for route-level errors.

### Privacy/Safety
- No personal addresses; show city/state only.
- External links open in new tab with `rel=noopener`.

## User Stories

1. As an adopter, I can filter by species, age, size, and good-with to quickly find suitable animals.
2. As an adopter, I can search by name and sort by newest or longest stay.
3. As an adopter, I can view detailed photos and information to assess fit.
4. As an adopter, I can share an animal page with friends or apply via the shelter's preferred flow.
5. As a shelter, I see my branding, domain, and contact info reflected consistently.

## Technical Considerations

- **Next.js App Router pages:** `/animals` (SSR) and `/animals/[slug-id]` (SSR); preserve query state in back navigation.
- **Image delivery:** via Cloudflare R2-backed CDN; use width/quality params and low-quality placeholders; lazy load offscreen.
- **URL slugs:** `{name}-{id}`; canonical includes tenant domain. 404/410 for removed animals.
- **Performance budgets:** LCP ≤ 2.5s (3G Fast), CLS ≤ 0.1, TTI ≤ 4s; defer non-critical scripts; prefetch detail on card hover.
- **Multi-tenant isolation:** tenant context from host; no cross-tenant leakage in sitemaps or schema data.

## Success Criteria

| Metric | Target |
|--------|--------|
| SEO indexing | 95%+ of detail pages indexed within 7 days |
| Core Web Vitals pass rate | ≥ 85% (field data) |
| Adopt click rate | ≥ 3% of detail views |
| Accessibility score | Lighthouse/axe ≥ 95 |
| Error rate (Sentry) | < 0.5% of sessions |
| Image load failures | < 1% |
| Bounce on detail | < 55% |
| Avg time on detail | ≥ 45 seconds |

## Implementation Status

✅ Basic list/detail pages implemented  
✅ Basic filters (species, sex, size, sort)  
⚠️ Missing: Advanced filters (see PRD-14)  
⚠️ Missing: Desktop sidebar layout  
⚠️ Missing: Share/Print functionality  
⚠️ Missing: Shelter contact section
