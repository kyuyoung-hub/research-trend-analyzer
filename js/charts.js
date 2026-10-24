// js/charts.js — B 담당: 요약 칩 · 상위 키워드 막대 · 연도별 추이 (SVG, 외부 라이브러리 없음)
//
// A에게 받는 데이터 (기획안 "A가 B에게 넘길 결과 한 건")
//   results: [{ keyword, counts: { "2019": 1, ... }, bySource: { "과제": 5, "논문": 8 },
//               total, recent, previous, growth, trend }]
//   summary: { total, bySource: { "과제": n, "논문": n }, byYear: { "2019": n, ... }, skipped: [줄번호, ...] }
// 판정(trend)은 A가 rules.js 기준으로 붙여서 넘김 · 이 파일은 받은 값을 그리기만 함
(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SOURCE_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    if (text != null) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // 그래프 폭을 카드 폭에 맞춰 글자가 줄어들지 않게 함 · 화면에 없으면 560
  function widthOf(container) {
    return Math.max(300, Math.floor(container.clientWidth) || 560);
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString('ko-KR');
  }

  // 과제 · 논문처럼 자료 종류 이름을 결과 전체에서 모음 (요약에 있는 순서 우선)
  function sourcesOf(results, summary) {
    const names = Object.keys((summary && summary.bySource) || {});
    results.forEach(r => Object.keys(r.bySource || {}).forEach(s => {
      if (!names.includes(s)) names.push(s);
    }));
    return names;
  }

  // 자료의 첫 해부터 마지막 해까지 빠진 해 없이 이어 붙인 연도 목록
  function yearsOf(results, summary) {
    const set = new Set(Object.keys((summary && summary.byYear) || {}));
    results.forEach(r => Object.keys(r.counts || {}).forEach(y => set.add(y)));
    const nums = [...set].map(Number).filter(Number.isFinite);
    if (!nums.length) return [];
    const years = [];
    for (let y = Math.min(...nums); y <= Math.max(...nums); y++) years.push(String(y));
    return years;
  }

  function renderSummary(container, summary) {
    clear(container);
    const chips = [['총', summary.total]];
    Object.entries(summary.bySource || {}).forEach(([name, n]) => chips.push([name, n]));
    chips.push(['건너뛴 줄', (summary.skipped || []).length]);
    chips.forEach(([label, value]) => {
      const chip = el('div', 'chip');
      chip.append(el('span', 'chip-label', label), el('strong', 'chip-value', fmt(value)));
      container.append(chip);
    });
  }

  // 상위 키워드 막대 · 자료 종류별로 이어 붙인 막대 · 막대를 누르면 onSelect(keyword)
  function renderTopBar(container, results, opts) {
    opts = opts || {};
    clear(container);
    const n = opts.n || 10;
    const sources = sourcesOf(results, opts.summary);
    const top = results.slice()
      .sort((a, b) => b.total - a.total || a.keyword.localeCompare(b.keyword, 'ko'))
      .slice(0, n);
    if (!top.length) {
      container.append(el('p', 'empty', '표시할 키워드가 없습니다.'));
      return;
    }

    const labelW = 120, valueW = 44, rowH = 28, width = widthOf(container);
    const barMax = width - labelW - valueW;
    const max = Math.max(...top.map(r => r.total));
    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${top.length * rowH}`, width, height: top.length * rowH, role: 'img',
      'aria-label': `상위 ${top.length}개 키워드 빈도 막대그래프`
    });

    top.forEach((r, i) => {
      const y = i * rowH;
      const row = svgEl('g', { class: 'bar-row', 'data-keyword': r.keyword });
      row.style.cursor = opts.onSelect ? 'pointer' : 'default';
      row.append(svgEl('title', {}, `${r.keyword}: ${fmt(r.total)}건`));
      row.append(svgEl('text', { x: labelW - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'bar-label' }, r.keyword));

      let x = labelW;
      sources.forEach((s, si) => {
        const v = (r.bySource || {})[s] || 0;
        if (!v) return;
        const w = (v / max) * barMax;
        const rect = svgEl('rect', { x, y: y + 5, width: Math.max(w, 1), height: rowH - 10, rx: 2 });
        rect.style.fill = SOURCE_COLORS[si % SOURCE_COLORS.length];
        row.append(rect);
        x += w;
      });
      // 자료 종류가 없는 결과는 합계로 한 막대
      if (x === labelW) {
        const rect = svgEl('rect', { x, y: y + 5, width: (r.total / max) * barMax, height: rowH - 10, rx: 2 });
        rect.style.fill = SOURCE_COLORS[0];
        row.append(rect);
        x += (r.total / max) * barMax;
      }
      row.append(svgEl('text', { x: x + 6, y: y + rowH / 2 + 4, class: 'bar-value' }, fmt(r.total)));
      if (opts.onSelect) row.addEventListener('click', () => opts.onSelect(r.keyword));
      svg.append(row);
    });
    container.append(svg);

    if (sources.length) {
      const legend = el('div', 'legend');
      sources.forEach((s, si) => {
        const item = el('span', 'legend-item');
        const swatch = el('span', 'swatch');
        swatch.style.background = SOURCE_COLORS[si % SOURCE_COLORS.length];
        item.append(swatch, document.createTextNode(s));
        legend.append(item);
      });
      container.append(legend);
    }
  }

  // 연도별 추이 꺾은선 · series: [{ label, counts: { "2019": n, ... } }] · 빠진 해는 0
  function renderTrend(container, series, years) {
    clear(container);
    if (!years.length || !series.length) {
      container.append(el('p', 'empty', '표시할 연도가 없습니다.'));
      return;
    }
    const width = widthOf(container), height = 240, padL = 40, padR = 16, padT = 20, padB = 32;
    const plotW = width - padL - padR, plotH = height - padT - padB;
    const values = series.flatMap(s => years.map(y => (s.counts || {})[y] || 0));
    const max = Math.max(1, ...values);
    const step = niceStep(max);
    const top = Math.ceil(max / step) * step;
    const xOf = i => padL + (years.length === 1 ? plotW / 2 : (i / (years.length - 1)) * plotW);
    const yOf = v => padT + plotH - (v / top) * plotH;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`, width, height, role: 'img',
      'aria-label': `연도별 추이: ${series.map(s => s.label).join(', ')}`
    });
    for (let v = 0; v <= top; v += step) {
      svg.append(svgEl('line', { x1: padL, x2: width - padR, y1: yOf(v), y2: yOf(v), class: 'grid' }));
      svg.append(svgEl('text', { x: padL - 6, y: yOf(v) + 4, 'text-anchor': 'end', class: 'axis' }, fmt(v)));
    }
    years.forEach((y, i) => {
      svg.append(svgEl('text', { x: xOf(i), y: height - 10, 'text-anchor': 'middle', class: 'axis' }, y));
    });

    series.forEach((s, si) => {
      const color = SOURCE_COLORS[si % SOURCE_COLORS.length];
      const pts = years.map((y, i) => [xOf(i), yOf((s.counts || {})[y] || 0), (s.counts || {})[y] || 0]);
      const line = svgEl('polyline', { points: pts.map(p => `${p[0]},${p[1]}`).join(' '), fill: 'none', 'stroke-width': 2 });
      line.style.stroke = color;
      svg.append(line);
      pts.forEach(([x, y, v], i) => {
        const dot = svgEl('circle', { cx: x, cy: y, r: 3.5 });
        dot.style.fill = color;
        dot.append(svgEl('title', {}, `${s.label} ${years[i]}년: ${fmt(v)}건`));
        svg.append(dot);
        svg.append(svgEl('text', { x, y: y - 8, 'text-anchor': 'middle', class: 'point-value' }, fmt(v)));
      });
    });
    container.append(svg);

    const legend = el('div', 'legend');
    series.forEach((s, si) => {
      const item = el('span', 'legend-item');
      const swatch = el('span', 'swatch');
      swatch.style.background = SOURCE_COLORS[si % SOURCE_COLORS.length];
      item.append(swatch, document.createTextNode(s.label));
      legend.append(item);
    });
    container.append(legend);
  }

  // 눈금 간격: 1 · 2 · 5 · 10 … 중 눈금이 5개 안팎이 되는 값
  function niceStep(max) {
    const raw = max / 5;
    const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const m = raw / pow;
    return Math.max(1, (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow);
  }

  window.Charts = { renderSummary, renderTopBar, renderTrend, sourcesOf, yearsOf };
})();
