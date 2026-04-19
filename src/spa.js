function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitFor(fn, { timeoutMs = 5000, intervalMs = 100 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = fn();
    if (r) return r;
    await wait(intervalMs);
  }
  return null;
}

function findDoneButton() {
  const btns = document.querySelectorAll('button');
  let best = null;
  let bestZ = -1;
  for (const btn of btns) {
    if (btn.textContent.trim() !== '선택완료') continue;
    if (btn.disabled) continue;
    const r = btn.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (btn.offsetParent === null) continue;
    const footer = btn.closest('[class*="bot-modal-footer"]');
    const z = footer ? (parseInt(getComputedStyle(footer).zIndex, 10) || 0) : 0;
    if (!best || z >= bestZ) { best = btn; bestZ = z; }
  }
  return best;
}

function findPayButton() {
  const btns = document.querySelectorAll('button');
  for (const btn of btns) {
    const t = btn.textContent.trim();
    if ((/결제하기/.test(t) || /결제/.test(t)) && !btn.disabled) {
      const r = btn.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && btn.offsetParent !== null) return btn;
    }
  }
  return null;
}

function findSeatButton(seatLocNo) {
  return document.querySelector(`button[data-seatlocno="${CSS.escape(seatLocNo)}"]`);
}

function findSeatMapModal() {
  const candidates = document.querySelectorAll('[class*="bot-modal"], [class*="modal"][class*="seat"], [role="dialog"]');
  for (const c of candidates) {
    if (c.querySelector('button[data-seatlocno]')) return c;
  }
  return null;
}

function findModalCloseButton(modal) {
  const selectors = [
    'button[aria-label*="닫기"]',
    'button[title*="닫기"]',
    'button[class*="close"]',
    'button[class*="Close"]',
  ];
  for (const sel of selectors) {
    const b = modal.querySelector(sel);
    if (b) return b;
  }
  for (const b of modal.querySelectorAll('button')) {
    const t = b.textContent.trim();
    if (t === '' || t === '×' || t === 'X' || /닫기/.test(t)) return b;
  }
  return null;
}

function findOpenSeatMapButton() {
  const wrap = document.querySelector('[class*="seatSelectWrap"]');
  if (wrap) {
    for (const btn of wrap.querySelectorAll('button')) {
      if (btn.textContent.trim() === '선택') return btn;
    }
  }
  for (const btn of document.querySelectorAll('button')) {
    const t = btn.textContent.trim();
    if (t === '선택' && !btn.getAttribute('data-seatlocno') && !btn.closest('.rzpp-mini-map')) return btn;
  }
  return null;
}

async function reopenSeatMap() {
  const modal = findSeatMapModal();
  if (!modal) throw new Error('좌석맵 모달 미발견');
  const close = findModalCloseButton(modal);
  if (!close) throw new Error('좌석맵 닫기 버튼 미발견');
  close.click();
  await waitFor(() => !findSeatMapModal(), { timeoutMs: 3000 });
  const openBtn = findOpenSeatMapButton();
  if (!openBtn) throw new Error('좌석맵 열기(선택) 버튼 미발견');
  openBtn.click();
  await waitFor(() => document.querySelector('button[data-seatlocno]'), { timeoutMs: 5000 });
}

export async function proceedToPayment(combo, { log } = {}) {
  const say = (m) => { if (log) log(m); };

  const firstLoc = combo[0].seatLocNo;
  say(`좌석 버튼 활성화 대기: ${firstLoc}`);
  let seatBtn = await waitFor(() => {
    const b = findSeatButton(firstLoc);
    return b && !b.disabled ? b : null;
  }, { timeoutMs: 3000 });

  if (!seatBtn) {
    say('DOM 미갱신 — 좌석맵 닫기/다시열기로 새로고침');
    await reopenSeatMap();
    seatBtn = await waitFor(() => {
      const b = findSeatButton(firstLoc);
      return b && !b.disabled ? b : null;
    }, { timeoutMs: 6000 });
  }
  if (!seatBtn) throw new Error('좌석 버튼이 활성화되지 않음 — 수동 확인 필요');

  say(`좌석 클릭: ${combo[0].seatRowNm}${combo[0].seatNo}`);
  seatBtn.click();

  say('선택완료 버튼 활성화 대기');
  const doneBtn = await waitFor(findDoneButton, { timeoutMs: 4000 });
  if (!doneBtn) throw new Error('선택완료 버튼이 활성화되지 않음');

  say('선택완료 클릭');
  doneBtn.click();

  say('결제하기 버튼 대기');
  const payBtn = await waitFor(findPayButton, { timeoutMs: 8000 });
  if (payBtn) {
    say('결제하기 클릭');
    payBtn.click();
  } else {
    say('결제하기 버튼 미발견 — SPA가 이미 결제 페이지로 이동했을 수 있음');
  }
}
