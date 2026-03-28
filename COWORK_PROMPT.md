# Cowork Task: Rearchitect Pawser — Three Surfaces, One Design System

## Before you write a single line of code, read these files

1. `.cursorrules` — project architecture, coding standards, file conventions
2. `1-PRD/stitch-export/DESIGN.md` — complete Kindred Slate design system (tokens, components, layouts)
3. `1-PRD/2016-01-14/00-README.md` — PRD status tracker (what's built, what isn't)
4. `apps/portal/MIGRATION.md` — shelterluv_app type mapping

Do not begin implementation until you have read all four.

---

## Architecture overview

Pawser is three front-end surfaces backed by one API:

| App | URL | Purpose |
|---|---|---|
| `apps/portal` | `getpawser.io` | **Marketing site** — explains the product, drives sign-up |
| `apps/admin` | `app.getpawser.io` | **Shelter dashboard** — connect API key, build widget, copy embed code |
| `apps/widget` | `cdn.getpawser.io/widget.js` | **Embeddable JS bundle** — drops into shelter's existing site |

The `apps/portal` Next.js app is being **repurposed** from a hosted animal portal to a
marketing/landing site. It is no longer the public-facing adoption experience.

The embeddable widget is the product the shelter's visitors actually use. It is a
**Vite-bundled JS + CSS bundle**, not a Next.js app. It mounts on `<div id="pawser-root">`
and reads config from `window.pawserSettings`.

---

## What already exists (do not rebuild these)

- `apps/api/` — Complete Express API: auth, organizations, animals, sync, billing routes
- `packages/database/` — Complete Prisma schema (19 tables)
- `packages/shared/` — Shared TypeScript types
- `apps/portal/app/[domain]/` — **Repurpose, don't delete** — existing animal grid/detail
  pages become reference/demo pages only, not the main portal product
- `1-PRD/stitch-export/*.html` — Stitch design reference files — read these for visual spec

---

## Task 1: Install the Kindred Slate design system

### 1a. Add Source Sans 3 to both Next.js apps

In `apps/portal/app/layout.tsx` AND `apps/admin/app/layout.tsx`:

```tsx
import { Source_Sans_3 } from 'next/font/google'

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-source-sans',
})
```

### 1b. Update Tailwind configs

Replace the existing `tailwind.config.js` in BOTH `apps/portal` and `apps/admin` with
the Kindred Slate config from `1-PRD/stitch-export/DESIGN.md` section 10. Also add to
both `globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.bg-primary-gradient {
  background: linear-gradient(135deg, #00113f 0%, #00227a 100%);
}
```

### 1c. Create `packages/ui/src/components/index.ts`

Export these shared components (implement them using the DESIGN.md patterns):
- `Button` — variants: primary, primary-gradient, secondary, ghost
- `Badge` — variants: success, warning, error, info
- `StatCard` — number + label + trend + icon
- `SyncStatusCard` — live dot + last synced + "Sync now" button
- `QuickActionRow` — icon + label + chevron + hover translate
- `CodeSnippet` — monospace block + copy button
- `SidebarNav` — logo + nav items (active/inactive states)
- `PageHeader` — title + subtitle + optional action button

All components: TypeScript strict, Tailwind only, no inline styles except `primaryColor`
brand accent, `'use client'` where interactive.

---

## Task 2: Rebuild apps/portal as marketing site

**Reference file:** `1-PRD/stitch-export/marketing_homepage_kindred_slate/code.html`

Delete the existing `apps/portal/app/[domain]/` routing structure. Replace with:

```
apps/portal/app/
  layout.tsx          — root layout, Source Sans 3, nav + footer
  page.tsx            — homepage (marketing)
  pricing/
    page.tsx          — pricing page
  auth/
    login/page.tsx    — login form
    signup/page.tsx   — sign up form
  (demo)/
    [slug]/
      page.tsx        — demo/preview portal (keep existing animal grid logic here)
```

### Homepage sections (match Stitch reference):
1. **Nav** — "Pawser" logo (font-black text-primary) + links + "Get started" primary button
2. **Hero** — `display-lg` headline "Find homes for every tail." with `text-primary italic`
   on "every tail." + subhead + two CTAs (primary gradient + ghost) + dashboard screenshot
3. **Features** — 3-column: Easy Integration / Automated Sync / Customizable Widget
   Each: icon in `bg-primary/10` rounded-xl + `text-2xl font-black` title + body
4. **Pricing** — 3 tiers: Basic ($0 free) / Pro ($49/mo, highlighted) / Enterprise (custom)
   Pro tier card uses `bg-primary` with white text. Each has feature list + CTA button.
