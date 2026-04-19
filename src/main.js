import { readContext, ContextError } from './context.js';
import * as api from './api.js';
import { mountBanner, mountStartButton, setBadge, clearAllUi } from './ui.js';
import { bell, blinkTitle, stopBlink } from './notify.js';
import { createMonitor } from './monitor.js';

const STATE_KEY = '__cgvBot2026__';

function pageGuard() {
  const okHost = /(^|\.)cgv\.co\.kr$/.test(location.hostname);
  if (!okHost) {
    alert('CGV.co.kr에서 실행하세요.');
    return false;
  }
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

  if (window[STATE_KEY]) {
    try { window[STATE_KEY].teardown(); } catch {}
  }

  let ctx;
  try {
    ctx = readContext();
  } catch (e) {
    const b = mountBanner(e instanceof ContextError ? e.message : '초기화 실패');
    b.set(e.message, 'warn');
    setTimeout(() => b.remove(), 6000);
    return;
  }

  const banner = mountBanner(`선호 순으로 좌석을 클릭하세요 (필요 ${ctx.count}석)`);
  const preferred = []; // {row, num, priority, el}
  let monitor = null;

  const startBtn = mountStartButton(() => {
    if (preferred.length < ctx.count) return;
    banner.set('감시 중… 좌석 열리는 즉시 선점합니다', 'ok');
    monitor = createMonitor({
      api,
      ctx,
      preferred: preferred.map(p => ({ row: p.row, num: p.num, priority: p.priority })),
      count: ctx.count,
      interval: 7000,
      onPoll: () => {
        const now = new Date().toTimeString().slice(0, 8);
        banner.set(`감시 중… 마지막 확인 ${now}`, 'ok');
      },
      onHoldSuccess: (combo) => {
        banner.set(`🔔 선점 완료! 결제하세요 (${combo.map(s => s.seatRowNm + s.seatNo).join(', ')})`, 'alert');
        bell();
        blinkTitle();
      },
      onError: (e, phase) => {
        console.warn('[cgv-bot]', phase, e);
        if (phase === 'poll') banner.set(`일시 오류: ${e.message} — 재시도 중`, 'warn');
      },
    });
    monitor.start();
  });

  function renumber() {
    preferred.forEach((p, i) => { p.priority = i + 1; setBadge(p.el, p.priority); });
    startBtn.setEnabled(preferred.length >= ctx.count);
    banner.set(`선택 ${preferred.length}/${ctx.count} — 추가 선택하거나 완료를 누르세요`);
  }

  function onSeatClick(e) {
    const btn = e.currentTarget;
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

  const seatBtns = collectSeatButtons();
  if (seatBtns.length === 0) {
    banner.set('좌석 버튼을 찾지 못했습니다. 좌석 선택 페이지에서 실행하세요.', 'warn');
    return;
  }
  for (const b of seatBtns) b.addEventListener('click', onSeatClick, true);

  renumber();

  const teardown = () => {
    monitor?.stop();
    stopBlink();
    for (const b of seatBtns) b.removeEventListener('click', onSeatClick, true);
    clearAllUi();
    delete window[STATE_KEY];
  };

  window[STATE_KEY] = { teardown };
}

init();
