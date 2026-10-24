// js/keywords.js — A 담당: 키워드 정제(불용어 · 동의어) · 연도별 빈도 · 추세 판정
//   analyze(records, rules?) → { results, summary }  (B가 받는 모양 · js/charts.js 맨 위 설명)
//   키워드 출처: keywords 열(;로 구분)이 있으면 그것 · 제목에서도 동의어 사전의 표현을 찾음
//                keywords 열이 비어 있으면 제목의 낱말(불용어 제외)도 키워드로 씀
//   한 자료에서 같은 키워드는 한 번만 셈
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rules.js'));
  else root.Keywords = factory(root.RULES);
})(typeof self !== 'undefined' ? self : this, function (DEFAULT_RULES) {
  // 소문자 · 하이픈/기호는 공백으로 · 연속 공백 하나로
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[^0-9a-z가-힣+#]+/g, ' ').trim();
  }

  function buildMatcher(rules) {
    const stop = new Set(rules.stopwords.map(norm));
    const variantToCanon = new Map();
    Object.entries(rules.synonyms).forEach(([canon, variants]) => {
      variantToCanon.set(norm(canon), canon);
      variants.forEach(v => variantToCanon.set(norm(v), canon));
    });
    // 제목에서 찾을 표현: 긴 표현부터 (예: 'patient satisfaction'이 'satisfaction'보다 먼저)
    const phrases = [...variantToCanon.keys()].sort((a, b) => b.length - a.length);
    return { stop, variantToCanon, phrases };
  }

  function containsWord(haystack, needle) {
    if (/[가-힣]/.test(needle)) return haystack.includes(needle);
    return (' ' + haystack + ' ').includes(' ' + needle + ' ');
  }

  function keywordsOf(rec, m) {
    const found = new Set();
    const add = raw => {
      const n = norm(raw);
      if (!n || m.stop.has(n)) return;
      found.add(m.variantToCanon.get(n) || n);
    };
    const authorKws = rec.keywords ? rec.keywords.split(/[;；]/).map(s => s.trim()).filter(Boolean) : [];
    authorKws.forEach(add);

    if (authorKws.length) return found; // keywords 열이 있으면 그것만 씀

    // keywords 열이 비어 있으면 제목에서: ① 동의어 사전의 표현 ② 남은 낱말 (영문 3자 이상 · 한글 2자 이상)
    let rest = ' ' + norm(rec.title) + ' ';
    m.phrases.forEach(p => {
      if (containsWord(rest.trim(), p)) {
        found.add(m.variantToCanon.get(p));
        if (!/[가-힣]/.test(p)) rest = rest.split(' ' + p + ' ').join('  ');
      }
    });
    rest.split(' ').filter(Boolean).forEach(w => {
      const minLen = /[가-힣]/.test(w) ? 2 : 3;
      if (w.length >= minLen && !/^\d+$/.test(w)) add(w);
    });
    return found;
  }

  function judge(counts, lastYear, t) {
    let recent = 0, previous = 0;
    for (let i = 0; i < t.window; i++) {
      recent += counts[lastYear - i] || 0;
      previous += counts[lastYear - t.window - i] || 0;
    }
    let trend, growth = null;
    if (recent + previous < t.minTotal) trend = '판정 보류';
    else if (previous === 0) trend = '신규';
    else {
      growth = (recent - previous) / previous;
      trend = growth >= t.up ? '상승' : growth <= t.down ? '하락' : '유지';
    }
    return { recent, previous, growth, trend };
  }

  function analyze(records, rules) {
    rules = rules || DEFAULT_RULES;
    const m = buildMatcher(rules);
    const summary = { total: records.length, bySource: {}, byYear: {}, skipped: [] };
    const table = new Map();
    records.forEach(rec => {
      summary.bySource[rec.source] = (summary.bySource[rec.source] || 0) + 1;
      summary.byYear[rec.year] = (summary.byYear[rec.year] || 0) + 1;
      keywordsOf(rec, m).forEach(kw => {
        if (!table.has(kw)) table.set(kw, { keyword: kw, counts: {}, bySource: {}, total: 0 });
        const r = table.get(kw);
        r.counts[rec.year] = (r.counts[rec.year] || 0) + 1;
        r.bySource[rec.source] = (r.bySource[rec.source] || 0) + 1;
        r.total++;
      });
    });
    const years = Object.keys(summary.byYear).map(Number);
    const lastYear = years.length ? Math.max(...years) : null;
    let results = [...table.values()].map(r => Object.assign(r, lastYear == null ? {} : judge(r.counts, lastYear, rules.trend)));
    results.sort((a, b) => b.total - a.total || a.keyword.localeCompare(b.keyword, 'ko'));
    const keep = rules.trend.keepTop;
    if (keep > 0 && results.length > keep) {
      summary.keywordsTotal = results.length;
      results = results.slice(0, keep);
    }
    summary.lastYear = lastYear;
    return { results, summary };
  }

  return { analyze, norm };
});
