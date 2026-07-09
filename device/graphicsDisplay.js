// Prep and send for the Dot Pad's tactile graphics display.
//
// device.numberCellColumns/numberCellRows describe the display in braille
// CELLS. Each cell is 2 dots wide x 4 dots tall, so the actual dot-grid
// resolution -- and the size the pixel buffer you pass to
// rasterizer.js must be -- is:
//
//   displayW = device.numberCellColumns * 2
//   displayH = device.numberCellRows * 4
//
// This is a different cell count from the message-line display
// (device.numberBrailleCellColumns, see messageDisplay.js) -- two different
// numbers on two different channels. Conflating them was part of what made
// the original debugging on this so confusing.
import { packPixelsToHex } from '../graphics/packPixelsToHex.js';

// Returns { displayW, displayH } dot-grid dimensions for this device's
// graphics channel -- pass these to rasterizer.js drawing functions.
export function graphicsDimensions(device) {
  return {
    displayW: device.numberCellColumns * 2,
    displayH: device.numberCellRows * 4
  };
}

// Clears then writes a 0/1 pixel buffer (from rasterizer.js, sized
// displayW*displayH per graphicsDimensions()) to the device's tactile
// display.
export function sendGraphicToDevice(sdk, DisplayMode, device, pixels) {
  const numCols = device.numberCellColumns;
  const numRows = device.numberCellRows;
  const { displayW, displayH } = graphicsDimensions(device);
  const hex = packPixelsToHex(pixels, displayW, displayH, numRows);
  const zeros = '00'.repeat(numCols * numRows);
  sdk.displayGraphicData(zeros, device, DisplayMode.GraphicMode);
  sdk.displayGraphicData(hex, device, DisplayMode.GraphicMode);
}
