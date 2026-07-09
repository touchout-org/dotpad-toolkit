import { NABCC, charToNabcc, byte6ToChar } from './braille/nabcc.js';
import { setGridPixel, drawLinePixels, drawFilledCircle, drawCursorRing } from './graphics/rasterizer.js';
import { packPixelsToHex } from './graphics/packPixelsToHex.js';
import { truncateMessage, textToMessageHex } from './device/messageDisplay.js';
import { graphicsDimensions, sendGraphicToDevice } from './device/graphicsDisplay.js';
import { connectDotPad, disconnectDotPad, watchDotPad } from './device/connection.js';
import { labelToByte6, byte6ToLetter, CURSOR_DOT } from './device/keys.js';

let failures = 0;
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) {
    failures++;
    console.log(`FAIL ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

// NABCC table sanity: 'a' -> 0x01, 'A' -> 0x41, space -> 0x00
check('NABCC length', NABCC.length, 95);
check("charToNabcc('a')", charToNabcc('a'), 0x01);
check("charToNabcc('A')", charToNabcc('A'), 0x41);
check("charToNabcc(' ')", charToNabcc(' '), 0x00);
check('byte6ToChar(0x01) reverse of a', byte6ToChar(0x01), 'a');

// truncateMessage: word-boundary truncation
check('truncateMessage short', truncateMessage('hi', 20), 'hi');
check('truncateMessage word boundary', truncateMessage('2632 College Ave, Berkeley', 20), '2632 College Ave,');
check('truncateMessage no space fallback', truncateMessage('supercalifragilisticexpialidocious', 10), 'supercalif');

// textToMessageHex: 2 hex chars per cell, padded, space-fill past text length
const hex = textToMessageHex('a', 3);
check('textToMessageHex length', hex.length, 6);
check('textToMessageHex first cell', hex.slice(0, 2), '01');
check('textToMessageHex pad cell', hex.slice(2, 4), '00'); // space -> 0x00

// rasterizer + packPixelsToHex: draw a single pixel, confirm exactly one
// hex character is non-zero and the string length is displayW*numRows (one
// char per nibble, NOT displayW*numRows*2).
{
  const numCols = 4, numRows = 2; // -> displayW=8, displayH=8
  const { displayW, displayH } = { displayW: numCols * 2, displayH: numRows * 4 };
  const pixels = new Uint8Array(displayW * displayH);
  setGridPixel(pixels, displayW, displayH, 0, 0);
  const packed = packPixelsToHex(pixels, displayW, displayH, numRows);
  check('packPixelsToHex length == displayW*numRows (1 char/nibble)', packed.length, displayW * numRows);

  const pixels2 = new Uint8Array(displayW * displayH);
  drawLinePixels(pixels2, displayW, displayH, 0, 0, displayW - 1, 0);
  drawFilledCircle(pixels2, displayW, displayH, 3, 3, 1);
  drawCursorRing(pixels2, displayW, displayH, 3, 3);
  const packed2 = packPixelsToHex(pixels2, displayW, displayH, numRows);
  check('packPixelsToHex still correct length after drawing', packed2.length, displayW * numRows);
}

// graphicsDimensions
check('graphicsDimensions', graphicsDimensions({ numberCellColumns: 30, numberCellRows: 10 }), { displayW: 60, displayH: 40 });

// keys.js
check('labelToByte6 LP alone (dot3/left)', labelToByte6('LP +0'), CURSOR_DOT.LEFT);
check('labelToByte6 RP alone (dot6/right)', labelToByte6('RP +0'), CURSOR_DOT.RIGHT);
check('labelToByte6 dot2 alone (+8, up)', labelToByte6('+8'), CURSOR_DOT.UP);
check('labelToByte6 dot5 alone (+1, down)', labelToByte6('+1'), CURSOR_DOT.DOWN);
check('byte6ToLetter matches byte6ToChar', byte6ToLetter(0x01), 'a');

// connection.js / graphicsDisplay.js: confirm they're at least callable with
// a fake sdk (no real hardware here, just checking wiring/shape).
{
  const calls = [];
  const fakeSdk = {
    setCallBack: (onConn, onKey) => { calls.push(['setCallBack', typeof onConn, typeof onKey]); },
    displayGraphicData: (hex, device, mode) => { calls.push(['displayGraphicData', hex.length, mode]); },
    connectBleDevice: async (d) => ({ ...d, connected: true }),
    disconnect: (d) => { calls.push(['disconnect', d]); }
  };
  const fakeScanner = { startBleScan: async () => ({ id: 'fake' }) };
  const DataCodes = { Connected: 'Connected', Disconnected: 'Disconnected', ConnectedFail: 'ConnectedFail' };
  const DisplayMode = { GraphicMode: 'GraphicMode', TextMode: 'TextMode' };

  watchDotPad(fakeSdk, DataCodes, { onConnected: () => {} });
  check('watchDotPad calls setCallBack', calls[0][0], 'setCallBack');

  const device = await connectDotPad(fakeSdk, fakeScanner);
  check('connectDotPad resolves device', device.connected, true);

  sendGraphicToDevice(fakeSdk, DisplayMode, { numberCellColumns: 30, numberCellRows: 10 }, new Uint8Array(60 * 40));
  const graphicCall = calls.find((c) => c[0] === 'displayGraphicData' && c[2] === 'GraphicMode');
  check('sendGraphicToDevice hex length == 60*10 (1 char/nibble)', graphicCall[1], 600);

  disconnectDotPad(fakeSdk, device);
  check('disconnectDotPad calls sdk.disconnect', calls.some((c) => c[0] === 'disconnect'), true);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
