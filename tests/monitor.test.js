import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMonitor } from '../src/monitor.js';

describe('createMonitor', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('polls until combo found, then calls onHoldSuccess', async () => {
    const ctx = { siteNo: '0113' };
    const pref = [{ row: 'I', num: 7, priority: 1 }, { row: 'I', num: 8, priority: 2 }];
    const avail1 = [];
    const avail2 = [
      { seatRowNm: 'I', seatNo: '7', seatLocNo: '0010010021' + '0000', sbordNo: '001', seatAreaNo: '001', szoneNo: '01001', seatStusCd: '00' },
      { seatRowNm: 'I', seatNo: '8', seatLocNo: '0010010022' + '0000', sbordNo: '001', seatAreaNo: '001', szoneNo: '01001', seatStusCd: '00' },
    ];
    const api = {
      getSeats: vi.fn().mockResolvedValueOnce(avail1).mockResolvedValueOnce(avail2),
      holdSeats: vi.fn().mockResolvedValue({ paymNo: 'P', paymVrifyNo: 'V' }),
    };
    const onHold = vi.fn();
    const onPoll = vi.fn();
    const m = createMonitor({ api, ctx, preferred: pref, count: 2, interval: 1000, minInterval: 0, onHoldSuccess: onHold, onPoll });
    m.start();
    await vi.advanceTimersByTimeAsync(1); // first tick
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    expect(api.holdSeats).toHaveBeenCalledTimes(1);
    expect(onHold).toHaveBeenCalledTimes(1);
  });

  it('backs off on CGVAPIError but keeps polling', async () => {
    const { CGVAPIError } = await import('../src/api.js');
    const api = {
      getSeats: vi.fn()
        .mockRejectedValueOnce(new CGVAPIError('boom'))
        .mockResolvedValueOnce([]),
      holdSeats: vi.fn(),
    };
    const m = createMonitor({ api, ctx: {}, preferred: [], count: 1, interval: 1000, minInterval: 0, onHoldSuccess: () => {} });
    m.start();
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve(); await Promise.resolve();
    // backoff = 2000ms
    await vi.advanceTimersByTimeAsync(2000);
    await Promise.resolve();
    expect(api.getSeats).toHaveBeenCalledTimes(2);
    m.stop();
  });

  it('stop() prevents further polling', async () => {
    const api = { getSeats: vi.fn().mockResolvedValue([]), holdSeats: vi.fn() };
    const m = createMonitor({ api, ctx: {}, preferred: [], count: 1, interval: 1000, minInterval: 0, onHoldSuccess: () => {} });
    m.start();
    await vi.advanceTimersByTimeAsync(1);
    m.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.getSeats).toHaveBeenCalledTimes(1);
  });
});
