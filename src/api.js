const BASE = 'https://api.cgv.co.kr';
const CO_CD = 'A420';
const SIG_SECRET = 'ydqXY0ocnFLmJGHr_zNzFcpjwAsXq_8JcBNURAkRscg';
const SIG_HOSTS = ['https://api.cgv.co.kr', 'https://event.cgv.co.kr'];

export class CGVAPIError extends Error {
  constructor(message, { statusCode, httpStatus } = {}) {
    super(message);
    this.name = 'CGVAPIError';
    this.statusCode = statusCode;
    this.httpStatus = httpStatus;
  }
}

function readAccessToken() {
  const raw = document.cookie.split('; ').find(c => c.startsWith('accessToken='));
  if (!raw) return '';
  return decodeURIComponent(raw.slice('accessToken='.length));
}

async function hmacSha256Base64(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function request(path, { method = 'GET', query, body } = {}) {
  let urlStr = BASE + path;
  if (query) {
    const usp = new URLSearchParams(query);
    urlStr += '?' + usp.toString();
  }
  const url = new URL(urlStr);

  const headers = {
    Accept: 'application/json',
    'Accept-Language': 'ko-KR',
  };
  const token = readAccessToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  let bodyStr = '';
  if (body !== undefined && body !== null) {
    bodyStr = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  if (SIG_HOSTS.some(h => urlStr.startsWith(h))) {
    const ts = Math.floor(Date.now() / 1000).toString();
    const msg = ts + '|' + url.pathname + '|' + bodyStr;
    const sig = await hmacSha256Base64(msg, SIG_SECRET);
    headers['X-TIMESTAMP'] = ts;
    headers['X-SIGNATURE'] = sig;
  }

  const init = { method, credentials: 'include', headers };
  if (bodyStr) init.body = bodyStr;

  let res;
  try {
    res = await fetch(urlStr, init);
  } catch (e) {
    throw new CGVAPIError('네트워크 오류: ' + e.message);
  }
  if (!res.ok) {
    throw new CGVAPIError('HTTP ' + res.status, { httpStatus: res.status });
  }
  const json = await res.json();
  if (json.statusCode !== 0) {
    throw new CGVAPIError('API 오류: ' + (json.statusMessage || json.statusCode), { statusCode: json.statusCode });
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
  if (data && data.paymNo && data.paymVrifyNo) {
    window.sessionStorage.setItem('pid', JSON.stringify({
      paymNo: data.paymNo, paymVrifyNo: data.paymVrifyNo,
    }));
  }
  return data;
}
