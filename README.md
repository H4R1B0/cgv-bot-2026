# cgv-bot-2026

리뉴얼된 CGV.co.kr에서 동작하는 좌석 자동 예매 북마클릿.

- 설치: https://h4r1b0.github.io/cgv-bot-2026/
- 원조: https://github.com/ryubro/CGV-Bot (2015, jQuery 북마클릿)
- 분석 기반: 별도 프로젝트 `cgv-seat` (Python + Playwright CDP)

## 동작 방식

1. 로더 북마클릿이 GitHub Pages에 호스팅된 번들을 주입.
2. `sessionStorage`에서 예매 컨텍스트(siteNo, scnYmd, scnsNo, scnSseq, custNo, 인원수)를 읽음.
3. 사용자가 선호 좌석을 우선순위 순으로 클릭.
4. 완료 후 `/cnm/atkt/searchIfSeatData`를 7초 간격으로 폴링.
5. 선호 좌석 중 연석 N개 조합 발견 시 `/cnm/seatTemp/seatTempPrmp`로 자동 선점.
6. 성공 시 벨/배너/탭 제목 깜빡임으로 알림 — 사용자는 브라우저로 돌아와 수동 결제.

## 개발

```bash
npm install
npm test              # vitest
npm run build         # esbuild → dist/cgv-bot.js + dist/index.html
npm run deploy        # gh-pages로 배포
```

## 파일 구조

- `src/main.js` — 엔트리 (페이지 가드 + UI 조립 + 이벤트 바인딩)
- `src/context.js` — sessionStorage 파싱
- `src/api.js` — CGV API (`credentials: 'include'`)
- `src/priority.js` — 연석 탐색 + 통로 감지
- `src/monitor.js` — 폴링 루프 + 백오프
- `src/ui.js` — 배너/완료 버튼/좌석 뱃지
- `src/notify.js` — 벨/탭 제목 깜빡임
- `loader.js` — 북마클릿 로더 소스
- `build.js` — 빌드 스크립트

## 주의

- 폴링 간격 5초 미만은 차단 위험 → 최소 5초 하드코딩.
- CGV 로그인 세션은 별도로 해야 함.
- 개인 편의용. CGV.co.kr 측의 권리는 해당 권리자에게 있음.

## License

MIT. 원조 CGV-Bot (© 2015 ByoungYong Kim) 계승.
