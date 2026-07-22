# dnata "Today" — MyGeotab Add-In

A MyGeotab Add-In that recreates the ZenduONE **"Today"** fleet-manager command
center — Clarity's AI-aggregated case queue, the case detail panel, digests and a
driver leaderboard — faithful to the source design (functionality + visuals).

It runs in two modes automatically:

- **Inside MyGeotab** — pulls the logged-in user's name and a live device count
  from the Geotab API (the greeting and "Assigned to me" reflect the real user).
  A green **"Live · N devices"** badge appears next to the greeting.
- **Standalone / preview** — mounts instantly with the curated dataset (no badge
  is shown). Nothing else changes, so you can develop and demo it without a
  MyGeotab login.

> The curated cases, digests, dashcam clips and the "Clarity" aggregation are demo
> content (as in the original design — these aren't native Geotab features). Only
> the user name and device count are read live. See *Going further* below.

---

## Files

| File | Purpose |
|---|---|
| `config.json` | MyGeotab Add-In manifest (menu item, icon, version). |
| `today.html` | Add-in page. Registers `geotab.addin.dnataToday` + a standalone bootstrap. |
| `app.js` | All rendering, interactions, and the Geotab live-context hook. |
| `data.js` | The curated demo dataset (12 cases, digests, streak, users). |
| `styles.css` | ZenduONE / Untitled-UI design tokens + every component. |
| `fonts/` | Self-hosted Inter variable fonts (for visual fidelity). |
| `images/` | Icon, dashcam frame, and driver avatar. |

Everything is self-contained — **no build step, no external CDN, no npm.**

---

## Preview locally

From the parent folder:

```bash
python3 -m http.server 8123
```

Then open <http://localhost:8123/geotab-addin/today.html>.
It mounts immediately in **demo mode**.

---

## Install in MyGeotab

MyGeotab loads add-ins from a **hosted HTTPS URL**, so:

1. **Host the `geotab-addin/` folder** on any HTTPS static host — e.g. GitHub
   Pages, Netlify, Amazon S3 + CloudFront, or your own server. Confirm
   `https://<your-host>/today.html` loads and shows the page.

2. **Point the manifest at the absolute URL.** In `config.json`, change the
   relative paths to absolute ones for your host:

   ```json
   {
     "name": "dnataToday",
     "supportEmail": "aryandesai@zenduit.com",
     "version": "1.1.1",
     "items": [
       {
         "url": "https://<your-host>/today.html",
         "path": "",
         "menuName": { "en": "Today" },
         "icon": "https://<your-host>/images/icon.svg"
       }
     ],
     "isSigned": false
   }
   ```

   (`path: ""` puts it in the main left navigation. Use a value like
   `"ActivityLink/"` to nest it elsewhere.)

3. **Add it in MyGeotab.** Go to **Administration → System… → System Settings →
   Add-Ins**, click **New Add-In**, paste the edited `config.json`, save, then
   **reload MyGeotab**. A **Today** item appears in the navigation.

The first time the add-in initializes, it calls `api.getSession(...)` for the
user, then `Get User` and `Get Device` to personalize the greeting and badge. If
those calls fail or the add-in is opened outside MyGeotab, it degrades gracefully
to demo mode.

---

## What's implemented

Navigation is **Today (Cases)** and **Management** (v1.1.1 trimmed the Digests,
Recognize and Asset Allocation views). Case categories: **Collisions,
Temperature, Reliability**.

- **Cases view** — greeting, Clarity digest carousel, 12-day streak chip (with a
  14-day history popover), category tabs with live counts, search, multi-facet
  **Filters** popover, queue-progress bar, and the full case feed.
- **Case cards** — pin, category chip, relative time, severity, assignee, due,
  status, per-type primary action, aggregation roll-up, and (non-critical only)
  the ⋯ menu.
- **Case detail panel** — slide-in overlay with editable **status / severity /
  assignee**, SLA, *What happened*, evidence clip filmstrip (click to expand a
  player), operational context, "Investigate by asking" Clarity prompts, the blue
  **Recommended action** block with primary + other actions, defer/dismiss
  (non-critical), and a notes + activity timeline with a composer.
- **Queue rules** — High-severity cases are locked (no defer/dismiss); resolving,
  deferring and dismissing all show an **Undo** toast so nothing is lost;
  changing severity re-sorts and re-locks live.
- **New Case** — creates a real case (title, category, urgency, linked entity,
  assignee, note) that lands at the top of the queue with the full toolset,
  including FNOL.
- **Export summary** downloads a `.txt` of the case.

## Accident response & FNOL (v1.1)

The "Sideswipe reported - Truck #T-118" case is a full **Accident Case** that
prototypes the collision-to-insurer workflow (*Today manages the immediate
response · the Accident Case preserves the record · FNOL creates the insurer
package*):

- **Auto-created case** — the collision event is preserved on the case: dashcam
  clips, location, time, driver/vehicle, and **speed + lateral-g graphs** with
  event markers 30 s before/after impact.
- **Configurable status pipeline** — Potential Accident → Driver Contact
  Required → Under Review → Confirmed Accident → Evidence Collection → FNOL
  Required → FNOL Submitted → Awaiting Insurer Response → Closed. Click any step
  to set it; actions advance it automatically.
- **Driver welfare call** — "Contact driver" opens a **pre-call whisper**
  (driver, vehicle, time/location, detected severity, video availability, key
  questions), then a live two-way camera call (or phone fallback, with an
  unreachable-escalation chain: phone → driver app → voice agent → supervisor).
  The call is recorded **with a notice**; on end, the recording (secure link),
  transcript and summarized responses attach to the case and the status
  advances.
- **Incident details** — editable injuries / third-party / police / towing /
  vehicle-condition fields that feed the FNOL form.
- **First Notice of Loss (every case)** — the Start FNOL button sits in the top
  status row of **every** case (including ones you create with New Case); the
  accident case gets the richest prefill, other cases prefill what the record
  knows and flag the rest for confirmation — a structured form prefilled from the case
  (including the driver statement pulled from the welfare call), an evidence
  picker (secure links for video/recordings), email + webhook destinations, a
  review-package step, and on submit a **preserved submission record**: who/when,
  destination, delivery status, the generated package (downloadable), the exact
  evidence shared, and the insurer-response slot.

Everything is session-state demo logic — see below for wiring it to live data.

## Going further (real telematics)

To drive the queue from live data, extend `loadLiveContext()` in `app.js`: pull
`ExceptionEvent`s (speeding, harsh braking, seatbelt…) via `api.call('Get', …)`,
group them by driver/vehicle/segment, and map each group onto the same case
shape `data.js` uses. The rendering and interactions stay unchanged.
