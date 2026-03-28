# Pawser design system rollout — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `apps/portal`, `apps/admin`, and `@pawser/ui` with `design.md` (repo root) so colors, typography, surfaces, shadows, and core components match “The Digital Sanctuary” / Compassionate Curator spec end-to-end.

**Architecture:** Keep **one canonical document** (`design.md`) and implement it as **CSS custom properties** consumed by Tailwind (`globals.css` + `tailwind.config.js` per app). Extend Tailwind `theme.extend` with **surface roles** and **typography utilities** that mirror `design.md` token names where practical. Centralize **shared primitives** (e.g. `Button`) in `packages/ui` so both apps inherit the same interaction styling. Roll out in layers: tokens → base layout → shared components → page-level sweeps.

**Tech stack:** Next.js 14 (portal, admin), Tailwind CSS 3, `class-variance-authority` in `@pawser/ui`, `next/font` for **Public Sans** (per `design.md` §3).

---

## File map (before tasks)

| Area | Files | Responsibility |
|------|--------|----------------|
| Spec | `design.md` | Authoritative rules; edit first when design changes |
| Portal tokens | `apps/portal/app/globals.css`, `apps/portal/tailwind.config.js` | Portal theme variables and Tailwind mappings |
| Admin tokens | `apps/admin/app/globals.css`, `apps/admin/tailwind.config.js` | Admin theme variables (include `.dark` only if product still needs dark admin; otherwise align light tokens to `design.md` and document) |
| Shared UI | `packages/ui/src/components/button.tsx`, future `card.tsx` / `input.tsx` if added | Variants that encode primary gradient, secondary/tertiary, radii |
| App layouts | `apps/portal/app/layout.tsx`, `apps/admin/app/layout.tsx` | Load Public Sans and apply `className` on `body` for font stacks |
| Content | `apps/portal/app/**/*`, `apps/admin/app/**/*` | Replace hardcoded grays/blues and layout borders with tokens |

---

### Task 1: Token inventory from `design.md`

**Files:**

- Read: `design.md`
- Create (optional scratch): short table in PR or commit message — no new doc file required unless the team wants one

- [ ] **Step 1: List required CSS concepts**

Extract from `design.md`: hex values for `surface`, `surface-container-low`, `surface-container-lowest`, `surface-container-high`, `surface-container-highest`, `primary`, `primary_container`, `on-surface`, `outline-variant` (for ghost borders), and the ambient shadow recipe (§4).

- [ ] **Step 2: Decide HSL mapping**

Convert hex → HSL components for `:root` variables (match existing shadcn-style `h h s%` triplets already used in `globals.css`).

- [ ] **Step 3: Reconcile typography**

`design.md` specifies **Public Sans**. Confirm `next/font/google` exposes `Public_Sans` and plan `variable` + `className` on root layout for both apps.

---

### Task 2: Portal — extend CSS variables and Tailwind theme

**Files:**

- Modify: `apps/portal/app/globals.css`
- Modify: `apps/portal/tailwind.config.js`

- [ ] **Step 1: Add semantic surface variables**

In `:root`, add variables for surface stack (e.g. `--surface`, `--surface-container-low`, …) as HSL triplets, derived from `design.md` §2.

- [ ] **Step 2: Map legacy shadcn names to design roles**

Map `--background` → app shell surface; `--card` → card/interactive surface; ensure `primary` / `primary-foreground` match slate-blue gradient endpoints (gradient itself via utility or component, not only flat `bg-primary`).

- [ ] **Step 3: Register Tailwind colors**

Extend `theme.extend.colors` with keys such as `surface`, `surfaceContainerLow`, `surfaceContainerLowest`, `surfaceContainerHigh`, `surfaceContainerHighest`, `onSurface`, `onSurfaceVariant`, `outlineVariant` pointing at `hsl(var(--…))`.

- [ ] **Step 4: Add shadow and radius tokens**

Add `--shadow-ambient` (or use `boxShadow` extend) matching `0 20px 40px rgba(26, 27, 32, 0.04)` from `design.md` §4; set `--radius` to **8px** (0.5rem) for “Round Eight” unless spec overrides.

- [ ] **Step 5: Revisit global `*` border rule**

Today both apps use:

```css
* {
  @apply border-border;
}
```

Per `design.md` §2 “No-Line Rule,” layout sectioning must not rely on 1px borders. Plan either: (a) remove global border color on `*` and scope borders to inputs only, or (b) keep for compatibility but set `--border` to transparent / use only for form controls. **Pick one approach** and document in a one-line comment in `globals.css`.

- [ ] **Step 6: Commit**

```bash
git add apps/portal/app/globals.css apps/portal/tailwind.config.js
git commit -m "feat(portal): align CSS tokens with design.md surfaces and shadows"
```

---

### Task 3: Admin — same token pass

**Files:**

- Modify: `apps/admin/app/globals.css`
- Modify: `apps/admin/tailwind.config.js`

- [ ] **Step 1: Mirror portal token structure**

Copy the same variable names and Tailwind extensions as portal unless admin intentionally differs (e.g. dark mode). If `.dark` remains, define dark equivalents or strip `.dark` if unused—**verify** `layout.tsx` / theme toggle before deleting.

- [ ] **Step 2: Run checks**

```bash
cd /Users/andrewskinner/Local\ Sites/pawser && pnpm exec turbo run lint --filter=admin
```

