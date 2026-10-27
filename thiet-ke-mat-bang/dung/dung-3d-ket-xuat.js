/* ALN · Dựng mặt bằng — xem 3D: "Ảnh như thật" (25/10/2026)
 * Kết xuất góc đang xem bằng dò tia (path tracing, thư viện three-gpu-pathtracer): ánh sáng dội nhiều lần giữa
 * tường, sàn, trần → bóng mềm, ánh nắng hắt, đèn đêm toả ấm như ảnh render. Chạy hoàn toàn trên máy người xem (GPU),
 * không gửi gì lên máy chủ. Nạp lười: chỉ tải thư viện khi bấm nút. Ảnh tự khử nhiễu ở cuối rồi tải về PNG.
 */
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

function taoEl(ten, lop, cha, chu) { const e = document.createElement(ten); if (lop) e.className = lop; if (chu !== undefined) e.textContent = chu; if (cha) cha.appendChild(e); return e; }
const s2l = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

// Bầu trời dạng ảnh toàn cảnh (equirect) lấy từ nền trời đang vẽ: nửa trên theo dải màu trời, nửa dưới là đất.
function bauTroi(scene, sang) {
  const W = 256, H = 128, a = new Float32Array(W * H * 4), bg = scene.background;
  let px = null, cw = 0, chh = 0;
  const img = bg && bg.image;
  if (img && img.getContext) { cw = img.width; chh = img.height; px = img.getContext('2d').getImageData(0, 0, cw, chh).data; }
  const mauNen = bg && bg.isColor ? bg : new THREE.Color('#dfe6ec');
  for (let y = 0; y < H; y++) {
    let r, g, b;
    if (y < H / 2) {
      if (px) { const yy = Math.min(chh - 1, Math.floor(y / (H / 2) * chh)), i = yy * cw * 4; r = s2l(px[i]); g = s2l(px[i + 1]); b = s2l(px[i + 2]); }
      else { r = mauNen.r; g = mauNen.g; b = mauNen.b; }
    } else { const k = 0.45 * sang + 0.02; r = 0.42 * k; g = 0.41 * k; b = 0.37 * k; }
    for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; a[i] = r * 1.25; a[i + 1] = g * 1.25; a[i + 2] = b * 1.25; a[i + 3] = 1; }
  }
  const t = new THREE.DataTexture(a, W, H, THREE.RGBAFormat, THREE.FloatType);
  t.mapping = THREE.EquirectangularReflectionMapping; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

