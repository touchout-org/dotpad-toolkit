// Packs a 0/1 pixel buffer (see rasterizer.js) into the hex string the Dot
// Pad SDK's displayGraphicData() expects.
//
// *** READ THIS BEFORE TOUCHING THIS FILE ***
//
// The graphics channel and the message-line channel (see
// ../device/messageDisplay.js) use TWO DIFFERENT hex encodings. Confusing
// them is exactly the bug that cost hours of debugging on DotTMAP: a
// deformed, scrambled-looking tactile render that was otherwise dimensionally
// and geometrically correct.
//
//   - Message line: one full NABCC byte per cell -> 2 hex characters per
//     cell, zero-padded (see textToMessageHex in messageDisplay.js).
//   - Graphics display: each packed array entry is a true 4-bit NIBBLE
//     (bit ranges 0-3 below, so the max value is 0b1111 = 0xF) -> exactly
//     ONE hex character per entry, NEVER padded.
//
// Padding a nibble to 2 characters (as the message-line encoding correctly
// does) silently doubles the hex string's length and shifts every nibble
// after the first non-trivial one out of alignment with what the device
// expects -- producing exactly this kind of "looks almost right, then turns
// to garbage" render. There is no error, exception, or malformed-request
// response from the device when this happens; it just draws the wrong thing.
//
// Each braille cell is 2 dots wide x 4 dots tall, so displayW/displayH here
// are dot counts (numberCellColumns*2, numberCellRows*4), not cell counts.
export function packPixelsToHex(pixels, displayW, displayH, numRows) {
  const nibbles = new Uint8Array(displayW * numRows);
  for (let y = 0; y < displayH; y++) {
    const band = Math.floor(y / 4);
    const bit = y % 4;
    for (let x = 0; x < displayW; x++) {
      if (pixels[y * displayW + x]) {
        // x^1 swaps each pair of adjacent dot-columns -- matches the byte
        // order the device firmware expects for the two dot-columns making
        // up one cell. Verified against a known-working reference
        // implementation; don't "simplify" this away without re-testing on
        // real hardware.
        nibbles[(x ^ 1) + band * displayW] |= (1 << bit);
      }
    }
  }
  return Array.from(nibbles, (n) => n.toString(16).toUpperCase()).join('');
}
