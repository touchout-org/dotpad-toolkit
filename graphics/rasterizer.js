// Pixel-buffer drawing primitives for a tactile dot grid.
//
// Deliberately hardware-agnostic: nothing here knows about the Dot Pad SDK,
// BLE, or any wire protocol. It just draws 0/1 values into a flat
// Uint8Array(width * height) buffer -- see graphics/packPixelsToHex.js for
// the step that turns such a buffer into something the device understands.
//
// Drawing directly at native tactile resolution (rather than rendering a
// full-size vector image and downscaling it) guarantees every touched pixel
// is fully on. A thin line drawn into a large image and then shrunk with
// normal anti-aliased image scaling can fade below the on/off threshold and
// vanish -- Bresenham into the actual target buffer can't do that.

export function setGridPixel(pixels, w, h, x, y) {
  if (x >= 0 && x < w && y >= 0 && y < h) pixels[y * w + x] = 1;
}

// Bresenham line, endpoints rounded to the nearest pixel first.
export function drawLinePixels(pixels, w, h, x0, y0, x1, y1) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x1 > x0 ? 1 : -1, sy = y1 > y0 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  while (true) {
    setGridPixel(pixels, w, h, x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

export function drawFilledCircle(pixels, w, h, cx, cy, r) {
  cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        setGridPixel(pixels, w, h, cx + dx, cy + dy);
      }
    }
  }
}

// A small "unfilled circle" cursor/marker glyph: a 4x4 square with its
// corner dots removed (an 8-dot ring around a 2x2 unfilled center).
// (cx, cy) is the square's upper-left interior corner.
export function drawCursorRing(pixels, w, h, cx, cy) {
  cx = Math.round(cx); cy = Math.round(cy);
  const offsets = [
    [0, -1], [1, -1],
    [-1, 0], [2, 0],
    [-1, 1], [2, 1],
    [0, 2], [1, 2]
  ];
  for (const [dx, dy] of offsets) {
    setGridPixel(pixels, w, h, cx + dx, cy + dy);
  }
}
