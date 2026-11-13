import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { buildFeed } from "./feed.js";
import { fetchText, pageUrl, parseEpisodes } from "./grc.js";
import { extractPicture } from "./pictures.js";
import { loadState, saveState } from "./state.js";
import type { ArchiveState, Episode } from "./types.js";

const FIRST_YEAR = 2005;
const STATE_FILE = "data/state.json";
const DOCS_DIR = "docs";
const IMAGES_DIR = join(DOCS_DIR, "images");
/** Show notes are sometimes posted after the episode; keep looking for this long. */
const RECHECK_MISSING_PICTURE_DAYS = 30;
const PICTURE_CONCURRENCY = 2;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

async function main(): Promise<void> {
  const baseUrl = (process.env.PUBLIC_BASE_URL ?? "https://jacob-tate.github.io/securitynow-archive").replace(/\/$/, "");
  const maxNewPictures = Number(process.env.MAX_NEW_PICTURES ?? "0");
  const state = await loadState(STATE_FILE);
  await mkdir(IMAGES_DIR, { recursive: true });

  await scrapeEpisodes(state);
  await addPictures(state, maxNewPictures);

  const episodes = Object.values(state.episodes);
  await writeFile(join(DOCS_DIR, "feed.xml"), buildFeed(episodes, state.pictures, { baseUrl, generatedAt: new Date() }));
  await writeFile(join(DOCS_DIR, "index.html"), indexPage(baseUrl, episodes.length));
  await saveState(STATE_FILE, state);
  const withPictures = Object.values(state.pictures).filter((p) => p.file).length;
  console.log(`Feed written: ${episodes.length} episodes, ${withPictures} with a Picture of the Week.`);
}

/** Past years are scraped once; this year and last year every run (episodes move at New Year). */
async function scrapeEpisodes(state: ArchiveState): Promise<void> {
  const thisYear = new Date().getUTCFullYear();
  const pages: (number | "current")[] = ["current"];
  for (let year = thisYear - 1; year >= FIRST_YEAR; year--) {
    if (year < thisYear - 1 && state.scrapedYears.includes(year)) continue;
    pages.push(year);
  }
  for (const page of pages) {
    const url = pageUrl(page);
    let found: Episode[];
    try {
      found = parseEpisodes(await fetchText(url));
    } catch (error) {
      console.error(`Skipping ${url}: ${(error as Error).message}`);
      continue;
    }
    for (const episode of found) state.episodes[String(episode.number)] = episode;
    if (page !== "current" && found.length > 0) state.scrapedYears.push(page);
    console.log(`${url}: ${found.length} episodes`);
  }
}

async function addPictures(state: ArchiveState, maxNew: number): Promise<void> {
  const now = Date.now();
  const due = Object.values(state.episodes)
    .filter((e) => e.notesUrl && needsPicture(state, e, now))
    .sort((a, b) => b.number - a.number);
  const batch = maxNew > 0 ? due.slice(0, maxNew) : due;
  console.log(`Looking for ${batch.length} Pictures of the Week (${due.length} due).`);
  for (let i = 0; i < batch.length; i += PICTURE_CONCURRENCY) {
    await Promise.all(batch.slice(i, i + PICTURE_CONCURRENCY).map((e) => addPicture(state, e)));
  }
}

function needsPicture(state: ArchiveState, episode: Episode, now: number): boolean {
  const picture = state.pictures[String(episode.number)];
  if (!picture) return true;
  if (picture.file) return false;
  const ageDays = (now - Date.parse(episode.recordedOn)) / 86_400_000;
  return ageDays <= RECHECK_MISSING_PICTURE_DAYS;
}

async function addPicture(state: ArchiveState, episode: Episode): Promise<void> {
  try {
    const file = await extractPicture(episode.number, episode.notesUrl as string, IMAGES_DIR);
    state.pictures[String(episode.number)] = { file, checkedAt: new Date().toISOString() };
  } catch (error) {
    // Left unrecorded so the next run tries again.
    console.error(`Episode ${episode.number}: could not get the picture: ${(error as Error).message}`);
  }
}

function indexPage(baseUrl: string, count: number): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Security Now Archive Feed</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem">
<h1>Security Now: full archive feed</h1>
<p>An unofficial RSS feed of all ${count} Security Now episodes, built from
<a href="https://www.grc.com/securitynow.htm">grc.com</a>, with each episode's Picture of the Week.</p>
<p>Feed URL: <code>${baseUrl}/feed.xml</code></p>
</body></html>
`;
}

main().catch((error: unknown) => {
  console.error("Archive update failed:", error);
  process.exit(1);
});
