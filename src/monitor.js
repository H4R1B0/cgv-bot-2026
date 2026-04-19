import { findBestCombo } from './priority.js';

const MAX_BACKOFF = 60000;

export function createMonitor({ api, ctx, preferred, count, interval = 7000, minInterval = 5000, onAvailable, onPoll, onError }) {
  const iv = Math.max(minInterval, interval);
  let timer = null;
  let running = false;
  let currentBackoff = iv;

  async function tick() {
    if (!running) return;
    try {
      const seats = await api.getSeats(ctx);
      if (onPoll) onPoll(seats);
      const combo = findBestCombo(preferred, seats, count);
      if (combo) {
        running = false;
        try { onAvailable(combo, seats); } catch (e) { if (onError) onError(e, 'handler'); }
        return;
      }
      currentBackoff = iv;
    } catch (e) {
      if (onError) onError(e, 'poll');
      currentBackoff = Math.min(currentBackoff * 2, MAX_BACKOFF);
    }
    if (running) timer = setTimeout(tick, currentBackoff);
  }

  return {
    start() {
      if (running) return;
      running = true;
      currentBackoff = iv;
      timer = setTimeout(tick, 0);
    },
    stop() {
      running = false;
      if (timer) { clearTimeout(timer); timer = null; }
    },
    isRunning() { return running; },
  };
}
