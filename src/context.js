export class ContextError extends Error {
  constructor(message) { super(message); this.name = 'ContextError'; }
}

function parseJSON(key) {
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function extractCustNo() {
  try {
    const resources = performance.getEntriesByType('resource');
    for (const r of resources) {
      const m = r.name && r.name.match(/[?&]custNo=(\d+)/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

export function readContext() {
  const query = parseJSON('query');
  if (!query) {
    throw new ContextError('예매 컨텍스트가 없습니다. 영화/회차 선택을 다시 진행하세요.');
  }
  const required = ['siteNo', 'scnYmd', 'scnsNo', 'scnSseq', 'movNo'];
  for (const k of required) {
    if (!query[k]) throw new ContextError(`${k} 누락 — 영화/회차를 다시 선택하세요.`);
  }

  const custNo = extractCustNo();
  if (!custNo) {
    throw new ContextError('로그인 정보를 감지하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도하세요.');
  }

  return {
    siteNo: String(query.siteNo),
    scnYmd: String(query.scnYmd),
    scnsNo: String(query.scnsNo),
    scnSseq: String(query.scnSseq),
    movNo: String(query.movNo),
    custNo: String(custNo),
    sachlTypCd: String(query.sachlTypCd || '01'),
    raw: { query },
  };
}
