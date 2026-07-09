// Decodes raw Dot Pad key events (as delivered by the onKey callback in
// ./connection.js) into a 6-dot chord bitmask, and from there into either a
// cursor direction or a NABCC character.
import { byte6ToChar } from '../braille/nabcc.js';

// Physical button -> dot bit, as reported in a key event's label/keyCode:
//   4=dot1, 8=dot2, LP=dot3, 2=dot4, 1=dot5, RP=dot6
// Label formats seen in practice: "LP +0", "RP +4", "AP +12", "+7", "3".
export function labelToByte6(label) {
  const hasLP = /\bLP\b/.test(label) || /\bAP\b/.test(label);
  const hasRP = /\bRP\b/.test(label) || /\bAP\b/.test(label);
  const mPlus = label.match(/\+\s*(\d+)/);
  const mBare = !mPlus && label.match(/^\d+$/);
  const num = mPlus ? parseInt(mPlus[1], 10) : mBare ? parseInt(mBare[0], 10) : 0;
  return ((num & 4) ? 0x01 : 0) |  // dot 1
         ((num & 8) ? 0x02 : 0) |  // dot 2
         (hasLP     ? 0x04 : 0) |  // dot 3
         ((num & 2) ? 0x08 : 0) |  // dot 4
         ((num & 1) ? 0x10 : 0) |  // dot 5
         (hasRP     ? 0x20 : 0);   // dot 6
}

// A single-dot chord -> the letter it would produce as a NABCC character.
// Convenience wrapper around braille/nabcc.js's byte6ToChar for callers
// working directly with key-event labels.
export function byte6ToLetter(byte6) {
  return byte6ToChar(byte6);
}

// Single-dot chord values for the four cursor-movement dots. This mapping
// (3=left, 2=up, 5=down, 6=right) is a DotSVG/DotTMAP convention, not
// something the SDK or hardware defines -- confirm it still matches if
// reusing this in a new app rather than assuming it's universal.
export const CURSOR_DOT = {
  LEFT: 0x04,  // dot3 alone
  RIGHT: 0x20, // dot6 alone
  UP: 0x02,    // dot2 alone
  DOWN: 0x10   // dot5 alone
};
