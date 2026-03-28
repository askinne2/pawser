# Portal Migration Guide: shelterluv_app → apps/portal

This document is the authoritative reference for porting components from the standalone
`shelterluv_app` React app into the Pawser multi-tenant Next.js portal.

---

## Type System Mapping

The `shelterluv_app` types map to Pawser's canonical `@pawser/shared` types and the Prisma
`Animal` model as follows. When porting any component, replace every left-column field
reference with the right-column equivalent.

### Animal Fields

| shelterluv_app (`Animal`) | Pawser portal (`animal` from Prisma) | Notes |
|---|---|---|
| `animal.ID` | `animal.externalId` | Shelterluv's public-facing ID |
| `animal.InternalID` | `animal.id` | Pawser's internal UUID (use for URLs/keys) |
| `animal.Name` | `animal.name` | |
| `animal.Type` | `animal.species` | Lowercased: `"dog"`, `"cat"`, `"other"` |
| `animal.Status` | `animal.status` | Normalized: `"available"`, `"pending"`, `"adopted"` |
| `animal.Photos` (string[]) | `animal.mediaAssets` (array of `{url, isPrimary, orderIndex}`) | Primary photo: `mediaAssets.find(m => m.isPrimary)?.url` |
| `animal.CoverPhoto` | `animal.mediaAssets.find(m => m.isPrimary)?.url` | Falls back to `mediaAssets[0]?.url` |
| `animal.Breed` | `animal.breedPrimary` | Secondary breed: `animal.breedSecondary` |
| `animal.Color` | `animal.color` | |
| `animal.Age` (string: "2 years") | `animal.ageYears` + `animal.ageMonths` (integers) | Format helper: see below |
| `animal.Sex` | `animal.sex` | Lowercased: `"male"`, `"female"`, `"unknown"` |
| `animal.Size` | `animal.size` | Lowercased: `"small"`, `"medium"`, `"large"`, `"xlarge"` |
| `animal.Description` | `animal.description` | Plain text or raw HTML from Shelterluv |
| `animal.AdoptionURL` | `animal.adoptionUrl` | External Shelterluv adoption form URL |
| `animal.AdoptionFeeGroup.Price` | Not stored in Pawser schema | Omit — not in DB |
| `animal.isStanleySteemerPet` | Not applicable | GHHS-specific feature — do not port |
| `animal.LastIntakeUnixTime` | `animal.intakeDate` | Stored as `Date` in Pawser |

### Age Formatting Helper

The `shelterluv_app` stores age as a formatted string (`"2 years"`, `"6 months"`).
Pawser stores it as two integers. Use this helper wherever age is displayed:

```typescript
function formatAge(years: number | null, months: number | null): string {
  const parts: string[] = [];
  if (years && years > 0) parts.push(years === 1 ? '1 year' : `${years} years`);
  if (months && months > 0) parts.push(months === 1 ? '1 month' : `${months} months`);
  return parts.length > 0 ? parts.join(', ') : 'Unknown age';
}
```

### Attributes

`shelterluv_app` reads boolean attributes from a flat `Attributes` object on the raw API response.
In Pawser, attributes are stored in `animal.attributes` (JSON column) with these keys:

```typescript
// Cast as: const attrs = animal.attributes as Record<string, boolean> | null
attrs?.goodWithDogs   // boolean
attrs?.goodWithCats   // boolean
attrs?.goodWithKids   // boolean
attrs?.houseTrained   // boolean
attrs?.spayedNeutered // boolean
attrs?.specialNeeds   // boolean
attrs?.microchipped   // boolean
attrs?.vaccinated     // boolean
```

---

## Routing

| shelterluv_app (HashRouter) | Pawser portal (Next.js App Router) |
|---|---|
| `/#/` or `/#/animals` | `/{slug}/animals` |
| `/#/animal/:animalSlug` | `/{slug}/animals/[id]` |
| `getAnimalDetailPath(name, id)` | `` `/${domain}/animals/${animal.slug}` `` |

The `animal.slug` in Pawser is pre-generated during sync as `{name-lowercased}-{last8ofExternalId}`.
No slug generation needed in the portal — read `animal.slug` directly from the DB result.

---

## Data Fetching

**Critical difference:** `shelterluv_app` fetches data client-side via `useAnimals` / `useAnimal`
hooks that call the Shelterluv API directly. The Pawser portal uses **Next.js SSR** — data is
fetched server-side in `page.tsx` via Prisma and passed as props to components.

- Do **not** port `useAnimals.ts` or `useAnimal.ts` hooks into the portal.
- Do **not** port `src/api/api.ts` — the portal talks to Prisma directly.
- Components that were class-based or used hooks for data must be refactored to accept
  data as props, with the `page.tsx` handling all DB queries.
- Interactive client components (filters, gallery, lightbox) still use `'use client'` and
  receive their initial data as props via server component parents.

---

## Components: Port vs. Rebuild

### Port directly (adapt types only)

