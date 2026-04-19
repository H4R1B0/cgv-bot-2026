export class ContextError extends Error {
  constructor(message) { super(message); this.name = 'ContextError'; }
}

function parseJSON(key) {
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function readContext() {
  const com = parseJSON('com');
  const mov = parseJSON('mov');
  const goers = parseJSON('movieGoers');
  if (!mov) throw new ContextError('예매 컨텍스트(mov)가 없습니다. 예매 플로우 처음부터 다시 시작하세요.');
  const siteNo = (com && com.siteNo) || mov.siteNo;
  if (!siteNo) throw new ContextError('siteNo를 찾을 수 없습니다.');
  const required = ['scnYmd', 'scnsNo', 'scnSseq', 'custNo'];
  for (const k of required) {
    if (!mov[k]) throw new ContextError(`${k} 누락 — 플로우를 다시 진행하세요.`);
  }
  const count = (goers?.일반인원수 ?? 0) + (goers?.청소년인원수 ?? 0)
              + (goers?.경로인원수 ?? 0) + (goers?.우대인원수 ?? 0);
  if (count <= 0) throw new ContextError('인원 선택 단계부터 다시 진행하세요.');
  return {
    siteNo,
    scnYmd: mov.scnYmd,
    scnsNo: mov.scnsNo,
    scnSseq: mov.scnSseq,
    custNo: String(mov.custNo),
    sachlTypCd: mov.sachlTypCd || '01',
    count,
    raw: { com, mov, goers },
  };
}
