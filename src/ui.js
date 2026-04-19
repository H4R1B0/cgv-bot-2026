const ID_BANNER = 'cgvbot-banner';
const ID_START = 'cgvbot-start';
const ID_CONTROLS = 'cgvbot-controls';
const STYLE_ID = 'cgvbot-style';
const ID_OVERLAY = 'cgvbot-overlay';

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ID_BANNER} {
      width: 100%; padding: 12px 16px; box-sizing: border-box;
      background: #222; color: #fff; font: 14px/1.4 sans-serif;
      text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,.25);
    }
    #${ID_BANNER}.cgvbot-ok { background: #1a7f3c; }
    #${ID_BANNER}.cgvbot-warn { background: #b32; }
    #${ID_BANNER}.cgvbot-alert { background: #d22; animation: cgvbot-pulse 0.6s infinite; }
    @keyframes cgvbot-pulse { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.5)} }
    #${ID_START} {
      position: fixed; bottom: 20px; left: 50%;
      transform: translateX(-50%); z-index: 2147483000;
      padding: 14px 40px; border: 0; border-radius: 8px;
      background: #55f; color: #fff; font: bold 16px sans-serif;
      cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,.3);
    }
    #${ID_START}:disabled { background: #aaa; cursor: not-allowed; }
    #${ID_OVERLAY} {
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 2147483000;
    }
    #${ID_OVERLAY} .cgvbot-badge {
      position: fixed;
      width: 22px; height: 22px;
      border-radius: 50%;
      background: #55f; color: #fff;
      font: bold 12px/22px sans-serif;
      text-align: center;
      box-shadow: 0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,.3);
      pointer-events: none;
    }
    #${ID_CONTROLS} {
      position: fixed; bottom: 20px; left: 50%;
      transform: translateX(-50%); z-index: 2147483000;
      background: #fff; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,.25);
      padding: 8px 12px;
    }
    .cgvbot-ctl-wrap { display: flex; align-items: center; gap: 8px; }
    .cgvbot-ctl-label { font: bold 13px sans-serif; color: #333; margin-right: 4px; }
    .cgvbot-ctl-btn {
      width: 32px; height: 32px; border: 1px solid #ccc; background: #f7f7f7;
      border-radius: 6px; font: bold 18px sans-serif; cursor: pointer;
    }
    .cgvbot-ctl-btn:hover:not(:disabled) { background: #eee; }
    .cgvbot-ctl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .cgvbot-ctl-num { display: inline-block; min-width: 28px; text-align: center; font: bold 16px sans-serif; }
    .cgvbot-ctl-start {
      margin-left: 8px; padding: 8px 20px; border: 0; border-radius: 6px;
      background: #55f; color: #fff; font: bold 14px sans-serif; cursor: pointer;
    }
    .cgvbot-ctl-start:disabled { background: #aaa; cursor: not-allowed; }
    .cgvbot-ctl-start.cgvbot-ctl-stop { background: #d33; }
    .cgvbot-ctl-start.cgvbot-ctl-stop:hover { background: #c22; }
  `;
  document.head.appendChild(style);
}

function attachBannerToDOM(el) {
  // 본문 컬럼(mainContentArea) 의 첫 자식으로 삽입 → 배너가 본문 위에 자연스럽게 자리잡음
  const main = document.querySelector('[class*="mainContentArea"]');
  if (main) {
    main.insertBefore(el, main.firstChild);
    return;
  }
  // fallback: body 의 첫 번째 div 앞
  const firstDiv = document.body.querySelector(':scope > div');
  if (firstDiv) {
    document.body.insertBefore(el, firstDiv);
  } else {
    document.body.insertBefore(el, document.body.firstChild);
  }
}

export function mountBanner(initialText) {
  injectStyle();
  let el = document.getElementById(ID_BANNER);
  if (!el) {
    el = document.createElement('div');
    el.id = ID_BANNER;
    attachBannerToDOM(el);
  }
  el.textContent = initialText;
  el.className = '';
  return {
    set(text, level = 'info') {
      // React 가 본문을 재렌더해서 배너가 떨어져나갔으면 다시 붙임
      if (!document.contains(el)) attachBannerToDOM(el);
      el.textContent = text;
      el.className = level === 'ok' ? 'cgvbot-ok'
                   : level === 'warn' ? 'cgvbot-warn'
                   : level === 'alert' ? 'cgvbot-alert' : '';
    },
    remove() { el.remove(); },
  };
}

export function mountStartButton(onClick) {
  injectStyle();
  let btn = document.getElementById(ID_START);
  if (!btn) {
    btn = document.createElement('button');
    btn.id = ID_START;
    btn.type = 'button';
    btn.textContent = '완료 (감시 시작)';
    document.body.appendChild(btn);
  }
  btn.disabled = true;
  btn.onclick = () => { btn.disabled = true; onClick(); };
  return {
    setEnabled(v) { btn.disabled = !v; },
    remove() { btn.remove(); },
  };
}

// 배지를 좌석 element 참조 대신 data-seatlocno 키로 추적 — React 가 좌석 노드를 갈아치워도 안 끊김.
// 매 프레임 requestAnimationFrame 으로 위치 재계산 — 모달 스크롤/줌/transform/레이아웃 변동에도 따라옴.
const badgeBySeatLoc = new Map(); // seatLocNo → badge element
let overlayContainer = null;
let rafId = null;

function ensureOverlay() {
  if (overlayContainer && document.body.contains(overlayContainer)) return overlayContainer;
  overlayContainer = document.createElement('div');
  overlayContainer.id = ID_OVERLAY;
  document.body.appendChild(overlayContainer);
  return overlayContainer;
}

// CGV 의 좌석맵 모달은 닫혀도 [role="dialog"] 가 DOM 에 남아있고
// visibility:hidden 으로만 가려진다. offsetParent 체크는 visibility:hidden 을 못 잡으므로
// checkVisibility() 로 확인 (visibility 와 opacity 도 함께 체크).
// 같은 data-seatlocno 가 미니맵(작은) + 전체맵(큰) 둘 다 매치되면 더 큰 버튼을 우선.
function isSeatVisible(el) {
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility({ visibilityProperty: true, opacityProperty: true });
  }
  // fallback: 조상 체인에서 display:none / visibility:hidden / opacity:0 검사
  let p = el;
  while (p && p !== document.body) {
    const cs = getComputedStyle(p);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    p = p.parentElement;
  }
  return true;
}

function findVisibleSeatButton(seatLocNo) {
  const matches = document.querySelectorAll(`[role="dialog"] button[data-seatlocno="${CSS.escape(seatLocNo)}"]`);
  let best = null;
  let bestArea = 0;
  for (const el of matches) {
    if (!isSeatVisible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const area = r.width * r.height;
    if (area > bestArea) { best = el; bestArea = area; }
  }
  return best;
}

function repositionAllBadges() {
  for (const [seatLocNo, badge] of badgeBySeatLoc) {
    const seatEl = findVisibleSeatButton(seatLocNo);
    if (!seatEl) {
      badge.style.display = 'none';
      continue;
    }
    const r = seatEl.getBoundingClientRect();
    badge.style.display = '';
    badge.style.left = (r.right - 14) + 'px';
    badge.style.top = (r.top - 6) + 'px';
  }
}

function startBadgeRAF() {
  if (rafId != null) return;
  const tick = () => {
    if (badgeBySeatLoc.size === 0) { rafId = null; return; }
    repositionAllBadges();
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function stopBadgeRAF() {
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
}

// 모달 닫기 버튼이 클릭되는 즉시 배지를 숨김 — rAF 대기(~16ms) 보다 빠른 0ms 응답.
// CGV 가 닫기 시 fade-out 애니메이션을 두면 그동안 checkVisibility 가 true 라 배지가 잠깐 남는 걸 방지.
let closeClickListenerAttached = false;
function attachCloseClickListener() {
  if (closeClickListenerAttached) return;
  closeClickListenerAttached = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('button, [role="button"]');
    if (!btn) return;
    if (!btn.closest('[role="dialog"]')) return;
    const t = (btn.textContent || '').trim();
    const meta = (btn.getAttribute('aria-label') || '') + ' ' +
                 (btn.getAttribute('title') || '') + ' ' +
                 (btn.className?.toString() || '');
    const isClose = /^[xX×✕✖]$/.test(t) || /닫기|close/i.test(meta);
    if (!isClose) return;
    for (const badge of badgeBySeatLoc.values()) badge.style.display = 'none';
  }, true);
}

export function setBadge(seatEl, priority) {
  const seatLocNo = seatEl?.getAttribute?.('data-seatlocno');
  if (!seatLocNo) return;
  let badge = badgeBySeatLoc.get(seatLocNo);
  if (priority == null) {
    if (badge) { badge.remove(); badgeBySeatLoc.delete(seatLocNo); }
    if (badgeBySeatLoc.size === 0) stopBadgeRAF();
    return;
  }
  injectStyle();
  const container = ensureOverlay();
  attachCloseClickListener();
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'cgvbot-badge';
    container.appendChild(badge);
    badgeBySeatLoc.set(seatLocNo, badge);
  }
  badge.textContent = String(priority);
  startBadgeRAF();
}

export function clearAllBadges() {
  for (const badge of badgeBySeatLoc.values()) badge.remove();
  badgeBySeatLoc.clear();
  stopBadgeRAF();
  overlayContainer?.remove();
  overlayContainer = null;
}

export function mountControlBar({ initialCount = 2, onCountChange, onStart, onStop }) {
  injectStyle();
  let bar = document.getElementById(ID_CONTROLS);
  if (!bar) {
    bar = document.createElement('div');
    bar.id = ID_CONTROLS;
    document.body.appendChild(bar);
  }
  bar.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'cgvbot-ctl-wrap';

  const label = document.createElement('span');
  label.className = 'cgvbot-ctl-label';
  label.textContent = '인원';

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'cgvbot-ctl-btn';
  minus.textContent = '−';

  const num = document.createElement('span');
  num.className = 'cgvbot-ctl-num';

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'cgvbot-ctl-btn';
  plus.textContent = '+';

  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'cgvbot-ctl-start';
  start.textContent = '완료 (감시 시작)';
  start.disabled = true;

  wrap.append(label, minus, num, plus, start);
  bar.appendChild(wrap);

  let count = initialCount;
  let running = false;

  function render() {
    num.textContent = String(count);
    minus.disabled = running || count <= 1;
    plus.disabled = running || count >= 8;
  }

  function renderStart() {
    if (running) {
      start.textContent = '중지';
      start.classList.add('cgvbot-ctl-stop');
      start.disabled = false; // 중지는 항상 누를 수 있음
    } else {
      start.textContent = '완료 (감시 시작)';
      start.classList.remove('cgvbot-ctl-stop');
    }
  }

  render();
  renderStart();

  minus.onclick = () => { if (!running && count > 1) { count--; render(); onCountChange?.(count); } };
  plus.onclick = () => { if (!running && count < 8) { count++; render(); onCountChange?.(count); } };
  start.onclick = () => {
    if (running) {
      running = false;
      render();
      renderStart();
      onStop?.();
    } else {
      running = true;
      render();
      renderStart();
      onStart?.(count);
    }
  };

  return {
    getCount() { return count; },
    setEnabled(v) { if (!running) start.disabled = !v; },
    setRunning(v) {
      running = !!v;
      render();
      renderStart();
    },
    remove() { bar.remove(); },
  };
}

export function clearAllUi() {
  document.getElementById(ID_BANNER)?.remove();
  document.getElementById(ID_START)?.remove();
  document.getElementById(ID_CONTROLS)?.remove();
  clearAllBadges();
}
