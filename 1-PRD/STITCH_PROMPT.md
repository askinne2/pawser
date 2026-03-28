# Pawser — Google Stitch Design Brief

## What Pawser is

Pawser is a SaaS platform for animal shelters. Shelters pay a monthly subscription,
connect their ShelterLuv account, and get a configurable JavaScript widget they drop
into their existing website to display adoptable animals.

There are three distinct UI surfaces that need a unified design system:

---

## Surface 1: getpawser.io — Marketing site (apps/portal)

**Who sees it:** Shelter directors, web admins, anyone evaluating the product.

**What it does:** Explains the product, shows pricing, drives sign-up. Standard SaaS
marketing site. Hero section, feature highlights, pricing table, CTA to create an account.

**Tone:** Professional, trustworthy, warm. This is animal welfare — not a cold dev tool.
Think Loom or Transistor.fm in terms of friendliness, not Stripe or Linear.

**Key pages to design:**
- Homepage: hero + 3 feature highlights + pricing + footer
- Pricing page: 3 tiers (Basic / Pro / Enterprise), feature comparison table
- Sign up / Login pages (simple, single-column forms)

---

## Surface 2: app.getpawser.io — Admin dashboard (apps/admin)

**Who sees it:** The shelter's staff who manage the integration. 1-3 people per shelter,
not technical.

**What it does:**
1. Onboarding: connect ShelterLuv API key, verify connection, run first sync
2. Sync dashboard: see last sync time, animal count, trigger manual sync
3. Widget builder: choose which species to show, set primary color, preview the widget
4. Widget code: copy the `<script>` tag to paste into their website
5. Billing: current plan, upgrade/downgrade, invoice history (Stripe Customer Portal)
6. Team: invite staff members, manage roles

**Tone:** Simple and confident. These users are shelter staff, not developers.
Every action should feel obvious. No jargon. Error states should be human.

**Key screens to design:**
- Dashboard home: sync status card, animal count, widget status, quick actions
- Connect integration: step-by-step API key entry + connection test
- Widget builder: live preview panel on right, settings on left
- Widget code: copy-to-clipboard embed snippet with setup instructions
- Billing page: plan card + usage + manage button

---

## Surface 3: The embed widget (apps/widget)

**Who sees it:** Families and individuals browsing for a pet to adopt on the shelter's
existing website. The widget renders inside whatever site the shelter already has.

**What it does:**
- Lists adoptable animals in a responsive grid
- Filters by species, sex, size, breed, good-with attributes
- Opens a detail view (within the embed, no page navigation) with gallery, bio, and
  an "Adopt Me" button linking to the shelter's ShelterLuv application form

**Critical constraint:** The widget lives inside someone else's website. It must:
- Have no visible outer border or wrapper — it blends into the host page
- Use neutral colors by default, with one configurable accent (`--pawser-primary`)
- Never leak CSS into the host page (all styles scoped)
- Work in a WordPress theme, Squarespace, Wix, or custom site without looking broken

**Tone:** Warm and inviting. Photos are the star. Minimal chrome. The animal's face
should be the first thing a visitor sees, not a navigation bar.

---

## Shared design system

All three surfaces use the same design tokens. Stitch should define these once and
reference them across all three surfaces.

### Color tokens

```
--pawser-primary        Shelter-configurable accent (widget only). Default: #2563EB
--pawser-gray-50        #FAFAFA  (off-white — page backgrounds)
--pawser-gray-100       #F3F4F6  (surface tint — cards, inputs)
--pawser-gray-200       #E5E7EB  (borders, dividers)
--pawser-gray-500       #6B7280  (secondary text, meta info)
--pawser-gray-700       #374151  (body text)
--pawser-gray-900       #111827  (headings, names)
--pawser-green-500      #22C55E  (success, connected, available)
--pawser-amber-500      #F59E0B  (pending, warning)
--pawser-red-500        #EF4444  (error, disconnected)
```

### Typography

- Font: System sans (Inter fallback) for all surfaces — no Google Fonts dependency
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48px
- Weights: 400 (body), 500 (labels, nav), 600 (headings only)
- Line height: 1.5 for body, 1.2 for headings

### Spacing

4px base unit. Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px

### Border radius

- Small (inputs, badges): 6px
- Medium (cards, panels): 10px
- Large (modal dialogs): 16px
- Full (pills, toggles): 9999px

### Shadows

- Card: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`
- Elevated (dropdown, modal): `0 4px 16px rgba(0,0,0,0.10)`

---

## Component inventory — what Stitch should design

### Shared components (used across all surfaces)
- Primary button, secondary button, ghost button
- Text input, select dropdown
- Badge/pill (status: active / pending / error)
- Avatar (initials fallback)
- Toast notification

### Marketing site (portal)
- Nav bar (logo + links + "Get started" CTA)
- Hero section (headline + subhead + two CTAs + product screenshot/mockup)
- Feature card (icon + title + description, 3-column grid)
- Pricing tier card (plan name + price + features list + CTA)
- Simple footer

### Admin dashboard
- Sidebar nav (logo + icon + label links, active state)
- Page header (title + optional action button)
- Stat card (number + label + trend indicator)
- Sync status card (last synced time + animal count + "Sync now" button + status dot)
- Step indicator (1 → 2 → 3 for onboarding flows)
- API key input (masked, with show/hide toggle and test button)
- Widget preview panel (iframe-style preview box on right side of widget builder)
- Code snippet block (monospace, copy button, dark background)

### Embed widget
- Animal card (4:3 photo, name, breed, age/sex/size, hover swaps to second photo)
- Filter sidebar desktop (sticky, 260px, checkboxes + dropdowns)
- Filter drawer mobile (slides up from bottom, "Show N results" button)
- Animal detail panel (gallery + thumbnails + info + "Adopt Me" CTA)
- Skeleton card (loading state)
- Empty state (no results, with clear filters CTA)

---

## What Stitch should produce

1. **Token file** — all design tokens above with exact values confirmed
2. **Component sketches** — one artboard per component group listed above
3. **Three key screen layouts:**
   - Marketing homepage (desktop)
   - Admin dashboard home (desktop)
   - Widget animal grid (embedded in a mock shelter website, 800px container)
4. **DESIGN.md** — markdown file with all token values, component states, spacing rules,
   and any design decisions made. This is the spec Cursor reads to implement.

---

## Reference aesthetic

- Marketing site: Loom, Transistor.fm, Resend — friendly SaaS, not enterprise cold
- Admin dashboard: Linear, Vercel dashboard — clean, fast-feeling, zero decoration
- Embed widget: Airbnb listing cards — photo-first, warm, inviting, minimal chrome

---

## What Stitch should NOT produce

- Dark mode (out of scope for v1)
- Mobile layouts for the admin dashboard (desktop-first for v1)
- Illustration or custom iconography (use Heroicons)
- Multiple brand color schemes (one neutral system + one shelter-configurable accent)
- Any screens beyond what's listed above
