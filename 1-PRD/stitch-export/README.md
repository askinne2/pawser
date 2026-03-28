# Stitch Export — Kindred Slate Design System

Exported from Google Stitch on 2026-03-27. These are the reference HTML files for the
Pawser design system. Do not edit these files — they are the source of truth for design.

## Files

- `DESIGN.md` — Full design system spec (Compassionate Curator / Kindred Slate)
- `component_overview.html` — All components: buttons, inputs, badges, avatars, nav
- `admin_dashboard.html` — Admin dashboard home screen
- `widget_builder.html` — Widget builder screen (settings panel + live preview)
- `marketing_homepage.html` — Marketing site homepage
- `widget_animal_grid.html` — Embeddable widget: animal grid + filter sidebar

## Design System Name

**Kindred Slate** — The "Compassionate Curator" aesthetic.

## Key decisions

- Font: Source Sans 3 (Google Fonts)
- Icons: Material Symbols Outlined
- Primary: `#00113f` (deep slate navy, not generic cobalt)
- Surface system: 6-level tonal layering, no 1px borders
- Border radius: 12px default, 16px large, full for pills
- No drop shadows — use surface color shifts for depth
- Tailwind CSS via CDN with custom config (token-mapped)
