# Design System: Kindred Slate — The Compassionate Curator

Exported from Google Stitch. Authoritative design spec for all Pawser surfaces.

---

## 1. Design Philosophy: The Digital Sanctuary

Moving away from sterile dev-tool grids toward an editorial, high-end aesthetic that
feels curated rather than generated. Balances technical precision with the warmth of a
premium lifestyle publication. We don't just show data — we present it with care.

---

## 2. Color Tokens

All colors are defined as Tailwind custom properties. Use these class names throughout.

### Core palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#00113f` | Brand color, buttons, active nav, accents |
| `on-primary` | `#ffffff` | Text/icons on primary backgrounds |
| `primary-container` | `#e0e2ff` | Light primary tint for backgrounds |
| `on-primary-container` | `#00113f` | Text on primary-container |
| `secondary` | `#5a5d72` | Secondary text, inactive nav items |
| `on-secondary` | `#ffffff` | Text on secondary |
| `secondary-container` | `#dfe1f9` | Secondary tint backgrounds |
| `tertiary` | `#76546e` | Accent for special states (foster priority, etc.) |
| `tertiary-container` | `#ffd7f3` | Tertiary tint backgrounds |
| `error` | `#ba1a1a` | Error states |
| `error-container` | `#ffdad6` | Error background tint |

### Surface hierarchy (6 levels — use tonal shifts, never borders)

| Token | Hex | Usage |
|---|---|---|
| `surface` | `#faf9ff` | Page/app background (base layer) |
| `background` | `#faf9ff` | Same as surface |
| `surface-container-lowest` | `#ffffff` | Cards, modals — "pop" of brightness |
| `surface-container-low` | `#f3f3fa` | Secondary sections on surface |
| `surface-container` | `#eeedf4` | Contained sections |
| `surface-container-high` | `#e8e7ee` | Deeper nesting, metadata |
| `surface-container-highest` | `#e2e2e9` | Input default backgrounds |

### Text colors

| Token | Hex | Usage |
|---|---|---|
| `on-surface` | `#1a1b20` | Primary text, headings |
| `on-surface-variant` | `#434655` | Secondary text, descriptions |
| `outline` | `#747686` | Placeholder text, dividers |
| `outline-variant` | `#c4c5d7` | Ghost borders (use at 10-15% opacity) |

### Status colors (use standard Tailwind for these)

| State | Classes |
|---|---|
| Success / Connected | `bg-emerald-100 text-emerald-900` (badge), `bg-green-500` (dot) |
| Warning / Pending | `bg-amber-100 text-amber-900` |
| Error | `bg-rose-100 text-rose-900` or `bg-error-container text-error` |

---

## 3. Typography

