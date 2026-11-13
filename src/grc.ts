import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import type { Episode } from "./types.js";

export const GRC_BASE = "https://www.grc.com";
export const USER_AGENT = "securitynow-archive (+https://github.com/Jacob-Tate/securitynow-archive)";

/** The page listing the current year's episodes, and the archive page for a past year. */
export function pageUrl(year: number | "current"): string {
  return year === "current" ? `${GRC_BASE}/securitynow.htm` : `${GRC_BASE}/sn/past/${year}.htm`;
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  }
  // GRC serves Windows-1252 without saying so; latin1 decodes every byte.
  return new TextDecoder("latin1").decode(await response.arrayBuffer());
}

const HEADER = /^Episode\s*#(\d+)\s*\|/;

/**
 * Every released episode on a GRC listing page, read from each entry's
 * "Episode #N | date | length" header (anchor names are occasionally wrong).
 * Entries without audio (upcoming episodes, rerun specials) are skipped.
 */
export function parseEpisodes(html: string): Episode[] {
  const $ = cheerio.load(html);
  const episodes: Episode[] = [];
  $('font[size="1"]').each((_, font) => {
    const match = HEADER.exec(clean($(font).text()));
    if (!match) return;
    const episode = parseEntry($, $(font).closest("table"), Number(match[1]));
    if (episode) episodes.push(episode);
  });
  return episodes;
}

function parseEntry($: cheerio.CheerioAPI, header: cheerio.Cheerio<AnyNode>, number: number): Episode | null {
  const body = header.next("table");
  const [, date, length] = clean(header.text()).split("|").map((part) => part.trim());
  const recordedOn = date ? parseGrcDate(date) : null;
  const titleFont = body.find('font[size="2"]').first();
  const title = clean(titleFont.text());
  const hq = body.find('a[href$=".mp3"]').filter((_, a) => !($(a).attr("href") ?? "").endsWith("-lq.mp3")).first();
  const audioUrl = absolute(hq.attr("href"));
  if (!recordedOn || !title || !audioUrl) return null;

  const fullText = clean(titleFont.parent().text());
  const description = fullText.startsWith(title) ? fullText.slice(title.length).trim() : fullText;
  const minutes = Number.parseInt(length ?? "", 10);
  return {
    number,
    title,
    description,
    recordedOn,
    minutes: Number.isNaN(minutes) ? null : minutes,
    audioUrl,
    audioBytes: parseSize(hq.parent().text()),
    notesUrl: absolute(body.find('a[href$="-notes.pdf"]').first().attr("href")),
    transcriptUrl: absolute(body.find(`a[href$="sn-${number}.htm"]`).first().attr("href")),
  };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "11 Jul 2023", "5 June 2007", "18 Sept 2012" or "05 May2026" to an ISO date. */
export function parseGrcDate(raw: string): string | null {
  // Spaces are optional: GRC has typos like "05 May2026".
  const match = /^(\d{1,2})\s*([A-Za-z]+)\s*(\d{4})$/.exec(raw.trim());
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTHS.indexOf((monthName ?? "").slice(0, 3).toLowerCase()) + 1;
  if (month === 0 || !day || !year) return null;
  return `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** "53 MB" or "287 KB" to bytes; 0 when there's no size. */
export function parseSize(raw: string): number {
  const match = /([\d.]+)\s*(KB|MB|GB)/i.exec(clean(raw));
  if (!match) return 0;
  const units: Record<string, number> = { KB: 1e3, MB: 1e6, GB: 1e9 };
  return Math.round(Number(match[1]) * (units[(match[2] ?? "").toUpperCase()] ?? 0));
}

function absolute(href: string | undefined): string | null {
  if (!href) return null;
  return new URL(href, GRC_BASE).toString();
}

function clean(text: string): string {
  return text.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}