5. **CTA banner** — Full-width `bg-primary` section: "Ready to transform your rescue?"
   + two buttons + social proof ("Join 500+ animal welfare organizations")
6. **Footer** — links + copyright

### Key copy from Stitch output:
- Hero headline: "Find homes for **every tail.**"
- Feature 1: "Easy Integration — Embed our adoption widget into any website in seconds."
- Feature 2: "Automated Sync — Automatically update listing status across platforms."
- Feature 3: "Customizable Widget — Tailor every pixel to match your brand identity."
- Pricing tagline: "Plans that grow with you"

---

## Task 3: Rebuild apps/admin as shelter dashboard

**Reference files:**
- `1-PRD/stitch-export/admin_dashboard_kindred_slate/code.html`
- `1-PRD/stitch-export/widget_builder_kindred_slate/code.html`

### Layout shell

`apps/admin/app/layout.tsx`:
- Full-height flex row: `<SidebarNav>` (w-64, fixed) + main content area
- Sticky top bar: `bg-white/80 backdrop-blur-xl` with Pawser wordmark + user avatar
- All routes are auth-protected (use existing JWT auth middleware)

### Sidebar nav items (in order):
1. Overview (icon: `dashboard`)
2. Widget Builder (icon: `widgets`)
3. Pet Management (icon: `pets`)
4. Integration (icon: `link`)
5. Billing (icon: `payments`)
6. Settings (icon: `settings`)
7. — bottom — Help / Sign Out

### Route: `/` — Dashboard Overview

**Reference:** `admin_dashboard_kindred_slate/code.html`

Sections:
- Page header: "Dashboard Overview" + "Manage your shelter's activity"
- 4-column bento grid:
  - StatCard: Active Pets (from API: `GET /api/v1/animals?status=available`)
  - StatCard: Recent Adoptions
  - StatCard: Widget Views (placeholder for now)
  - SyncStatusCard: last sync time + "Sync now" button
- 2/3 + 1/3 grid:
  - Left: widget preview panel (`bg-surface-container-low`, shows iframe preview of widget)
  - Right: QuickActionRow items: Edit Widget / View Embed Code / Share Link
  - Right below: "Secure Connection" card (`bg-primary text-on-primary`)

**API calls this page makes:**
```typescript
GET /api/v1/organizations/:id        // org name, status
GET /api/v1/sync/:id/status          // last sync, animal count
GET /api/v1/animals?orgId=:id&limit=1 // just to confirm animals exist
```

### Route: `/widget-builder` — Widget Builder

**Reference:** `widget_builder_kindred_slate/code.html`

Two-panel layout: settings (w-[360px]) + live preview (flex-1).

**Settings panel sections:**
1. Status indicator: "Connected" green dot + "Widget Settings" heading
2. Styling group:
   - Brand color picker (hex input + color swatch) → saves to `org.primaryColor`
   - Button style: Rounded / Square / Pill (radio group)
   - Card style: Shadow / Border / Flat (radio group)
3. Display group:
   - Species toggles: Dogs / Cats / Other (checkboxes)
   - Animals per page: 12 / 24 / 48 (select)
   - Sort default: Newest / Longest Stay / Name A-Z (select)
4. Adoption URL: text input for `adoptUrlBase`
5. Adoption process text: textarea (rich text optional)
6. Save button (primary gradient, full-width)

**Live preview panel:**
- Gray `bg-surface-container-low` background
- "Live Preview" badge (pill, `bg-white/50 backdrop-blur-sm`)
- Centered white card showing a single animal card preview with the shelter's real data
- Updates in real-time as settings change (use React state, save only on "Save" click)

### Route: `/embed-code` — Get Embed Code

Single focused page:

```
Heading: "Add Pawser to your website"
Subhead: "Copy this code and paste it before </body> on your website."

Step 1: Copy this script tag
[code snippet block]
<script>
  window.pawserSettings = {
    apiUrl: "https://api.getpawser.io",
    orgSlug: "{org.slug}",
    primaryColor: "{org.primaryColor}",
    adoptUrlBase: "{org.settings.adoptUrlBase}"
  };
</script>
<script src="https://cdn.getpawser.io/widget.js" defer></script>
<div id="pawser-root"></div>
[/code snippet block]

Step 2: Where to paste it
Body text explaining placement.

Step 3: Test your installation
"Open your website and look for the Pawser adoption widget."
[Visit your site →] button
```

The `orgSlug` and other values should be pre-filled from the authenticated org context.

### Route: `/integration` — Connect ShelterLuv

Step-by-step onboarding flow using the step indicator component:

**Step 1: API Key**
- Explanation of where to find the key in ShelterLuv
- Masked text input + "Test connection" button
- On success: green badge "Connected — 42 animals found"
- On error: error badge + specific message

