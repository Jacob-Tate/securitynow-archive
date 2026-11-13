import type { Episode, PictureState } from "./types.js";

export const SHOW_ARTWORK =
  "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/a1/be/2b/a1be2b5b-416d-eb8b-f008-dbf8f4dad378/mza_13520720204623959175.jpg/1400x1400bb.jpg";

export interface FeedOptions {
  baseUrl: string;
  generatedAt: Date;
}

/** The full-archive RSS feed, newest episode first. */
export function buildFeed(
  episodes: Episode[],
  pictures: Record<string, PictureState>,
  options: FeedOptions,
): string {
  const items = [...episodes]
    .sort((a, b) => b.number - a.number)
    .map((episode) => buildItem(episode, pictures[String(episode.number)]?.file ?? null, options.baseUrl))
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Security Now (Full Archive)</title>
<link>https://www.grc.com/securitynow.htm</link>
<atom:link href="${esc(`${options.baseUrl}/feed.xml`)}" rel="self" type="application/rss+xml"/>
<description>Every episode of Security Now with Steve Gibson and Leo Laporte, built from grc.com, with each episode's Picture of the Week. Unofficial.</description>
<language>en-us</language>
<lastBuildDate>${options.generatedAt.toUTCString()}</lastBuildDate>
<itunes:author>Steve Gibson, Leo Laporte</itunes:author>
<itunes:image href="${esc(SHOW_ARTWORK)}"/>
<image><url>${esc(SHOW_ARTWORK)}</url><title>Security Now (Full Archive)</title><link>https://www.grc.com/securitynow.htm</link></image>
<itunes:category text="Technology"/>
<itunes:explicit>false</itunes:explicit>
${items}
</channel>
</rss>
`;
}

function buildItem(episode: Episode, picture: string | null, baseUrl: string): string {
  const pictureUrl = picture ? `${baseUrl}/images/${picture}` : null;
  const lines = [
    "<item>",
    `<title>${esc(`SN ${episode.number}: ${episode.title}`)}</title>`,
    `<guid isPermaLink="false">grc-sn-${episode.number}</guid>`,
    `<pubDate>${pubDate(episode.recordedOn)}</pubDate>`,
    `<link>https://www.grc.com/securitynow.htm#${episode.number}</link>`,
    `<description>${esc(descriptionHtml(episode, pictureUrl))}</description>`,
    `<enclosure url="${esc(episode.audioUrl)}" length="${episode.audioBytes}" type="audio/mpeg"/>`,
    `<itunes:episode>${episode.number}</itunes:episode>`,
    `<itunes:episodeType>full</itunes:episodeType>`,
  ];
  if (episode.minutes) lines.push(`<itunes:duration>${episode.minutes * 60}</itunes:duration>`);
  if (pictureUrl) lines.push(`<itunes:image href="${esc(pictureUrl)}"/>`);
  lines.push("</item>");
  return lines.join("\n");
}

function descriptionHtml(episode: Episode, pictureUrl: string | null): string {
  const parts: string[] = [];
  if (pictureUrl) parts.push(`<p><img src="${esc(pictureUrl)}" alt="Picture of the Week"/></p>`);
  parts.push(`<p>${esc(episode.description)}</p>`);
  const links = [
    episode.notesUrl ? `<a href="${esc(episode.notesUrl)}">Show notes</a>` : null,
    episode.transcriptUrl ? `<a href="${esc(episode.transcriptUrl)}">Transcript</a>` : null,
  ].filter(Boolean);
  if (links.length) parts.push(`<p>${links.join(" &middot; ")}</p>`);
  return parts.join("");
}

/**
 * RFC 822 date for 19:00 Pacific on the recording day: roughly when TWiT
 * publishes, so the UTC date matches TWiT's and Apple's listings.
 */
export function pubDate(recordedOn: string): string {
  const [year, month, day] = recordedOn.split("-").map(Number) as [number, number, number];
  // Assume PST (UTC-8), then correct by an hour if Los Angeles is on daylight time.
  let utc = new Date(Date.UTC(year, month - 1, day, 19 + 8));
  const laHour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hourCycle: "h23" }).format(utc),
  );
  if (laHour === 20) utc = new Date(utc.getTime() - 3_600_000);
  return utc.toUTCString().replace("GMT", "+0000");
}

export function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
