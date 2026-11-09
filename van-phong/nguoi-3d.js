/* ═══════════════════════════════════════════════════════════════
   Văn phòng ALN 3D — nhân vật mô hình thật (đợt 0: MyMy, 08/11/2026)

   - Mỗi nhân vật: mo-hinh-3d/nguoi/<ma>.glb (Tripo3D, gắn xương kiểu Mixamo, ~15–20 nghìn tam giác,
     ảnh bề mặt 1024 px, dưới 1,5 MB). Thêm nhân vật mới = thêm file + 1 dòng trong NHAN_VAT.
   - Động tác dùng chung: mo-hinh-3d/nguoi/dong-tac.glb (bộ xương nguồn Mixamo + 9 động tác).
     Lúc nạp, mỗi động tác được CHUYỂN sang xương của từng nhân vật theo góc quay thế giới
     (so với tư thế chữ T của hai bên), nên tư thế nghỉ của từng mô hình Tripo lệch nhau vẫn đúng.
   - Chỉ nạp nhân vật ở gần chỗ đang xem (phòng đang mở hoặc tâm camera trong BAN_KINH m);
     nhân vật đánh dấu luon (lễ tân) nạp ngay khi mở văn phòng.
   - Quay về người dựng bằng code khi: ?nguoi=0, máy bật tiết kiệm dữ liệu, máy ít bộ nhớ,
     máy đã tự hạ hết mức chất lượng, nạp lỗi hoặc quá 20 giây.
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const GOC = new URL("../mo-hinh-3d/nguoi/", import.meta.url).href;
const DONG_TAC = GOC + "dong-tac.glb?v=2"; // v2 (09/11/2026): có ngón tay
// id nhân vật trong van-phong.js → mô hình. gioi chọn dáng đứng/đi; cao = chiều cao trong văn phòng (m)
// 4 nhân vật chủ nhà (08/11/2026): 2 cặp trẻ / lớn tuổi, hình minh hoạ, không đội tên người thật
const CHU_NHA = {
  cn_tre_nam: { ma: "cn_tre_nam", tep: "cn_tre_nam.glb?v=1", gioi: "nam", cao: 1.7 },
  cn_tre_nu: { ma: "cn_tre_nu", tep: "cn_tre_nu.glb?v=1", gioi: "nu", cao: 1.6 },
  cn_lon_nam: { ma: "cn_lon_nam", tep: "cn_lon_nam.glb?v=1", gioi: "nam", cao: 1.66 },
  cn_lon_nu: { ma: "cn_lon_nu", tep: "cn_lon_nu.glb?v=1", gioi: "nu", cao: 1.55 }
};
export const NHAN_VAT = {
  MM: { ma: "mymy", tep: "mymy.glb?v=1", hd: "mymy-hd.glb?v=1", gioi: "nu", cao: 1.6, luon: true }, // lễ tân ở sảnh: khách thấy đầu tiên, nạp ngay
  // "Bạn" (khách đang xem): một trong 4 chủ nhà, giữ cố định theo máy (đợt 4 cho khách tự chọn)
  // chủ phòng Dự toán (09/11/2026, Nam: tạm dùng MyMy cho mọi phòng tới khi có nhân vật riêng); nạp khi khách tới gần
  DT: { ma: "mymy", tep: "mymy.glb?v=1", hd: "mymy-hd.glb?v=1", gioi: "nu", cao: 1.6 },
  BAN: { chon: Object.keys(CHU_NHA), nho: "aln_vp_ban_mh", luon: true },
  // khách mới đến (chế độ quản trị): mỗi lần mở trang một chủ nhà, khác "Bạn" nếu được
  KH: { chon: Object.keys(CHU_NHA) }
};
// mục có "chon" → chọn một chủ nhà; "nho" = khoá localStorage để giữ lựa chọn qua các lần mở
const DA_CHON = {};
function cauHinh(id) {
  const cf = NHAN_VAT[id]; if (!cf || !cf.chon) return cf;
  if (DA_CHON[id]) return DA_CHON[id];
  let ma = null;
  try { if (cf.nho) ma = localStorage.getItem(cf.nho); } catch (e) { /* bỏ qua */ }
  if (!CHU_NHA[ma]) {
    const khac = cf.chon.filter(m => !Object.values(DA_CHON).some(d => d.ma === m));
    const ds = khac.length ? khac : cf.chon; ma = ds[Math.floor(Math.random() * ds.length)];
    try { if (cf.nho) localStorage.setItem(cf.nho, ma); } catch (e) { /* bỏ qua */ }
  }
  return (DA_CHON[id] = Object.assign({ luon: cf.luon }, CHU_NHA[ma]));
}
// ?nguoi=1: ép nạp để kiểm thử (bỏ qua kiểm máy yếu, chờ lâu hơn)
const EP = /[?&]nguoi=1\b/.test(location.search);
const BAN_KINH = 16, HET_GIO = EP ? 90000 : 20000, FPS = 30;

