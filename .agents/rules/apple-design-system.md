---
trigger: always_on
---

# MyTravel UI/UX Design Rules — Apple Style Reference (Excluding Color Palette)

These workspace rules adapt the two Apple Style Reference specifications (*Apple — Style Reference* and *Apple (España) — Style Reference*) into binding UI/UX standards for **MyTravel**.

## Scope & Brand Color Exemption

- **Ignore Apple Color Tokens**: Do **not** replace MyTravel's Tourism Malaysia brand palette (`--mt-navy`, `--mt-blue`, `--mt-red`, `--mt-green`, `--mt-canvas`, and existing liquid-glass surface tints) with Apple's monochrome/blue hex codes (`#0071e3`, `#1d1d1f`, `#f5f5f7`).
- **Enforce Structural, Motion, Button, Ratio & Wording Rules**: Every screen, component, sheet, and copy string in MyTravel **must** follow the typography ratios, spatial 4px grid, pill/card border-radius system, restrained elevation, fluid spring motion, button hierarchy, and editorial wording rules below.

---

## 1. Typography, Scale & Proportional Ratios

1. **Dual SF Pro Font Roles**
   - **Display & Headings (`--font-sf-pro-display`)**: `'SF Pro Display', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` — used for hero lockups, page titles (`h1`), sheet headers, and section/card titles (`h2`, `h3`).
   - **Body, Controls & UI (`--font-sf-pro-text`)**: `'SF Pro Text', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` — used for body paragraphs, buttons, inputs, navigation labels, badges, and captions.

2. **Contrastive Line-Height Ratio**
   - Keep line-height **tight on display and heading sizes (`1.08–1.20`)** so titles feel architectural and anchored.
   - Open line-height **generously on body and supporting copy (`1.44–1.47` unitless)** so dense transit, verification, and tourism information breathes effortlessly.
   - Always use unitless `line-height` values (never fixed `px` line-heights on multi-line text) and never set fixed `height` on text-bearing cards, pills, or badges—use `min-height` / `min-block-size` so scaled text (`--mt-text-scale`) never clips.

3. **Size-Dependent Tracking (Letter-Spacing) Curve**
   - **Display & Page Titles (`>= 22px`)**: Tight negative tracking (`-0.022em` to `-0.016em`) at weight `600–700`.
   - **Mid-Size Section & Card Headings (`16px–21px`)**: Warm, slightly open or neutral tracking (`-0.005em` to `+0.007em`) at weight `600` (avoid heavy `800–900` weights that make cards shout).
   - **Body Copy & Button Labels (`13px–17px`)**: Crisp negative tracking (`-0.016em` to `-0.022em`) at weight `400` (body) or `600` (interactive controls).
   - **Captions & Metadata (`11px–12.5px`)**: Clean `-0.01em` tracking at weight `500–600`. Reserve uppercase kickers sparingly for top-level sheet eyebrows only.

4. **Tabular Figures for Live Metrics**
   - Apply `font-variant-numeric: tabular-nums;` on all numbers that update or align vertically/horizontally: Eco-Points balances, transit departure/arrival times, durations, fares, stop counts, KPI metrics, and progress counters.

5. **Alignment & Rag Control**
   - Never center multi-line body paragraphs (`p`, `li`); keep supporting copy left-aligned (`text-align: start`) and cap prose measure around `60ch–65ch`. Centered alignment is reserved only for hero lockups, compact stat tiles, or empty states.
   - Apply `text-wrap: balance` to short standalone headings (`h1, h2, h3`) without boxed backgrounds, and `text-wrap: pretty` to multi-line body paragraphs (`p, li`). Never apply `text-wrap` to `*`.

---

## 2. Spatial 4px Grid, Radii & Restrained Elevation ("Ratio")

1. **4px Base Unit & Comfortable Breathing Room**
   - Anchor paddings, margins, and gaps to the `4px` spatial scale (`4, 8, 12, 16, 20, 24, 28, 32, 40, 44, 48, 64, 80px`).
   - Give cards comfortable internal padding (`16px–20px` on mobile, `20px–28px` on tablet/desktop) and consistent vertical rhythm (`12px–16px` between cards, `20px–28px` between major bands).

2. **Signature Border-Radius System**
   - **Cards, Showcase Panels & Bottom/Modal Sheets (`--mt-radius-card: 28px`)**: Use `28px` rounding (`24px` only on ultra-compact `< 390px` viewports) as the signature architectural card corner.
   - **Concentric Nested Surfaces (`16px–20px`)**: When an image, map frame, or sub-panel sits inside a `28px` card with `12px–16px` padding, round the inner element to `16px–20px` (`R_inner ≈ R_outer - padding`) so corners nest concentrically.
   - **Interactive Buttons, Segmented Controls, Filter Chips & Action Pills (`--mt-radius-pill: 980px`)**: Always use fully rounded pill geometry (`980px` / `999px`). Square or lightly rounded action buttons (`8px–16px`) break the system's fluid feel.
   - **Minimum Element Radius (`>= 10px`)**: Never apply a `border-radius` below `10px` to any interactive element, input, transit line badge, or code chip.
   - **Pagination Dots**: Circular `8px` dots separated by a `7px` horizontal gap, paired with an accessible pause/play control when a carousel auto-advances.

3. **Elevation Philosophy (Surface Shifts & Hairlines Over Heavy Shadows)**
   - Do **not** put heavy chromatic or dark drop shadows on buttons or standard cards.
   - Establish hierarchy through `1px` hairline borders, subtle surface/tint contrast, and scale shifts. Reserve soft ambient elevation strictly for floating overlays (sheets, toasts, map pins, and the floating navigation bar).

