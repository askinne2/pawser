# Widget Embed Bundle

> **Type:** Frontend PRD
> **Feature:** Embeddable JavaScript Widget Bundle
> **Priority:** P0 (Critical — this is the product adopters use)
> **Status:** 🟡 Partial
> **Last Updated:** 2026-03-28
> **Depends On:** PRD-04 (Data Sync), PRD-05 (Auth & RBAC), PRD-08 (Database Schema)
>
> **Implementation Notes:**
> - ✅ `apps/widget/` package scaffolded (`@pawser/widget`)
> - ✅ Vite IIFE build config: produces `dist/widget.js` + `dist/widget.css`
> - ✅ 8 components: `AnimalGrid`, `AnimalCard`, `AnimalDetail`, `FilterSidebar`, `FilterDrawer`, `Pagination`, `SkeletonCard`, `EmptyState`
> - ✅ 2 hooks: `useAnimals`, `useAnimal`
> - ✅ `PawserSettings` + `PawserAnimal` types defined
> - ✅ HashRouter — no server required on host page
> - ✅ Build succeeds: `dist/widget.js` (~589KB unminified) + `dist/widget.css`
> - 🟡 Component implementations are scaffold-level — need production-readiness pass
> - 🟡 AnimalCard hover image swap not fully implemented
> - 🟡 Lightbox gallery (`yet-another-react-lightbox`) integration not complete
> - 🟡 FilterDrawer mobile bottom sheet needs UX polish
> - 🟡 Adoption URL (`adoptUrlBase + animal.externalId`) linking not fully tested
> - 🟡 CSS scoping (no global leakage into host page) needs verification
> - 🔲 CDN distribution at `cdn.getpawser.io/widget.js` not set up
> - 🔲 `primaryColor` from `window.pawserSettings` not yet applied to widget styles dynamically

---

## Feature Overview

The Pawser widget is a self-contained JavaScript bundle that animal shelters embed in their existing website. Adopters browse available animals, filter by species/age/size, view photo galleries, and click through to adopt — all without leaving the shelter's own site.

The widget reads configuration from `window.pawserSettings` before it mounts. It requires no backend on the host site — it fetches all data from the Pawser API directly.

This is the primary adopter-facing surface. It replaces the Next.js hosted-portal model (PRD-01) and the WordPress iframe model (PRD-03).

---

## Integration

### Embed snippet (placed before `</body>`)

```html
<script>
  window.pawserSettings = {
    apiUrl: "https://api.getpawser.io",
    orgSlug: "riverside-shelter",
    primaryColor: "#00113f",
    adoptUrlBase: "https://new.shelterluv.com/matchme/adopt/",
    animalsPerPage: 24,
    defaultSpecies: "all"
  };
</script>
<script src="https://cdn.getpawser.io/widget.js" defer></script>
<div id="pawser-root"></div>
```

### `window.pawserSettings` interface

```typescript
interface PawserSettings {
  /** Base URL of the Pawser API. Required. */
  apiUrl: string;               // e.g. "https://api.getpawser.io"

  /** Organization slug. Required. Used to scope all API calls. */
  orgSlug: string;              // e.g. "riverside-shelter"

  /** Brand color applied to buttons, active states, and accents.
   *  Falls back to Kindred Slate primary (#00113f) if omitted. */
  primaryColor?: string;        // e.g. "#2d6a4f"

  /** Base URL for adoption links. animal.externalId is appended. */
  adoptUrlBase?: string;        // e.g. "https://new.shelterluv.com/matchme/adopt/"

  /** Animals per page. Defaults to 24. */
  animalsPerPage?: number;      // 12 | 24 | 48

  /** Default species filter on first load. Defaults to "all". */
  defaultSpecies?: string;      // "dog" | "cat" | "other" | "all"
}
```

---

## Requirements

### AnimalGrid

- Responsive grid: 1 col (mobile) → 2 col (tablet) → 3-4 col (desktop)
- Renders `AnimalCard` for each animal in the current page
- Shows `FilterSidebar` (desktop) or `FilterDrawer` trigger (mobile) alongside the grid
- Shows `SkeletonCard` placeholders during initial load (match grid dimensions)
- Shows `EmptyState` when no animals match current filters
- Shows `Pagination` at the bottom

### AnimalCard

- Photo: primary `mediaAsset` image with `object-cover`
- **Hover image swap**: on hover, transitions to the second photo if available (CSS transition, no JS delay)
- Chips: species + breed (truncated), age, size, sex
- Name in `font-black`
- "Adopt Me" CTA button — opens detail view (hash route)
- Kindred Slate styling: `surface-container-lowest` card, ultra-diffuse shadow, 12px radius

### AnimalDetail

- Full-width or lightbox layout
- **Gallery**: all `mediaAssets` in a horizontal scroll or lightbox (`yet-another-react-lightbox`)
- Thumbnail strip below main photo
- All animal attributes: name, species, breed, age, sex, size, description, good-with flags
- "Adopt Me" primary button → `adoptUrlBase + animal.externalId` (opens new tab)
- "← Back to all animals" ghost link
- Accessible: keyboard-navigable gallery, focus trap in lightbox

### FilterSidebar (desktop, ≥768px)

- Collapsible sections: Species (dog/cat/other), Sex (male/female), Size (small/medium/large/xlarge), Age range
- Active filter count badge on each section header when filters applied
- "Clear all" link when any filter active
- Filter state reflected in URL hash params (e.g. `#/?species=dog&sex=female`)
- Kindred Slate: `surface-container-low` background, `surface-container-lowest` cards

