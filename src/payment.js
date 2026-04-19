function parseJSON(key) {
  try { return JSON.parse(window.sessionStorage.getItem(key) || 'null'); } catch { return null; }
}

function setJSON(key, val) {
  window.sessionStorage.setItem(key, JSON.stringify(val));
}

export function buildPaymentState(ctx, combo, holdResult) {
  const movStore = parseJSON('movStore') || {};
  const siteStore = parseJSON('siteStore') || [];
  const query = (ctx.raw && ctx.raw.query) || parseJSON('query') || {};
  const existingMov = parseJSON('mov') || {};

  const site = Array.isArray(siteStore)
    ? (siteStore.find(s => String(s.siteNo) === String(ctx.siteNo)) || siteStore[0] || {})
    : {};

  const movAtktNo = (holdResult && holdResult.movAtktNo) || existingMov.movAtktNo || '';
  const paymNo = (holdResult && holdResult.paymNo) || '';
  const paymVrifyNo = (holdResult && holdResult.paymVrifyNo) || '';

  const movNm = existingMov.movNm || movStore.movNm || query.movNm || '';
  const siteNm = existingMov.siteNm || movStore.siteNm || site.siteNm || query.siteNm || '';
  const scnTm = existingMov.scnTm || movStore.scnTm || query.scnTm || '';
  const prodBnduCd = existingMov.prodBnduCd || movStore.prodBnduCd || '01';
  const prdtypCd = existingMov.prdtypCd || '01';
  const bzplcTypCd = existingMov.bzplcTypCd || '01';

  const goers = combo.map((s, idx) => ({
    prdtypCd,
    bzplcTypCd,
    prodBnduCd,
    prodNo: '',
    movNo: ctx.movNo,
    movAtktNo,
    seatLocNo: s.seatLocNo,
    seatRowNm: s.seatRowNm,
    seatNo: s.seatNo,
    sbordNo: s.sbordNo || String(idx + 1).padStart(3, '0'),
    seatAreaNo: s.seatAreaNo || '001',
    szoneNo: s.szoneNo || '',
    szoneKindCd: '01',
    stkndCd: '01',
    salQty: 1,
    salAmt: 0,
    scnAmt: 0,
    amount: 0,
  }));

  const sellProductsList = goers.map(g => ({
    prdtypCd: g.prdtypCd,
    bzplcTypCd: g.bzplcTypCd,
    prodBnduCd: g.prodBnduCd,
    prodNo: '',
    movNo: g.movNo,
    seatLocNo: g.seatLocNo,
    seatRowNm: g.seatRowNm,
    seatNo: g.seatNo,
    sbordNo: g.sbordNo,
    seatAreaNo: g.seatAreaNo,
    szoneNo: g.szoneNo,
    szoneKindCd: '01',
    stkndCd: '01',
    salQty: 1,
    salAmt: 0,
    scnAmt: 0,
    prodPrc: 0,
    seatSalfrmCd: '01',
    prodDcAplyPsblYn: 'Y',
  }));

  const mov = {
    ...existingMov,
    coCd: 'A420',
    siteNo: ctx.siteNo,
    siteNm,
    movNo: ctx.movNo,
    movNm,
    scnYmd: ctx.scnYmd,
    scnsNo: ctx.scnsNo,
    scnSseq: ctx.scnSseq,
    scnTm,
    sachlTypCd: ctx.sachlTypCd || '01',
    prodBnduCd,
    prdtypCd,
    bzplcTypCd,
    custNo: ctx.custNo,
    movAtktNo,
    sellProductsList,
    ticketProducts: sellProductsList,
  };

  const com = { siteNo: ctx.siteNo, saleDt: ctx.scnYmd };
  const pid = { paymNo, paymVrifyNo };

  return { mov, com, movieGoers: goers, pid };
}

export function enterPayment(ctx, combo, holdResult) {
  const state = buildPaymentState(ctx, combo, holdResult);
  setJSON('mov', state.mov);
  setJSON('com', state.com);
  setJSON('movieGoers', state.movieGoers);
  if (state.pid.paymNo && state.pid.paymVrifyNo) setJSON('pid', state.pid);
  window.location.href = 'https://www.cgv.co.kr/mpy/main';
}
