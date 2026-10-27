/* ALN · Dựng mặt bằng — xem 3D (25/10/2026)
 * Dựng mô hình 3D từ chính bản vẽ đang chỉnh: tường cao theo tầng có lỗ cửa, cánh cửa mở theo phía vẽ ở bản 2D,
 * sàn từng phòng theo vật liệu, đồ vật dựng bằng code theo đúng kích thước từng món (kéo dài tủ ở bản 2D thì
 * bản 3D dài theo, không méo như phóng to mô hình tải sẵn). Không gọi máy chủ.
 * Nạp lười từ dung.js (import động) — chỉ khi người dùng bấm "Xem 3D". Thư viện three.js qua importmap trong index.html.
 * Toạ độ: bản vẽ (x, y) → 3D (X = x, Z = y), Y hướng lên, mét.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { taoSong } from './dung-3d-song.js?v=2';
import { taoThamQuan } from './dung-3d-tham-quan.js?v=1';

/* ---------------- kích thước chuẩn ---------------- */
const CAO_TUONG = 3.2;      // cao tường tới trần (m)
const CAO_TANG = 3.6;       // sàn tới sàn, dùng chia bậc thang
const CAO_HA = 1.15;        // tường khi bật "Hạ tường"
const MAT_DAT = -0.06;      // mặt đất quanh nhà
const SAN_NGOAI = -0.03;    // sân, hiên trong ranh lô
const MAT_MAT = 1.6;        // tầm mắt khi đi trong nhà
const CUA_CAO = { di: 2.2, rong: 2.4 };
const SO_CAO = { S1: [1.4, 2.1], S2: [0.8, 2.4], S4: [0.8, 2.4] };
const GOC_MO_CUA = 78 * Math.PI / 180;

/* ---------------- vật liệu cho người dùng chọn ---------------- */
export const SAN = {
  go_soi: { ten: 'Gỗ sồi', loai: 'go', mau: '#c49a6c', nham: 0.5 },
  go_oc_cho: { ten: 'Gỗ óc chó', loai: 'go', mau: '#8d6141', nham: 0.45 },
  go_xam: { ten: 'Gỗ xám', loai: 'go', mau: '#a99d8d', nham: 0.55 },
  gach_80_kem: { ten: 'Gạch 80×80 kem', loai: 'gach', mau: '#e8dfd0', ron: '#d4c9b6', kich: 0.8, nham: 0.22 },
  gach_60_kem: { ten: 'Gạch 60×60 kem', loai: 'gach', mau: '#e4dccd', ron: '#cfc4b1', kich: 0.6, nham: 0.25 },
  gach_60_xam: { ten: 'Gạch 60×60 xám', loai: 'gach', mau: '#c3c4c2', ron: '#a9aaa8', kich: 0.6, nham: 0.3 },
  da_marble: { ten: 'Đá marble trắng', loai: 'da', mau: '#efece6', kich: 1.2, nham: 0.18 },
  gach_30_xam: { ten: 'Gạch 30×30 xám nhạt', loai: 'gach', mau: '#d6d8d6', ron: '#b9bcba', kich: 0.3, nham: 0.35 },
  da_san_vuon: { ten: 'Đá lát sân', loai: 'gach', mau: '#bdb6aa', ron: '#9c958a', kich: 0.5, nham: 0.85, lech: true }
};
export const TUONG = {
  trang_nga: { ten: 'Trắng ngà', mau: '#f3f0ea' },
  kem: { ten: 'Kem', mau: '#ede3cf' },
  be: { ten: 'Be', mau: '#e2d3bd' },
  xam_nhat: { ten: 'Xám nhạt', mau: '#dcdedd' },
  xanh_sage: { ten: 'Xanh rêu nhạt', mau: '#c6d1c0' },
  hong_dat: { ten: 'Hồng đất', mau: '#e1c6b6' },
  xanh_bien: { ten: 'Xanh biển nhạt', mau: '#c8d6df' },
  gach_op: { ten: 'Gạch ốp 30×60', mau: '#f1f0ec', op: true },
  son_ngoai: { ten: 'Sơn ngoài trời', mau: '#e9e4da' }
};

// Tông nội thất (đổi cả nhà một lần): gỗ đồ đạc + cánh cửa, vải bọc sofa/giường/ghế, mặt đá bếp
export const NOI_THAT = {
  go: {
    go_soi: { ten: 'Gỗ sồi', mau: ['#c8a27a', '#9c7552', '#6e4a31'] },
    go_tan_bi: { ten: 'Sồi trắng', mau: ['#e0c9a6', '#c9a87f', '#9e7b56'] },
    go_oc_cho: { ten: 'Óc chó', mau: ['#a17a5a', '#7b5639', '#4c3222'] },
    go_xam: { ten: 'Gỗ xám', mau: ['#bcb2a3', '#998d7c', '#6b6155'] },
    go_mun: { ten: 'Gỗ tối', mau: ['#6b5444', '#4a372a', '#2e231b'] }
  },
  vai: {
    xam: { ten: 'Xám ấm', mau: { vaiXam: '#a7a39c', vaiDam: '#5f646b', vaiNhan: '#8fa2a6', vaiBe: '#d9c7ab', vaiDat: '#b97c5c' } },
    be: { ten: 'Be kem', mau: { vaiXam: '#d6c6ad', vaiDam: '#9c8466', vaiNhan: '#c39f78', vaiBe: '#e8dcc8', vaiDat: '#a8754f' } },
    reu: { ten: 'Xanh rêu', mau: { vaiXam: '#8c9a83', vaiDam: '#56634f', vaiNhan: '#c7b796', vaiBe: '#d8ccb3', vaiDat: '#b5835e' } },
    navy: { ten: 'Xanh navy', mau: { vaiXam: '#4f5f78', vaiDam: '#2e3a4d', vaiNhan: '#c2a477', vaiBe: '#d9cfbf', vaiDat: '#a9714f' } },
    dat: { ten: 'Đất nung', mau: { vaiXam: '#b98266', vaiDam: '#7a4a34', vaiNhan: '#d9c3a3', vaiBe: '#e6d6bf', vaiDat: '#8f5a3d' } }
  },
  da: {
    trang: { ten: 'Đá trắng vân', mau: '#eeebe5' },
    xam: { ten: 'Đá xám', mau: '#a9a7a2' },
    den: { ten: 'Đá đen', mau: '#3a3a3c' },
    kem: { ten: 'Đá kem', mau: '#e3d5bd' }
  }
};
export const NOI_THAT_MAC_DINH = { go: 'go_soi', vai: 'xam', da: 'trang' };

