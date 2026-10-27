/* ALN · Dựng mặt bằng — xem 3D: tham quan tự động + quay video (25/10/2026)
 * Chủ nhà lưu các "điểm nhìn" (góc máy đang xem: đứng trong phòng hoặc toàn cảnh), đặt tên, số giây, giờ trong ngày.
 * Bấm "Bắt đầu" thì máy tự đi lần lượt: mỗi điểm máy quay trôi chậm (đẩy tới / lượn nhẹ) như phim giới thiệu nhà;
 * hai điểm nhìn thấy nhau thì bay liền, khuất tường thì chuyển cảnh mờ dần. Chưa lưu điểm nào thì máy tự dựng
 * lộ trình: toàn cảnh → phòng khách → bếp/ăn → các phòng ngủ → toàn cảnh góc khác.
 * Quay video: ghi chính khung hình đang vẽ + chú thích tên phòng + dải ALN ở chân, tải về .mp4 (hoặc .webm).
 * Điểm nhìn lưu cùng bản vẽ (plan.tham_quan.diem) qua api.luu3D.
 */
import * as THREE from 'three';

const GIO = [[null, 'Giờ hiện tại'], [7, 'Sáng 7:00'], [12, 'Trưa 12:00'], [16.5, 'Chiều 16:30'], [17.5, 'Hoàng hôn'], [20, 'Tối 20:00'], [23, 'Đêm 23:00']];
const GIAY = [3, 5, 8, 12];
const TOI_DA = 20;
const BAY_MS = 1900, MO_MS = 950;

