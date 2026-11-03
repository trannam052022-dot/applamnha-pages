/* ═══════════════════════════════════════════════════════════════
   Văn phòng ALN (ảo) — bản phối cảnh 3D (01/11/2026)

   Dựng lại CHÍNH mặt bằng của van-phong.js bằng three.js: cùng phòng,
   cùng đồ đạc (bản ghi L3), cùng nhân viên và cùng đường đi. van-phong.js
   vẫn giữ mọi logic (đi lại, lời thoại, nghe sự kiện trong khung, dữ liệu
   quản trị); module này chỉ VẼ và nhận bấm chuột.
   - 1 ô = 1 m. Chiều cao đồ đạc đổi từ đơn vị isometric: K = 0,058 m.
   - Người dựng bằng code (khớp nối hông, gối, vai, khuỷu): đi, ngồi gõ phím,
     đứng thở, nói. Chưa dùng mô hình người có sẵn.
   - Không ghi gì, không dùng innerHTML: chữ vẽ lên canvas.
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const K = 0.058, WH = 3.2, WK = WH / 86, GW = 26, GH = 19;
const BRASS = "#c9a35b";
const nho = () => window.matchMedia("(pointer:coarse)").matches || window.innerWidth < 760;

/* ---------- vật liệu (dùng chung theo khoá) ---------- */
const MATS = new Map();
function mat(key, make) { if (!MATS.has(key)) MATS.set(key, make()); return MATS.get(key); }
const std = (c, r, m, extra) => mat("s|" + c + "|" + r + "|" + (m || 0) + "|" + (extra ? JSON.stringify(extra) : ""),
  () => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m || 0 }, extra || {})));
const brass = () => std(BRASS, 0.32, 0.85);
const dark = () => std("#232226", 0.6, 0.2);

/* ---------- hoạ tiết vẽ bằng canvas ---------- */
function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tex(cv, rep) {
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
const TEX = new Map();
function woodTex(c1, c2, seed) {
  const key = "w" + c1 + c2; if (TEX.has(key)) return TEX.get(key);
  const S = 512, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d"), r = rng(seed);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const along = (i + j) % 2 === 0, u = i * S / 2, v = j * S / 2, s = S / 2;
    for (let k = 0; k < 3; k++) {
      g.fillStyle = r() > 0.5 ? c1 : c2;
      if (along) g.fillRect(u, v + k * s / 3, s, s / 3); else g.fillRect(u + k * s / 3, v, s / 3, s);
      g.globalAlpha = 0.13; g.strokeStyle = "#000";
      for (let n = 0; n < 9; n++) { g.lineWidth = 0.6 + r(); g.beginPath();
        if (along) { const y = v + k * s / 3 + r() * s / 3; g.moveTo(u, y); g.bezierCurveTo(u + s * .3, y + r() * 4 - 2, u + s * .7, y + r() * 4 - 2, u + s, y); }
        else { const x = u + k * s / 3 + r() * s / 3; g.moveTo(x, v); g.bezierCurveTo(x + r() * 4 - 2, v + s * .3, x + r() * 4 - 2, v + s * .7, x, v + s); }
        g.stroke(); }
      g.globalAlpha = 1;
    }
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2;
    for (let k = 1; k < 3; k++) { g.beginPath(); if (along) { g.moveTo(u, v + k * s / 3); g.lineTo(u + s, v + k * s / 3); } else { g.moveTo(u + k * s / 3, v); g.lineTo(u + k * s / 3, v + s); } g.stroke(); }
    g.strokeRect(u, v, s, s);
  }
  TEX.set(key, cv); return cv;
}
function marbleTex(base, vein, seed, slab) {
  const key = "m" + base + vein + slab; if (TEX.has(key)) return TEX.get(key);
  const S = 1024, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d"), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S); g.lineCap = "round";
  for (let i = 0; i < 140; i++) { const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y);
    g.bezierCurveTo(x + r() * 200, y + r() * 80, x + r() * 300, y + r() * 220 - 50, x + 150 + r() * 300, y + 50 + r() * 200);
    g.strokeStyle = vein; g.globalAlpha = 0.12 + r() * 0.35; g.lineWidth = 0.8 + r() * 3; g.stroke(); }
  g.globalAlpha = 1; g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 3; const n = slab === 1 ? 2 : 1;
  for (let k = 0; k <= n; k++) { const p = k * S / n; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke(); }
  TEX.set(key, cv); return cv;
}
function rugTex(c, b) {
  const key = "r" + c + b; if (TEX.has(key)) return TEX.get(key);
  const cv = document.createElement("canvas"); cv.width = cv.height = 512; const g = cv.getContext("2d"), r = rng(7);
  g.fillStyle = b; g.fillRect(0, 0, 512, 512); g.fillStyle = c; g.fillRect(14, 14, 484, 484);
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.05)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
  g.strokeStyle = b; g.lineWidth = 5; g.strokeRect(34, 34, 444, 444);
  TEX.set(key, cv); return cv;
}
function cityTex(isNight, seed) {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 384; const g = cv.getContext("2d"), r = rng(seed);
  const gr = g.createLinearGradient(0, 0, 0, 384);
  if (isNight) { gr.addColorStop(0, "#081030"); gr.addColorStop(1, "#24345c"); } else { gr.addColorStop(0, "#9cc4e0"); gr.addColorStop(1, "#eef2ef"); }
  g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
  for (let u = -10; u < 512;) { const bw = 30 + r() * 60, bh = 90 + r() * 220;
    g.fillStyle = isNight ? "#060a1a" : (r() > 0.5 ? "#8aa1b4" : "#a3b6c4"); g.fillRect(u, 384 - bh, bw, bh);
    for (let wy = 384 - bh + 8; wy < 380; wy += 14) for (let wx = u + 5; wx < u + bw - 6; wx += 11)
      if (r() > (isNight ? 0.6 : 0.85)) { g.fillStyle = isNight ? "#f3c86a" : "rgba(255,255,255,.5)"; g.fillRect(wx, wy, 5, 7); }
    u += bw + 3; }
  return cv;
}
function panelTex(title, lines, accent) {
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 512; const g = cv.getContext("2d");
  g.fillStyle = "#0f1216"; g.fillRect(0, 0, 1024, 512); g.strokeStyle = "#2a2d33"; g.lineWidth = 10; g.strokeRect(5, 5, 1014, 502);
  g.fillStyle = accent; g.font = "700 46px 'JetBrains Mono',monospace"; g.fillText(title, 44, 90);
  g.font = "500 40px 'Be Vietnam Pro',sans-serif";
  lines.forEach((t, i) => { g.fillStyle = i === 0 ? "#ffffff" : "#b9c3cc"; g.fillText(t, 44, 170 + i * 76); });
  return cv;
}
function logoTex() {
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 512; const g = cv.getContext("2d"), r = rng(41);
  g.fillStyle = "#3b2416"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 70; i++) { g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1 + r() * 2; const x = r() * 1024; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + r() * 20 - 10, 512); g.stroke(); }
  g.fillStyle = BRASS; g.textAlign = "center"; g.font = "700 190px 'Playfair Display',serif"; g.fillText("ALN", 512, 290);
  g.font = "600 34px 'JetBrains Mono',monospace"; g.fillStyle = "#e2c48a"; g.fillText("APP LÀM NHÀ · NHÀ THẦU TƯ VẤN THIẾT KẾ", 512, 380);
  return cv;
}
function drawingTex() {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256; const g = cv.getContext("2d"), r = rng(5);
  g.fillStyle = "#efe9dd"; g.fillRect(0, 0, 512, 256); g.strokeStyle = "#4b6f9a"; g.lineWidth = 2;
  g.strokeRect(30, 26, 300, 200); g.beginPath(); g.moveTo(130, 26); g.lineTo(130, 226); g.moveTo(30, 120); g.lineTo(330, 120); g.moveTo(230, 120); g.lineTo(230, 226); g.stroke();
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(360, 40 + i * 30); g.lineTo(480 - r() * 40, 40 + i * 30); g.stroke(); }
  return cv;
}

