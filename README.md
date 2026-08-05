# dotpad-toolkit

Reusable, hardware/protocol-level building blocks for building tactile web apps on the KGS Dot Pad, extracted from [DotSVG](https://github.com/touchout-org/dotsvg) and [DotTMAP](https://github.com/touchout-org/tmap) so the same lessons don't have to be relearned by every new project.

Plain ES modules, no build step, no bundler, no npm dependency. Import directly by relative path, or copy the files you need into your own project alongside your own copy of `vendor/web-sdk-3.0.1/`.

**Scope:** this library covers Dot Pad hardware and wire-protocol concerns only — braille encoding, tactile rasterization, BLE connection, and device I/O. It deliberately does not include anything about what your app is actually displaying (maps, drawings, whatever) — that domain logic stays in your app.

## Module index

| Module | What it's for |
|---|---|
| [`braille/nabcc.js`](braille/nabcc.js) | The NABCC 8-dot computer braille table, plus char↔byte conversion in both directions. |
| [`graphics/rasterizer.js`](graphics/rasterizer.js) | Hardware-agnostic pixel-buffer drawing: lines, filled circles, a cursor-ring glyph. |
| [`graphics/packPixelsToHex.js`](graphics/packPixelsToHex.js) | Packs a rasterized pixel buffer into the hex string the graphics display expects. **Read the comment at the top of this file before touching it** — see "Two different hex encodings" below. |
| [`device/messageDisplay.js`](device/messageDisplay.js) | Prep and send for the 20-cell message-line display: word-boundary truncation, NABCC encoding, the clear-then-write send. |
| [`device/graphicsDisplay.js`](device/graphicsDisplay.js) | Prep and send for the tactile graphics display: dot-grid dimensions from device cell counts, packing, the clear-then-write send. |
| [`device/connection.js`](device/connection.js) | BLE connection lifecycle: scan, connect, disconnect, and a named-callback wrapper around `sdk.setCallBack()`. |
| [`device/keys.js`](device/keys.js) | Decodes a raw key event into a 6-dot chord bitmask, and from there into a cursor direction or a NABCC letter. |
| [`vendor/web-sdk-3.0.1/`](vendor/web-sdk-3.0.1/) | The Dot Pad Web SDK, vendored as-is (matches DotSVG's and DotTMAP's own copies). |

## Usage

```js
import { DotPadSDK, DotPadScanner, DisplayMode, DataCodes } from './vendor/web-sdk-3.0.1/DotPadSDK-3.0.1.js';
import { connectDotPad, disconnectDotPad, watchDotPad } from './device/connection.js';
import { sendTextToDevice, truncateMessage } from './device/messageDisplay.js';
import { sendGraphicToDevice, graphicsDimensions } from './device/graphicsDisplay.js';
import { drawLinePixels } from './graphics/rasterizer.js';

const sdk = new DotPadSDK();
const scanner = new DotPadScanner();

watchDotPad(sdk, DataCodes, {
  onConnected: (device) => {
    sendTextToDevice(sdk, DisplayMode, device, 'Connected');

    const { displayW, displayH } = graphicsDimensions(device);
    const pixels = new Uint8Array(displayW * displayH);
    drawLinePixels(pixels, displayW, displayH, 0, 0, displayW - 1, displayH - 1);
    sendGraphicToDevice(sdk, DisplayMode, device, pixels);
  },
  onDisconnected: () => { /* ... */ }
});

const device = await connectDotPad(sdk, scanner);
```

## Testing

`node test.mjs` runs a small dependency-free smoke test against every module, including a regression check that `packPixelsToHex` produces exactly one hex character per nibble (`displayW * numRows` total, not double that) — the exact invariant whose violation caused the deformed-grid bug this library was built to stop repeating. Run it after any change here, especially to `graphics/packPixelsToHex.js` or `braille/nabcc.js`.

## Hard-won lessons (read before you debug this again)

### Two different hex encodings — do not conflate them

The message-line display and the graphics display use **different** hex encodings, and confusing them produces no error at all — just a wrong-looking render that looks like a data or geometry bug.

- **Message line** (`device/messageDisplay.js`): one full NABCC byte per cell → **2 hex characters per cell**, zero-padded.
- **Graphics display** (`graphics/packPixelsToHex.js`): each packed entry is a 4-bit nibble (max value `0xF`) → **exactly 1 hex character**, never padded.

Padding a nibble to 2 characters (i.e. reusing the message-line encoding for graphics) silently doubles the hex string's length and shifts everything after the first non-trivial value out of alignment. This is exactly what caused a multi-hour debugging session on DotTMAP: a tactile render that was dimensionally and geometrically correct but looked scrambled, with phantom lines and missing data — not a timing issue, not a dimensions issue, purely this encoding mismatch.

### Two different cell counts, on two different channels

- `device.numberCellColumns` / `device.numberCellRows` describe the **graphics** display, in braille cells. Each cell is 2 dots wide × 4 dots tall, so the actual dot-grid resolution is `numberCellColumns*2` by `numberCellRows*4`.
- `device.numberBrailleCellColumns` describes the **message-line** display's cell count (20, on current hardware) — a completely different number, for a different channel.

Trust the device's own reported values rather than hardcoding them (they're used that way throughout this library), but know that these are two independent numbers before assuming one can stand in for the other.

### Pixel-center coordinate convention

When converting a continuous coordinate (canvas position, geographic projection, whatever) into a dot-grid pixel index, subtract 0.5: canvas/logical coordinates address the *center* of a display pixel, not its corner. Getting this wrong doesn't break anything visibly dramatic — it just shifts everything by half a pixel — but it's an easy thing to silently omit and then wonder why two independently-correct pieces of geometry don't quite line up.

## Provenance

Extracted from working, hardware-tested code in DotSVG (the original reference implementation) and DotTMAP (which found and fixed the packing-encoding bug described above). Where the two diverged, DotTMAP's versions were used, since they're the ones that incorporate the fix.