function taoEl(ten, lop, cha, chu) { const e = document.createElement(ten); if (lop) e.className = lop; if (chu !== undefined) e.textContent = chu; if (cha) cha.appendChild(e); return e; }
function svg(cha, d) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  String(d).split('|').forEach((x) => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', x); s.appendChild(p); });
  cha.appendChild(s); return s;
}
function nut(cha, lop, nhan, d, chu) {
  const b = taoEl('button', lop, cha); b.type = 'button'; b.setAttribute('aria-label', nhan); b.title = nhan;
  if (d) svg(b, d); if (chu) taoEl('span', '', b, chu); return b;
}
const ICON = {
  play: 'M7 5v14l11-7z', pause: 'M7 5h3v14H7z|M14 5h3v14h-3z', truoc: 'M6 6v12|M18 6 9 12l9 6z', sau: 'M18 6v12|M6 6l9 6-9 6z',
  dung: 'M6 6h12v12H6z', ghi: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', ghim: 'M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z|M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  len: 'M12 5v14|M6 11l6-6 6 6', xuong: 'M12 19V5|M6 13l6 6 6-6', xoa: 'M5 7h14|M10 11v6|M14 11v6|M7 7l1 12h8l1-12|M9 7V4h6v3', xem: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  dong: 'M6 6l12 12|M18 6 6 18'
};
const tron = (x, n) => Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
const dongGoc = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const muot = (k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const deu = (k) => k * k * (3 - 2 * k);

export function taoThamQuan(ctx) {
  const { camera, renderer, khung, goc, api, song, nho } = ctx;
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');

  /* ---------------- điểm nhìn ---------------- */
  function diemLuu() { const t = api.lay().tham_quan; return t && Array.isArray(t.diem) ? t.diem : []; }
  function luu(ds) { api.luu3D((p) => { if (ds.length) p.tham_quan = { diem: ds }; else delete p.tham_quan; }); }
  function gocDangXem() {
    euler.setFromQuaternion(camera.quaternion, 'YXZ');
    const trong = ctx.ch.cheDo === 'di';
    return { ten: ctx.tenTai(camera.position.x, camera.position.z, trong), x: tron(camera.position.x, 2), y: tron(camera.position.y, 2), z: tron(camera.position.z, 2), yaw: tron(euler.y, 3), pitch: tron(euler.x, 3), fov: tron(camera.fov, 1), trong, giay: 5, gio: null };
  }
  function tuDong() { // lộ trình máy tự dựng khi chưa lưu điểm nào
    const nha = ctx.nha(), ds = [], tong = ctx.viTriTong();
    const ngoai = (v, ten, giay) => { const d = v.t.clone().sub(v.p); return { ten, x: v.p.x, y: v.p.y, z: v.p.z, yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)), fov: ctx.FOV_XA, trong: false, giay, gio: null }; };
    ds.push(ngoai(tong, 'Toàn cảnh ngôi nhà', 5));
    const kd = (v) => ctx.khongDau(v.ten.join(' '));
    const vungs = nha.pt.vungs.filter((v) => v.trongNha && v.dt > 4 && !/\bwc\b|ve sinh|\btam\b|kho|hanh lang|sanh|thang|gieng|gen|hien|ban cong|lo gia|giat|phoi/.test(kd(v)));
    const hang = (v) => { const t = kd(v); if (/khach|sinh hoat/.test(t)) return 0; if (/bep|\ban\b|khu mo/.test(t)) return 1; if (/ngu|\bpn\d*\b|master/.test(t)) return 2; return 3; };
    vungs.sort((a, b) => hang(a) - hang(b) || b.dt - a.dt).slice(0, 6).forEach((v) => {
      const g = ctx.gocDep(v);
      ds.push({ ten: ctx.tenVung(v), x: g.x, y: ctx.MAT_MAT, z: g.z, yaw: g.yaw, pitch: -0.08, fov: ctx.FOV_DI, trong: true, giay: 5, gio: null });
    });
    const b = nha.bien, c = new THREE.Vector3(b.cx, 0, b.cz), p = tong.p.clone().sub(c).applyAxisAngle(new THREE.Vector3(0, 1, 0), 2.3).add(c);
    ds.push(ngoai({ p, t: tong.t }, 'Toàn cảnh góc khác', 5));
    return ds;
  }
  function lotTrinh() { const d = diemLuu(); return d.length ? d : tuDong(); }

  /* ---------------- giao diện: bảng điểm nhìn ---------------- */
  const bang = taoEl('aside', 'x3d-bang x3d-tq-bang', goc); bang.hidden = true; bang.setAttribute('aria-label', 'Tham quan tự động');
  function moBang() { ctx.dongBangKhac(); veBang(); bang.hidden = false; api.ga('aln_dmb_3d', { buoc: 'tq_mo' }); }
  function dongBang() { bang.hidden = true; ctx.ve(); }
  function chonSo(cha, ds, gt, nhan, khiDoi) {
    const s = taoEl('select', '', cha); s.setAttribute('aria-label', nhan);
    ds.forEach(([v, chu]) => { const o = taoEl('option', '', s, chu); o.value = v === null ? '' : String(v); if (v === gt || (v !== null && gt !== null && Math.abs(v - gt) < 1e-6)) o.selected = true; });
    s.addEventListener('change', () => khiDoi(s.value === '' ? null : Number(s.value))); return s;
  }
  function veBang() {
    while (bang.firstChild) bang.removeChild(bang.firstChild);
    const dau = taoEl('div', 'x3d-bang-dau', bang), t = taoEl('div', '', dau);
    taoEl('h3', '', t, 'Tham quan tự động'); taoEl('span', 'x3d-chu-thich', t, 'Máy tự đi qua từng điểm nhìn, như phim giới thiệu nhà');
    nut(dau, 'x3d-dong', 'Đóng', ICON.dong).addEventListener('click', dongBang);
    const hang = taoEl('div', 'x3d-tq-hanh', bang);
    nut(hang, 'x3d-tq-chinh', 'Bắt đầu tham quan', ICON.play, 'Bắt đầu').addEventListener('click', () => batDau(false));
    if (coGhi()) nut(hang, 'x3d-tq-phu', 'Quay video tham quan', ICON.ghi, 'Quay video').addEventListener('click', () => batDau(true));
    const ds = diemLuu();
    taoEl('h4', '', bang, ds.length ? 'Điểm nhìn của anh/chị (' + ds.length + ')' : 'Điểm nhìn');
    if (!ds.length) {
      taoEl('p', 'x3d-chu-thich', bang, 'Chưa lưu điểm nhìn nào — máy đang tự đi: toàn cảnh, phòng khách, bếp, các phòng ngủ.');
      const b = taoEl('button', 'x3d-ca-nha', bang, 'Chép lộ trình tự động ra để sửa'); b.type = 'button';
      b.addEventListener('click', () => { luu(tuDong().map(lamTron)); veBang(); ctx.bao('Đã chép lộ trình tự động. Sửa tên, số giây, giờ từng điểm bên dưới.'); });
    }
    const ul = taoEl('ol', 'x3d-tq-ds', bang);
    ds.forEach((d, i) => {
      const li = taoEl('li', '', ul);
      const dong1 = taoEl('div', 'x3d-tq-d1', li);
      taoEl('b', 'x3d-tq-so', dong1, String(i + 1));
      const o = taoEl('input', '', dong1); o.type = 'text'; o.maxLength = 40; o.value = d.ten; o.setAttribute('aria-label', 'Tên điểm nhìn ' + (i + 1));
      o.addEventListener('change', () => sua(i, { ten: o.value.trim().slice(0, 40) || 'Điểm ' + (i + 1) }));
      nut(dong1, 'x3d-tq-icon', 'Xem điểm ' + (i + 1), ICON.xem).addEventListener('click', () => xemDiem(d));
      const dong2 = taoEl('div', 'x3d-tq-d2', li);
      chonSo(dong2, GIAY.map((g) => [g, g + ' giây']), d.giay, 'Số giây ở điểm ' + (i + 1), (v) => sua(i, { giay: v }));
      chonSo(dong2, GIO, d.gio === undefined ? null : d.gio, 'Giờ trong ngày ở điểm ' + (i + 1), (v) => sua(i, { gio: v }));
      const len = nut(dong2, 'x3d-tq-icon', 'Đưa lên', ICON.len), xuong = nut(dong2, 'x3d-tq-icon', 'Đưa xuống', ICON.xuong), xoa = nut(dong2, 'x3d-tq-icon x3d-tq-xoa', 'Xoá điểm ' + (i + 1), ICON.xoa);
      len.disabled = i === 0; xuong.disabled = i === ds.length - 1;
      len.addEventListener('click', () => doiCho(i, i - 1)); xuong.addEventListener('click', () => doiCho(i, i + 1));
      xoa.addEventListener('click', () => { const m = diemLuu().slice(); m.splice(i, 1); luu(m); veBang(); });
    });
    const them = taoEl('button', 'x3d-ca-nha x3d-tq-them', bang); them.type = 'button'; svg(them, ICON.ghim); taoEl('span', '', them, 'Lưu góc đang xem làm điểm nhìn');
    them.disabled = ds.length >= TOI_DA; them.addEventListener('click', () => luuGocNay());
    taoEl('p', 'x3d-chu-thich', bang, 'Cách làm: xoay, phóng (hoặc "Đi trong nhà") tới góc đẹp rồi bấm nút ghim ở trên cùng hoặc nút này. Tối đa ' + TOI_DA + ' điểm. Điểm nhìn lưu cùng bản vẽ.');
    if (ds.length) {
      const b = taoEl('button', 'x3d-tq-lien', bang, 'Xoá hết, dùng lại lộ trình tự động'); b.type = 'button';
      b.addEventListener('click', () => { luu([]); veBang(); });
    }
  }
  const lamTron = (d) => ({ ten: String(d.ten).slice(0, 40), x: tron(d.x, 2), y: tron(d.y, 2), z: tron(d.z, 2), yaw: tron(dongGoc(d.yaw), 3), pitch: tron(d.pitch, 3), fov: tron(d.fov, 1), trong: !!d.trong, giay: d.giay || 5, gio: d.gio === undefined ? null : d.gio });
  function sua(i, thay) { const m = diemLuu().map((d) => Object.assign({}, d)); if (!m[i]) return; Object.assign(m[i], thay); luu(m); }
  function doiCho(i, j) { const m = diemLuu().slice(); if (j < 0 || j >= m.length) return; const t = m[i]; m[i] = m[j]; m[j] = t; luu(m); veBang(); }
  function luuGocNay() {
    const ds = diemLuu().slice(); if (ds.length >= TOI_DA) { ctx.bao('Đã đủ ' + TOI_DA + ' điểm nhìn. Xoá bớt rồi lưu thêm.'); return; }
    const d = lamTron(gocDangXem()); ds.push(d); luu(ds);
    ctx.bao('Đã lưu điểm nhìn ' + ds.length + ': ' + d.ten + '.'); api.ga('aln_dmb_3d', { buoc: 'tq_luu', so: ds.length });
    if (!bang.hidden) veBang();
  }
  function xemDiem(d) { if (chay) return; ctx.datNoiBo(!!d.trong); apDung(d); ctx.sauKhiDat(d); ctx.ve(); }

  /* ---------------- đặt máy quay ---------------- */
  function apDung(d) {
    camera.position.set(d.x, d.y, d.z);
    if (Math.abs(camera.fov - d.fov) > 0.01) { camera.fov = d.fov; camera.updateProjectionMatrix(); }
    euler.set(d.pitch, d.yaw, 0, 'YXZ'); camera.quaternion.setFromEuler(euler);
  }
  // Cảnh trôi trong mỗi điểm: trong nhà đẩy tới ≤ 0,6 m + lia nhẹ; ngoài nhà lượn quanh tâm nhà ~10°.
  function diemCuoi(d, i) {
    const dau = i % 2 ? -1 : 1;
    if (d.trong) {
      const tien = Math.max(0, Math.min(0.6, ctx.khoangTruoc(d.x, d.z, d.yaw) - 0.9));
      return Object.assign({}, d, { x: d.x - Math.sin(d.yaw) * tien, z: d.z - Math.cos(d.yaw) * tien, yaw: d.yaw + 0.07 * dau });
    }
    const b = ctx.nha().bien, a = 0.17 * dau, c = Math.cos(a), s = Math.sin(a), dx = d.x - b.cx, dz = d.z - b.cz;
    return Object.assign({}, d, { x: b.cx + dx * c + dz * s, z: b.cz - dx * s + dz * c, y: d.y * 0.94, yaw: d.yaw + a });
  }
  function noiSuy(a, b, k) {
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, yaw: a.yaw + dongGoc(b.yaw - a.yaw) * k, pitch: a.pitch + (b.pitch - a.pitch) * k, fov: a.fov + (b.fov - a.fov) * k };
  }

  /* ---------------- chạy tham quan ---------------- */
  const lop = taoEl('div', 'x3d-tq-lop', khung); lop.hidden = true;
  const mo = taoEl('canvas', 'x3d-tq-mo', lop); // ảnh khung cũ, mờ dần khi chuyển cảnh
  const chuThich = taoEl('div', 'x3d-tq-ten', lop); taoEl('span', '', chuThich, 'ALN · Tham quan'); const chuLon = taoEl('b', '', chuThich);
  const thanh = taoEl('div', 'x3d-tq-thanh', lop); const chay1 = taoEl('i', '', thanh);
  const dieu = taoEl('div', 'x3d-tq-dieu', goc); dieu.hidden = true; dieu.setAttribute('role', 'toolbar'); dieu.setAttribute('aria-label', 'Điều khiển tham quan');
  const nTruoc = nut(dieu, 'x3d-tq-icon', 'Điểm trước', ICON.truoc), nDung = nut(dieu, 'x3d-tq-icon x3d-tq-to', 'Tạm dừng', ICON.pause), nSau = nut(dieu, 'x3d-tq-icon', 'Điểm sau', ICON.sau);
  const soDiem = taoEl('span', 'x3d-tq-so-diem', dieu), dauGhi = taoEl('span', 'x3d-tq-rec', dieu, 'Đang quay'); dauGhi.hidden = true;
  const nThoat = nut(dieu, 'x3d-tq-thoat', 'Dừng tham quan', ICON.dung, 'Dừng');

  let chay = false, dsChay = [], viTri = 0, pha = null, tamDung = false, cheDoTruoc = 'tong', gioTruoc = null;
  let moAlpha = 0, moT0 = 0, coMo = false;
  // Đồng hồ riêng của tham quan: mỗi khung hình nhích tối đa 0,1 giây → máy chậm thì phim chậm lại chứ không nhảy cóc qua điểm nhìn.
  let dongHo = 0, dongHoMo = 0, lanCuoi = null;
  const thu = { buocToiDa: 100 }; // máy thử vẽ bằng CPU nới bước này để chạy hết lộ trình trong thời gian hợp lý
  function batDau(ghi) {
    if (chay) return;
    dsChay = lotTrinh(); if (!dsChay.length) return;
    chay = true; tamDung = false; viTri = 0; lanCuoi = null; cheDoTruoc = ctx.ch.cheDo; gioTruoc = song.S.gio;
    dongBang(); ctx.batDauTQ(); goc.classList.add('x3d-dang-tq'); lop.hidden = false; dieu.hidden = false; capDieu();
    vaoDiem(0, 'mo');
    if (ghi) batDauGhi();
    api.ga('aln_dmb_3d', { buoc: ghi ? 'tq_quay' : 'tq_chay', so: dsChay.length, tu_dong: diemLuu().length ? 0 : 1 });
  }
  function capDieu() {
    soDiem.textContent = (viTri + 1) + ' / ' + dsChay.length;
    while (nDung.firstChild) nDung.removeChild(nDung.firstChild); svg(nDung, tamDung ? ICON.play : ICON.pause);
    nDung.setAttribute('aria-label', tamDung ? 'Chạy tiếp' : 'Tạm dừng'); nDung.title = nDung.getAttribute('aria-label');
    nTruoc.disabled = viTri === 0; nSau.disabled = viTri >= dsChay.length - 1;
  }
  // cach: 'mo' = chuyển cảnh mờ dần, 'bay' = bay liền, 'tu_chon' = tự chọn theo tầm nhìn
  function vaoDiem(i, cach) {
    const d = dsChay[i], cuoi = diemCuoi(d, i), now = dongHo;
    let kieu = cach;
    if (kieu === 'tu_chon') {
      const truoc = { x: camera.position.x, z: camera.position.z };
      if (!d.trong && ctx.ch.cheDo !== 'di') kieu = 'bay';
      else if (d.trong && ctx.ch.cheDo === 'di' && Math.hypot(d.x - truoc.x, d.z - truoc.z) < 9 && song.thayDuoc(truoc, d)) kieu = 'bay';
      else kieu = 'mo';
    }
    viTri = i; capDieu();
    if (d.gio !== null && d.gio !== undefined && Math.abs(song.S.gio - d.gio) > 0.05) song.denGio(d.gio, true, true);
    if (kieu === 'bay') {
      euler.setFromQuaternion(camera.quaternion, 'YXZ');
      const tu = { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: euler.y, pitch: euler.x, fov: camera.fov };
      pha = { loai: 'bay', t0: now, ms: BAY_MS, tu, toi: d, d, cuoi };
    } else {
      chupMo(); ctx.datNoiBo(!!d.trong); apDung(d);
      pha = { loai: 'dung', t0: now, ms: d.giay * 1000, tu: d, toi: cuoi, d };
    }
    hienTen(d.ten);
  }
  function hienTen(t) { chuLon.textContent = t; chuThich.classList.remove('hien'); void chuThich.offsetWidth; chuThich.classList.add('hien'); }
  function chupMo() { // chụp khung đang hiện để mờ dần sang cảnh mới
    const c = renderer.domElement; if (!c.width) return;
    ctx.veNgay(); // vẽ lại để chắc bộ đệm còn hình (WebGL xoá sau mỗi lần trình duyệt ghép)
    if (mo.width !== c.width || mo.height !== c.height) { mo.width = c.width; mo.height = c.height; }
    mo.getContext('2d').drawImage(c, 0, 0); coMo = true; moT0 = dongHoMo; moAlpha = 1; mo.style.opacity = '1';
  }
  function capNhat(t) { // gọi mỗi khung hình khi đang tham quan; trả true nếu cần vẽ
    if (!chay) return false;
    const buocT = lanCuoi === null ? 0 : Math.max(0, Math.min(thu.buocToiDa, t - lanCuoi)); lanCuoi = t;
    dongHoMo += buocT;
    if (coMo) { moAlpha = Math.max(0, 1 - (dongHoMo - moT0) / MO_MS); mo.style.opacity = moAlpha.toFixed(3); if (moAlpha <= 0) coMo = false; }
    if (tamDung) return coMo;
    dongHo += buocT; t = dongHo;
    if (!pha) return coMo;
    const k = Math.min(1, (t - pha.t0) / pha.ms);
    chay1.style.width = (((viTri + (pha.loai === 'dung' ? k : 0)) / dsChay.length) * 100).toFixed(2) + '%';
    if (pha.loai === 'bay') {
      apDung(noiSuy(pha.tu, pha.toi, muot(k)));
      if (k >= 1) pha = { loai: 'dung', t0: t, ms: pha.d.giay * 1000, tu: pha.d, toi: pha.cuoi, d: pha.d };
    } else {
      apDung(noiSuy(pha.tu, pha.toi, deu(k)));
      if (k >= 1) { if (viTri + 1 < dsChay.length) vaoDiem(viTri + 1, 'tu_chon'); else { pha = null; setTimeout(() => ketThuc(true), 400); } }
    }
    return true;
  }
  function doiTamDung(v) {
    if (!chay || v === tamDung) return;
    tamDung = v;
    capDieu();
  }
  function nhay(j) { if (!chay || j < 0 || j >= dsChay.length) return; tamDung = false; vaoDiem(j, 'mo'); }
  function ketThuc(het) {
    if (!chay) return;
    chay = false; pha = null; coMo = false;
    if (ghiLai) dungGhi(het);
    goc.classList.remove('x3d-dang-tq'); lop.hidden = true; dieu.hidden = true; mo.style.opacity = '0';
    if (gioTruoc !== null && Math.abs(song.S.gio - gioTruoc) > 0.05) song.denGio(gioTruoc, true, true);
    ctx.ketThucTQ(cheDoTruoc);
    if (het && !ghiLai) ctx.bao('Đã xem hết ' + dsChay.length + ' điểm nhìn.');
  }
  nDung.addEventListener('click', () => doiTamDung(!tamDung));
  nTruoc.addEventListener('click', () => nhay(viTri - 1));
  nSau.addEventListener('click', () => nhay(viTri + 1));
  nThoat.addEventListener('click', () => ketThuc(false));

  /* ---------------- quay video ---------------- */
  let ghiLai = null;
  function kieuGhi() {
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
    const ds = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return ds.find((k) => { try { return MediaRecorder.isTypeSupported(k); } catch (e) { return false; } }) || null;
  }
  function coGhi() { return !!kieuGhi(); }
  function batDauGhi() {
    const kieu = kieuGhi(); if (!kieu) return;
    const c = renderer.domElement, k = Math.min(1, 1920 / Math.max(c.width, c.height, 1));
    const cv = document.createElement('canvas'); cv.width = Math.round(c.width * k / 2) * 2; cv.height = Math.round(c.height * k / 2) * 2;
    const g = cv.getContext('2d'), luong = cv.captureStream(30), phan = [];
    let rec;
    try { rec = new MediaRecorder(luong, { mimeType: kieu, videoBitsPerSecond: nho ? 5e6 : 9e6 }); } catch (e) { ctx.bao('Trình duyệt này chưa quay được video.'); return; }
    rec.ondataavailable = (e) => { if (e.data && e.data.size) phan.push(e.data); };
    ghiLai = { rec, cv, g, phan, kieu, huy: false };
    rec.start(500); dauGhi.hidden = false;
  }
  function veKhungGhi() { // ghép khung hình + chú thích + dải ALN vào canvas đang ghi
    if (!ghiLai) return;
    const { cv, g } = ghiLai, w = cv.width, h = cv.height, c = renderer.domElement;
    g.drawImage(c, 0, 0, w, h);
    if (coMo && moAlpha > 0) { g.globalAlpha = moAlpha; g.drawImage(mo, 0, 0, w, h); g.globalAlpha = 1; }
    const s = Math.round(h / 34), dai = Math.round(s * 1.9);
    if (chuThich.classList.contains('hien')) {
      const fLon = '700 ' + Math.round(s * 1.25) + 'px "Be Vietnam Pro", Arial, sans-serif', fNho = '600 ' + Math.round(s * 0.62) + 'px "Be Vietnam Pro", Arial, sans-serif';
      g.font = fLon; const tw = Math.max(w * 0.2, g.measureText(chuLon.textContent).width + s * 2);
      g.fillStyle = 'rgba(11,31,58,0.55)'; g.fillRect(s, h - dai - s * 4.1, tw, s * 3.3);
      g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      g.fillStyle = '#e9c46a'; g.font = fNho; g.fillText('ALN · THAM QUAN', s * 2, h - dai - s * 2.75);
      g.fillStyle = '#ffffff'; g.font = fLon; g.fillText(chuLon.textContent, s * 2, h - dai - s * 1.3);
    }
    g.fillStyle = 'rgba(11,31,58,0.82)'; g.fillRect(0, h - dai, w, dai);
    g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.textAlign = 'right'; g.font = '600 ' + Math.round(s * 0.8) + 'px "Be Vietnam Pro", Arial, sans-serif';
    g.fillText('App Làm Nhà · applamnha.vn', w - s, h - dai / 2);
    g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '500 ' + Math.round(s * 0.72) + 'px "Be Vietnam Pro", Arial, sans-serif';
    g.fillText((api.lay().ten || 'Bản vẽ') + ' · hình minh hoạ', s, h - dai / 2);
  }
  function dungGhi(het) {
    const r = ghiLai; ghiLai = null; dauGhi.hidden = true; if (!r) return;
    r.rec.onstop = () => {
      const blob = new Blob(r.phan, { type: r.kieu.split(';')[0] });
      if (!blob.size) { ctx.bao('Chưa quay được video. Thử lại.'); return; }
      const duoi = /mp4/.test(r.kieu) ? 'mp4' : 'webm';
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = api.tenTep('tham-quan.' + duoi); document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
      ctx.bao(het ? 'Đã lưu video tham quan (' + duoi.toUpperCase() + ').' + (duoi === 'webm' ? ' Máy không mở được thì xem bằng Chrome.' : ' Gửi qua Zalo được ngay.') : 'Đã dừng giữa chừng — đã lưu phần video đã quay.');
      api.ga('aln_dmb_3d', { buoc: 'tq_video', dang: duoi, het: het ? 1 : 0 });
    };
    try { r.rec.stop(); } catch (e) { /* đã dừng */ }
  }
  function sauVe() { if (ghiLai) veKhungGhi(); }

  return {
    thu, moBang, dongBang, luuGocNay, batDau, ketThuc, capNhat, sauVe, tuDong, lotTrinh,
    dangChay: () => chay, dangTamDung: () => tamDung, dangGhi: () => !!ghiLai, tamDung: () => doiTamDung(true), doiTamDung, dangMoBang: () => !bang.hidden, coGhi
  };
}
