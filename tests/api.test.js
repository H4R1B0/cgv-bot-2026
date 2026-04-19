import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSeats, holdSeats, CGVAPIError } from '../src/api.js';

const baseCtx = {
  siteNo: '0113', scnYmd: '20260414', scnsNo: '001',
  scnSseq: '3', custNo: '284236768', sachlTypCd: '01',
};

describe('getSeats', () => {
  beforeEach(() => { global.fetch = vi.fn(); });

  it('GETs searchIfSeatData with correct params and returns data array', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ statusCode: 0, data: [{ seatRowNm: 'I', seatNo: '7', seatLocNo: '00100100210017', sbordNo: '001', seatAreaNo: '001', szoneNo: '01001', seatSttsCd: '00' }] }),
    });
    const seats = await getSeats(baseCtx);
    expect(seats.length).toBe(1);
    expect(seats[0].seatRowNm).toBe('I');
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('searchIfSeatData');
    expect(url).toContain('siteNo=0113');
    expect(url).toContain('custNo=284236768');
  });

  it('throws CGVAPIError when statusCode != 0', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ statusCode: 9001, statusMessage: 'blocked' }) });
    await expect(getSeats(baseCtx)).rejects.toThrow(CGVAPIError);
  });

  it('throws CGVAPIError on HTTP error', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 503 });
    await expect(getSeats(baseCtx)).rejects.toThrow(CGVAPIError);
  });
});

describe('holdSeats', () => {
  beforeEach(() => { global.fetch = vi.fn(); window.sessionStorage.clear(); });

  it('POSTs seatTempPrmp with seatPrmpDataList and writes pid to sessionStorage', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ statusCode: 0, data: { paymNo: 'P1', paymVrifyNo: 'V1' } }),
    });
    const seat = { seatRowNm: 'I', seatNo: '7', seatLocNo: 'L', sbordNo: 'B', seatAreaNo: 'A', szoneNo: 'Z', seatSttsCd: '00' };
    const res = await holdSeats(baseCtx, [seat]);
    expect(res.paymNo).toBe('P1');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.seatPrmpDataList[0]).toMatchObject({ seatRowNm: 'I', seatNo: '7' });
    expect(JSON.parse(sessionStorage.getItem('pid'))).toEqual({ paymNo: 'P1', paymVrifyNo: 'V1' });
  });
});
