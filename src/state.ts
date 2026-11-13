import { readFile, writeFile } from "node:fs/promises";

import type { ArchiveState } from "./types.js";

export async function loadState(path: string): Promise<ArchiveState> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as ArchiveState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { episodes: {}, pictures: {}, scrapedYears: [] };
    }
    throw new Error(`Could not read state from ${path}: ${(error as Error).message}`);
  }
}

/** Written with sorted keys so the committed file only changes where the data does. */
export async function saveState(path: string, state: ArchiveState): Promise<void> {
  const sorted: ArchiveState = {
    episodes: sortByNumber(state.episodes),
    pictures: sortByNumber(state.pictures),
    scrapedYears: [...new Set(state.scrapedYears)].sort((a, b) => a - b),
  };
  await writeFile(path, `${JSON.stringify(sorted, null, 1)}\n`);
}

function sortByNumber<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => Number(a) - Number(b)));
}
