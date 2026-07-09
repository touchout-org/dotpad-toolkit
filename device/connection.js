// BLE connection lifecycle for the KGS Dot Pad: scan -> connect ->
// Connected/Disconnected/ConnectedFail callbacks.
//
// Takes your own `sdk` (DotPadSDK), `scanner` (DotPadScanner), and
// `DataCodes` instances/exports (see ../vendor/web-sdk-3.0.0/) rather than
// owning singletons itself, so the calling app controls their lifetime.
// DataCodes values are plain strings (e.g. "Connected"), so it's safe to
// pass a DataCodes reference from a different vendored copy of the SDK file
// than the one `sdk` was constructed from, as long as both are the same SDK
// version.

// Scans for and connects to a Dot Pad. Resolves to the connected device, or
// null if the user closed the browser's device picker without choosing one.
// Throws if the scan or connection attempt itself fails (e.g. Bluetooth
// unavailable) -- callers should wrap this in try/catch.
export async function connectDotPad(sdk, scanner) {
  const bleDevice = await scanner.startBleScan();
  if (!bleDevice) return null;
  return sdk.connectBleDevice(bleDevice);
}

export function disconnectDotPad(sdk, device) {
  if (device) sdk.disconnect(device);
}

// Wires sdk.setCallBack() to named handlers instead of a positional
// (dataCode, keyCode) callback pair. Call once, before connecting.
//
//   watchDotPad(sdk, DataCodes, {
//     onConnected: (device) => { ... },
//     onDisconnected: () => { ... },
//     onConnectFailed: () => { ... },
//     onKey: (device, keyCode, msg) => { ... },   // see ./keys.js to decode
//   });
export function watchDotPad(sdk, DataCodes, { onConnected, onDisconnected, onConnectFailed, onKey } = {}) {
  sdk.setCallBack(
    (device, dataCode) => {
      if (dataCode === DataCodes.Connected) onConnected && onConnected(device);
      else if (dataCode === DataCodes.Disconnected) onDisconnected && onDisconnected();
      else if (dataCode === DataCodes.ConnectedFail) onConnectFailed && onConnectFailed();
    },
    (device, keyCode, msg) => {
      onKey && onKey(device, keyCode, msg);
    }
  );
}
