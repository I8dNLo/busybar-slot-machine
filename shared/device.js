import { BusyBar } from '@busy-app/busy-lib';

export function createDevice(addr) {
  // Firmware 1.3.1 uses timer ID 0 and coerces undefined to 0. busy-lib's
  // timeout=0 request cleanup calls clearTimeout(undefined) after every request.
  // Preserve no-op cleanup for missing IDs and pass exactly one native argument.
  const cancelTimeout = globalThis.clearTimeout;
  const cancelInterval = globalThis.clearInterval;
  globalThis.clearTimeout = (id) => {
    if (typeof id === 'number' && Number.isFinite(id)) cancelTimeout(id);
  };
  globalThis.clearInterval = (id) => {
    if (typeof id === 'number' && Number.isFinite(id)) cancelInterval(id);
  };
  // busy-lib's error handler uses instanceof DOMException even with timeout=0.
  // Older embedded runtimes have Error but no DOMException/AbortController.
  if (typeof globalThis.DOMException !== 'function') {
    Object.defineProperty(globalThis, 'DOMException', {
      value: class DOMException extends Error {
        constructor(message = '', name = 'Error') { super(message); this.name = name; }
      },
      writable: true,
      configurable: true,
    });
  }
  // The firmware owns fetch timeouts. Do not require browser AbortController.
  return new BusyBar({ addr, timeout: 0 });
}