| Component | Source | Key changes needed |
|---|---|---|
| `AnimalCard` | `src/components/Animal/AnimalCard.tsx` | Swap type fields per mapping above; replace `Link to={path}` with Next.js `<Link href={...}>`; remove WP adopt URL logic; convert CSS classes to Tailwind |
| `AnimalDetail` (gallery + info layout) | `src/components/Animal/AnimalDetail.tsx` | Keep lightbox (`yet-another-react-lightbox`); swap type fields; remove `useAnimal` hook — receives `animal` as prop; remove WP env calls |
| `RelatedAnimals` | `src/components/Animal/RelatedAnimals.tsx` | Receives `animals` as prop instead of fetching; swap type fields |
| `Pagination` | `src/components/common/Pagination.tsx` | Port as-is; replace router push with Next.js `useRouter` |
| `AnimalFilters` / `AnimalFiltersSidebar` | `src/components/Animal/AnimalFilters.tsx` | Port filter UI; replace URL state logic with Next.js `useSearchParams` + `useRouter` (already done in existing `FilterSidebar.tsx` — merge/upgrade) |

### Rebuild from scratch (do not port)

| Component | Reason |
|---|---|
| `App.tsx` | Replaced by Next.js App Router layout |
| `StylesProvider` / `StylesReset` | Replaced by Tailwind + `globals.css` |
| `useAnimals` / `useAnimal` hooks | Replaced by SSR in `page.tsx` |
| `StanleySteemerPage` | GHHS-specific, not part of Pawser |
| `getEnvironment()` / WordPress env config | Replaced by Next.js env vars and Prisma tenant context |
| `src/api/api.ts` | Replaced by Prisma queries in page server components |

---

## Missing Dependencies

The following packages are used in `shelterluv_app` components being ported but are **not yet
in `apps/portal/package.json`**. Add them before porting:

```bash
pnpm --filter @pawser/portal add yet-another-react-lightbox react-loading-skeleton @heroicons/react
```

| Package | Used in | Version in source |
|---|---|---|
| `yet-another-react-lightbox` | `AnimalDetail` photo gallery lightbox | `^3.21.7` |
| `react-loading-skeleton` | `AnimalList`, `AnimalDetail` loading states | `^3.5.0` |
| `@heroicons/react` | Filter icons, UI icons | `^2.2.0` |

---

## File Placement Convention

All ported components go co-located with the page that uses them, inside a `_components/`
folder (the underscore prefix prevents Next.js from treating them as routes):

```
apps/portal/app/[domain]/
  animals/
    page.tsx                          ← server component (SSR, Prisma queries)
    _components/
      AnimalCard.tsx                  ← 'use client' — ported from shelterluv_app
      AnimalGrid.tsx                  ← thin wrapper, can be server component
      FilterSidebar.tsx               ← 'use client' — already exists, upgrade it
      Pagination.tsx                  ← ported from shelterluv_app
    [id]/
      page.tsx                        ← server component (SSR, Prisma query)
      _components/
        AnimalDetail.tsx              ← 'use client' — ported from shelterluv_app
        AnimalGallery.tsx             ← 'use client' — lightbox gallery
        RelatedAnimals.tsx            ← server component (receives animals as prop)
        AttributeBadges.tsx           ← simple presentational component
```

---

## CSS Strategy

`shelterluv_app` uses dedicated `.css` files (`AnimalCard.css`, `AnimalDetail.css`, etc.).

**Do not** copy `.css` files into the portal. Convert all styles to Tailwind utility classes.
Key mappings from the source CSS patterns:

- Card hover shadow → `hover:shadow-md transition-shadow`
- Card image zoom on hover → `group-hover:scale-105 transition-transform duration-300`
- Status badge → `absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium`
- Back button → `inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900`
- Detail grid → `grid grid-cols-1 lg:grid-cols-2 gap-8`
- Thumbnail strip → `grid grid-cols-4 gap-2 mt-3`
- Attribute badge → `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm`

---

## Tenant Theming

The `shelterluv_app` reads colors from `wpSettings` (WordPress config object).
In the portal, the tenant's `primaryColor` is available:

- Server components: passed from `layout.tsx` via props or fetched from `resolveTenant()`
- Client components: available on `window.__TENANT__.primaryColor` (set in `layout.tsx`)
  or passed as a prop from the parent server component (preferred)

Use it as a CSS custom property or inline style only for the brand accent color.
All structural styles use Tailwind.

---

## What's Already Built in apps/portal

Do not re-implement these — they exist and work:

- `app/[domain]/layout.tsx` — tenant resolution, header, footer, CSS custom property injection
- `app/[domain]/animals/page.tsx` — SSR animal list with filters, pagination, facets
- `app/[domain]/animals/[id]/page.tsx` — SSR animal detail with photos, attributes, adoption CTA
- `app/[domain]/animals/FilterSidebar.tsx` — desktop sidebar + mobile drawer (upgrade, don't replace)
- `app/api/tenant/route.ts` — tenant API route

The existing pages are functional but use inline styles and lack the component quality of
`shelterluv_app`. The goal is to **upgrade** them with ported components, not rewrite from zero.
