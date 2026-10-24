// js/import.js — A 담당: CSV 읽기 · 점검 (빈 줄 · 연도 없는 줄은 건너뛰고 줄 번호를 알림)
//   parseCSV(text)        → { header: [...], rows: [{ line, cells: [...] }] }   (BOM · 따옴표 · CRLF 처리)
//   readRecords(text)     → { records: [{ line, year, title, keywords, source }], skipped: [줄번호], error }
//   줄 번호는 파일의 줄 기준 (머리줄 = 1줄 · 따옴표 안 줄바꿈은 시작 줄 기준)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Importer = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function parseCSV(text) {
    text = String(text == null ? '' : text).replace(/^﻿/, '');
    const rows = [];
    let cells = [], cell = '', quoted = false, line = 1, startLine = 1, started = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
        } else {
          if (ch === '\n') line++;
          cell += ch;
        }
        continue;
      }
      if (ch === '"') { quoted = true; started = true; continue; }
      if (ch === ',') { cells.push(cell); cell = ''; started = true; continue; }
      if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        cells.push(cell);
        rows.push({ line: startLine, cells, blank: !started && cells.length === 1 && cells[0] === '' });
        cells = []; cell = ''; started = false; line++; startLine = line;
        continue;
      }
      cell += ch; started = true;
    }
    if (started || cell !== '' || cells.length) {
      cells.push(cell);
      rows.push({ line: startLine, cells, blank: false });
    }
    const header = rows.length ? rows[0].cells.map(h => h.trim().toLowerCase()) : [];
    return { header, rows: rows.slice(1) };
  }

  // 필수 열: year · title / 선택 열: keywords · source (source가 없으면 '논문')
  function readRecords(text, opts) {
    opts = opts || {};
    const defaultSource = opts.defaultSource || '논문';
    const parsed = parseCSV(text);
    const col = name => parsed.header.indexOf(name);
    const iYear = col('year'), iTitle = col('title'), iKeywords = col('keywords'), iSource = col('source');
    if (iYear < 0 || iTitle < 0) {
      return { records: [], skipped: [], error: '머리줄에 year · title 열이 있어야 합니다. (공통 열: year, title, keywords, source)' };
    }
    const records = [], skipped = [];
    parsed.rows.forEach(r => {
      const get = i => (i >= 0 && r.cells[i] != null ? r.cells[i].trim() : '');
      const year = get(iYear), title = get(iTitle), keywords = get(iKeywords);
      // 빈 줄 · 연도가 없거나 4자리 숫자가 아닌 줄 · 제목과 키워드가 모두 빈 줄은 건너뛰고 줄 번호를 알림
      if (r.blank || !/^\d{4}$/.test(year) || (!title && !keywords)) { skipped.push(r.line); return; }
      records.push({ line: r.line, year: Number(year), title, keywords, source: get(iSource) || defaultSource });
    });
    return { records, skipped, error: null };
  }

  return { parseCSV, readRecords };
});
