import { describe, it, expect, beforeEach } from 'vitest';
import { readContext, ContextError } from '../src/context.js';

function mockSession(data) {
  window.sessionStorage.clear();
  for (const [k, v] of Object.entries(data)) {
    window.sessionStorage.setItem(k, JSON.stringify(v));
  }
}

function mockPerformance(urls) {
  // jsdom performance.getEntriesByType returns [] by default; stub it
  const entries = urls.map(name => ({ name }));
  vi.stubGlobal('performance', {
    getEntriesByType: () => entries,
  });
}

// vi import for stubGlobal:
import { vi, afterEach } from 'vitest';

describe('readContext', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals?.();
  });
  afterEach(() => { vi.unstubAllGlobals?.(); });

  it('reads from sessionStorage.query and extracts custNo from performance', () => {
    mockSession({
      query: { siteNo: '0181', scnYmd: '20260422', scnsNo: '005', scnSseq: '3', movNo: '30000994', sachlTypCd: '01' },
    });
    mockPerformance(['https://api.cgv.co.kr/foo?coCd=A420&custNo=284236768']);
    const ctx = readContext();
    expect(ctx).toMatchObject({
      siteNo: '0181', scnYmd: '20260422', scnsNo: '005',
      scnSseq: '3', movNo: '30000994', custNo: '284236768',
    });
  });

  it('throws ContextError when query is missing', () => {
    mockSession({});
    mockPerformance([]);
    expect(() => readContext()).toThrow(ContextError);
  });

  it('throws when required field is missing in query', () => {
    mockSession({ query: { siteNo: '0181' } });
    mockPerformance(['https://api.cgv.co.kr/foo?custNo=1']);
    expect(() => readContext()).toThrow(/scnYmd|scnsNo|scnSseq|movNo/);
  });

  it('throws when custNo cannot be extracted', () => {
    mockSession({ query: { siteNo: '0181', scnYmd: '20260422', scnsNo: '005', scnSseq: '3', movNo: 'M' } });
    mockPerformance(['https://api.cgv.co.kr/foo?coCd=A420']);
    expect(() => readContext()).toThrow(/로그인/);
  });
});
