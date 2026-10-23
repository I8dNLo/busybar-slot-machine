import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

async function runtime() {
  const timers = new Map(), requests = [], errors = [];
  let seq = 0, handler;
  const context = vm.createContext({
    URL, URLSearchParams, Headers, Request, Response, FormData,
    console: {log(){}, error: (...args) => errors.push(args)},
    // Match JerryScript firmware: timer IDs start at zero; undefined cancels 0.
    setTimeout(fn, delay) { const id = seq++; timers.set(id, {fn, delay}); return id; },
    clearTimeout(id) {assert.equal(arguments.length, 1); timers.delete(Number(id) >>> 0);},
    setInterval(fn, delay) { const id = seq++; timers.set(id, {fn, delay, interval:true}); return id; },
    clearInterval(id) {assert.equal(arguments.length, 1); timers.delete(Number(id) >>> 0);},
    listen(type, fn) {assert.equal(type, 'input'); assert.equal(handler, undefined); handler = fn; return () => {handler = undefined;};},
    fetch: async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      const body = request.method === 'POST' ? await request.json() : null;
      requests.push({url: url.pathname, method: request.method, body});
      let result = {result:'OK'};
      if (url.pathname === '/api/version') result = {api_semver:'27.12.0'};
      return Response.json(result);
    },
  });
  const drain = async () => { for(let i=0;i<10;i++) await new Promise((r) => setImmediate(r)); };
  const code = readFileSync(new URL('../dist/app.personal.slot_machine/scripts/main.js', import.meta.url), 'utf8');
  vm.runInContext(code, context, {timeout:1000});
  await drain();
  return {
    timers, requests, errors,
    async event(event) {handler?.(event); await drain();},
    async fire(delay) {for (const [id,timer] of [...timers]) if(timer.delay === delay) {if(!timer.interval) timers.delete(id); timer.fn();} await drain();},
    get attached() {return Boolean(handler);},
  };
}

test('packaged slot app spins on press, ignores held/release events and releases lifecycle handles', async () => {
  const app = await runtime();
  assert.deepEqual(app.errors, []);
  assert.equal(app.timers.size, 0);
  await app.event({key:'start',action:'press'});
  assert.equal(app.timers.size, 3);
  assert.ok(app.timers.has(0), 'HTTP cleanup must not cancel the first reel timer');
  await app.event({key:'start',action:'short'});
  assert.equal(app.timers.size, 3);
  await app.event({key:'start',action:'short'});
  assert.equal(app.timers.size, 3);
  for(const delay of [1050,1500,1950]) await app.fire(delay);
  assert.equal(app.timers.size, 0);
  for (const action of ['long', 'repeat', 'short', 'release']) {
    await app.event({key:'start',action});
    assert.equal(app.timers.size, 0, `${action} must not restart a completed spin`);
  }
  await app.event({key:'ok',action:'press'});
  assert.equal(app.timers.size, 3);
  await app.event({key:'ok',action:'short'});
  await app.event({key:'ok',action:'release'});
  for(const delay of [1050,1500,1950]) await app.fire(delay);
  assert.equal(app.timers.size, 0);
  await app.event({key:'encoder',delta:1,action:'clockwise'});
  assert.equal(app.timers.size, 1);
  await app.event({key:'back',action:'short'});
  await app.fire(0);
  assert.equal(app.attached, false);
  assert.equal(app.timers.size, 0);
  assert.deepEqual(app.errors, []);
});

test('Back during the first spin cancels all native timers and detaches input', async () => {
  const app = await runtime();
  await app.event({key:'start',action:'press'});
  await app.event({key:'back',action:'short'});
  await app.fire(0);
  assert.equal(app.attached, false);
  assert.equal(app.timers.size, 0);
  assert.deepEqual(app.errors, []);
});
