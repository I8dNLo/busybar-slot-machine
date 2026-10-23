# Slot Machine for BUSY Bar

A standalone JavaScript port of the native Slot Machine proposed in [busybar-firmware Draft PR #1119](https://github.com/busy-app/busybar-firmware/pull/1119). It runs through BUSY Bar's JavaScript app framework and loopback HTTP API.

**Preview release:** installed and executed inside a physical BUSY Bar on official firmware 1.3.1-rc (API 27.14.0). Native rendering, reel stopping, odds changes and Back navigation were verified with HTTP input events. Physical controls, long-run heap usage and force-quit still need manual validation.

![Spinning reels](docs/spinning.png)

## Play

- OK / START: spin immediately on button press (holding/releasing does not retrigger); three reels, stopping at 1050, 1500 and 1950 ms.
- Encoder: adjust jackpot probability between 1/2, 1/4, 1/6, 1/8, 1/12, 1/20 and 1/50; default 1/6.
- BACK: quit and release timers, input and audio.

The original seven symbols, sounds and winning flash are preserved. Reels use packaged native `.anim` files instead of per-frame HTTP requests. Display updates are serialized and coalesced. This is a toy game without real-money stakes or payouts.

![Win probability](docs/odds.png)

## Build and install

Node 24 or 25, npm, and BUSY Bar firmware supporting JS apps with HTTP API 27.14.0 or newer:

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

- JavaScript type checking, official CLI packaging and six Node tests pass.
- Runtime tests reproduce firmware timer IDs starting at zero and native cancellation semantics. Version 1.0.3 prevents HTTP cleanup from cancelling the first reel stop timer and fixes Back during a spin.
- Tests cover all jackpot probability buckets, rejection of accidental losing triples, coalesced display requests, input deduplication, and lifecycle cleanup of the built bundle.
- Host-JavaScript hardware smoke test on firmware 1.2.4 / API 27.5.0: animation, sequential stopping, sounds, odds screen, front/back rendering and cleanup; 15 API requests, zero errors.
- The screenshots above are captures from the physical device, not mockups.
- Native installation/execution verified on 1.3.1-rc, including spin/result, odds changes and Back exit using the real device input API. Version 1.0.1 regenerates all 21 animations with the new interframe encoder: the 1.0.0 resources showed missing-animation icons on this firmware.
- Physical buttons/encoder, long-run memory use and force-exit remain unverified.

## Asset provenance

The C reference is `I8dNLo/busybar-firmware` commit `a2f38a8961636e44bbeb282990914983d50a8c5a`. `scripts/build-assets.py` regenerates the animations and sounds using the official firmware converters. It accepts `--firmware` and `--legacy` checkout paths; it needs Python with Pillow/colorlog and ffmpeg. Pass `--firmware` explicitly with an official checkout at tag `1.3.1-rc` or newer. The verified encoder Git blob is `97a26234f3fde3298617664af074403995200549`; the old 1.2.x encoder is incompatible. `--legacy` defaults to sibling `busybar-projects-legacy`.

Code derived from the original app retains GPL-2.0-or-later; original images and sounds retain CC-BY-SA-4.0. See [NOTICE.md](NOTICE.md) and `licenses/`.
