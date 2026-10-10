# AGENTS.md

Read this before changing Hark Road Trip. Owner and only approver: Steven ([@stozo04](https://github.com/stozo04)). He checks previews on his phone, so phone layouts matter as much as desktop.

## What this is

An independent tracker for Brett Adcock's promise (posted October 10, 2026, after Hark launched on Tuesday October 6) of **12 major features over the next ~60 days**. The window is fixed at **October 10 to December 8, 2026** (day 1 to day 60). Sibling of [Ship Happens](https://github.com/stozo04/ship-happens), same stack and conventions.

- Live site: https://hark-herald.vercel.app/
- Public JSON feed: `GET /api/tracker` (documented for outside agents in `llms.txt`)
- Stack: plain HTML, CSS and JavaScript, one Node serverless function, no runtime dependencies. Hosted on Vercel.

## Where the data lives

The live site does **not** read data from this repo. `api/tracker.js` reads three tables from Supabase: `hark_settings`, `hark_features` and `hark_users`. They live in Steven's shared Supabase project (the same one as Ship Happens), so only touch `hark_*` tables. Find the project with the Supabase connector by looking for those tables. Don't add project names, refs or keys to the repo.

- No fallback data. Missing env vars or a storage failure means HTTP 503 and the page says live data is unavailable.
- Vercel previews read the same production tables, so a data-only change needs no PR.
- Writes are live for everyone immediately. Confirm data changes with Steven before writing.
- A separate bot of Steven's (the same one that keeps Ship Happens current) checks Brett's and Hark's X posts hourly and writes `hark_*` rows on its own for clear cases. It never changes code or UI. Each run stamps `sync_checked_at` in `hark_settings.content`; if that is stale, the bot isn't running, so add features by hand. Keep its instructions and this file consistent.

### Schema rules the database enforces

- `hark_features.id` is `f-<YYYY-MM-DD>-<slug>`, e.g. `f-2026-10-14-family-calendar`.
- `shipped_on` is the Central calendar date of the announcement post, on or after 2026-10-10.
- `source_url` must match `https://x.com/<handle>/status/<id>`, for features and user counts alike. `product_url` is optional and must be https.
- `title` is at most 80 characters, `summary` at most 400. `category` is free text, default `Feature`; keep it to a short noun.
- `hark_users` has one row per date (`as_of`), with the count Brett or Hark posted and the post as `source_url`.

## Adding a feature

1. Get the source: the X post where Brett or the Hark team announces it. If you can't open X, ask Steven for the post text or a screenshot.
2. Decide if it counts. It counts when they present it as a new feature or launch. Bug fixes, small tweaks, rollouts of something already counted, and promises ("coming soon") don't. When unsure, ask Steven.
3. Insert one `hark_features` row. Exit order is derived from `shipped_on` then `id`; never store an exit number.
4. Bump `hark_settings.content.verified_at` to today.
5. Verify: `curl -s https://hark-herald.vercel.app/api/tracker` shows `"mode":"supabase"` and the new row.

Writing style for titles and summaries: plain words, no hype, say what changed for users, one or two sentences.

## How the app is built

| File | Role |
| --- | --- |
| `index.html` | Static markup: hero, trip card, route map, exits, dialogs. |
| `app.mjs` | Fetches `/api/tracker` and renders. DOM only. |
| `lib/herald.mjs` | Pure, tested logic: `dayNumber`, `seals` (exit order), `pace`, `userTally`, route geometry (`routeX`, `routeY`, `roadPath`, `paceSigns`). Put new logic here. |
| `style.css` | The only stylesheet. Tokens in `:root`. Breakpoints 680px and 900px. |
| `api/tracker.js` | Serverless Supabase reader. 503 when storage is unavailable. |
| `scripts/build.mjs` | Copies a **fixed list** of files to `dist/`. Add new top-level files there. |
| `llms.txt` | Feed guide for outside agents. Update it if the feed's shape changes. |

Pace rule (`pace` in `lib/herald.mjs`): 12 in 60 days is one every five days. On day N, on pace means between floor(N/5) and ceil(N/5) delivered; below is behind, above is ahead; 12 is "Promise kept". After December 8 the verdict is final: kept or fell short. Dates are calendar dates in `America/Chicago`.

## Design rules

- **Plain over clever.** Every number says exactly what it counts.
- **Road trip theme.** Highway green means a stop reached (shipped feature or reached pace sign). Seasons on the route map follow the calendar: fall (Oct), Thanksgiving (Nov), winter (Dec). Gold is only for bonus exits. Plain, friendly copy, no old-timey talk.
- **Fun in small doses.** The car drives to today on load, the December lights twinkle. No more motion than that, and respect reduced motion.
- **Mobile first.** Check 390px, ~900px and 1440px with no horizontal scrolling.

## Workflow

- Work on a branch and open a focused PR. Give Steven the Vercel preview link (share link for his phone) before he merges.
- Before a PR: `npm test`, `npm run build`, and a look at the three widths.
- Never commit credentials or personal data. `.env*` is ignored except `.env.example`.
- Cloud sessions: check that you can push before doing the work. `gh pr create` may fail (GraphQL blocked); use `gh api repos/stozo04/hark-herald/pulls` instead.

## Open questions for Steven

- The promise post URL. `hark_settings.content.source_url` points at Brett's profile until we have it.
- The first user count (562,000 on October 10) needs its post URL before it can go into `hark_users`.
