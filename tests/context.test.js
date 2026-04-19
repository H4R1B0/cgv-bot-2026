import { describe, it, expect, beforeEach } from 'vitest';
import { readContext, ContextError } from '../src/context.js';

function mockSession(data) {
  window.sessionStorage.clear();
  for (const [k, v] of Object.entries(data)) {
    window.sessionStorage.setItem(k, JSON.stringify(v));
  }
}

describe('readContext', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('combines com/mov/movieGoers into context object', () => {
    mockSession({
      com: { siteNo: '0113', saleDt: '20260414' },
      mov: {
        scnYmd: '20260414', scnsNo: '001', scnSseq: '3',
        custNo: '284236768', sachlTypCd: '01', prodBnduCd: 'X',
        movNo: 'M1', movNm: '미키 17'
      },
      movieGoers: { 일반인원수: 2, 청소년인원수: 0, 경로인원수: 0, 우대인원수: 0 },
    });
    const ctx = readContext();
    expect(ctx).toMatchObject({
      siteNo: '0113', scnYmd: '20260414', scnsNo: '001',
      scnSseq: '3', custNo: '284236768', count: 2,
    });
  });

  it('throws ContextError when mov is missing', () => {
    mockSession({ com: { siteNo: '0113' } });
    expect(() => readContext()).toThrow(ContextError);
  });

  it('throws when count is 0', () => {
    mockSession({
      com: { siteNo: '0113' },
      mov: { scnYmd: '20260414', scnsNo: '001', scnSseq: '3', custNo: '1' },
      movieGoers: { 일반인원수: 0, 청소년인원수: 0, 경로인원수: 0, 우대인원수: 0 },
    });
    expect(() => readContext()).toThrow(/인원/);
  });
});