---

## 3. Button Architecture & Action Hierarchy ("Button" — Apple iOS 26/27 Liquid Glass)

1. **iOS 26/27 Liquid Glass Material & One Primary CTA per Context**
   - Limit tinted Liquid Glass primary buttons (`.mt-primary`) to **at most one primary action** per card, form, or sheet. Apply MyTravel's brand fill (`--mt-red` / `--mt-navy`) layered with a subtle top-down glass refraction gradient, `backdrop-filter: blur(20px) saturate(180%)`, and crisp `inset` specular rim highlights (`inset 0 1px 0.5px rgba(255, 255, 255, 0.44)`) — **never** heavy outer drop shadows.
   - Never stack two filled primary buttons together. Pair every primary filled pill with a **translucent Liquid Glass secondary pill** (`.mt-secondary` — frosted `backdrop-filter: blur(22px) saturate(180%)`, `1px solid` hairline border, `inset` specular rim highlight, `980px` radius) or a quiet directional text link.
   - Apply matching Liquid Glass capsule styling (`980px` pill radius, `backdrop-filter`, `inset` specular rim, spring `:active` compression `scale(0.97)`, and `outline: 2px solid` `:focus-visible` ring) to circular/capsule controls (`.mt-back`, `.mt-language`, `.mt-icon-button`, `.itinerary-back-btn`) and segmented pill tracks.

2. **Proportional Pill Sizing & Touch Ergonomics**
   - Every interactive control must meet at least `44×44px` hit-target sizing on touch (`>= 24×24px` minimum on fine pointers) with comfortable horizontal padding (`16px–24px`) and `font-weight: 600` (never `800–900` shouting text).
   - On Tablet (`>= 600px`) and Desktop (`>= 840px`), standalone primary/secondary CTAs and segmented pill tracks must size proportionally (`inline-flex` / capped `max-width`) rather than stretching edge-to-edge across wide viewports.

3. **Directional Text Links with Trailing Chevron**
   - Inline section actions and tertiary links (e.g., `View all ›`, `Open interactive map ›`, `View rewards ›`, `Manage ›`) must have **no background fill and no boxy border**—use clean accent text with a trailing chevron (`›` or `→`), revealing underline or subtle chevron motion on hover.

---

## 4. Fluid Motion, Physics Curves & Reduced Motion ("Motion")

1. **Poised Apple Deceleration & Spring Curves**
   - Replace generic linear/`ease` transitions and `transition: all` with explicit property transitions using damped Apple timing curves:
     - `--mt-ease-apple: cubic-bezier(0.22, 1, 0.36, 1)` (`260ms–360ms`) for sheet entrances, modal reveals, card appearances, and view transitions.
     - `--mt-ease-press: cubic-bezier(0.32, 0.72, 0, 1)` (`180ms–220ms`) for tactile button press (`transform: scale(0.98)`), toggle switches, segmented pill highlights, and fine-pointer hover lifts (`translateY(-1px)`).

2. **Compositor-Thread Discipline**
   - Animate **only** `transform` (`translate`, `scale`, `rotate`) and `opacity` (alongside non-layout `background-color`, `border-color`, or `color` washes).
   - Never animate layout-triggering properties (`width`, `height`, `margin`, `padding`, `top`, `left`).

3. **Respect Reduced Motion & Auto-Play Controls**
   - **Never** apply a blanket `* { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }` hack.
   - Opt in to spatial entrance/slide/scale animations inside `@media (prefers-reduced-motion: no-preference)` (and suppress spatial movement when `prefers-reduced-motion: reduce` or `html.mt-reduce-motion` is active), while keeping gentle `color` / `background-color` / `opacity` transitions intact.
   - Any auto-advancing carousel lasting longer than 5 seconds must pause under reduced motion and expose a keyboard-accessible Pause/Play button (without `aria-pressed` when the accessible label switches between `"Pause"` and `"Play"`).

---

## 5. Editorial Wording & Microcopy Voice ("Wording")

1. **Sentence Case & Whispered Confidence**
   - Write headings, subheadings, tab labels, form labels, and buttons in **natural sentence case** (e.g., `Add travel tip`, `Live service status`, `End current navigation`, `Sign in to earn rewards`). Capitalize only proper nouns and official program names (`MyTravel`, `Malaysia`, `Eco-Points`, `Digital Passport`, `MyKad`, `MyDigital ID`, `Google Maps`, `VM2026`, `GTFS-RT`).

2. **Zero Slash Clutter or Compound Bureaucracy**
   - Avoid slash-separated compound labels (`"Sign In / Register"`, `"Exit / End current navigation"`, `"Please Sign-in to Continue / Get more Rewards"`, `"MyKad / Passport Photo"`). Choose one clear, human verb phrase (`"Sign in"`, `"End current navigation"`, `"Sign in to earn rewards"`, `"Upload ID photo"`).

3. **Concise, Deliberate Microcopy**
   - Keep button labels to **1–4 words** with an unmistakable action verb (`Find route`, `Start this journey`, `Save settings`, `Submit verification`, `Redeem`).
   - Avoid repeating identical titles back-to-back in the same viewport, avoid decorative ASCII symbols (`☆`, `★`, `♧`) where clean icons or words belong, and keep empty/helper states warm, factual, and direct in both English (`EN`) and Bahasa Melayu (`BM`).