**Font family:** Source Sans 3 (Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
```

**Icons:** Material Symbols Outlined
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
```

### Type scale

| Role | Size | Weight | Usage |
|---|---|---|---|
| Display | 60px / `text-6xl` | 900 `font-black` | Hero headlines |
| Heading XL | 48px / `text-5xl` | 800 `font-extrabold` | Page titles |
| Heading L | 36px / `text-4xl` | 700 `font-bold` | Section headers |
| Heading M | 28px / `text-3xl` | 700 `font-bold` | Card headers |
| Title | 20-24px / `text-xl` | 700 `font-bold` | Component headers |
| Body L | 18-20px / `text-lg` | 400-500 | Lead paragraphs |
| Body | 16px / `text-base` | 400 | Default body text |
| Body S | 14px / `text-sm` | 400-600 | Secondary info |
| Label | 10-12px / `text-xs` | 700-900 `font-black` + uppercase + tracking-widest | Metadata, category labels |

**Tracking rule for labels:** `uppercase tracking-[0.1em] font-bold text-on-surface-variant/60`

---

## 4. Border Radius

```javascript
borderRadius: {
  DEFAULT: "0.75rem",  // 12px — cards, inputs, buttons
  lg:      "0.75rem",  // 12px
  xl:      "1rem",     // 16px — modals, large cards
  "2xl":   "1.25rem",  // 20px — hero sections
  full:    "9999px"    // pills, badges, toggles, avatars
}
```

---

## 5. Spacing

4px base unit. Use Tailwind spacing scale:
`p-1`=4px, `p-2`=8px, `p-3`=12px, `p-4`=16px, `p-5`=20px, `p-6`=24px,
`p-8`=32px, `p-10`=40px, `p-12`=48px

Internal card padding: `p-6` (24px) minimum, `p-8` (32px) preferred.

---

## 6. Elevation & Depth

**The No-Line Rule:** Never use `border` for layout sectioning. Define boundaries through
background color shifts and vertical rhythm only.

**Ghost border** (accessibility only, use sparingly):
`border border-outline-variant/10` — outline-variant at 10% opacity

**Ambient shadow** for floating elements (dropdowns, modals):
`shadow-[0_20px_40px_rgba(26,27,32,0.04)]`

**Stat card shadow:**
`shadow-[0_4px_20px_rgba(0,0,0,0.02)]`

**Never use:** `shadow-md`, `shadow-lg`, `border border-gray-200` — these feel generic.

---

## 7. Components

### Buttons

**Primary** (gradient, deep navy):
```html
<button class="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold shadow-sm
               hover:opacity-90 active:scale-95 transition-all">
  Get Started
</button>
```

**Primary gradient** (hero CTAs):
```html
<!-- Add to CSS: .bg-primary-gradient { background: linear-gradient(135deg, #00113f 0%, #00227a 100%); } -->
<button class="bg-primary-gradient text-white px-8 py-4 rounded-xl font-bold
               shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02]
               active:scale-95 transition-all">
  Start Free Trial
</button>
```

**Secondary:**
```html
<button class="bg-surface-container-lowest text-primary border border-primary/10
               px-6 py-3 rounded-xl font-bold hover:bg-surface-container transition-all
               active:scale-95">
  Learn More
</button>
```

**Ghost:**
```html
<button class="text-primary px-6 py-3 rounded-xl font-bold
               hover:bg-surface-container-highest transition-all flex items-center gap-2">
  <span class="material-symbols-outlined text-lg">help_outline</span>
  Learn More
</button>
```

### Inputs

**Default:**
```html
<div class="space-y-2">
  <label class="text-sm font-bold text-on-surface ml-1">Label</label>
  <input type="text" placeholder="Enter value..."
    class="w-full bg-surface-container-highest border-transparent rounded-xl px-4 py-4
           focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest
           transition-all text-on-surface"/>
</div>
```

**Error state:**
```html
<input type="text"
  class="w-full bg-error-container/30 border-2 border-error rounded-xl px-4 py-4
         text-error font-semibold"/>
<p class="text-xs font-bold text-error mt-1 ml-1">Error message here.</p>
```

### Badges / Status pills

```html
<!-- Success -->
<span class="bg-emerald-100 text-emerald-900 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Active</span>
<!-- Warning -->
<span class="bg-amber-100 text-amber-900 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Pending</span>
<!-- Error -->
<span class="bg-rose-100 text-rose-900 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">Error</span>
<!-- Info / New -->
<span class="bg-primary-container text-on-primary-container px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">New Arrival</span>
```

### Sidebar navigation

```html
<aside class="h-screen w-64 bg-surface-container-low flex flex-col py-6 px-4">
  <!-- Logo -->
  <div class="px-2 mb-8 flex items-center gap-3">
    <div class="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white">
      <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1;">pets</span>
    </div>
    <div>
      <h1 class="text-lg font-black text-primary leading-none">Pawser</h1>
      <p class="text-xs text-on-surface-variant uppercase tracking-widest mt-0.5">Admin Dashboard</p>
    </div>
  </div>
  <!-- Active nav item -->
  <a class="flex items-center gap-3 px-4 py-3 bg-surface-container-lowest text-primary
            rounded-xl shadow-sm font-bold hover:translate-x-1 transition-all cursor-pointer">
    <span class="material-symbols-outlined">dashboard</span>
    Overview
  </a>
  <!-- Inactive nav item -->
  <a class="flex items-center gap-3 px-4 py-3 text-secondary
            hover:bg-surface-container-highest hover:text-primary
            rounded-xl font-semibold hover:translate-x-1 transition-all cursor-pointer">
    <span class="material-symbols-outlined">widgets</span>
    Widget Builder
  </a>
</aside>
```

### Stat card

```html
<div class="bg-surface-container-lowest p-6 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
  <div class="flex items-center justify-between mb-4">
    <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Active Pets</span>
    <div class="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
      <span class="material-symbols-outlined">pets</span>
    </div>
  </div>
  <div class="flex items-baseline gap-2">
    <span class="text-4xl font-black text-on-surface">42</span>
    <span class="text-green-600 text-sm font-semibold">+3 this week</span>
  </div>
</div>
```

### Sync status card

```html
<div class="bg-surface-container-high p-6 rounded-xl flex flex-col justify-between">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
      <span class="text-sm font-bold text-on-surface">System Live</span>
    </div>
    <span class="text-[10px] font-semibold text-on-surface-variant">5m ago</span>
  </div>
  <div class="mt-4">
    <p class="text-sm text-on-surface-variant mb-4">Inventory synchronized.</p>
    <button class="w-full py-2 bg-surface-container-lowest rounded-xl text-sm font-bold
                   text-primary shadow-sm hover:bg-white transition-all active:scale-95">
      Sync now
    </button>
  </div>
</div>
```

### Quick action row item

```html
<button class="flex items-center justify-between p-4 rounded-xl bg-surface-container-low
               hover:bg-surface-container-high transition-colors group">
  <div class="flex items-center gap-3">
    <span class="material-symbols-outlined text-primary">code</span>
    <span class="font-bold text-sm">View Embed Code</span>
  </div>
  <span class="material-symbols-outlined text-outline group-hover:translate-x-1 transition-transform">chevron_right</span>
</button>
```

### Animal card (widget)

```html
<div class="group cursor-pointer">
  <div class="relative aspect-square rounded-xl overflow-hidden mb-3 bg-surface-container-low shadow-sm">
    <img src="..." alt="Bella"
      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"/>
    <!-- Status badge (optional) -->
    <div class="absolute top-3 left-3 bg-primary-container text-on-primary-container
                px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
      New Arrival
    </div>
  </div>
  <div class="flex justify-between items-start">
    <div>
      <h4 class="font-bold text-on-surface text-base">Bella</h4>
      <p class="text-on-surface-variant text-sm">Golden Retriever • 2 Years</p>
      <p class="text-on-surface-variant/70 text-sm">Female • Medium</p>
    </div>
  </div>
</div>
```

### Code snippet block

```html
<div class="bg-surface-container-high rounded-xl p-5 font-mono text-sm relative">
  <button class="absolute top-3 right-3 text-on-surface-variant hover:text-primary
                 transition-colors text-xs font-bold flex items-center gap-1">
    <span class="material-symbols-outlined text-sm">content_copy</span> Copy
  </button>
  <pre class="text-on-surface overflow-x-auto"><code><!-- paste code here --></code></pre>
</div>
```

---

## 8. Page layouts

### Admin dashboard layout

```
┌─────────────────────────────────────────────┐
│ Sidebar (w-64, surface-container-low)        │
│ + sticky top-0 h-screen                      │
├─────────────────────────────────────────────┤
│ TopBar (bg-white/80 backdrop-blur-xl sticky) │
├─────────────────────────────────────────────┤
│ Main content (p-8, max-w-[1440px])           │
│  - Page header (title + action button)       │
│  - Bento grid: 4-col stats row               │
│  - 2/3 + 1/3 split: main canvas + actions   │
└─────────────────────────────────────────────┘
```

### Widget builder layout

```
┌──────────────────────────────────────────────┐
│ Sidebar (w-64, fixed)                         │
├──────────────────────────────────────────────┤
│ TopBar (fixed, left-64)                       │
├──────────────────────────────────────────────┤
│ Settings panel (w-[360px], overflow-y-auto)  │
│ Live preview (flex-1, surface-container-low) │
└──────────────────────────────────────────────┘
```

### Widget embed layout

```
┌──────────────────────────────────────────────┐
│ Filter sidebar (w-[260px], sticky-sidebar)   │
│ Animal grid (flex-1, 3-col)                  │
└──────────────────────────────────────────────┘
```

---

## 9. Do's and Don'ts

### Do
- Use surface color shifts to separate sections — never borders
- Use `font-black` + `uppercase` + `tracking-widest` for label metadata
- Use `group-hover:translate-x-1` on nav items for subtle interaction
- Use `active:scale-95` on all buttons for tactile feel
- Use `backdrop-blur-xl` on sticky headers
- Add a glowing dot (`shadow-[0_0_8px_rgba(34,197,94,0.5)]`) to live status indicators
- Use `aspect-square` or `aspect-[4/3]` on animal card photos — never let images define their own height

### Don't
- Never use `border border-gray-200` or `divide-y` for layout separation
- Never use generic cobalt (`#0000FF`, `#3B82F6` as primary) — use `#00113f`
- Never use `shadow-md` or `shadow-lg` — use the ambient shadow values above
- Never use tight padding — minimum `p-4` (16px) inside any container
- Never use 1px solid borders as section dividers
- Never use `font-weight: 700` on display text — use `font-black` (900)

---

## 10. Tailwind config (use this in all apps)

```javascript
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary":                    "#00113f",
        "on-primary":                 "#ffffff",
        "primary-container":          "#e0e2ff",
        "on-primary-container":       "#00113f",
        "secondary":                  "#5a5d72",
        "on-secondary":               "#ffffff",
        "secondary-container":        "#dfe1f9",
        "tertiary":                   "#76546e",
        "tertiary-container":         "#ffd7f3",
        "on-tertiary-container":      "#2d1228",
        "error":                      "#ba1a1a",
        "error-container":            "#ffdad6",
        "background":                 "#faf9ff",
        "surface":                    "#faf9ff",
        "on-surface":                 "#1a1b20",
        "on-surface-variant":         "#434655",
        "surface-variant":            "#e2e1ec",
        "outline":                    "#767680",
        "outline-variant":            "#c4c5d0",
        "surface-container-lowest":   "#ffffff",
        "surface-container-low":      "#f3f3fa",
        "surface-container":          "#eeedf4",
        "surface-container-high":     "#e8e7ee",
        "surface-container-highest":  "#e2e2e9",
      },
      fontFamily: {
        "headline": ["'Source Sans 3'", "sans-serif"],
        "body":     ["'Source Sans 3'", "sans-serif"],
        "label":    ["'Source Sans 3'", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        lg:      "0.75rem",
        xl:      "1rem",
        "2xl":   "1.25rem",
        full:    "9999px",
      },
    },
  },
}
```
