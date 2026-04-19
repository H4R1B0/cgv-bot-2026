import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DIST = resolve('dist');
mkdirSync(DIST, { recursive: true });

// 1. 메인 번들
await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari15'],
  outfile: 'dist/cgv-bot.js',
  legalComments: 'none',
});
console.log('✓ dist/cgv-bot.js');

// 2. 로더 북마클릿 URL 생성
const loaderSource = readFileSync('loader.js', 'utf8');
const loaderMin = await build({
  stdin: { contents: loaderSource, loader: 'js' },
  bundle: false,
  minify: true,
  format: 'iife',
  write: false,
  legalComments: 'none',
});
const loaderCode = loaderMin.outputFiles[0].text.trim().replace(/\n/g, '');
const bookmarklet = 'javascript:' + encodeURI(loaderCode);

// 3. index.html 생성
const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>CGV 자동 예매 (2026)</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body { font: 15px/1.6 -apple-system, BlinkMacSystemFont, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #222; }
h1 { font-size: 22px; margin: 0 0 16px; }
.drag { display: inline-block; padding: 12px 28px; background: #55f; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; }
.drag:hover { background: #44e; }
ol li { margin: 6px 0; }
code { background: #f2f2f2; padding: 2px 5px; border-radius: 3px; }
.warn { background: #fff6e5; border-left: 3px solid #e90; padding: 10px 14px; margin: 16px 0; }
footer { margin-top: 32px; color: #888; font-size: 13px; }
</style>
</head>
<body>
<h1>CGV 자동 예매 북마클릿 (2026 리뉴얼 대응)</h1>
<p>아래 버튼을 <b>북마크바로 드래그</b>해 설치하세요.</p>
<p><a class="drag" href="${bookmarklet}">🎬 CGV 자동 예매</a></p>
<h2>사용법</h2>
<ol>
  <li>CGV.co.kr 로그인 → 영화관/영화/회차/인원 선택 → 좌석 페이지 진입</li>
  <li>북마크바의 "🎬 CGV 자동 예매" 클릭</li>
  <li>선호 좌석을 선호 순서대로 클릭 (숫자 뱃지로 우선순위 표시)</li>
  <li>하단 "완료" 버튼 클릭 → 감시 시작</li>
  <li>좌석이 열리면 자동으로 선점 → 벨 + 배너 + 탭 제목으로 알림</li>
  <li>브라우저로 돌아와 수동으로 결제 진행</li>
</ol>
<div class="warn">
  ⚠ 폴링 간격 5초 미만은 NetFunnel/WAF 차단 위험이 있어 기본 7초로 설정됩니다.<br>
  ⚠ 개인 편의용이며 CGV.co.kr 측의 권리에 영향을 주지 않습니다.
</div>
<footer>
  MIT License · Based on <a href="https://github.com/ryubro/CGV-Bot">ryubro/CGV-Bot</a> (2015) ·
  Source: <a href="https://github.com/H4R1B0/cgv-bot-2026">H4R1B0/cgv-bot-2026</a>
</footer>
</body>
</html>`;

writeFileSync(resolve(DIST, 'index.html'), html);
console.log('✓ dist/index.html');
console.log('✓ bookmarklet URL length:', bookmarklet.length);
