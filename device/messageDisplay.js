// Prep and send for the Dot Pad's 20-cell message-line display.
//
// This channel's encoding is one full NABCC byte per cell, 2 hex characters
// each, zero-padded. This is DIFFERENT from the graphics-display encoding
// (see ../graphics/packPixelsToHex.js) -- do not conflate the two.
import { charToNabcc } from '../braille/nabcc.js';

// Truncates to at most maxLen characters, backing off to the last space
// rather than cutting a word in half -- e.g. "2632 College Ave, Berkeley"
// truncated to 20 becomes "2632 College Ave," (18 chars), not
// "2632 College Ave, Be". Falls back to a hard cut only if there's no space
// to back off to (a single word longer than maxLen).
export function truncateMessage(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}

// text -> hex string for displayTextData(..., DisplayMode.TextMode).
// Exactly numCells characters are encoded (space-padded if text is
// shorter); characters beyond numCells are simply never read, so callers
// that want clean word-boundary truncation should call truncateMessage()
// first rather than relying on this hard per-character cutoff.
export function textToMessageHex(text, numCells) {
  let hex = '';
  for (let i = 0; i < numCells; i++) {
    const ch = i < text.length ? text[i] : ' ';
    hex += charToNabcc(ch).toString(16).padStart(2, '0').toUpperCase();
  }
  return hex;
}

// Clears then writes `text` to device's message line. numCells is read from
// device.numberBrailleCellColumns -- trust the device's own reported value
// rather than hardcoding 20, in case a future model differs.
export function sendTextToDevice(sdk, DisplayMode, device, text) {
  const numCells = device.numberBrailleCellColumns;
  const zeros = '00'.repeat(numCells);
  const hex = textToMessageHex(text, numCells);
  sdk.displayTextData(zeros, device, DisplayMode.TextMode);
  sdk.displayTextData(hex, device, DisplayMode.TextMode);
}
