const ID_BANNER = 'cgvbot-banner';
const ID_START = 'cgvbot-start';
const BADGE_CLASS = 'cgvbot-badge';
const STYLE_ID = 'cgvbot-style';

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ID_BANNER} {
      position: fixed; top: 0; left: 0; right: 0;
      padding: 12px 16px; z-index: 2147483000;
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
    .${BADGE_CLASS} {
      position: absolute; top: 2px; right: 2px;
      width: 20px; height: 20px; border-radius: 50%;
      background: #55f; color: #fff;
      font: bold 12px/20px sans-serif; text-align: center;
      pointer-events: none; z-index: 10;
    }
  `;
  document.head.appendChild(style);
}

export function mountBanner(initialText) {
  injectStyle();
  let el = document.getElementById(ID_BANNER);
  if (!el) {
    el = document.createElement('div');
    el.id = ID_BANNER;
    document.body.appendChild(el);
  }
  el.textContent = initialText;
  el.className = '';
  return {
    set(text, level = 'info') {
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

export function setBadge(seatEl, priority) {
  let badge = seatEl.querySelector(`.${BADGE_CLASS}`);
  if (priority == null) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = BADGE_CLASS;
    const cs = getComputedStyle(seatEl);
    if (cs.position === 'static') seatEl.style.position = 'relative';
    seatEl.appendChild(badge);
  }
  badge.textContent = String(priority);
}

export function clearAllUi() {
  document.getElementById(ID_BANNER)?.remove();
  document.getElementById(ID_START)?.remove();
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach(b => b.remove());
}
