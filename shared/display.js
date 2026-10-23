// One outstanding request, stable IDs, changed elements only, bounded retries.
/** @param {(error?: unknown) => void} report */
export function createDisplay(device, appId, report = () => {}) {
  const wanted = new Map();
  const sent = new Map();
  let active = false;
  let stopped = false;
  let retry;
  let failures = 0;
  async function flush() {
    if (active || stopped || retry) return;
    const removed = [...sent.keys()].filter((id) => !wanted.has(id));
    const changed = [...wanted.values()].filter((el) => sent.get(el.id) !== JSON.stringify(el));
    if (!removed.length && !changed.length) return;
    active = true;
    try {
      if (removed.length) {
        await device.DisplayClear({ application_name: appId, element_ids: removed });
        removed.forEach((id) => sent.delete(id));
      }
      if (!stopped && changed.length) {
        await device.DisplayDraw({ application_name: appId, priority: 50, elements: changed });
        changed.forEach((el) => sent.set(el.id, JSON.stringify(el)));
      }
      failures = 0;
    } catch (error) {
      report(error);
      failures += 1;
      if (!stopped && failures <= 3) retry = setTimeout(() => { retry = undefined; void flush(); }, 1000 * 2 ** (failures - 1));
    } finally {
      active = false;
    }
    if (!failures && !stopped) void flush();
  }
  return {
    set(elements) { if (stopped) return; elements.forEach((el) => wanted.set(el.id, el)); void flush(); },
    remove(ids) { if (stopped) return; ids.forEach((id) => wanted.delete(id)); void flush(); },
    stop() { stopped = true; clearTimeout(retry); wanted.clear(); },
  };
}
