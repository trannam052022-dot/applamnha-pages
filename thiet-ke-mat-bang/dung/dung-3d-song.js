/* ALN · Dựng mặt bằng — "sống trong nhà" (25/10/2026)
 * Ngày và đêm theo giờ, mùa khô / mùa mưa (vị trí TP.HCM), bật tắt đèn, quạt trần, vòi nước, sen, bồn tắm,
 * xả bồn cầu, tivi, bếp, đóng mở cửa; âm thanh tổng hợp bằng WebAudio (không tải file); không đi xuyên tường.
 * Dùng chung đối tượng của dung-3d.js qua ctx. Không gọi máy chủ, không lưu gì vào bản vẽ.
 * Giả định: phía trên bản vẽ (−z) là hướng Bắc.
 */
import * as THREE from 'three';

const VI_DO = 10.8 * Math.PI / 180;                // TP.HCM
const XICH_VI = { kho: -12, mua: 16 };              // giữa mùa khô (tháng 1–2) / mùa mưa (tháng 8)
const MOC = [['sang', 'Sáng', 6.5], ['trua', 'Trưa', 12], ['chieu', 'Chiều', 16.5], ['hoang_hon', 'Hoàng hôn', 17.5], ['toi', 'Tối', 20], ['dem', 'Đêm', 23]];
const MAU_DEN = { am: ['Vàng ấm', '#ffc98a'], trung: ['Trung tính', '#ffe2bf'], trang: ['Trắng', '#eef3ff'] };
const TEN = { voi: 'Vòi nước', sen: 'Sen tắm', bon: 'Bồn tắm', xa: 'Xả nước', tivi: 'Tivi', bep: 'Bếp', cua: 'Cửa', quat: 'Quạt', den: 'Đèn' };
const TEN_DEN = { ngu: 'Đèn ngủ', ban_an: 'Đèn bàn ăn', guong: 'Đèn gương' };

function ss(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function khongDau(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
export function huongMatTroi(gio, mua) { // vector đơn vị hướng tới mặt trời: Đông = +x, Bắc = −z, lên = +y
  const d = XICH_VI[mua] * Math.PI / 180, H = (gio - 12) * 15 * Math.PI / 180;
  const E = -Math.cos(d) * Math.sin(H), N = Math.cos(VI_DO) * Math.sin(d) - Math.sin(VI_DO) * Math.cos(d) * Math.cos(H);
  const U = Math.sin(VI_DO) * Math.sin(d) + Math.cos(VI_DO) * Math.cos(d) * Math.cos(H);
  return new THREE.Vector3(E, U, -N).normalize();
}
function thuong(s) { const w = String(s).split(' ')[0]; return w.length > 1 && w === w.toUpperCase() ? s : s.charAt(0).toLowerCase() + s.slice(1); }
function gioChu(g) { const h = Math.floor(g + 1e-6) % 24, m = Math.round((g - Math.floor(g + 1e-6)) * 60); return h + ':' + String(m === 60 ? 0 : m).padStart(2, '0'); }
function buoi(g) { return g < 5 ? 'Đêm khuya' : g < 10.5 ? 'Buổi sáng' : g < 13.5 ? 'Buổi trưa' : g < 17.25 ? 'Buổi chiều' : g < 19 ? 'Hoàng hôn' : g < 22 ? 'Buổi tối' : 'Đêm khuya'; }
function taoEl(ten, lop, cha, chu) { const e = document.createElement(ten); if (lop) e.className = lop; if (chu !== undefined) e.textContent = chu; if (cha) cha.appendChild(e); return e; }
function svg(cha, ds) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  ds.split('|').forEach((d) => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.appendChild(p); });
  cha.appendChild(s); return s;
}
const ICON = {
  troi: 'M12 4V2|M12 22v-2|M4 12H2|M22 12h-2|M5.6 5.6 4.2 4.2|M19.8 19.8l-1.4-1.4|M5.6 18.4l-1.4 1.4|M19.8 4.2l-1.4 1.4|M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  trang: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  mua: 'M7 15a4 4 0 1 1 .9-7.9A5 5 0 0 1 17.5 9 3.5 3.5 0 0 1 17 16H7|M8 19l-1 2|M12 19l-1 2|M16 19l-1 2',
  den: 'M9 18h6|M10 21h4|M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  voi: 'M4 9h9a3 3 0 0 1 3 3v1|M7 9V6h3|M16 16c0 1.5-1 2.5-1 3.5a1 1 0 0 0 2 0c0-1-1-2-1-3.5z',
  sen: 'M6 4h5a5 5 0 0 1 5 5|M12 13l-1 2|M15 13l-.5 2|M18 13v2|M13 17l-1 2|M17 17l-.5 2|M11 9h9',
  bon: 'M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z|M6 12V6a2 2 0 0 1 4 0',
  xa: 'M7 4h10v6H7z|M6 10h12l-1.5 6a3 3 0 0 1-3 2.3h-3A3 3 0 0 1 7.5 16z',
  tivi: 'M3 6h18v11H3z|M8 21h8|M12 17v4',
  bep: 'M12 3c2 3 4 4.5 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 1.5 1 2.5 2 2.5 0-2.5-1-4.5 0-6.5z',
  cua: 'M6 3h10v18H6z|M13 12h.01|M16 21h3',
  quat: 'M12 12m-1.6 0a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0|M12 10.4C11 7 12 3 15 3c2 0 2 2.5 0 4l-1.6 4|M13.6 12.8c2.6 2.4 4.2 6 1.8 7.6-1.6 1-3-.9-2.6-3.3l.6-3.9|M10.6 12.6C7.4 13.3 4 12 4.4 9.3c.3-1.9 2.6-1.8 3.8.3l2 3',
  loa: 'M4 9h4l5-4v14l-5-4H4z|M16.5 8.5a5 5 0 0 1 0 7|M19 6a8.5 8.5 0 0 1 0 12',
  loaTat: 'M4 9h4l5-4v14l-5-4H4z|M17 9l5 6|M22 9l-5 6',
  dong: 'M6 6l12 12|M18 6 6 18'
};

