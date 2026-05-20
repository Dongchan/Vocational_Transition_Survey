/**
 * export.js
 *
 * 타임라인 SVG 다이어그램을 외부 파일로 내보내는 모듈.
 *
 * 책임 범위:
 *   1) 현재 DOM의 <svg id="timeline-svg"> 를 자족적 단독 SVG 문자열로 직렬화
 *      (CSS 변수·엣지 룰·폰트를 <style> 로 인라인. 외부 stylesheet 의존성 0)
 *   2) SVG → PNG 변환 (캔버스 렌더, 최소 300dpi 보장 + pHYs 청크로 DPI 메타 기록)
 *   3) 헤더의 두 버튼 (#export-svg, #export-png) 에 핸들러 바인딩
 *
 * 외부 의존성 0. ES Module.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

// 자족적 SVG 내보내기에 필요한 핵심 스타일.
// style.css 의 :root 변수·#timeline-svg 클래스 룰 중
// SVG 내부 도형에 영향을 주는 항목만 발췌.
const EXPORT_STYLE_CSS = `
  svg {
    --cat-secondary-voc: #E69F00;
    --cat-vocational-training: #0072B2;
    --cat-higher-lifelong: #009E73;
    --cat-career: #CC79A7;
    --cat-qualification: #56B4E9;
    --edge-succession: #000000;
    --edge-basis: #5E3C99;
    --edge-reference: #888888;
    --edge-branch: #D55E00;
    font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", system-ui, -apple-system, sans-serif;
  }
  .edge-hit { display: none; }
  .edge-line { fill: none; stroke-width: 1.8; }
  .edge.edge-succession .edge-line { stroke: var(--edge-succession); stroke-dasharray: 0; stroke-width: 1.8; }
  .edge.edge-basis .edge-line { stroke: var(--edge-basis); stroke-dasharray: 12 4; stroke-width: 1.8; }
  .edge.edge-reference .edge-line { stroke: var(--edge-reference); stroke-dasharray: 2 4; stroke-width: 1.5; }
  .edge.edge-branch .edge-line { stroke: var(--edge-branch); stroke-dasharray: 8 4; stroke-width: 2.4; }
  .edge-endpoint { stroke: #FFFFFF; stroke-width: 1; }
  .edge-endpoint-succession { fill: var(--edge-succession); }
  .edge-endpoint-basis { fill: var(--edge-basis); }
  .edge-endpoint-reference { fill: var(--edge-reference); }
  .edge-endpoint-branch { fill: var(--edge-branch); }
  .edge.edge-succession .edge-endpoint-end,
  .edge.edge-basis .edge-endpoint-end,
  .edge.edge-branch .edge-endpoint-end { display: none; }
  .law-label { dominant-baseline: middle; }
  .law-label tspan { font-size: 15px; }
`;

/**
 * 현재 SVG 의 자족 클론을 만든다.
 * - xmlns 속성 보강
 * - 흰색 배경 사각형 prepend (PNG 인쇄 가독성)
 * - <style> 블록 prepend (CSS 변수·엣지 룰)
 * - hit-area path 는 display:none 으로 시각 출력에서 제외
 */
function buildExportSvg(srcSvg) {
  const clone = srcSvg.cloneNode(true);
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const width = parseFloat(clone.getAttribute("width")) || srcSvg.clientWidth;
  const height = parseFloat(clone.getAttribute("height")) || srcSvg.clientHeight;

  // 첫 자식들을 일단 보존 → style·bg 를 맨 앞에 끼워 넣음
  const firstChild = clone.firstChild;

  const styleEl = document.createElementNS(SVG_NS, "style");
  styleEl.textContent = EXPORT_STYLE_CSS;
  clone.insertBefore(styleEl, firstChild);

  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(width));
  bg.setAttribute("height", String(height));
  bg.setAttribute("fill", "#FFFFFF");
  clone.insertBefore(bg, firstChild);

  return { clone, width, height };
}