### FilterDrawer (mobile, <768px)

- Triggered by a sticky "Filter" button with active count badge
- Slides up as a bottom sheet with `backdrop-blur` overlay
- Same filter controls as sidebar
- "Apply" primary button closes drawer and applies filters
- Swipe-down or tap-backdrop to dismiss

### Pagination

- Page numbers with first/last + prev/next
- Current page highlighted in `bg-primary text-on-primary`
- Keyboard navigable
- Scrolls to top of `#pawser-root` on page change

### SkeletonCard

- Matches AnimalCard dimensions exactly
- Uses `animate-pulse` on `bg-surface-container` placeholders
- Renders same number as `animalsPerPage` during load

### EmptyState

- Centered illustration area + "No animals found" heading
- Subtext: "Try adjusting your filters or check back later."
- "Clear all filters" CTA if filters are active

---

## Data Fetching

### List endpoint

```
GET {apiUrl}/api/v1/animals
  ?orgSlug={orgSlug}
  &status=available
  &species={species}       // optional
  &sex={sex}               // optional
  &size={size}             // optional
  &page={page}             // 1-indexed
  &limit={animalsPerPage}
```

Response:
```json
{
  "success": true,
  "animals": [...],
  "total": 42,
  "page": 1,
  "limit": 24
}
```

### Detail endpoint

```
GET {apiUrl}/api/v1/animals/{slug}
```

Response: single `PawserAnimal` object.

### `PawserAnimal` type (from `apps/widget/src/types/index.ts`)

```typescript
interface PawserAnimal {
  id: string;
  externalId: string;
  name: string;
  species: string;
  status: string;
  breedPrimary: string;
  breedSecondary?: string;
  sex: string;
  size: string;
  ageYears: number | null;
  ageMonths: number | null;
  slug: string;
  description?: string;
  adoptionUrl?: string;
  mediaAssets: { url: string; isPrimary: boolean }[];
  attributes?: Record<string, boolean>; // goodWithDogs, goodWithCats, goodWithKids, specialNeeds
}
```

---

## Build Configuration

### `vite.config.ts`

```typescript
build: {
  outDir: 'dist',
  lib: {
    entry: 'src/index.tsx',
    name: 'PawserWidget',
    formats: ['iife'],
    fileName: () => 'widget.js',
  },
  cssCodeSplit: false,              // all CSS in single widget.css
  rollupOptions: {
    output: { assetFileNames: 'widget.css' },
  },
}
```

Output: `dist/widget.js` + `dist/widget.css`

### CSS Scoping Requirements

- No Tailwind base/reset styles that affect the host page's existing styles
- Prefix all widget-level base styles with `#pawser-root`
- The widget `<link>` tag for its CSS must be injected inside `#pawser-root`'s shadow DOM or scoped via a CSS cascade layer — TBD based on testing
- `@import url(...)` for Google Fonts must appear at the top of `index.css` (before `@tailwind` directives)

### Dynamic Brand Color

The `primaryColor` from `window.pawserSettings` is applied as a CSS custom property:

```typescript
// In index.tsx, before React mount:
const root = document.getElementById('pawser-root');
const color = window.pawserSettings?.primaryColor || '#00113f';
root?.style.setProperty('--widget-primary', color);
```

All Tailwind `bg-primary` / `text-primary` classes inside the widget scope read from `var(--widget-primary)`.

---

## Routing

The widget uses `HashRouter` from `react-router-dom`. Routes:

```
/#/                    → AnimalGrid (list view)
/#/animals/:slug       → AnimalDetail (detail view)
```

Hash routing means no server config is required on the host page. The host page's own router is unaffected.

---

## CDN Distribution

- Bundle served from `cdn.getpawser.io/widget.js` via Cloudflare CDN
- Cache-busted on deploy via version query string (`?v=1.2.3`) or content-hash filename
- `dist/widget.css` served from `cdn.getpawser.io/widget.css`
- Both files loaded from a single `<script defer>` tag (CSS is injected by JS at runtime)

---

## Implementation Status Detail

| Component | Status | Notes |
|-----------|--------|-------|
| `AnimalGrid` | 🟡 Partial | Grid renders; filter wiring needs testing |
| `AnimalCard` | 🟡 Partial | Basic card renders; hover image swap incomplete |
| `AnimalDetail` | 🟡 Partial | Detail renders; lightbox integration incomplete |
| `FilterSidebar` | 🟡 Partial | Controls exist; URL hash sync needs testing |
| `FilterDrawer` | 🟡 Partial | Bottom sheet structure exists; UX polish needed |
| `Pagination` | 🟡 Partial | Renders; scroll-to-top on page change missing |
| `SkeletonCard` | ✅ Scaffolded | Pulse animation working |
| `EmptyState` | ✅ Scaffolded | Copy + layout in place |
| `useAnimals` hook | 🟡 Partial | Fetch working; filter param passing needs verification |
| `useAnimal` hook | 🟡 Partial | Fetch working; error state handling incomplete |
| Vite IIFE build | ✅ Working | Produces `dist/widget.js` + `dist/widget.css` |
| CSS scoping | 🔲 Planned | No global leakage audit done yet |
| Dynamic `primaryColor` | 🔲 Planned | Not yet wired from `window.pawserSettings` |
| CDN distribution | 🔲 Planned | `cdn.getpawser.io` not set up |