export async function ketXuat(ctx) {
  const { renderer, scene, camera, goc, nho, sang } = ctx;
  const PT = await import('three-gpu-pathtracer');
  const thu = window.ALNKetXuatThu || {}; // chỉ máy thử (vẽ bằng CPU) đặt: thu nhỏ khung, cho bấm Xong sớm
  const MUC = nho ? 160 : 420, TOI_DA_MS = nho ? 60000 : 120000, XONG_TU = thu.xongTu || 8;

  /* ---- bảng tiến độ ---- */
  const hop = taoEl('div', 'x3d-kx', goc); hop.setAttribute('role', 'status');
  taoEl('b', '', hop, 'Đang kết xuất ảnh như thật…');
  const thanh = taoEl('div', 'x3d-kx-thanh', hop), ruot = taoEl('i', '', thanh);
  const chu = taoEl('span', 'x3d-kx-chu', hop, 'Đang chuẩn bị mô hình');
  const hang = taoEl('div', 'x3d-kx-nut', hop);
  const nXong = taoEl('button', 'x3d-tq-chinh', hang, 'Xong, lưu ảnh'); nXong.type = 'button'; nXong.disabled = true;
  const nHuy = taoEl('button', 'x3d-tq-phu', hang, 'Huỷ'); nHuy.type = 'button';
  taoEl('p', 'x3d-chu-thich', hop, 'Máy tính toán ánh sáng dội nhiều lần như phần mềm render. Hình mịn dần — chờ tới khi thanh đầy hoặc bấm "Xong" lúc thấy vừa ý. Để yên máy, đừng xoay.');

  /* ---- chuẩn bị cảnh: ẩn mưa, sao, lớp chọn; đổi môi trường sang bầu trời toàn cảnh ---- */
  const an = [];
  scene.traverse((o) => { if ((o.isPoints || o.isLine || o.isLineSegments || o.isSprite || (o.isMesh && o.material && o.material.isMeshBasicMaterial && o.material.transparent)) && o.visible) { o.visible = false; an.push(o); } });
  const envCu = scene.environment, nenCu = scene.background, cuongDoCu = scene.environmentIntensity, fogCu = scene.fog;
  const troi = bauTroi(scene, sang);
  scene.environment = troi; scene.background = troi; scene.environmentIntensity = 1; scene.fog = null;

  const pt = new PT.WebGLPathTracer(renderer);
  pt.tiles.set(nho ? 3 : 2, nho ? 3 : 2);
  pt.renderScale = thu.renderScale || (nho ? 0.75 : 1);
  pt.minSamples = 1; pt.fadeDuration = 300; pt.renderDelay = 0; pt.dynamicLowRes = false;
  pt.filterGlossyFactor = 0.5;
  const kn = new PT.DenoiseMaterial({ map: null, blending: THREE.NoBlending, premultipliedAlpha: renderer.getContextAttributes().premultipliedAlpha });
  kn.sigma = 2.5; kn.threshold = 0.12; kn.kSigma = 1.0;
  const quad = new FullScreenQuad(kn);
  let khuNhieu = false;
  pt.renderToCanvasCallback = (target, r, q) => {
    const tu = r.autoClear; r.autoClear = false;
    if (khuNhieu) { kn.map = target.texture; quad.render(r); } else q.render(r);
    r.autoClear = tu;
  };

  let huy = false, xong = false, raf = 0;
  const ketQua = new Promise((res) => {
    nHuy.addEventListener('click', () => { huy = true; res(null); });
    nXong.addEventListener('click', () => { xong = true; });
    const t0 = performance.now();
    setTimeout(() => {
      try { pt.setScene(scene, camera); } catch (e) { chu.textContent = 'Máy này chưa kết xuất được (' + (e.message || 'lỗi') + ').'; res({ loi: e }); return; }
      chu.textContent = 'Đang tính ánh sáng';
      const lap = () => {
        if (huy) return;
        pt.renderSample();
        const k = Math.min(1, pt.samples / MUC);
        ruot.style.width = (k * 100).toFixed(1) + '%'; chu.textContent = Math.floor(pt.samples) + ' / ' + MUC + ' lượt tính';
        if (pt.samples >= XONG_TU) nXong.disabled = false;
        if (xong || pt.samples >= MUC || performance.now() - t0 > TOI_DA_MS) {
          khuNhieu = true; pt.pausePathTracing = true; pt.renderSample(); // vẽ lại lần cuối qua bộ khử nhiễu
          const c = document.createElement('canvas'); c.width = renderer.domElement.width; c.height = renderer.domElement.height;
          c.getContext('2d').drawImage(renderer.domElement, 0, 0);
          res({ canvas: c, mau: Math.floor(pt.samples) }); return;
        }
        raf = requestAnimationFrame(lap);
      };
      raf = requestAnimationFrame(lap);
    }, 60);
  });

  const kq = await ketQua;
  cancelAnimationFrame(raf);
  try { pt.dispose(); } catch (e) { /* bỏ qua */ }
  quad.dispose(); kn.dispose(); troi.dispose();
  scene.environment = envCu; scene.background = nenCu; scene.environmentIntensity = cuongDoCu; scene.fog = fogCu;
  an.forEach((o) => { o.visible = true; });
  hop.remove();
  return kq;
}
