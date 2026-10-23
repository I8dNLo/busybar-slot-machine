import { BusyBar } from '@busy-app/busy-lib';

export function createDevice(addr) {
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
