/** One Security Now episode as listed on grc.com. */
export interface Episode {
  number: number;
  title: string;
  description: string;
  /** Recording date from GRC (YYYY-MM-DD, Pacific time). */
  recordedOn: string;
  minutes: number | null;
  audioUrl: string;
  /** Approximate size from GRC's listing ("53 MB"); 0 when unknown. */
  audioBytes: number;
  notesUrl: string | null;
  transcriptUrl: string | null;
}

/** Result of looking for the Picture of the Week in an episode's show notes. */
export interface PictureState {
  /** File name under docs/images, or null when the notes have no usable picture. */
  file: string | null;
  checkedAt: string;
}

export interface ArchiveState {
  episodes: Record<string, Episode>;
  pictures: Record<string, PictureState>;
  /** Past-year pages already scraped; they don't change, so they're not fetched again. */
  scrapedYears: number[];
}
