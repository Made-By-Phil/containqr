# ContainQR — TODOS

Items deferred from sprint planning. Prioritized for future sprints.

---

## P1 — Next sprint (unblocked by Household Sharing sprint)

### scan_qr onboarding step detection bug ⚠️ NOW LIVE
**What:** Track owner's own QR scans separately from viewer scans for onboarding detection.
**Why:** `last_accessed` is only updated on viewer/public access. Owners scanning their own QR while logged in never complete the "Scan a QR code" onboarding step — the first-time activation experience is broken for every new user who tests their own QR code. Fix: add `owner_scanned_at` DateTimeField to Container, update `onboarding-status` API to check it, and set it in `ContainerByUUIDView` when the owner is authenticated.
**Effort:** S (human: 2hrs / CC: 5min)
**Status:** UNBLOCKED — onboarding checklist now ships with this bug active. This is a P1 bug for every new user.

### Stripe price validation at startup
**What:** In `AppConfig.ready()`, call `stripe.Price.retrieve(STRIPE_YEARLY_PRICE_ID)` and verify amount matches `STRIPE_YEARLY_PRICE_CENTS`. Log WARNING if drift detected.
**Why:** The /pricing page now displays the price prominently. Pricing page shows env var price; Stripe charges price ID amount. They can drift independently without alert. User sees one price and is charged another — high trust impact.
**Effort:** S (human: 1hr / CC: 5min)

### Onboarding checklist deep-link steps
**What:** Make each checklist step tappable and link directly to its action — step 1 opens the Add Container modal, step 3 opens QR view for their first container, step 5 scrolls to Share section in Account.
**Why:** Currently the checklist is informational only. A user who hasn't added a container sees "Add your first container" but has no affordance to do it from the checklist. Deep-links turn it from a status indicator into an interactive guide.
**Effort:** S (human: 3hrs / CC: ~10min)
**Depends on:** Onboarding checklist (now shipped — this enhances it)

### Per-container household viewer visibility (private containers)
**What:** Add a per-container toggle to hide specific containers from household viewer access while still accessible to the owner. The `is_password_protected` flag currently controls public URL access only — household viewers see all containers. This adds a separate `is_viewer_hidden` boolean.
**Why:** `is_password_protected` semantics are now overloaded: public/private is different from household-visible/hidden. Users with sensitive containers (gift storage, surprise items) may want selective household sharing.
**Effort:** S (human: 1 day / CC: ~10min)
**Depends on:** Household Sharing sprint (must ship first)

---

## P3 — Future phase

### Welcome email on subscription activation
**What:** Send a welcome email when `checkout.session.completed` fires in the Stripe webhook. 3-tip format: "print your first label," "share with your household," "search from your phone."
**Why:** New users land in the app cold with no onboarding email. The in-app checklist helps but email bridges the gap for users who close the browser before completing setup, or need a nudge hours later.
**Effort:** M (human: 1-2 days / CC: ~45min)
**Depends on:** Email infra (Resend or similar) — must be set up first. Hook into the existing Stripe webhook in `api/stripe_views.py`.

### Seasonal email campaigns
**What:** Pre-season email nudges (spring cleaning, holiday decor rotation) to re-engage users before their high-motivation moments.
**Why:** ContainQR is a seasonal-use product. Proactive reminders could drive usage before users even feel the pain — reducing churn by keeping the app top of mind.
**Effort:** M (human: 1 week / CC: ~45min)
**Depends on:** Email infra (Resend) — must be wired from auto-renewal email sprint first.

### Household stats dashboard card
**What:** Summary card showing: total containers, total items, most-searched item this month, days since last scan.
**Why:** Makes the passive utility feel alive and gives the owner a reason to open the dashboard even when not actively searching.
**Effort:** S (human: 1-2 days / CC: ~15min)

### Item duplication detection
**What:** Surface "Heads up: 'power drill' appears in 3 containers" in the dashboard or on search.
**Why:** Common problem for users with large inventories — reduces trust in the inventory over time. Proactive detection before the user notices.
**Effort:** M (human: 2-3 days / CC: ~20min)

### Async PDF export (Celery)
**What:** Move PDF export to a background task. Return job ID immediately; frontend polls for completion.
**Why:** Synchronous PDF generation with 500 containers + images is risky (30-second timeout). Move to async when p95 export time exceeds 10 seconds.
**Effort:** L (human: 1 week / CC: ~1hr)
**Depends on:** Monitor production export times first. Only implement if needed.

### Re-engagement email (before renewal canceller)
**What:** 90 days before renewal, send a value-focused email: tips for seasonal use, what's new, suggested spring cleaning workflow. No cancel mention.
**Why:** The outside voice argued the honest opt-out email (60 days before renewal) is churn-generation. A re-engagement email 30 days earlier may convert some of those inactive users before they see the opt-out offer.
**Effort:** S (human: 1 day / CC: ~15min)
**Depends on:** Auto-renewal canceller email (email infra must exist first)
