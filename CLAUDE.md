# securitynow-archive

Builds an unofficial full-archive RSS feed for the Security Now podcast from grc.com,
with each episode's Picture of the Week extracted from Steve's show-notes PDFs.
Published on GitHub Pages from `docs/`.

## Layout
- `src/grc.ts`: fetch and parse grc.com listing pages (cheerio).
- `src/pictures.ts`: download show notes, pick the largest page-1 image, extract with `pdfimages`.
- `src/feed.ts`: RSS XML. Item guid `grc-sn-<n>`, pubDate 19:00 Pacific on the recording day.
- `src/state.ts`: `data/state.json` cache (episodes, picture results, scraped years). Committed.
- `src/index.ts`: entry point run by `.github/workflows/update.yml` weekly (Wednesday).
- `docs/`: GitHub Pages output (`feed.xml`, `index.html`, `images/`). Generated; committed by the Action.

## Rules
- Be polite to grc.com: past-year pages are scraped once, PDFs once each, 2 at a time.
- Never re-host audio; enclosures point at `media.grc.com`.
- Don't change guids or the pubDate rule: Ryot and Audiobookshelf match episodes on them.
- TypeScript strict mode; `npm run typecheck` and `npm test` must pass.

## Commands
- `npm test`: unit tests (node:test via tsx), fixture in `tests/fixtures/grc-2023.htm`.
- `npm run build && node dist/index.js`: full run (needs `pdfimages`).
