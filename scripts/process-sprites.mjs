// Converts raw generated art (white background) into trimmed transparent PNG sprites.
import sharp from "sharp";
import fs from "node:fs";

const names = ["ajie_idle", "ajie_spike", "abao_idle", "abao_spike"];
fs.mkdirSync("public/sprites", { recursive: true });

for (const name of names) {
  const { data, info } = await sharp(`assets-src/${name}.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const isBg = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r > 228 && g > 228 && b > 228 && Math.max(r, g, b) - Math.min(r, g, b) < 26;
  };
  const removed = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (removed[p] || !isBg(p * 4)) return;
    removed[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w, y = (p / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  // Remove light fringe touching the background (2 passes)
  for (let pass = 0; pass < 2; pass++) {
    const toRemove = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (removed[p]) continue;
        if (removed[p - 1] || removed[p + 1] || removed[p - w] || removed[p + w]) {
          const i = p * 4;
          if (Math.min(data[i], data[i + 1], data[i + 2]) > 190) toRemove.push(p);
        }
      }
    }
    for (const p of toRemove) removed[p] = 1;
  }
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (removed[p]) data[p * 4 + 3] = 0;
      else {
        data[p * 4 + 3] = 255;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  // tiny speck cleanup is skipped; trim to bbox and scale by height (aspect ratio preserved)
  const out = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .resize({ height: 360, fit: "inside" })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });
  fs.writeFileSync(`public/sprites/${name}.png`, out.data);
  console.log(name, out.info.width, "x", out.info.height, "aspect", (out.info.width / out.info.height).toFixed(3));
}
