import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMonitor } from '../src/monitor.js';

describe('createMonitor', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('polls until combo found, then calls onAvailable', async () => {
    const ctx = { siteNo: '0113' };
    const pref = [{ row: 'I', num: 7, priority: 1 }, { row: 'I', num: 8, priority: 2 }];
    const avail1 = [];
    const avail2 = [
      { seatRowNm: 'I', seatNo: '7', seatLocNo: '0010010021' + '0000', sbordNo: '001', seatAreaNo: '001', szoneNo: '01001', seatStusCd: '00' },
      { seatRowNm: 'I', seatNo: '8', seatLocNo: '0010010022' + '0000', sbordNo: '001', seatAreaNo: '001', szoneNo: '01001', seatStusCd: '00' },
    ];
    const api = {
      getSeats: vi.fn().mockResolvedValueOnce(avail1).mockResolvedValueOnce(avail2),
    };
    const onAvailable = vi.fn();
    const onPoll = vi.fn();
    const m = createMonitor({ api, ctx, preferred: pref, count: 2, interval: 1000, minInterval: 0, onAvailable, onPoll });
    m.start();
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    expect(onAvailable).toHaveBeenCalledTimes(1);
    expect(onAvailable.mock.calls[0][0]).toHaveLength(2);
    expect(m.isRunning()).toBe(false);
  });

  it('backs off on CGVAPIError but keeps polling', async () => {
    const { CGVAPIError } = await import('../src/api.js');
    const api = {
      getSeats: vi.fn()
        .mockRejectedValueOnce(new CGVAPIError('boom'))
        .mockResolvedValueOnce([]),
    };
    const m = createMonitor({ api, ctx: {}, preferred: [], count: 1, interval: 1000, minInterval: 0, onAvailable: () => {} });
    m.start();
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve(); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2000);
    await Promise.resolve();
    expect(api.getSeats).toHaveBeenCalledTimes(2);
    m.stop();
  });

  it('stop() prevents further polling', async () => {
    const api = { getSeats: vi.fn().mockResolvedValue([]) };
    const m = createMonitor({ api, ctx: {}, preferred: [], count: 1, interval: 1000, minInterval: 0, onAvailable: () => {} });
    m.start();
    await vi.advanceTimersByTimeAsync(1);
    m.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.getSeats).toHaveBeenCalledTimes(1);
  });
});
