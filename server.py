"""내 PC에서 돌리는 도우미 서버 — 화면(index.html)도 열어 주고, RISS · 언론기사를 실시간으로 검색해 CSV로 돌려줍니다.

왜 필요한가: 브라우저 화면은 RISS · 구글 뉴스에 직접 접속할 수 없습니다(사이트가 막음).
그래서 내 PC의 이 프로그램이 대신 접속하고, 화면은 이 프로그램에 물어봅니다. 서버에 올라가지 않고 내 PC에서만 돕니다.

실행:  python server.py        (기본 주소 http://127.0.0.1:8777/index.html)
       python server.py 9000   (포트 바꾸기)

예의 규칙(사이트 robots.txt · 이용 조건을 존중하기 위해 일부러 느리게 받습니다)
  - RISS: robots.txt가 /search를 허용하고 크롤링 간격을 10초로 정함 → 쪽마다 12초 쉼 (한 쪽 100건, 한 번에 최대 5쪽)
  - 구글 뉴스 RSS: 연도마다 4초 쉼 (기사 본문은 받지 않음)
  - DBpia는 robots.txt가 일반 프로그램의 자동 수집을 막고 화면도 자바스크립트로 그려서 지원하지 않습니다.
"""
import csv, email.utils, html as H, io, json, os, re, sys, threading, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
UA = 'research-trend-analyzer-student-project (small polite fetch; local helper)'
COLUMNS = ['id', 'year', 'title', 'keywords', 'source', 'type', 'publisher', 'country', 'field', 'note', 'url', 'open']
ALLOWED_ORIGINS = {'https://kyuyoung-hub.github.io', 'http://127.0.0.1:%d' % PORT, 'http://localhost:%d' % PORT}
LOCK = threading.Lock()   # 사이트에 동시에 여러 요청을 보내지 않도록 한 번에 한 검색만


def to_csv(rows):
    out = io.StringIO()
    w = csv.writer(out, lineterminator='\r\n')
    w.writerow(COLUMNS)
    w.writerows(rows)
    return out.getvalue()


def fetch(url, timeout=60):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def riss(query, pages):
    rows, seen = [], set()
    for p in range(pages):
        q = urllib.parse.urlencode({'isDetailSearch': 'N', 'searchGubun': 'true', 'viewYn': 'OP', 'query': query,
                                    'colName': 're_a_kor', 'pageScale': '100', 'iStartCount': str(p * 100)})
        page = fetch('https://www.riss.kr/search/Search.do?' + q).decode('utf-8', 'replace')
        items = page.split('class="cont ml60"')[1:]
        if not items:
            break
        for it in items:
            m = re.search(r'<p class="title"><a href="([^"]*control_no=([0-9a-f]+)[^"]*)">(.*?)</a></p>', it, re.S)
            if not m:
                continue
            cid = m.group(2)
            title = H.unescape(re.sub(r'<[^>]+>', '', m.group(3))).strip()
            etc = it.split('class="etc"')[1][:1500] if 'class="etc"' in it else ''
            y = re.search(r'<span>\s*((?:19|20)\d{2})\s*</span>', etc)
            if cid in seen or not title or not y:
                continue
            seen.add(cid)
            pm = re.search(r'class="assigned"><a[^>]*>(.*?)</a>', etc, re.S)
            publisher = H.unescape(re.sub(r'<[^>]+>', '', pm.group(1))).strip() if pm else ''
            link = 'https://www.riss.kr' + H.unescape(m.group(1)).split('&keyword=')[0]
            rows.append(['RS' + cid[:10], y.group(1), title, '', 'RISS', '국내학술논문', publisher, '한국', '', '', link, ''])
        if p < pages - 1:
            time.sleep(12)
    return rows


def news(query, year_from, year_to):
    rows, seen = [], set()
    for y in range(year_from, year_to + 1):
        term = f'{query} after:{y}-01-01 before:{y + 1}-01-01'
        url = 'https://news.google.com/rss/search?' + urllib.parse.urlencode({'q': term, 'hl': 'ko', 'gl': 'KR', 'ceid': 'KR:ko'})
        root = ET.fromstring(fetch(url, 40))
        for it in root.iter('item'):
            raw = (it.findtext('title') or '').strip()
            pub = (it.findtext('source') or '').strip()
            title = raw[:-(len(pub) + 3)] if pub and raw.endswith(' - ' + pub) else raw
            pd = it.findtext('pubDate')
            if not title or not pd or title in seen:
                continue
            d = email.utils.parsedate_to_datetime(pd)
            seen.add(title)
            rows.append([f'NW{len(rows) + 1:04d}', d.year, title, '', '언론기사', '언론기사', pub, '한국', '', '', (it.findtext('link') or '').strip(), ''])
        if y < year_to:
            time.sleep(4)
    return rows


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        sys.stderr.write('[도우미] ' + (fmt % args) + '\n')

    def cors(self):
        origin = self.headers.get('Origin', '')
        if origin in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Access-Control-Allow-Private-Network', 'true')
            self.send_header('Vary', 'Origin')

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()

    def reply(self, code, body, ctype):
        data = body.encode('utf-8')
        self.send_response(code)
        self.cors()
        self.send_header('Content-Type', ctype + '; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if not u.path.startswith('/api/'):
            return super().do_GET()
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        try:
            if u.path == '/api/ping':
                return self.reply(200, json.dumps({'ok': True, 'sources': ['riss', 'news']}), 'application/json')
            query = (q.get('q') or '').strip()
            if not query:
                return self.reply(400, '검색어가 없습니다.', 'text/plain')
            if not LOCK.acquire(blocking=False):
                return self.reply(429, '다른 검색이 진행 중입니다. 끝난 뒤 다시 누르세요.', 'text/plain')
            try:
                if u.path == '/api/riss':
                    pages = max(1, min(5, int(q.get('pages', 1))))
                    return self.reply(200, to_csv(riss(query, pages)), 'text/csv')
                if u.path == '/api/news':
                    y1 = int(q.get('from', 2016)); y2 = int(q.get('to', 2025))
                    y1, y2 = max(2000, y1), min(2100, max(y1, y2))
                    if y2 - y1 > 11:
                        y1 = y2 - 11   # 한 번에 최대 12년
                    return self.reply(200, to_csv(news(query, y1, y2)), 'text/csv')
            finally:
                LOCK.release()
            return self.reply(404, '지원하지 않는 출처입니다.', 'text/plain')
        except Exception as e:
            return self.reply(502, f'가져오지 못했습니다: {e}', 'text/plain')


if __name__ == '__main__':
    print(f'도우미 서버: http://127.0.0.1:{PORT}/index.html  (끄려면 Ctrl+C)')
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
