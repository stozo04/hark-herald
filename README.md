# Hark Road Trip

An independent tracker for Brett Adcock's promise of [12 major Hark features over the next ~60 days](https://x.com/adcock_brett), October 10 to December 8, 2026.

[Visit the app](https://hark-herald.vercel.app/) · [Contribute](CONTRIBUTING.md) · [Report an issue](https://github.com/stozo04/hark-herald/issues)

## What it tracks

- **Twelve exits.** Each major feature becomes the next highway exit, in the order it ships. Extras are bonus; anything after December 8 is late.
- **Pace.** Twelve in sixty days is one every five days. The hero says whether Hark is ahead, on pace or behind, and when the next one is due.
- **The route.** A road from Oct 10 to Dec 8 through fall, Thanksgiving and winter, with a pace sign every fifth day and a car at today.
- **Receipts.** Every feature and every user count links its original X post.

## Development

Plain HTML, CSS and JavaScript with one Node serverless function. No runtime dependencies. Node 22 or newer.

```sh
git clone https://github.com/stozo04/hark-herald.git
cd hark-herald
npm test
npm run build
```

The build writes static assets to `dist/`; Vercel serves `api/tracker.js` alongside them. To run your own copy, create a Supabase project, run `db/schema.sql`, and set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (see `.env.example`). If storage is unavailable the API returns 503 and the page says so instead of showing old data.

Agents: start with [AGENTS.md](AGENTS.md). Outside agents can read the public feed described in [llms.txt](llms.txt).

## License

[MIT](LICENSE). Independent fan project, not affiliated with Hark or Figure. Sibling of [Ship Happens](https://github.com/stozo04/ship-happens).
