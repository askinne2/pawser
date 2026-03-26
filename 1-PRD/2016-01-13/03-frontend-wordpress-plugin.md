# WordPress Plugin v1

> **Type:** Frontend PRD  
> **Feature:** WordPress Plugin  
> **Source:** CodeSpring PRD `c4d4b7ce-e4e7-47bc-bb29-127c5f7603c8`

---

## Feature Overview

Provide a WordPress plugin v1 that exposes a single shortcode to embed the ShelterLuv-hosted adoption portal in a responsive, accessible iframe. The embed must auto-resize to content, support basic configuration via attributes, load efficiently, and degrade gracefully when iframes are blocked.

## Requirements

### Shortcode

**Tag:** `[shelterluv_portal]`

**Required:** one of `tenant` or `src`

**Attributes (all optional unless marked):**

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `tenant` | string | - | Tenant slug; composes src to the portal embed endpoint |
| `src` | url | - | Full https URL to embed if tenant not provided. Must be allowlisted |
| `view` | string | - | Initial route/view (e.g., "adopt", "browse", "favorites", "pet/{id}") |
| `species` | csv | - | Filter (e.g., "dog,cat"). Appended as query |
| `theme` | string | "auto" | "light" \| "dark" \| "auto" \| "brand" |
| `color` | hex | - | Brand color without alpha (e.g., "#0EA5E9") |
| `title` | string | "Adoptable pets" | Iframe title for accessibility |
| `lazy` | bool | "true" | Defer loading until in viewport |
| `ratio` | string | "auto" | Aspect ratio "16:9" \| "4:3" \| "1:1" \| "auto" |
| `height` | string | "auto" | Fixed height in px (e.g., "800") or "auto" |
| `border` | bool | "false" | Show border |
| `lang` | string | - | BCP-47 language tag (e.g., "en-US") |

### Rendered Output

- Responsive wrapper div (width: 100%)
- If ratio != auto and height = auto: maintain aspect ratio via intrinsic ratio box; min-height 400px
- If height is numeric: set iframe height in px; still allow dynamic resize if message received
- **Iframe attributes:**
  - `loading="lazy"` (if lazy)
  - `allow="fullscreen; clipboard-read; clipboard-write"`
  - `referrerpolicy="strict-origin-when-cross-origin"`
  - `sandbox` with: `allow-scripts allow-forms allow-same-origin allow-popups`
- Iframe title from title attribute; role not overridden

### Auto-resize Behavior

- Listen for postMessage from embed origin with type `shelterluv:resize` and integer height
- Update wrapper/iframe height up to max 5000px
- Ignore messages from non-allowlisted origins
- Initial height: 600px until first resize or fixed height if provided

### Loading and Error States

- **While loading:** show lightweight skeleton placeholder; `aria-busy` on container; visually hidden loading text ("Loading adoptable pets…")
- **If iframe fails (error/blocked) after 5s:** show fallback link button "Open adoption portal" to the src in a new tab; maintain link visible with `role="alert"`
- Multiple embeds per page must function independently

### Content Security and Safety

- Only https sources
- If src provided, must match allowlist host pattern (configurable, e.g., `*.shelterluv.{domain}`)
- Append `utm_source=wordpress&utm_medium=embed` to src

### Internationalization

- Plugin UI strings (loading, fallback) must be translatable
- Default locale en-US

## User Stories

1. As a shelter webmaster, I add `[shelterluv_portal tenant="paws"]` and see a responsive embedded portal without code.
2. As a marketer, I set `theme="brand"` and `color="#0EA5E9"` so the embed aligns with my site.
3. As a visitor on mobile, the embed fits my screen and scrolls naturally; I can open it in a new tab if blocked.

## Technical Considerations

- Namespaced CSS/JS to avoid conflicts; no global selectors; no jQuery dependency
- Use IntersectionObserver for lazy load; fallback to onload if unavailable
- Must support multiple embeds; isolate event listeners per instance; throttle resize updates
- **Performance budget:** ≤4 KB JS, ≤1 KB CSS, gzip. No render-blocking resources
- **Accessibility:** focus must remain on page; ensure iframe has title; fallback link keyboard accessible; maintain color contrast in plugin UI elements
- **Compatibility:** WordPress 6.0+, PHP 7.4+, works with Classic and Block Editor (shortcode only in v1)

## Success Criteria

| Metric | Target |
|--------|--------|
| Iframe render time | 99% within 2s of entering viewport on 4G |
| Console errors | 0 from the plugin across supported browsers |
| Auto-resize success | ≥ 95% of loads where portal supports postMessage |
| Validation | Clear admin-facing errors when misconfigured |
| Accessibility | iframe titled, focusable fallback, no WCAG AA violations |
