import { execFile } from "node:child_process";
import { mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { USER_AGENT } from "./grc.js";

const run = promisify(execFile);

/** Smaller images on page 1 are icons or rules, not the Picture of the Week. */
const MIN_SIDE = 100;

interface PdfImage {
  index: number;
  width: number;
  height: number;
}

/**
 * Extract the Picture of the Week (the largest image on page 1 of the show notes)
 * into `imagesDir` as `sn-NNNN.jpg|png`. Returns the file name, or null when the
 * notes have no usable picture. Requires poppler's `pdfimages`.
 */
export async function extractPicture(number: number, notesUrl: string, imagesDir: string): Promise<string | null> {
  const work = await mkdtemp(join(tmpdir(), "sn-notes-"));
  try {
    const pdf = join(work, "notes.pdf");
    const response = await fetch(notesUrl, { headers: { "User-Agent": USER_AGENT } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GET ${notesUrl} failed: ${response.status}`);
    await writeFile(pdf, Buffer.from(await response.arrayBuffer()));

    const picture = largestImage(await listPageOneImages(pdf));
    if (!picture) return null;
    // -j keeps JPEGs as they are; everything else becomes PNG.
    await run("pdfimages", ["-f", "1", "-l", "1", "-j", "-png", pdf, join(work, "img")]);
    const extracted = (await readdir(work)).find((f) => f.startsWith(`img-${String(picture.index).padStart(3, "0")}.`));
    if (!extracted) return null;
    const file = `sn-${String(number).padStart(4, "0")}.${extracted.split(".").pop()}`;
    await rename(join(work, extracted), join(imagesDir, file));
    return file;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

async function listPageOneImages(pdf: string): Promise<PdfImage[]> {
  try {
    const { stdout } = await run("pdfimages", ["-f", "1", "-l", "1", "-list", pdf]);
    return parseImageList(stdout);
  } catch (error) {
    // Some early PDFs are malformed; treat them as having no picture.
    console.warn(`pdfimages could not read ${pdf}: ${(error as Error).message.split("\n")[0]}`);
    return [];
  }
}

/** Parse `pdfimages -list` output (two header lines, then one row per image). */
export function parseImageList(output: string): PdfImage[] {
  return output
    .split("\n")
    .slice(2)
    .map((line) => line.trim().split(/\s+/))
    .filter((cols) => cols.length >= 5 && cols[2] === "image")
    .map((cols) => ({ index: Number(cols[1]), width: Number(cols[3]), height: Number(cols[4]) }));
}

export function largestImage(images: PdfImage[]): PdfImage | null {
  const usable = images.filter((i) => Math.min(i.width, i.height) >= MIN_SIDE);
  if (usable.length === 0) return null;
  return usable.reduce((best, i) => (i.width * i.height > best.width * best.height ? i : best));
}