Expected: no new errors (fix any class names that reference removed utilities).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/globals.css apps/admin/tailwind.config.js
git commit -m "feat(admin): align CSS tokens with design.md"
```

---

### Task 4: Typography — Public Sans in both apps

**Files:**

- Modify: `apps/portal/app/layout.tsx`
- Modify: `apps/admin/app/layout.tsx`
- Modify: `apps/portal/app/globals.css` (optional `font-sans` mapping)
- Modify: `apps/admin/app/globals.css`

- [ ] **Step 1: Import and apply font**

```tsx
import { Public_Sans } from 'next/font/google';

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
});
```

Apply `className={publicSans.variable}` on `<html>` and set `body` to use `font-sans` with Tailwind `theme.fontFamily.sans` referencing `var(--font-public-sans)`.

- [ ] **Step 2: Add type scale utilities (optional)**

In `tailwind.config.js`, extend `fontSize` for `display-lg`, `headline-md`, `body-lg`, `label-md` per `design.md` §3 (exact rem values from spec).

- [ ] **Step 3: Commit**

```bash
git add apps/portal/app/layout.tsx apps/admin/app/layout.tsx apps/portal/tailwind.config.js apps/admin/tailwind.config.js
git commit -m "feat: load Public Sans per design.md"
```

---

### Task 5: `@pawser/ui` — Button variants

**Files:**

- Modify: `packages/ui/src/components/button.tsx`

- [ ] **Step 1: Primary variant**

Replace flat `bg-primary` with gradient utility classes per `design.md` §5 (e.g. `bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-container))]` or dedicated CSS variables). Ensure text uses on-primary / white; hover state slightly brightens or deepens per spec.

- [ ] **Step 2: Secondary variant**

`surface-container-highest` background, `primary` text, no border.

- [ ] **Step 3: Tertiary / link-style**

Text `primary`, underline on hover only.

- [ ] **Step 4: Radius**

Use `rounded-lg` tied to 8px token.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/button.tsx
git commit -m "feat(ui): button variants match design.md"
```

---

### Task 6: Shared preset (optional consolidation)

**Files:**

- Create (optional): `packages/ui/tailwind-preset.js` or repo-root `tailwind.preset.js`
- Modify: `apps/portal/tailwind.config.js`, `apps/admin/tailwind.config.js`

- [ ] **Step 1: Extract duplicate `theme.extend`**

If portal and admin configs are identical after Task 2–3, move shared `colors`, `fontSize`, `boxShadow` into a `presets: [require('...')]` entry to avoid drift.

- [ ] **Step 2: Commit**

```bash
git add packages/ui/tailwind-preset.js apps/portal/tailwind.config.js apps/admin/tailwind.config.js
git commit -m "chore: share Tailwind preset for portal and admin"
```

---

### Task 7: Page and component audit (portal + admin)

**Files:**

- Modify: high-traffic layouts and marketing/auth shells under `apps/portal/app/`, `apps/admin/app/`

- [ ] **Step 1: Search for anti-patterns**

```bash
cd /Users/andrewskinner/Local\ Sites/pawser
rg "border-gray|border-slate|#[0-9a-fA-F]{3,6}|bg-blue-|text-blue-" apps/portal apps/admin packages/ui
```

- [ ] **Step 2: Replace with tokens**

Swap for `bg-surface`, `bg-surfaceContainerLow`, `text-onSurface`, etc. Remove divider borders between sections; use spacing and background shifts per `design.md` §2.

- [ ] **Step 3: Modals / nav glass**

Where floating chrome exists, apply `backdrop-blur` + semi-transparent surface per `design.md` §2 “Glass & Gradient.”

- [ ] **Step 4: Commit in logical chunks**

e.g. `feat(portal): apply surface tokens to marketing layout` then animals list.

---

### Task 8: Editorial Quote component (signature)

**Files:**

- Create: `packages/ui/src/components/editorial-quote.tsx` (or colocate in portal if not shared)
- Modify: `packages/ui/src/components/index.ts`, `packages/ui/src/index.ts`

- [ ] **Step 1: Implement**

`body-lg` text, `border-l-4 border-primary`, `bg-surfaceContainerLowest` (or equivalent token), padding per `design.md` §5.

- [ ] **Step 2: Export and use once**

Wire into one Pawser marketing or empty-state page to validate.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/editorial-quote.tsx packages/ui/src/components/index.ts
git commit -m "feat(ui): add Editorial Quote per design.md"
```

---

### Task 9: Verification

- [ ] **Step 1: Typecheck and lint**

```bash
cd /Users/andrewskinner/Local\ Sites/pawser
pnpm exec turbo run lint typecheck --filter=portal --filter=admin --filter=@pawser/ui
```

Expected: all pass.

- [ ] **Step 2: Build**

```bash
pnpm exec turbo run build --filter=portal --filter=admin
```

Expected: successful builds.

- [ ] **Step 3: Visual smoke**

Manually open portal and admin home (or Storybook if added later) and confirm: no harsh 1px section borders, primary actions use gradient, typography is Public Sans, cards use surface stacking.

---

## Plan review

Before large refactors, optionally run the **plan-document-reviewer** workflow from the writing-plans skill with this file and `design.md` as inputs.

---

## Execution handoff

**Plan complete and saved to** `docs/superpowers/plans/2026-03-27-pawser-design-system-styles.md`.

**Two execution options:**

1. **Subagent-driven (recommended)** — fresh subagent per task, review between tasks (`@superpowers:subagent-driven-development`).
2. **Inline execution** — run tasks in one session with checkpoints (`@superpowers:executing-plans`).

**Which approach do you want?**