/* ---------------- âm thanh tổng hợp ---------------- */
function taoAmThanh() {
  const A = { ctx: null, bat: true, vong: new Map() };
  A.mo = function () { // chỉ gọi trong lượt bấm của người dùng (chính sách tự phát của trình duyệt)
    if (!A.bat) return null;
    if (!A.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      try { A.ctx = new C(); } catch (e) { return null; }
      A.chinh = A.ctx.createGain(); A.chinh.gain.value = 0.9; A.chinh.connect(A.ctx.destination);
      const n = A.ctx.sampleRate * 2, b = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = b.getChannelData(0);
      let nau = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; nau = (nau + 0.02 * w) / 1.02; d[i] = i % 2 ? w * 0.5 : w * 0.5 + nau * 2.5; }
      A.on = b;
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  };
  const nguon = () => { const s = A.ctx.createBufferSource(); s.buffer = A.on; s.loop = true; s.loopStart = Math.random(); return s; };
  const loc = (kieu, f, q) => { const l = A.ctx.createBiquadFilter(); l.type = kieu; l.frequency.value = f; if (q) l.Q.value = q; return l; };
  A.lap = function (khoa, kieu) { // tiếng chạy liên tục; âm lượng chỉnh từ ngoài qua A.am(khoa, v)
    if (!A.ctx || A.vong.has(khoa)) return;
    const s = nguon(), g = A.ctx.createGain(); g.gain.value = 0;
    let dau = s;
    if (kieu === 'nuoc') { const a = loc('bandpass', 2200, 0.6), b = loc('highshelf', 4000); b.gain.value = 6; s.connect(a); a.connect(b); dau = b; }
    else if (kieu === 'quat') { const a = loc('lowpass', 420, 0.7); s.connect(a); dau = a; const o = A.ctx.createOscillator(), og = A.ctx.createGain(); o.frequency.value = 3.2; og.gain.value = 0.25; o.connect(og); og.connect(g.gain); o.start(); g._lfo = o; }
    else if (kieu === 'mua') { const a = loc('highpass', 700), b = loc('lowpass', 7000); s.connect(a); a.connect(b); dau = b; }
    else if (kieu === 'hut') { const a = loc('lowpass', 650, 0.8); s.connect(a); dau = a; }
    else if (kieu === 'tivi') { const a = loc('bandpass', 1100, 2.2); s.connect(a); dau = a; }
    dau.connect(g); g.connect(A.chinh); s.start();
    A.vong.set(khoa, { s, g, kieu });
  };
  A.am = function (khoa, v) { const x = A.vong.get(khoa); if (x) x.g.gain.setTargetAtTime(Math.max(0, v), A.ctx.currentTime, 0.12); };
  A.tat = function (khoa) {
    const x = A.vong.get(khoa); if (!x) return; A.vong.delete(khoa);
    x.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.08);
    setTimeout(() => { try { x.s.stop(); if (x.g._lfo) x.g._lfo.stop(); x.g.disconnect(); } catch (e) { /* đã dừng */ } }, 400);
  };
  A.mot = function (kieu, v) { // tiếng một lần: xả nước, sấm, cửa
    if (!A.ctx || !A.bat) return;
    const t = A.ctx.currentTime, g = A.ctx.createGain(); g.connect(A.chinh); v = v === undefined ? 1 : v;
    if (kieu === 'cua') {
      const o = A.ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); o.start(t); o.stop(t + 0.2); return;
    }
    const s = nguon(), l = loc('lowpass', kieu === 'sam' ? 260 : 2600, 0.8); s.connect(l); l.connect(g);
    if (kieu === 'xa') {
      l.frequency.setValueAtTime(2600, t); l.frequency.exponentialRampToValueAtTime(380, t + 2.8);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55 * v, t + 0.15); g.gain.setTargetAtTime(0.0001, t + 1.6, 0.6);
      s.start(t); s.stop(t + 4.2);
    } else { // sấm: ầm dài, có vài nhịp
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.25); g.gain.setTargetAtTime(0.35 * v, t + 0.5, 0.3); g.gain.setTargetAtTime(0.0001, t + 1.2, 0.9);
      s.start(t); s.stop(t + 5.5);
    }
  };
  A.datBat = function (b) { A.bat = b; if (A.ctx) A.chinh.gain.setTargetAtTime(b ? 0.9 : 0, A.ctx.currentTime, 0.05); };
  A.dong = function () { A.vong.forEach((x, k) => A.tat(k)); if (A.ctx) setTimeout(() => { try { A.ctx.close(); } catch (e) { /* bỏ qua */ } }, 500); };
  return A;
}

