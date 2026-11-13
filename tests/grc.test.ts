import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { parseEpisodes, parseGrcDate, parseSize } from "../src/grc.js";

const page2023 = readFileSync(new URL("./fixtures/grc-2023.htm", import.meta.url), "latin1");
const page2017 = readFileSync(new URL("./fixtures/grc-2017.htm", import.meta.url), "latin1");

test("parses every 2023 episode", () => {
  const numbers = parseEpisodes(page2023).map((e) => e.number);
  assert.equal(numbers.length, 51);
  assert.equal(Math.min(...numbers), 904);
  assert.equal(Math.max(...numbers), 954);
});

test("reads one episode's fields", () => {
  const episode = parseEpisodes(page2023).find((e) => e.number === 930);
  assert.ok(episode);
  assert.equal(episode.title, "Rowhammer Indelible Fingerprinting");
  assert.equal(episode.recordedOn, "2023-07-11");
  assert.equal(episode.minutes, 110);
  assert.equal(episode.audioUrl, "https://media.grc.com/sn/sn-930.mp3");
  assert.equal(episode.audioBytes, 53_000_000);
  assert.equal(episode.notesUrl, "https://www.grc.com/sn/sn-930-notes.pdf");
  assert.equal(episode.transcriptUrl, "https://www.grc.com/sn/sn-930.htm");
  assert.match(episode.description, /^Could it be that yet another SQL injection flaw/);
  assert.match(episode.description, /indelible fingerprints\.$/);
});

test("parses GRC's date spellings", () => {
  assert.equal(parseGrcDate("11 Jul 2023"), "2023-07-11");
  assert.equal(parseGrcDate("5 June 2007"), "2007-06-05");
  assert.equal(parseGrcDate("18 Sept 2012"), "2012-09-18");
  assert.equal(parseGrcDate("05 May2026"), "2026-05-05");
  assert.equal(parseGrcDate("sometime soon"), null);
});

test("parses listed sizes", () => {
  assert.equal(parseSize("53 MB"), 53_000_000);
  assert.equal(parseSize("287 KB"), 287_000);
  assert.equal(parseSize(""), 0);
});

test("uses the header's number when the anchor is mislabelled", () => {
  // On GRC's 2017 page, #602 sits under <a name="603">.
  const episodes = parseEpisodes(page2017);
  const e602 = episodes.find((e) => e.number === 602);
  const e603 = episodes.find((e) => e.number === 603);
  assert.equal(e602?.title, "Let's Spoof");
  assert.ok(e603);
  assert.notEqual(e603.title, "Let's Spoof");
  assert.equal(new Set(episodes.map((e) => e.number)).size, episodes.length);
});
