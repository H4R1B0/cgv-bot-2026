import { describe, it, expect } from 'vitest';
import { findBestCombo, parseX } from '../src/priority.js';

const seat = (row, num, locX, stts = '00') => ({
  seatRowNm: row, seatNo: String(num),
  seatLocNo: '001001' + String(locX).padStart(4, '0') + '0000',
  sbordNo: '001', seatAreaNo: '001', szoneNo: '01001',
  seatStusCd: stts,
});

describe('parseX', () => {
  it('extracts loc_x from seatLocNo[6:10]', () => {
    expect(parseX(seat('I', 7, 21).seatLocNo)).toBe(21);
  });
});

describe('findBestCombo', () => {
  it('returns single seat when count=1', () => {
    const pref = [{ row: 'I', num: 7, priority: 1 }];
    const avail = [seat('I', 7, 21)];
    const combo = findBestCombo(pref, avail, 1);
    expect(combo.length).toBe(1);
    expect(combo[0].seatNo).toBe('7');
  });

  it('finds consecutive pair when count=2', () => {
    const pref = [
      { row: 'I', num: 7, priority: 1 },
      { row: 'I', num: 8, priority: 2 },
    ];
    const avail = [seat('I', 7, 21), seat('I', 8, 22)];
    const combo = findBestCombo(pref, avail, 2);
    expect(combo.map(s => s.seatNo)).toEqual(['7', '8']);
  });

  it('skips pair broken by aisle (locX gap >= 4)', () => {
    const pref = [
      { row: 'I', num: 7, priority: 1 },
      { row: 'I', num: 8, priority: 2 },
      { row: 'I', num: 9, priority: 3 },
      { row: 'I', num: 10, priority: 4 },
    ];
    // 7,8 adjacent / aisle / 9,10 adjacent — count=2 → (7,8) or (9,10)
    const avail = [seat('I', 7, 21), seat('I', 8, 22), seat('I', 9, 26), seat('I', 10, 27)];
    const combo = findBestCombo(pref, avail, 2);
    expect(combo.map(s => s.seatNo)).toEqual(['7', '8']);
  });

  it('returns null when no consecutive pair exists in preferred', () => {
    const pref = [
      { row: 'I', num: 7, priority: 1 },
      { row: 'I', num: 9, priority: 2 },
    ];
    const avail = [seat('I', 7, 21), seat('I', 9, 23)];
    const combo = findBestCombo(pref, avail, 2);
    expect(combo).toBeNull();
  });

  it('prefers lower priority sum', () => {
    const pref = [
      { row: 'I', num: 7, priority: 3 },
      { row: 'I', num: 8, priority: 4 },
      { row: 'A', num: 1, priority: 1 },
      { row: 'A', num: 2, priority: 2 },
    ];
    const avail = [seat('I', 7, 21), seat('I', 8, 22), seat('A', 1, 21), seat('A', 2, 22)];
    const combo = findBestCombo(pref, avail, 2);
    expect(combo.map(s => s.seatRowNm)).toEqual(['A', 'A']);
  });

  it('ignores unavailable seats (seatStusCd != 00)', () => {
    const pref = [
      { row: 'I', num: 7, priority: 1 },
      { row: 'I', num: 8, priority: 2 },
    ];
    const avail = [seat('I', 7, 21, '11'), seat('I', 8, 22)];
    const combo = findBestCombo(pref, avail, 2);
    expect(combo).toBeNull();
  });
});
