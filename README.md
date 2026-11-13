# Security Now: full archive feed

An unofficial RSS feed of **every** Security Now episode, with each episode's
**Picture of the Week**.

**Feed:** https://jacob-tate.github.io/securitynow-archive/feed.xml

TWiT's own feed only carries the latest ~20 episodes. This one is rebuilt every
Wednesday from [grc.com](https://www.grc.com/securitynow.htm), Steve Gibson's
episode listings, so a podcast app (or Audiobookshelf, or Ryot) can see the
whole back catalogue.

## What's in each episode

- Title, recording date, length and Steve's description, from grc.com.
- Audio: GRC's own MP3 (`media.grc.com`). No audio is re-hosted here.
- The Picture of the Week: the main image on page 1 of Steve's show-notes PDF,
  shown as the episode image and at the top of the description. Show notes
  exist from about episode 450 (2014); older episodes use the show artwork.
- Links to the show notes and transcript.

Each item has a stable guid (`grc-sn-<number>`) and `itunes:episode` number.
Publish times are set to 19:00 Pacific on the recording day, which gives the
same UTC date as TWiT's feed so episodes line up across apps.

## How it works

A [weekly GitHub Action](.github/workflows/update.yml) runs `src/index.ts`:

1. Scrapes grc.com's current-year page and last year's archive page. Older
   archive pages never change, so they're fetched once and kept in
   `data/state.json`.
2. For each episode not yet checked, downloads the show-notes PDF and extracts
   the largest page-1 image with poppler's `pdfimages` into `docs/images/`.
   Each PDF is processed once (recent episodes are re-checked for 35 days in
   case the notes are posted late).
3. Writes `docs/feed.xml`, validated with `xmllint`, which GitHub Pages serves.

It runs on Wednesdays, after Tuesday's episode is posted. If an episode shows
up late, run it manually from the Actions tab.

## Running locally

Requires Node 22 and `pdfimages` (`brew install poppler` or
`apt install poppler-utils`).

```sh
npm ci
npm test
npm run build
PUBLIC_BASE_URL=https://example.github.io/securitynow-archive node dist/index.js
```

`MAX_NEW_PICTURES=<n>` limits how many PDFs one run processes.

## Credits

Inspired by Jan Kanis's
[SecurityNow-podcast-archiver](https://github.com/JanKanis/SecurityNow-podcast-archiver)
(MIT), which first scraped grc.com into an archive feed. This is an
independent TypeScript reimplementation that adds the Pictures of the Week.

Security Now is produced by Steve Gibson ([GRC](https://www.grc.com)) and
[TWiT](https://twit.tv/shows/security-now). Pictures of the Week are collected by
Steve from listeners and around the internet and belong to their owners. This
project isn't affiliated with either.
