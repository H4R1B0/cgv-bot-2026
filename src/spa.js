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
  // 페이지 본문의 "X원 결제하기" — 금액 > 0 만 (초기 "0원 결제하기"는 좌석 미확정 상태이므로 클릭 금지).
  // bot-modal-footer (좌석맵 모달 footer) 는 '선택완료' 버튼만 있는 곳이므로 제외.
  // 확인 모달의 단순 "결제하기" 도 제외 (그건 findConfirmPayButton 담당).
  for (const btn of document.querySelectorAll('button')) {
    const t = btn.textContent.trim();
    const m = t.match(/([\d,]+)\s*원\s*결제하기/);
    if (!m) continue;
    const amount = parseInt(m[1].replace(/,/g, ''), 10);
    if (!(amount > 0)) continue;
    if (btn.disabled) continue;
    if (btn.closest('[class*="bot-modal-footer"]')) continue;
    const r = btn.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || btn.offsetParent === null) continue;
    return btn;
  }
  return null;
}

function findConfirmPayButton() {
  // "결제 전 확인해 주세요" 모달 내부의 최종 결제하기 버튼
  const dialogs = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"]');
  for (const d of dialogs) {
    if (!/결제 ?전 ?확인/.test(d.textContent)) continue;
    for (const btn of d.querySelectorAll('button')) {
      if (btn.textContent.trim() !== '결제하기') continue;
      if (btn.disabled) continue;
      const r = btn.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || btn.offsetParent === null) continue;
      return btn;
    }
  }
  return null;
}

function findSeatButton(seatLocNo) {
  // 같은 data-seatlocno 가 미니맵(4×4) + 전체맵(46×46) 두 곳에 존재.
  // 전체맵 버튼이 실제 클릭/예약 대상이므로 visible 한 것 중 가장 큰 것을 선택.
  const matches = document.querySelectorAll(`button[data-seatlocno="${CSS.escape(seatLocNo)}"]`);
  let best = null;
  let bestArea = 0;
  for (const el of matches) {
    if (typeof el.checkVisibility === 'function'
        && !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const area = r.width * r.height;
    if (area > bestArea) { best = el; bestArea = area; }
  }
  return best;
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

function findRefreshButton() {
  // 관람인원 섹션 헤더 옆의 새로고침 버튼 (CGV 자체 UI)
  const headers = document.querySelectorAll('h1, h2, h3, h4');
  for (const h of headers) {
    if (h.textContent.trim() === '관람인원') {
      const btn = h.parentElement?.querySelector('button[title="새로고침"]');
      if (btn) return btn;
    }
  }
  // fallback: title=새로고침 첫 번째
  return document.querySelector('button[title="새로고침"]');
}

function findCountButton(n) {
  if (!n) return null;
  // "일반" 행 우선 (aria-label="N 선택")
  const labels = document.querySelectorAll('[id="number-choice-label"]');
  for (const lb of labels) {
    if (lb.textContent.trim() !== '일반') continue;
    const group = lb.parentElement;
    if (!group) continue;
    for (const b of group.querySelectorAll('button.btn-num')) {
      if (b.textContent.trim() === String(n)) return b;
    }
  }
  // fallback: aria-label 매치
  return document.querySelector(`button.btn-num[aria-label="${n} 선택"]`);
}

// 좌석맵 모달은 닫지 않고 CGV 자체 ↻ 버튼으로 좌석 데이터만 갱신.
// ↻ 부작용으로 인원 선택이 리셋되므로 savedCount 로 즉시 재선택.
async function refreshSeatsInPlace(savedCount) {
  const refresh = findRefreshButton();
  if (!refresh) throw new Error('새로고침 버튼 미발견');
  refresh.click();
  if (!savedCount) return;
  // 인원 버튼이 리셋 후 다시 렌더될 때까지 잠깐 대기
  const numBtn = await waitFor(
    () => {
      const b = findCountButton(savedCount);
      if (!b) return null;
      if (b.getAttribute('aria-pressed') === 'true') return b; // 이미 적용됨
      return b;
    },
    { timeoutMs: 3000, intervalMs: 80 }
  );
  if (numBtn && numBtn.getAttribute('aria-pressed') !== 'true') numBtn.click();
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

export async function proceedToPayment(combo, { log, count } = {}) {
  const say = (m) => { if (log) log(m); };

  const firstLoc = combo[0].seatLocNo;
  say(`좌석 버튼 활성화 대기: ${firstLoc}`);
  // 짧게 기다렸다 안 되면 바로 ↻ 새로고침으로 넘어감. 이미 활성화돼 있으면 waitFor 는 즉시 반환.
  let seatBtn = await waitFor(() => {
    const b = findSeatButton(firstLoc);
    return b && !b.disabled ? b : null;
  }, { timeoutMs: 500, intervalMs: 50 });

  if (!seatBtn) {
    // 1차: CGV 자체 ↻ 새로고침 — 좌석맵 모달 유지, 인원만 자동 재선택
    try {
      say('DOM 미갱신 — ↻ 새로고침으로 좌석 데이터만 갱신 (모달 유지)');
      await refreshSeatsInPlace(count);
      seatBtn = await waitFor(() => {
        const b = findSeatButton(firstLoc);
        return b && !b.disabled ? b : null;
      }, { timeoutMs: 5000 });
    } catch (e) {
      say(`↻ 새로고침 실패: ${e.message}`);
    }
  }

  if (!seatBtn) {
    // 2차 fallback: 모달 닫고 다시 열기 (부작용 큼 — 인원/좌석맵 리셋)
    say('↻로 해결 안 됨 — 좌석맵 닫기/다시열기로 재시도');
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

  say('결제하기 버튼 대기 (1/2)');
  const payBtn = await waitFor(findPayButton, { timeoutMs: 8000 });
  if (!payBtn) {
    say('결제하기 버튼 미발견 — SPA가 이미 결제 페이지로 이동했을 수 있음');
    return;
  }
  say('결제하기 클릭 (1/2)');
  payBtn.click();

  say('결제 전 확인 모달 대기 (2/2)');
  const confirmBtn = await waitFor(findConfirmPayButton, { timeoutMs: 5000 });
  if (!confirmBtn) {
    say('확인 모달 결제하기 미발견 — 모달이 안 떴거나 이미 결제 페이지로 이동했을 수 있음 (수동 확인 필요)');
    return;
  }
  say('결제하기 클릭 (2/2 — 확인 모달)');
  confirmBtn.click();
}