/* ---------- nạp ---------- */
let loader = null;
function nap(url) {
  loader = loader || new GLTFLoader();
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("quá giờ " + url)), HET_GIO);
    loader.load(url, g => { clearTimeout(t); res(g); }, undefined, e => { clearTimeout(t); rej(e); });
  });
}
let nguonHua = null;
function napNguon() { return nguonHua || (nguonHua = nap(DONG_TAC)); }

/* ---------- chuyển động tác sang xương nhân vật ---------- */
const UP = new THREE.Vector3(0, 1, 0);
// hướng mặt của bộ xương (mặt phẳng ngang): trái = đùi trái − đùi phải; trước = trái × lên
function huongMat(goc, ten) {
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  goc.getObjectByName(ten.trai).getWorldPosition(a); goc.getObjectByName(ten.phai).getWorldPosition(b);
  const trai = a.sub(b); trai.y = 0; return trai.normalize().cross(UP).normalize();
}
function dsXuong(goc) { const ds = []; goc.traverse(o => { if (o.isBone || /^mixamorig/.test(o.name)) ds.push(o); }); return ds; }

function chuyenClip(clip, nguon, dich) {
  // nguon/dich: { goc, ds (xương theo thứ tự cha trước con), Qw (góc quay thế giới khi nghỉ), cha }
  const theo = new Map(); clip.tracks.forEach(t => { const [ten, tc] = t.name.split("."); theo.set(ten + "|" + tc, t.createInterpolant()); });
  const n = Math.max(2, Math.round(clip.duration * FPS) + 1), times = new Float32Array(n);
  for (let i = 0; i < n; i++) times[i] = Math.min(clip.duration, i / FPS);
  const qOut = new Map(); dich.ds.forEach(b => qOut.set(b.name, new Float32Array(n * 4)));
  const pOut = new Float32Array(n * 3);
  const Ws = new Map(), Wt = new Map(), q = new THREE.Quaternion(), d = new THREE.Quaternion(), v = new THREE.Vector3();
  const R = dich.R, Ri = R.clone().invert();
  for (let i = 0; i < n; i++) {
    const t = times[i];
    // góc quay thế giới của xương nguồn tại thời điểm t
    nguon.ds.forEach(b => {
      const ip = theo.get(b.name + "|quaternion"); if (ip) q.fromArray(ip.evaluate(t)); else q.copy(b.quaternion);
      const cw = Ws.get(nguon.cha.get(b.name)); Ws.set(b.name, cw ? cw.clone().multiply(q) : nguon.Qcha.get(b.name).clone().multiply(q));
    });
    dich.ds.forEach(b => {
      const cha = dich.cha.get(b.name), cw = cha ? Wt.get(cha) : dich.Qcha.get(b.name);
      let w;
      if (Ws.has(b.name)) { // Δ thế giới của nguồn, xoay sang hệ mặt của nhân vật, áp lên tư thế nghỉ của nhân vật
        d.copy(Ws.get(b.name)).multiply(nguon.QwInv.get(b.name)); d.premultiply(R).multiply(Ri);
        w = d.clone().multiply(dich.Qw.get(b.name));
      } else w = cw.clone().multiply(b.quaternion); // xương nguồn không có (ngón tay): giữ tư thế nghỉ
      Wt.set(b.name, w);
      q.copy(cw).invert().multiply(w); q.toArray(qOut.get(b.name), i * 4);
    });
    // hông: dời theo nguồn, co theo tỉ lệ chiều cao hông, đổi về hệ cha của hông nhân vật
    const ip = theo.get(nguon.hong + "|position");
    if (ip) v.fromArray(ip.evaluate(t)).sub(nguon.hongNghi).multiplyScalar(dich.tiLe).applyQuaternion(R); else v.set(0, 0, 0);
    v.add(dich.hongTheGioi).applyMatrix4(dich.chaHongInv); v.toArray(pOut, i * 3);
  }
  const tracks = [];
  dich.ds.forEach(b => tracks.push(new THREE.QuaternionKeyframeTrack(b.name + ".quaternion", times, qOut.get(b.name))));
  tracks.push(new THREE.VectorKeyframeTrack(dich.hong + ".position", times, pOut));
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

function moTa(goc, laNguon) {
  goc.updateMatrixWorld(true);
  const ds = dsXuong(goc), cha = new Map(), Qw = new Map(), QwInv = new Map(), Qcha = new Map();
  const ten = new Set(ds.map(b => b.name));
  ds.forEach(b => {
    const c = b.parent && ten.has(b.parent.name) ? b.parent.name : null; cha.set(b.name, c);
    const w = new THREE.Quaternion(); b.getWorldQuaternion(w); Qw.set(b.name, w); QwInv.set(b.name, w.clone().invert());
    if (!c) { const pw = new THREE.Quaternion(); if (b.parent) b.parent.getWorldQuaternion(pw); Qcha.set(b.name, pw); }
  });
  const hong = ds.find(b => /Hips$/.test(b.name)); if (!hong) throw new Error("không thấy xương hông");
  const tenChan = { trai: ds.find(b => /LeftUpLeg$/.test(b.name)).name, phai: ds.find(b => /RightUpLeg$/.test(b.name)).name };
  const hongTheGioi = new THREE.Vector3(); hong.getWorldPosition(hongTheGioi);
  const o = { goc, ds, cha, Qw, QwInv, Qcha, hong: hong.name, mat: huongMat(goc, tenChan), hongTheGioi, chieuCaoHong: hongTheGioi.y };
  if (laNguon) o.hongNghi = hong.position.clone();
  else o.chaHongInv = hong.parent ? hong.parent.matrixWorld.clone().invert() : new THREE.Matrix4();
  return o;
}

/* ---------- quản lý nhân vật trong văn phòng ---------- */
export function taoNguoi3D(o) {
  const { NG, api, layTam, phone, cl, layCam } = o;
  // ảnh bề mặt nét (2048) cho người khách nhìn gần (lễ tân, chủ phòng): máy đủ bộ nhớ, không tiết kiệm dữ liệu, chưa tự hạ chất lượng
  const hdDuoc = () => EP || (!(navigator.deviceMemory && navigator.deviceMemory < 4) && !(cl && cl.muc >= 1));
  const qs = location.search, conn = navigator.connection;
  const tat = !EP && (/[?&]nguoi=0\b/.test(qs) || (conn && conn.saveData) || (navigator.deviceMemory && navigator.deviceMemory <= 2));
  const MOI = new Map(); // id → { trang: 'dang'|'xong'|'loi', mh }
  let lanSoat = 0;
  function gan(id) { const m = MOI.get(id), n = NG.get(id); if (!m || m.trang !== "xong" || !n) return;
    if (m.mh.goc.parent !== n.g) n.g.add(m.mh.goc); n.body.visible = false; }
  async function napNV(c) {
    const cf = cauHinh(c.id); MOI.set(c.id, { trang: "dang" });
    try {
      const tep = cf.hd && hdDuoc() ? cf.hd : cf.tep;
      const [src, g] = await Promise.all([napNguon(), nap(GOC + tep).catch(e => tep !== cf.tep ? nap(GOC + cf.tep) : Promise.reject(e))]);
      const nguon = moTa(src.scene, true);
      const sc = g.scene, bo = new THREE.Box3().setFromObject(sc), cao = bo.max.y - bo.min.y;
      if (!(cao > 0.1)) throw new Error("mô hình không có kích thước");
      const dich = moTa(sc, false);
      dich.tiLe = dich.chieuCaoHong / nguon.chieuCaoHong;
      dich.R = new THREE.Quaternion().setFromUnitVectors(nguon.mat, dich.mat); // hệ mặt nguồn → hệ mặt nhân vật
      const clips = {}; src.animations.forEach(a => { clips[a.name] = chuyenClip(a, nguon, dich); });
      // đặt vào văn phòng: chân chạm sàn, cao đúng cf.cao, mặt quay về +Z như người dựng bằng code
      const goc = new THREE.Group(); goc.name = "nv_" + cf.ma; goc.add(sc);
      sc.scale.setScalar(cf.cao / cao); sc.position.y = -bo.min.y * cf.cao / cao;
      goc.rotation.y = Math.atan2(dich.mat.x, dich.mat.z) * -1;
      sc.traverse(m => { if (m.isMesh) { m.frustumCulled = false; m.castShadow = m.receiveShadow = false; } });
      const mixer = new THREE.AnimationMixer(sc), act = {};
      Object.keys(clips).forEach(k => { act[k] = mixer.clipAction(clips[k]); });
      ["chao", "chi_tay", "gat_dau"].forEach(k => { if (act[k]) { act[k].setLoop(THREE.LoopRepeat, k === "chao" ? 3 : 1); act[k].clampWhenFinished = false; } });
      const xg = ten => sc.getObjectByName("mixamorig" + ten) || sc.getObjectByName("mixamorig:" + ten);
      const mh = { goc, mixer, act, gioi: cf.gioi, dang: null, motLan: null, daChao: false, noiTruoc: false,
        x: { dau: xg("Head"), co: xg("Neck"), nguc: xg("Spine2"), vaiT: xg("LeftShoulder"), vaiP: xg("RightShoulder"), tayT: xg("LeftArm"), tayP: xg("RightArm") },
        yaw: 0, pitch: 0, w: 0, pha: Math.random() * 10 };
      // da và tóc mềm hơn dưới ánh sáng môi trường (bản Tripo hay khô, mặt tối)
      sc.traverse(m => { if (m.isMesh && m.material) { const mt = m.material; mt.envMapIntensity = 1.25; if (mt.roughness !== undefined) mt.roughness = Math.max(0.55, mt.roughness); mt.needsUpdate = true; } });
      mixer.addEventListener("finished", e => { if (mh.motLan && e.action === mh.motLan) mh.motLan = null; });
      const cu = MOI.get(c.id);
      if (cu && cu.doiSau) { MOI.delete(c.id); return; } // khách vừa chọn nhân vật khác trong lúc nạp
      MOI.set(c.id, { trang: "xong", mh }); gan(c.id);
      try { (window.dataLayer = window.dataLayer || []).push({ event: "aln_vp_nguoi_3d", ma: cf.ma, kq: "xong" }); } catch (e) { /* bỏ qua */ }
    } catch (e) {
      console.warn("Nhân vật 3D " + cf.ma + " nạp lỗi, dùng người dựng bằng code:", e);
      MOI.set(c.id, { trang: "loi" });
      try { (window.dataLayer = window.dataLayer || []).push({ event: "aln_vp_nguoi_3d", ma: cf.ma, kq: "loi" }); } catch (e2) { /* bỏ qua */ }
    }
  }
  function ganDo(c) {
    const tam = layTam(); if (Math.hypot(c.x - tam.x, c.y - tam.z) < BAN_KINH) return true;
    const z = api.sel && api.ZM[api.sel]; return !!(z && c.x > z.x0 - 4 && c.x < z.x1 + 4 && c.y > z.y0 - 4 && c.y < z.y1 + 4);
  }
  function datDongTac(mh, ten, mo) {
    if (mh.dang === ten || !mh.act[ten]) return; const moi = mh.act[ten], cu = mh.dang && mh.act[mh.dang];
    // nữ: chuyển động tác chậm và êm hơn, đứng/nói nhịp chậm lại một chút cho dịu
    moi.timeScale = mh.gioi === "nu" && /^(dung_|noi)/.test(ten) ? 0.88 : 1;
    moi.reset().setEffectiveWeight(1).play(); if (cu) cu.crossFadeTo(moi, mo === undefined ? (mh.gioi === "nu" ? 0.45 : 0.3) : mo, false); mh.dang = ten;
  }
  /* Lớp mềm (09/11/2026, Nam: "khuôn mặt và dáng nhẹ nhàng dịu dàng như đúng người phụ nữ").
     Chạy SAU mixer mỗi khung, chỉ cộng thêm góc nhỏ lên xương (không cộng dồn vì mixer đặt lại mỗi khung):
     - quay đầu nhìn người đang nói chuyện (c.nhin) hoặc nhìn máy quay khi khách xem gần — cổ 40%, đầu 60%;
     - nữ: nghiêng đầu nhẹ khi nghe/nói, thở (ngực, vai), hai cánh tay khép sát người hơn khi đứng. */
  const _v = new THREE.Vector3(), _f = new THREE.Vector3(), _a = new THREE.Vector3(), _q = new THREE.Quaternion(), _pw = new THREE.Quaternion(), _t = new THREE.Quaternion();
  function xoay(bone, truc, goc) { // xoay thêm quanh trục THẾ GIỚI
    if (!bone || !bone.parent || Math.abs(goc) < 1e-4) return;
    bone.parent.getWorldQuaternion(_pw); _q.setFromAxisAngle(truc, goc);
    _t.copy(_pw).invert().multiply(_q).multiply(_pw); bone.quaternion.premultiply(_t);
  }
  const LEN = new THREE.Vector3(0, 1, 0);
  function lopMem(c, mh, moving, seated, noi, dt) {
    const X = mh.x; if (!X.dau || !mh.goc.parent) return;
    mh.pha += dt; const nu = mh.gioi === "nu", mot = !!mh.motLan;
    mh.goc.parent.getWorldDirection(_f); _f.y = 0; _f.normalize(); // hướng mặt người
    // điểm nhìn
    let dich = null;
    if (c.nhin) dich = _v.set(c.nhin[0], seated ? 1.35 : 1.25, c.nhin[1]);
    else if (layCam && !moving) { const cp = layCam(); if (Math.hypot(cp.x - c.x, cp.z - c.y) < 7) dich = _v.copy(cp); }
    let yaw = 0, pitch = 0, muon = 0;
    if (dich) {
      X.dau.getWorldPosition(_a); const dx = dich.x - _a.x, dy = dich.y - _a.y, dz = dich.z - _a.z, ngang = Math.hypot(dx, dz);
      yaw = Math.atan2(dx, dz) - Math.atan2(_f.x, _f.z); yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      pitch = Math.atan2(dy, ngang);
      if (Math.abs(yaw) < 1.5) { muon = 1; yaw = Math.max(-0.9, Math.min(0.9, yaw)); pitch = Math.max(-0.35, Math.min(0.3, pitch)); }
    }
    if (moving || mot) muon = 0;
    const k = 1 - Math.exp(-dt * 3);
    mh.w += (muon - mh.w) * k; mh.yaw += (yaw - mh.yaw) * k; mh.pitch += (pitch - mh.pitch) * k;
    const w = mh.w;
    if (w > 0.01) {
      xoay(X.co, LEN, mh.yaw * 0.4 * w); xoay(X.dau, LEN, mh.yaw * 0.6 * w);
      _a.set(_f.x, 0, _f.z).applyAxisAngle(LEN, mh.yaw * w).cross(LEN).normalize(); // trục ngang của đầu
      xoay(X.co, _a, -mh.pitch * 0.4 * w); xoay(X.dau, _a, -mh.pitch * 0.6 * w);
    }
    if (!nu) return;
    const t = mh.pha;
    // nghiêng đầu dịu khi nghe/nói (quanh hướng nhìn), lắc rất chậm
    const nghieng = (noi ? 0.07 : 0.05) * (0.6 + 0.4 * w) + Math.sin(t * 0.55) * 0.025;
    _a.set(_f.x, 0, _f.z).applyAxisAngle(LEN, mh.yaw * w);
    if (!moving) xoay(X.dau, _a, nghieng);
    // thở: ngực phồng nhẹ, vai lên xuống
    const tho = Math.sin(t * 1.5);
    _a.copy(_f).cross(LEN).normalize();
    xoay(X.nguc, _a, -tho * 0.018);
    if (!mot) { xoay(X.vaiT, _f, tho * 0.012); xoay(X.vaiP, _f, -tho * 0.012); }
    // đứng: hai tay khép sát người hơn (dáng dịu, không dang tay như dáng chung)
    if (!moving && !seated && !mot) { xoay(X.tayT, _f, -0.07); xoay(X.tayP, _f, 0.07); }
  }

  return {
    // gọi mỗi khung từ capNhatNguoi: chọn động tác theo việc nhân vật đang làm
    capNhat(c, moving, seated, noi, dt) {
      const m = MOI.get(c.id); if (!m || m.trang !== "xong") return;
      const mh = m.mh;
      if (noi && !mh.noiTruoc && !mh.daChao && !moving && !seated) { mh.daChao = true; this.dongTac(c.id, "chao"); }
      mh.noiTruoc = noi;
      if (!mh.motLan) datDongTac(mh, moving ? "di_" + mh.gioi : seated ? "ngoi_go_phim" : noi ? "noi" : "dung_" + mh.gioi);
      mh.mixer.update(dt);
      lopMem(c, mh, moving, seated, noi, dt);
    },
    // một động tác ngắn rồi trở về động tác nền: chao, chi_tay, gat_dau
    dongTac(id, ten) { const m = MOI.get(id); if (!m || m.trang !== "xong" || !m.mh.act[ten]) return false;
      m.mh.motLan = m.mh.act[ten]; m.mh.dang = null; datDongTac(m.mh, ten, 0.2); return true; },
    // kiểm định kỳ: nạp nhân vật ở gần chỗ đang xem
    soat() {
      const bay = performance.now(); if (tat || bay - lanSoat < 1000) return; lanSoat = bay;
      if (!EP && cl && cl.muc >= 2) return; // máy đã tự hạ hết mức: không nạp thêm
      api.CH.forEach(c => { if (NHAN_VAT[c.id] && !MOI.has(c.id) && api.visible(c) && (cauHinh(c.id).luon || ganDo(c))) napNV(c); });
    },
    // khách tự chọn nhân vật của mình (09/11/2026): ghi lựa chọn, bỏ mô hình đang có, lần soát sau nạp mô hình mới
    doi(id, ma) {
      const cf = NHAN_VAT[id]; if (!cf || !cf.chon || !CHU_NHA[ma]) return false;
      try { if (cf.nho) localStorage.setItem(cf.nho, ma); } catch (e) { /* bỏ qua */ }
      if (DA_CHON[id] && DA_CHON[id].ma === ma) return true;
      delete DA_CHON[id];
      const m = MOI.get(id), n = NG.get(id);
      if (m && m.mh && m.mh.goc.parent) m.mh.goc.parent.remove(m.mh.goc);
      if (n) n.body.visible = true;
      if (!m || m.trang !== "dang") MOI.delete(id); // đang nạp dở thì để nạp xong rồi đổi ở lần gọi sau
      else m.doiSau = ma;
      lanSoat = 0; return true;
    },
    gan, // gọi lại sau khi người dựng bằng code được dựng lại (dungLaiNguoi)
    trang: id => (MOI.get(id) || {}).trang || (tat ? "tat" : "chua"),
    phone
  };
}
