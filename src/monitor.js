import { findBestCombo } from './priority.js';

const MAX_BACKOFF = 60000;

export function createMonitor({ api, ctx, preferred, count, interval = 7000, minInterval = 5000, onHoldSuccess, onPoll, onError }) {
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
        try {
          const result = await api.holdSeats(ctx, combo);
          running = false;
          onHoldSuccess(combo, result);
          return;
        } catch (e) {
          if (onError) onError(e, 'hold');
        }
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
