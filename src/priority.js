const AISLE_GAP = 4;

export function parseX(seatLocNo) {
  if (!seatLocNo || seatLocNo.length < 10) return 0;
  return parseInt(seatLocNo.slice(6, 10), 10) || 0;
}

function isPhysicallyConsecutive(seats) {
  if (seats.length <= 1) return true;
  const sorted = [...seats].sort((a, b) => parseX(a.seatLocNo) - parseX(b.seatLocNo));
  for (let i = 1; i < sorted.length; i++) {
    if (parseX(sorted[i].seatLocNo) - parseX(sorted[i - 1].seatLocNo) >= AISLE_GAP) {
      return false;
    }
  }
  return true;
}

export function findBestCombo(preferred, available, count) {
  if (count <= 0) return null;
  const availMap = new Map();
  for (const s of available) {
    if (s.seatStusCd === '00') availMap.set(`${s.seatRowNm}${parseInt(s.seatNo, 10)}`, s);
  }

  const prefAvail = [];
  for (const p of preferred) {
    const key = `${p.row}${p.num}`;
    const seat = availMap.get(key);
    if (seat) prefAvail.push({ seat, priority: p.priority, row: p.row, num: p.num });
  }
  if (prefAvail.length < count) return null;

  const byRow = new Map();
  for (const x of prefAvail) {
    if (!byRow.has(x.row)) byRow.set(x.row, []);
    byRow.get(x.row).push(x);
  }
  for (const arr of byRow.values()) arr.sort((a, b) => a.num - b.num);

  let best = null;
  let bestScore = Infinity;

  for (const arr of byRow.values()) {
    for (let i = 0; i + count <= arr.length; i++) {
      const window = arr.slice(i, i + count);
      let consecutive = true;
      for (let j = 1; j < window.length; j++) {
        if (window[j].num - window[j - 1].num !== 1) { consecutive = false; break; }
      }
      if (!consecutive) continue;
      const seats = window.map(w => w.seat);
      if (!isPhysicallyConsecutive(seats)) continue;
      const score = window.reduce((sum, w) => sum + w.priority, 0);
      if (score < bestScore) { bestScore = score; best = seats; }
    }
  }
  return best;
}
