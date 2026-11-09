/* ═══════════════════════════════════════════════════════════════
   Văn phòng ALN (ảo) — bản phối cảnh 3D (01/11/2026)

   Dựng lại CHÍNH mặt bằng của van-phong.js bằng three.js: cùng phòng,
   cùng đồ đạc (bản ghi L3), cùng nhân viên và cùng đường đi. van-phong.js
   vẫn giữ mọi logic (đi lại, lời thoại, nghe sự kiện trong khung, dữ liệu
   quản trị); module này chỉ VẼ và nhận bấm chuột.
   - 1 ô = 1 m. Chiều cao đồ đạc đổi từ đơn vị isometric: K = 0,058 m.
   - Người dựng bằng code (khớp nối hông, gối, vai, khuỷu): đi, ngồi gõ phím,
     đứng thở, nói. Từ 08/11/2026 nhân vật có mô hình thật (nguoi-3d.js, đợt 0: MyMy) thay
     người dựng bằng code khi nạp xong; nạp lỗi/máy yếu thì giữ người dựng bằng code.
   - Không ghi gì, không dùng innerHTML: chữ vẽ lên canvas.
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { taoNguoi3D } from "./nguoi-3d.js?v=5";

const K = 0.058, WH = 3.2, WK = WH / 86; let GW = 26, GH = 19; // GW, GH lấy từ mat-bang.js khi mở
const BRASS = "#c9a35b";
const nho = () => window.matchMedia("(pointer:coarse)").matches || window.innerWidth < 760;

/* ---------- cây mô hình 3D (08/11/2026) ----------
   mo-hinh-3d/cay.glb: 10 mẫu cây, cau, bụi, cây chậu, đá của Quaternius (CC0, xem mo-hinh-3d/NGUON.md).
   Mỗi mẫu tải MỘT lần rồi vẽ bằng InstancedMesh: thêm bao nhiêu cây cũng chỉ ~2 lần vẽ mỗi mẫu.
   Tải lỗi / quá 8 giây / máy bật tiết kiệm dữ liệu / ?cay=0 → dùng lại cây dựng bằng code như trước. */