function serializeSvg(svgNode) {
  return new XMLSerializer().serializeToString(svgNode);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 다운로드 트리거 후 즉시 해제하면 일부 브라우저에서 빈 파일 → 약간 지연
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pad2(n) { return String(n).padStart(2, "0"); }
function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function filenameStem() {
  const mode = document.body.dataset.mode === "deploy" ? "_deploy" : "";
  return `vocational_law_timeline${mode}_${dateStamp()}`;
}

/* ============================================================
 * PNG pHYs 청크 삽입 (정확한 DPI 메타데이터 기록)
 * ============================================================ */

// CRC-32 테이블 (IEEE 802.3 polynomial)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * PNG 바이트열의 IHDR 뒤에 pHYs 청크를 삽입해 DPI 메타데이터를 기록한다.
 * pHYs 청크 구조:
 *   length=9 (uint32 be) | type="pHYs" (4B) | x_ppu uint32 | y_ppu uint32 | unit uint8 | crc uint32
 *   unit=1 → meters. x_ppu = round(dpi / 0.0254)
 */
function stampPngDpi(arrayBuffer, dpi) {
  const src = new Uint8Array(arrayBuffer);

  // 시그니처 8바이트 + IHDR 청크(4 len + 4 type + 13 payload + 4 crc = 25) = 총 33바이트
  // IHDR 은 항상 첫 청크이므로 위치 고정.
  const IHDR_END = 33;
  if (src.length < IHDR_END || src[0] !== 0x89 || src[1] !== 0x50) {
    console.warn("[export] PNG 시그니처 불일치, DPI 메타 스킵");
    return src;
  }

  const ppu = Math.round(dpi / 0.0254);
  const payload = new Uint8Array(9);
  const pdv = new DataView(payload.buffer);
  pdv.setUint32(0, ppu, false); // big-endian
  pdv.setUint32(4, ppu, false);
  pdv.setUint8(8, 1);

  const type = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // "pHYs"

  // CRC 입력 = type + payload
  const crcInput = new Uint8Array(type.length + payload.length);
  crcInput.set(type, 0);
  crcInput.set(payload, type.length);
  const crc = crc32(crcInput);

  // 청크 = length(4) + type(4) + payload(9) + crc(4) = 21
  const chunk = new Uint8Array(21);
  const cdv = new DataView(chunk.buffer);
  cdv.setUint32(0, 9, false);
  chunk.set(type, 4);
  chunk.set(payload, 8);
  cdv.setUint32(17, crc, false);

  const out = new Uint8Array(src.length + chunk.length);
  out.set(src.subarray(0, IHDR_END), 0);
  out.set(chunk, IHDR_END);
  out.set(src.subarray(IHDR_END), IHDR_END + chunk.length);
  return out;
}

/* ============================================================
 * 공개 API
 * ============================================================ */

async function exportSvgFile(srcSvg) {
  const { clone } = buildExportSvg(srcSvg);
  const xml = serializeSvg(clone);
  const withDoctype =
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + xml;
  const blob = new Blob([withDoctype], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, `${filenameStem()}.svg`);
}

async function exportPngFile(srcSvg, dpi = 300) {
  const { clone, width, height } = buildExportSvg(srcSvg);
  const xml = serializeSvg(clone);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  // 96dpi 기준 SVG 사용자 좌표 → 300dpi 캔버스 픽셀로 확대
  const scale = dpi / 96;
  const pxW = Math.round(width * scale);
  const pxH = Math.round(height * scale);

  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG → Image 로딩 실패"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext("2d");
    // 캔버스 자체 배경 (clone 내부 흰색 rect 와 중복이지만 안전망)
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, pxW, pxH);
    ctx.drawImage(img, 0, 0, pxW, pxH);

    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("canvas.toBlob 실패"));
      }, "image/png");
    });
    const buf = await pngBlob.arrayBuffer();
    const stamped = stampPngDpi(buf, dpi);
    downloadBlob(new Blob([stamped], { type: "image/png" }), `${filenameStem()}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 헤더 두 버튼에 핸들러를 바인딩한다.
 * - #export-svg : SVG 다운로드
 * - #export-png : PNG 다운로드 (DPI 인자 기본 300)
 *
 * 버튼이 없으면(=구버전 HTML) 조용히 패스.
 */
export function setupExportButtons(srcSvg, { dpi = 300 } = {}) {
  const svgBtn = document.getElementById("export-svg");
  const pngBtn = document.getElementById("export-png");

  // 아이콘 버튼이라 textContent 교체 불가 → disabled + aria-busy 만 토글.
  // CSS 가 :disabled / [aria-busy=true] 상태에 cursor·opacity 로 시각 피드백.
  const lockAndRun = async (btn, label, fn) => {
    if (!btn) return;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    try {
      await fn();
    } catch (err) {
      console.error(`[export] ${label} 실패`, err);
      alert(`${label} 다운로드 실패: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  };

  if (svgBtn) {
    svgBtn.addEventListener("click", () =>
      lockAndRun(svgBtn, "SVG", () => exportSvgFile(srcSvg))
    );
  }
  if (pngBtn) {
    pngBtn.addEventListener("click", () =>
      lockAndRun(pngBtn, "PNG", () => exportPngFile(srcSvg, dpi))
    );
  }
}
