import test from 'node:test';
import assert from 'node:assert/strict';
import { createDisplay } from '../shared/display.js';
const tick = () => new Promise((resolve) => setImmediate(resolve));
test('coalesces changes without overlapping requests and removes stale elements', async () => {
  const calls = [];
  let release;
  const device = {
    DisplayDraw: async (request) => { calls.push(['draw', request]); await new Promise((r) => {release = r;}); },
    DisplayClear: async (request) => {calls.push(['clear', request]);},
  };
  const display = createDisplay(device, 'test');
  display.set([{id:'title',type:'text',text:'a'}]);
  display.set([{id:'title',type:'text',text:'b'}]);
  display.set([{id:'title',type:'text',text:'c'}]);
  assert.equal(calls.length, 1);
  release(); await tick();
  assert.equal(calls.length, 2);
  assert.equal(calls[1][1].elements[0].text, 'c');
  release(); await tick();
  display.set([{id:'title',type:'text',text:'c'}]);
  assert.equal(calls.length, 2);
  display.remove(['title']); await tick();
  assert.deepEqual(calls[2][1].element_ids, ['title']);
  display.stop();
});
test('stop while a request is pending prevents queued drawing', async () => {
  let release, count = 0;
  const display = createDisplay({DisplayDraw: async () => {count++; await new Promise((r) => {release = r;});}}, 'test');
  display.set([{id:'title',text:'a'}]);
  display.set([{id:'title',text:'b'}]);
  display.stop();
  release(); await tick();
  assert.equal(count, 1);
});
