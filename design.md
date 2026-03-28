# Design System Strategy: The Compassionate Curator

## 1. Overview & Creative North Star
The North Star for this design system is **"The Digital Sanctuary."**

We are moving away from the rigid, sterile grids of traditional "dev-tool" interfaces. Instead, we are adopting an editorial, high-end aesthetic that feels curated rather than generated. This system balances the technical precision required for a modern application with the warmth of a premium lifestyle publication.

By leveraging intentional asymmetry, oversized display typography, and a "tonal-first" layering logic, we create an environment that feels authoritative yet deeply approachable. We don't just show data; we present it with care.

---

## 2. Colors & Surface Logic
The palette is anchored by a sophisticated Slate Blue, moving away from generic cobalt to a tone that feels like expensive stationary or high-end architectural accents.

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders for sectioning or layout containment.
Boundaries must be defined solely through:
- **Background Color Shifts:** Use `surface-container-low` for secondary sections sitting on a `surface` background.
- **Vertical Rhythm:** Use the Spacing Scale (specifically `8` to `12` tokens) to create "invisible" partitions.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of fine, semi-translucent paper.
- **Base Layer:** `surface` (#faf9ff).
- **Secondary Content:** `surface-container-low` (#f3f3fa).
- **Primary Interaction Cards:** `surface-container-lowest` (#ffffff) to provide a "pop" of brightness.
- **Tertiary Details:** `surface-container-high` (#e8e7ee) for deeply nested metadata.

### The "Glass & Gradient" Rule
To avoid a flat, "Bootstrap" feel, use Glassmorphism for floating navigation and modals.
- **Effect:** Apply `surface` at 80% opacity with a `20px` backdrop-blur.
- **Signature Gradients:** Use a subtle linear gradient (Top-Left to Bottom-Right) transitioning from `primary` (#00113f) to `primary_container` (#1d4ed8) for hero CTAs to add "soul" and depth.

---

## 3. Typography
We utilize **Public Sans** as our sole typeface. Its geometric foundation provides professional clarity, while its soft terminals offer the "friendly" warmth requested.

* **Display (lg/md/sm):** Used for "Curator" moments. Align these with asymmetrical layouts. Don't be afraid to let a `display-lg` headline take up 70% of the viewport width.
* **Headline (lg/md/sm):** Reserved for section headers. Always pair with generous `bottom-margin` (Token `6` or `8`).
* **Title (lg/md/sm):** For card headers and navigational elements.
* **Body (lg/md/sm):** Set `body-lg` with a slightly increased line-height (1.6) to maintain the editorial feel.
* **Labels:** Use `label-md` in all-caps with `0.05rem` letter-spacing for metadata to create an authoritative, "cataloged" look.

---

## 4. Elevation & Depth
In this system, depth is a feeling, not a drop-shadow.

* **The Layering Principle:** Achieve lift by "stacking." A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural, soft contrast that replaces the need for heavy shadows.
* **Ambient Shadows:** If an element must float (e.g., a dropdown or modal), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(26, 27, 32, 0.04)`. The shadow color must be a tint of `on-surface`, never pure black.
* **The "Ghost Border":** If accessibility requires a stroke, use `outline-variant` at **15% opacity**. High-contrast borders are strictly forbidden.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), white text, `8px` (Round Eight) corners.
- **Secondary:** `surface-container-highest` background with `primary` text. No border.
- **Tertiary:** Pure text with `primary` color, using an underline only on hover.

### Cards & Lists
- **Rule:** Forbid the use of divider lines.
- Use the **Spacing Scale `4` (1.4rem)** to separate list items.
- For cards, use `surface-container-low` with an `8px` radius. Content inside should be padded using the `5` or `6` spacing tokens to ensure "breathing room."

### Input Fields
- **Default State:** Background `surface-container-highest` with a `Ghost Border` (10% opacity `outline-variant`).
- **Focus State:** Background remains, border increases to 100% opacity `primary`.
- **Labeling:** Use `label-md` placed 0.5rem above the input, never floating inside.

### Signature Component: The "Editorial Quote"
A specialized component for the Pawser brand. A `body-lg` text block with a `primary` left-accent bar (4px width), set in a `surface-container-lowest` box. This anchors the "Compassionate Curator" vibe.

---

## 6. Do’s and Don'ts

### Do:
- **Use White Space as a Tool:** If a layout feels cluttered, don't add a line—add more space (Token `10` or `12`).
- **Asymmetric Balance:** Place a large `display-md` headline on the left and a small `body-md` paragraph offset to the right.
- **Tonal Transitions:** Use `surface` color shifts to guide the eye from the navigation to the main content.

### Don’t:
- **No 1px Borders:** Never use a solid, high-contrast line to separate content. It breaks the "sanctuary" feel.
- **No "Dev-Blue":** Avoid the default #0000FF. Only use the curated Slate-Blue tokens.
- **No Default Shadows:** Never use the standard CSS `box-shadow: 0 2px 4px rgba(0,0,0,0.5)`. It feels cheap and "out-of-the-box."
- **No Tight Padding:** If the text is touching the edge of a container, the layout is broken. Use the `Round Eight` logic for both corners and internal padding.