/* ---------- dựng khối ---------- */
function bx(w, h, d, m, x, y, z) { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); return me; }
function cyl(rt, rb, h, m, x, y, z, seg) { const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), m); me.position.set(x, y, z); return me; }
function sph(r, m, x, y, z) { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), m); me.position.set(x, y, z); return me; }

export async function mo(stage, api) {
  const phone = nho();
  /* --- khung vẽ + lớp chữ --- */
  const gl = document.createElement("canvas"); gl.className = "cv3d";
  gl.setAttribute("aria-label", "Văn phòng ALN dạng phối cảnh 3D. Kéo để xoay, cuộn hoặc chụm để phóng to. Bấm vào một phòng để đi tới.");
  const ov = document.createElement("canvas"); ov.className = "ov3d"; ov.setAttribute("aria-hidden", "true");
  stage.insertBefore(ov, stage.firstChild); stage.insertBefore(gl, stage.firstChild);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: !phone, alpha: true, powerPreference: "high-performance" });
  } catch (e) { gl.remove(); ov.remove(); throw e; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6;

  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const controls = new OrbitControls(cam, gl);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 4; controls.maxDistance = 70; controls.maxPolarAngle = Math.PI * 0.47; controls.minPolarAngle = 0.15;
  controls.screenSpacePanning = false;
  const CEN = new THREE.Vector3(13, 0, 10);
  // Màn hình dọc (điện thoại): nhìn gần thẳng từ trên xuống, tòa nhà xoay dọc (cạnh dài 26 m theo chiều cao màn hình),
  // canh vừa bề ngang 20 m — thấy đủ mọi phòng. Màn hình ngang giữ góc phối cảnh chéo.
  function gocDoc() {
    const a = cam.aspect || 1, tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const d = Math.min(70, Math.max((GH / 2 + 1.5) / (tanV * a), (GW / 2 + 0.6) / tanV));
    const goc = 0.16; return { t: tamDoc(), p: tamDoc().add(new THREE.Vector3(Math.sin(goc) * d, Math.cos(goc) * d, 0)) };
  }
  // dời tâm xuống phía dưới màn hình một chút: thanh "Bạn cần gì?" ở trên mỏng hơn cụm thẻ phòng ở dưới
  const tamDoc = () => new THREE.Vector3(CEN.x + 1.4, 0, GH / 2);
  function datMacDinh(nhanh) {
    const doc = (cam.aspect || 1) < 0.9;
    const g = doc ? gocDoc() : null;
    const t = g ? g.t : CEN.clone(), p = g ? g.p : new THREE.Vector3(13 + 17, phone ? 32 : 26, 10 + 28);
    if (nhanh) { controls.target.copy(t); cam.position.copy(p); controls.update(); } else bay(t, p);
  }

  /* --- ánh sáng --- */
  const hemi = new THREE.HemisphereLight("#fff4e6", "#3b2f25", 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffe7c4", 2.4); sun.position.set(34, 17, 26); sun.target.position.copy(CEN);
  sun.castShadow = true; const sm = phone ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 5, far: 95 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const lamps = [];

  /* --- nền, sàn --- */
  const root = new THREE.Group(); scene.add(root);
  const tinh = new THREE.Group(); // đồ tĩnh, gộp sau khi dựng
  root.add(bx(GW + 0.4, 0.3, GH + 0.4, std("#2b2723", 0.8), GW / 2 - 0.2, -0.155, GH / 2 - 0.2));
  function san(x0, y0, x1, y1, m, lift) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), m); p.rotation.x = -Math.PI / 2;
    p.position.set((x0 + x1) / 2, lift || 0, (y0 + y1) / 2); p.receiveShadow = true; root.add(p); return p;
  }
  function sanGo(x0, y0, x1, y1, c1, c2, seed) { const t = tex(woodTex(c1, c2, seed), [(x1 - x0) / 2, (y1 - y0) / 2]); san(x0, y0, x1, y1, new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 })); }
  function sanDa(x0, y0, x1, y1, base, vein, seed, slab) { const t = tex(marbleTex(base, vein, seed, slab), [(x1 - x0) / 2, (y1 - y0) / 2]); san(x0, y0, x1, y1, new THREE.MeshStandardMaterial({ map: t, roughness: 0.16 })); }
  function tham(x0, y0, x1, y1, c, b) { san(x0, y0, x1, y1, new THREE.MeshStandardMaterial({ map: tex(rugTex(c, b)), roughness: 0.95 }), 0.006); }
  function vien(y, x0, x1) { tinh.add(bx(x1 - x0, 0.004, 0.035, brass(), (x0 + x1) / 2, 0.003, y)); }
  // bố cục 01/11/2026 — khớp buildStatic() trong van-phong.js
  sanGo(0, 0, 5, 6, "#b98c5e", "#a87d52", 1);
  sanGo(5, 0, 10, 6, "#5d3a22", "#4f311c", 3); tham(5.4, 3.6, 7.6, 5.7, "#6b2d2d", BRASS);
  sanDa(10, 0, 16, 6, "#efebe4", "#9d9488", 2);
  sanGo(16, 0, 21, 6, "#6a4126", "#5c3820", 11);
  san(21, 0, 26, 6, std("#7d7a74", 0.85));
  sanDa(0, 6, 26, 7, "#e8e3da", "#a59c8f", 4, 1); vien(6.1, 0, 26); vien(6.9, 0, 26);
  sanGo(0, 7, 8, 12, "#b98c5e", "#a87d52", 5);
  sanGo(8, 7, 13, 12, "#6a4126", "#5c3820", 12); tham(8.2, 7.4, 12.8, 11.7, "#1f5c4a", BRASS);
  sanDa(13, 7, 18, 12, "#f1ede6", "#a39888", 13); tham(14.1, 8.4, 16.9, 10.6, "#d9cfc0", "#8a5232");
  sanGo(18, 7, 26, 12, "#b98c5e", "#a87d52", 14);
  sanDa(0, 12, 26, 13, "#e8e3da", "#a59c8f", 6, 1); vien(12.1, 0, 26); vien(12.9, 0, 26);
  sanGo(0, 13, 8, 19, "#b98c5e", "#a87d52", 8);
  sanDa(8, 13, 18, 19, "#f1ede6", "#a39888", 7);
  { const kc = std("#1f1d1c", 0.3); for (let x = 10; x < 18; x += 2) for (let y = 14; y < 19; y += 2) { if (x > 10 && x < 16 && y > 15) continue; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), kc); m.rotation.set(-Math.PI / 2, 0, Math.PI / 4); m.position.set(x, 0.004, y); root.add(m); } }
  tham(11.6, 18.2, 14.4, 19, "#2b2723", BRASS);
  sanGo(18, 13, 26, 19, "#6a4126", "#5c3820", 9); tham(18.8, 15.9, 22.3, 18.4, "#d9cfc0", "#8a5232");
  /* --- vườn bao quanh tòa nhà (01/11/2026, đợt 1): cỏ, lối đá, cổng, hồ cảnh, cây cau, hàng rào xanh.
     Vật liệu dùng chung để gộp khối (ít lần vẽ). Ngoài nhà: x < 0, x > GW, z > GH. --- */
  const VUON = {
    co: std("#5f8a4a", 0.95), coDam: std("#4d7a3c", 0.95), da: std("#d9d2c4", 0.55), daVien: std("#bdb3a2", 0.6),
    than: std("#8a7458", 0.85), la: std("#4f8a46", 0.7), laNhat: std("#6ea25a", 0.7), rao: std("#3f6e37", 0.85),
    cot: std("#2b2723", 0.5), nuoc: new THREE.MeshStandardMaterial({ color: "#2f6676", roughness: 0.04, metalness: 0.3 }),
    den: new THREE.MeshStandardMaterial({ color: "#f3e3c0", emissive: "#ffd28a", emissiveIntensity: 0.3, roughness: 0.4 }),
  };
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(GW + 14, GH + 15), VUON.co); g.rotation.x = -Math.PI / 2; g.position.set(GW / 2, -0.3, GH / 2 + 2.5); tinh.add(g); }
  const cauNho = (r, m, x, y, z) => { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m); me.position.set(x, y, z); return me; };
  // lối đá từ cổng tới cửa chính
  for (let z = 20.5; z < 26; z += 0.9) { tinh.add(bx(3.2, 0.06, 0.7, VUON.da, 13, -0.27, z)); }
  tinh.add(bx(4.2, 0.08, 0.12, VUON.daVien, 13, -0.26, 26.3));
  // cổng: 2 trụ + dầm đồng
  [10.7, 15.3].forEach(x => { tinh.add(bx(0.45, 2.2, 0.45, VUON.cot, x, 0.8, 26.3)); tinh.add(bx(0.55, 0.06, 0.55, brass(), x, 1.93, 26.3)); });
  tinh.add(bx(5.1, 0.12, 0.18, brass(), 13, 2.0, 26.3));
  // hàng rào xanh phía trước (chừa cổng) và bên phải
  tinh.add(bx(9.8, 0.7, 0.55, VUON.rao, 5.4, 0.05, 26.3)); tinh.add(bx(10.2, 0.7, 0.55, VUON.rao, 20.8, 0.05, 26.3));
  tinh.add(bx(0.55, 0.7, 26, VUON.rao, GW + 4.2, 0.05, 13));
  // bồn cây sát mặt trước nhà (chừa lối vào)
  [[0.4, 10.6], [15.4, 25.6]].forEach(([a, b]) => { tinh.add(bx(b - a, 0.3, 0.7, VUON.daVien, (a + b) / 2, -0.15, 19.55)); for (let x = a + 0.4; x < b - 0.2; x += 0.9) { const c = cauNho(0.32, (x * 7 | 0) % 2 ? VUON.la : VUON.laNhat, x, 0.18, 19.55); c.scale.set(1, 0.75, 1); tinh.add(c); } });
  [[GW + 0.4, 0.4, GH - 0.4]].forEach(([x, a, b]) => { tinh.add(bx(0.7, 0.3, b - a, VUON.daVien, x + 0.35, -0.15, (a + b) / 2)); for (let z = a + 0.4; z < b; z += 0.9) { const c = cauNho(0.32, (z * 7 | 0) % 2 ? VUON.la : VUON.laNhat, x + 0.35, 0.18, z); c.scale.set(1, 0.75, 1); tinh.add(c); } });
  // hồ cảnh bên phải lối vào
  tinh.add(bx(6.2, 0.22, 3.0, VUON.daVien, 21.2, -0.2, 22.2)); { const n = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.6), VUON.nuoc); n.rotation.x = -Math.PI / 2; n.position.set(21.2, -0.08, 22.2); tinh.add(n); }
  [[19, 21.4], [20.2, 23.1], [23.4, 21.6]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 14), VUON.laNhat); l.position.set(x, -0.06, z); tinh.add(l); });
  // cây cau
  function cau(x, z, h) {
    h = h || 4.6; const r = rng(Math.round(x * 31 + z * 17));
    tinh.add(cyl(0.07, 0.11, h, VUON.than, x, -0.3 + h / 2, z, 10));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + r() * 0.3, la = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 4), i % 2 ? VUON.la : VUON.laNhat);
      la.scale.set(2.3, 0.12, 0.45); la.position.set(x + Math.cos(a) * 0.95, -0.3 + h - 0.15, z + Math.sin(a) * 0.95); la.rotation.set(0, -a, -0.35); tinh.add(la); }
    tinh.add(sph(0.16, VUON.than, x, -0.3 + h, z));
  }
  [[3.5, 22.5], [7.6, 24.2], [18.4, 24.6], [24.6, 24.4], [GW + 2.4, 3.5], [GW + 2.4, 9.5], [GW + 2.4, 15.5], [-1.6, 21.2]].forEach(([x, z], i) => cau(x, z, 4.2 + (i % 3) * 0.5));
  // đèn sân vườn (sáng hơn khi đêm)
  [[11.2, 21], [14.8, 21], [11.2, 24], [14.8, 24]].forEach(([x, z]) => { tinh.add(cyl(0.05, 0.06, 0.6, VUON.cot, x, 0, z, 8)); const d = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), VUON.den); d.position.set(x, 0.38, z); tinh.add(d); });

  // thềm cửa chính
  root.add(bx(4, 0.22, 1.4, std("#d8d2c7", 0.4), 13, -0.11 + 0.0, 19.7));
  tinh.add(bx(3.8, 0.01, 0.05, brass(), 13, 0.005, 19.02));

  /* --- tường sau (2 mặt) --- */
  const vua = std("#e6e0d6", 0.92), vuaB = std("#e1dbd0", 0.92), goTuong = std("#5a3720", 0.55), goTuongB = std("#4f301c", 0.55);
  tinh.add(bx(GW + 0.2, WH, 0.2, vua, GW / 2 - 0.1, WH / 2, -0.1));
  tinh.add(bx(0.2, WH, GH, vuaB, -0.1, WH / 2, GH / 2));
  tinh.add(bx(GW, 22 * WK, 0.04, goTuong, GW / 2, 11 * WK, 0.02)); tinh.add(bx(GW, 0.03, 0.05, brass(), GW / 2, 22.6 * WK, 0.025));
  tinh.add(bx(0.04, 22 * WK, GH, goTuongB, 0.02, 11 * WK, GH / 2)); tinh.add(bx(0.05, 0.03, GH, brass(), 0.025, 22.6 * WK, GH / 2));
  tinh.add(bx(GW + 0.2, 0.06, 0.24, std("#2a2522", 0.7), GW / 2 - 0.1, WH + 0.03, -0.1));
  tinh.add(bx(0.24, 0.06, GH, std("#2a2522", 0.7), -0.1, WH + 0.03, GH / 2));
  const cuaSo = [];
  function cuaSoA(u0, u1, seed) { // dọc tường x, mặt z = 0
    const w = u1 - u0, h = (80 - 28) * WK, cy = (28 + 80) / 2 * WK, cx = (u0 + u1) / 2;
    const m = new THREE.MeshBasicMaterial({ map: tex(cityTex(false, seed)) }); m.toneMapped = false;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(cx, cy, 0.045); root.add(p); cuaSo.push({ m, seed });
    khungCua(cx, cy, w, h, (a, b, c, d) => tinh.add(bx(a, b, 0.04, dark(), c, d, 0.06)));
    tinh.add(bx(w + 0.1, 0.04, 0.1, brass(), cx, cy - h / 2 - 0.02, 0.07));
  }
  function cuaSoB(v0, v1, seed) { // dọc tường z, mặt x = 0
    const w = v1 - v0, h = (80 - 28) * WK, cy = (28 + 80) / 2 * WK, cz = (v0 + v1) / 2;
    const m = new THREE.MeshBasicMaterial({ map: tex(cityTex(false, seed)) }); m.toneMapped = false;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.rotation.y = Math.PI / 2; p.position.set(0.045, cy, cz); root.add(p); cuaSo.push({ m, seed });
    khungCua(cz, cy, w, h, (a, b, c, d) => tinh.add(bx(0.04, b, a, dark(), 0.06, d, c)));
    tinh.add(bx(0.1, 0.04, w + 0.1, brass(), 0.07, cy - h / 2 - 0.02, cz));
  }
  function khungCua(c, cy, w, h, add) {
    for (let i = 0; i <= 3; i++) add(0.035, h, c - w / 2 + w * i / 3, cy);
    for (let i = 0; i <= 4; i++) add(w, 0.035, c, cy - h / 2 + h * i / 4);
  }
  function keSach(a0, a1, z0, z1, seed, truc) { // truc 'x' = tường z=0, 'z' = tường x=0
    const r = rng(seed), y0 = z0 * WK, y1 = z1 * WK, L = a1 - a0, dep = 0.32, c = (a0 + a1) / 2;
    const go = std("#3a2416", 0.6);
    if (truc === "x") tinh.add(bx(L, y1 - y0, dep, go, c, (y0 + y1) / 2, dep / 2 + 0.04)); else tinh.add(bx(dep, y1 - y0, L, go, dep / 2 + 0.04, (y0 + y1) / 2, c));
    const rows = Math.floor((z1 - z0) / 13), cols = ["#7b2e2e", "#2e4f6b", BRASS, "#3b5d47", "#d9cfc0", "#1f1f22", "#8a5232"];
    for (let k = 0; k < rows; k++) {
      const base = y0 + (k + 1) * (y1 - y0) / rows - 0.06;
      if (truc === "x") tinh.add(bx(L, 0.025, dep + 0.02, brass(), c, base, dep / 2 + 0.05)); else tinh.add(bx(dep + 0.02, 0.025, L, brass(), dep / 2 + 0.05, base, c));
      for (let u = a0 + 0.06; u < a1 - 0.08;) {
        const w = 0.035 + r() * 0.05, h = 0.2 + r() * 0.17; if (r() > 0.9) { u += 0.12; continue; }
        const m = std(cols[Math.floor(r() * cols.length)], 0.7);
        if (truc === "x") tinh.add(bx(w, h, 0.22, m, u + w / 2, base + 0.013 + h / 2, 0.2)); else tinh.add(bx(0.22, h, w, m, 0.2, base + 0.013 + h / 2, u + w / 2));
        u += w + 0.008;
      }
    }
  }
  const bang = [];
  function bangTuong(a0, a1, z0, z1, truc, key) {
    const w = a1 - a0, h = (z1 - z0) * WK, c = (a0 + a1) / 2, cy = (z0 + z1) / 2 * WK;
    const m = new THREE.MeshBasicMaterial({ color: "#ffffff" }); m.toneMapped = false;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    if (truc === "x") p.position.set(c, cy, 0.06); else { p.rotation.y = Math.PI / 2; p.position.set(0.06, cy, c); }
    root.add(p); bang.push({ m, key });
    if (truc === "x") tinh.add(bx(w + 0.08, h + 0.08, 0.04, std("#1c1c1e", 0.4), c, cy, 0.035)); else tinh.add(bx(0.04, h + 0.08, w + 0.08, std("#1c1c1e", 0.4), 0.035, cy, c));
  }
  cuaSoA(1, 2.7, 11); cuaSoA(3, 4.6, 13); keSach(5.4, 9.6, 24, 82, 12, "x");
  bangTuong(10.6, 15.4, 32, 74, "x", "a");
  cuaSoA(16.8, 18.6, 22); keSach(22.2, 25.8, 24, 82, 23, "x");
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 58 * WK), new THREE.MeshStandardMaterial({ map: tex(logoTex()), roughness: 0.5 }));
    p.rotation.y = Math.PI / 2; p.position.set(0.05, 51 * WK, 16); root.add(p); }
  bangTuong(7.4, 11.6, 30, 72, "z", "b");
  { const cv = document.createElement("canvas"); cv.width = 256; cv.height = 512; const g = cv.getContext("2d"), r = rng(31);
    g.fillStyle = "#f2ede4"; g.fillRect(0, 0, 256, 512); ["#1f5c4a", BRASS, "#2b2b2e", "#b4563f", "#d7cdbb"].forEach(() => { g.fillStyle = ["#1f5c4a", BRASS, "#2b2b2e", "#b4563f"][Math.floor(r() * 4)]; g.beginPath(); g.arc(30 + r() * 196, 30 + r() * 452, 30 + r() * 70, 0, 7); g.fill(); });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 30 * WK), new THREE.MeshStandardMaterial({ map: tex(cv), roughness: 0.8 }));
    p.rotation.y = Math.PI / 2; p.position.set(0.07, 55 * WK, 4.85); root.add(p); tinh.add(bx(0.03, 30 * WK + 0.06, 1.56, std("#1c1c1e", 0.4), 0.05, 55 * WK, 4.85)); }
  cuaSoB(1.0, 3.6, 32);

  /* --- vách kính --- */
  const kinh = new THREE.MeshPhysicalMaterial({ color: "#cfe3ee", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
  const GLH = 44 * K;
  function doanKinh(cells) { // gộp ô liền nhau thành tấm
    const out = []; cells.sort((a, b) => a - b); let s = null, p = null;
    cells.forEach(c => { if (s === null) { s = c; p = c; } else if (c === p + 1) p = c; else { out.push([s, p + 1]); s = c; p = c; } });
    if (s !== null) out.push([s, p + 1]); return out;
  }
  function vachKinh(doc, toaDo, a0, a1, gaps) {
    const cells = []; for (let a = a0; a < a1; a++) if (!(gaps && gaps.some(([g0, g1]) => a >= g0 && a < g1))) cells.push(a);
    doanKinh(cells).forEach(([s, e]) => {
      const L = e - s, c = (s + e) / 2, pane = new THREE.Mesh(new THREE.PlaneGeometry(L, GLH), kinh); pane.renderOrder = 2;
      if (doc) { pane.rotation.y = Math.PI / 2; pane.position.set(toaDo, GLH / 2, c); } else pane.position.set(c, GLH / 2, toaDo);
      root.add(pane);
      const put = (w, h, d, m, y, off) => doc ? tinh.add(bx(d, h, w, m, toaDo, y, off)) : tinh.add(bx(w, h, d, m, off, y, toaDo));
      put(L, 0.05, 0.06, brass(), GLH, c); put(L, 0.05, 0.06, std("#1c1c1e", 0.5), 0.025, c);
      for (let k = 0; k <= L; k++) put(0.03, GLH, 0.04, std("#2a2a2e", 0.4, 0.3), GLH / 2, s + k);
    });
  }

  /* --- đồ đạc từ bản ghi L3 --- */
  const banLam = []; // tâm bàn để quay ghế/người
  api.L3.forEach(({ t, a }) => { if (t === "desk" || t === "table" || t === "drafting" || t === "counter") banLam.push([a[0] + a[2] / 2, a[1] + a[3] / 2]); });
  function ganBan(x, y) { let best = null, d0 = 1e9; banLam.forEach(([bxx, byy]) => { const d = Math.hypot(bxx - x, byy - y); if (d < d0) { d0 = d; best = [bxx, byy]; } }); return d0 < 2.6 ? best : null; }
  const monitors = [], leds = []; monitors.push(VUON.den); // đèn sân vườn sáng theo đêm
  const DO = {
    desk(x, y, w, d, o) {
      o = o || {}; const top = std(o.top || "#6e4629", 0.42), h = 13.2 * K;
      tinh.add(bx(w, 0.045, d, top, x + w / 2, h - 0.022, y + d / 2));
      tinh.add(bx(w - 0.1, 0.02, d - 0.1, brass(), x + w / 2, h - 0.055, y + d / 2));
      tinh.add(bx(0.5, h - 0.05, d - 0.16, std("#3a2a1f", 0.55), x + 0.32, (h - 0.05) / 2, y + d / 2));
      tinh.add(bx(0.05, h - 0.05, d - 0.16, std("#3a2a1f", 0.55), x + w - 0.08, (h - 0.05) / 2, y + d / 2));
      tinh.add(bx(w - 0.6, 0.35, 0.02, std("#3a2a1f", 0.55), x + w / 2 + 0.2, h - 0.25, y + 0.12));
      (o.mons || []).forEach(mx => {
        const cx = x + mx + 0.41, cz = y + 0.2;
        tinh.add(bx(0.08, 0.2, 0.05, dark(), cx, h + 0.1, cz)); tinh.add(bx(0.22, 0.012, 0.16, dark(), cx, h + 0.006, cz + 0.03));
        tinh.add(bx(0.62, 0.38, 0.025, std("#18181b", 0.3, 0.2), cx, h + 0.36, cz + 0.02));
        const sm = new THREE.MeshStandardMaterial({ color: "#0d1418", emissive: o.tint || "#63c9b8", emissiveIntensity: 0.55, roughness: 0.2 });
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), sm); s.position.set(cx, h + 0.36, cz + 0.034); root.add(s); monitors.push(sm);
        tinh.add(bx(0.42, 0.015, 0.14, std("#2a2a2e", 0.5), cx, h + 0.008, cz + 0.36));
      });
      if (o.lamp) { const lx = x + w - 0.3, lz = y + 0.25; tinh.add(cyl(0.012, 0.012, 0.42, brass(), lx, h + 0.21, lz)); tinh.add(cyl(0.06, 0.1, 0.12, std("#efe4cf", 0.6, 0, { emissive: "#ffd9a0", emissiveIntensity: 0.25 }), lx, h + 0.42, lz)); tinh.add(cyl(0.07, 0.07, 0.015, brass(), lx, h + 0.008, lz)); }
      if (o.paper) { const p = bx(0.3, 0.006, 0.4, std("#f4f1ea", 0.9), x + 0.6, h + 0.003, y + 0.55); p.rotation.y = 0.2; tinh.add(p); }
    },
    chair(x, y, col) {
      const g = new THREE.Group(), m = std(col || "#2c2a28", 0.75), cx = x + 0.36, cz = y + 0.36;
      g.add(bx(0.48, 0.07, 0.46, m, 0, 0.47, 0)); g.add(bx(0.46, 0.5, 0.06, m, 0, 0.78, 0.22));
      g.add(cyl(0.025, 0.025, 0.36, dark(), 0, 0.27, 0)); for (let i = 0; i < 5; i++) { const a = bx(0.3, 0.025, 0.04, dark(), Math.cos(i * 1.257) * 0.14, 0.06, Math.sin(i * 1.257) * 0.14); a.rotation.y = -i * 1.257; g.add(a); g.add(sph(0.025, dark(), Math.cos(i * 1.257) * 0.28, 0.025, Math.sin(i * 1.257) * 0.28)); }
      g.add(bx(0.04, 0.03, 0.3, dark(), 0.25, 0.62, 0.02)); g.add(bx(0.04, 0.03, 0.3, dark(), -0.25, 0.62, 0.02));
      const b = ganBan(cx, cz); if (b) g.rotation.y = Math.atan2(-(b[0] - cx), -(b[1] - cz));
      g.position.set(cx, 0, cz); tinh.add(g);
    },
    plant(x, y, s, pot) {
      s = s || 1; const cx = x + 0.3 * s, cz = y + 0.3 * s, r = rng(Math.round(x * 100 + y));
      tinh.add(cyl(0.26 * s, 0.2 * s, 0.5 * s, std(pot || "#b98d4e", 0.6), cx, 0.25 * s, cz));
      tinh.add(cyl(0.24 * s, 0.24 * s, 0.02, std("#3a2a1f", 1), cx, 0.5 * s, cz));
      for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 8, 6), std(i % 3 ? "#3f7a52" : "#5c9a68", 0.7)); l.scale.set(1, 0.55, 0.45); l.position.set(cx + (r() - 0.5) * 0.6 * s, 0.6 * s + r() * 0.75 * s, cz + (r() - 0.5) * 0.6 * s); l.rotation.set(r() * 3, r() * 3, r() * 3); tinh.add(l); }
    },
    olive(x, y) {
      const cx = x + 0.4, cz = y + 0.4, r = rng(Math.round(x * 77 + y * 13));
      tinh.add(bx(0.8, 0.75, 0.8, std("#e6dfd3", 0.5), cx, 0.375, cz));
      const tr = cyl(0.035, 0.06, 1.6, std("#5b4636", 0.9), cx + 0.05, 0.75 + 0.8, cz); tr.rotation.z = -0.08; tinh.add(tr);
      for (let i = 0; i < 26; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17 + r() * 0.1, 0), std(r() > 0.5 ? "#8fa271" : "#6f8457", 0.8)); l.position.set(cx + (r() * 2 - 1) * 0.55, 1.75 + r() * 0.8, cz + (r() * 2 - 1) * 0.55); tinh.add(l); }
    },
    lamp(x, y) {
      tinh.add(cyl(0.16, 0.18, 0.03, dark(), x, 0.015, y)); tinh.add(cyl(0.015, 0.015, 1.6, brass(), x, 0.8, y));
      const shade = new THREE.MeshStandardMaterial({ color: "#f1e6cf", roughness: 0.7, emissive: "#ffcf8a", emissiveIntensity: 0.15, side: THREE.DoubleSide });
      root.add(cyl(0.16, 0.24, 0.3, shade, x, 1.72, y, 24));
      const pl = new THREE.PointLight("#ffc98a", 0, 7, 1.6); pl.position.set(x, 1.6, y); root.add(pl); lamps.push({ pl, shade });
    },
    sofa(x, y, w, d, col, back) {
      const m = std(col, 0.88), cxx = x + w / 2, czz = y + d / 2;
      tinh.add(bx(w, 0.42, d, m, cxx, 0.21, czz));
      for (let k = 0; k < 3; k++) { const cs = std(col, 0.95); if (back === "y") tinh.add(bx(w / 3 - 0.05, 0.08, d - 0.36, cs, x + w * (k + 0.5) / 3, 0.46, czz + 0.12)); else tinh.add(bx(w - 0.36, 0.08, d / 3 - 0.05, cs, cxx + 0.12, 0.46, y + d * (k + 0.5) / 3)); }
      if (back === "y") { tinh.add(bx(w, 0.9, 0.3, m, cxx, 0.45, y + 0.15)); tinh.add(bx(0.24, 0.62, d, m, x + 0.12, 0.31, czz)); tinh.add(bx(0.24, 0.62, d, m, x + w - 0.12, 0.31, czz)); }
      else { tinh.add(bx(0.3, 0.9, d, m, x + 0.15, 0.45, czz)); tinh.add(bx(w, 0.62, 0.24, m, cxx, 0.31, y + 0.12)); tinh.add(bx(w, 0.62, 0.24, m, cxx, 0.31, y + d - 0.12)); }
      tinh.add(bx(w + 0.02, 0.012, 0.012, brass(), cxx, 0.06, y + d + 0.005));
    },
    table(x, y, w, d, h, top) {
      const H = h * K, cxx = x + w / 2, czz = y + d / 2;
      tinh.add(bx(w, 0.04, d, std(top || "#ece6dc", top && top.startsWith("#5") ? 0.42 : 0.18), cxx, H - 0.02, czz));
      tinh.add(bx(w + 0.01, 0.012, d + 0.01, brass(), cxx, H - 0.045, czz));
      tinh.add(cyl(0.06, 0.08, H - 0.04, std("#2a2522", 0.5, 0.3), cxx, (H - 0.04) / 2, czz)); tinh.add(cyl(0.3, 0.32, 0.03, std("#2a2522", 0.5, 0.3), cxx, 0.015, czz));
    },
    counter(x, y, w, d) {
      const cxx = x + w / 2, czz = y + d / 2, H = 16 * K;
      tinh.add(bx(w, H - 0.04, d, std("#e9e2d6", 0.3), cxx, (H - 0.04) / 2, czz));
      const t = tex(marbleTex("#f6f2ea", "#a39888", 3, 2), [w / 2, d / 2]); tinh.add(bx(w + 0.06, 0.04, d + 0.06, new THREE.MeshStandardMaterial({ map: t, roughness: 0.15 }), cxx, H - 0.02, czz));
      tinh.add(bx(w, 0.08, 0.02, brass(), cxx, 6.7 * K, y + d + 0.005));
    },
    cabinet(x, y, w, d, h, col) {
      const H = h * K, cxx = x + w / 2, czz = y + d / 2; tinh.add(bx(w, H, d, std(col, 0.55), cxx, H / 2, czz));
      for (let i = 1; i <= 4; i++) { tinh.add(bx(w - 0.04, 0.008, 0.005, std("#1b120c", 0.8), cxx, H * i / 4, y + d + 0.003)); tinh.add(bx(0.14, 0.02, 0.03, brass(), cxx, H * (i - 0.5) / 4, y + d + 0.015)); }
    },
    server(x, y) {
      const cxx = x + 0.45, czz = y + 0.35, H = 40 * K; tinh.add(bx(0.9, H, 0.7, std("#1d1f24", 0.5, 0.4), cxx, H / 2, czz));
      for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) { const m = new THREE.MeshBasicMaterial({ color: c === 2 ? "#e9b85c" : "#4fd8b0" }); const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), m); l.position.set(x + 0.2 + c * 0.25, (8 + r * 5) * K, y + 0.705); root.add(l); leds.push({ m, k: r * 3 + c, on: m.color.clone() }); }
    },
    drafting(x, y, w, d) {
      const g = new THREE.Group(); g.position.set(x + w / 2, 0, y + d / 2);
      [-w / 2 + 0.12, w / 2 - 0.12].forEach(ox => g.add(bx(0.05, 0.75, 0.05, dark(), ox, 0.375, 0.1)));
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), [std("#d9d2c4", 0.6), std("#d9d2c4", 0.6), new THREE.MeshStandardMaterial({ map: tex(drawingTex()), roughness: 0.75 }), std("#d9d2c4", 0.6), std("#d9d2c4", 0.6), std("#d9d2c4", 0.6)]);
      b.position.set(0, 0.86, 0); b.rotation.x = 0.32; g.add(b);
      const ru = bx(w * 0.85, 0.012, 0.03, brass(), 0, 0.88, 0.05); ru.rotation.x = 0.32; ru.rotation.y = 0.35; g.add(ru);
      tinh.add(g);
    },
    maquette(x, y) {
      const cxx = x + 1.1, czz = y + 0.7, H = 14 * K;
      tinh.add(bx(2.2, H, 1.4, std("#efeae1", 0.4), cxx, H / 2, czz)); tinh.add(bx(2.2, 0.02, 1.4, std("#faf7f1", 0.3), cxx, H + 0.01, czz));
      tinh.add(bx(1.2, 9 * K, 0.8, std("#f4f1ea", 0.5), x + 0.9, H + 4.5 * K, y + 0.65)); tinh.add(bx(1.3, 0.04, 0.9, std("#3a3532", 0.6), x + 0.9, H + 9 * K + 0.02, y + 0.65));
      tinh.add(bx(0.75, 15 * K, 0.65, std("#e3dccf", 0.5), x + 1.48, H + 7.5 * K, y + 0.78)); tinh.add(bx(0.85, 0.04, 0.75, std("#3a3532", 0.6), x + 1.48, H + 15 * K + 0.02, y + 0.78));
      for (let i = 0; i < 3; i++) tinh.add(bx(0.18, 0.2, 0.01, std("#86b8d1", 0.1, 0.1), x + 0.5 + i * 0.35, H + 0.25, y + 1.055));
      tinh.add(sph(0.18, std("#5c9a68", 0.7), x + 0.35, H + 0.2, y + 1.15));
    },
    sheet(x, y, w, d, h) { const H = h * K; const m = bx(w, H, d, std("#d9d5cc", 0.95), x + w / 2, H / 2, y + d / 2); tinh.add(m); tinh.add(bx(w + 0.06, 0.08, d + 0.06, std("#c9c4b9", 0.95), x + w / 2, 0.04, y + d / 2)); },
    espresso(x, y) { tinh.add(bx(0.5, 7 * K, 0.5, std("#b9bdc2", 0.25, 0.7), x + 0.25, 16 * K + 3.5 * K, y + 0.25)); },
    sign(x, y, txt) {
      tinh.add(cyl(0.02, 0.02, 1.4, brass(), x, 0.7, y)); tinh.add(cyl(0.15, 0.15, 0.02, dark(), x, 0.01, y));
      const cv = document.createElement("canvas"); cv.width = 512; cv.height = 160; const g = cv.getContext("2d"); g.fillStyle = "#1d2026"; g.fillRect(0, 0, 512, 160); g.strokeStyle = BRASS; g.lineWidth = 8; g.strokeRect(4, 4, 504, 152);
      g.fillStyle = "#e2c48a"; g.font = "700 64px 'JetBrains Mono',monospace"; g.textAlign = "center"; g.fillText(txt, 256, 102);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), new THREE.MeshStandardMaterial({ map: tex(cv), roughness: 0.6, side: THREE.DoubleSide })); p.position.set(x, 1.55, y); p.rotation.y = -0.6; root.add(p);
    },
    khoi(x, y, w, d, h, col) { const H = h * K; tinh.add(bx(w, H, d, std(col, 0.5), x + w / 2, H / 2, y + d / 2)); tinh.add(bx(w + 0.04, 0.03, d + 0.04, std("#e9e2d6", 0.25), x + w / 2, H + 0.015, y + d / 2)); },
    glassX(X, y0, y1, gaps) { vachKinh(true, X, y0, y1, gaps); },
    glassY(Y, x0, x1, gaps) { vachKinh(false, Y, x0, x1, gaps); }
  };
  api.L3.forEach(({ t, a }) => { if (DO[t]) DO[t].apply(null, a); });

  // gộp đồ tĩnh theo vật liệu: vài chục lần vẽ thay vì hàng nghìn
  tinh.updateMatrixWorld(true);
  const nhom = new Map();
  tinh.traverse(o => {
    if (!o.isMesh) return; const ms = Array.isArray(o.material) ? null : o.material; if (!ms) { const c = new THREE.Mesh(o.geometry, o.material); o.matrixWorld.decompose(c.position, c.quaternion, c.scale); c.castShadow = c.receiveShadow = true; root.add(c); return; }
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    ["color", "uv1", "uv2"].forEach(n => g.deleteAttribute && g.getAttribute(n) && g.deleteAttribute(n));
    if (!nhom.has(ms)) nhom.set(ms, []); nhom.get(ms).push(g);
  });
  nhom.forEach((gs, m) => { const g = mergeGeometries(gs, false); if (!g) return; const me = new THREE.Mesh(g, m); me.castShadow = me.receiveShadow = true; root.add(me); gs.forEach(x => x.dispose()); });

  /* --- lớp phủ: khu nội bộ, viền phòng đang chọn/đang trỏ --- */
  const phuNoi = [];
  api.Z.forEach(z => { const p = new THREE.Mesh(new THREE.PlaneGeometry(z.x1 - z.x0, z.y1 - z.y0), new THREE.MeshBasicMaterial({ color: "#0a0c10", transparent: true, opacity: 0.45, depthWrite: false }));
    p.rotation.x = -Math.PI / 2; p.position.set((z.x0 + z.x1) / 2, 0.012, (z.y0 + z.y1) / 2); p.renderOrder = 1; root.add(p); phuNoi.push({ z, p }); });
  function vienPhong(color, op) {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false });
    const a = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m), b = a.clone(), c = a.clone(), d = a.clone(), f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op * 0.14, depthWrite: false }));
    [a, b, c, d, f].forEach(x => { x.rotation.x = -Math.PI / 2; x.renderOrder = 3; g.add(x); });
    g.datPhong = z => { if (!z) { g.visible = false; return; } g.visible = true; const W = z.x1 - z.x0, D = z.y1 - z.y0, cx = (z.x0 + z.x1) / 2, cz = (z.y0 + z.y1) / 2, t = 0.07;
      a.scale.set(W, t, 1); a.position.set(cx, 0.02, z.y0 + t / 2); b.scale.set(W, t, 1); b.position.set(cx, 0.02, z.y1 - t / 2);
      c.scale.set(t, D, 1); c.position.set(z.x0 + t / 2, 0.02, cz); d.scale.set(t, D, 1); d.position.set(z.x1 - t / 2, 0.02, cz);
      f.scale.set(W, D, 1); f.position.set(cx, 0.015, cz); };
    g.visible = false; root.add(g); return g;
  }
  const vienChon = vienPhong(BRASS, 0.95), vienTro = vienPhong("#ffffff", 0.5);

  /* --- người --- */
  const GEO = {
    torso: new THREE.CapsuleGeometry(0.16, 0.3, 6, 14), hip: new THREE.CapsuleGeometry(0.15, 0.04, 6, 14),
    thigh: new THREE.CapsuleGeometry(0.064, 0.33, 4, 10), shin: new THREE.CapsuleGeometry(0.05, 0.37, 4, 10),
    upper: new THREE.CapsuleGeometry(0.044, 0.21, 4, 10), fore: new THREE.CapsuleGeometry(0.037, 0.19, 4, 10),
    hand: new THREE.SphereGeometry(0.04, 10, 8), neck: new THREE.CylinderGeometry(0.048, 0.055, 0.1, 12),
    head: new THREE.SphereGeometry(0.108, 24, 18), hair: new THREE.SphereGeometry(0.118, 24, 14, 0, Math.PI * 2, 0, 1.75),
    tail: new THREE.CapsuleGeometry(0.075, 0.2, 4, 10), eye: new THREE.SphereGeometry(0.012, 8, 6), nose: new THREE.SphereGeometry(0.016, 8, 6),
    shoe: new THREE.BoxGeometry(0.1, 0.07, 0.25), badge: new THREE.PlaneGeometry(0.06, 0.08), collar: new THREE.TorusGeometry(0.06, 0.018, 6, 16)
  };
  const SKIN_AI = "#d9b08c";
  function nguoi(c) {
    const op = c.ghost ? { transparent: true, opacity: 0.55 } : null;
    const M = (col, r) => std(col, r, 0, op);
    const skin = M(c.skin || SKIN_AI, 0.55), shirt = M(c.shirt, 0.82), pants = M(c.pants, 0.8), hair = M(c.hair || "#1d1712", 0.6), shoe = M("#1a1614", 0.45);
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const mk = (geo, m, x, y, z, p) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; (p || body).add(me); return me; };
    const pelvis = new THREE.Group(); pelvis.position.y = 0.95; body.add(pelvis);
    mk(GEO.hip, pants, 0, 0.02, 0, pelvis).scale.set(1.05, 1, 0.72);
    const leg = s => { const hp = new THREE.Group(); hp.position.set(s * 0.09, 0, 0); pelvis.add(hp); mk(GEO.thigh, pants, 0, -0.22, 0, hp);
      const kn = new THREE.Group(); kn.position.y = -0.44; hp.add(kn); mk(GEO.shin, pants, 0, -0.22, 0, kn);
      const sh = mk(GEO.shoe, shoe, 0, -0.47, 0.05, kn); return { hp, kn, sh }; };
    const L = leg(-1), R = leg(1);
    const spine = new THREE.Group(); pelvis.add(spine);
    const torso = mk(GEO.torso, shirt, 0, 0.27, 0, spine); torso.scale.set(c.long ? 1.0 : 1.12, 1, 0.68);
    mk(GEO.collar, shirt, 0, 0.5, 0.0, spine).rotation.x = Math.PI / 2;
    const arm = s => { const sh = new THREE.Group(); sh.position.set(s * (c.long ? 0.185 : 0.205), 0.45, 0); spine.add(sh); mk(GEO.upper, shirt, 0, -0.145, 0, sh);
      const el = new THREE.Group(); el.position.y = -0.29; sh.add(el); mk(GEO.fore, shirt, 0, -0.13, 0, el); mk(GEO.hand, skin, 0, -0.28, 0, el); return { sh, el }; };
    const AL = arm(-1), AR = arm(1);
    mk(GEO.neck, skin, 0, 0.55, 0, spine);
    const head = new THREE.Group(); head.position.y = 0.66; spine.add(head);
    mk(GEO.head, skin, 0, 0, 0, head).scale.set(0.92, 1.12, 1);
    const hr = mk(GEO.hair, hair, 0, 0.012, -0.012, head); hr.rotation.x = -0.42; hr.scale.set(0.95, 1.08, 1.04);
    if (c.long) { mk(GEO.tail, hair, 0, -0.1, -0.075, head).scale.set(1.25, 1, 0.7); }
    const em = std("#1b1410", 0.4); mk(GEO.eye, em, -0.036, 0.015, 0.095, head); mk(GEO.eye, em, 0.036, 0.015, 0.095, head);
    mk(GEO.nose, skin, 0, -0.018, 0.105, head);
    if (c.ai) { const b = new THREE.Mesh(GEO.badge, new THREE.MeshBasicMaterial({ color: c.glow })); b.position.set(0.075, 0.32, 0.112); b.rotation.y = 0.05; spine.add(b);
      mk(new THREE.CylinderGeometry(0.004, 0.004, 0.2), std("#c9cfd6", 0.4, 0.5), 0.045, 0.43, 0.1, spine).rotation.z = 0.35; }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    // hướng mặc định khi ngồi/đứng tại chỗ
    let huong = 0; const b = ganBan(c.hx, c.hy);
    if (c.faceViewer) huong = 0; else if (b) huong = Math.atan2(b[0] - c.hx, b[1] - c.hy);
    root.add(g);
    return { g, body, pelvis, spine, head, L, R, AL, AR, huong, rot: huong, seed: c.seed || Math.random() * 6 };
  }
  const NG = new Map(); api.CH.forEach(c => NG.set(c.id, nguoi(c)));
  const lerpA = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
  function capNhatNguoi(dt, t) {
    api.CH.forEach(c => {
      const n = NG.get(c.id), vis = api.visible(c); n.g.visible = vis; if (!vis) return;
      const moving = c.path.length > 0, seated = !moving && c.seated && api.atHome(c), noi = c.sayUntil > api.now;
      n.g.position.set(c.x, 0, c.y);
      if (moving) { const [tx, ty] = c.path[0]; if (Math.hypot(tx - c.x, ty - c.y) > 0.01) n.huong = Math.atan2(tx - c.x, ty - c.y); }
      else if (api.atHome(c)) { const b = ganBan(c.hx, c.hy); n.huong = c.faceViewer ? 0 : (b ? Math.atan2(b[0] - c.hx, b[1] - c.hy) : n.huong); }
      n.rot = lerpA(n.rot, n.huong, Math.min(1, dt * 9)); n.g.rotation.y = n.rot;
      const s = n.seed;
      if (moving) {
        const ph = t * (c.me ? 10.5 : 8.5) + s, sw = 0.5;
        n.pelvis.position.y = 0.95 + Math.abs(Math.sin(ph)) * 0.03; n.spine.rotation.x = 0.06;
        n.L.hp.rotation.x = -sw * Math.sin(ph); n.R.hp.rotation.x = sw * Math.sin(ph);
        n.L.kn.rotation.x = Math.max(0, Math.sin(ph + 1.4)) * 0.9; n.R.kn.rotation.x = Math.max(0, -Math.sin(ph + 1.4)) * 0.9;
        n.AL.sh.rotation.x = 0.42 * Math.sin(ph); n.AR.sh.rotation.x = -0.42 * Math.sin(ph); n.AL.el.rotation.x = n.AR.el.rotation.x = -0.3;
        n.AL.sh.rotation.z = -0.06; n.AR.sh.rotation.z = 0.06; n.head.rotation.set(0, 0, 0);
      } else if (seated) {
        n.pelvis.position.y = 0.57; n.spine.rotation.x = 0.1 + Math.sin(t * 1.3 + s) * 0.01;
        n.L.hp.rotation.x = n.R.hp.rotation.x = -Math.PI / 2 + 0.05; n.L.kn.rotation.x = n.R.kn.rotation.x = Math.PI / 2 - 0.05;
        n.L.hp.rotation.y = -0.08; n.R.hp.rotation.y = 0.08;
        const ty = noi ? 0 : Math.sin(t * 13 + s) * 0.05;
        n.AL.sh.rotation.x = -0.45 + ty; n.AR.sh.rotation.x = -0.45 - ty; n.AL.el.rotation.x = n.AR.el.rotation.x = -1.05;
        n.AL.sh.rotation.z = 0.12; n.AR.sh.rotation.z = -0.12;
        if (noi) { n.AR.sh.rotation.x = -0.9 + Math.sin(t * 4) * 0.15; n.AR.el.rotation.x = -1.3; n.head.rotation.set(Math.sin(t * 5) * 0.06, 0.25 * Math.sin(t * 0.7), 0); }
        else n.head.rotation.set(0.12 + Math.sin(t * 0.5 + s) * 0.04, Math.sin(t * 0.3 + s) * 0.18, 0);
      } else {
        n.pelvis.position.y = 0.95; n.spine.rotation.x = Math.sin(t * 1.6 + s) * 0.012;
        n.L.hp.rotation.set(0, 0, 0.03); n.R.hp.rotation.set(0, 0, -0.03); n.L.kn.rotation.x = n.R.kn.rotation.x = 0.02;
        n.AL.sh.rotation.set(0.04, 0, -0.08); n.AR.sh.rotation.set(0.04, 0, 0.08); n.AL.el.rotation.x = n.AR.el.rotation.x = -0.18;
        if (noi) { n.AR.sh.rotation.x = -0.55 + Math.sin(t * 3.2) * 0.2; n.AR.el.rotation.x = -1.1; n.AL.el.rotation.x = -0.5; n.head.rotation.set(Math.sin(t * 5) * 0.07, 0, 0); }
        else n.head.rotation.set(0, Math.sin(t * 0.4 + s) * 0.3, 0);
      }
      n.pelvis.rotation.y = moving ? Math.sin(t * 8.5 + s) * 0.06 : 0;
    });
  }

  /* --- ngày / đêm, vai --- */
  function dem(on) {
    sun.intensity = on ? 0.15 : 2.4; sun.color.set(on ? "#8fa9ff" : "#ffe7c4");
    hemi.intensity = on ? 0.05 : 0.55; scene.environmentIntensity = on ? 0.08 : 0.6;
    lamps.forEach(l => { l.pl.intensity = on ? 22 : 0; l.shade.emissiveIntensity = on ? 1.6 : 0.15; });
    monitors.forEach(m => { m.emissiveIntensity = on ? 1.4 : 0.55; });
    cuaSo.forEach(w => { w.m.map.dispose(); w.m.map = tex(cityTex(on, w.seed)); w.m.needsUpdate = true; });
    renderer.toneMappingExposure = on ? 1.1 : 1.05;
  }
  function capNhatVai() {
    const bt = api.bangTuong();
    bang.forEach(b => { const d = bt[b.key]; if (!d) return; if (b.m.map) b.m.map.dispose(); b.m.map = tex(panelTex(d.title, d.lines, d.accent)); b.m.needsUpdate = true; });
    phuNoi.forEach(({ z, p }) => { p.visible = api.view(z).st === "noi"; });
  }

  /* --- camera --- */
  let bayTw = null, chamLuc = 0;
  function bay(t, p) { bayTw = { t0: controls.target.clone(), p0: cam.position.clone(), t1: t, p1: p, k: 0 }; }
  controls.addEventListener("start", () => { chamLuc = performance.now(); bayTw = null; });
  function focus(id) {
    const z = api.ZM[id]; if (!z) return; const c = new THREE.Vector3((z.x0 + z.x1) / 2, 0, (z.y0 + z.y1) / 2);
    const dir = cam.position.clone().sub(controls.target); dir.y = 0; if (dir.lengthSq() < 0.01) dir.set(0.5, 0, 1); dir.normalize();
    const dist = phone ? 14 : 11.5; bay(c, c.clone().add(dir.multiplyScalar(dist * 0.72)).add(new THREE.Vector3(0, dist * 0.72, 0)));
  }

  /* --- bấm chuột --- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), mat0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function phongTai(ev) {
    const r = gl.getBoundingClientRect(); ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam); if (!ray.ray.intersectPlane(mat0, hit)) return null;
    return api.Z.find(z => hit.x >= z.x0 && hit.x < z.x1 && hit.z >= z.y0 && hit.z < z.y1) || null;
  }
  let down = null, troId = null;
  gl.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; });
  gl.addEventListener("pointerup", e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) { const z = phongTai(e); if (z) api.chonPhong(z.id); } down = null; });
  gl.addEventListener("pointermove", e => { if (e.buttons || e.pointerType === "touch") return; const z = phongTai(e); const id = z ? z.id : null;
    if (id !== troId) { troId = id; vienTro.datPhong(z && id !== api.sel ? z : null); gl.style.cursor = z && api.view(z).go ? "pointer" : "grab"; } });
  gl.addEventListener("pointerleave", () => { troId = null; vienTro.datPhong(null); });

  /* --- kích thước --- */
  let W = 0, H = 0, DPR = 1;
  function resize() {
    const r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); DPR = Math.min(2, window.devicePixelRatio || 1);
    renderer.setSize(W, H, false); cam.aspect = W / H; datLech();
    ov.width = Math.round(W * DPR); ov.height = Math.round(H * DPR);
  }
  // lệch tâm hình (px) khi khung phòng che phần phải: phòng đang mở hiện ở phần mô hình còn lộ
  let lechX = 0;
  function datLech() { if (lechX) cam.setViewOffset(W, H, lechX, 0, W, H); else cam.clearViewOffset(); cam.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();

  /* --- chữ nổi --- */
  const g2 = ov.getContext("2d"), v3 = new THREE.Vector3();
  function chieu(x, y, z) { v3.set(x, y, z).project(cam); if (v3.z > 1) return null; return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H]; }
  function veChu() {
    g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, ov.width, ov.height); g2.setTransform(DPR, 0, 0, DPR, 0, 0);
    const xa = cam.position.distanceTo(controls.target);
    api.Z.forEach(z => { const p = chieu((z.x0 + z.x1) / 2, 2.85, (z.y0 + z.y1) / 2); if (p) api.nhanPhong(g2, z, p[0], p[1], xa > 26); });
    const ds = [];
    api.CH.forEach(c => { if (!api.visible(c)) return; const n = NG.get(c.id); const y = n.pelvis.position.y + 0.95; const p = chieu(c.x, y, c.y); if (!p) return;
      const d = cam.position.distanceTo(new THREE.Vector3(c.x, y, c.y)); ds.push({ c, p, d }); });
    (api.bangTen ? api.bangTen() : []).forEach(b => { const p = chieu(b.x, 1.05, b.y); if (p) api.veBangTen(g2, p[0], p[1], b.text); });
    ds.sort((a, b) => b.d - a.d).forEach(({ c, p, d }) => { if (c.sayUntil > api.now) api.bubble(g2, c, p[0], p[1]); else if (d < 22 || c.me) api.tag(g2, c, p[0], p[1]); else if (c.doiTac) api.tag(g2, c, p[0], p[1], true); });
  }

  /* --- vòng vẽ --- */
  let chay = true, last = performance.now(), frameN = 0;
  function loop(t) {
    if (!chay) return; requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000); last = t; frameN++;
    if (document.hidden || (api.phongMo() && (phone || !lechX) && frameN % 4)) return;
    if (bayTw) { bayTw.k = Math.min(1, bayTw.k + dt * 1.6); const e = 1 - Math.pow(1 - bayTw.k, 3);
      controls.target.lerpVectors(bayTw.t0, bayTw.t1, e); cam.position.lerpVectors(bayTw.p0, bayTw.p1, e); if (bayTw.k >= 1) bayTw = null; }
    const me = api.C.BAN;
    if (!bayTw && api.visible(me) && me.path.length && performance.now() - chamLuc > 2500) {
      const tg = new THREE.Vector3(me.x, 0, me.y), d = tg.clone().sub(controls.target).multiplyScalar(0.05); controls.target.add(d); cam.position.add(d);
    }
    controls.update();
    vienChon.datPhong(api.sel ? api.ZM[api.sel] : null);
    capNhatNguoi(dt, t / 1000);
    const k = Math.floor(t / 400); leds.forEach(l => { const on = ((l.k + k) % 5) !== 0; l.m.color.copy(on ? l.on : new THREE.Color("#2f3640")); });
    renderer.render(scene, cam); veChu();
  }

  datMacDinh(true); capNhatVai(); dem(api.night);
  // dựng shader sẵn để lần vẽ đầu không giật
  try { renderer.compile(scene, cam); } catch (e) { /* bỏ qua */ }
  requestAnimationFrame(loop);

  return {
    focus, dem, capNhatVai, vuaKhung: () => datMacDinh(false),
    lech(px) { lechX = Math.round(px) || 0; datLech(); },
    // dựng lại 1 nhân vật (đối tác thật thay người mờ minh hoạ: đổi độ trong suốt, màu áo)
    dungLaiNguoi(id) { const c = api.CH.find(x => x.id === id), cu = NG.get(id); if (!c || !cu) return; root.remove(cu.g);
      cu.g.traverse(o => { if (o.isMesh && o.material && o.material.dispose) o.material.dispose(); }); NG.set(id, nguoi(c)); },
    dong() { chay = false; ro.disconnect(); controls.dispose(); renderer.dispose(); gl.remove(); ov.remove(); },
    hien(on) { const dang = chay; gl.hidden = !on; ov.hidden = !on; chay = on; if (on) { resize(); if (!dang) { last = performance.now(); requestAnimationFrame(loop); } } },
    _scene: scene, _cam: cam, _controls: controls, _renderer: renderer, _ng: NG
  };
}
