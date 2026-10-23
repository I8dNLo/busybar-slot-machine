# Slot Machine for BUSY Bar

A standalone JavaScript port of the native Slot Machine proposed in [busybar-firmware PR #944](https://github.com/busy-app/busybar-firmware/pull/944). It runs through BUSY Bar's JavaScript app framework and loopback HTTP API.

**Preview release:** native installation and execution on JS-capable firmware are still pending. The built script has been exercised on a computer against a physical BUSY Bar's displays and audio API. That does not verify the embedded JavaScript runtime, physical input delivery, or heap usage.

![Spinning reels](docs/spinning.png)

## Play

- OK / START: spin three reels, stopping at 1050, 1500 and 1950 ms.
- Encoder: adjust jackpot probability between 1/2, 1/4, 1/6, 1/8, 1/12, 1/20 and 1/50; default 1/6.
- BACK: quit and release timers, input and audio.

The original seven symbols, sounds and winning flash are preserved. Reels use packaged native `.anim` files instead of per-frame HTTP requests. Display updates are serialized and coalesced. This is a toy game without real-money stakes or payouts.

![Win probability](docs/odds.png)

## Build and install

Node 24 or 25, npm, and BUSY Bar firmware supporting JS apps with HTTP API 27.12.0 or newer:

```sh
npm ci
npm run typecheck
npm run build
npm test
npm run app:install
npm run app:run
```

The package is `dist/app.personal.slot_machine.tgz`. Keep the build's default `localhost` address: requests originate on the device. CLI installation uses USB address `10.0.4.20` by default.

The application uses official `@busy-app/busy-lib` 0.21.1 and `@busy-app/cli` 0.6.0. Dependencies are locked. Assets are included, so a regular build does not require Python or a firmware checkout. macOS AppleDouble metadata is excluded from the archive.

## Verification

- JavaScript type checking, official CLI packaging and five Node tests pass.
- Tests cover all jackpot probability buckets, rejection of accidental losing triples, coalesced display requests, input deduplication, and lifecycle cleanup of the built bundle.
- Host-JavaScript hardware smoke test on firmware 1.2.4 / API 27.5.0: animation, sequential stopping, sounds, odds screen, front/back rendering and cleanup; 15 API requests, zero errors.
- The screenshots above are captures from the physical device, not mockups.
- Native `app:install` / `app:run`, physical buttons/encoder, memory use, and force-exit behavior still need verification on compatible firmware. The available stable firmware 1.2.4 does not expose the new app-management API.

## Asset provenance

The C reference is `I8dNLo/busybar-firmware` commit `a2f38a8961636e44bbeb282990914983d50a8c5a`. `scripts/build-assets.py` regenerates the animations and sounds using the official firmware converters. It accepts `--firmware` and `--legacy` checkout paths; it needs Python with Pillow/colorlog and ffmpeg. The defaults expect sibling `busy` and `busybar-projects-legacy` checkouts.

Code derived from the original app retains GPL-2.0-or-later; original images and sounds retain CC-BY-SA-4.0. See [NOTICE.md](NOTICE.md) and `licenses/`.
