# research-trend-analyzer
연구 데이터셋에서 키워드를 뽑아 연도별 동향과 시사점을 정리하는 웹 도구 (신흥기술영향평가세미나 2인 1조 실습)

설계는 [기획안.md](기획안.md)를 참고하세요.

## 현재 상태

| 부분 | 파일 | 상태 |
|---|---|---|
| 화면(B): 요약 · 상위 키워드 막대 · 연도별 추이 · 추세 목록 · 내보내기 | `js/charts.js` · `js/list.js` | 구현됨 |
| 화면 시험 페이지 (가짜 데이터) | `demo/b-demo.html` · `demo/fake-results.js` | 구현됨 |
| 가져오기 · 키워드 추출(A): CSV 읽기 · 불용어/동의어 · 추세 판정 | `js/import.js` · `js/keywords.js` · `js/rules.js` | 이 저장소에 아직 없음 |
| 실제 데이터를 넣는 화면 | `index.html` | 이 저장소에 아직 없음 |

그래서 지금 실행해 볼 수 있는 것은 **가짜 데이터로 그린 화면 시험 페이지**입니다. 이 페이지의 숫자는 지어낸 값이며 실제 연구 결과가 아닙니다.

## 실행 방법

서버 · 설치 · 빌드가 필요 없습니다.

### 방법 1: 파일을 바로 열기
1. 저장소를 내려받습니다.
   ```bash
   git clone https://github.com/<내 계정>/research-trend-analyzer.git
   cd research-trend-analyzer
   ```
2. `demo/b-demo.html`을 브라우저로 엽니다(더블클릭).

### 방법 2: 로컬 서버로 열기
Python이 있으면 아래처럼 실행하고 브라우저에서 <http://localhost:8000/demo/b-demo.html>을 엽니다.
```bash
python -m http.server 8000
```

### 방법 3: GitHub Pages
저장소 Settings → Pages에서 Source를 `Deploy from a branch`, 브랜치를 `main`, 폴더를 `/ (root)`로 저장하면 아래 주소에서 열립니다.
```
https://<내 계정>.github.io/research-trend-analyzer/demo/b-demo.html
```
설정 직후에는 배포가 끝날 때까지 1~2분 걸릴 수 있습니다(Actions 탭의 `pages build and deployment`가 끝나면 열립니다).

## 입력 CSV 형식 (기획안 기준)
| 열 | 설명 |
|---|---|
| `year` | 연도 (4자리 숫자) |
| `title` | 제목 |
| `keywords` | 키워드 (`;`로 구분) |
| `source` | 자료 종류 (과제 / 논문 등) |

예시 입력은 `data/sample.csv`, 이 입력으로 계산한 기대 결과는 `data/sample-expected.md`에 있습니다.

## 폴더 구성
```
data/    예시 입력(sample.csv) · 기대 결과(sample-expected.md)
demo/    화면 시험 페이지(b-demo.html) · 가짜 결과(fake-results.js)
js/      charts.js · list.js (화면)
기획안.md  설계 · 역할 분담 · 완료 기준
```
