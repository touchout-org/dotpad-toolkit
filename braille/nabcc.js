// NABCC (North American Braille Computer Code) 8-dot lookup table.
//
// Index = ASCII code - 0x20 (covers 0x20 space through 0x7E tilde).
// Value = 8-dot braille byte: bit0=dot1, bit1=dot2, bit2=dot3, bit3=dot4,
//                              bit4=dot5, bit5=dot6, bit6=dot7, bit7=dot8.
// Source: BRLTTY en-nabcc.ttb.
//
// This table alone doesn't know anything about the Dot Pad's wire protocol
// (byte-per-cell vs. nibble-per-entry -- see graphics/packPixelsToHex.js and
// device/messageDisplay.js for those two, *different*, encodings). It's just
// "character in, 8-dot pattern out," reusable for anything that needs NABCC.
export const NABCC = new Uint8Array([
  0x00, 0x2E, 0x10, 0x3C, 0x2B, 0x29, 0x2F, 0x04, 0x37, 0x3E, 0x21, 0x2C, 0x20, 0x24, 0x28, 0x0C,
  0x34, 0x02, 0x06, 0x12, 0x32, 0x22, 0x16, 0x36, 0x26, 0x14, 0x31, 0x30, 0x23, 0x3F, 0x1C, 0x39,
  0x48, 0x41, 0x43, 0x49, 0x59, 0x51, 0x4B, 0x5B, 0x53, 0x4A, 0x5A, 0x45, 0x47, 0x4D, 0x5D, 0x55,
  0x4F, 0x5F, 0x57, 0x4E, 0x5E, 0x65, 0x67, 0x7A, 0x6D, 0x7D, 0x75, 0x6A, 0x73, 0x7B, 0x58, 0x38,
  0x08, 0x01, 0x03, 0x09, 0x19, 0x11, 0x0B, 0x1B, 0x13, 0x0A, 0x1A, 0x05, 0x07, 0x0D, 0x1D, 0x15,
  0x0F, 0x1F, 0x17, 0x0E, 0x1E, 0x25, 0x27, 0x3A, 0x2D, 0x3D, 0x35, 0x2A, 0x33, 0x3B, 0x18
]);

// Single printable ASCII character (0x20-0x7E) -> its 8-dot NABCC byte.
// Anything outside that range (or not a single character) returns 0x00.
export function charToNabcc(char) {
  const code = char.charCodeAt(0);
  return (code >= 0x20 && code <= 0x7E) ? NABCC[code - 0x20] : 0x00;
}

// Reverse lookup: a 6-dot byte (bits 0-5 only, i.e. < 0x40 -- the range a Dot
// Pad key-chord can actually produce, see device/keys.js) -> the character
// that produces it. Built once, lazily, on first use.
//
// Ambiguous 6-dot patterns are resolved the same way DotSVG resolves them:
// lowercase letters win over any punctuation/number sharing the same
// pattern, since a bare 6-dot chord can't distinguish letter case (that
// needs dot 7/8, which a directional key-chord never sets).
let reverseMap = null;
export function byte6ToChar(byte6) {
  if (!reverseMap) {
    reverseMap = {};
    for (let ascii = 0x20; ascii <= 0x7E; ascii++) {
      const b = NABCC[ascii - 0x20];
      if (b < 0x40 && !(b in reverseMap)) reverseMap[b] = String.fromCharCode(ascii);
    }
    for (let ascii = 0x61; ascii <= 0x7A; ascii++) {
      reverseMap[NABCC[ascii - 0x20]] = String.fromCharCode(ascii); // lowercase wins conflicts
    }
  }
  return reverseMap[byte6] || null;
}
