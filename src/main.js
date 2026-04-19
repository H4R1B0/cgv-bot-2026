import { readContext, ContextError } from './context.js';
import * as api from './api.js';
import { mountBanner, mountControlBar, setBadge, clearAllUi } from './ui.js';
import { bell, blinkTitle, stopBlink } from './notify.js';
import { createMonitor } from './monitor.js';
import { proceedToPayment } from './spa.js';

const STATE_KEY = '__cgvBot2026__';

function pageGuard() {
  const okHost = /(^|\.)cgv\.co\.kr$/.test(location.hostname);
  if (!okHost) { alert('CGV.co.kr에서 실행하세요.'); return false; }
  return true;
}

function collectSeatButtons() {
  return Array.from(document.querySelectorAll('button[data-seatlocno]'));
}

function seatMetaFromBtn(btn) {
  const locNo = btn.getAttribute('data-seatlocno');
  const row = btn.getAttribute('data-seatrownm') || (btn.textContent.match(/[A-Z]+/)?.[0] ?? '');
  const numText = btn.getAttribute('data-seatno') || (btn.textContent.match(/\d+/)?.[0] ?? '');
  return { locNo, row, num: parseInt(numText, 10) || 0 };
}

function init() {
  if (!pageGuard()) return;
  if (window[STATE_KEY]) { try { window[STATE_KEY].teardown(); } catch {} }

  let ctx;
  try {
    ctx = readContext();
  } catch (e) {
    const b = mountBanner(e instanceof ContextError ? e.message : '초기화 실패');
    b.set(e.message, 'warn');
    setTimeout(() => b.remove(), 6000);
    return;
  }

  const seatBtns = collectSeatButtons();
  if (seatBtns.length === 0) {
    const b = mountBanner('좌석 버튼을 찾지 못했습니다. 좌석 선택 페이지에서 실행하세요.');
    b.set('좌석 버튼을 찾지 못했습니다. 좌석 선택 페이지에서 실행하세요.', 'warn');
    setTimeout(() => b.remove(), 6000);
    return;
  }

  const banner = mountBanner('인원 수를 고르고 선호 순으로 좌석을 클릭하세요');
  const preferred = [];
  let monitor = null;
  let currentCount = 2;

  // 좌석 선택 인터셉트 리스너 attach/detach (idempotent)
  let seatPickerAttached = false;
  function attachSeatPicker() {
    if (seatPickerAttached) return;
    document.addEventListener('pointerdown', onDocPointerDown, true);
    seatPickerAttached = true;
  }
  function detachSeatPicker() {
    if (!seatPickerAttached) return;
    document.removeEventListener('pointerdown', onDocPointerDown, true);
    seatPickerAttached = false;
  }

  const ctrl = mountControlBar({
    initialCount: 2,
    onCountChange: (n) => {
      currentCount = n;
      updateBannerAndStart();
    },
    onStart: (n) => {
      if (preferred.length < n) return;
      // 감시 시작 시 좌석 선택 비활성화 — 사용자 클릭이 봇 동작과 충돌하지 않게
      detachSeatPicker();
      banner.set('감시 중… 좌석 열리는 즉시 선점합니다', 'ok');
      monitor = createMonitor({
        api,
        ctx,
        preferred: preferred.map(p => ({ row: p.row, num: p.num, priority: p.priority })),
        count: n,
        interval: 7000,
        onPoll: () => {
          const now = new Date().toTimeString().slice(0, 8);
          banner.set(`감시 중… 마지막 확인 ${now}`, 'ok');
        },
        onAvailable: async (combo) => {
          const label = combo.map(s => s.seatRowNm + s.seatNo).join(', ');
          banner.set(`🔔 빈좌석 감지 (${label}) — 자동 선택 진행`, 'alert');
          bell();
          blinkTitle();
          // 이미 detach 됐지만 안전하게 한번 더
          detachSeatPicker();
          try {
            await proceedToPayment(combo, { log: (m) => console.log('[cgv-bot]', m), count: n });
            banner.set(`✅ 선택완료/결제하기 진행됨 — 결제 페이지 확인`, 'ok');
          } catch (e) {
            banner.set(`자동 선택 실패: ${e.message} — 수동으로 진행하세요`, 'warn');
          } finally {
            // 좌석 선점 시도 끝나면 컨트롤바 not-running, 좌석 선택 다시 활성화
            ctrl.setRunning(false);
            attachSeatPicker();
          }
        },
        onError: (e, phase) => {
          console.warn('[cgv-bot]', phase, e);
          if (phase === 'poll') banner.set(`일시 오류: ${e.message} — 재시도 중`, 'warn');
        },
      });
      monitor.start();
    },
    onStop: () => {
      monitor?.stop();
      monitor = null;
      stopBlink();
      // 감시 중지 → 좌석 선택 다시 활성화
      attachSeatPicker();
      banner.set(`감시 중지됨 — 인원/좌석 조정 후 다시 "완료" 클릭`);
    },
  });

  function renumber() {
    preferred.forEach((p, i) => { p.priority = i + 1; setBadge(p.el, p.priority); });
    updateBannerAndStart();
  }

  function updateBannerAndStart() {
    ctrl.setEnabled(preferred.length >= currentCount);
    banner.set(`선택 ${preferred.length} / 필요 ${currentCount} — 선호 순으로 좌석 클릭`);
  }

  function togglePreferred(btn) {
    const { row, num } = seatMetaFromBtn(btn);
    if (!row || !num) return;
    const idx = preferred.findIndex(p => p.row === row && p.num === num);
    if (idx >= 0) {
      setBadge(preferred[idx].el, null);
      preferred.splice(idx, 1);
    } else {
      preferred.push({ row, num, priority: preferred.length + 1, el: btn });
    }
    renumber();
  }

  function onDocPointerDown(e) {
    const btn = e.target.closest && e.target.closest('button[data-seatlocno]');
    if (!btn) return;
    // intercept: block CGV's own handler (which would reject disabled/occupied)
    e.preventDefault();
    e.stopImmediatePropagation();
    togglePreferred(btn);
  }

  attachSeatPicker();
  renumber();

  const teardown = () => {
    monitor?.stop();
    stopBlink();
    detachSeatPicker();
    clearAllUi();
    delete window[STATE_KEY];
  };
  window[STATE_KEY] = { teardown };
}

init();
