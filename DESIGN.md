# Design System — ContainQR

## Product Context
- **What this is:** Container inventory management with QR codes — scan a label, find what's inside, share access with household members without requiring accounts
- **Who it's for:** People with large homes, storage units, or lots of organized containers (moving boxes, seasonal gear, hobby supplies) who experience the "where is X?" failure mode
- **Space/industry:** Personal productivity / household management. Passive utility — used intensely a few times a year, not daily
- **Project type:** HYBRID — marketing shell (/, /pricing) + web app (/dashboard, /account, /move, /print-labels) + mobile viewer (/viewer, /viewer/dashboard)

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian with warmth
- **Decoration level:** Minimal — typography and structure do all the work; amber accent is used sparingly and deliberately
- **Mood:** The feeling of a well-organized workshop: functional, confident, quietly satisfying. Not clinical. Not playful. The design should feel like it takes the problem seriously without taking itself seriously.
- **Safe choices:** Monospace identifiers for container codes (category norm — users expect it), sticky search bar in viewer (mobile best practice), clear hierarchy in container lists
- **Risks taken:** Amber accent (every competitor in this space uses blue or teal — we deliberately didn't), dark canvas for marketing pages (warmer and more distinct than typical SaaS white), search-first viewer dashboard (no container grid on initial load — search is the product)

## Typography
- **Display/Hero:** Satoshi — geometric, functional, slightly warm. Used for: page headings, hero text, container codes in display contexts, marketing copy
  - Load: `@import url('https://api.fontshare.com/v2/css?f[]=satoshi@700,400&display=swap')`
- **Body:** DM Sans — clean, reads well at small sizes, pairs naturally with Satoshi without competing
  - Load: Google Fonts `DM+Sans:wght@400;500;600`
- **UI/Labels:** DM Sans (same as body) — consistent throughout the app shell
- **Data/Tables:** DM Sans with `font-variant-numeric: tabular-nums` — for item counts, dates, subscription amounts
- **Code/Identifiers:** JetBrains Mono — container codes (GAR-BL-01), household access codes (ABC 123), QR content. Letter-spacing: 0.3em for access codes.
  - Load: Google Fonts `JetBrains+Mono:wght@400;600`
- **Scale:**
  - xs: 0.75rem / 12px
  - sm: 0.875rem / 14px
  - base: 1rem / 16px
  - lg: 1.125rem / 18px
  - xl: 1.25rem / 20px
  - 2xl: 1.5rem / 24px
  - 3xl: 1.875rem / 30px
  - 4xl: 2.25rem / 36px
  - 5xl: 3rem / 48px (hero only)

## Color
- **Approach:** Restrained — one amber accent, warm neutrals, color is rare and meaningful
- **Background:** `#F7F4EF` — warm off-white (not pure white; reduces eye strain for a utility app used in bright environments)
- **Surface:** `#FFFFFF` — cards, modals, inputs
- **Dark canvas:** `#1A2B2B` — deep warm dark green; used ONLY on marketing pages (hero, pricing header). Never in the app shell.
- **Primary text:** `#1A1A1A`
- **Muted text:** `#6B7280`
- **Border:** `#E5E2DC` — warm gray, matches off-white background temperature
- **Accent:** `#D4820A` — amber; primary CTAs, active states, onboarding highlights. Used sparingly.
- **Accent dark:** `#B36C00` — hover state for accent elements
- **Accent pale:** `#FFF4E0` — accent backgrounds (onboarding card, info banners)
- **Success:** `#3D7A4A` — muted green
- **Warning:** `#E8A547` — amber-adjacent (distinguishable from accent but harmonious)
- **Error:** `#C94444` — muted red
- **Dark mode strategy:** Invert bg/surface, reduce saturation 10-20%, keep amber accent at same hue but slightly lighter (#E8943F). Dark canvas becomes the primary background.

```css
:root {
  --bg:          #F7F4EF;
  --surface:     #FFFFFF;
  --dark-canvas: #1A2B2B;
  --text:        #1A1A1A;
  --muted:       #6B7280;
  --border:      #E5E2DC;
  --accent:      #D4820A;
  --accent-dark: #B36C00;
  --accent-pale: #FFF4E0;
  --success:     #3D7A4A;
  --warning:     #E8A547;
  --error:       #C94444;
  --font-display: 'Satoshi', sans-serif;
  --font-body:    'DM Sans', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
}
```

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable (not compact — this is a household tool, not a data-dense dashboard)
- **Scale:**
  - 2xs: 2px
  - xs: 4px
  - sm: 8px
  - md: 16px
  - lg: 24px
  - xl: 32px
  - 2xl: 48px
  - 3xl: 64px
  - 4xl: 96px

## Layout
- **Approach:** Hybrid — grid-disciplined for app shell, composition-first for marketing shell
- **Shell architecture:**
  - **Marketing shell** (/, /pricing): dark canvas hero + light content sections. Header: logo left + [Pricing, Sign In] right.
  - **App shell** (/dashboard, /account, /move, /print-labels): sticky 48px header with logo + search + user menu. Background: `--bg`.
  - **Viewer shell** (/viewer, /viewer/dashboard): marketing shell header (no user menu). Single-column, mobile-first.
- **Grid:** 12 columns, max content width 1200px, 24px gutters
- **Content max-width:** 768px for reading content; 1200px for app views
- **Border radius:**
  - sm: 4px (inputs, badges)
  - md: 8px (cards, buttons)
  - lg: 12px (modals, large panels)
  - full: 9999px (pills, avatar)

### Route-Level Information Hierarchy

**/ (Marketing Hero):**
1. Dark canvas hero: ContainQR wordmark (largest) → tagline → [Get Started] CTA → [See Pricing]
2. Feature section: 3 proof points (text + icon, NO card grid)
3. Simple CTA band: amber background → "Start organizing" → button

**`/pricing`:**
1. Dark canvas header: "One price. Everything included."
2. Price block: `$29 / year` (Satoshi, large) → "Cancel anytime." (muted)
3. What's included: bulleted list (no cards)
4. [Get Started] CTA → /register

**`/dashboard` (app shell):**
1. Onboarding checklist (amber card, dismissible — visible until all steps complete)
2. Container list header: "Your Containers" + [+ New Container] button
3. Container list grouped by location (not grid — list rows with name, item count, last accessed)
4. Empty state: warm illustration + "Add your first container" + [+ New Container]

**`/c/<uuid>/` (public container view — updated):**
1. Header: ContainQR logo + readable_id breadcrumb (existing)
2. Container contents (existing)
3. If `is_password_protected` AND not authenticated owner: 4-digit passcode overlay
   - Full-screen centered modal (not page replace): "Enter passcode to view this box"
   - 4 digit inputs (separate `<input>` fields, auto-advance, `inputMode="numeric"`)
   - Auto-submits on 4th digit
   - Error: inline below inputs "Incorrect passcode. Try again." (no page reload)
   - Correct passcode: stored in sessionStorage, modal dismisses, content shown
4. Discovery banner (shown to non-authenticated viewers, below content):
   - Accent-pale background, amber left border
   - "Want to search all boxes? [Search household →]" → links to inline search or share link prompt
5. "Search all boxes" section (below discovery banner):
   - Search input (full width)
   - Results: list rows with container name, location, matched item names highlighted
   - Tapping a result navigates to that container's `/c/<uuid>/`

**`/view/<share_token>/` (shareable household search dashboard):**
1. Header: ContainQR logo (viewer shell — no user menu)
2. If owner has passcode configured: 4-digit passcode overlay (same as container view)
3. Sticky search bar (full width, pre-focused on mount)
4. Muted subtitle: "Searching [Owner name]'s household — read only"
5. Initial state: placeholder "Search containers or items..."
6. After search: container list results (name, location, item count, matched items highlighted)
7. No container grid — list rows only, all viewports
8. If share token is invalid/disabled: "This link is no longer active." + [Go home →]

**`/account`:**
1. Section "Subscription": status badge + renewal date + [Manage Billing] (→ Stripe portal)
2. Section "Household Sharing":
   a. Share Link: full URL (truncated, copyable) + [Copy Link] + [Rotate] + [Disable]
      - Disabled state: "Link disabled" + [Enable] — no URL shown
      - Rotating shows confirmation: "Old link will stop working immediately. Continue?"
   b. Passcode: "Require a passcode to view password-protected boxes"
      - If not set: [Set Passcode] → 4-digit input modal
      - If set: "●●●●" (masked) + [Change] + [Remove]
      - 4-digit only, numeric, no letters
3. Section "Account": email (read-only) + [Sign Out]

**`/print-labels` (desktop 2-col, mobile stacked):**
1. Left (40%): container selector + search filter + checkboxes
2. Right (60%): live label preview (QR code + container code + name)
3. Sticky footer: "N labels selected" + [Print / Download PDF]

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension. No decorative animation.
- **Easing:** enter: `ease-out` / exit: `ease-in` / move: `ease-in-out`
- **Duration:**
  - micro: 50–100ms (hover states, focus rings)
  - short: 150–200ms (button states, badge transitions)
  - medium: 250–350ms (modals open/close, drawer slide)
  - long: 400–600ms (page transitions, onboarding step completion)
- **Specific motions:**
  - Onboarding step checked off: checkmark animates in (short) + card collapses (medium)
  - Toast notification: slides in from bottom (short) + auto-dismisses after 3s (fade, short)
  - Modal: fade + scale from 0.95 to 1.0 (medium)
  - Search results: fade in (short) — no layout shift

## Interaction States

### Critical States by Feature

| Feature | Loading | Empty | Error |
|---------|---------|-------|-------|
| /view/<token> search | Skeleton: 5 rows, 80% width, animated | "No containers in this household yet." | Invalid/disabled token: "This link is no longer active." + [Go home] |
| /c/<uuid> passcode prompt | 4th digit auto-submits (no spinner) | n/a | "Incorrect passcode. Try again." (inline, no reload) |
| /c/<uuid> household search | Skeleton rows fade in | "No results for '[query]'" | "Couldn't search. [Retry]" |
| /dashboard container list | Skeleton rows | Warm empty state illustration + CTA | "Couldn't load containers. [Retry]" |
| /account Stripe portal | Button disabled + spinner | n/a | "Couldn't open billing portal. Try again or contact support." |
| /print-labels PDF export | Progress indicator | "Select containers to print" | "Export failed. [Try again]" |

### Touch Targets
All interactive elements: minimum 44×44px (iOS HIG). This is especially critical in `/c/<uuid>/` and `/view/<share_token>/` which are mobile-primary (accessed via phone after scanning a QR or tapping a shared link).

### Passcode Input Pattern
- 4 separate `<input type="text" inputMode="numeric" maxLength={1}>` fields
- Auto-advance on each digit; backspace moves to previous field
- Auto-submits on 4th digit (no submit button needed)
- Paste handling: pasting "1234" into first field populates all four
- Wrong passcode: inputs clear + shake animation (100ms, 3px horizontal) + error message shown inline

### Offline Behavior
- `navigator.onLine` check on mount
- React Query `staleTime: 5 minutes` — show cached data with "Viewing offline data" banner
- Expired/rotated share link mid-session: full-screen overlay (not banner):
  ```
  "This link is no longer active."
  [Go home →]
  ```

## Accessibility
- Keyboard navigation: all interactive elements reachable via Tab; modals trap focus; Escape closes
- ARIA landmarks: `<main>`, `<nav>`, `<header>` on every page
- Screen readers: all icon-only buttons have `aria-label`; status badges have `role="status"`
- Contrast: all text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Passcode input: 4 separate numeric inputs, auto-advance, auto-submit on 4th digit (see Passcode Input Pattern above)

## AI Slop Avoidance Rules

These patterns are explicitly banned:
1. No 3-column feature grid with icons in colored circles
2. No purple/violet/indigo gradients — amber only
3. No centered everything — use left-aligned text in app shell
4. No uniform border-radius on all elements — follow the scale
5. No decorative blobs or wavy SVG dividers
6. No emoji in headings or as bullet points
7. No "Unlock the power of..." or "Your all-in-one solution for..." hero copy
8. No stacked cards as the primary layout for the app dashboard — use list rows
9. No gradient buttons — solid amber fill or outlined
10. No section headers that are just mood statements — each section does one job

## Physical Labels
- QR code only — no ContainQR wordmark or branding
- Container code below QR in JetBrains Mono (e.g., "GAR-BL-01")
- Container name below code (DM Sans, regular)
- Rationale: labels are physical objects in the home — they should serve the user, not advertise the product

## Discovery Paths

### Discovery Banner (on public container view, `/c/<uuid>`)
Shown only to non-authenticated viewers, below container contents:
```
"Search all boxes in this household →"
```
Styled as a warm info banner (accent-pale `#FFF4E0` background, amber `#D4820A` left border, 3px). Not sticky. Tapping expands an inline search field (does not navigate away from the current container view).

### Shareable Link (`/view/<share_token>/`)
- Owner generates from `/account` → Household Sharing section
- UUID-based token stored on User model (`household_share_token`)
- Can be rotated (new UUID, old link immediately invalid) or disabled (token set to null)
- If owner has `household_passcode` set: viewer is prompted on first access per session
- Passcode stored in sessionStorage only — never localStorage, never sent to server except for validation
- Backend: `GET /api/view/<share_token>/containers/?q=<query>` — validates token, returns all containers

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-23 | Amber (#D4820A) as accent color | Every competitor uses blue or teal. Amber is warm, distinctive, and fits the "organized home" positioning. |
| 2026-03-23 | Industrial/Utilitarian with warmth aesthetic | ContainQR is a tool, not a social product. The design should feel competent and calm. |
| 2026-03-23 | Warm off-white (#F7F4EF) background | Pure white reads as clinical. Off-white reads as considered. |
| 2026-03-23 | Dark canvas (#1A2B2B) for marketing pages only | Differentiation without sacrificing app usability. |
| 2026-03-23 | Search-first viewer dashboard | Search IS the product for viewers. Showing a container grid on load would be wrong — they don't know which container to look at. |
| 2026-03-23 | No brand wordmark on physical labels | Labels serve the user, not the product. QR + code + name is all that's needed. |
| 2026-03-23 | Yearly price $29/year, no monthly comparison | Annual framing, no monthly anchor to minimize perceived price. "One price. Everything included. Cancel anytime." |
| 2026-03-23 | JetBrains Mono for all identifiers | Container codes need to be scannable at a glance. Monospace + letter-spacing makes them unmistakable. |
| 2026-03-23 | Initial design system created | Created by /design-consultation based on product context + /plan-design-review findings |
| 2026-03-23 | No 6-char household code — shareable UUID link instead | Verbal codes create friction (transcription errors, "is that a zero or an O?"). UUID link is copy-paste via text. Passcode is separate for protection, not access discovery. |
| 2026-03-23 | 4-digit numeric passcode (not alphanumeric) | Easiest to share verbally and remember. 10,000 combinations is sufficient for household trust model (not banking). Rate-limited on backend. |
| 2026-03-23 | is_password_protected semantics: passcode gate, not owner-only | Password protection now means "requires 4-digit household passcode." Authenticated owner always bypasses. Not a privacy/hidden flag — that's a future feature (is_viewer_hidden in TODOS). |
| 2026-03-23 | Passcode in sessionStorage only, never localStorage | Passcode should expire when browser closes. Family member shares a device? Next session re-prompts. localStorage would be permanent and unexpected. |
