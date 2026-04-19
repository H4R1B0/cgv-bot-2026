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

function findRefreshButton() {
  const byTitle = document.querySelector('button.btn-icon[title="새로고침"]');
  if (byTitle) return byTitle;
  const iconBtns = document.querySelectorAll('button.btn-icon');
  for (const b of iconBtns) {
    if (b.querySelector('svg')) return b;
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

export async function proceedToPayment(combo, { log } = {}) {
  const say = (m) => { if (log) log(m); };

  say('새로고침 버튼 클릭');
  const refresh = findRefreshButton();
  if (refresh) refresh.click();

  const firstLoc = combo[0].seatLocNo;
  say(`좌석 버튼 활성화 대기: ${firstLoc}`);
  const seatBtn = await waitFor(() => {
    const b = findSeatButton(firstLoc);
    return b && !b.disabled ? b : null;
  }, { timeoutMs: 6000 });
  if (!seatBtn) throw new Error('좌석 버튼이 활성화되지 않음');

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