const CAY_URL = new URL("../mo-hinh-3d/cay.glb?v=1", import.meta.url).href;
let cayHua = null;
function napCay() {
  if (cayHua) return cayHua;
  const tat = /[?&]cay=0\b/.test(location.search) || (navigator.connection && navigator.connection.saveData);
  cayHua = tat ? Promise.resolve(null) : new Promise(res => {
    const t = setTimeout(() => res(null), 8000);
    new GLTFLoader().load(CAY_URL, g => { clearTimeout(t); res(g.scene); }, undefined, () => { clearTimeout(t); res(null); });
  });
  return cayHua;
}
// Gom vị trí từng mẫu, cuối cùng dựng 1 InstancedMesh cho mỗi phần (thân, lá) của mẫu.
function taoRung(sc) {
  const MAU = new Map(), DAT = new Map();
  if (sc) { sc.updateMatrixWorld(true); sc.children.forEach(g => { const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), ps = [];
    g.traverse(m => { if (m.isMesh) ps.push({ geo: m.geometry, mat: m.material, base: new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld) }); });
    if (ps.length) MAU.set(g.name, ps); }); }
  const q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  return {
    coMoHinh: MAU.size > 0,
    co: ten => MAU.has(ten),
    // đặt mẫu tại (x, y, z), cao bằng s lần mẫu gốc, xoay quanh trục đứng; sy: ép dẹt theo chiều đứng
    dat(ten, x, y, z, s, quay, sy) { if (!MAU.has(ten)) return false; if (!DAT.has(ten)) DAT.set(ten, []);
      DAT.get(ten).push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(Y, quay || 0).clone(), new THREE.Vector3(s, s * (sy || 1), s))); return true; },
    dung(root) { let n = 0; const M = new THREE.Matrix4();
      DAT.forEach((ds, ten) => MAU.get(ten).forEach(p => { const im = new THREE.InstancedMesh(p.geo, p.mat, ds.length);
        ds.forEach((d, i) => im.setMatrixAt(i, M.multiplyMatrices(d, p.base))); im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); im.name = "cay_" + ten; root.add(im); n++; }));
      return n; }
  };
}

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
  const MB = api.MB; GW = MB.rong; GH = MB.sau; const CX = (MB.cua_chinh.x0 + MB.cua_chinh.x1) / 2, D = GH;
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
  /* Mức chất lượng (03/11/2026, Nam: máy tính bị giật nhiều): bắt đầu ở tỷ lệ điểm ảnh 1,5, máy vẽ chậm
     thì tự hạ dần xuống 1. Chỉ hạ, không tự nâng (tránh nhấp nháy lên xuống). */
  const MUC = [1.5, 1.25, 1];
  const cl = { muc: 0, mau: [], hoiLuc: 0 };
  function apMuc(i) { cl.muc = Math.max(0, Math.min(MUC.length - 1, i)); cl.mau = [];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MUC[cl.muc])); if (W) renderer.setSize(W, H, false); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MUC[0]));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Bóng nắng chỉ của nhà + đồ tĩnh: vẽ MỘT lần sau khi dựng, không vẽ lại mỗi khung.
  // Người dùng bóng tròn dưới chân (bongChan) nên không cần cập nhật bản đồ bóng khi đi lại.
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6;

  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const controls = new OrbitControls(cam, gl);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 4; controls.maxDistance = 95; controls.maxPolarAngle = Math.PI * 0.47; controls.minPolarAngle = 0.15;
  controls.screenSpacePanning = false;
  const CEN = new THREE.Vector3(GW / 2, 0, GH / 2);
  // Màn hình dọc (điện thoại): nhìn gần thẳng từ trên xuống, tòa nhà xoay dọc (cạnh dài 26 m theo chiều cao màn hình),
  // canh vừa bề ngang 20 m — thấy đủ mọi phòng. Màn hình ngang giữ góc phối cảnh chéo.
  function gocDoc() {
    const a = cam.aspect || 1, tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const d = Math.min(95, Math.max((GW / 2 + 0.6) / (tanV * a), (GH / 2 + 1.5) / tanV));
    const goc = 0.16; return { t: tamDoc(), p: tamDoc().add(new THREE.Vector3(0, Math.cos(goc) * d, Math.sin(goc) * d)) };
  }
  // dời tâm xuống phía dưới màn hình một chút: thanh "Bạn cần gì?" ở trên mỏng hơn cụm thẻ phòng ở dưới
  const tamDoc = () => new THREE.Vector3(CEN.x, 0, GH / 2 + 1.4);
  function datMacDinh(nhanh) {
    const doc = (cam.aspect || 1) < 0.9;
    const g = doc ? gocDoc() : null;
    const t = g ? g.t : CEN.clone(), p = g ? g.p : CEN.clone().add(new THREE.Vector3(23, phone ? 43 : 35, 38));
    if (nhanh) { controls.target.copy(t); cam.position.copy(p); controls.update(); } else bay(t, p);
  }

  /* --- ánh sáng --- */
  const hemi = new THREE.HemisphereLight("#fff4e6", "#3b2f25", 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffe7c4", 2.4); sun.position.copy(CEN).add(new THREE.Vector3(21, 17, 16)); sun.target.position.copy(CEN);
  sun.castShadow = true; const sm = phone ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 5, far: 130 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const lamps = [];

  /* --- nền, sàn --- */
  const root = new THREE.Group(); scene.add(root);
  const tinh = new THREE.Group(); // đồ tĩnh, gộp sau khi dựng
  const rung = taoRung(await napCay()); // cây mô hình (null → cây dựng bằng code)
  root.add(bx(GW + 0.4, 0.3, GH + 0.4, std("#2b2723", 0.8), GW / 2 - 0.2, -0.155, GH / 2 - 0.2));
  function san(x0, y0, x1, y1, m, lift) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), m); p.rotation.x = -Math.PI / 2;
    p.position.set((x0 + x1) / 2, lift || 0, (y0 + y1) / 2); p.receiveShadow = true; root.add(p); return p;
  }
  function sanGo(x0, y0, x1, y1, c1, c2, seed, lift) { const t = tex(woodTex(c1, c2, seed), [(x1 - x0) / 2, (y1 - y0) / 2]); san(x0, y0, x1, y1, new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }), lift); }
  function sanDa(x0, y0, x1, y1, base, vein, seed, slab, lift) { const t = tex(marbleTex(base, vein, seed, slab), [(x1 - x0) / 2, (y1 - y0) / 2]); san(x0, y0, x1, y1, new THREE.MeshStandardMaterial({ map: t, roughness: 0.16 }), lift); }
  function tham(x0, y0, x1, y1, c, b) { san(x0, y0, x1, y1, new THREE.MeshStandardMaterial({ map: tex(rugTex(c, b)), roughness: 0.95 }), 0.006); }
  function vien(y, x0, x1) { tinh.add(bx(x1 - x0, 0.004, 0.035, brass(), (x0 + x1) / 2, 0.003, y)); }
  // sàn, thảm, nẹp đồng: đọc mat-bang.js (cùng nguồn với bản 2D)
  const coM = std("#5f8a4a", 0.95);
  // sàn chồng lên nhau (lối đá, sàn gỗ trên cỏ sân trong): mỗi lớp sau nâng nhẹ để không nhấp nháy
  const chong = (f, i) => MB.san.slice(0, i).some(g => g.x0 < f.x1 && f.x0 < g.x1 && g.y0 < f.y1 && f.y0 < g.y1) ? 0.002 * i : 0;
  MB.san.forEach((f, i) => { const lift = chong(f, i);
    if (f.loai === "go") sanGo(f.x0, f.y0, f.x1, f.y1, f.c1, f.c2, f.seed, lift);
    else if (f.loai === "co") san(f.x0, f.y0, f.x1, f.y1, coM, lift);
    else sanDa(f.x0, f.y0, f.x1, f.y1, f.c1, f.c2, f.seed, f.slab, lift);
    if (f.kim_cuong) { const kc = std("#1f1d1c", 0.3); const gs = []; for (let x = f.x0 + 1.8; x < f.x1; x += 1.8) for (let y = f.y0 + 1.8; y < f.y1; y += 1.8) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), kc); m.rotation.set(-Math.PI / 2, 0, Math.PI / 4); m.position.set(x, 0.004, y); m.updateMatrix(); gs.push(m.geometry.applyMatrix4(m.matrix)); } if (gs.length) root.add(new THREE.Mesh(mergeGeometries(gs, false), kc)); }
  });
  MB.tham.forEach(([x0, y0, x1, y1, c, b]) => tham(x0, y0, x1, y1, c, b));
  // vườn sân trong: lối sỏi uốn cong (dải liền) + 2 sàn gỗ tròn
  { const V = MB.vuon, S = MB.duongCong(V.loi.diem, 8), nua = V.loi.rong / 2, pos = [], idx = [];
    S.forEach(([x, y], i) => { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      pos.push(x + nx * nua, 0.012, y + ny * nua, x - nx * nua, 0.012, y - ny * nua); if (i) { const k = 2 * i; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx); gg.computeVertexNormals();
    const soi = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ color: "#e4ddcf", roughness: 0.95, side: THREE.DoubleSide })); soi.receiveShadow = true; root.add(soi);
    const goSan = std("#8a6a48", 0.6); V.san_go.forEach(([cx, cy, r]) => { tinh.add(cyl(r, r, 0.06, goSan, cx, 0.03, cy, 48)); tinh.add(cyl(r + 0.04, r + 0.04, 0.04, std("#4f4a44", 0.6), cx, 0.02, cy, 48)); }); }
  MB.vien.forEach(([y, x0, x1]) => vien(y, x0, x1));
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
  for (let z = D + 1.5; z < D + 7; z += 0.9) { tinh.add(bx(3.2, 0.06, 0.7, VUON.da, CX, -0.27, z)); }
  tinh.add(bx(4.2, 0.08, 0.12, VUON.daVien, CX, -0.26, D + 7.3));
  // cổng: 2 trụ + dầm đồng
  [CX - 2.3, CX + 2.3].forEach(x => { tinh.add(bx(0.45, 2.2, 0.45, VUON.cot, x, 0.8, D + 7.3)); tinh.add(bx(0.55, 0.06, 0.55, brass(), x, 1.93, D + 7.3)); });
  tinh.add(bx(5.1, 0.12, 0.18, brass(), CX, 2.0, D + 7.3));
  // hàng rào xanh phía trước (chừa cổng) và bên phải
  { const l0 = -1.2, l1 = CX - 2.6, r0 = CX + 2.6, r1 = GW + 4.4; tinh.add(bx(l1 - l0, 0.7, 0.55, VUON.rao, (l0 + l1) / 2, 0.05, D + 7.3)); tinh.add(bx(r1 - r0, 0.7, 0.55, VUON.rao, (r0 + r1) / 2, 0.05, D + 7.3)); }
  tinh.add(bx(0.55, 0.7, D + 7, VUON.rao, GW + 4.2, 0.05, (D + 7) / 2));
  // bồn cây sát mặt trước nhà (chừa lối vào)
  [[0.4, CX - 2.4], [CX + 2.4, GW - 0.4]].forEach(([a, b]) => { tinh.add(bx(b - a, 0.3, 0.7, VUON.daVien, (a + b) / 2, -0.15, D + 0.55)); for (let x = a + 0.4; x < b - 0.2; x += 0.9) { const c = cauNho(0.32, (x * 7 | 0) % 2 ? VUON.la : VUON.laNhat, x, 0.18, D + 0.55); c.scale.set(1, 0.75, 1); tinh.add(c); } });
  const raPhai = MB.cua_phu.filter(c => c.canh === "phai").map(c => [c.y0 - 0.2, c.y1 + 0.2]).sort((p, q) => p[0] - q[0]);
  const doanPhai = []; { let a = 0.4; raPhai.forEach(([g0, g1]) => { if (g0 > a) doanPhai.push([GW + 0.4, a, g0]); a = g1; }); if (GH - 0.4 > a) doanPhai.push([GW + 0.4, a, GH - 0.4]); }
  doanPhai.forEach(([x, a, b]) => { tinh.add(bx(0.7, 0.3, b - a, VUON.daVien, x + 0.35, -0.15, (a + b) / 2)); for (let z = a + 0.4; z < b; z += 0.9) { const c = cauNho(0.32, (z * 7 | 0) % 2 ? VUON.la : VUON.laNhat, x + 0.35, 0.18, z); c.scale.set(1, 0.75, 1); tinh.add(c); } });
  // hồ cảnh bên phải lối vào
  tinh.add(bx(6.2, 0.22, 3.0, VUON.daVien, CX + 8.2, -0.2, D + 3.2)); { const n = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 2.6), VUON.nuoc); n.rotation.x = -Math.PI / 2; n.position.set(CX + 8.2, -0.08, D + 3.2); tinh.add(n); }
  [[CX + 6, D + 2.4], [CX + 7.2, D + 4.1], [CX + 10.4, D + 2.6]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 14), VUON.laNhat); l.position.set(x, -0.06, z); tinh.add(l); });
  // cây cau
  function cau(x, z, h) {
    h = h || 4.6; const r = rng(Math.round(x * 31 + z * 17));
    if (rung.co("cau")) { const hai = r() > 0.6; rung.dat(hai ? "cau2" : "cau", x, -0.3, z, h / (hai ? 4.77 : 4.95), r() * 6.28); return; }
    tinh.add(cyl(0.07, 0.11, h, VUON.than, x, -0.3 + h / 2, z, 10));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + r() * 0.3, la = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 4), i % 2 ? VUON.la : VUON.laNhat);
      la.scale.set(2.3, 0.12, 0.45); la.position.set(x + Math.cos(a) * 0.95, -0.3 + h - 0.15, z + Math.sin(a) * 0.95); la.rotation.set(0, -a, -0.35); tinh.add(la); }
    tinh.add(sph(0.16, VUON.than, x, -0.3 + h, z));
  }
  [[3.5, D + 3.5], [7.6, D + 5.2], [CX + 5.4, D + 5.6], [GW - 0.6, D + 5.4], [GW + 2.4, 4], [GW + 2.4, 8.2], [GW + 2.4, 20], [GW + 2.4, 32.6], [-1.6, D + 2.2]].forEach(([x, z], i) => cau(x, z, 4.2 + (i % 3) * 0.5));
  // đèn sân vườn (sáng hơn khi đêm)
  [[CX - 1.8, D + 2], [CX + 1.8, D + 2], [CX - 1.8, D + 5], [CX + 1.8, D + 5]].forEach(([x, z]) => { tinh.add(cyl(0.05, 0.06, 0.6, VUON.cot, x, 0, z, 8)); const d = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), VUON.den); d.position.set(x, 0.38, z); tinh.add(d); });

  // thềm cửa chính
  root.add(bx(MB.cua_chinh.x1 - MB.cua_chinh.x0 - 0.4, 0.22, 1.4, std("#d8d2c7", 0.4), CX, -0.11, D + 0.7));
  tinh.add(bx(MB.cua_chinh.x1 - MB.cua_chinh.x0, 0.01, 0.05, brass(), CX, 0.005, D + 0.02));

  /* --- tường sau (2 mặt) --- */
  const vua = std("#e6e0d6", 0.92), vuaB = std("#e1dbd0", 0.92), goTuong = std("#5a3720", 0.55), goTuongB = std("#4f301c", 0.55);
  tinh.add(bx(GW + 0.2, WH, 0.2, vua, GW / 2 - 0.1, WH / 2, -0.1));
  // tường trái chừa 2 cửa phụ ra vườn (MB.cua_phu, cạnh trái); trên cửa là lanh tô
  const DH = 2.4, raTrai = MB.cua_phu.filter(c => c.canh === "trai").map(c => [c.y0, c.y1]).sort((p, q) => p[0] - q[0]);
  const doanB = []; { let a = 0; raTrai.forEach(([g0, g1]) => { if (g0 > a) doanB.push([a, g0]); a = g1; }); if (GH > a) doanB.push([a, GH]); }
  doanB.forEach(([a, b]) => tinh.add(bx(0.2, WH, b - a, vuaB, -0.1, WH / 2, (a + b) / 2)));
  raTrai.forEach(([a, b]) => tinh.add(bx(0.2, WH - DH, b - a, vuaB, -0.1, DH + (WH - DH) / 2, (a + b) / 2)));
  tinh.add(bx(GW, 22 * WK, 0.04, goTuong, GW / 2, 11 * WK, 0.02)); tinh.add(bx(GW, 0.03, 0.05, brass(), GW / 2, 22.6 * WK, 0.025));
  doanB.forEach(([a, b]) => { tinh.add(bx(0.04, 22 * WK, b - a, goTuongB, 0.02, 11 * WK, (a + b) / 2)); tinh.add(bx(0.05, 0.03, b - a, brass(), 0.025, 22.6 * WK, (a + b) / 2)); });
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
  function tranhB(v0, v1, seed) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 512; const g = cv.getContext("2d"), r = rng(seed);
    g.fillStyle = "#f2ede4"; g.fillRect(0, 0, 256, 512); for (let i = 0; i < 5; i++) { g.fillStyle = ["#1f5c4a", BRASS, "#2b2b2e", "#b4563f"][Math.floor(r() * 4)]; g.beginPath(); g.arc(30 + r() * 196, 30 + r() * 452, 30 + r() * 70, 0, 7); g.fill(); }
    const w = v1 - v0, c = (v0 + v1) / 2, p = new THREE.Mesh(new THREE.PlaneGeometry(w, 30 * WK), new THREE.MeshStandardMaterial({ map: tex(cv), roughness: 0.8 }));
    p.rotation.y = Math.PI / 2; p.position.set(0.07, 55 * WK, c); root.add(p); tinh.add(bx(0.03, 30 * WK + 0.06, w + 0.06, std("#1c1c1e", 0.4), 0.05, 55 * WK, c));
  }
  MB.tuong_a.forEach(it => { if (it.k === "cua_so") cuaSoA(it.a0, it.a1, it.seed); else if (it.k === "ke") keSach(it.a0, it.a1, 24, 82, it.seed, "x"); else if (it.k === "bang") bangTuong(it.a0, it.a1, 32, 74, "x", it.key); });
  MB.tuong_b.forEach(it => { if (it.k === "cua_so") cuaSoB(it.a0, it.a1, it.seed); else if (it.k === "ke") keSach(it.a0, it.a1, 24, 82, it.seed, "z"); else if (it.k === "bang") bangTuong(it.a0, it.a1, 32, 74, "z", it.key); else if (it.k === "tranh") tranhB(it.a0, it.a1, it.seed); });

  /* --- vách kính --- */
  const kinh = new THREE.MeshPhysicalMaterial({ color: "#cfe3ee", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
  const GLH = 44 * K;
  const tamKinh = []; // gộp mọi tấm kính thành một khối (ít lần vẽ)
  function vachKinh(doc, toaDo, a0, a1, gaps) {
    // gộp các đoạn 0,9 m liền nhau thành tấm (MB.doanKinh bỏ đoạn rơi vào cửa)
    const tam = []; MB.doanKinh([doc ? "x" : "y", toaDo, a0, a1, gaps]).forEach(([s, e]) => { const t = tam[tam.length - 1]; if (t && Math.abs(t[1] - s) < 1e-6) t[1] = e; else tam.push([s, e]); });
    tam.forEach(([s, e]) => {
      const L = e - s, c = (s + e) / 2, pane = new THREE.Mesh(new THREE.PlaneGeometry(L, GLH), kinh); pane.renderOrder = 2;
      if (doc) { pane.rotation.y = Math.PI / 2; pane.position.set(toaDo, GLH / 2, c); } else pane.position.set(c, GLH / 2, toaDo);
      pane.updateMatrix(); tamKinh.push(pane.geometry.applyMatrix4(pane.matrix));
      const put = (w, h, d, m, y, off) => doc ? tinh.add(bx(d, h, w, m, toaDo, y, off)) : tinh.add(bx(w, h, d, m, off, y, toaDo));
      put(L, 0.05, 0.06, brass(), GLH, c); put(L, 0.05, 0.06, std("#1c1c1e", 0.5), 0.025, c);
      const n = Math.round(L / MB.buoc_kinh); for (let k = 0; k <= n; k++) put(0.03, GLH, 0.04, std("#2a2a2e", 0.4, 0.3), GLH / 2, s + L * k / n);
    });
  }

  /* --- đồ đạc từ bản ghi L3 --- */
  const banLam = []; // tâm bàn để quay ghế/người
  api.L3.forEach(({ t, a }) => { if (t === "desk" || t === "table" || t === "drafting" || t === "counter" || t === "quay" || t === "laBan" || t === "maquette") banLam.push([a[0] + a[2] / 2, a[1] + a[3] / 2]); });
  function ganBan(x, y) { let best = null, d0 = 1e9; banLam.forEach(([bxx, byy]) => { const d = Math.hypot(bxx - x, byy - y); if (d < d0) { d0 = d; best = [bxx, byy]; } }); return d0 < 2.6 ? best : null; }
  const monitors = [], leds = [], manHinh = new Map(); monitors.push(VUON.den); // đèn sân vườn sáng theo đêm
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
        const tint = o.tint || "#63c9b8"; if (!manHinh.has(tint)) { const sm = new THREE.MeshStandardMaterial({ color: "#0d1418", emissive: tint, emissiveIntensity: 0.55, roughness: 0.2 }); monitors.push(sm); manHinh.set(tint, { sm, gs: [] }); }
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34)); s.position.set(cx, h + 0.36, cz + 0.034); s.updateMatrix(); manHinh.get(tint).gs.push(s.geometry.applyMatrix4(s.matrix));
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
      if (rung.co("chau")) { const hai = r() > 0.5; rung.dat(hai ? "chau2" : "chau", cx, 0.5 * s, cz, (hai ? 0.62 : 0.55) * s, r() * 6.28, 1.15); return; }
      for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 8, 6), std(i % 3 ? "#3f7a52" : "#5c9a68", 0.7)); l.scale.set(1, 0.55, 0.45); l.position.set(cx + (r() - 0.5) * 0.6 * s, 0.6 * s + r() * 0.75 * s, cz + (r() - 0.5) * 0.6 * s); l.rotation.set(r() * 3, r() * 3, r() * 3); tinh.add(l); }
    },
    olive(x, y) {
      const cx = x + 0.4, cz = y + 0.4, r = rng(Math.round(x * 77 + y * 13));
      tinh.add(bx(0.8, 0.75, 0.8, std("#e6dfd3", 0.5), cx, 0.375, cz));
      if (rung.co("cay_tan2")) { tinh.add(bx(0.74, 0.02, 0.74, std("#3a2a1f", 1), cx, 0.755, cz)); rung.dat("cay_tan2", cx, 0.75, cz, 0.5, r() * 6.28); return; }
      const tr = cyl(0.035, 0.06, 1.6, std("#5b4636", 0.9), cx + 0.05, 0.75 + 0.8, cz); tr.rotation.z = -0.08; tinh.add(tr);
      for (let i = 0; i < 26; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17 + r() * 0.1, 0), std(r() > 0.5 ? "#8fa271" : "#6f8457", 0.8)); l.position.set(cx + (r() * 2 - 1) * 0.55, 1.75 + r() * 0.8, cz + (r() * 2 - 1) * 0.55); tinh.add(l); }
    },
    lamp(x, y) {
      tinh.add(cyl(0.16, 0.18, 0.03, dark(), x, 0.015, y)); tinh.add(cyl(0.015, 0.015, 1.6, brass(), x, 0.8, y));
      const shade = new THREE.MeshStandardMaterial({ color: "#f1e6cf", roughness: 0.7, emissive: "#ffcf8a", emissiveIntensity: 0.15, side: THREE.DoubleSide });
      root.add(cyl(0.16, 0.24, 0.3, shade, x, 1.72, y, 24));
      const pl = new THREE.PointLight("#ffc98a", 0, 7, 1.6); pl.position.set(x, 1.6, y); pl.visible = false; root.add(pl); lamps.push({ pl, shade });
    },
    sofa(x, y, w, d, col, back) {
      const m = std(col, 0.88), cxx = x + w / 2, czz = y + d / 2;
      tinh.add(bx(w, 0.42, d, m, cxx, 0.21, czz));
      const doc = back === "y" || back === "y2", ng = back === "y2" || back === "x2" ? -1 : 1; // ng = -1: lưng ở phía toạ độ lớn
      for (let k = 0; k < 3; k++) { const cs = std(col, 0.95); if (doc) tinh.add(bx(w / 3 - 0.05, 0.08, d - 0.36, cs, x + w * (k + 0.5) / 3, 0.46, czz + 0.12 * ng)); else tinh.add(bx(w - 0.36, 0.08, d / 3 - 0.05, cs, cxx + 0.12 * ng, 0.46, y + d * (k + 0.5) / 3)); }
      if (doc) { tinh.add(bx(w, 0.9, 0.3, m, cxx, 0.45, ng > 0 ? y + 0.15 : y + d - 0.15)); tinh.add(bx(0.24, 0.62, d, m, x + 0.12, 0.31, czz)); tinh.add(bx(0.24, 0.62, d, m, x + w - 0.12, 0.31, czz)); }
      else { tinh.add(bx(0.3, 0.9, d, m, ng > 0 ? x + 0.15 : x + w - 0.15, 0.45, czz)); tinh.add(bx(w, 0.62, 0.24, m, cxx, 0.31, y + 0.12)); tinh.add(bx(w, 0.62, 0.24, m, cxx, 0.31, y + d - 0.12)); }
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
    quay(x, y, w, d) { // quầy lễ tân MyMy: gỗ óc chó, mặt đá, nẹp đồng, logo ALN mặt trước
      const cxx = x + w / 2, czz = y + d / 2, H = 16 * K;
      tinh.add(bx(w, H - 0.04, d, std("#3b2416", 0.5), cxx, (H - 0.04) / 2, czz));
      const t = tex(marbleTex("#f6f2ea", "#a39888", 5, 2), [w / 2, d / 2]); tinh.add(bx(w + 0.08, 0.05, d + 0.08, new THREE.MeshStandardMaterial({ map: t, roughness: 0.15 }), cxx, H - 0.025, czz));
      tinh.add(bx(w, 0.05, 0.02, brass(), cxx, 13.6 * K, y + d + 0.006)); tinh.add(bx(w, 0.05, 0.02, brass(), cxx, 0.6 * K, y + d + 0.006));
      const p = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2.2, w * 0.66), 0.5), new THREE.MeshStandardMaterial({ map: tex(logoTex()), roughness: 0.45 })); p.position.set(cxx, 6.6 * K, y + d + 0.012); root.add(p);
      const den = new THREE.MeshStandardMaterial({ color: "#f3e3c0", emissive: "#ffd28a", emissiveIntensity: 0.5, roughness: 0.4 }); monitors.push(den);
      tinh.add(bx(w - 0.1, 0.012, 0.03, den, cxx, H - 0.06, y + d + 0.03));
    },
    ho(x0, y0, x1, y1) { // hồ cảnh sân trong: viền đá, mặt nước, lá súng
      const w = x1 - x0, d = y1 - y0, cxx = (x0 + x1) / 2, czz = (y0 + y1) / 2, vien = std("#bdb3a2", 0.6), H = 0.18;
      tinh.add(bx(w, H, 0.14, vien, cxx, H / 2, y0 + 0.07)); tinh.add(bx(w, H, 0.14, vien, cxx, H / 2, y1 - 0.07));
      tinh.add(bx(0.14, H, d - 0.28, vien, x0 + 0.07, H / 2, czz)); tinh.add(bx(0.14, H, d - 0.28, vien, x1 - 0.07, H / 2, czz));
      tinh.add(bx(w - 0.28, 0.02, d - 0.28, std("#1d3b44", 0.9), cxx, 0.01, czz));
      const nuoc = mat("nuocHo", () => new THREE.MeshStandardMaterial({ color: "#2f6676", roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.86 }));
      const n = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.28, d - 0.28), nuoc); n.rotation.x = -Math.PI / 2; n.position.set(cxx, 0.13, czz); root.add(n);
      const r = rng(Math.round(x0 * 31 + y0 * 7)), la = std("#6ea25a", 0.7);
      for (let i = 0; i < 7; i++) { const l = cyl(0.16 + r() * 0.08, 0.16, 0.012, la, x0 + 0.3 + r() * (w - 0.6), 0.14, y0 + 0.5 + r() * (d - 1), 14); tinh.add(l); }
    },
    laBan(x, y) { // la bàn trên bệ gỗ
      const cxx = x + 0.45, czz = y + 0.45, H = 12 * K;
      tinh.add(bx(0.7, H, 0.7, std("#3a2416", 0.55), cxx, H / 2, czz)); tinh.add(bx(0.9, 0.06, 0.9, std("#5a3720", 0.45), cxx, H + 0.03, czz));
      tinh.add(cyl(0.38, 0.38, 0.025, brass(), cxx, H + 0.075, czz, 32)); tinh.add(cyl(0.26, 0.26, 0.03, std("#2a1d14", 0.4), cxx, H + 0.08, czz, 32));
      tinh.add(cyl(0.11, 0.11, 0.035, std("#e2c48a", 0.3, 0.6), cxx, H + 0.085, czz, 24)); tinh.add(bx(0.4, 0.01, 0.02, std("#b4563f", 0.4), cxx, H + 0.105, czz));
    },
    mauVL(x, y, w) { // kệ mẫu vật liệu: gạch, gỗ, đá, sơn
      const H = 30 * K, cxx = x + w / 2; tinh.add(bx(w, H, 0.45, std("#3a2416", 0.55), cxx, H / 2, y + 0.225));
      const pal = ["#d9cfc0", "#8a5232", "#efebe4", "#5d3a22", "#9d9488", "#c9a35b", "#1f5c4a", "#b4563f", "#e6dfd3", "#3b5d47"], cv = document.createElement("canvas"), n = Math.floor((w - 0.42) / 0.38) + 1;
      cv.width = 64 * n; cv.height = 256; const g = cv.getContext("2d"); g.fillStyle = "#3a2416"; g.fillRect(0, 0, cv.width, 256); let k = 0;
      for (let r = 0; r < 4; r++) for (let i = 0; i < n; i++) { g.fillStyle = pal[k++ % pal.length]; g.fillRect(i * 64 + 6, 256 - (r + 1) * 64 + 6, 52, 52); }
      const p = new THREE.Mesh(new THREE.PlaneGeometry(n * 0.38, 4 * 6.4 * K), new THREE.MeshStandardMaterial({ map: tex(cv), roughness: 0.6 })); p.position.set(x + 0.12 + n * 0.19, 15.3 * K, y + 0.455); root.add(p);
    },
    loi(x, y, w, d) { // lõi thang dự phòng lên tầng 2
      const cxx = x + w / 2, czz = y + d / 2; tinh.add(bx(w, WH, d, std("#5a5650", 0.8), cxx, WH / 2, czz));
      tinh.add(bx(w + 0.02, 0.04, 0.02, brass(), cxx, WH - 0.2, y + d + 0.01));
      const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; const g = cv.getContext("2d"); g.fillStyle = "#3a3733"; g.fillRect(0, 0, 512, 128);
      g.fillStyle = "#e2c48a"; g.font = "600 56px 'JetBrains Mono',monospace"; g.textAlign = "center"; g.fillText("THANG", 256, 84);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshStandardMaterial({ map: tex(cv), roughness: 0.6 })); p.position.set(cxx, 2.0, y + d + 0.012); root.add(p);
    },
    denVuon(x, y) { // đèn vườn thấp, sáng khi đêm
      tinh.add(bx(0.12, 0.5, 0.12, VUON.cot, x, 0.25, y)); const d = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), VUON.den); d.position.set(x, 0.55, y); tinh.add(d);
    },
    gheCong(cx, cy, r, a0, a1) { // ghế cong trên sàn gỗ tròn
      const go = std("#9a7350", 0.6), n = 14, ro = r - 0.06, ri = r - 0.55, rm = (ro + ri) / 2, H = 7 * K;
      for (let k = 0; k < n; k++) { const a = (a0 + (a1 - a0) * (k + 0.5) / n) * Math.PI / 180, L = rm * ((a1 - a0) / n) * Math.PI / 180 + 0.02;
        const m = bx(ro - ri, H, L, go, cx + rm * Math.cos(a), 0.06 + H / 2, cy + rm * Math.sin(a)); m.rotation.y = -a; tinh.add(m); }
    },
    da(x, y, r) { // đá cảnh
      const q = rng(Math.round(x * 41 + y * 17));
      if (rung.co("da")) { const hai = q() > 0.5; rung.dat(hai ? "da2" : "da", x, -0.04, y, 2 * r / (hai ? 1.3 : 1.06), q() * 6.28, 0.7); return; }
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), std(q() > 0.5 ? "#8f8a82" : "#7a756e", 0.85));
      m.scale.set(1, 0.6 + q() * 0.25, 0.85 + q() * 0.2); m.rotation.y = q() * 3; m.position.set(x, r * 0.35, y); tinh.add(m);
    },
    cayVuon(x, y, s) { // cây xanh trồng thẳng xuống đất sân trong
      const q = rng(Math.round(x * 77 + y * 13));
      if (rung.co("cay_tan")) { const hai = q() > 0.55; rung.dat(hai ? "cay_tan2" : "cay_tan", x, 0, y, (hai ? 3.1 / 2.98 : 3.9 / 6.64) * s, q() * 6.28); return; }
      tinh.add(cyl(0.06 * s, 0.11 * s, 2.2 * s, VUON.than, x, 1.1 * s, y, 10));
      for (let i = 0; i < 18; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry((0.32 + q() * 0.22) * s, 0), q() > 0.5 ? VUON.la : VUON.laNhat);
        l.position.set(x + (q() * 2 - 1) * 0.9 * s, (2.0 + q() * 1.3) * s, y + (q() * 2 - 1) * 0.9 * s); tinh.add(l); }
    },
    bui(x, y, s) { // bụi cây thấp, vài bông hồng
      s = s || 1; const q = rng(Math.round(x * 53 + y * 29)), hoa = std("#e98fa8", 0.7);
      if (rung.co("bui")) { const hai = q() > 0.45; rung.dat(hai ? "bui_hoa" : "bui", x, 0, y, 0.85 * s / (hai ? 1.11 : 1.05), q() * 6.28); return; }
      for (let i = 0; i < 7; i++) { const k = q(), b = new THREE.Mesh(new THREE.SphereGeometry((0.14 + k * 0.1) * s, 7, 5), k > 0.5 ? VUON.la : VUON.laNhat);
        b.scale.set(1, 0.75, 1); b.position.set(x + (q() * 2 - 1) * 0.2 * s, 0.14 + k * 0.12, y + (q() * 2 - 1) * 0.2 * s); tinh.add(b);
        if (q() < 0.4) tinh.add(sph(0.05, hoa, b.position.x, b.position.y + 0.12, b.position.z)); }
    },
    glassX(X, y0, y1, gaps) { vachKinh(true, X, y0, y1, gaps); },
    glassY(Y, x0, x1, gaps) { vachKinh(false, Y, x0, x1, gaps); }
  };
  /* --- cửa phụ ra vườn ở hai đầu hành lang ngang (08/11/2026): 2 cánh kính, khung tối, tay nắm đồng,
     biển LỐI RA phát sáng, thềm đá và lối đá ra vườn. Kính gộp chung khối tamKinh. --- */
  const lan = std("#1f8a4c", 0.4, 0, { emissive: "#1f8a4c", emissiveIntensity: 0.6 });
  MB.cua_phu.forEach(c => {
    const X = c.canh === "trai" ? 0 : GW, ra = c.canh === "trai" ? -1 : 1, w = c.y1 - c.y0, cz = (c.y0 + c.y1) / 2;
    [c.y0 + 0.04, c.y1 - 0.04, cz].forEach((z, i) => tinh.add(bx(0.12, DH, i === 2 ? 0.05 : 0.08, dark(), X, DH / 2, z)));
    tinh.add(bx(0.14, 0.1, w, dark(), X, DH - 0.05, cz)); tinh.add(bx(0.3, 0.02, w, brass(), X, 0.01, cz));
    [cz - (w / 4), cz + (w / 4)].forEach(z => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w / 2 - 0.12, DH - 0.12), kinh); p.rotation.y = Math.PI / 2; p.position.set(X, DH / 2, z); p.updateMatrix(); tamKinh.push(p.geometry.applyMatrix4(p.matrix)); });
    [cz - 0.12, cz + 0.12].forEach(z => tinh.add(bx(0.03, 0.5, 0.03, brass(), X - ra * 0.06, 1.05, z)));
    tinh.add(bx(0.05, 0.16, 0.42, lan, X - ra * 0.04, DH + 0.16, cz)); monitors.push(lan);
    root.add(bx(1.2, 0.22, w - 0.4, std("#d8d2c7", 0.4), X + ra * 0.6, -0.11, cz));
    for (let k = 0; k < 3; k++) tinh.add(bx(0.7, 0.06, 1.1, VUON.da, X + ra * (1.7 + k * 0.95), -0.27, cz));
  });

  api.L3.forEach(({ t, a }) => { if (DO[t]) DO[t].apply(null, a); });
  manHinh.forEach(({ sm, gs }) => root.add(new THREE.Mesh(mergeGeometries(gs, false), sm)));
  if (tamKinh.length) { const k = new THREE.Mesh(mergeGeometries(tamKinh, false), kinh); k.renderOrder = 2; root.add(k); }

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
  rung.dung(root);

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
  // bóng tròn dưới chân, dùng chung cho mọi người (thay bóng nắng của người)
  const BONG_GEO = new THREE.CircleGeometry(0.3, 20), BONG_M = new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.22, depthWrite: false });
  function nguoi(c) {
    const op = c.ghost ? { transparent: true, opacity: 0.55 } : null;
    const M = (col, r) => std(col, r, 0, op);
    const skin = M(c.skin || SKIN_AI, 0.55), shirt = M(c.shirt, 0.82), pants = M(c.pants, 0.8), hair = M(c.hair || "#1d1712", 0.6), shoe = M("#1a1614", 0.45);
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const mk = (geo, m, x, y, z, p) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); (p || body).add(me); return me; };
    const bongChan = new THREE.Mesh(BONG_GEO, BONG_M); bongChan.rotation.x = -Math.PI / 2; bongChan.position.y = 0.014; bongChan.renderOrder = 2; g.add(bongChan);
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
    // hướng mặc định khi ngồi/đứng tại chỗ
    let huong = 0; const b = ganBan(c.hx, c.hy);
    if (c.faceViewer) huong = 0; else if (b) huong = Math.atan2(b[0] - c.hx, b[1] - c.hy);
    root.add(g);
    return { g, body, pelvis, spine, head, L, R, AL, AR, huong, rot: huong, seed: c.seed || Math.random() * 6 };
  }
  const NG = new Map(); api.CH.forEach(c => NG.set(c.id, nguoi(c)));
  const N3 = taoNguoi3D({ NG, api, phone, cl, layTam: () => controls.target, layCam: () => cam.position });
  const lerpA = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
  function capNhatNguoi(dt, t) {
    api.CH.forEach(c => {
      const n = NG.get(c.id), vis = api.visible(c); n.g.visible = vis; if (!vis) return;
      const moving = c.path.length > 0, seated = !moving && (c.seated && api.atHome(c) || !!c.ngoi), noi = c.sayUntil > api.now;
      n.g.position.set(c.x, 0, c.y);
      if (moving) { const [tx, ty] = c.path[0]; if (Math.hypot(tx - c.x, ty - c.y) > 0.01) n.huong = Math.atan2(tx - c.x, ty - c.y); }
      else if (c.nhin) n.huong = Math.atan2(c.nhin[0] - c.x, c.nhin[1] - c.y); // đang nói chuyện: quay về phía người kia
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
      N3.capNhat(c, moving, seated, noi, dt);
    });
  }

  /* --- ngày / đêm, vai --- */
  function dem(on) {
    sun.intensity = on ? 0.15 : 2.4; sun.color.set(on ? "#8fa9ff" : "#ffe7c4");
    hemi.intensity = on ? 0.05 : 0.55; scene.environmentIntensity = on ? 0.08 : 0.6;
    // ban ngày tắt hẳn đèn bàn khỏi cảnh (đèn cường độ 0 vẫn tính trong mọi điểm ảnh)
    lamps.forEach(l => { l.pl.visible = !!on; l.pl.intensity = on ? 22 : 0; l.shade.emissiveIntensity = on ? 1.6 : 0.15; });
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

  /* --- đi dạo: khi "Bạn" đang đi tới một phòng, máy quay theo sau lưng ngang tầm mắt, nhìn về phía trước
     như cảnh phim (dải đen trên dưới); tới nơi thì bay về khung nhìn của phòng. Khách kéo/xoay là nhả máy quay.
     Tắt được bằng nút "Đi dạo"; máy bật giảm chuyển động thì mặc định tắt. --- */
  let diDao = true, dangDao = false, daoK = 0;
  const huong = new THREE.Vector3(0, 0, 1), hTam = new THREE.Vector3(), pMuon = new THREE.Vector3(), tMuon = new THREE.Vector3();
  const DAO = phone ? { lui: 3.5, cao: 2.2, toi: 2.4 } : { lui: 3.0, cao: 1.85, toi: 2.8 };
  function diDaoBuoc(dt) {
    const me = api.C.BAN, diBo = api.visible(me) && me.path.length > 0, tuDo = performance.now() - chamLuc > 2500;
    if (diBo && tuDo && diDao) {
      bayTw = null; // đang bay về khung nhìn khác thì nhường cho máy quay đi dạo
      const [tx, ty] = me.path[0], hx = tx - me.x, hy = ty - me.y, hd = Math.hypot(hx, hy);
      if (!dangDao) { dangDao = true; controls.minDistance = 1; stage.classList.add("dang-dao"); if (hd > 0.05) huong.set(hx / hd, 0, hy / hd); }
      else if (hd > 0.05) huong.lerp(hTam.set(hx / hd, 0, hy / hd), 1 - Math.exp(-dt * 3)).normalize();
      const a = 1 - Math.exp(-dt * (cam.position.y < 4 ? 4.5 : 2.8)); // từ trên cao hạ xuống êm, xuống tới tầm mắt thì bám sát
      pMuon.set(me.x - huong.x * DAO.lui, DAO.cao, me.y - huong.z * DAO.lui);
      tMuon.set(me.x + huong.x * DAO.toi, 1.15, me.y + huong.z * DAO.toi);
      cam.position.lerp(pMuon, a); controls.target.lerp(tMuon, a);
      daoK = Math.min(1, daoK + dt * 1.4); return;
    }
    daoK = Math.max(0, daoK - dt * 1.4);
    if (dangDao) {
      dangDao = false; stage.classList.remove("dang-dao");
      // tới nơi (khách không chạm máy quay): bay về khung nhìn phòng đang chọn
      if (!diBo && tuDo && !bayTw) { if (api.sel && api.ZM[api.sel]) focus(api.sel); else datMacDinh(false); }
    }
    if (controls.minDistance < 4 && cam.position.distanceTo(controls.target) >= 4) controls.minDistance = 4;
    if (!diDao && !bayTw && diBo && tuDo) {
      const d = hTam.set(me.x, 0, me.y).sub(controls.target).multiplyScalar(0.05); controls.target.add(d); cam.position.add(d);
    }
  }
  function veDaiPhim() {
    if (daoK <= 0) return; const e = daoK * daoK * (3 - 2 * daoK), h = Math.round(H * (phone ? 0.07 : 0.09) * e);
    g2.fillStyle = "#000"; g2.fillRect(0, 0, W, h); g2.fillRect(0, H - h, W, h);
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
    renderer.setSize(W, H, false); cam.aspect = W / H; datLech(); renderer.shadowMap.needsUpdate = true;
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
    veDaiPhim();
    ds.sort((a, b) => b.d - a.d).forEach(({ c, p, d }) => { if (c.sayUntil > api.now) api.bubble(g2, c, p[0], p[1]); else if (c.me && dangDao) return; else if (c.me || d < 7 || api.hienTen(c) && d < 30) api.tag(g2, c, p[0], p[1]); else if (c.doiTac) api.tag(g2, c, p[0], p[1], d >= 22); });
  }

  /* --- vòng vẽ --- */
  const LED_TAT = new THREE.Color("#2f3640");
  // đo thời gian giữa các khung thật sự vẽ; trung vị 40 khung > 30 ms (dưới ~33 khung/giây) thì hạ 1 mức
  let truocVe = 0;
  function doToc(t) {
    if (truocVe && t - truocVe < 250) cl.mau.push(t - truocVe); truocVe = t;
    if (cl.mau.length < 40) return;
    const s = cl.mau.slice().sort((a, b) => a - b), tv = s[s.length >> 1]; cl.mau = [];
    if (tv > 30 && cl.muc < MUC.length - 1 && t - cl.hoiLuc > 3000) {
      cl.hoiLuc = t; apMuc(cl.muc + 1);
      try { (window.dataLayer = window.dataLayer || []).push({ event: "aln_vp_3d_tu_giam", muc: cl.muc }); } catch (e) { /* bỏ qua */ }
    }
  }
  let chay = true, last = performance.now(), frameN = 0;
  function loop(t) {
    if (!chay) return; requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000); last = t; frameN++;
    if (document.hidden || (api.phongMo() && (phone || !lechX) && frameN % 4)) { truocVe = 0; return; }
    if (bayTw) { bayTw.k = Math.min(1, bayTw.k + dt * 1.6); const e = 1 - Math.pow(1 - bayTw.k, 3);
      controls.target.lerpVectors(bayTw.t0, bayTw.t1, e); cam.position.lerpVectors(bayTw.p0, bayTw.p1, e); if (bayTw.k >= 1) bayTw = null; }
    diDaoBuoc(dt);
    controls.update();
    vienChon.datPhong(api.sel ? api.ZM[api.sel] : null);
    capNhatNguoi(dt, t / 1000); N3.soat();
    const k = Math.floor(t / 400); leds.forEach(l => { const on = ((l.k + k) % 5) !== 0; l.m.color.copy(on ? l.on : LED_TAT); });
    renderer.render(scene, cam); veChu();
    doToc(t);
  }

  datMacDinh(true); capNhatVai(); dem(api.night); renderer.shadowMap.needsUpdate = true;
  // dựng shader sẵn để lần vẽ đầu không giật
  try { renderer.compile(scene, cam); } catch (e) { /* bỏ qua */ }
  requestAnimationFrame(loop);

  return {
    focus, dem, capNhatVai, vuaKhung: () => datMacDinh(false),
    datDiDao(on) { diDao = !!on; },
    lech(px) { lechX = Math.round(px) || 0; datLech(); },
    // dựng lại 1 nhân vật (đối tác thật thay người mờ minh hoạ: đổi độ trong suốt, màu áo)
    dungLaiNguoi(id) { const c = api.CH.find(x => x.id === id), cu = NG.get(id); if (!c || !cu) return; root.remove(cu.g);
      cu.g.traverse(o => { if (o.isMesh && o.material && o.material.dispose) o.material.dispose(); }); NG.set(id, nguoi(c)); N3.gan(id); },
    dong() { chay = false; stage.classList.remove("dang-dao"); ro.disconnect(); controls.dispose(); renderer.dispose(); gl.remove(); ov.remove(); },
    hien(on) { const dang = chay; gl.hidden = !on; ov.hidden = !on; chay = on; if (on) { resize(); if (!dang) { last = performance.now(); truocVe = 0; requestAnimationFrame(loop); } } },
    cl, apMuc, cayMoHinh: rung.coMoHinh,
    // nhân vật mô hình thật: trạng thái nạp + cho làm 1 động tác ngắn (chao, chi_tay, gat_dau)
    nguoi3D: id => N3.trang(id), dongTac: (id, ten) => N3.dongTac(id, ten), doiNguoi: (id, ma) => N3.doi(id, ma),
    _scene: scene, _cam: cam, _controls: controls, _renderer: renderer, _ng: NG
  };
}