/* ---------------- kết cấu dùng chung ---------------- */
function vetNuoc() { // vệt nước chảy: sọc sáng tối theo chiều dọc
  const c = document.createElement('canvas'); c.width = 16; c.height = 128; const g = c.getContext('2d');
  for (let y = 0; y < 128; y++) { const a = 0.45 + 0.4 * Math.sin(y * 0.55) * Math.sin(y * 0.17 + 1.3); g.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; g.fillRect(0, y, 16, 1); }
  for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 128), 1, 6 + Math.random() * 10); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2.5); return t;
}
function xoayNuoc() { // mặt nước xoáy khi xả bồn cầu
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#bcd9e2'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3;
  for (let k = 0; k < 4; k++) { g.beginPath(); for (let a = 0; a < 7; a += 0.1) { const r = 6 + a * 8, x = 64 + Math.cos(a + k * 1.57) * r, y = 64 + Math.sin(a + k * 1.57) * r; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
  return new THREE.CanvasTexture(c);
}
function vongMo() { // vệt mờ cánh quạt khi quay nhanh: đậm ở vành cánh, trong suốt ở giữa và mép ngoài
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, '#000'); gr.addColorStop(0.24, '#000'); gr.addColorStop(0.34, '#bbb'); gr.addColorStop(0.86, '#999'); gr.addColorStop(0.98, '#000'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function nenTroi() { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, t }; }

/* ================================================================ */
export function taoSong(ctx) {
  const { scene, camera, renderer, nang, troi, M, nho, khung, goc } = ctx;
  const A = taoAmThanh();
  const giamDong = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = { gio: 9.5, mua: 'kho', mauDen: 'am', tw: null, canTroi: true, canDen: true, chop: 0, henChop: 8 + Math.random() * 8 };
  const trangThai = new Map();          // khoá thiết bị → bật/tắt, giữ qua lần dựng lại
  let nha = null, ds = [], quat = [], phongDen = new Map(), mua = null;
  const ray = new THREE.Raycaster(), tam = new THREE.Vector3(), tam2 = new THREE.Vector3();

  /* ---- vật liệu hiệu ứng ---- */
  const texVet = vetNuoc(), texXoay = xoayNuoc();
  const VL = {
    nuoc: new THREE.MeshStandardMaterial({ color: '#eef9ff', map: texVet, transparent: true, opacity: 0.85, roughness: 0.04, emissive: '#9cc6d6', emissiveIntensity: 0.22, depthWrite: false, envMapIntensity: 1.6 }),
    mat: new THREE.MeshStandardMaterial({ color: '#a9d4df', transparent: true, opacity: 0.55, roughness: 0.03, depthWrite: false, envMapIntensity: 1.5 }),
    xoay: new THREE.MeshStandardMaterial({ map: texXoay, transparent: true, opacity: 0.9, roughness: 0.05, depthWrite: false }),
    giot: new THREE.LineBasicMaterial({ color: '#e6f5ff', transparent: true, opacity: 0.65, depthWrite: false }),
    lua: new THREE.MeshBasicMaterial({ color: '#5aa2ff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
    luaVang: new THREE.MeshBasicMaterial({ color: '#ff9b45', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    an: new THREE.MeshBasicMaterial({ visible: false }),
    mo: new THREE.MeshBasicMaterial({ color: '#8a6440', alphaMap: vongMo(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    mua: new THREE.LineBasicMaterial({ color: '#cfdbe6', transparent: true, opacity: 0.45, depthWrite: false, fog: false })
  };

  /* ---- bể đèn cố định: số đèn không đổi → không biên dịch lại shader khi bật tắt ---- */
  const SO_DEN = nho ? 4 : 8, be = [];
  for (let i = 0; i < SO_DEN; i++) { const l = new THREE.PointLight('#ffd9a8', 0, 9, 2); l.position.set(0, -50, 0); scene.add(l); be.push(l); }

  /* ---- trời: nền chuyển màu, sao ---- */
  const nen = nenTroi(); scene.background = nen.t;
  const sao = (() => {
    const n = 500, p = new Float32Array(n * 3), r = ngauNhien(7);
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, b = Math.asin(0.1 + r() * 0.9), R = 380; p[i * 3] = Math.cos(a) * Math.cos(b) * R; p[i * 3 + 1] = Math.sin(b) * R; p[i * 3 + 2] = Math.sin(a) * Math.cos(b) * R; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pt = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: nho ? 2.2 : 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    pt.frustumCulled = false; scene.add(pt); return pt;
  })();
  function ngauNhien(h) { let s = h >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }

  const c1 = new THREE.Color(), c2 = new THREE.Color(), c3 = new THREE.Color();
  const tron = (a, b, k, out) => out.set(a).lerp(c3.set(b), k);
  function apDungTroi() {
    const dir = huongMatTroi(S.gio, S.mua), alt = Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180 / Math.PI;
    const ngay = ss(-5, 12, alt), dem = 1 - ss(-10, -1, alt), hh = Math.exp(-Math.pow((alt - 3) / 7, 2)), m = S.mua === 'mua' ? 1 : 0;
    // màu nền: đỉnh trời và chân trời
    const dinh = tron('#0b1631', '#a9c8e4', ngay, new THREE.Color()); dinh.lerp(c3.set('#4d628f'), hh * 0.45 * (1 - m));
    const chan = tron('#1a2643', '#edf2f5', ngay, new THREE.Color()); chan.lerp(c3.set('#f2a873'), hh * 0.75 * (1 - m));
    if (m) { dinh.lerp(c3.set(ngay > 0.5 ? '#8a939d' : '#1c2128'), 0.78); chan.lerp(c3.set(ngay > 0.5 ? '#b3b9be' : '#262b32'), 0.78); }
    const chop = S.chop; if (chop > 0) { dinh.lerp(c3.set('#dfe6ff'), chop * 0.8); chan.lerp(c3.set('#eef1ff'), chop * 0.8); }
    const g = nen.c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#' + dinh.getHexString()); gr.addColorStop(0.62, '#' + chan.getHexString()); gr.addColorStop(1, '#' + chan.getHexString());
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256); nen.t.needsUpdate = true;
    if (scene.fog) scene.fog.color.copy(chan);
    // mặt trời hoặc trăng
    const b = nha ? nha.bien : { cx: 0, cz: 0, R: 8 }, R = b.R;
    let huong = dir, cuong, mau;
    if (alt > -1.5) { cuong = 2.6 * ss(-1.5, 9, alt); mau = tron('#ff8f4f', '#fff1dc', ss(0, 28, alt), c1); }
    else { huong = tam2.set(-0.35, 0.82, 0.45).normalize(); cuong = 0.38 * dem; mau = c1.set('#aabbff'); }
    if (m) cuong *= alt > -1.5 ? 0.2 : 0.35;
    nang.color.copy(mau); nang.intensity = cuong;
    const xa = R * 3 + 12; nang.position.set(b.cx + huong.x * xa, huong.y * xa, b.cz + huong.z * xa); nang.target.position.set(b.cx, 0, b.cz); nang.target.updateMatrixWorld();
    const sc = nang.shadow.camera; sc.far = xa + R * 3 + 10; sc.updateProjectionMatrix();
    // ánh sáng trời tán xạ
    troi.color.copy(dinh).lerp(c3.set('#ffffff'), 0.5 * ngay).lerp(c3.set('#ffb070'), hh * 0.55 * (1 - m)); troi.groundColor.set(ngay > 0.3 ? '#cfc6b8' : '#2a2c33').lerp(c3.set('#b07a52'), hh * 0.4 * (1 - m));
    troi.intensity = (0.1 + 0.62 * ngay) * (m ? 0.82 : 1) + chop * 1.8;
    scene.environmentIntensity = (0.05 + 0.5 * ngay) * (m ? 0.75 : 1) + chop * 0.6;
    sao.material.opacity = dem * (1 - m) * 0.9;
    if (M.datNen) { M.datNen.color.set(m ? '#9da69d' : '#d7dcd6').multiplyScalar(0.35 + 0.65 * Math.max(ngay, 0.25)); M.datNen.roughness = m ? 0.4 : 1; }
    S.alt = alt; S.toi = ngay < 0.35;
    capNhatHuy();
  }

  /* ---- đèn theo giờ ---- */
  function denTheoGio(gioDich) {
    const g = gioDich === undefined ? S.gio : gioDich, sinhHoat = (n) => /khach|sinh hoat|bep|an\b|phong an|tho/.test(n);
    ds.forEach((x) => {
      if (x.loai === 'phong') {
        const n = x.tenKd, bat = (g >= 17.75 && g < 22.5 && (g >= 19 || sinhHoat(n))) || (S.mua === 'mua' && g >= 16 && g < 22.5 && sinhHoat(n));
        datBat(x, bat, true);
      } else if (x.loai === 'den' && x.kieu === 'ngu') datBat(x, g >= 20.5 || g < 5.5, true);
      else if (x.loai === 'den' && x.kieu === 'ban_an') datBat(x, g >= 18 && g < 21, true);
      else if (x.loai === 'tivi') datBat(x, g >= 19.5 && g < 22.5 && /khach|sinh hoat/.test(x.tenKd), true);
    });
    S.canDen = true;
  }

  /* ---- dựng các thiết bị cho căn nhà vừa dựng ---- */
  const CAO = ctx.CAO_TUONG;
  function quatTran(x, z) {
    const g = new THREE.Group(); g.position.set(x, CAO, z);
    const ty = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), M.trang); ty.position.y = -0.16; g.add(ty);
    const chup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 20), M.trang); chup.position.y = -0.02; g.add(chup);
    const roto = new THREE.Group(); roto.position.y = -0.42; g.add(roto);
    const mo = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.12, 24), M.trang); roto.add(mo);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Group(); c.rotation.y = i * Math.PI * 2 / 3;
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.03), M.chrome); k.position.set(0.17, -0.02, 0); c.add(k);
      const la = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.01, 0.13), M.goTrung); la.position.set(0.52, -0.025, 0); la.rotation.x = 0.12; la.castShadow = true; c.add(la);
      roto.add(c);
    }
    const den = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.denTran.clone()); den.position.y = -0.06; roto.add(den);
    const mo2 = new THREE.Mesh(new THREE.CircleGeometry(0.82, 40), VL.mo.clone()); mo2.rotation.x = -Math.PI / 2; mo2.position.y = -0.03; roto.add(mo2);
    return { g, roto, den, mo: mo2, tocDo: 0 };
  }
  function boThietBi() {
    ds.forEach((x) => { if (x.am && A.ctx) A.tat(x.khoa); });
    if (mua) { scene.remove(mua.l); mua.l.geometry.dispose(); mua = null; }
    ds = []; quat = []; phongDen = new Map();
  }
  function ganNha(n) {
    boThietBi(); nha = n;
    const pt = nha.pt, vungO = (x, z) => { const c = pt.oTrong(x, z); return c < 0 ? -1 : pt.vung[c]; };
    nha.goc.updateMatrixWorld(true);
    // đèn trần từng phòng (+ quạt ở phòng ngủ, khách, sinh hoạt, làm việc)
    const coBanAn = [];
    nha.thietBi.forEach((t) => { if (t.info.kieu === 'ban_an') { t.o.localToWorld(tam.set(...t.info.diem)); coBanAn.push({ x: tam.x, z: tam.z }); } });
    nha.denPhong.forEach((d) => {
      const v = nha.vung(d.vung), ten = nha.tenVung(v), kd = khongDau(ten);
      const mat = M.denTran.clone(); d.mesh.material = mat;
      const x = { loai: 'phong', khoa: 'phong:' + d.vung, ten: 'Đèn ' + thuong(ten), tenKd: kd, vung: d.vung, pos: new THREE.Vector3(d.x, CAO - 0.3, d.z), cuong: 2.4 + Math.min(4.5, d.dt * 0.2), mats: [mat], lienKet: [] };
      const dungQuat = d.dt >= 7 && /khach|sinh hoat|ngu|\bpn|lam viec|thu vien|giai tri/.test(kd) && !/wc|ve sinh|bep/.test(kd) && !coBanAn.some((b) => Math.hypot(b.x - d.x, b.z - d.z) < 1.4);
      if (dungQuat) {
        const q = quatTran(d.x, d.z); nha.tran.add(q.g); d.mesh.visible = false; x.mats = [q.den.material]; x.pos.set(d.x, CAO - 0.55, d.z);
        const qx = { loai: 'quat', khoa: 'quat:' + d.vung, ten: 'Quạt ' + thuong(ten), vung: d.vung, q, pos: new THREE.Vector3(d.x, CAO - 0.45, d.z), am: 'quat', amLuong: 0.32, chiDi: true };
        q.g.traverse((o) => { if (o.isMesh) o.userData.nguon = qx; });
        quat.push(qx); ds.push(qx);
      }
      phongDen.set(d.vung, x); ds.push(x);
    });
    // thiết bị gắn trong đồ vật
    nha.thietBi.forEach((t) => {
      const info = t.info, o = t.o, loai = info.loai;
      const diem = info.diem ? new THREE.Vector3(...info.diem) : new THREE.Vector3();
      const pos = o.localToWorld(diem.clone()), vung = vungO(pos.x, pos.z), ten = nha.tenVung(nha.vung(vung));
      const x = { loai, kieu: info.kieu, khoa: info.khoa, info, o, pos, vung, tenKd: khongDau(ten), tenPhong: thuong(ten) };
      if (loai === 'den') {
        const mats = []; o.traverse((m) => { if (m.isMesh && m.material === M.chupDen) { m.material = M.chupDen.clone(); mats.push(m.material); } });
        x.mats = mats; x.ten = TEN_DEN[info.kieu] || 'Đèn'; x.cuong = info.kieu === 'ban_an' ? 2.2 : 0.9;
        if (info.theoPhong) { const p = phongDen.get(vung); if (p) { p.lienKet.push(x); x.phu = true; } }
      } else if (loai === 'tivi') {
        const tex = (() => { const c = document.createElement('canvas'); c.width = 160; c.height = 90; const tt = new THREE.CanvasTexture(c); tt.colorSpace = THREE.SRGBColorSpace; return { c, t: tt }; })();
        const mat = new THREE.MeshStandardMaterial({ color: '#050608', roughness: 0.08, emissive: '#ffffff', emissiveMap: tex.t, emissiveIntensity: 0 });
        o.traverse((m) => { if (m.isMesh && m.material === M.manHinh) m.material = mat; });
        Object.assign(x, { ten: 'Tivi', mat, tex, cuong: 0.9, mau: '#9cc2ff', am: 'tivi', amLuong: 0.16, pha: Math.random() * 10 });
      } else if (loai === 'cua') {
        Object.assign(x, { ten: 'Cửa', goc: info.mo, pos: o.localToWorld(new THREE.Vector3(0.45, 1.1, 0)) });
        x.vung = vungO(x.pos.x, x.pos.z);
      } else if (loai === 'voi' || loai === 'sen' || loai === 'bon') {
        Object.assign(x, { ten: loai === 'voi' ? (info.kieu === 'bep' ? 'Vòi chậu rửa' : 'Vòi lavabo') : TEN[loai], am: 'nuoc', amLuong: loai === 'sen' ? 0.4 : 0.28 });
        dungNuoc(x);
      } else if (loai === 'xa') { Object.assign(x, { ten: 'Xả nước' }); dungXa(x); }
      else if (loai === 'bep') { Object.assign(x, { ten: 'Bếp', am: 'hut', amLuong: 0.22, cuong: 0.7, mau: '#ff9b52' }); dungBep(x); }
      x.nutPos = info.nut ? o.localToWorld(new THREE.Vector3(...info.nut)) : loai === 'voi' ? x.pos.clone().setY(x.pos.y + 0.24) : loai === 'sen' ? x.pos.clone().setY(1.45) : loai === 'bon' || loai === 'xa' ? x.pos.clone().setY(x.pos.y + 0.4) : null;
      if (info.hop) { const h = info.hop, b = new THREE.Mesh(new THREE.BoxGeometry(h[3] - h[0], h[4] - h[1], h[5] - h[2]), VL.an); b.position.set((h[0] + h[3]) / 2, (h[1] + h[4]) / 2, (h[2] + h[5]) / 2); o.add(b); }
      o.traverse((m) => { if (m.isMesh) m.userData.nguon = x; });
      ds.push(x);
    });
    // mưa
    if (S.mua === 'mua') dungMua();
    // khôi phục trạng thái đã bật
    ds.forEach((x) => { if (x.loai === 'cua') { x.mo = trangThai.has(x.khoa) ? trangThai.get(x.khoa) : true; x.o.rotation.y = x.mo ? x.goc : 0; x.gocDich = x.o.rotation.y; } else if (trangThai.get(x.khoa)) datBat(x, true, true, true); });
    if (!S.daTheoGio) { S.daTheoGio = true; denTheoGio(); }
    S.canTroi = true; S.canDen = true; dsNut = null;
  }

  /* ---- nước: dòng vòi, giọt sen, mặt nước bồn ---- */
  function dungNuoc(x) {
    const info = x.info, [dx, dy, dz] = info.diem, g = new THREE.Group(); g.position.set(dx, dy, dz); g.visible = false; x.o.add(g); x.hu = g;
    if (x.loai === 'voi' || x.loai === 'bon') {
      const cao = x.loai === 'bon' ? 0.42 : info.cao;
      const geo = new THREE.CylinderGeometry(0.009, 0.013, 1, 12, 1, true); geo.translate(0, -0.5, 0);
      const dong = new THREE.Mesh(geo, VL.nuoc); dong.scale.set(1, 0.001, 1); g.add(dong); x.dong = dong; x.cao = cao;
      const gon = []; for (let i = 0; i < 2; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.y = -cao + 0.003; g.add(r); gon.push(r); }
      x.gon = gon;
    }
    if (x.loai === 'sen') {
      const n = nho ? 70 : 140, p = new Float32Array(n * 6), cao = info.diem[1] - info.san;
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const l = new THREE.LineSegments(geo, VL.giot); l.frustumCulled = false; g.add(l);
      x.giot = { l, p, n, cao, y: new Float32Array(n).map(() => -Math.random() * cao), a: new Float32Array(n).map(() => Math.random() * Math.PI * 2), r: new Float32Array(n).map(() => Math.random()) };
      const r = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.y = -cao + 0.004; g.add(r); x.gon = [r];
    }
    if (x.loai === 'bon') {
      const b = info.o, mat = new THREE.Mesh(new THREE.PlaneGeometry(b[3] - b[0], b[5] - b[2]), VL.mat); mat.rotation.x = -Math.PI / 2;
      mat.position.set((b[0] + b[3]) / 2, b[1], (b[2] + b[5]) / 2); mat.visible = false; x.o.add(mat); x.mat = mat; x.muc = 0; x.mucDich = 0;
    }
  }
  function dungXa(x) {
    const i = x.info, m = new THREE.Mesh(new THREE.CircleGeometry(1, 32), VL.xoay); m.rotation.x = -Math.PI / 2; m.scale.set(i.rx, i.rz, 1);
    m.position.set(i.diem[0], i.diem[1] + 0.003, i.diem[2]); m.visible = false; x.o.add(m); x.xoay = m; x.conLai = 0;
  }
  function dungBep(x) {
    const i = x.info, g = new THREE.Group(); g.visible = false; x.o.add(g); x.hu = g; x.lua = [];
    i.vong.forEach(([vx, vz]) => {
      const ds2 = [], n = 18;
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, c = new THREE.ConeGeometry(0.009, 0.035, 5); c.translate(0, 0.0175, 0); c.translate(Math.cos(a) * i.r * 0.42, 0, Math.sin(a) * i.r * 0.42); ds2.push(c); }
      const geo = mergeG(ds2), m = new THREE.Mesh(geo, VL.lua); m.position.set(vx, i.y + 0.004, vz); g.add(m); x.lua.push(m);
      const m2 = new THREE.Mesh(new THREE.TorusGeometry(i.r * 0.42, 0.012, 6, 40), VL.luaVang); m2.rotation.x = Math.PI / 2; m2.position.set(vx, i.y + 0.01, vz); g.add(m2);
    });
    x.pos = x.o.localToWorld(new THREE.Vector3(i.diem[0], 1.1, i.diem[2]));
  }
  function mergeG(arr) { // gộp hình đơn giản (cùng thuộc tính) không cần thư viện
    let n = 0; arr.forEach((g) => { n += (g.index ? g.index.count : g.attributes.position.count); });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    arr.forEach((g) => { const a = g.index ? g.toNonIndexed() : g; pos.set(a.attributes.position.array, o * 3); nor.set(a.attributes.normal.array, o * 3); o += a.attributes.position.count; });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return geo;
  }
  function dungMua() {
    if (mua || !nha) return;
    const b = nha.bien, n = nho ? 700 : 1600, p = new Float32Array(n * 6), r = ngauNhien(31);
    const R = b.R + 9, pt = nha.pt;
    const trong = (x, z) => { const c = pt.oTrong(x, z); if (c < 0) return false; const v = nha.vung(pt.vung[c]); return !!(v && v.trongNha); };
    const dat = (i, y) => { let x, z, k = 0; do { x = b.cx + (r() * 2 - 1) * R; z = b.cz + (r() * 2 - 1) * R; k++; } while (trong(x, z) && k < 8); p[i * 6] = x; p[i * 6 + 2] = z; p[i * 6 + 3] = x + 0.04; p[i * 6 + 5] = z + 0.02; p[i * 6 + 1] = y; p[i * 6 + 4] = y - 0.38; };
    for (let i = 0; i < n; i++) dat(i, r() * 14);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const l = new THREE.LineSegments(geo, VL.mua); l.frustumCulled = false; scene.add(l);
    mua = { l, p, n, dat };
  }
  function boMua() { if (!mua) return; scene.remove(mua.l); mua.l.geometry.dispose(); mua = null; if (A.ctx) A.tat('mua'); }

  /* ---- bật / tắt ---- */
  function datBat(x, bat, imLang, khoiPhuc) {
    if (x.loai === 'cua') { x.mo = bat; x.gocDich = bat ? x.goc : 0; trangThai.set(x.khoa, bat); if (!imLang) A.mot('cua', 0.8); return; }
    if (x.loai === 'xa') { if (bat) { x.conLai = 3.2; x.xoay.visible = true; if (!imLang) A.mot('xa', amTheoXa(x) * 1.6); } return; }
    if (x.bat === bat && !khoiPhuc) return;
    x.bat = bat; trangThai.set(x.khoa, bat);
    if (x.mats) x.mats.forEach((m) => { m.emissiveIntensity = bat ? (x.loai === 'phong' ? 1.7 : 1.5) : 0.0; m.color.set(bat ? '#ffffff' : '#e9e7e2'); });
    if (x.lienKet) x.lienKet.forEach((y) => datBat(y, bat, true));
    if (x.loai === 'tivi') x.mat.emissiveIntensity = bat ? 1.25 : 0;
    if (x.hu) { if (bat) x.hu.visible = true; else if (!x.dong) x.hu.visible = false; }
    if (x.loai === 'bon' && bat) { x.mucDich = 1; x.mat.visible = true; }
    if (x.loai === 'bon' && !bat) x.mucDich = x.muc;
    if (x.loai === 'quat') x.q.dich = bat ? 1 : 0;
    if (x.am) { if (bat) { if (A.ctx) A.lap(x.khoa, x.am); } else if (A.ctx) A.tat(x.khoa); }
    S.canDen = true;
  }
  function amTheoXa(x) { const d = viTriNghe().distanceTo(x.pos); return 1 / (1 + Math.pow(d / 2.4, 2)); }
  function viTriNghe() { return ctx.ch.cheDo === 'di' ? camera.position : ctx.ctl.target; }
  function moTiengNeuCan() { const c = A.mo(); if (!c) return; ds.forEach((x) => { if (x.bat && x.am) A.lap(x.khoa, x.am); }); if (mua) A.lap('mua', 'mua'); }
  function doi(x) {
    moTiengNeuCan();
    let viec;
    if (x.loai === 'cua') { datBat(x, !x.mo, false); viec = x.mo ? 'Đã mở cửa.' : 'Đã đóng cửa.'; }
    else if (x.loai === 'xa') { datBat(x, true, false); viec = 'Đang xả nước bồn cầu.'; }
    else if (x.loai === 'bon') {
      if (x.bat) { datBat(x, false, false); x.mucDich = x.muc; viec = 'Đã khoá vòi bồn tắm.'; }
      else if (x.muc > 0.5) { x.mucDich = 0; viec = 'Đang xả nước trong bồn tắm.'; }
      else { datBat(x, true, false); viec = 'Đang mở vòi xả nước vào bồn tắm.'; }
    } else { datBat(x, !x.bat, false); viec = (x.bat ? 'Đã bật ' : 'Đã tắt ') + thuong(x.ten) + (x.loai !== 'phong' && x.tenPhong ? ' — ' + x.tenPhong : '') + '.'; }
    ctx.bao(viec);
    ctx.api.ga('aln_dmb_3d', { buoc: 'tuong_tac', loai: x.loai });
    capNhatNut(); ctx.ve();
  }

  /* ---- gán đèn trong bể cho các nguồn đang bật gần nhất ---- */
  const mauDen = new THREE.Color();
  function ganDen() {
    S.canDen = false;
    const nghe = ctx.ch.cheDo === 'di' ? camera.position : null, ung = [];
    ds.forEach((x) => {
      if (!x.bat) return;
      if (x.loai === 'phong' || (x.loai === 'den' && !x.phu) || x.loai === 'tivi' || x.loai === 'bep') {
        const uu = nghe ? x.pos.distanceTo(nghe) - (x.vung === phongCam ? 3 : 0) : -(x.cuong || 1) - (x.loai === 'phong' ? 2 : 0);
        ung.push({ x, uu });
      }
    });
    ung.sort((a, b) => a.uu - b.uu); ds.forEach((x) => { x.l = null; });
    mauDen.set(MAU_DEN[S.mauDen][1]);
    be.forEach((l, i) => {
      const u = ung[i];
      if (!u) { l.intensity = 0; l.position.set(0, -50, 0); return; }
      l.position.copy(u.x.pos); l.intensity = u.x.cuong || 1; l.color.copy(u.x.mau ? c2.set(u.x.mau) : mauDen); u.x.l = l;
    });
    ds.forEach((x) => { if (x.mats && x.loai !== 'tivi') x.mats.forEach((m) => m.emissive.copy(mauDen).lerp(c3.set('#ffffff'), 0.35)); });
  }

  /* ---- giao diện ---- */
  const huy = taoEl('button', 'x3d-gio-nhanh', goc); huy.type = 'button'; huy.setAttribute('aria-label', 'Đổi giờ, mùa, đèn');
  const huyIcon = taoEl('span', 'x3d-gio-icon', huy), huyGio = taoEl('b', '', huy), huyMua = taoEl('span', 'x3d-gio-mua', huy);
  function capNhatHuy() {
    while (huyIcon.firstChild) huyIcon.removeChild(huyIcon.firstChild);
    svg(huyIcon, S.mua === 'mua' ? ICON.mua : (S.alt > -2 ? ICON.troi : ICON.trang));
    huyGio.textContent = gioChu(S.gio); huyMua.textContent = S.mua === 'mua' ? 'Mùa mưa' : 'Mùa khô';
    huy.classList.toggle('x3d-dem', S.alt <= -2);
    if (!bangGio.hidden) capNhatBang();
  }
  const bangGio = taoEl('aside', 'x3d-bang x3d-bang-gio', goc); bangGio.hidden = true; bangGio.setAttribute('aria-label', 'Ngày và đêm');
  let refBang = null;
  function moBangGio() {
    ctx.dongBangVatLieu();
    while (bangGio.firstChild) bangGio.removeChild(bangGio.firstChild);
    bangGio.hidden = false; huy.hidden = true;
    const dau = taoEl('div', 'x3d-bang-dau', bangGio), t = taoEl('div', '', dau);
    taoEl('h3', '', t, 'Ngày và đêm trong nhà'); taoEl('span', 'x3d-phu', t, 'Nắng theo vị trí TP.HCM');
    const x = taoEl('button', 'x3d-dong', dau); x.type = 'button'; svg(x, ICON.dong); taoEl('span', '', x, 'Đóng'); x.addEventListener('click', dongBangGio);
    const docGio = taoEl('div', 'x3d-gio-doc', bangGio), so = taoEl('b', '', docGio), bu = taoEl('span', '', docGio);
    const luoiM = taoEl('div', 'x3d-moc', bangGio), nutMoc = {};
    MOC.forEach(([k, chu, g]) => { const b = taoEl('button', '', luoiM, chu); b.type = 'button'; b.addEventListener('click', () => { denGio(g, true); ctx.api.ga('aln_dmb_3d', { buoc: 'gio', moc: k }); }); nutMoc[k] = { b, g }; });
    const thanh = taoEl('input', 'x3d-thanh', bangGio); thanh.type = 'range'; thanh.min = '5'; thanh.max = '24'; thanh.step = '0.25'; thanh.setAttribute('aria-label', 'Giờ trong ngày');
    thanh.addEventListener('input', () => { S.tw = null; S.gio = Number(thanh.value); S.canTroi = true; ctx.ve(); });
    thanh.addEventListener('change', () => { denTheoGio(); ctx.ve(); });
    taoEl('h4', '', bangGio, 'Mùa');
    const hMua = taoEl('div', 'x3d-hai', bangGio), nutMua = {};
    [['kho', 'Mùa khô · nắng'], ['mua', 'Mùa mưa']].forEach(([k, chu]) => { const b = taoEl('button', '', hMua, chu); b.type = 'button'; b.addEventListener('click', () => datMua(k)); nutMua[k] = b; });
    taoEl('h4', '', bangGio, 'Đèn trong nhà');
    const hDen = taoEl('div', 'x3d-ba', bangGio);
    [['gio', 'Theo giờ'], ['bat', 'Bật hết'], ['tat', 'Tắt hết']].forEach(([k, chu]) => {
      const b = taoEl('button', '', hDen, chu); b.type = 'button';
      b.addEventListener('click', () => { moTiengNeuCan(); if (k === 'gio') denTheoGio(); else ds.forEach((y) => { if (y.loai === 'phong' || (y.loai === 'den' && !y.phu)) datBat(y, k === 'bat', true); }); ctx.bao(k === 'gio' ? 'Đèn bật tắt theo giờ đang chọn.' : k === 'bat' ? 'Đã bật hết đèn.' : 'Đã tắt hết đèn.'); capNhatNut(); ctx.ve(); });
    });
    const hMau = taoEl('div', 'x3d-ba x3d-mau-den', bangGio), nutMau = {};
    Object.keys(MAU_DEN).forEach((k) => { const b = taoEl('button', '', hMau); b.type = 'button'; const ch = taoEl('i', '', b); ch.style.background = MAU_DEN[k][1]; taoEl('span', '', b, MAU_DEN[k][0]); b.addEventListener('click', () => { S.mauDen = k; S.canDen = true; capNhatBang(); ctx.ve(); }); nutMau[k] = b; });
    taoEl('h4', '', bangGio, 'Âm thanh');
    const am = taoEl('button', 'x3d-ca-nha x3d-am', bangGio); am.type = 'button';
    am.addEventListener('click', () => { A.datBat(!A.bat); if (A.bat) moTiengNeuCan(); capNhatBang(); });
    taoEl('p', 'x3d-chu-thich', bangGio, 'Bấm vào đèn, quạt, vòi nước, sen, bồn cầu, tivi, bếp, cánh cửa để bật tắt. Khi đi trong nhà, nút bật tắt hiện ngay cạnh thiết bị. Hướng nắng giả định phía trên bản vẽ là hướng Bắc. Quạt trần do máy tự đặt để minh hoạ.');
    refBang = { so, bu, thanh, nutMoc, nutMua, nutMau, am };
    capNhatBang(); ctx.ve();
    ctx.api.ga('aln_dmb_3d', { buoc: 'gio_mo' });
  }
  function capNhatBang() {
    if (!refBang) return; const r = refBang;
    r.so.textContent = gioChu(S.gio); r.bu.textContent = buoi(S.gio) + ' · ' + (S.mua === 'mua' ? 'mùa mưa' : 'mùa khô');
    if (document.activeElement !== r.thanh) r.thanh.value = String(S.gio);
    Object.keys(r.nutMoc).forEach((k) => r.nutMoc[k].b.setAttribute('aria-pressed', String(Math.abs(r.nutMoc[k].g - S.gio) < 0.13)));
    Object.keys(r.nutMua).forEach((k) => r.nutMua[k].setAttribute('aria-pressed', String(k === S.mua)));
    Object.keys(r.nutMau).forEach((k) => r.nutMau[k].setAttribute('aria-pressed', String(k === S.mauDen)));
    while (r.am.firstChild) r.am.removeChild(r.am.firstChild); svg(r.am, A.bat ? ICON.loa : ICON.loaTat); taoEl('span', '', r.am, A.bat ? 'Âm thanh đang bật — bấm để tắt' : 'Âm thanh đang tắt — bấm để bật');
  }
  function dongBangGio() { bangGio.hidden = true; huy.hidden = false; refBang = null; ctx.ve(); }
  huy.addEventListener('click', moBangGio);

  function denGio(g, theoGio, imLang) {
    if (!imLang) moTiengNeuCan();
    if (giamDong) { S.gio = g; S.canTroi = true; } else S.tw = { g0: S.gio, g1: g, t0: performance.now(), ms: 1300 };
    if (theoGio) denTheoGio(g);
    if (!imLang) ctx.bao(buoi(g) + ', ' + gioChu(g) + (theoGio ? ' — đèn bật tắt theo giờ.' : '.'));
    capNhatBang(); ctx.ve();
  }
  function datMua(k) {
    if (S.mua === k) return; S.mua = k; moTiengNeuCan();
    if (k === 'mua') { dungMua(); if (A.ctx) A.lap('mua', 'mua'); S.henChop = 4 + Math.random() * 6; } else boMua();
    S.canTroi = true; denTheoGio(); capNhatBang(); ctx.ve();
    ctx.bao(k === 'mua' ? 'Mùa mưa: trời âm u, mưa ngoài sân, đèn trong nhà bật sớm hơn.' : 'Mùa khô: nắng gắt, mặt trời lệch về phía Nam.');
    ctx.api.ga('aln_dmb_3d', { buoc: 'mua', mua: k });
  }

  /* ---- công tắc đèn phòng đang đứng (khi đi trong nhà) ---- */
  const congTac = taoEl('button', 'x3d-cong-tac', goc); congTac.type = 'button'; congTac.hidden = true;
  let phongCam = -1;
  function capCongTac() {
    if (ctx.ch.cheDo !== 'di' || !nha) { congTac.hidden = true; return; }
    const c = nha.pt.oTrong(camera.position.x, camera.position.z), v = c < 0 ? -1 : nha.pt.vung[c];
    if (v !== phongCam) { phongCam = v; S.canDen = true; }
    const x = phongDen.get(v); congTac.hidden = !x; if (!x) return;
    while (congTac.firstChild) congTac.removeChild(congTac.firstChild);
    svg(congTac, ICON.den); taoEl('span', '', congTac, x.ten); taoEl('b', '', congTac, x.bat ? 'Bật' : 'Tắt');
    congTac.setAttribute('aria-pressed', String(!!x.bat)); congTac._x = x;
  }
  congTac.addEventListener('click', () => { if (congTac._x) doi(congTac._x); capCongTac(); });

  /* ---- nút nổi cạnh thiết bị (khi đi trong nhà) ---- */
  const lopNut = taoEl('div', 'x3d-lop-nut', khung);
  let dsNut = null, henChe = 0;
  function capNhatNut() { if (!dsNut) return; dsNut.forEach((n) => { n.b.setAttribute('aria-pressed', String(n.x.loai === 'cua' ? !n.x.mo : !!n.x.bat)); n.chu.textContent = nhanNut(n.x); }); }
  function nhanNut(x) {
    if (x.loai === 'cua') return x.mo ? 'Đóng cửa' : 'Mở cửa';
    if (x.loai === 'xa') return 'Xả nước';
    if (x.loai === 'bon') return x.bat ? 'Khoá vòi bồn' : (x.muc > 0.5 ? 'Xả bồn' : 'Mở vòi bồn');
    return (x.bat ? 'Tắt ' : 'Bật ') + (x.loai === 'voi' ? 'vòi' : x.loai === 'sen' ? 'sen' : thuong(x.ten));
  }
  function sauVe() { // gọi sau mỗi lần vẽ: đặt nút nổi theo vị trí thiết bị trên màn hình
    if (ctx.ch.cheDo !== 'di' || !nha) { if (lopNut.firstChild) { while (lopNut.firstChild) lopNut.removeChild(lopNut.firstChild); dsNut = null; } return; }
    const now = performance.now(), w = khung.clientWidth, h = khung.clientHeight;
    if (!dsNut || now > henChe) {
      henChe = now + 280;
      const ung = ds.filter((x) => x.loai !== 'phong' && !x.phu && x.pos).map((x) => ({ x, d: x.pos.distanceTo(camera.position) }))
        .filter((u) => u.d < (u.x.loai === 'cua' ? 2.6 : 5.5)).sort((a, b) => a.d - b.d);
      const thay = [];
      for (const u of ung) {
        tam.copy(u.x.nutPos || u.x.pos).project(camera); if (tam.z > 1 || Math.abs(tam.x) > 0.92 || Math.abs(tam.y) > 0.88) continue;
        tam2.copy(u.x.pos).sub(camera.position); const d = tam2.length(); tam2.normalize();
        ray.set(camera.position, tam2); ray.far = Math.max(0.01, d - 0.35);
        const che = ray.intersectObjects(nha.tuong, false).length > 0; ray.far = Infinity;
        if (!che) thay.push(u.x); if (thay.length >= (nho ? 4 : 6)) break;
      }
      const khoaMoi = thay.map((x) => x.khoa).join('|');
      if (!dsNut || khoaMoi !== lopNut._khoa) {
        while (lopNut.firstChild) lopNut.removeChild(lopNut.firstChild);
        dsNut = thay.map((x) => {
          const b = taoEl('button', 'x3d-nut-tb', lopNut); b.type = 'button'; svg(b, ICON[x.loai === 'phong' ? 'den' : x.loai] || ICON.den);
          const chu = taoEl('span', '', b, nhanNut(x)); b.addEventListener('click', (e) => { e.stopPropagation(); doi(x); });
          b.setAttribute('aria-pressed', String(x.loai === 'cua' ? !x.mo : !!x.bat));
          return { b, chu, x };
        });
        lopNut._khoa = khoaMoi;
      }
    }
    dsNut.forEach((n) => { tam.copy(n.x.nutPos || n.x.pos).project(camera); n.b.style.transform = 'translate(' + ((tam.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - tam.y) / 2 * h).toFixed(1) + 'px) translate(-50%,-50%)'; n.b.style.display = tam.z > 1 ? 'none' : ''; });
  }

  /* ---- không đi xuyên tường / cửa đóng ---- */
  const huongDi = new THREE.Vector3(), goc0 = new THREE.Vector3(), phap = new THREE.Vector3();
  function vatChan() { const a = nha.tuong.slice(); ds.forEach((x) => { if (x.loai === 'cua' && Math.abs(x.o.rotation.y) < 0.35) x.o.children.forEach((m) => { if (m.isMesh && m.material !== VL.an) a.push(m); }); }); return a; }
  function chan(pos, dx, dz) {
    if (!nha) return [dx, dz];
    const ban = 0.28, ve = vatChan();
    const thu = (mx, mz) => {
      const dai = Math.hypot(mx, mz); if (dai < 1e-6) return null;
      huongDi.set(mx / dai, 0, mz / dai);
      for (const y of [0.4, 1.2]) { goc0.set(pos.x, y, pos.z); ray.set(goc0, huongDi); ray.far = dai + ban; const h = ray.intersectObjects(ve, false)[0]; if (h) { ray.far = Infinity; return h; } }
      ray.far = Infinity; return null;
    };
    let h = thu(dx, dz); if (!h) return [dx, dz];
    phap.copy(h.face.normal).transformDirection(h.object.matrixWorld); phap.y = 0; if (phap.lengthSq() < 1e-6) return [0, 0]; phap.normalize();
    const k = dx * phap.x + dz * phap.z; let mx = dx - phap.x * k, mz = dz - phap.z * k;
    if (k > 0) return [dx, dz]; // đang lùi ra khỏi tường
    h = thu(mx, mz); if (h) return [0, 0];
    return [mx, mz];
  }

  // Hai điểm có nhìn thấy nhau không (không vướng tường, cửa đóng) — tham quan tự động dùng để chọn bay hay chuyển cảnh.
  function thayDuoc(a, b) {
    if (!nha) return false;
    const ve = vatChan(), d = Math.hypot(b.x - a.x, b.z - a.z); if (d < 0.05) return true;
    huongDi.set((b.x - a.x) / d, 0, (b.z - a.z) / d);
    for (const y of [0.5, 1.4]) { goc0.set(a.x, y, a.z); ray.set(goc0, huongDi); ray.far = d; const h = ray.intersectObjects(ve, false)[0]; ray.far = Infinity; if (h) return false; }
    return true;
  }

  /* ---- mỗi khung hình ---- */
  let henAm = 0, henCt = 0, henTv = 0;
  function capNhat(dt, t) {
    let doiVe = false;
    if (S.tw) { const k = Math.min(1, (t - S.tw.t0) / S.tw.ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; S.gio = S.tw.g0 + (S.tw.g1 - S.tw.g0) * e; S.canTroi = true; if (k >= 1) S.tw = null; }
    if (S.mua === 'mua' && !giamDong) { // chớp
      S.henChop -= dt;
      if (S.henChop <= 0) { S.chop = 1; S.henChop = 9 + Math.random() * 14; setTimeout(() => A.mot('sam', 0.8), 400 + Math.random() * 1600); }
      if (S.chop > 0) { S.chop = Math.max(0, S.chop - dt * (S.chop > 0.5 ? 9 : 3)); S.canTroi = true; }
    }
    if (S.canTroi) { S.canTroi = false; apDungTroi(); doiVe = true; }
    if (!nha) return doiVe;
    if (S.canDen) { ganDen(); doiVe = true; }
    if (t > henCt) { henCt = t + 300; capCongTac(); }
    ds.forEach((x) => {
      if (x.loai === 'cua' && Math.abs(x.o.rotation.y - x.gocDich) > 1e-3) { x.o.rotation.y += (x.gocDich - x.o.rotation.y) * Math.min(1, dt * 7); if (Math.abs(x.o.rotation.y - x.gocDich) < 0.004) x.o.rotation.y = x.gocDich; doiVe = true; }
      else if (x.loai === 'quat') { const q = x.q, dich = q.dich || 0; q.tocDo += (dich * 9 - q.tocDo) * Math.min(1, dt * (dich ? 0.7 : 0.45)); if (q.tocDo > 0.02) { q.roto.rotation.y += q.tocDo * dt; q.mo.material.opacity = Math.min(0.5, q.tocDo / 9 * 0.5); doiVe = true; } else if (q.tocDo !== 0) { q.tocDo = 0; q.mo.material.opacity = 0; doiVe = true; } }
      else if ((x.loai === 'voi' || x.loai === 'bon' || x.loai === 'sen') && (x.bat || (x.dong && x.dong.scale.y > 0.002))) {
        if (x.dong) { const dich = x.bat ? x.cao : 0; x.dong.scale.y += (dich - x.dong.scale.y) * Math.min(1, dt * 9); if (!x.bat && x.dong.scale.y < 0.004) { x.dong.scale.y = 0.001; x.hu.visible = false; } }
        if (x.gon) x.gon.forEach((r, i) => { const k = ((t / 1000) * 1.6 + i * 0.5) % 1; r.scale.setScalar(0.02 + k * 0.07); r.material.opacity = (1 - k) * 0.55 * (x.bat ? 1 : 0); });
        if (x.giot) { const gt = x.giot, v = 3.6 * dt; for (let i = 0; i < gt.n; i++) { gt.y[i] -= v * (0.85 + gt.r[i] * 0.3); if (gt.y[i] < -gt.cao) gt.y[i] += gt.cao; const s = 0.05 + (-gt.y[i] / gt.cao) * 0.17 * gt.r[i] + 0.03, xx = Math.cos(gt.a[i]) * s, zz = Math.sin(gt.a[i]) * s, j = i * 6; gt.p[j] = xx; gt.p[j + 1] = gt.y[i]; gt.p[j + 2] = zz; gt.p[j + 3] = xx * 1.02; gt.p[j + 4] = gt.y[i] - 0.07; gt.p[j + 5] = zz * 1.02; } gt.l.geometry.attributes.position.needsUpdate = true; }
        doiVe = true;
      }
      if (x.loai === 'bon' && Math.abs(x.muc - x.mucDich) > 1e-3) { // mực nước dâng / rút
        x.muc += Math.sign(x.mucDich - x.muc) * dt / (x.mucDich > x.muc ? 9 : 3.5); x.muc = Math.max(0, Math.min(1, x.muc));
        const b = x.info.o; x.mat.position.y = b[1] + (b[4] - b[1]) * x.muc; x.mat.visible = x.muc > 0.01;
        if (x.muc >= 1 && x.bat) { datBat(x, false, true); x.mucDich = 1; ctx.bao('Bồn tắm đã đầy nước.'); capNhatNut(); }
        doiVe = true;
      }
      if (x.loai === 'xa' && x.conLai > 0) { x.conLai -= dt; x.xoay.rotation.z -= dt * 6; x.xoay.material.opacity = Math.min(0.9, x.conLai); if (x.conLai <= 0) x.xoay.visible = false; doiVe = true; }
      if (x.loai === 'tivi' && x.bat) {
        if (t > henTv) { henTv = t + 180; veTivi(x, t / 1000); }
        if (x.l) x.l.intensity = (x.cuong || 1) * (0.75 + 0.25 * Math.sin(t * 0.004 + x.pha) * Math.sin(t * 0.0013));
        doiVe = true;
      }
      if (x.loai === 'bep' && x.bat) { x.lua.forEach((m, i) => { m.scale.set(1, 0.8 + Math.random() * 0.45, 1); }); if (x.l) x.l.intensity = (x.cuong || 1) * (0.8 + Math.random() * 0.3); doiVe = true; }
    });
    if (mua && !giamDong) {
      const p = mua.p, v = 11 * dt;
      for (let i = 0; i < mua.n; i++) { const j = i * 6; p[j + 1] -= v; p[j + 4] -= v; if (p[j + 4] < 0) mua.dat(i, 12 + Math.random() * 2); }
      mua.l.geometry.attributes.position.needsUpdate = true; VL.mua.opacity = S.toi ? 0.28 : 0.45; doiVe = true;
    }
    if (A.ctx && t > henAm) { // âm lượng theo khoảng cách tới người nghe
      henAm = t + 120; const nghe = viTriNghe(), xa = ctx.ch.cheDo === 'di' ? 1 : 0.55;
      ds.forEach((x) => { if (x.bat && x.am) A.am(x.khoa, x.amLuong * xa / (1 + Math.pow(nghe.distanceTo(x.pos) / 2.4, 2))); });
      if (mua) A.am('mua', ctx.ch.cheDo === 'di' ? 0.22 : 0.32);
    }
    return doiVe;
  }
  function veTivi(x, t) { // hình động đơn giản trên màn tivi: cảnh trời, đồi, chữ chạy
    const c = x.tex.c, g = c.getContext('2d'), p = (t * 0.07 + x.pha) % 3, a = Math.floor(p);
    const bo = [['#2f6fb0', '#9bd3f2', '#3e8f4f'], ['#8a3d6b', '#f3a46a', '#38304f'], ['#1c3c55', '#4fb3bf', '#e2c56d']][a];
    const gr = g.createLinearGradient(0, 0, 0, 90); gr.addColorStop(0, bo[0]); gr.addColorStop(1, bo[1]); g.fillStyle = gr; g.fillRect(0, 0, 160, 90);
    g.fillStyle = bo[2]; g.beginPath(); g.moveTo(0, 70); for (let i = 0; i <= 160; i += 8) g.lineTo(i, 62 + Math.sin(i * 0.05 + t * 0.6) * 8); g.lineTo(160, 90); g.lineTo(0, 90); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(40 + Math.sin(t * 0.3) * 30, 26, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 78, 160, 12); g.fillStyle = '#fff'; g.font = 'bold 8px sans-serif'; g.fillText('BẢN TIN THỜI TIẾT · TP.HCM', 160 - ((t * 30) % 300), 87);
    x.tex.t.needsUpdate = true;
  }

  /* ---- bấm vào thiết bị trên mô hình ---- */
  function bam(raycaster, trungKhac) {
    if (!nha) return false;
    const vat = []; ds.forEach((x) => { if (x.o) x.o.traverse((m) => { if (m.isMesh) vat.push(m); }); else if (x.q && ctx.ch.cheDo === 'di') x.q.g.traverse((m) => { if (m.isMesh) vat.push(m); }); });
    const h = raycaster.intersectObjects(vat, false)[0]; if (!h) return false;
    if (trungKhac && trungKhac.distance < h.distance - 0.05) return false;
    const x = h.object.userData.nguon; if (!x) return false;
    doi(x.phu ? (phongDen.get(x.vung) || x) : x); return true;
  }
  function datCheDo(k) { // trần đổ bóng khi đi trong nhà: nắng chỉ lọt qua cửa sổ, cửa đi
    if (nha) nha.tran.traverse((m) => { if (m.isMesh) m.castShadow = k === 'di'; });
    phongCam = -2; S.canDen = true; capCongTac(); dsNut = null; lopNut._khoa = null; while (lopNut.firstChild) lopNut.removeChild(lopNut.firstChild);
  }
  function nutDenPhong(cha, id) { // thêm vào bảng vật liệu ở chế độ ngoài
    const x = phongDen.get(id); if (!x) return;
    const b = taoEl('button', 'x3d-ca-nha x3d-den-phong', cha); b.type = 'button';
    const ve = () => { while (b.firstChild) b.removeChild(b.firstChild); svg(b, ICON.den); taoEl('span', '', b, (x.bat ? 'Tắt ' : 'Bật ') + thuong(x.ten)); b.setAttribute('aria-pressed', String(!!x.bat)); };
    b.addEventListener('click', () => { doi(x); ve(); }); ve();
    const q = quat.find((y) => y.vung === id);
    if (q) taoEl('p', 'x3d-chu-thich', cha, 'Phòng này có quạt trần — vào "Đi trong nhà" để bật quạt.');
  }
  function dong() { A.dong(); be.forEach((l) => scene.remove(l)); scene.remove(sao); boMua(); }
  function dangMoBang() { return !bangGio.hidden; }

  apDungTroi();
  return { ganNha, capNhat, sauVe, bam, chan, thayDuoc, datCheDo, nutDenPhong, dong, dongBangGio, dangMoBang, moBangGio, denGio, datMua, S, ds: () => ds, be, doi, am: A };
}
