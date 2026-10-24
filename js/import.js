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

  // 다른 사이트에서 내보낸 파일의 머리줄 이름도 공통 열로 읽음 (소문자로 비교)
  const ALIASES = {
    year: ['year', '연도', '발행연도', '발행년도', '출판연도', '출판년도', '발행일', '게재년도', '발행년', 'pubyear', 'publication year', 'py'],
    title: ['title', '제목', '논문명', '논문제목', '표제', '자료명', 'article title', 'ti'],
    keywords: ['keywords', '키워드', '주제어', '핵심어', '저자키워드', 'keyword', 'author keywords', 'kw'],
    source: ['source', '자료유형', '자료종류', '유형', '구분', 'type']
  };

  // 필수 열: year · title / 선택 열: keywords · source (source가 없으면 opts.defaultSource, 그것도 없으면 '논문')
  // 연도 칸이 "2022.03" · "2022-03-01"처럼 앞 4자리가 연도면 그 연도로 읽음
  function readRecords(text, opts) {
    opts = opts || {};
    const defaultSource = opts.defaultSource || '논문';
    const parsed = parseCSV(text);
    const col = name => parsed.header.findIndex(h => ALIASES[name].includes(h));
    const iYear = col('year'), iTitle = col('title'), iKeywords = col('keywords'), iSource = col('source');
    if (iYear < 0 || iTitle < 0) {
      return { records: [], skipped: [], error: '머리줄에 year · title 열이 있어야 합니다. (공통 열: year, title, keywords, source · 발행연도 · 제목 · 주제어 같은 이름도 읽습니다)' };
    }
    const records = [], skipped = [];
    parsed.rows.forEach(r => {
      const get = i => (i >= 0 && r.cells[i] != null ? r.cells[i].trim() : '');
      const m = get(iYear).match(/^(\d{4})(?:\D.*)?$/);
      const title = get(iTitle), keywords = get(iKeywords);
      // 빈 줄 · 연도가 없거나 앞 4자리가 숫자가 아닌 줄 · 제목과 키워드가 모두 빈 줄은 건너뛰고 줄 번호를 알림
      if (r.blank || !m || (!title && !keywords)) { skipped.push(r.line); return; }
      records.push({ line: r.line, year: Number(m[1]), title, keywords, source: get(iSource) || defaultSource });
    });
    return { records, skipped, error: null };
  }

  // RIS 형식(참고문헌 관리 프로그램 · 여러 학술 사이트가 내보내는 형식): TY로 시작해 ER로 끝나는 묶음
  //   제목 TI · T1 / 연도 PY · Y1 · DA / 키워드 KW(여러 줄)
  function readRIS(text, opts) {
    opts = opts || {};
    const defaultSource = opts.defaultSource || '논문';
    const lines = String(text == null ? '' : text).replace(/^﻿/, '').split(/\r\n|\r|\n/);
    const records = [], skipped = [];
    let cur = null, start = 0;
    const finish = lineNo => {
      if (!cur) return;
      const m = (cur.year || '').match(/(\d{4})/);
      if (!m || (!cur.title && !cur.kw.length)) skipped.push(start);
      else records.push({ line: start, year: Number(m[1]), title: cur.title || '', keywords: cur.kw.join(';'), source: defaultSource });
      cur = null;
    };
    lines.forEach((raw, i) => {
      const t = raw.match(/^([A-Z][A-Z0-9])\s{1,2}-\s?(.*)$/);
      if (!t) return;
      const tag = t[1], val = t[2].trim();
      if (tag === 'TY') { finish(); cur = { title: '', year: '', kw: [] }; start = i + 1; return; }
      if (!cur) return;
      if (tag === 'ER') { finish(); return; }
      if ((tag === 'TI' || tag === 'T1') && !cur.title) cur.title = val;
      else if ((tag === 'PY' || tag === 'Y1' || tag === 'DA') && !cur.year) cur.year = val;
      else if (tag === 'KW' && val) cur.kw.push(val);
    });
    finish();
    const error = records.length || skipped.length ? null : 'RIS 형식의 자료(TY ... ER)를 찾지 못했습니다.';
    return { records, skipped, error };
  }

  // CSV(쉼표 · 탭)와 RIS를 알아서 구분해 읽음
  function readAny(text, opts) {
    const s = String(text == null ? '' : text);
    if (/^\s*TY\s{1,2}-/m.test(s)) return readRIS(s, opts);
    const first = s.replace(/^﻿/, '').split(/\r\n|\r|\n/)[0] || '';
    if (first.includes('\t') && first.split('\t').length > first.split(',').length) {
      // 탭으로 나눈 표(엑셀 복사)는 쉼표 표로 바꿔 읽음
      return readRecords(toCommaTable(text), opts);
    }
    return readRecords(s, opts);
  }

  function toCommaTable(text) {
    return String(text).replace(/^﻿/, '').split(/\r\n|\r|\n/)
      .map(l => l.split('\t').map(c => /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c).join(','))
      .join('\r\n');
  }

  return { parseCSV, readRecords, readRIS, readAny };
});
