import assert from "node:assert/strict";
import { test } from "node:test";

import { largestImage, parseImageList } from "../src/pictures.js";

const listing = `page   num  type   width height color comp bpc  enc interp  object ID x-ppi y-ppi size ratio
--------------------------------------------------------------------------------------------
   1     0 image      48    48  index   1   8  image  no        36  0    96    96  868B  38%
   1     1 image     512   640  rgb     3   8  jpeg   no        74  0   114   115 76.4K 8.0%
   1     2 smask     512   640  gray    1   8  image  no        75  0   114   115 10K 3.0%
`;

test("reads image rows and ignores masks", () => {
  assert.deepEqual(parseImageList(listing), [
    { index: 0, width: 48, height: 48 },
    { index: 1, width: 512, height: 640 },
  ]);
});

test("picks the largest image and ignores icons", () => {
  assert.deepEqual(largestImage(parseImageList(listing)), { index: 1, width: 512, height: 640 });
  assert.equal(largestImage([{ index: 0, width: 48, height: 48 }]), null);
});
