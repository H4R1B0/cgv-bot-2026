function playBeep() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 800);
  } catch (e) { /* silent */ }
}

export function bell({ times = 3, interval = 700 } = {}) {
  for (let i = 0; i < times; i++) setTimeout(playBeep, i * interval);
}

let blinkTimer = null;
let origTitle = null;

export function blinkTitle(text = '🔔 결제하세요!') {
  stopBlink();
  origTitle = document.title;
  let toggle = false;
  blinkTimer = setInterval(() => {
    document.title = toggle ? origTitle : text;
    toggle = !toggle;
  }, 700);
  const stopOnFocus = () => { stopBlink(); window.removeEventListener('focus', stopOnFocus); };
  window.addEventListener('focus', stopOnFocus);
}

export function stopBlink() {
  if (blinkTimer) {
    clearInterval(blinkTimer);
    blinkTimer = null;
    if (origTitle != null) document.title = origTitle;
    origTitle = null;
  }
}