/* ---------------- tiện ích ---------------- */
function khongDau(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
function ngauNhien(hat) { let s = hat >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }
function dien(mau, tl) { // sáng/tối màu hex theo tỉ lệ (-1..1)
  const c = new THREE.Color(mau), h = {}; c.getHSL(h);
  c.setHSL(h.h, h.s, Math.max(0, Math.min(1, h.l + tl))); return '#' + c.getHexString();
}
function laDienThoai() { return window.matchMedia('(pointer: coarse)').matches && Math.max(screen.width, screen.height) < 1200; }

/* ---------------- hoạ tiết vẽ bằng canvas (không tải ảnh ngoài) ---------------- */
function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
function veGo(mau, n, hat) { // ván sàn 2,4 × 2,4 m: 12 hàng ván rộng 20 cm, dài 0,8–1,6 m, so le
  const c = canvas(n), g = c.getContext('2d'), r = ngauNhien(hat), hang = 12, ch = n / hang;
  g.fillStyle = mau; g.fillRect(0, 0, n, n);
  for (let i = 0; i < hang; i++) {
    let x = -r() * n * 0.5;
    while (x < n) {
      const dai = n * (0.33 + r() * 0.34), tone = dien(mau, (r() - 0.5) * 0.09);
      for (const dx of [0, n, -n]) {
        const x0 = x + dx; if (x0 > n || x0 + dai < 0) continue;
        g.fillStyle = tone; g.fillRect(x0, i * ch, dai, ch);
        g.save(); g.beginPath(); g.rect(x0, i * ch, dai, ch); g.clip();
        for (let k = 0; k < 9; k++) { // vân gỗ
          const y = i * ch + r() * ch, bien = 0.6 + r() * 1.6, pha = r() * 6;
          g.strokeStyle = 'rgba(60,35,15,' + (0.05 + r() * 0.09).toFixed(3) + ')'; g.lineWidth = 0.6 + r() * 1.2;
          g.beginPath();
          for (let t = 0; t <= dai; t += 6) { const yy = y + Math.sin(t / dai * 6 + pha) * bien; if (t === 0) g.moveTo(x0 + t, yy); else g.lineTo(x0 + t, yy); }
          g.stroke();
        }
        if (r() < 0.25) { g.fillStyle = 'rgba(70,40,20,0.12)'; g.beginPath(); g.ellipse(x0 + r() * dai, i * ch + ch / 2, 4 + r() * 6, 2 + r() * 2, 0, 0, Math.PI * 2); g.fill(); }
        g.restore();
        g.fillStyle = 'rgba(40,25,10,0.35)'; g.fillRect(x0, i * ch, 1.2, ch);
      }
      x += dai;
    }
    g.fillStyle = 'rgba(40,25,10,0.32)'; g.fillRect(0, i * ch, n, 1.2);
  }
  return c;
}
function veGach(mau, ron, n, soVien, hat, lech) { // soVien × soVien viên, ron 2–3 mm
  const c = canvas(n), g = c.getContext('2d'), r = ngauNhien(hat), s = n / soVien, rr = Math.max(1.5, n / 512 * 2.2);
  g.fillStyle = ron; g.fillRect(0, 0, n, n);
  for (let j = 0; j < soVien; j++) for (let i = 0; i < soVien; i++) {
    const off = lech && j % 2 ? s / 2 : 0;
    for (const dx of [0, -n]) {
      const x = i * s + off + dx, y = j * s; if (x > n || x + s < 0) continue;
      g.fillStyle = dien(mau, (r() - 0.5) * (lech ? 0.08 : 0.025)); g.fillRect(x + rr / 2, y + rr / 2, s - rr, s - rr);
      g.save(); g.beginPath(); g.rect(x + rr / 2, y + rr / 2, s - rr, s - rr); g.clip();
      for (let k = 0; k < 14; k++) { // vân đá nhẹ
        const cx = x + r() * s, cy = y + r() * s, rad = s * (0.08 + r() * 0.3), gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
        const toi = r() < 0.5; gr.addColorStop(0, toi ? 'rgba(90,80,65,0.05)' : 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      }
      g.restore();
    }
  }
  return c;
}
function veDa(mau, n, hat) { // đá marble: nền kem + vân xám chạy chéo, liền mép
  const c = canvas(n), g = c.getContext('2d'), r = ngauNhien(hat);
  g.fillStyle = mau; g.fillRect(0, 0, n, n);
  for (let k = 0; k < 40; k++) {
    const cx = r() * n, cy = r() * n, rad = n * (0.05 + r() * 0.2), gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    gr.addColorStop(0, 'rgba(200,192,180,0.10)'); gr.addColorStop(1, 'rgba(200,192,180,0)'); g.fillStyle = gr; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  for (let k = 0; k < 7; k++) {
    const pts = []; let x = r() * n, y = 0; const goc = 0.6 + r() * 0.5;
    while (y < n * 1.2) { pts.push([x, y]); x += Math.cos(goc) * 30 + (r() - 0.5) * 40; y += Math.sin(goc) * 30 + r() * 10; }
    const w = 0.6 + r() * 2.2, a = 0.18 + r() * 0.25;
    for (const ox of [0, -n, n]) for (const oy of [0, -n]) {
      g.strokeStyle = 'rgba(120,114,104,' + a.toFixed(2) + ')'; g.lineWidth = w; g.beginPath();
      pts.forEach((p, i) => { if (i) g.lineTo(p[0] + ox, p[1] + oy); else g.moveTo(p[0] + ox, p[1] + oy); }); g.stroke();
    }
  }
  return c;
}
function veVai(mau, n, hat) { // vải dệt: hạt nhỏ, sợi ngang dọc
  const c = canvas(n), g = c.getContext('2d'), r = ngauNhien(hat);
  g.fillStyle = mau; g.fillRect(0, 0, n, n);
  for (let y = 0; y < n; y += 2) { g.fillStyle = 'rgba(0,0,0,' + (0.015 + r() * 0.03).toFixed(3) + ')'; g.fillRect(0, y, n, 1); }
  for (let x = 0; x < n; x += 2) { g.fillStyle = 'rgba(255,255,255,' + (0.01 + r() * 0.03).toFixed(3) + ')'; g.fillRect(x, 0, 1, n); }
  for (let k = 0; k < n * 6; k++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'; g.fillRect(r() * n, r() * n, 1, 1); }
  return c;
}
function veGachOp(n) { // gạch ốp tường 30 × 60, ron trắng, khổ 1,2 × 1,2 m
  const c = canvas(n), g = c.getContext('2d'), r = ngauNhien(7), cot = 4, hang = 2, w = n / cot, h = n / hang;
  g.fillStyle = '#d9d7d1'; g.fillRect(0, 0, n, n);
  for (let j = 0; j < hang; j++) for (let i = 0; i < cot; i++) {
    g.fillStyle = dien('#f1f0ec', (r() - 0.5) * 0.02); g.fillRect(i * w + 1.5, j * h + 1.5, w - 3, h - 3);
  }
  return c;
}

/* ---------------- dựng hình: hộp, hộp bo góc, trụ — UV theo mét để hoạ tiết không bị kéo giãn ---------------- */
function uvMet(geo, ti) {
  const p = geo.attributes.position, nrm = geo.attributes.normal; if (!p || !nrm) return geo;
  const uv = new Float32Array(p.count * 2), k = ti || 1;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); } else if (ay >= az) { u = p.getX(i); v = p.getZ(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * k; uv[i * 2 + 1] = v * k;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
function luoi(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }
function hop(g, mat, x0, y0, z0, x1, y1, z1) {
  const w = Math.max(1e-3, x1 - x0), h = Math.max(1e-3, y1 - y0), d = Math.max(1e-3, z1 - z0);
  const geo = new THREE.BoxGeometry(w, h, d); geo.translate(x0 + w / 2, y0 + h / 2, z0 + d / 2); uvMet(geo);
  const m = luoi(geo, mat); g.add(m); return m;
}
function hopBo(g, mat, x0, y0, z0, x1, y1, z1, r) {
  const w = Math.max(1e-3, x1 - x0), h = Math.max(1e-3, y1 - y0), d = Math.max(1e-3, z1 - z0);
  const rr = Math.min(r === undefined ? 0.03 : r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const geo = rr > 0.002 ? new RoundedBoxGeometry(w, h, d, 3, rr) : new THREE.BoxGeometry(w, h, d);
  geo.translate(x0 + w / 2, y0 + h / 2, z0 + d / 2); uvMet(geo);
  const m = luoi(geo, mat); g.add(m); return m;
}
function tru(g, mat, cx, cz, y0, y1, r0, r1, seg) {
  const geo = new THREE.CylinderGeometry(r1 === undefined ? r0 : r1, r0, Math.max(1e-3, y1 - y0), seg || 24);
  geo.translate(cx, (y0 + y1) / 2, cz); uvMet(geo);
  const m = luoi(geo, mat); g.add(m); return m;
}
function elip(g, mat, cx, cz, y0, y1, rx, rz, r1x) { // trụ elip (bồn cầu, chậu)
  const geo = new THREE.CylinderGeometry(r1x === undefined ? 1 : r1x, 1, Math.max(1e-3, y1 - y0), 32);
  geo.scale(rx, 1, rz); geo.translate(cx, (y0 + y1) / 2, cz); geo.computeVertexNormals(); uvMet(geo);
  const m = luoi(geo, mat); g.add(m); return m;
}
function daGiac(g, mat, pts, y0, y1) { // khối đứng từ đa giác (x, z) cục bộ
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-3, y1 - y0), bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); geo.translate(0, y0, 0); uvMet(geo);
  const m = luoi(geo, mat); g.add(m); return m;
}
function canhKinh(g, M, x0, z0, x1, z1, y0, y1) { // tấm kính đứng từ (x0,z0) tới (x1,z1), có nẹp chân và đầu
  const dai = Math.hypot(x1 - x0, z1 - z0); if (dai < 0.02) return;
  const kg = new THREE.Group(), t = 0.012;
  const kinh = new THREE.Mesh(new THREE.BoxGeometry(dai, y1 - y0, t), M.kinh); kinh.position.set(dai / 2, (y0 + y1) / 2, 0); kinh.castShadow = false; kinh.receiveShadow = false; kg.add(kinh);
  hop(kg, M.chrome, 0, y0, -0.015, dai, y0 + 0.025, 0.015);
  hop(kg, M.chrome, 0, y1 - 0.02, -0.012, dai, y1, 0.012);
  kg.position.set(x0, 0, z0); kg.rotation.y = -Math.atan2(z1 - z0, x1 - x0); g.add(kg);
}
// ma trận đặt từ hàm đổi điểm 2D (x, y) → (X, Z); có thể gồm lật (định thức âm, three.js tự đổi mặt trước)
function maTran2D(f) {
  const o = f(0, 0), a = f(1, 0), b = f(0, 1), m = new THREE.Matrix4();
  m.set(a.x - o.x, 0, b.x - o.x, o.x, 0, 1, 0, 0, a.y - o.y, 0, b.y - o.y, o.y, 0, 0, 0, 1);
  return m;
}
function datMaTran(obj, m) { obj.matrixAutoUpdate = false; obj.matrix.copy(m); obj.updateMatrixWorld(true); return obj; }
// Nướng ma trận vào hình (để gộp). Ma trận có phép lật (định thức âm) làm đảo chiều tam giác → đảo lại, không thì mặt bị khuất.
function nuong(geo, mt) {
  const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(mt);
  if (mt.determinant() < 0) Object.keys(g.attributes).forEach((k) => {
    const a = g.attributes[k], n = a.itemSize, arr = a.array;
    for (let i = 0; i + 2 < a.count; i += 3) for (let c = 0; c < n; c++) { const t = arr[(i + 1) * n + c]; arr[(i + 1) * n + c] = arr[(i + 2) * n + c]; arr[(i + 2) * n + c] = t; }
  });
  return g;
}
// Thiết bị bật tắt được (đèn, vòi, tivi, bếp, cửa…): nhóm riêng, KHÔNG gộp vào khối tĩnh. info.diem = gốc hiệu ứng,
// info.hop = hộp bấm (cùng khung toạ độ với đồ vật). Phần "sống" (dung-3d-song.js) đọc các nhóm này.
function thietBi(g, info) { const d = new THREE.Group(); d.userData.dong = info; g.add(d); return d; }
function tachNhom(g, nhom) { // lấy riêng một nhóm mặt của hình không chỉ mục
  const out = new THREE.BufferGeometry();
  Object.keys(g.attributes).forEach((k) => { const a = g.attributes[k]; out.setAttribute(k, new THREE.BufferAttribute(a.array.slice(nhom.start * a.itemSize, (nhom.start + nhom.count) * a.itemSize), a.itemSize)); });
  return out;
}

/* ---------------- bộ vật liệu ---------------- */
function taoVatLieu(renderer, nho) {
  const ani = Math.min(8, renderer.capabilities.getMaxAnisotropy()), N = nho ? 512 : 1024;
  const cache = {};
  function tex(c, lap) {
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = ani; t.repeat.set(1 / lap, 1 / lap); return t;
  }
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phy = (o) => new THREE.MeshPhysicalMaterial(o);
  const M = {
    goSang: std({ map: tex(veGo('#c8a27a', 512, 11), 2.4), roughness: 0.55 }),
    goToi: std({ map: tex(veGo('#6e4a31', 512, 12), 2.4), roughness: 0.5 }),
    goTrung: std({ map: tex(veGo('#9c7552', 512, 13), 2.4), roughness: 0.5 }),
    trang: std({ color: '#f4f2ee', roughness: 0.45 }),
    trangMo: std({ color: '#ebe8e2', roughness: 0.8 }),
    xamTu: std({ color: '#5b6068', roughness: 0.5 }),
    khe: std({ color: '#2a2d31', roughness: 0.9 }),
    vaiXam: std({ map: tex(veVai('#a7a39c', 256, 21), 0.4), roughness: 0.92 }),
    vaiTrang: std({ map: tex(veVai('#f2efe8', 256, 22), 0.4), roughness: 0.9 }),
    vaiNhan: std({ map: tex(veVai('#8fa2a6', 256, 23), 0.4), roughness: 0.92 }),
    vaiDat: std({ map: tex(veVai('#b97c5c', 256, 24), 0.4), roughness: 0.92 }),
    vaiBe: std({ map: tex(veVai('#d9c7ab', 256, 25), 0.4), roughness: 0.92 }),
    vaiDam: std({ map: tex(veVai('#5f646b', 256, 26), 0.4), roughness: 0.92 }),
    su: phy({ color: '#fbfbfa', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 }),
    suTrong: std({ color: '#e9ecec', roughness: 0.2 }),
    chrome: std({ color: '#d8dadc', metalness: 1, roughness: 0.18 }),
    inox: std({ color: '#c4c7ca', metalness: 1, roughness: 0.38 }),
    denNham: std({ color: '#26282b', metalness: 0.4, roughness: 0.5 }),
    khungNhom: std({ color: '#3b4048', metalness: 0.6, roughness: 0.42 }),
    kinh: phy({ color: '#e8f2f4', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.2, depthWrite: false, envMapIntensity: 1.4 }),
    kinhDen: phy({ color: '#0b0c0e', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 }),
    manHinh: phy({ color: '#08090b', roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02 }),
    guong: std({ color: '#e6ebee', metalness: 1, roughness: 0.03 }),
    da: std({ map: tex(veDa('#eeebe5', 512, 31), 1.2), roughness: 0.22 }),
    daDen: std({ map: tex(veDa('#3a3a3c', 512, 32), 1.2), roughness: 0.2 }),
    la: std({ color: '#4f7a3f', roughness: 0.75, flatShading: true }),
    la2: std({ color: '#6b8f4a', roughness: 0.75, flatShading: true }),
    chau: std({ color: '#7b7a76', roughness: 0.85 }),
    datTrong: std({ color: '#4a3a2c', roughness: 1 }),
    soi: std({ map: tex(veGach('#c9c3b8', '#a9a397', 256, 16, 41, false), 0.4), roughness: 0.95 }),
    chupDen: std({ color: '#f4ead8', roughness: 0.7, emissive: '#ffe2b0', emissiveIntensity: 0.55 }),
    denTran: std({ color: '#ffffff', emissive: '#fff4e0', emissiveIntensity: 1.4 }),
    betong: std({ color: '#d9d6cf', roughness: 0.85 }),
    nguong: std({ map: tex(veDa('#d8d2c6', 256, 51), 0.8), roughness: 0.35 }),
    bo: std({ color: '#c9c4ba', roughness: 0.8 }),
    datNen: std({ color: '#d7dcd6', roughness: 1 }),
    trangTran: std({ color: '#f7f6f3', roughness: 0.9, side: THREE.DoubleSide }),
    poche: std({ color: '#38404b', roughness: 0.85 }),
    nhanChon: new THREE.MeshBasicMaterial({ color: '#c9962a', transparent: true, opacity: 0.22, depthWrite: false })
  };
  M.san = function (ma) {
    if (cache['s' + ma]) return cache['s' + ma];
    const s = SAN[ma] || SAN.gach_60_kem; let m;
    if (s.loai === 'go') m = std({ map: tex(veGo(s.mau, N, 3), 2.4), roughness: s.nham });
    else if (s.loai === 'da') m = std({ map: tex(veDa(s.mau, N, 5), s.kich), roughness: s.nham });
    else m = std({ map: tex(veGach(s.mau, s.ron, N, 4, 9, s.lech), s.kich * 4), roughness: s.nham });
    m.userData.ma = ma; cache['s' + ma] = m; return m;
  };
  M.tuong = function (ma) {
    if (cache['t' + ma]) return cache['t' + ma];
    const t = TUONG[ma] || TUONG.trang_nga;
    const m = t.op ? std({ map: tex(veGachOp(N / 2), 1.2), roughness: 0.18 }) : std({ color: t.mau, roughness: 0.88 });
    m.userData.ma = ma; cache['t' + ma] = m; return m;
  };
  // Đổi tông nội thất: thay ảnh hoạ tiết của chính các vật liệu dùng chung → mọi đồ vật đổi theo, không phải dựng lại.
  M.datNoiThat = function (nt) {
    const o = Object.assign({}, NOI_THAT_MAC_DINH, nt || {});
    const go = (NOI_THAT.go[o.go] || NOI_THAT.go.go_soi).mau, vai = (NOI_THAT.vai[o.vai] || NOI_THAT.vai.xam).mau, da = (NOI_THAT.da[o.da] || NOI_THAT.da.trang).mau;
    const doi = (m, khoa, ve) => { if (m.userData.khoa === khoa) return; const cu = m.map; m.map = cache['n' + khoa] || (cache['n' + khoa] = ve()); m.userData.khoa = khoa; if (cu && !Object.values(cache).includes(cu) && cu !== m.userData.goc) cu.dispose(); m.needsUpdate = true; };
    [['goSang', 0, 11], ['goTrung', 1, 13], ['goToi', 2, 12]].forEach(([k, i, hat]) => doi(M[k], k + go[i], () => tex(veGo(go[i], 512, hat), 2.4)));
    ['vaiXam', 'vaiDam', 'vaiNhan', 'vaiBe', 'vaiDat'].forEach((k, i) => doi(M[k], k + vai[k], () => tex(veVai(vai[k], 256, 21 + i), 0.4)));
    doi(M.da, 'da' + da, () => tex(veDa(da, 512, 31), 1.2)); M.da.roughness = o.da === 'den' ? 0.15 : 0.22;
    return o;
  };
  M.mauNoiThat = function (loai, ma) { // ô màu nhỏ cho nút chọn tông nội thất
    if (loai === 'go') return veGo(NOI_THAT.go[ma].mau[1], 120, 13);
    if (loai === 'da') return veDa(NOI_THAT.da[ma].mau, 120, 31);
    const c = canvas(60), g = c.getContext('2d'), m = NOI_THAT.vai[ma].mau;
    g.fillStyle = m.vaiXam; g.fillRect(0, 0, 60, 40); g.fillStyle = m.vaiDam; g.fillRect(0, 40, 30, 20); g.fillStyle = m.vaiNhan; g.fillRect(30, 40, 30, 20); return c;
  };
  M.mauMau = function (ma, loai) { // ảnh nhỏ cho nút chọn vật liệu
    if (loai === 'tuong') { const t = TUONG[ma]; if (t.op) return veGachOp(96); const c = canvas(48), g = c.getContext('2d'); g.fillStyle = t.mau; g.fillRect(0, 0, 48, 48); return c; }
    const s = SAN[ma];
    if (s.loai === 'go') return veGo(s.mau, 160, 3); if (s.loai === 'da') return veDa(s.mau, 160, 5); return veGach(s.mau, s.ron, 160, 3, 9, s.lech);
  };
  return M;
}

/* ---------------- đồ vật: dựng trong khung cục bộ x ∈ [0, w], z ∈ [0, h], lưng ở z = 0 ---------------- */
function giuong(g, M, w, h, doi) {
  const dau = 0.1;
  hopBo(g, M.vaiDam, 0, 0, 0, w, 1.05, dau, 0.035);                    // đầu giường bọc nệm
  hopBo(g, M.goToi, 0.01, 0.06, dau, w - 0.01, 0.3, h, 0.02);          // khung
  for (const [x, z] of [[0.06, dau + 0.06], [w - 0.06, dau + 0.06], [0.06, h - 0.06], [w - 0.06, h - 0.06]]) tru(g, M.denNham, x, z, 0, 0.07, 0.025);
  hopBo(g, M.vaiTrang, 0.05, 0.3, dau + 0.02, w - 0.05, 0.52, h - 0.03, 0.06); // nệm
  hopBo(g, M.vaiNhan, 0.03, 0.47, dau + 0.62, w - 0.03, 0.56, h + 0.005, 0.045); // chăn
  hopBo(g, M.vaiNhan, 0.03, 0.3, h - 0.035, w - 0.03, 0.56, h + 0.005, 0.02);   // chăn rủ chân giường
  hopBo(g, M.vaiBe, 0.02, 0.555, h - 0.55, w - 0.02, 0.585, h - 0.3, 0.012); // khăn vắt ngang
  const sGoi = doi ? 2 : 1, gw = doi ? (w - 0.32) / 2 : w - 0.4;
  for (let i = 0; i < sGoi; i++) { const x = doi ? 0.12 + i * (gw + 0.08) : 0.2; hopBo(g, M.vaiTrang, x, 0.5, dau + 0.07, x + gw, 0.66, dau + 0.47, 0.07); }
}
function tabDauGiuong(g, M, w, h) {
  hopBo(g, M.goSang, 0, 0.08, 0, w, 0.52, h, 0.012);
  hop(g, M.khe, 0.02, 0.3, h - 0.002, w - 0.02, 0.305, h + 0.001);
  hop(g, M.denNham, w / 2 - 0.06, 0.2, h, w / 2 + 0.06, 0.212, h + 0.012);
  for (const x of [0.04, w - 0.04]) for (const z of [0.04, h - 0.04]) tru(g, M.denNham, x, z, 0, 0.08, 0.012);
  tru(g, M.goSang, w / 2, h / 2, 0.52, 0.55, 0.07, 0.065);
  tru(g, M.chrome, w / 2, h / 2, 0.55, 0.78, 0.008);
  const d = thietBi(g, { loai: 'den', kieu: 'ngu', diem: [w / 2, 0.84, h / 2] });
  tru(d, M.chupDen, w / 2, h / 2, 0.74, 0.95, 0.13, 0.095);
}
function tuAo(g, M, w, h) {
  const cao = 2.3, so = Math.max(1, Math.round(w / 0.5)), cw = w / so;
  hop(g, M.khe, 0, 0, 0, w, cao, h - 0.02);
  hop(g, M.khe, 0.02, 0, h - 0.04, w - 0.02, 0.08, h - 0.02);
  for (let i = 0; i < so; i++) {
    const x = i * cw;
    hopBo(g, M.trang, x + 0.002, 0.085, h - 0.022, x + cw - 0.002, cao - 0.002, h, 0.004);
    const tay = i % 2 === 0 ? x + cw - 0.05 : x + 0.05;
    hopBo(g, M.chrome, tay - 0.007, 0.95, h, tay + 0.007, 1.35, h + 0.025, 0.006);
  }
}
function sofa(g, M, w, h) {
  const t = Math.min(0.2, w * 0.12), tren = 0.42;
  for (const [x, z] of [[0.08, 0.08], [w - 0.08, 0.08], [0.08, h - 0.08], [w - 0.08, h - 0.08]]) tru(g, M.goToi, x, z, 0, 0.1, 0.022, 0.016);
  hopBo(g, M.vaiXam, 0, 0.1, 0, w, tren, h, 0.04);
  hopBo(g, M.vaiXam, t - 0.02, tren - 0.02, 0, w - t + 0.02, 0.8, 0.2, 0.05);
  hopBo(g, M.vaiXam, 0, 0.1, 0, t, 0.64, h, 0.06); hopBo(g, M.vaiXam, w - t, 0.1, 0, w, 0.64, h, 0.06);
  const so = Math.max(1, Math.round((w - 2 * t) / 0.68)), cw = (w - 2 * t) / so;
  for (let i = 0; i < so; i++) {
    const x = t + i * cw;
    hopBo(g, M.vaiXam, x + 0.005, tren, 0.2, x + cw - 0.005, tren + 0.14, h - 0.015, 0.055);
    const lung = new THREE.Group(); hopBo(lung, M.vaiXam, 0, 0, -0.1, cw - 0.012, 0.36, 0.1, 0.07);
    lung.position.set(x + 0.006, tren + 0.12, 0.26); lung.rotation.x = -0.14; g.add(lung);
  }
  [[t + 0.18, 0.4], [w - t - 0.18, -0.35]].forEach(([x, xoay], i) => {
    const goi = new THREE.Group(); hopBo(goi, i ? M.vaiNhan : M.vaiDat, -0.21, 0, -0.06, 0.21, 0.4, 0.06, 0.08);
    goi.position.set(x, tren + 0.12, 0.34); goi.rotation.set(-0.25, xoay, 0); g.add(goi);
  });
}
function ghe(g, M, x0, z0, cw, sau, lungTruoc) { // ghế ăn: lưng ở phía xa bàn
  const z1 = z0 + sau;
  for (const x of [x0 + 0.04, x0 + cw - 0.04]) for (const z of [z0 + 0.04, z1 - 0.04]) hop(g, M.goToi, x - 0.018, 0, z - 0.018, x + 0.018, 0.44, z + 0.018);
  hopBo(g, M.vaiBe, x0, 0.42, z0, x0 + cw, 0.48, z1, 0.02);
  const zl = lungTruoc ? z0 : z1 - 0.04;
  hop(g, M.goToi, x0 + 0.02, 0.48, zl, x0 + 0.05, 0.9, zl + 0.035); hop(g, M.goToi, x0 + cw - 0.05, 0.48, zl, x0 + cw - 0.02, 0.9, zl + 0.035);
  hopBo(g, M.goToi, x0 + 0.02, 0.66, zl - 0.005, x0 + cw - 0.02, 0.9, zl + 0.03, 0.01);
}
function banAn(g, M, w, h) {
  const x0 = 0.1, x1 = w - 0.1, z0 = 0.5, z1 = h - 0.5;
  hopBo(g, M.goTrung, x0, 0.72, z0, x1, 0.76, z1, 0.008);
  for (const x of [x0 + 0.06, x1 - 0.06]) for (const z of [z0 + 0.06, z1 - 0.06]) hop(g, M.goTrung, x - 0.025, 0, z - 0.025, x + 0.025, 0.72, z + 0.025);
  const cw = 0.42, s = (w - 3 * cw) / 4;
  for (let i = 0; i < 3; i++) { const x = s + i * (cw + s); ghe(g, M, x, 0.05, cw, 0.42, true); ghe(g, M, x, h - 0.47, cw, 0.42, false); }
  tru(g, M.khungNhom, w / 2, h / 2, 1.75, CAO_TUONG, 0.004);
  const d = thietBi(g, { loai: 'den', kieu: 'ban_an', diem: [w / 2, 1.42, h / 2] });
  tru(d, M.denNham, w / 2, h / 2, 1.55, 1.75, 0.22, 0.05, 32);
  tru(d, M.chupDen, w / 2, h / 2, 1.545, 1.555, 0.2, 0.2, 32);
}
function banLamViec(g, M, w, h) {
  hopBo(g, M.goSang, 0, 0.72, 0, w, 0.75, h, 0.006);
  hop(g, M.denNham, 0.03, 0, 0.05, 0.06, 0.72, h - 0.05); hop(g, M.denNham, w - 0.06, 0, 0.05, w - 0.03, 0.72, h - 0.05);
  hopBo(g, M.goSang, w * 0.15, 0.55, 0, w * 0.85, 0.72, 0.38, 0.006);
  hopBo(g, M.denNham, w / 2 - 0.17, 0.75, 0.1, w / 2 + 0.17, 0.76, 0.33, 0.004); // máy tính xách tay
  const lap = new THREE.Group(); hop(lap, M.denNham, -0.17, 0, -0.005, 0.17, 0.23, 0.005); lap.position.set(w / 2, 0.76, 0.1); lap.rotation.x = -0.25; g.add(lap);
  const cx = w / 2, cz = h + 0.28;
  tru(g, M.denNham, cx, cz, 0, 0.03, 0.26, 0.26, 5); tru(g, M.chrome, cx, cz, 0.03, 0.42, 0.025);
  tru(g, M.vaiDam, cx, cz, 0.42, 0.5, 0.24, 0.24, 28);
  hopBo(g, M.vaiDam, cx - 0.21, 0.55, cz + 0.17, cx + 0.21, 1.02, cz + 0.24, 0.04);
}
function keTivi(g, M, w, h, coTivi) {
  hopBo(g, M.goToi, 0, 0.16, 0, w, 0.5, h, 0.008);
  const so = Math.max(2, Math.round(w / 0.6));
  for (let i = 1; i < so; i++) hop(g, M.khe, i * w / so - 0.002, 0.18, h - 0.001, i * w / so + 0.002, 0.48, h + 0.002);
  if (coTivi !== false) tivi(g, M, (w - Math.min(w - 0.1, 1.25)) / 2, 0.5, 0.06, Math.min(w - 0.1, 1.25), true);
}
function tivi(g, M, x, y, z, rong, deChan) {
  const cao = rong * 0.5625 + 0.02, yy = deChan ? y + 0.07 : y;
  hopBo(g, M.denNham, x, yy, z, x + rong, yy + cao, z + 0.035, 0.006);
  const d = thietBi(g, { loai: 'tivi', diem: [x + rong / 2, yy + cao / 2, z + 0.6], nut: [x + rong / 2, yy + cao * 0.5, z + 0.05] });
  hop(d, M.manHinh, x + 0.01, yy + 0.01, z + 0.035, x + rong - 0.01, yy + cao - 0.01, z + 0.037);
  if (deChan) { hop(g, M.denNham, x + rong / 2 - 0.15, y, z - 0.02, x + rong / 2 + 0.15, y + 0.012, z + 0.12); hop(g, M.denNham, x + rong / 2 - 0.03, y, z + 0.01, x + rong / 2 + 0.03, yy + 0.05, z + 0.03); }
}
function bonCay(g, M, w, h, r) {
  hopBo(g, M.chau, 0, 0, 0, w, 0.42, h, 0.015);
  hop(g, M.datTrong, 0.03, 0.42, 0.03, w - 0.03, 0.425, h - 0.03);
  const R = Math.min(h, 0.7) * 0.42, buoc = Math.max(0.3, R * 1.5);
  for (let x = R * 0.7 + 0.04, i = 0; x < w - R * 0.5; x += buoc, i++) {
    const cao = 0.5 + r() * 0.5, ban = R * (0.85 + r() * 0.35);
    for (let k = 0; k < 3; k++) {
      const geo = new THREE.IcosahedronGeometry(ban * (1 - k * 0.22), 1); geo.scale(1, 0.85, 1);
      geo.translate(x + (r() - 0.5) * 0.12, 0.42 + cao * (0.45 + k * 0.28), h / 2 + (r() - 0.5) * Math.max(0, h - 2 * ban) * 0.6);
      uvMet(geo); g.add(luoi(geo, (i + k) % 2 ? M.la : M.la2));
    }
  }
}
function tuBep(g, M, w, h, kieu) { // tủ bếp dưới + mặt đá; kieu: '' | 'bep' | 'chau'
  hop(g, M.khe, 0.02, 0, 0, w - 0.02, 0.1, h - 0.06);
  hop(g, M.trangMo, 0, 0.1, 0, w, 0.86, h - 0.025);
  const so = Math.max(1, Math.round(w / 0.6)), cw = w / so;
  for (let i = 0; i < so; i++) {
    const x = i * cw;
    hopBo(g, M.goTrung, x + 0.002, 0.105, h - 0.025, x + cw - 0.002, 0.855, h - 0.003, 0.004);
    hopBo(g, M.inox, x + cw * 0.25, 0.79, h - 0.003, x + cw * 0.75, 0.805, h + 0.018, 0.005);
  }
  hopBo(g, M.da, -0.005, 0.86, 0, w + 0.005, 0.9, h + 0.02, 0.006);
  if (kieu === 'bep') {
    hop(g, M.kinhDen, w * 0.08, 0.9, 0.08, w * 0.92, 0.906, h - 0.08);
    [[w * 0.3, h * 0.48], [w * 0.7, h * 0.48]].forEach(([x, z]) => { const geo = new THREE.TorusGeometry(Math.min(w, h) * 0.17, 0.004, 6, 40); geo.rotateX(Math.PI / 2); geo.translate(x, 0.907, z); g.add(luoi(geo, M.inox)); });
    hopBo(g, M.inox, 0.02, 1.58, 0, w - 0.02, 1.66, 0.5, 0.01);
    hop(g, M.inox, w / 2 - 0.15, 1.66, 0, w / 2 + 0.15, 2.7, 0.28);
    thietBi(g, { loai: 'bep', diem: [w / 2, 1.5, 0.3], vong: [[w * 0.3, h * 0.48], [w * 0.7, h * 0.48]], r: Math.min(w, h) * 0.17, y: 0.907, hop: [0, 0.86, 0, w, 1.66, h] });
  } else if (kieu === 'chau') {
    const x0 = Math.max(0.06, w / 2 - 0.3), x1 = Math.min(w - 0.06, w / 2 + 0.3);
    hop(g, M.inox, x0, 0.901, 0.12, x1, 0.904, h - 0.1);
    hop(g, M.khungNhom, x0 + 0.025, 0.903, 0.145, x1 - 0.025, 0.905, h - 0.125);
    tru(g, M.chrome, w / 2, 0.06, 0.9, 1.22, 0.016);
    const voi = new THREE.TorusGeometry(0.11, 0.013, 8, 20, Math.PI); voi.rotateY(Math.PI / 2); voi.translate(w / 2, 1.22, 0.17); g.add(luoi(voi, M.chrome));
    thietBi(g, { loai: 'voi', kieu: 'bep', diem: [w / 2, 1.21, 0.28], cao: 0.3, hop: [x0, 0.86, 0, x1, 1.36, h] });
  }
}
function tuLanh(g, M, w, h) {
  hopBo(g, M.inox, 0.01, 0, 0.02, w - 0.01, 1.85, h, 0.02);
  hop(g, M.khe, 0.01, 1.2, h - 0.004, w - 0.01, 1.205, h + 0.001);
  hop(g, M.khe, w / 2 - 0.002, 0.02, h - 0.004, w / 2 + 0.002, 1.2, h + 0.001);
  for (const x of [w / 2 - 0.05, w / 2 + 0.05]) hopBo(g, M.chrome, x - 0.008, 0.85, h, x + 0.008, 1.15, h + 0.03, 0.006);
  hopBo(g, M.chrome, w * 0.2, 1.25, h, w * 0.8, 1.27, h + 0.03, 0.006);
}
function bonCau(g, M, w, h) {
  hopBo(g, M.su, 0.04, 0.38, 0, w - 0.04, 0.78, 0.18, 0.035);
  tru(g, M.chrome, w / 2, 0.09, 0.78, 0.79, 0.025);
  const cz = 0.2 + (h - 0.2) / 2, rx = w / 2 - 0.04, rz = (h - 0.2) / 2;
  elip(g, M.su, w / 2, cz - 0.02, 0, 0.36, rx * 0.62, rz * 0.6, 1.45);
  elip(g, M.su, w / 2, cz, 0.36, 0.4, rx, rz);
  elip(g, M.suTrong, w / 2, cz, 0.4, 0.42, rx * 0.97, rz * 0.97);
  hop(g, M.su, w / 2 - 0.14, 0.18, 0.04, w / 2 + 0.14, 0.4, 0.2);
  thietBi(g, { loai: 'xa', diem: [w / 2, 0.418, cz], rx: rx * 0.8, rz: rz * 0.8, hop: [0, 0, 0, w, 0.82, h] });
}
function lavabo(g, M, w, h) {
  hopBo(g, M.goToi, 0, 0.14, 0, w, 0.8, h - 0.01, 0.008);
  hop(g, M.khe, 0.02, 0.47, h - 0.012, w - 0.02, 0.475, h - 0.008);
  hopBo(g, M.su, -0.01, 0.8, 0, w + 0.01, 0.86, h + 0.01, 0.015);
  elip(g, M.suTrong, w / 2, h * 0.56, 0.857, 0.862, w * 0.3, h * 0.28);
  tru(g, M.chrome, w / 2, 0.06, 0.86, 1.05, 0.015);
  hop(g, M.chrome, w / 2 - 0.012, 1.03, 0.06, w / 2 + 0.012, 1.05, 0.2);
  hopBo(g, M.guong, 0.03, 1.08, 0, w - 0.03, 1.88, 0.02, 0.01);
  const d = thietBi(g, { loai: 'den', kieu: 'guong', theoPhong: true, diem: [w / 2, 1.85, 0.25] });
  hopBo(d, M.chupDen, w * 0.2, 1.93, 0, w * 0.8, 1.97, 0.06, 0.01);
  thietBi(g, { loai: 'voi', kieu: 'lavabo', diem: [w / 2, 1.03, 0.19], cao: 0.168, hop: [0, 0.8, 0, w, 1.12, h] });
}
function khayTam(g, M, pts, vongTam) { // khay tắm thấp, vòi sen đứng ở góc (vongTam = [x, z])
  daGiac(g, M.su, pts, 0, 0.035);
  tru(g, M.chrome, vongTam[0], vongTam[1], 0.035, 2.12, 0.013);
  hop(g, M.chrome, vongTam[0] - 0.008, 2.08, vongTam[1], vongTam[0] + 0.008, 2.1, vongTam[1] + 0.28);
  tru(g, M.chrome, vongTam[0], vongTam[1] + 0.3, 2.05, 2.07, 0.12);
  tru(g, M.chrome, vongTam[0], vongTam[1], 1.0, 1.1, 0.03);
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  thietBi(g, { loai: 'sen', diem: [vongTam[0], 2.04, vongTam[1] + 0.3], san: 0.035, hop: [Math.min(...xs), 0, Math.min(...zs), Math.max(...xs), 2.1, Math.max(...zs)] });
}
function bonTam(g, M, w, h) {
  const t = 0.07;
  hopBo(g, M.su, 0, 0, 0, w, 0.12, h, 0.02);
  hopBo(g, M.su, 0, 0, 0, w, 0.56, t, 0.02); hopBo(g, M.su, 0, 0, h - t, w, 0.56, h, 0.02);
  hopBo(g, M.su, 0, 0, 0, t, 0.56, h, 0.02); hopBo(g, M.su, w - t, 0, 0, w, 0.56, h, 0.02);
  tru(g, M.chrome, 0.12, h / 2, 0.56, 0.68, 0.015);
  hop(g, M.chrome, 0.12, 0.66, h / 2 - 0.012, 0.25, 0.68, h / 2 + 0.012);
  thietBi(g, { loai: 'bon', diem: [0.245, 0.655, h / 2], o: [t, 0.12, t, w - t, 0.47, h - t], hop: [0, 0, 0, w, 0.7, h] });
}
function vachKinhDo(g, M, w, cua, rc, vt) {
  const cao = 2.0, z = 0.05;
  if (cua !== 'mo' && cua !== 'lua') { canhKinh(g, M, 0, z, w, z, 0, cao); return; }
  const r = Math.max(0.5, Math.min(rc || 0.7, w - 0.2)), x0 = vt === 'giua' ? (w - r) / 2 : 0.05, x1 = x0 + r;
  canhKinh(g, M, 0, z, x0, z, 0, cao); canhKinh(g, M, x1, z, w, z, 0, cao);
  if (cua === 'mo') { canhKinh(g, M, x0, z, x0 + Math.cos(0.5) * r, z + Math.sin(0.5) * r, 0.02, cao); }
  else { canhKinh(g, M, Math.max(0, x0 - 0.05), z + 0.035, Math.min(w, x1 + 0.05), z + 0.035, 0.02, cao); hop(g, M.chrome, 0, cao, z - 0.02, w, cao + 0.03, z + 0.06); }
}
function thangMay(g, M, w, h, cao) {
  hop(g, M.betong, 0, 0, 0, w, cao, h - 0.05);
  hop(g, M.inox, w / 2 - 0.45, 0, h - 0.05, w / 2 + 0.45, 2.1, h - 0.02);
  hop(g, M.khe, w / 2 - 0.002, 0, h - 0.021, w / 2 + 0.002, 2.1, h - 0.018);
  hop(g, M.khungNhom, w / 2 - 0.5, 2.1, h - 0.06, w / 2 + 0.5, 2.18, h - 0.015);
  hopBo(g, M.chrome, w / 2 + 0.55, 1.0, h - 0.05, w / 2 + 0.62, 1.15, h - 0.035, 0.005);
}

/* Cầu thang: theo đúng cách chia bậc của bản vẽ (KH.thangBoTri). Bậc cao hơn mặt cắt tường thì không vẽ
   (như mô hình cắt ngang). Mỗi bậc là khối bê tông dày 0,3 m dưới mặt bậc gỗ. */
function cauThang(g, M, t, dao, cat) {
  const n = t.n, rise = CAO_TANG / n, w = t.w, h = t.h, Z = (z) => dao ? h - z : z;
  const bac = (x0, x1, za, zb, cao) => {
    if (cao > cat + 0.02) return;
    const z0 = Math.min(Z(za), Z(zb)), z1 = Math.max(Z(za), Z(zb));
    hop(g, M.betong, x0, Math.max(0, cao - 0.32), z0, x1, cao - 0.03, z1);
    hop(g, M.goTrung, x0 - 0.005, cao - 0.035, z0 - 0.015, x1 + 0.005, cao, z1 + 0.015);
  };
  const lan = (x, za, ya, zb, yb) => { // tay vịn nghiêng dọc vế
    const z0 = Z(za), z1 = Z(zb), dz = z1 - z0, dy = yb - ya, dai = Math.hypot(dz, dy);
    if (Math.min(ya, yb) > cat) return;
    const r = new THREE.Group(); hop(r, M.denNham, -0.02, -0.02, 0, 0.02, 0.02, dai); r.position.set(x, ya + 0.9, z0); r.rotation.x = -Math.atan2(dy, dz); g.add(r);
    for (let k = 0; k <= 1; k++) { const zz = za + (zb - za) * (0.1 + k * 0.8), yy = ya + (yb - ya) * (0.1 + k * 0.8); if (yy < cat) hop(g, M.denNham, x - 0.015, yy, Z(zz) - 0.015, x + 0.015, yy + 0.9, Z(zz) + 0.015); }
  };
  if (t.kieu === 'I') {
    const b = t.vế[0].b;
    for (let k = 1; k <= n - 1; k++) bac(0, w, h - k * b, h - (k - 1) * b, k * rise);
    return;
  }
  if (t.kieu === 'U') {
    const ve = t.ve, land = t.land, n1 = t.vế[0].so_bac, b = t.vế[0].b, x2 = ve + t.gieng;
    for (let k = 1; k <= n1 - 1; k++) bac(0, ve, land + (n1 - 1 - k) * b, land + (n1 - k) * b, k * rise);
    bac(0, w, 0, land, n1 * rise);
    for (let k = 1; k <= t.vế[1].mat; k++) bac(x2, w, land + (k - 1) * b, land + k * b, (n1 + k) * rise);
    lan(ve + 0.03, h, 0, land, n1 * rise); lan(x2 - 0.03, land, n1 * rise, land + t.vế[1].mat * b, (n1 + t.vế[1].mat) * rise);
    return;
  }
  const v = t.ve, t1 = t.vế[0].mat, t2 = t.vế[1].mat, t3 = t.vế[2].mat, b1 = t.vế[0].b, bb = t.vế[1].b, b3 = t.vế[2].b;
  for (let k = 1; k <= t1; k++) bac(0, v, v + (t1 - k) * b1, v + (t1 - k + 1) * b1, k * rise);
  bac(0, v, 0, v, (t1 + 1) * rise);
  for (let k = 1; k <= t2; k++) bac(v + (k - 1) * bb, v + k * bb, 0, v, (t1 + 1 + k) * rise);
  bac(w - v, w, 0, v, (t1 + t2 + 2) * rise);
  for (let k = 1; k <= t3; k++) bac(w - v, w, v + (k - 1) * b3, v + k * b3, (t1 + t2 + 2 + k) * rise);
  lan(v + 0.03, h, 0, v, (t1 + 1) * rise); lan(w - v - 0.03, v, (t1 + t2 + 2) * rise, v + t3 * b3, (t1 + t2 + 2 + t3) * rise);
}

/* Khối WC: thiết bị lấy đúng từ KH.wcBoTri (cùng cách xếp với bản vẽ 2D). Mỗi thiết bị dựng trong khung riêng
   rồi đổi sang khung khối WC: (u dọc tường ướt, v vuông góc) → (x, y) như veWC. */
function khoiWC(g, M, KH, it) {
  const b = KH.wcBoTri(it.ts), uvXy = (u, v) => { const uu = it.ts.dao ? b.L - u : u; return b.doc ? { x: v, y: uu } : { x: uu, y: v }; };
  b.parts.forEach((p) => {
    const sub = new THREE.Group();
    if (p.ma === 'BX' || p.ma === 'LV') {
      const f = (fx, fy) => uvXy(p.u0 + fx, p.sv > 0 ? p.v0 + fy : p.v0 + p.dv - fy);
      (p.ma === 'BX' ? bonCau : lavabo)(sub, M, p.du, p.dv);
      g.add(datMaTran(sub, maTran2D(f))); return;
    }
    const f = (fx, fy) => uvXy(p.u0 + fx, p.v0 + fy);
    if (p.ma === 'TD' && p.vat) {
      const c = p.vat;
      khayTam(sub, M, [[0, 0], [p.du, 0], [p.du, p.dv - c], [p.du - c, p.dv], [0, p.dv]], [0.09, 0.08]);
      canhKinh(sub, M, p.du, 0, p.du, p.dv - c, 0.035, 2.0); canhKinh(sub, M, p.du - c, p.dv, 0, p.dv, 0.035, 2.0);
      canhKinh(sub, M, p.du, p.dv - c, p.du - c, p.dv, 0.035, 2.0);
    } else if (p.ma === 'TD') {
      khayTam(sub, M, [[0, 0], [p.du, 0], [p.du, p.dv], [0, p.dv]], [0.09, 0.08]);
      canhKinh(sub, M, p.du, 0, p.du, p.dv, 0.035, 2.0);
    } else if (p.ma === 'SEN') {
      tru(sub, M.chrome, p.du / 2, p.dv / 2, 0, 0.004, 0.05);
      tru(sub, M.chrome, 0.09, 0.08, 0, 2.12, 0.013); tru(sub, M.chrome, 0.09, 0.38, 2.05, 2.07, 0.12);
      hop(sub, M.chrome, 0.082, 2.08, 0.08, 0.098, 2.1, 0.36);
      thietBi(sub, { loai: 'sen', diem: [0.09, 2.04, 0.38], san: 0, hop: [0, 0, 0, p.du, 2.1, p.dv] });
    } else if (p.ma === 'BT') {
      const bt = new THREE.Group(); bonTam(bt, M, p.dv, p.du); // bồn nằm dọc khu tắm
      g.add(datMaTran(bt, maTran2D((fx, fy) => uvXy(p.u0 + fy, p.v0 + fx)))); return;
    }
    g.add(datMaTran(sub, maTran2D(f)));
  });
}

/* ================= dựng cả căn nhà từ bản vẽ ================= */
function tenVung(v) { return v ? (v.ten.length ? v.ten.join(' · ') : (v.trongNha ? 'Khoảng chưa đặt tên' : 'Sân')) : 'Ngoài nhà'; }
function khoaVung(v) { if (!v) return 'ngoai'; return v.phong.length ? 'p:' + v.phong[0].id : 'c:' + Math.round(v.cx * 10) + '_' + Math.round(v.cy * 10); }
function sanMacDinh(v) {
  if (!v || !v.trongNha) return 'da_san_vuon';
  const t = khongDau(v.ten.join(' '));
  if (/\bwc\b|ve sinh|tam/.test(t)) return 'gach_30_xam';
  if (/bep|phong an|\ban\b/.test(t)) return 'gach_60_kem';
  if (/ngu|\bpn/.test(t)) return 'go_soi';
  if (/tho/.test(t)) return 'go_oc_cho';
  if (/hien|\bsan\b|ban cong|gara|phoi|giat/.test(t)) return 'da_san_vuon';
  if (/khach|sinh hoat/.test(t)) return 'gach_80_kem';
  return 'gach_60_kem';
}
function tuongMacDinh(v) {
  if (!v || !v.trongNha) return 'son_ngoai';
  return /\bwc\b|ve sinh|tam/.test(khongDau(v.ten.join(' '))) ? 'gach_op' : 'trang_nga';
}

function dungNha(api, M, ch) {
  const plan = api.lay(), pt = api.phanTich(), KH = api.KH, CUA = api.CUA, vl = plan.vat_lieu || {};
  const goc = new THREE.Group(), tinh = new THREE.Group(), san = [], tuong = [], tuongPhu = [], dongDo = [];
  goc.add(tinh);
  const H = ch.ha ? CAO_HA : CAO_TUONG;
  const vungTai = (x, y) => { const c = pt.oTrong(x, y); return c < 0 ? -1 : pt.vung[c]; };
  const vung = (id) => (id >= 2 ? pt.theoMa[id] : null);
  const vatSan = (id) => M.san((vl[khoaVung(vung(id))] || {}).san || sanMacDinh(vung(id)));
  const vatTuong = (id) => { const v = vung(id); return M.tuong((vl[khoaVung(v)] || {}).tuong || tuongMacDinh(v)); };
  const laTrong = (id) => { const v = vung(id); return !!(v && v.trongNha); };

  /* ---- sàn: gộp ô lưới 5 cm cùng vùng thành hình chữ nhật ---- */
  const nx = pt.nx, ny = pt.ny, O = 0.05, dsHcn = new Map();
  let truoc = new Map();
  const xong = (r) => { if (!dsHcn.has(r[4])) dsHcn.set(r[4], []); dsHcn.get(r[4]).push(r); };
  for (let j = 0; j < ny; j++) {
    const nay = new Map(); let i = 0;
    while (i < nx) {
      const id = pt.vung[j * nx + i]; if (id < 2) { i++; continue; }
      let k = i; while (k + 1 < nx && pt.vung[j * nx + k + 1] === id) k++;
      const key = i + ',' + k + ',' + id; let r = truoc.get(key);
      if (r) r[3] = j; else r = [i, j, k, j, id];
      nay.set(key, r); i = k + 1;
    }
    truoc.forEach((r, key) => { if (!nay.has(key)) xong(r); });
    truoc = nay;
  }
  truoc.forEach(xong);
  const matPhang = (ds, y, xuong) => { // các hình chữ nhật [x0,z0,x1,z1] → mặt phẳng ngang, UV theo mét
    const pos = [], nor = [], uv = [], ny2 = xuong ? -1 : 1;
    ds.forEach(([x0, z0, x1, z1]) => {
      const q = xuong ? [[x0, z0], [x1, z0], [x1, z1], [x0, z0], [x1, z1], [x0, z1]] : [[x0, z0], [x0, z1], [x1, z1], [x0, z0], [x1, z1], [x1, z0]];
      q.forEach(([x, z]) => { pos.push(x, y, z); nor.push(0, ny2, 0); uv.push(x, -z); });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return geo;
  };
  const hcnTheoVung = new Map();
  dsHcn.forEach((ds, id) => {
    const hcn = ds.map((r) => [pt.x0 + r[0] * O, pt.y0 + r[1] * O, pt.x0 + (r[2] + 1) * O, pt.y0 + (r[3] + 1) * O]);
    hcnTheoVung.set(id, hcn);
    const m = new THREE.Mesh(matPhang(hcn, laTrong(id) ? 0 : SAN_NGOAI, false), vatSan(id));
    m.receiveShadow = true; m.userData.vung = id; goc.add(m); san.push(m);
  });

  /* ---- tường: mỗi đoạn tường cắt thành các khối quanh lỗ cửa; mặt hai bên theo phòng hai bên ---- */
  const viTuong = (w) => { const g = api.hinh(w); const m = new THREE.Matrix4(); m.set(g.ux, 0, g.nx, g.A.x, 0, 1, 0, 0, g.uy, 0, g.ny, g.A.y, 0, 0, 0, 1); return { g, m }; };
  const caoLo = (op) => {
    const c = CUA[op.ma] || {};
    if (c.loai === 'so') { const s = SO_CAO[op.ma] || [0.8, 2.4]; return { duoi: s[0], tren: s[1], so: true }; }
    return { duoi: 0, tren: (c.xep || c.lua || c.lo) ? CUA_CAO.rong : CUA_CAO.di, so: false };
  };
  const matTuong = new Map();
  plan.walls.forEach((w) => {
    const { g, m } = viTuong(w), t = w.t, ea = api.dauNoi(w, w.a), eb = api.dauNoi(w, w.b);
    const lo = plan.ops.filter((o) => o.w === w.id && CUA[o.ma]).map((o) => Object.assign({ op: o, s0: o.s - o.rong / 2, s1: o.s + o.rong / 2 }, caoLo(o))).sort((a, b) => a.s0 - b.s0);
    const manh = []; let u = -ea;
    lo.forEach((l) => {
      if (l.s0 > u + 1e-4) manh.push([u, l.s0, 0, H]);
      if (l.duoi > 0) manh.push([l.s0, l.s1, MAT_DAT, Math.min(l.duoi, H)]);
      if (l.tren < H - 1e-4) manh.push([l.s0, l.s1, l.tren, H]);
      u = Math.max(u, l.s1);
    });
    if (g.len + eb > u + 1e-4) manh.push([u, g.len + eb, 0, H]);
    manh.forEach(([u0, u1, y0, y1]) => {
      if (u1 - u0 < 1e-3 || y1 - y0 < 1e-3) return;
      const giua = (u0 + u1) / 2, px = g.A.x + g.ux * giua, py = g.A.y + g.uy * giua, d = t / 2 + 0.1;
      const vP = vungTai(px + g.nx * d, py + g.ny * d), vN = vungTai(px - g.nx * d, py - g.ny * d);
      const yy0 = y0 === 0 ? MAT_DAT : y0;
      const geo = new THREE.BoxGeometry(u1 - u0, y1 - yy0, t); geo.translate(giua, (yy0 + y1) / 2, 0); uvMet(geo);
      // mặt tường gom theo phòng nó quay vào: mỗi phòng một khối (ít lần vẽ, đổi màu tường một phòng = đổi một vật liệu)
      const gw = nuong(geo, m);
      gw.groups.forEach((gr) => {
        const vv = gr.materialIndex === 5 ? vN : (gr.materialIndex === 2 || gr.materialIndex === 3 ? 'poche' : vP);
        if (!matTuong.has(vv)) matTuong.set(vv, []); matTuong.get(vv).push(tachNhom(gw, gr));
      });
      if (y0 === 0) [[vP, 1], [vN, -1]].forEach(([v, s]) => { // len chân tường trong nhà
        if (!laTrong(v)) return;
        const lc = new THREE.Group(); hop(lc, M.trang, u0, 0, s > 0 ? t / 2 : -t / 2 - 0.012, u1, 0.08, s > 0 ? t / 2 + 0.012 : -t / 2);
        datMaTran(lc, m); dongDo.push(lc);
      });
    });
    // ngưỡng cửa, khung, cánh, cửa sổ
    lo.forEach((l) => {
      const c = CUA[l.op.ma], op = l.op, cg = new THREE.Group(), tren = Math.min(l.tren, H);
      if (!l.so) hop(cg, M.nguong, l.s0, MAT_DAT, -t / 2, l.s1, 0.004, t / 2);
      if (l.so) {
        if (l.duoi < H) {
          hop(cg, M.nguong, l.s0 - 0.03, l.duoi - 0.03, -t / 2 - 0.03, l.s1 + 0.03, l.duoi, t / 2 + 0.03);
          const k = 0.05, y0 = l.duoi, y1 = tren;
          hop(cg, M.khungNhom, l.s0, y0, -0.035, l.s1, y0 + k, 0.035); if (y1 >= l.tren - 1e-4) hop(cg, M.khungNhom, l.s0, y1 - k, -0.035, l.s1, y1, 0.035);
          hop(cg, M.khungNhom, l.s0, y0, -0.035, l.s0 + k, y1, 0.035); hop(cg, M.khungNhom, l.s1 - k, y0, -0.035, l.s1, y1, 0.035);
          const song = c.song || 0;
          for (let i = 1; i <= song; i++) { const x = l.s0 + (l.s1 - l.s0) * i / (song + 1); hop(cg, M.khungNhom, x - 0.02, y0, -0.03, x + 0.02, y1, 0.03); }
          const kinh = new THREE.Mesh(new THREE.BoxGeometry(l.s1 - l.s0 - 2 * k, Math.max(0.01, y1 - y0 - 2 * k), 0.01), M.kinh);
          kinh.position.set((l.s0 + l.s1) / 2, (y0 + y1) / 2, 0); cg.add(kinh);
        }
      } else if (!c.lo) {
        const k = 0.045, dt = t / 2 + 0.012;
        hop(cg, M.goToi, l.s0, 0, -dt, l.s0 + k, tren, dt); hop(cg, M.goToi, l.s1 - k, 0, -dt, l.s1, tren, dt);
        if (tren >= l.tren - 1e-4) hop(cg, M.goToi, l.s0, tren - k, -dt, l.s1, tren, dt);
        const caoCanh = Math.min(tren, l.tren) - 0.05;
        if (c.canh) {
          const canh = (sh, du, dai) => { // cánh xoay quanh bản lề sh, mở về phía op.phia
            const cn = new THREE.Group(), dy = caoCanh;
            hopBo(cn, M.goTrung, 0, 0.01, -0.02, dai, dy, 0.02, 0.004);
            hop(cn, M.goToi, 0.06, 0.25, -0.0205, dai - 0.06, 0.26, 0.0205); hop(cn, M.goToi, 0.06, dy - 0.3, -0.0205, dai - 0.06, dy - 0.29, 0.0205);
            if (dy > 1.1) for (const s of [-1, 1]) { hop(cn, M.chrome, dai - 0.09, 1.0, s * 0.02, dai - 0.07, 1.02, s * 0.06); hop(cn, M.chrome, dai - 0.22, 1.0, s * 0.055, dai - 0.07, 1.016, s * 0.068); }
            const phi = Math.atan2(op.phia * Math.sin(GOC_MO_CUA), du * Math.cos(GOC_MO_CUA));
            cn.position.set(sh, 0, op.phia * (t / 2 - 0.02)); cn.rotation.y = -phi; cg.add(cn);
            cn.userData.dong = { loai: 'cua', mo: -phi, khoa: op.id + ':' + du };
          };
          if (c.canh === 2) { canh(l.s0 + k, 1, (l.s1 - l.s0) / 2 - k); canh(l.s1 - k, -1, (l.s1 - l.s0) / 2 - k); }
          else canh(op.ban_le === 'a' ? l.s0 + k : l.s1 - k, op.ban_le === 'a' ? 1 : -1, l.s1 - l.s0 - 2 * k);
        } else {
          const tam = (u0, u1, v) => { // cánh kính khung nhôm
            hop(cg, M.khungNhom, u0, 0.01, v - 0.025, u1, 0.06, v + 0.025); hop(cg, M.khungNhom, u0, caoCanh - 0.05, v - 0.025, u1, caoCanh, v + 0.025);
            hop(cg, M.khungNhom, u0, 0.01, v - 0.025, u0 + 0.05, caoCanh, v + 0.025); hop(cg, M.khungNhom, u1 - 0.05, 0.01, v - 0.025, u1, caoCanh, v + 0.025);
            const kk = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.01, u1 - u0 - 0.1), Math.max(0.01, caoCanh - 0.12), 0.01), M.kinh); kk.position.set((u0 + u1) / 2, caoCanh / 2 + 0.03, v); cg.add(kk);
          };
          const a = l.s0 + k, b = l.s1 - k, r = b - a;
          if (c.lua) { tam(a, a + r * 0.55, 0.03); tam(b - r * 0.55, b, -0.03); }
          else { const so = 4; for (let i = 0; i < so; i++) tam(a + r * i / so, a + r * (i + 1) / so, (i % 2 ? 0.02 : -0.02)); }
        }
      }
      datMaTran(cg, m); dongDo.push(cg);
    });
  });

  matTuong.forEach((ds, vv) => {
    const gop = mergeGeometries(ds, false); if (!gop) return;
    const laPoche = vv === 'poche', mesh = new THREE.Mesh(gop, laPoche ? M.poche : vatTuong(vv));
    mesh.castShadow = true; mesh.receiveShadow = true; goc.add(mesh);
    if (laPoche) tuongPhu.push(mesh); else { mesh.userData = { vungTuong: vv }; tuong.push(mesh); }
  });

  /* ---- đồ vật ---- */
  const rr = ngauNhien(97);
  const satTuong = (f, fx, fy) => { const p = f(fx, fy), c = pt.o(p.x, p.y); return c >= 0 && pt.ran[c] === 1; };
  plan.items.forEach((it) => {
    const ma = it.ma, w = it.w, h = it.h, f = api.doiDiem(it), g = new THREE.Group();
    const ts = api.thamSoDo(it);
    switch (ma) {
      case 'GD': giuong(g, M, w, h, true); break;
      case 'GN': giuong(g, M, w, h, w >= 1.35); break;
      case 'TDG': tabDauGiuong(g, M, w, h); break;
      case 'TA': tuAo(g, M, w, h); break;
      case 'SF': sofa(g, M, w, h); break;
      case 'BA': banAn(g, M, w, h); break;
      case 'BL': banLamViec(g, M, w, h); break;
      case 'TV': keTivi(g, M, w, h, it.tivi); break;
      case 'TVR': tivi(g, M, 0, 0.92, 0.03, w, false); break;
      case 'BC': bonCay(g, M, w, h, rr); break;
      case 'TB': tuBep(g, M, w, h, ''); break;
      case 'BN': tuBep(g, M, w, h, 'bep'); break;
      case 'CR': tuBep(g, M, w, h, 'chau'); break;
      case 'TL': tuLanh(g, M, w, h); break;
      case 'BX': bonCau(g, M, w, h); break;
      case 'LV': lavabo(g, M, w, h); break;
      case 'BT': bonTam(g, M, w, h); break;
      case 'TD': {
        khayTam(g, M, [[0, 0], [w, 0], [w, h], [0, h]], [0.09, 0.08]);
        if (!satTuong(f, w / 2, h + 0.08)) canhKinh(g, M, 0, h, w, h, 0.035, 2.0);
        if (!satTuong(f, w + 0.08, h / 2)) canhKinh(g, M, w, 0, w, h, 0.035, 2.0);
        if (!satTuong(f, -0.08, h / 2)) canhKinh(g, M, 0, 0, 0, h, 0.035, 2.0);
        break;
      }
      case 'TDV': {
        const c = Math.max(0.15, Math.min(it.vat || 0.35, Math.min(w, h) - 0.2));
        khayTam(g, M, [[0, 0], [w, 0], [w, h - c], [w - c, h], [0, h]], [0.09, 0.08]);
        canhKinh(g, M, w, 0, w, h - c, 0.035, 2.0); canhKinh(g, M, w - c, h, 0, h, 0.035, 2.0); canhKinh(g, M, w, h - c, w - c, h, 0.035, 2.0);
        break;
      }
      case 'VK': vachKinhDo(g, M, w, it.cua, it.rc, it.vt); break;
      case 'WC': khoiWC(g, M, KH, { ts }); break;
      case 'TH': cauThang(g, M, KH.thangBoTri(ts), !!it.dao, H); break;
      case 'TM': thangMay(g, M, w, h, H); break;
      case 'G': hop(g, M.trangMo, 0, MAT_DAT, 0, w, H, h); break;
      case 'COT': hop(g, M.trangMo, 0, MAT_DAT, 0, w, H, h); break;
      case 'GT': hop(g, M.soi, 0, MAT_DAT, 0, w, 0.012, h); bonCay(g, M, Math.min(w, 0.6), Math.min(h, 0.6), rr); break;
      case 'CAD': cadKhoi(g, M, KH, it); break;
      default: return; // VAO, BAC: ghi chú, không dựng
    }
    let n = 0; g.traverse((o) => { if (o.userData.dong && !o.userData.dong.khoa) o.userData.dong.khoa = it.id + ':' + o.userData.dong.loai + ':' + (n++); });
    datMaTran(g, maTran2D(f)); dongDo.push(g);
  });

  /* ---- gộp mọi khối tĩnh theo vật liệu: vài chục lần vẽ thay vì vài nghìn (điện thoại chạy mượt) ---- */
  const theoVat = new Map(), con = [], dsDong = [];
  const duyet = (o) => {
    if (o.userData.dong) { dsDong.push(o); return; } // thiết bị bật tắt: giữ riêng
    if (o.isMesh) con.push(o); else if (o.isLineSegments) tinh.add(new THREE.LineSegments(o.geometry.clone().applyMatrix4(o.matrixWorld), o.material));
    o.children.forEach(duyet);
  };
  dongDo.forEach((g) => { g.updateMatrixWorld(true); duyet(g); });
  // Mỗi thiết bị: gộp nội bộ theo vật liệu (cửa ~3 lần vẽ thay vì ~12), gắn vào một khung mang ma trận cha để còn xoay/đổi vật liệu.
  const thietBiDs = [];
  dsDong.forEach((o) => {
    const nghich = o.matrixWorld.clone().invert(), nhom = new Map(), rel = new THREE.Matrix4();
    o.traverse((m) => { if (!m.isMesh) return; rel.multiplyMatrices(nghich, m.matrixWorld); const g2 = nuong(m.geometry, rel); Object.keys(g2.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal' && k !== 'uv') g2.deleteAttribute(k); }); if (!g2.attributes.uv) uvMet(g2); const k = m.material.uuid; if (!nhom.has(k)) nhom.set(k, { mat: m.material, ds: [] }); nhom.get(k).ds.push(g2); });
    const khung = new THREE.Group(); khung.matrixAutoUpdate = false; khung.matrix.copy(o.parent.matrixWorld);
    o.removeFromParent(); while (o.children.length) o.remove(o.children[0]);
    nhom.forEach(({ mat, ds }) => { const gop = mergeGeometries(ds, false); if (!gop) return; const me = new THREE.Mesh(gop, mat); me.castShadow = !mat.transparent && (o.userData.dong.loai !== 'cua' || mat === M.goTrung); me.receiveShadow = true; o.add(me); });
    khung.add(o); goc.add(khung);
    thietBiDs.push({ o, info: o.userData.dong });
  });
  con.forEach((o) => {
    const g2 = nuong(o.geometry, o.matrixWorld);
    Object.keys(g2.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal' && k !== 'uv') g2.deleteAttribute(k); });
    if (!g2.attributes.uv) uvMet(g2);
    const k = o.material.uuid; if (!theoVat.has(k)) theoVat.set(k, { mat: o.material, ds: [] }); theoVat.get(k).ds.push(g2);
  });
  theoVat.forEach(({ mat, ds }) => {
    const gop = mergeGeometries(ds, false); if (!gop) return;
    const mesh = new THREE.Mesh(gop, mat); mesh.castShadow = !mat.transparent && !(mat.emissive && mat.emissive.getHex() !== 0); mesh.receiveShadow = !mat.transparent; tinh.add(mesh);
  });

  /* ---- mặt đất, ranh lô ---- */
  const xs = [], zs = [];
  Object.keys(plan.nodes).forEach((k) => { xs.push(plan.nodes[k].x); zs.push(plan.nodes[k].y); });
  (plan.ranh || []).forEach((p) => { xs.push(p[0]); zs.push(p[1]); });
  if (!xs.length) { xs.push(0, 10); zs.push(0, 10); }
  const bien = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  bien.cx = (bien.x0 + bien.x1) / 2; bien.cz = (bien.z0 + bien.z1) / 2; bien.R = Math.max(3, Math.hypot(bien.x1 - bien.x0, bien.z1 - bien.z0) / 2);
  const dat = new THREE.Mesh(new THREE.CircleGeometry(Math.max(60, bien.R * 14), 48), M.datNen);
  dat.rotation.x = -Math.PI / 2; dat.position.set(bien.cx, MAT_DAT - 0.002, bien.cz); dat.receiveShadow = true; goc.add(dat);
  if (plan.ranh && plan.ranh.length > 2) {
    const bg = new THREE.Group();
    plan.ranh.forEach((p, i) => {
      const q = plan.ranh[(i + 1) % plan.ranh.length], dai = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dai < 0.05) return;
      const b = new THREE.Group(); hop(b, M.bo, 0, MAT_DAT, -0.05, dai, 0.1, 0.05); b.position.set(p[0], 0, p[1]); b.rotation.y = -Math.atan2(q[1] - p[1], q[0] - p[0]); bg.add(b);
    });
    goc.add(bg);
  }

  /* ---- trần (chỉ hiện khi đi trong nhà) ---- */
  const tran = new THREE.Group(), denPhong = [];
  hcnTheoVung.forEach((hcn, id) => { if (!laTrong(id)) return; const m = new THREE.Mesh(matPhang(hcn, CAO_TUONG, true), M.trangTran); m.receiveShadow = true; tran.add(m); });
  pt.vungs.forEach((v) => {
    if (!v.trongNha || v.dt < 2) return;
    const den = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 20), M.denTran); den.position.set(v.cx, CAO_TUONG - 0.006, v.cy); tran.add(den);
    denPhong.push({ x: v.cx, z: v.cy, dt: v.dt, vung: v.ma, mesh: den });
  });
  tran.visible = false; goc.add(tran);

  return { goc, san, tuong, tuongPhu, bien, pt, tran, denPhong, thietBi: thietBiDs, hcnTheoVung, vatSan, vatTuong, vung, laTrong, tenVung };
}

function cadKhoi(g, M, KH, it) { // khối thư viện mở rộng: hộp mờ theo khung bao + nét mặt bằng ở đỉnh
  const k = KH.CAD[it.cad], w = it.w, h = it.h;
  const cao = { 'Nội thất': 0.75, 'Vệ sinh': 0.8, 'Bếp': 0.9, 'Xe': 1.45, 'Cây cảnh': 1.3, 'Người': 1.7, 'Điện nước': 0.02 }[k && k.nhom] || 0.6;
  if (!M.cadMo) M.cadMo = new THREE.MeshStandardMaterial({ color: '#d8d2c6', roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false });
  if (cao > 0.05) hop(g, M.cadMo, 0, 0, 0, w, cao, h);
  if (!k) return;
  const sx = w / (k.w / 1000), sz = h / (k.h / 1000), pts = [];
  k.p.forEach((fl) => { for (let i = 0; i + 3 < fl.length; i += 2) pts.push(fl[i] / 1000 * sx, cao + 0.004, fl[i + 1] / 1000 * sz, fl[i + 2] / 1000 * sx, cao + 0.004, fl[i + 3] / 1000 * sz); });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(geo, M.netCad || (M.netCad = new THREE.LineBasicMaterial({ color: '#3d4b5c' }))));
}

/* ================= màn hình xem 3D ================= */
function taoEl(ten, lop, cha, chu) { const e = document.createElement(ten); if (lop) e.className = lop; if (chu !== undefined) e.textContent = chu; if (cha) cha.appendChild(e); return e; }
function nutIcon(cha, lop, nhan, duongSvg) {
  const b = taoEl('button', lop, cha); b.type = 'button';
  if (duongSvg) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    duongSvg.split('|').forEach((d) => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.appendChild(p); });
    b.appendChild(s);
  }
  taoEl('span', '', b, nhan); return b;
}

let dangMo = null;
export async function mo(api) {
  if (dangMo) return dangMo;
  const nho = laDienThoai(), plan = api.lay();
  const ch = { cheDo: 'tong', ha: false, nhan: true, ao: !nho };

  /* ---- khung giao diện ---- */
  const goc = taoEl('div', 'x3d', document.body); document.body.classList.add('x3d-mo'); goc.setAttribute('role', 'dialog'); goc.setAttribute('aria-label', 'Xem 3D');
  const dau = taoEl('header', 'x3d-dau', goc);
  const nutVe = nutIcon(dau, 'x3d-nut x3d-ve', 'Mặt bằng', 'M15 18l-6-6 6-6');
  const tieuDe = taoEl('div', 'x3d-tieu', dau); taoEl('span', 'x3d-nhan-trang', tieuDe, 'Xem 3D'); taoEl('b', '', tieuDe, plan.ten || 'Bản vẽ');
  const nutGhim = nutIcon(dau, 'x3d-nut x3d-ghim', 'Lưu điểm nhìn', 'M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z|M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z');
  const nutNoiThat = nutIcon(dau, 'x3d-nut x3d-noi-that', 'Tông nội thất', 'M4 18v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5|M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3|M4 18h16|M6 18v2|M18 18v2');
  const nutDep = nutIcon(dau, 'x3d-nut x3d-dep', 'Ảnh như thật', 'M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z|M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z');
  const nutChup = nutIcon(dau, 'x3d-nut x3d-chup', 'Chụp ảnh', 'M4 8h3l2-3h6l2 3h3v11H4z|M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z');
  const khung = taoEl('div', 'x3d-khung', goc);
  const lopTen = taoEl('div', 'x3d-lop-ten', khung);
  const tuy = taoEl('div', 'x3d-tuy', goc);
  const chip = (chu, bat, khiDoi) => { const b = taoEl('button', 'x3d-chip', tuy, chu); b.type = 'button'; b.setAttribute('aria-pressed', String(bat)); b.addEventListener('click', () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); khiDoi(v); }); return b; };
  const chipHa = chip('Hạ tường', false, (v) => { ch.ha = v; dungLai(); api.ga('aln_dmb_3d', { buoc: 'ha_tuong', bat: v ? 1 : 0 }); });
  chip('Tên phòng', true, (v) => { ch.nhan = v; veTen(); ve(); });
  const chipAo = nho ? null : chip('Bóng đổ góc', true, (v) => { ch.ao = v; ve(); });
  const chipNhe = chip('Nhẹ máy', false, (v) => {
    cl.nhe = v; try { localStorage.setItem('aln_dmb_3d_nhe', v ? '1' : '0'); } catch (e) { /* bỏ qua */ }
    if (v) apMuc(MUC_CL.length - 1); else { apMuc(0); if (chipAo && !ch.ao) { ch.ao = true; chipAo.setAttribute('aria-pressed', 'true'); } }
    bao(v ? 'Đã bật Nhẹ máy: hình bớt nét, xoay và đi mượt hơn.' : 'Đã tắt Nhẹ máy: hình nét nhất.');
    api.ga('aln_dmb_3d', { buoc: 'nhe_may', bat: v ? 1 : 0 });
  });
  chipNhe.title = 'Giảm độ nét và bóng để máy yếu, điện thoại xem mượt';
  const cheDo = taoEl('div', 'x3d-che-do', goc); cheDo.setAttribute('role', 'tablist');
  const nutCD = {};
  [['tong', 'Toàn cảnh'], ['tren', 'Từ trên'], ['di', 'Đi trong nhà']].forEach(([k, chu]) => {
    const b = taoEl('button', '', cheDo, chu); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(k === 'tong'));
    b.addEventListener('click', () => datCheDo(k)); nutCD[k] = b;
  });
  const nutTQ = taoEl('button', 'x3d-nut-tq', cheDo); nutTQ.type = 'button'; nutTQ.setAttribute('aria-haspopup', 'dialog');
  taoEl('span', '', nutTQ, 'Tham quan');
  const goiY = taoEl('div', 'x3d-goi-y', goc);
  const bang = taoEl('aside', 'x3d-bang', goc); bang.hidden = true;
  const dongTB = taoEl('div', 'x3d-thong-bao', goc); dongTB.setAttribute('role', 'status'); dongTB.setAttribute('aria-live', 'polite');
  let henTB = null; const bao = (chu) => { dongTB.textContent = chu; clearTimeout(henTB); henTB = setTimeout(() => { dongTB.textContent = ''; }, 3200); };

  /* ---- bộ vẽ ---- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    goc.remove(); throw new Error('webgl');
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, nho ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // bóng nắng chỉ vẽ lại khi nắng/nhà/đồ đổi, xoay máy quay không phải vẽ lại bóng
  khung.insertBefore(renderer.domElement, lopTen);
  const scene = new THREE.Scene();
  const nen = new THREE.Color('#e8ecf0'); scene.background = nen;
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const troi = new THREE.HemisphereLight('#ffffff', '#cfc6b8', 0.7); scene.add(troi);
  const nang = new THREE.DirectionalLight('#fff1dc', 2.4); nang.castShadow = true;
  nang.shadow.mapSize.set(nho ? 2048 : 4096, nho ? 2048 : 4096); nang.shadow.bias = -0.0003; nang.shadow.normalBias = 0.025;
  scene.add(nang, nang.target);
  const FOV_XA = 40, FOV_DI = 68, camera = new THREE.PerspectiveCamera(FOV_XA, 1, 0.05, 600);
  const M = taoVatLieu(renderer, nho);
  const ctl = new OrbitControls(camera, renderer.domElement);
  ctl.enableDamping = true; ctl.dampingFactor = 0.09; ctl.screenSpacePanning = true; ctl.maxPolarAngle = Math.PI / 2 - 0.04;
  const song = taoSong({ scene, camera, renderer, nang, troi, M, nho, khung, goc, ctl, ch, api, CAO_TUONG, bao: (c) => bao(c), ve: () => ve(), dongBangVatLieu: () => dongBang() });
  const tq = taoThamQuan({
    camera, renderer, khung, goc, api, song, nho, ch, FOV_XA, FOV_DI, MAT_MAT, khongDau, tenVung,
    nha: () => nha, ve: () => ve(), veNgay: () => veNgay(), bao: (c) => bao(c),
    viTriTong: () => viTriTong(), gocNhinDai: (p) => gocNhinDai(p), gocDep: (v) => gocDep(v), khoangTruoc: (x, z, yaw) => xaNhat(x, z, yaw),
    tenTai: (x, z, trong) => { if (!trong) return 'Toàn cảnh'; const c = nha.pt.oTrong(x, z), v = c < 0 ? null : nha.vung(nha.pt.vung[c]); return v ? tenVung(v) : 'Trong nhà'; },
    dongBangKhac: () => { dongBang(); song.dongBangGio(); },
    datNoiBo: (trong) => datNoiBo(trong),
    sauKhiDat: (d) => sauKhiDat(d),
    batDauTQ: () => { hoatCanh = null; ctl.enabled = false; dongBang(); song.dongBangGio(); },
    ketThucTQ: (cu) => ketThucTQ(cu)
  });
  let composer = null, gtao = null;
  if (!nho) {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    gtao = new GTAOPass(scene, camera, 4, 4); gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 16 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    composer.addPass(gtao); composer.addPass(new OutputPass());
  }

  /* ---- dựng / dựng lại ---- */
  let nha = null, chon = null, lopChon = null;
  function boNha() {
    if (!nha) return;
    scene.remove(nha.goc);
    nha.goc.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    nha = null;
  }
  function dungLai() {
    boNha(); canBong = true; nghiDo();
    nha = dungNha(api, M, ch);
    scene.add(nha.goc);
    const b = nha.bien, R = b.R;
    const sc = nang.shadow.camera, e = R + 2.5; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 0.5; sc.updateProjectionMatrix();
    scene.fog = new THREE.Fog(nen, R * 5 + 20, R * 12 + 60);
    ctl.maxDistance = R * 6 + 10; ctl.minDistance = 1.5;
    nha.tran.visible = ch.cheDo === 'di';
    song.ganNha(nha); song.datCheDo(ch.cheDo); // giờ, mùa, đèn, thiết bị: dung-3d-song.js
    if (chon) toChon(chon.id); veTen(); ve();
  }

  /* ---- tên phòng nổi trên mô hình ---- */
  let dsTen = [];
  function veTen() {
    while (lopTen.firstChild) lopTen.removeChild(lopTen.firstChild); dsTen = [];
    if (!ch.nhan || ch.cheDo === 'di' || !nha) return;
    plan.phong.forEach((r) => {
      if (r._ngoai) return;
      const v = nha.pt.theoMa[r._vung], e = taoEl('div', 'x3d-ten', lopTen);
      taoEl('b', '', e, r.ten); if (v && v.phong[0] === r) taoEl('span', '', e, (Math.round(v.dt * 10) / 10).toString().replace('.', ',') + ' m²');
      dsTen.push({ e, p: new THREE.Vector3(r.x, 0.3, r.y) });
    });
  }
  const tam = new THREE.Vector3();
  function datTen() {
    const w = khung.clientWidth, h = khung.clientHeight;
    dsTen.forEach((t) => {
      tam.copy(t.p).project(camera);
      const an = tam.z > 1 || tam.x < -1.1 || tam.x > 1.1 || tam.y < -1.1 || tam.y > 1.1;
      t.e.style.display = an ? 'none' : '';
      if (!an) t.e.style.transform = 'translate(' + ((tam.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - tam.y) / 2 * h).toFixed(1) + 'px) translate(-50%,-50%)';
    });
  }

  /* ---- vẽ theo nhu cầu: chỉ vẽ khi có thay đổi (đỡ nóng máy, đỡ pin) ---- */
  let canBong = true, lanBong = 0, songChay = false;
  const nangCu = new THREE.Vector3(), dichCu = new THREE.Vector3();
  /* ---- chất lượng hình: tự hạ khi máy vẽ không kịp (giật), hoặc người dùng chọn "Nhẹ máy" ---- */
  const MUC_CL = nho
    ? [{ pr: 1.5, bong: 2048, ao: false }, { pr: 1.25, bong: 1024, ao: false }, { pr: 1, bong: 1024, ao: false }]
    : [{ pr: 2, bong: 4096, ao: true }, { pr: 1.5, bong: 2048, ao: false }, { pr: 1.25, bong: 2048, ao: false }, { pr: 1, bong: 1024, ao: false }];
  const cl = { cham: 0, veTruoc: false, muc: 0, nhe: false, tuGiam: true, dsKhung: [], lanCuoi: 0, henXet: 0, daBao: false };
  try { cl.nhe = localStorage.getItem('aln_dmb_3d_nhe') === '1'; } catch (e) { /* trình duyệt chặn lưu */ }
  function apMuc(i) {
    i = Math.max(0, Math.min(MUC_CL.length - 1, i)); cl.muc = i;
    const m = MUC_CL[i], pr = Math.min(window.devicePixelRatio || 1, m.pr);
    if (renderer.getPixelRatio() !== pr) { renderer.setPixelRatio(pr); if (composer) composer.setPixelRatio(pr); coKhung(); }
    if (nang.shadow.mapSize.x !== m.bong) { nang.shadow.mapSize.set(m.bong, m.bong); if (nang.shadow.map) { nang.shadow.map.dispose(); nang.shadow.map = null; } canBong = true; }
    if (!m.ao && ch.ao) { ch.ao = false; if (chipAo) chipAo.setAttribute('aria-pressed', 'false'); }
    if (chipAo) chipAo.disabled = !m.ao;
    cl.dsKhung = []; cl.veTruoc = false; cl.cham = 0; cl.henXet = performance.now() + 2500; ve();
  }
  function demKhung(t, lienTuc) { // đo khoảng cách giữa 2 khung vẽ liền nhau (kéo xoay, đi, tham quan, nước chảy…)
    const gap = t - cl.lanCuoi; cl.lanCuoi = t;
    if (!lienTuc || !cl.tuGiam || cl.nhe || cl.muc >= MUC_CL.length - 1 || t < cl.henXet) return;
    if (gap > 400) { if (++cl.cham >= 2) { cl.cham = 0; giamMuc(); } return; } // rất chậm: 2 khung liền nhau quá 0,4 giây là giảm ngay
    cl.cham = 0;
    cl.dsKhung.push(gap); if (cl.dsKhung.length < 8 || cl.dsKhung.reduce((x, y) => x + y, 0) < 1500) return;
    const sx = cl.dsKhung.slice().sort((a, b) => a - b), giua = sx[sx.length >> 1]; cl.dsKhung = [];
    if (giua > 42) giamMuc(); // dưới ~24 khung/giây
  }
  function giamMuc() {
    apMuc(cl.muc + 1);
    if (!cl.daBao) { cl.daBao = true; bao('Máy vẽ hơi chậm — đã tự giảm độ nét để xem mượt hơn.'); }
    api.ga('aln_dmb_3d', { buoc: 'tu_giam', muc: cl.muc });
  }
  const nghiDo = () => { cl.veTruoc = false; cl.cham = 0; }; // tab ẩn, dựng lại nhà…: khoảng trống đó không phải do vẽ chậm
  document.addEventListener('visibilitychange', nghiDo);
  let kx = false, canVe = true, raf = 0, hoatCanh = null, lanTruoc = performance.now(), lanVeSong = 0, lanSong = performance.now();
  function ve() { canVe = true; }
  function veNgay() {
    datTen();
    if (canBong) { canBong = false; renderer.shadowMap.needsUpdate = true; }
    if (composer && ch.ao && ch.cheDo !== 'di') composer.render(); else renderer.render(scene, camera);
    song.sauVe(); tq.sauVe();
  }
  function vongLap(t) {
    raf = requestAnimationFrame(vongLap);
    const dt = Math.min(0.05, (t - lanTruoc) / 1000); lanTruoc = t;
    if (kx) { lanSong = t; nghiDo(); return; } // đang kết xuất "ảnh như thật": bộ dò tia tự vẽ lên khung
    let doi = false;
    if (tq.dangChay()) doi = tq.capNhat(t);
    else if (hoatCanh) {
      const k = Math.min(1, (t - hoatCanh.t0) / hoatCanh.ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(hoatCanh.p0, hoatCanh.p1, e);
      if (hoatCanh.q0) camera.quaternion.slerpQuaternions(hoatCanh.q0, hoatCanh.q1, e);
      else { ctl.target.lerpVectors(hoatCanh.t0v, hoatCanh.t1v, e); camera.lookAt(ctl.target); }
      if (k >= 1) { const xong = hoatCanh.xong; hoatCanh = null; if (xong) xong(); }
      doi = true;
    } else if (ch.cheDo === 'di') doi = buocDi(dt);
    else doi = ctl.update();
    // nước chảy, quạt quay, mưa…: vẽ liên tục; điện thoại chỉ ~30 khung/giây khi máy quay đứng yên
    const dtS = Math.min(0.1, (t - lanSong) / 1000); lanSong = t;
    const dongSong = song.capNhat(dtS, t);
    if (dongSong && !doi && !canVe) { if (!nho || t - lanVeSong > 30) canVe = true; }
    // bóng: nắng đổi hướng → vẽ lại; cửa/quạt đang chuyển động → vẽ lại bóng tối đa ~3 lần/giây, và 1 lần khi dừng
    if (!nangCu.equals(nang.position) || !dichCu.equals(nang.target.position)) { nangCu.copy(nang.position); dichCu.copy(nang.target.position); canBong = true; canVe = true; }
    if (dongSong && t - lanBong > 330) { lanBong = t; canBong = true; }
    if (songChay && !dongSong) canBong = true;
    songChay = dongSong;
    if (doi || canVe) { canVe = false; lanVeSong = t; veNgay(); demKhung(t, cl.veTruoc); cl.veTruoc = true; } else cl.veTruoc = false;
  }
  function dieuMay(p1, t1, ms, xong) { // máy quay bay tới vị trí mới
    hoatCanh = { t0: performance.now(), ms: ms || 750, p0: camera.position.clone(), p1, t0v: ctl.target.clone(), t1v: t1, xong };
  }

  /* ---- ba chế độ xem ---- */
  const di = { yaw: 0, pitch: -0.08, toi: null, phim: {} };
  function viTriTong() { // màn dọc (điện thoại) lùi xa hơn để thấy trọn ngôi nhà theo bề ngang
    const b = nha.bien, R = b.R, k = khung.clientWidth / Math.max(1, khung.clientHeight), s = Math.max(1, 1.25 / k);
    let ox = -R * 0.55, oz = R * 1.45 + 1;
    if (k < 1 && (b.x1 - b.x0) > (b.z1 - b.z0) * 1.15) { const t = ox; ox = oz; oz = -t; } // màn dọc + nhà dài theo ngang: nhìn dọc theo chiều dài để nhà chiếm đủ màn
    return { p: new THREE.Vector3(b.cx + ox * s, (R * 1.25 + 2) * s, b.cz + oz * s), t: new THREE.Vector3(b.cx, 0.3, b.cz) };
  }
  function viTriTren() { const b = nha.bien, R = b.R, k = khung.clientWidth / Math.max(1, khung.clientHeight); return { p: new THREE.Vector3(b.cx, R * (k < 1 ? 3.6 : 2.5) + 2, b.cz + 0.01), t: new THREE.Vector3(b.cx, 0, b.cz) }; }
  function diemBatDau() {
    const ds = nha.pt.vungs.filter((v) => v.trongNha && v.dt > 3);
    if (!ds.length) return { x: nha.bien.cx, z: nha.bien.cz };
    const khach = ds.find((v) => /khach|sinh hoat/.test(khongDau(v.ten.join(' '))));
    const v = khach || ds.slice().sort((a, b) => b.dt - a.dt)[0];
    return { x: v.cx, z: v.cy };
  }
  // Đứng trong phòng: chọn hướng nhìn xa nhất (thường nhìn qua cửa sang phòng khác) rồi lùi sát tường sau để thấy cả phòng.
  function xaNhat(x, z, yaw) {
    ray.set(new THREE.Vector3(x, MAT_MAT, z), new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))); ray.far = 60;
    const h = ray.intersectObjects(nha.tuong, false)[0]; ray.far = Infinity; return h ? h.distance : 60;
  }
  function gocNhinDai(s) {
    let tot = { yaw: 0, d: -1 };
    for (let i = 0; i < 24; i++) { const yaw = i * Math.PI / 12, d = xaNhat(s.x, s.z, yaw); if (d > tot.d) tot = { yaw, d }; }
    const sau = xaNhat(s.x, s.z, tot.yaw + Math.PI), lui = Math.max(0, Math.min(sau - 0.9, 2.2));
    let x = s.x + Math.sin(tot.yaw) * lui, z = s.z + Math.cos(tot.yaw) * lui;
    // cách tường hai bên ít nhất 0,8 m (không đứng sát cánh cửa)
    const trai = xaNhat(x, z, tot.yaw + Math.PI / 2), phai = xaNhat(x, z, tot.yaw - Math.PI / 2);
    if (trai + phai > 1.6) { const dich = trai < 0.8 ? 0.8 - trai : (phai < 0.8 ? -(0.8 - phai) : 0); x -= Math.sin(tot.yaw - Math.PI / 2) * dich; z -= Math.cos(tot.yaw - Math.PI / 2) * dich; }
    return { yaw: tot.yaw, x, z };
  }
  // Góc chụp đẹp trong một phòng (tham quan tự động): thử các chỗ đứng trên lưới 0,4 m, chỗ đứng phải là sàn trống
  // (không trong đồ đạc), trước mặt ≥ 1,6 m không vướng đồ, cách tường hai bên ≥ 0,5 m; chọn hướng nhìn xa nhất
  // (thường là đứng ở góc nhìn chéo qua phòng).
  let dsVat = null, dsVatCua = null;
  function vatTheNhin() {
    if (dsVatCua === nha && dsVat) return dsVat;
    dsVat = []; nha.goc.traverse((o) => { if (o.isMesh && o.visible) { let p = o, tran = false; while (p) { if (p === nha.tran) { tran = true; break; } p = p.parent; } if (!tran && !(o.material && o.material.transparent)) dsVat.push(o); } });
    dsVatCua = nha; return dsVat;
  }
  const xuong = new THREE.Vector3(0, -1, 0), tamR = new THREE.Vector3(), huongR = new THREE.Vector3();
  function gocDep(v) {
    const hcn = nha.hcnTheoVung.get(v.ma), vat = vatTheNhin(), laSan = new Set(nha.san);
    if (!hcn) return gocNhinDai({ x: v.cx, z: v.cy });
    let tot = null;
    hcn.forEach(([x0, z0, x1, z1]) => {
      for (let x = x0 + 0.3; x <= x1 - 0.3; x += 0.4) for (let z = z0 + 0.3; z <= z1 - 0.3; z += 0.4) {
        const c = nha.pt.oTrong(x, z); if (c < 0 || nha.pt.vung[c] !== v.ma) continue;
        tamR.set(x, 2.6, z); ray.set(tamR, xuong); ray.far = 3; const h = ray.intersectObjects(vat, false)[0]; ray.far = Infinity;
        if (!h || !laSan.has(h.object)) continue; // đứng trên đồ đạc
        for (let i = 0; i < 24; i++) {
          const yaw = i * Math.PI / 12, d = xaNhat(x, z, yaw); if (d < 2) continue;
          const trai = xaNhat(x, z, yaw + Math.PI / 2), phai = xaNhat(x, z, yaw - Math.PI / 2); if (trai < 0.5 || phai < 0.5) continue;
          huongR.set(-Math.sin(yaw), 0, -Math.cos(yaw)); tamR.set(x, 1.0, z); ray.set(tamR, huongR); ray.far = 1.6;
          const vuong = ray.intersectObjects(vat, false)[0]; ray.far = Infinity; if (vuong) continue;
          const diem = Math.min(d, 12) + 0.25 * Math.min(trai, phai, 2);
          if (!tot || diem > tot.diem) tot = { diem, x, z, yaw };
        }
      }
    });
    return tot || gocNhinDai({ x: v.cx, z: v.cy });
  }
  function capGoiY() {
    const k = ch.cheDo;
    goiY.textContent = k === 'di' ? (nho ? 'Kéo để nhìn quanh · chạm sàn để đi tới đó · chụm hai ngón để tiến lùi' : 'Kéo chuột để nhìn quanh · bấm sàn để đi tới đó · phím W A S D hoặc mũi tên để đi')
      : (nho ? 'Kéo để xoay · chụm để phóng · hai ngón để dời · chạm sàn để đổi vật liệu' : 'Kéo chuột để xoay · cuộn để phóng · chuột phải để dời · bấm sàn hoặc tường để đổi vật liệu');
    tuy.hidden = k === 'di';
  }
  function datCheDo(k) {
    if (hoatCanh || tq.dangChay() || kx) return;
    const cu = ch.cheDo; ch.cheDo = k; canBong = true;
    Object.keys(nutCD).forEach((x) => nutCD[x].setAttribute('aria-selected', String(x === k)));
    capGoiY();
    if (k === 'di') {
      if (ch.ha) { ch.ha = false; chipHa.setAttribute('aria-pressed', 'false'); }
      dungLai(); ctl.enabled = false; dongBang();
      const s = diemBatDau(), g = gocNhinDai(s); di.yaw = g.yaw; di.pitch = -0.08;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(di.pitch, di.yaw, 0, 'YXZ'));
      camera.fov = FOV_DI; camera.updateProjectionMatrix();
      hoatCanh = { t0: performance.now(), ms: 900, p0: camera.position.clone(), p1: new THREE.Vector3(g.x, MAT_MAT, g.z), q0: camera.quaternion.clone(), q1: q };
      song.datCheDo('di');
      api.ga('aln_dmb_3d', { buoc: 'di' });
      return;
    }
    if (cu === 'di') { camera.fov = FOV_XA; camera.updateProjectionMatrix(); nha.tran.visible = false; }
    song.datCheDo(k);
    ctl.enabled = true; veTen();
    const v = k === 'tren' ? viTriTren() : viTriTong();
    dieuMay(v.p, v.t, 800);
    api.ga('aln_dmb_3d', { buoc: k });
  }
  /* ---- dùng cho tham quan: đổi chế độ trong/ngoài không bay máy quay ---- */
  function datNoiBo(trong) {
    const k = trong ? 'di' : 'tong';
    if (ch.cheDo === k || (!trong && ch.cheDo === 'tren')) return;
    if (trong && ch.ha) { ch.ha = false; chipHa.setAttribute('aria-pressed', 'false'); ch.cheDo = k; dungLai(); }
    ch.cheDo = k; nha.tran.visible = trong; song.datCheDo(k);
    Object.keys(nutCD).forEach((x) => nutCD[x].setAttribute('aria-selected', String(x === k)));
    capGoiY(); veTen(); dongBang();
    ctl.enabled = !trong && !tq.dangChay();
  }
  const huongNhin = new THREE.Vector3(), eu = new THREE.Euler(0, 0, 0, 'YXZ');
  function dongBoTuMay() { // sau tham quan / xem điểm: chế độ đang dùng nhận đúng góc máy hiện tại
    eu.setFromQuaternion(camera.quaternion, 'YXZ');
    if (ch.cheDo === 'di') { di.yaw = eu.y; di.pitch = Math.max(-1.1, Math.min(0.9, eu.x)); di.toi = null; return; }
    camera.getWorldDirection(huongNhin);
    const t = huongNhin.y < -0.05 ? Math.min(60, (camera.position.y - 0.3) / -huongNhin.y) : 12;
    ctl.target.copy(camera.position).addScaledVector(huongNhin, t); ctl.update();
  }
  function sauKhiDat() { dongBoTuMay(); }
  function ketThucTQ() {
    dongBoTuMay(); ctl.enabled = ch.cheDo !== 'di'; capGoiY(); veTen(); ve();
  }
  const huong = new THREE.Vector3();
  function buoc(dx, dz) { // đi có chặn tường, cửa đóng: trượt dọc tường thay vì xuyên qua
    const [mx, mz] = song.chan(camera.position, dx, dz);
    camera.position.x += mx; camera.position.z += mz; return Math.abs(mx) + Math.abs(mz) > 1e-5;
  }
  function buocDi(dt) {
    let doi = false;
    const tien = (di.phim.w || di.phim.arrowup ? 1 : 0) - (di.phim.s || di.phim.arrowdown ? 1 : 0);
    const ngang = (di.phim.d ? 1 : 0) - (di.phim.a ? 1 : 0), xoay = (di.phim.arrowleft ? 1 : 0) - (di.phim.arrowright ? 1 : 0);
    if (xoay) { di.yaw += xoay * dt * 1.6; doi = true; }
    if (tien || ngang) {
      const v = 2.2 * dt, sy = Math.sin(di.yaw), cy = Math.cos(di.yaw);
      buoc((-sy * tien + cy * ngang) * v, (-cy * tien - sy * ngang) * v); di.toi = null; doi = true;
    }
    if (di.toi) {
      huong.set(di.toi.x - camera.position.x, 0, di.toi.z - camera.position.z); const d = huong.length();
      if (d < 0.03) di.toi = null; else { huong.multiplyScalar(Math.min(1, dt * 3.2)); if (!buoc(huong.x, huong.z)) di.toi = null; }
      doi = true;
    }
    camera.position.y = MAT_MAT;
    camera.quaternion.setFromEuler(new THREE.Euler(di.pitch, di.yaw, 0, 'YXZ'));
    return doi;
  }

  /* ---- chạm, kéo, chọn vật liệu ---- */
  const tro = new Map(); let nhan = null, chum = 0;
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  function trungDiem(e) {
    const r = renderer.domElement.getBoundingClientRect();
    v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(v2, camera);
    return ray.intersectObjects(nha.san.concat(nha.tuong), false)[0] || null;
  }
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (e) => {
    if (tq.dangChay()) { tq.doiTamDung(true); return; } // chạm khi đang tham quan = tạm dừng
    if (kx) return;
    tro.set(e.pointerId, { x: e.clientX, y: e.clientY });
    nhan = tro.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), keo: false } : null;
    if (tro.size === 2) { const [a, b] = [...tro.values()]; chum = Math.hypot(a.x - b.x, a.y - b.y); }
    if (ch.cheDo === 'di') cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    const p = tro.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (nhan && Math.hypot(e.clientX - nhan.x, e.clientY - nhan.y) > 6) nhan.keo = true;
    if (ch.cheDo !== 'di') return;
    if (tro.size === 2) {
      const [a, b] = [...tro.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      const k = (d - chum) * 0.01; chum = d;
      buoc(-Math.sin(di.yaw) * k, -Math.cos(di.yaw) * k); di.toi = null; ve();
      return;
    }
    di.yaw += dx * 0.0045; di.pitch = Math.max(-1.1, Math.min(0.9, di.pitch + dy * 0.0045)); ve();
  });
  const tha = (e) => {
    tro.delete(e.pointerId);
    if (tq.dangChay() || kx) { nhan = null; return; }
    if (!nhan || nhan.keo || performance.now() - nhan.t > 500 || e.type === 'pointercancel') { nhan = null; return; }
    nhan = null;
    const hit = trungDiem(e);
    if (song.bam(ray, hit)) return; // bấm vào đèn, vòi, tivi, cửa… thì bật tắt
    if (!hit) { if (ch.cheDo !== 'di') dongBang(); return; }
    if (ch.cheDo === 'di') { if (hit.object.userData.vung !== undefined) { di.toi = { x: hit.point.x, z: hit.point.z }; } return; }
    let id;
    if (hit.object.userData.vung !== undefined) id = hit.object.userData.vung;
    else if (hit.object.userData.vungTuong !== undefined) id = hit.object.userData.vungTuong;
    else return;
    moBang(id);
  };
  cv.addEventListener('pointerup', tha); cv.addEventListener('pointercancel', tha);
  cv.addEventListener('wheel', (e) => { if (tq.dangChay() || kx) { e.preventDefault(); return; } if (ch.cheDo !== 'di') return; e.preventDefault(); const k = -e.deltaY * 0.004; buoc(-Math.sin(di.yaw) * k, -Math.cos(di.yaw) * k); ve(); }, { passive: false });
  const phimXuong = (e) => {
    if (kx) return;
    if (tq.dangChay()) { if (e.key === 'Escape') tq.ketThuc(false); else if (e.key === ' ') { e.preventDefault(); tq.doiTamDung(!tq.dangTamDung()); } return; }
    if (e.key === 'Escape') { if (!bang.hidden) dongBang(); else if (tq.dangMoBang()) tq.dongBang(); else if (song.dangMoBang()) song.dongBangGio(); else dong(); return; }
    if (ch.cheDo !== 'di' || /input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
    const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { di.phim[k] = true; e.preventDefault(); }
  };
  const phimLen = (e) => { di.phim[e.key.toLowerCase()] = false; };
  window.addEventListener('keydown', phimXuong); window.addEventListener('keyup', phimLen);
  ctl.addEventListener('change', ve);

  function toChon(id) {
    if (lopChon) { scene.remove(lopChon); lopChon.geometry.dispose(); lopChon = null; }
    const hcn = nha.hcnTheoVung.get(id); if (!hcn) return;
    const pos = [];
    const y = (nha.laTrong(id) ? 0 : SAN_NGOAI) + 0.006;
    hcn.forEach(([x0, z0, x1, z1]) => pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0));
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    lopChon = new THREE.Mesh(geo, M.nhanChon); lopChon.renderOrder = 2; scene.add(lopChon);
  }
  function dongBang() { bang.hidden = true; chon = null; if (lopChon) { scene.remove(lopChon); lopChon.geometry.dispose(); lopChon = null; } ve(); }
  function luuVat(id, loai, ma, caNha) {
    const ds = caNha ? nha.pt.vungs.filter((v) => v.trongNha && !/\bwc\b|ve sinh|tam/.test(khongDau(v.ten.join(' '))) && v.ma !== id).map((v) => v.ma).concat([id]) : [id];
    api.luuVatLieu((p) => {
      p.vat_lieu = p.vat_lieu && typeof p.vat_lieu === 'object' ? p.vat_lieu : {};
      ds.forEach((x) => { const k = khoaVung(nha.vung(x)); p.vat_lieu[k] = Object.assign({}, p.vat_lieu[k], { [loai]: ma }); });
    });
    plan.vat_lieu = api.lay().vat_lieu;
    if (loai === 'san') nha.san.forEach((m) => { if (ds.includes(m.userData.vung)) m.material = M.san(ma); });
    else nha.tuong.forEach((m) => { if (ds.includes(m.userData.vungTuong)) m.material = M.tuong(ma); });
    api.ga('aln_dmb_3d', { buoc: 'vat_lieu', loai });
    ve();
  }
  function moBang(id) {
    song.dongBangGio(); tq.dongBang();
    chon = { id }; toChon(id);
    while (bang.firstChild) bang.removeChild(bang.firstChild);
    bang.hidden = false;
    const v = nha.vung(id), dauB = taoEl('div', 'x3d-bang-dau', bang);
    const t = taoEl('div', '', dauB); taoEl('h3', '', t, tenVung(v));
    if (v) taoEl('span', 'x3d-phu', t, (Math.round(v.dt * 10) / 10).toString().replace('.', ',') + ' m²' + (v.trongNha ? '' : ' · ngoài nhà'));
    const x = nutIcon(dauB, 'x3d-dong', 'Đóng', 'M6 6l12 12|M18 6 6 18'); x.addEventListener('click', dongBang);
    const nhom = (tieu, loai, bo, dangDung, coCaNha) => {
      taoEl('h4', '', bang, tieu);
      const luoiN = taoEl('div', 'x3d-luoi', bang);
      Object.keys(bo).forEach((ma) => {
        if (loai === 'tuong' && v && v.trongNha && ma === 'son_ngoai') return;
        if (loai === 'tuong' && (!v || !v.trongNha) && TUONG[ma].op) return;
        const b = taoEl('button', 'x3d-mau', luoiN); b.type = 'button'; b.setAttribute('aria-pressed', String(ma === dangDung));
        const c = M.mauMau(ma, loai); c.className = 'x3d-anh'; b.appendChild(c); taoEl('span', '', b, bo[ma].ten);
        b.addEventListener('click', () => { luuVat(id, loai, ma, false); luoiN.querySelectorAll('button').forEach((n) => n.setAttribute('aria-pressed', String(n === b))); bao('Đã đổi ' + (loai === 'san' ? 'sàn' : 'tường') + ' ' + tenVung(v).toLowerCase() + ' sang ' + bo[ma].ten.toLowerCase() + '.'); });
      });
      if (coCaNha) {
        const b = taoEl('button', 'x3d-ca-nha', bang, 'Dùng màu tường này cho cả nhà (trừ WC)'); b.type = 'button';
        b.addEventListener('click', () => { const dang = luoiN.querySelector('[aria-pressed="true"]'); const ma = dang ? Object.keys(bo).find((k) => bo[k].ten === dang.textContent) : null; if (ma) { luuVat(id, 'tuong', ma, true); bao('Đã dùng ' + bo[ma].ten.toLowerCase() + ' cho tường cả nhà, trừ WC.'); } });
      }
    };
    const vl = (plan.vat_lieu || {})[khoaVung(v)] || {};
    if (v && v.trongNha) song.nutDenPhong(bang, id);
    if (v) nhom('Sàn', 'san', SAN, vl.san || sanMacDinh(v), false);
    nhom(v && v.trongNha ? 'Tường trong phòng' : 'Tường ngoài nhà', 'tuong', TUONG, vl.tuong || tuongMacDinh(v), !!(v && v.trongNha));
    taoEl('p', 'x3d-chu-thich', bang, 'Vật liệu chỉ để hình dung. Đã lưu cùng bản vẽ, gửi file cho KTS là KTS thấy được lựa chọn này.');
    ve();
  }

  /* ---- tông nội thất (cả nhà) ---- */
  function luuNoiThat(loai, ma) {
    api.luu3D((p) => { p.noi_that = Object.assign({}, NOI_THAT_MAC_DINH, p.noi_that || {}, { [loai]: ma }); });
    M.datNoiThat(api.lay().noi_that); api.ga('aln_dmb_3d', { buoc: 'noi_that', loai }); ve();
  }
  function moNoiThat() {
    song.dongBangGio(); tq.dongBang(); chon = null; if (lopChon) { scene.remove(lopChon); lopChon.geometry.dispose(); lopChon = null; }
    while (bang.firstChild) bang.removeChild(bang.firstChild);
    bang.hidden = false;
    const dauB = taoEl('div', 'x3d-bang-dau', bang), t = taoEl('div', '', dauB);
    taoEl('h3', '', t, 'Tông nội thất'); taoEl('span', 'x3d-chu-thich', t, 'Đổi cho cả nhà một lần');
    nutIcon(dauB, 'x3d-dong', 'Đóng', 'M6 6l12 12|M18 6 6 18').addEventListener('click', dongBang);
    const nt = Object.assign({}, NOI_THAT_MAC_DINH, api.lay().noi_that || {});
    [['go', 'Gỗ đồ đạc và cánh cửa'], ['vai', 'Vải bọc sofa, giường, ghế'], ['da', 'Mặt đá bếp']].forEach(([loai, tieu]) => {
      taoEl('h4', '', bang, tieu);
      const luoiN = taoEl('div', 'x3d-luoi', bang);
      Object.keys(NOI_THAT[loai]).forEach((ma) => {
        const b = taoEl('button', 'x3d-mau', luoiN); b.type = 'button'; b.setAttribute('aria-pressed', String(ma === nt[loai]));
        const c = M.mauNoiThat(loai, ma); c.className = 'x3d-anh'; b.appendChild(c); taoEl('span', '', b, NOI_THAT[loai][ma].ten);
        b.addEventListener('click', () => { luuNoiThat(loai, ma); luoiN.querySelectorAll('button').forEach((n) => n.setAttribute('aria-pressed', String(n === b))); bao('Đã đổi ' + tieu.toLowerCase() + ' sang ' + NOI_THAT[loai][ma].ten.toLowerCase() + '.'); });
      });
    });
    taoEl('p', 'x3d-chu-thich', bang, 'Sàn, tường từng phòng: bấm thẳng vào sàn hoặc tường. Vật liệu chỉ để hình dung, đã lưu cùng bản vẽ.');
    api.ga('aln_dmb_3d', { buoc: 'noi_that_mo' }); ve();
  }
  nutNoiThat.addEventListener('click', () => { if (kx || tq.dangChay()) return; if (!bang.hidden && bang.querySelector('h3') && bang.querySelector('h3').textContent === 'Tông nội thất') dongBang(); else moNoiThat(); });
  nutGhim.addEventListener('click', () => { if (!kx && !tq.dangChay()) tq.luuGocNay(); });
  nutTQ.addEventListener('click', () => { if (kx) return; if (tq.dangMoBang()) tq.dongBang(); else tq.moBang(); });

  /* ---- xuất ảnh: dải chân ALN + tải về ---- */
  function taiAnh(c, ten, loiBao) {
    const g = c.getContext('2d'), s = Math.round(c.height / 46); g.font = '600 ' + s + 'px "Be Vietnam Pro", Arial, sans-serif';
    const dai = s * 2.4; g.fillStyle = 'rgba(11,31,58,0.82)'; g.fillRect(0, c.height - dai, c.width, dai); // dải chân ảnh: chữ đọc được trên mọi nền
    g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.textAlign = 'right';
    g.fillText('App Làm Nhà · applamnha.vn', c.width - s, c.height - dai / 2);
    g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '500 ' + Math.round(s * 0.9) + 'px "Be Vietnam Pro", Arial, sans-serif';
    g.fillText((plan.ten || 'Bản vẽ') + ' · hình minh hoạ', s, c.height - dai / 2);
    c.toBlob((b) => {
      if (!b) { bao('Chưa lưu được ảnh. Thử lại.'); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = api.tenTep(ten); document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      bao(loiBao);
    }, 'image/png');
  }

  /* ---- chụp ảnh ---- */
  nutChup.addEventListener('click', () => {
    if (kx || tq.dangChay()) return;
    const pr = renderer.getPixelRatio(), w = khung.clientWidth, h = khung.clientHeight;
    const k = Math.min(2.5, Math.max(1, 1800 / Math.max(w, h)) * (window.devicePixelRatio || 1));
    const anTen = lopTen.style.display; lopTen.style.display = 'none';
    if (lopChon) lopChon.visible = false;
    renderer.setPixelRatio(k); renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(k); composer.setSize(w, h); gtao.setSize(w * k, h * k); }
    veNgay();
    const c = document.createElement('canvas'); c.width = renderer.domElement.width; c.height = renderer.domElement.height;
    c.getContext('2d').drawImage(renderer.domElement, 0, 0);
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false); if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); gtao.setSize(w * pr, h * pr); }
    lopTen.style.display = anTen; if (lopChon) lopChon.visible = true; ve();
    taiAnh(c, '3d.png', 'Đã lưu ảnh 3D. Gửi qua Zalo được ngay.');
    api.ga('aln_dmb_3d', { buoc: 'chup', che_do: ch.cheDo });
  });

  /* ---- ảnh như thật: dò tia trên máy người xem (dung-3d-ket-xuat.js, nạp khi bấm) ---- */
  nutDep.addEventListener('click', async () => {
    if (kx || tq.dangChay() || hoatCanh) return;
    kx = true; dongBang(); song.dongBangGio(); tq.dongBang(); ctl.enabled = false; goc.classList.add('x3d-dang-kx');
    bao('Đang tải bộ kết xuất…');
    api.ga('aln_dmb_3d', { buoc: 'anh_dep', che_do: ch.cheDo });
    let kq;
    try {
      const m = await import('./dung-3d-ket-xuat.js?v=1');
      kq = await m.ketXuat({ renderer, scene, camera, goc, nho, sang: Math.min(1, nang.intensity / 2.4) });
    } catch (e) { kq = { loi: e }; }
    kx = false; goc.classList.remove('x3d-dang-kx'); ctl.enabled = ch.cheDo !== 'di'; coKhung(); ve();
    if (!kq) { bao('Đã huỷ kết xuất.'); return; }
    if (kq.loi) { bao('Máy này chưa kết xuất được ảnh như thật. Dùng nút "Chụp ảnh" nhé.'); api.ga('aln_dmb_3d', { buoc: 'anh_dep_loi' }); return; }
    taiAnh(kq.canvas, 'anh-nhu-that.png', 'Đã lưu ảnh như thật (' + kq.mau + ' lượt tính).');
    api.ga('aln_dmb_3d', { buoc: 'anh_dep_xong', mau: kq.mau });
  });

  /* ---- cỡ khung ---- */
  function coKhung() {
    const w = Math.max(1, khung.clientWidth), h = Math.max(1, khung.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setSize(w, h); gtao.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); }
    ve();
  }
  const ro = new ResizeObserver(coKhung); ro.observe(khung);

  /* ---- đóng ---- */
  function dong() {
    if (kx) return;
    if (tq.dangChay()) tq.ketThuc(false);
    cancelAnimationFrame(raf); ro.disconnect();
    window.removeEventListener('keydown', phimXuong); window.removeEventListener('keyup', phimLen);
    document.removeEventListener('visibilitychange', nghiDo);
    song.dong(); boNha(); ctl.dispose(); if (composer) composer.dispose(); pm.dispose(); renderer.dispose();
    goc.remove(); document.body.classList.remove('x3d-mo'); dangMo = null; api.khiDong();
  }
  nutVe.addEventListener('click', dong);

  /* ---- bắt đầu ---- */
  coKhung();
  if (cl.nhe) { chipNhe.setAttribute('aria-pressed', 'true'); apMuc(MUC_CL.length - 1); } else apMuc(0);
  M.datNoiThat(plan.noi_that);
  dungLai();
  const v0 = viTriTong(); camera.position.copy(v0.p); ctl.target.copy(v0.t); camera.lookAt(v0.t); ctl.update();
  capGoiY();
  raf = requestAnimationFrame(vongLap);
  api.ga('aln_dmb_3d', { buoc: 'mo', chat_luong: nho ? 'thap' : 'cao' });
  dangMo = { dong, datCheDo, ve };
  window.ALNDung3D = { cl, apMuc, tq, dong, datCheDo, chon: (id) => moBang(id), nha: () => nha, renderer, scene, camera, ctl, ch, M, veNgay, song, di, ve };
  return dangMo;
}
