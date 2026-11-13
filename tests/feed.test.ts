import assert from "node:assert/strict";
import { test } from "node:test";

import { buildFeed, esc, pubDate } from "../src/feed.js";
import type { Episode } from "../src/types.js";

const episode: Episode = {
  number: 930,
  title: "Rowhammer & <Fingerprints>",
  description: "What's a “Rug Pull”?",
  recordedOn: "2023-07-11",
  minutes: 110,
  audioUrl: "https://media.grc.com/sn/sn-930.mp3",
  audioBytes: 53_000_000,
  notesUrl: "https://www.grc.com/sn/sn-930-notes.pdf",
  transcriptUrl: null,
};

test("dates episodes at 19:00 Pacific, in summer and winter", () => {
  assert.equal(pubDate("2023-07-11"), "Wed, 12 Jul 2023 02:00:00 +0000");
  assert.equal(pubDate("2026-11-10"), "Wed, 11 Nov 2026 03:00:00 +0000");
});

test("replaces or drops characters XML doesn't allow", () => {
  assert.equal(esc("long\u001Eawaited"), "long-awaited");
  assert.equal(esc("a\u0000b\u0007c\td\ne"), "abc\td\ne");
});

test("escapes XML special characters", () => {
  assert.equal(esc(`a & b < c > "d" 'e'`), "a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;");
});

test("builds an item with the picture as episode image and in the description", () => {
  const xml = buildFeed([episode], { "930": { file: "sn-0930.jpg", checkedAt: "" } }, {
    baseUrl: "https://example.test/sn",
    generatedAt: new Date("2026-11-13T00:00:00Z"),
  });
  assert.match(xml, /<title>SN 930: Rowhammer &amp; &lt;Fingerprints&gt;<\/title>/);
  assert.match(xml, /<guid isPermaLink="false">grc-sn-930<\/guid>/);
  assert.match(xml, /<enclosure url="https:\/\/media.grc.com\/sn\/sn-930.mp3" length="53000000" type="audio\/mpeg"\/>/);
  assert.match(xml, /<itunes:image href="https:\/\/example.test\/sn\/images\/sn-0930.jpg"\/>/);
  assert.match(xml, /&lt;img src=&quot;https:\/\/example.test\/sn\/images\/sn-0930.jpg&quot;/);
  assert.match(xml, /<itunes:duration>6600<\/itunes:duration>/);
});

test("omits the episode image when there's no picture", () => {
  const xml = buildFeed([episode], {}, { baseUrl: "https://example.test", generatedAt: new Date() });
  assert.doesNotMatch(xml, /images\/sn-0930/);
});
