const BASE = 'https://api.cgv.co.kr';
const CO_CD = 'A420';

export class CGVAPIError extends Error {
  constructor(message, { statusCode, httpStatus } = {}) {
    super(message);
    this.name = 'CGVAPIError';
    this.statusCode = statusCode;
    this.httpStatus = httpStatus;
  }
}

async function request(path, { method = 'GET', query, body } = {}) {
  let url = BASE + path;
  if (query) {
    const usp = new URLSearchParams(query);
    url += '?' + usp.toString();
  }
  const init = { method, credentials: 'include', headers: {} };
  if (body) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new CGVAPIError(`네트워크 오류: ${e.message}`);
  }
  if (!res.ok) {
    throw new CGVAPIError(`HTTP ${res.status}`, { httpStatus: res.status });
  }
  const json = await res.json();
  if (json.statusCode !== 0) {
    throw new CGVAPIError(`API 오류: ${json.statusMessage || json.statusCode}`, { statusCode: json.statusCode });
  }
  return json.data;
}

export async function getSeats(ctx) {
  return await request('/cnm/atkt/searchIfSeatData', {
    query: {
      coCd: CO_CD,
      siteNo: ctx.siteNo,
      scnYmd: ctx.scnYmd,
      scnsNo: ctx.scnsNo,
      scnSseq: ctx.scnSseq,
      seatAreaNo: '001',
      cusgdCd: '01',
      custNo: ctx.custNo,
    },
  });
}

export async function holdSeats(ctx, seats) {
  const data = await request('/cnm/seatTemp/seatTempPrmp', {
    method: 'POST',
    body: {
      coCd: CO_CD,
      bymd: '',
      mbltNo: '',
      siteNo: ctx.siteNo,
      scnYmd: ctx.scnYmd,
      scnsNo: ctx.scnsNo,
      scnSseq: ctx.scnSseq,
      movAtktNo: '',
      custNo: ctx.custNo,
      cusgdCd: '01',
      nmbrCrtfNo: '',
      sachlCd: '10',
      atktChnlCd: '01',
      sachlTypCd: ctx.sachlTypCd || '01',
      rtctlScopCd: '08',
      seatPrmpDataList: seats.map(s => ({
        seatRowNm: s.seatRowNm,
        seatNo: s.seatNo,
        seatLocNo: s.seatLocNo,
        sbordNo: s.sbordNo,
        seatAreaNo: s.seatAreaNo,
        szoneNo: s.szoneNo,
      })),
    },
  });
  if (data?.paymNo && data?.paymVrifyNo) {
    window.sessionStorage.setItem('pid', JSON.stringify({
      paymNo: data.paymNo, paymVrifyNo: data.paymVrifyNo,
    }));
  }
  return data;
}
