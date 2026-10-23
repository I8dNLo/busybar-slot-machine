import { createDevice } from '../shared/device.js';
import manifest from './appmeta/manifest.json';
import { ODDS, STOP_MS, chooseResult, isJackpot, randomSymbol } from './game.js';
import { createDisplay } from '../shared/display.js';

function main() {
  const device = createDevice(__BUSY_ADDR__);
  const report = (error) => console.error(`Slot Machine: device request failed (${error?.status || error?.name || 'unknown'}: ${error?.message || ''})`);
  const display = createDisplay(device, manifest.id, report);
  let stopped = false;
  let state = 'idle';
  let oddsIndex = 2;
  let visible = [randomSymbol(), randomSymbol(), randomSymbol()];
  let target = visible.slice();
  let timers = [];
  let overlayTimer;
  /** @type {Promise<unknown>} */
  let audioChain = Promise.resolve();
  const later = (fn, ms) => {
    const timer = setTimeout(() => {
      timers = timers.filter((id) => id !== timer);
      if (!stopped) fn();
    }, ms);
    timers.push(timer);
    return timer;
  };
  const sound = (name) => {
    audioChain = audioChain.then(() => {
      if (!stopped) return device.AudioPlay({ application_name: manifest.id, path: `sounds/${name}.snd` });
    }).catch(report);
  };
  const back = () => {
    const heading = state === 'spinning' ? 'SPINNING...' : state === 'won' ? 'JACKPOT! COINS!' : state === 'lost' ? 'NO LUCK - TRY AGAIN' : 'OK / START TO SPIN';
    display.set([
      { id: 'back-title', type: 'text', display: 'back', text: heading, font: 'small', x: 4, y: 2 },
      { id: 'back-odds', type: 'text', display: 'back', text: `WIN CHANCE 1/${ODDS[oddsIndex]}`, font: 'small', x: 4, y: 13 },
      { id: 'back-help', type: 'text', display: 'back', text: 'WHEEL TO ADJUST', font: 'small', x: 4, y: 24 },
    ]);
  };
  const reel = (i, moving = false, won = false) => ({
    id: `reel-${i}`, type: 'animation', x: 1 + 24 * i, y: 0,
    // Changing the source also restarts a previously finished animation on 1.2.x.
    path: `animations/${moving ? 'spin' : won ? 'win' : 'still'}-${visible[i]}.anim`,
    section: 'default', loop: moving,
  });
  const showStill = () => display.set(visible.map((_, i) => reel(i)));
  const hideOverlay = () => {
    display.remove(['overlay-title', 'overlay-odds']);
    showStill();
  };
  const spin = () => {
    if (state === 'spinning') return;
    timers.forEach((id) => clearTimeout(id));
    timers = [];
    clearTimeout(overlayTimer);
    hideOverlay();
    target = chooseResult(oddsIndex);
    state = 'spinning';
    back();
    display.set(visible.map((_, i) => reel(i, true)));
    sound('spin');
    STOP_MS.forEach((delay, i) => later(() => {
      visible[i] = target[i];
      display.set([reel(i)]);
      if (i === 2) {
        state = isJackpot(target) ? 'won' : 'lost';
        back();
        sound(state === 'won' ? 'coins' : 'lose');
        if (state === 'won') display.set(visible.map((_, j) => reel(j, false, true)));
      }
    }, delay));
  };
  const unbind = listen('input', (event) => {
    if (stopped) return;
    if (event.key === 'back' && event.action === 'short') {
      stopped = true;
      timers.forEach((id) => clearTimeout(id));
      clearTimeout(overlayTimer);
      display.stop();
      audioChain = audioChain.then(() => device.AudioStop()).catch((error) => { if (error.status !== 410) report(); });
      setTimeout(unbind, 0);
    } else if ((event.key === 'start' || event.key === 'ok') && event.action === 'press') {
      spin();
    } else if (event.key === 'encoder' && state !== 'spinning') {
      oddsIndex = Math.max(0, Math.min(ODDS.length - 1, oddsIndex - event.delta));
      back();
      clearTimeout(overlayTimer);
      display.remove(['reel-0', 'reel-1', 'reel-2']);
      display.set([
        { id: 'overlay-title', type: 'text', text: 'WIN CHANCE', font: 'small', x: 36, y: 0, align: 'top_mid', z_index: 11 },
        { id: 'overlay-odds', type: 'text', text: `1/${ODDS[oddsIndex]}`, font: 'small', color: '#FFCD00FF', x: 36, y: 9, align: 'top_mid', z_index: 11 },
      ]);
      overlayTimer = setTimeout(() => { if (!stopped) hideOverlay(); }, 2025);
    }
  });
  showStill();
  back();
}
main();