**Step 2: First Sync**
- "Run your first sync" with loading state
- Shows progress: "Fetching animals... 42 found / Saving... Done"
- On complete: animal count + "View animals" link

**Step 3: Done**
- Confirmation screen
- "Go to Widget Builder" primary CTA
- "View your animals" secondary CTA

**API calls:**
```typescript
POST /api/v1/organizations/:id/credentials/test   // test API key
PUT  /api/v1/organizations/:id/credentials        // save API key
POST /api/v1/sync/:id                             // trigger first sync
GET  /api/v1/sync/:id/status                      // poll for completion
```

### Route: `/billing` — Billing

- Current plan card (tier name + price + sync interval)
- "Manage billing" button → creates Stripe portal session via `POST /api/v1/billing/portal`
- Invoice history table: date / amount / status / download link
- Upgrade CTA if on Basic tier

---

## Task 4: Scaffold apps/widget as Vite embed bundle

Create `apps/widget/` as a new Vite app — separate from the Next.js apps.

```
apps/widget/
  package.json         — name: @pawser/widget
  vite.config.ts       — builds to dist/widget.js + dist/widget.css
  src/
    index.tsx          — mounts React app on #pawser-root, reads window.pawserSettings
    App.tsx            — router: list view / detail view (HashRouter)
    components/
      AnimalGrid.tsx   — grid + filter sidebar
      AnimalCard.tsx   — card with hover image swap
      AnimalDetail.tsx — detail with gallery
      FilterSidebar.tsx
      FilterDrawer.tsx — mobile bottom sheet
      Pagination.tsx
      SkeletonCard.tsx
      EmptyState.tsx
    hooks/
      useAnimals.ts    — fetches from window.pawserSettings.apiUrl/api/v1/animals
      useAnimal.ts     — fetches single animal
    types/
      index.ts         — PawserAnimal, PawserSettings interfaces
```

**`window.pawserSettings` interface:**
```typescript
interface PawserSettings {
  apiUrl: string;           // e.g. "https://api.getpawser.io"
  orgSlug: string;          // e.g. "riverside-shelter"
  primaryColor?: string;    // e.g. "#00113f"
  adoptUrlBase?: string;    // e.g. "https://new.shelterluv.com/matchme/adopt/"
  animalsPerPage?: number;  // default 24
  defaultSpecies?: string;  // "dog" | "cat" | "all"
}
```

**`vite.config.ts` build output:**
```typescript
build: {
  outDir: 'dist',
  lib: {
    entry: 'src/index.tsx',
    name: 'PawserWidget',
    formats: ['iife'],
    fileName: () => 'widget.js',
  },
  cssCodeSplit: false,
  rollupOptions: {
    output: {
      assetFileNames: 'widget.css',
    },
  },
}
```

**Port components from shelterluv_app** using `MIGRATION.md` type mapping.
The widget talks to `{pawserSettings.apiUrl}/api/v1/animals?orgSlug={orgSlug}`.
All styles use Kindred Slate tokens. No CSS files — Tailwind only.

**`package.json` additions for apps/widget:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.30.3",
    "yet-another-react-lightbox": "^3.21.7",
    "react-loading-skeleton": "^3.5.0",
    "@heroicons/react": "^2.2.0",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.4",
    "vite": "^7.1.7",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.2.2"
  }
}
```

---

## Quality bar

- `pnpm --filter @pawser/portal typecheck` — zero errors
- `pnpm --filter @pawser/admin typecheck` — zero errors
- `pnpm --filter @pawser/widget typecheck` — zero errors
- No `.css` imports in portal or admin — Tailwind only
- No inline `style={{}}` props except single `primaryColor` brand accent
- No `console.log` statements
- Every `'use client'` component has an explicit TypeScript props interface
- All Kindred Slate token names used exactly as defined in DESIGN.md (e.g. `bg-surface-container-low` not `bg-gray-100`)

---

## What success looks like

**Portal (`localhost:3000`):**
- Loads the Kindred Slate marketing homepage
- "Find homes for every tail." hero with gradient CTA button
- 3 feature cards, pricing section, footer

**Admin (`localhost:3001`):**
- Login → dashboard showing real stat cards and sync status
- Widget builder with settings panel + live preview
- Embed code page with pre-filled script tag
- Integration page: API key entry + connection test + first sync flow

**Widget (built bundle):**
- `dist/widget.js` + `dist/widget.css` produced by `pnpm --filter @pawser/widget build`
- When loaded on a test HTML page with `window.pawserSettings`, renders animal grid
- Filter sidebar works, animal detail opens in-widget, lightbox gallery works
- Adoption "Adopt Me" button links to `adoptUrlBase + animal.externalId`
