/* ALN · Bộ máy thiết kế mặt bằng — bản cho trang /thiet-ke-mat-bang/ (chủ nhà dùng thử).
 * FILE SINH TỰ ĐỘNG bằng scripts/gen-thiet-ke-mat-bang.js từ docs/thiet-ke-mat-bang/nguon/ — KHÔNG sửa tay.
 * Gồm: engine.js, mau-a-hoang.js, ve-chung.js, noi-that.js. Không có phần xuất CAD.
 */
/* ===== engine.js ===== */
/* ALN · Bộ máy phác mặt bằng từ HOUSE DNA
 * Đọc số từ ALN_HOUSE_DNA_v0.3.json + gói gen S bố cục (v0.4-genS-bocuc).
 * Chạy được ở trình duyệt (window.ALNPlan) và Node (module.exports).
 * Đơn vị: mét. Trục x theo bề ngang (0 = ranh trái nhìn từ đường), trục y theo chiều sâu (0 = ranh lộ giới).
 */
(function (root) {
  'use strict';
  const EPS = 1e-6;
  const FH = 3.6; // chiều cao tầng — chưa có trong ADN, quy ước engine

  /* ---------- Đọc ADN ---------- */
  function findRule(dna, ma) {
    for (const g of dna.gen) for (const r of g.quy_tac) if (r.ma === ma) return r;
    return null;
  }
  function cfgFromDNA(dna, genS) {
    const R = ma => { const r = findRule(dna, ma); if (!r) throw new Error('ADN thiếu quy tắc ' + ma); return r; };
    const S = {}; for (const r of genS.quy_tac_moi) S[r.ma] = r;
    const lodat = R('L-LODAT-01').dieu_kien_vi_pham_bat_ky;
    const lodatV = b => lodat.find(c => c.bien === b).gia_tri;
    const th = R('S-CAUTHANG-01');
    const gt1 = R('K-GIENGTROI-01'), gt2 = R('K-GIENGTROI-02');
    const tg1 = R('K-THONGGIO-01');
    const tum = R('L-TUM-01').dieu_kien;
    const P = S['S-PHONG-01'].gia_tri;
    const cfg = {
      FH,
      lodat: { dt: lodatV('lo.dien_tich_con_lai_sau_gpmb'), rong: lodatV('lo.rong_truoc'), sau: lodatV('lo.chieu_sau_toi_cgxd') },
      mdxd: R('L-MDXD-01').bang_tra.map(x => [x.dien_tich_lo, x.mdxd]),
      lui: R('L-LUI-01').bang_tra,
      luiSau: { nguong: R('L-LUI-02').dieu_kien[0].gia_tri, lui: R('L-LUI-02').gia_tri.lui_sau_toi_thieu },
      bancong: R('L-BANCONG-01').bang_tra,
      thang: {
        phapLy: th.nguong_phap_ly, aln: th.nguong_aln,
        rong: th.nguong_aln.chieu_rong_than_toi_thieu_m + 0.1, // 03/10: vế lọt lòng 90 cm sau khi trừ tường → tim-mép +10 cm
        matBac: th.nguong_aln.mat_bac_toi_thieu_m,
        coBacMax: th.nguong_aln.co_bac_toi_da_m,
        khe: 0.1
      },
      gieng: {
        canhAln: gt1.nguong_aln.canh_ngan_toi_thieu_m, canhPL: gt1.nguong_phap_ly.canh_ngan_toi_thieu_m,
        sauAln: gt2.nguong_aln.chieu_sau_kich_hoat_m, sauPL: gt2.nguong_phap_ly.chieu_sau_kich_hoat_m,
        macDinh: S['S-GIENGTROI-01'].gia_tri.sau_mac_dinh_m
      },
      doxe: R('S-DOXE-01').gia_tri,
      bantho: (R('C-BANTHO-01').kich_thuoc_cung_tot_cm.find(k => k.rong === 127) || R('C-BANTHO-01').kich_thuoc_cung_tot_cm[2]),
      thonggio: {
        o: tg1.nhanh.find(n => n.loai_phong === 'phong_o').nguong_phap_ly.ty_le_toi_thieu_dien_tich_san,
        phu: tg1.nhanh.find(n => n.loai_phong === 'phong_phu').nguong_phap_ly.ty_le_toi_thieu_dien_tich_san,
        xaToiDa: R('K-THONGGIO-02').nguong_aln.khoang_cach_toi_da_toi_nguon_thoang_m
      },
      tum: { tyLe: tum.find(c => c.bien.startsWith('tum.dien_tich')).gia_tri, cao: tum.find(c => c.bien === 'tum.chieu_cao').gia_tri },
      phong: P,
      loidi: Math.max(S['S-LOIDI-01'].gia_tri_aln.rong_toi_thieu_m, 0.9 + 0.15), // 03/10: lọt lòng ≥ 90 cm sau khi trừ tường biên 10 + nửa tường trong 5
      dai: S['S-DAI-01'].gia_tri,
      cua: S['S-CUA-01'].gia_tri,
      loaiCua: S['S-CUA-02'] ? S['S-CUA-02'].gia_tri : { mot_canh_toi_da_m: 1.0, hai_canh_toi_da_m: 1.8, cua_chinh_kinh_doanh_ty_le_be_ngang: 0.72 },
      cuaso: S['S-CUASO-01'].gia_tri,
      cot: S['S-COT-01'].gia_tri,
      diem: S['S-DIEM-01'].trong_so,
      sanh: S['S-THANG-03'] ? S['S-THANG-03'].gia_tri.sau_sanh_m : 1.0,
      xoan: { d: S['S-THANG-02'] ? S['S-THANG-02'].gia_tri.thang_xoan_oc.duong_kinh_m : 1.8 },
      xacNhan: {}
    };
    // nhãn xác nhận cho từng mã để giao diện hiển thị
    for (const g of dna.gen) for (const r of g.quy_tac) cfg.xacNhan[r.ma] = { xn: r.xac_nhan || (r.nguong_phap_ly && r.nguong_phap_ly.xac_nhan) || null, dx: !!(r.de_xuat || (r.nguong_aln && r.nguong_aln.de_xuat)) };
    for (const r of genS.quy_tac_moi) cfg.xacNhan[r.ma] = { xn: r.xac_nhan, dx: !!r.de_xuat };
    // thang chữ U suy từ ADN
    const t = cfg.thang;
    t.soCo = Math.ceil(FH / t.coBacMax - EPS);
    t.coBac = FH / t.soCo;
    t.bacMoiVe = Math.ceil(t.soCo / 2) - 1;
    t.run = t.bacMoiVe * t.matBac;
    t.chieuNghi = Math.max(t.rong, 1.0);
    t.W = t.rong * 2 + t.khe;
    t.L = t.run + t.chieuNghi;
    return cfg;
  }

  /* ---------- Hàm luật khối tích ---------- */
  function mdxd(cfg, a) {
    const T = cfg.mdxd; if (a <= T[0][0]) return T[0][1];
    for (let i = 1; i < T.length; i++) { const [a0, p0] = T[i - 1], [a1, p1] = T[i]; if (a <= a1) return p0 + (p1 - p0) * (a - a0) / (a1 - a0); }
    return T[T.length - 1][1];
  }
  function luiTruoc(cfg, lg, h) {
    for (const b of cfg.lui) if (lg >= b.lo_gioi_min && lg < b.lo_gioi_max) { for (const m of b.moc) if (h <= m.cao_toi) return m.lui; }
    return 6;
  }
  function vuon(cfg, lg) { for (const b of cfg.bancong) if (lg >= b.lo_gioi_min && lg < b.lo_gioi_max) return b.vuon_toi_da; return 0; }

  const fmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('vi-VN', { maximumFractionDigits: d });

  function envelope(inp, cfg) {
    const g = { inp, cfg, rules: [], w1: inp.w1, w2: inp.w2, d: inp.d };
    const area = (inp.w1 + inp.w2) / 2 * inp.d, B = Math.min(inp.w1, inp.w2), H = inp.tang * (inp.fh || FH);
    // luiOverride: khoảng lùi theo quy chế địa phương do KTS nhập (quy chế phường/xã đè lên L-LUI-01)
    const f = inp.luiOverride != null && inp.luiOverride !== '' && isFinite(+inp.luiOverride) ? +inp.luiOverride : luiTruoc(cfg, +inp.lgQH > 0 ? +inp.lgQH : inp.lg, H);
    g.luiTay = inp.luiOverride != null && inp.luiOverride !== '' && isFinite(+inp.luiOverride);
    let rr = inp.d > cfg.luiSau.nguong ? cfg.luiSau.lui : 0;
    let Db = inp.d - f - rr;
    Object.assign(g, { area, B, H, f });
    const L0 = cfg.lodat;
    if (area < L0.dt || inp.w1 < L0.rong || Db < L0.sau) {
      g.blocked = true;
      g.rules.push({ st: 'chan', ma: 'L-LODAT-01', t: 'Lô không đủ điều kiện xây', d: `Lô ${fmt(area, 1)} m², mặt tiền ${fmt(inp.w1)} m, sâu tới chỉ giới ${fmt(Db)} m. Ngưỡng: ≥ ${L0.dt} m², mặt tiền ≥ ${fmt(L0.rong)} m, sâu ≥ ${fmt(L0.sau)} m (TCVN 9411:2012 mục 5.1).` });
      return g;
    }
    g.rules.push({ st: 'dat', ma: 'L-LODAT-01', t: 'Lô đủ điều kiện xây', d: `${fmt(area, 1)} m², mặt tiền ${fmt(inp.w1)} m, sâu tới chỉ giới ${fmt(Db)} m — vượt ngưỡng ${L0.dt} m² / ${fmt(L0.rong)} m / ${fmt(L0.sau)} m.` });
    const pct = mdxd(cfg, area), maxFp = area * pct / 100; let fp = B * Db, add = 0;
    if (fp > maxFp + EPS) { add = (fp - maxFp) / B; rr += add; Db = inp.d - f - rr; fp = B * Db; }
    Object.assign(g, { pct, maxFp, fp, rr, Db, add });
    g.leftover = Math.max(0, area - B * inp.d); // phần nở hậu / thóp hậu ngoài khối chữ nhật
    g.rules.push(add > 0
      ? { st: 'cb', ma: 'L-MDXD-01', t: 'Mật độ xây dựng', d: `Tối đa ${fmt(pct, 1)}% → ${fmt(maxFp, 1)} m². Khối đầy lô vượt mức nên đã chừa sân sau thêm ${fmt(add)} m; xây ${fmt(fp, 1)} m² (${fmt(fp / area * 100, 1)}%).` }
      : { st: 'dat', ma: 'L-MDXD-01', t: 'Mật độ xây dựng', d: `Tối đa ${fmt(pct, 1)}% → ${fmt(maxFp, 1)} m². Phương án xây ${fmt(fp, 1)} m² (${fmt(fp / area * 100, 1)}%).` });
    g.rules.push(g.luiTay
      ? { st: 'cb', ma: 'L-LUI-01', t: 'Khoảng lùi trước — theo quy chế địa phương', d: `KTS nhập lùi ${fmt(f)} m theo quy chế phường/xã (đè lên bảng QCVN: cao ≈ ${fmt(H, 1)} m, lộ giới ${fmt(inp.lg, 1)} m → ${fmt(luiTruoc(cfg, inp.lg, H))} m). Cần giữ văn bản quy chế trong hồ sơ.` }
      : { st: 'dat', ma: 'L-LUI-01', t: 'Khoảng lùi trước', d: `Cao ≈ ${fmt(H, 1)} m (${inp.tang} tầng × ${fmt(inp.fh || FH, 1)}${inp.tum ? ', tum không tính' : ''}), lộ giới ${fmt(inp.lg, 1)} m → lùi trước ${fmt(f)} m.` });
    g.rules.push({ st: inp.d > cfg.luiSau.nguong ? 'dat' : 'goi', ma: 'L-LUI-02', t: 'Khoảng lùi sau', d: inp.d > cfg.luiSau.nguong ? `Sâu ${fmt(inp.d)} m > ${cfg.luiSau.nguong} m → lùi sau ${fmt(cfg.luiSau.lui)} m.` : `Sâu ${fmt(inp.d)} m ≤ ${cfg.luiSau.nguong} m → không bắt buộc lùi sau.` });
    // lộ giới theo quy hoạch (KTS nhập) đè lộ giới hiện trạng cho ban công / lùi; ban công theo quy chế đè tiếp
    const lgQ = +inp.lgQH > 0 ? +inp.lgQH : inp.lg;
    const vTay = inp.vuonOverride != null && inp.vuonOverride !== '' && isFinite(+inp.vuonOverride);
    g.proj = inp.tang > 1 ? (vTay ? +inp.vuonOverride : vuon(cfg, lgQ)) : 0;
    if (inp.tang > 1 && (vTay || lgQ !== inp.lg)) g.rules.push({ st: 'cb', ma: 'L-BANCONG-01', t: 'Ban công theo quy hoạch / quy chế địa phương', d: vTay ? `KTS nhập vươn ${fmt(g.proj)} m theo quy chế thực tế của lô (bảng QCVN theo lộ giới ${fmt(inp.lg, 1)} m cho ${fmt(vuon(cfg, inp.lg))} m). Giữ thông tin quy hoạch trong hồ sơ.` : `Lộ giới hiện trạng ${fmt(inp.lg, 1)} m nhưng quy hoạch ${fmt(lgQ, 1)} m → vươn ${fmt(g.proj)} m theo lộ giới quy hoạch. Giữ thông tin quy hoạch trong hồ sơ.` });
    else if (inp.tang > 1) g.rules.push(g.proj > 0
      ? { st: 'dat', ma: 'L-BANCONG-01', t: 'Ban công vươn ra', d: `Lộ giới ${fmt(inp.lg, 1)} m → vươn tối đa ${fmt(g.proj)} m, không vượt ranh hai bên. Mép dưới ở cao độ ${fmt(FH, 1)} m ≥ 3,5 m.` }
      : { st: 'cb', ma: 'L-BANCONG-01', t: 'Không được vươn ban công', d: `Lộ giới ${fmt(inp.lg, 1)} m < 7 m → không vươn ra ngoài chỉ giới. Ban công phải làm lô-gia lùi vào trong.` });
    const G = cfg.gieng;
    g.needLW = inp.d > G.sauAln;
    g.rules.push({ st: g.needLW ? 'dat' : 'goi', ma: 'K-GIENGTROI-02', t: 'Giếng trời bắt buộc', d: inp.d > G.sauPL ? `Sâu ${fmt(inp.d)} m > ${G.sauPL} m: bắt buộc theo TCVN 9411:2012 mục 5.1.2 — đã đặt giếng trời.` : inp.d > G.sauAln ? `Sâu ${fmt(inp.d)} m: pháp lý chỉ bắt buộc từ ${G.sauPL} m, ALN siết từ ${G.sauAln} m — đã đặt giếng trời.` : `Sâu ${fmt(inp.d)} m ≤ ${G.sauAln} m: không bắt buộc, dùng cửa sổ trước/sau.` });
    // mặt hậu có được mở cửa không: chỉ khi có sân sau
    g.rearOpen = rr >= 0.9 || !!inp.sauThoang; // sauThoang: phía sau có hẻm / khoảng trống của mình (KTS xác nhận)
    return g;
  }

  /* ---------- Tiện ích hình học ---------- */
  function fit(zones, avail) {
    const sMin = zones.reduce((s, z) => s + z.min, 0); if (sMin > avail + EPS) return null;
    let L = zones.map(z => z.min), extra = avail - sMin;
    const need = zones.map(z => Math.max(0, (z.pref ?? z.min) - z.min)), tn = need.reduce((a, b) => a + b, 0);
    if (tn > 0) { const k = Math.min(1, extra / tn); L = L.map((l, i) => l + need[i] * k); extra -= tn * k; }
    const gi = zones.map((z, i) => z.grow ? i : -1).filter(i => i >= 0);
    if (extra > EPS && gi.length) gi.forEach(i => L[i] += extra / gi.length);
    return L;
  }
  const LOAI = { khach: 'o', pn: 'o', sh: 'o', ongba: 'o', tho: 'o', kd: 'o', bep: 'phu', bep_uot: 'phu', wc: 'phu', wc_ongba: 'phu', kho: 'phu', giat: 'phu', gara: 'xe', san_xe: 'xe', lw: 'void', corr: 'gt', sanh: 'gt', san: 'open', phoi: 'open', tum: 'gt' };
  function room(x, y, w, h, lb, key, extra) {
    const t = key === 'lw' ? 'void' : (key === 'san' || key === 'phoi') ? 'open' : (key === 'corr' || key === 'sanh') ? 'corr' : (['wc', 'wc_ongba', 'bep_uot', 'giat'].includes(key) ? 'wet' : 'room');
    return Object.assign({ x, y, w, h, lb, key, t, loai: LOAI[key] || 'o' }, extra || {});
  }
  const frontSpec = (inp, P) => inp.kd ? { key: 'kd', lb: 'Kinh doanh', min: P.kinh_doanh.sau_toi_thieu_m, pref: P.kinh_doanh.sau_uu_tien_m }
    : inp.oto > 0 ? { key: 'gara', lb: inp.oto > 1 ? 'Gara 2 ô tô' : 'Gara ô tô', min: P.gara_o_to.sau_toi_thieu_m, pref: P.gara_o_to.sau_uu_tien_m }
      : { key: 'san_xe', lb: 'Sân để xe', min: P.san_de_xe.sau_toi_thieu_m, pref: P.san_de_xe.sau_uu_tien_m };

  /* ---------- Phương án A / B: bố cục dọc nhà hẹp ---------- */
  function layoutNarrow(g, mode, opts) {
    opts = opts || {};
    const { B, inp, cfg } = g, P = cfg.phong, T = cfg.thang, CORR = cfg.loidi;
    const y0 = g.f, avail = g.Db, notes = [];
    const SW = T.W, LS = T.L;
    const wcBeside = B - SW - CORR >= P.wc.canh_ngan_toi_thieu_m;
    const fs = frontSpec(inp, P);
    const front = { k: 'front', lb: fs.lb, key: fs.key, min: fs.min, pref: fs.pref, grow: mode === 'loi_sau' && inp.kd };
    let living = { k: 'living', min: P.phong_khach.sau_toi_thieu_m, pref: P.phong_khach.sau_uu_tien_m, grow: true };
    const noStair = inp.tang === 1;
    const SN = opts.noSanh ? 0 : cfg.sanh; // noSanh: phòng mở phía trước thang làm chỗ bước lên (chỉ phương án A)
    const core = noStair ? null : { k: 'core', min: LS + SN, pref: LS + SN };
    const wcz = (wcBeside && !noStair) ? null : { k: 'wc', min: P.wc.sau_khi_dung_rieng_vung_m, pref: P.wc.sau_khi_dung_rieng_vung_m };
    const lw = g.needLW ? { k: 'lw', min: cfg.gieng.macDinh, pref: cfg.gieng.macDinh } : null;
    const kit = { k: 'kit', min: P.bep_an.sau_toi_thieu_m, pref: P.bep_an.sau_uu_tien_m, grow: true };
    const obDeep = B - P.pn_ong_ba.rong_wc_rieng_m < P.pn_ong_ba.rong_toi_thieu_m; // WC ông bà đặt phía sau phòng
    const obExtra = obDeep ? P.pn_ong_ba.sau_wc_khi_hep_m : 0;
    let ob = inp.ongba ? { k: 'ob', min: P.pn_ong_ba.sau_toi_thieu_m + obExtra, pref: P.pn_ong_ba.sau_uu_tien_m + obExtra } : null;
    // giếng trời sau (S-BT-01) khi không có sân sau và nhà sâu
    let lw2 = !g.rearOpen ? { k: 'lw2', min: cfg.gieng.canhAln, pref: cfg.gieng.canhAln } : null;
    let steps = 0;
    const order = () => (mode === 'loi_sau' ? [front, living, lw, core, wcz, kit, ob, lw2] : [front, living, core, wcz, lw, kit, ob, lw2]).filter(Boolean);
    let seq = order(), Ls = fit(seq, avail);
    // KTS: giữ phòng khách riêng — thu giếng trời, bỏ giếng sau, hạ bếp trước rồi mới gộp khách
    if (!Ls && lw) { lw.min = lw.pref = cfg.gieng.canhAln; notes.push(`Giếng trời hạ xuống mức tối thiểu ${fmt(cfg.gieng.canhAln)} m.`); steps++; seq = order(); Ls = fit(seq, avail); }
    if (!Ls && lw2) { lw2 = null; notes.push('Không đủ sâu cho giếng trời sau — phòng cuối nhà không có nguồn sáng phía sau.'); steps++; seq = order(); Ls = fit(seq, avail); }
    if (!Ls && kit.min > P.bep_an.sau_toi_thieu_khi_thieu_cho_m) { kit.min = P.bep_an.sau_toi_thieu_khi_thieu_cho_m; notes.push('Bếp + ăn hạ xuống mức tối thiểu.'); steps++; seq = order(); Ls = fit(seq, avail); }
    if (!Ls && living) { living = null; front.lb += ' + khách'; front.grow = true; notes.push('Không đủ sâu cho phòng khách riêng — gộp vào không gian trước.'); steps++; seq = order(); Ls = fit(seq, avail); }
    if (!Ls && ob) { ob = null; g.obDropped = true; steps++; seq = order(); Ls = fit(seq, avail); }
    if (!Ls) { kit.min = P.bep_an.sau_toi_thieu_khi_thieu_cho_m; notes.push('Bếp + ăn hạ xuống mức tối thiểu.'); steps++; seq = order(); Ls = fit(seq, avail); }
    if (!Ls && front.key === 'gara') { front.key = 'san_xe'; front.lb = 'Sân để xe' + (living ? '' : ' + khách'); front.min = P.san_de_xe.sau_toi_thieu_m; front.pref = P.san_de_xe.sau_uu_tien_m; g.carDropped = true; notes.push('Không đủ sâu cho gara ô tô — vùng trước chỉ còn sân để xe máy.'); steps++; seq = order(); Ls = fit(seq, avail); }
    if (!Ls) return null;
    // thử lấy lại giếng trời sau nếu các bước thu gọn sau đó đã giải phóng đủ chỗ
    if (!lw2 && !g.rearOpen) {
      lw2 = { k: 'lw2', min: cfg.gieng.canhAln, pref: cfg.gieng.canhAln };
      const s2 = order(), L2 = fit(s2, avail);
      if (L2) { seq = s2; Ls = L2; const i = notes.findIndex(n => n.startsWith('Không đủ sâu cho giếng trời sau')); if (i >= 0) { notes.splice(i, 1); steps--; } }
      else lw2 = null;
    }
    const Z = {}; let y = y0; seq.forEach((z, i) => { Z[z.k] = { y, len: Ls[i] }; y += Ls[i]; });
    const yE = y0 + avail;
    const stackKeys = ['core', 'wc', 'lw'].filter(k => Z[k]);
    const s = Math.min(...stackKeys.map(k => Z[k].y)), e = Math.max(...stackKeys.map(k => Z[k].y + Z[k].len));
    const rearEnd = Z.lw2 ? Z.lw2.y : yE;

    const coreParts = (fl, dir, priv) => {
      const r = [], c = Z.core;
      if (!c) { /* nhà 1 tầng: không có thang */ }
      else {
        const sy = c.y + SN; // thang bắt đầu sau sảnh
        fl.stairs.push({ x: 0, y: sy, w: SW, h: LS, dir });
        if (wcBeside) {
          if (SN > 0) r.push(room(0, c.y, B - CORR, SN, 'Sảnh thang', 'sanh'));
          let wl = Math.min(P.wc.dai_uu_tien_m, LS);
          if (LS - wl <= P.kho_toi_thieu_m) wl = LS;
          // priv: WC cạnh thang thành WC riêng của phòng ngủ giáp cuối lõi
          const wy = priv === 'end' ? sy + LS - wl : sy, ky = priv === 'end' ? sy : sy + wl;
          r.push(room(SW, wy, B - SW - CORR, wl, 'WC', 'wc', priv ? { doorTo: 'pn', priv: true } : null));
          if (LS - wl > EPS) r.push(room(SW, ky, B - SW - CORR, LS - wl, 'Kho', 'kho'));
          r.push(room(B - CORR, c.y, CORR, SN + LS, 'Lối đi', 'corr'));
        } else { if (SN > 0) r.push(room(0, c.y, SW, SN, 'Sảnh thang', 'sanh')); r.push(room(SW, c.y, B - SW, SN + LS, 'Lối đi', 'corr')); }
      }
      if (Z.wc) { r.push(room(0, Z.wc.y, B - CORR, Z.wc.len, 'WC', 'wc')); r.push(room(B - CORR, Z.wc.y, CORR, Z.wc.len, '', 'corr')); }
      if (Z.lw) { r.push(room(0, Z.lw.y, B - CORR, Z.lw.len, 'Giếng trời', 'lw')); r.push(room(B - CORR, Z.lw.y, CORR, Z.lw.len, fl.ground ? 'Lối đi' : 'Hành lang', 'corr')); }
      if (Z.lw2) r.push(room(0, Z.lw2.y, B, Z.lw2.len, 'Giếng trời sau', 'lw'));
      return r;
    };
    const floors = [];
    const gf = mkFloor('Tầng trệt', 0, true);
    gf.rooms.push(room(0, Z.front.y, B, Z.front.len, front.lb, front.key, { entrance: true }));
    if (inp.oto > 0 && !inp.kd && front.key === 'gara') gf.cars = carsIn(cfg, 0, Z.front.y, B, Z.front.len, inp.oto);
    if (Z.living) gf.rooms.push(room(0, Z.living.y, B, Z.living.len, 'Phòng khách', 'khach'));
    gf.rooms.push(...coreParts(gf, 'LÊN'));
    gf.rooms.push(room(0, Z.kit.y, B, Z.kit.len, 'Bếp + ăn', 'bep'));
    if (Z.ob) gf.rooms.push(...obRooms(cfg, 0, Z.ob.y, B, Z.ob.len, obDeep));
    floors.push(gf);
    let pn = 0;
    const topIdx = inp.tang - 1;
    for (let i = 1; i < inp.tang; i++) {
      const top = (i === topIdx && inp.tang >= 3);
      const fl = mkFloor(top ? `Lầu ${i} · thờ` : `Lầu ${i}`, i, false);
      fl.bal = g.proj > 0 ? { x: 0, y: y0 - g.proj, w: B, h: g.proj } : null;
      const need = P.phong_ngu.canh_ngan_toi_thieu_m + P.pn_khep_kin.sau_dai_wc_m, pnMin = P.phong_ngu.canh_ngan_toi_thieu_m;
      const fLen = s - y0, rLen = rearEnd - e;
      const priv = top || !wcBeside || !Z.core ? null
        : (Math.abs(e - (Z.core.y + SN + LS)) < EPS && rLen >= pnMin && rLen < need) ? 'end' : null;
      fl.rooms.push(...coreParts(fl, (i === topIdx && !inp.tum) ? 'XUỐNG' : 'LÊN', priv));
      const fill = (yy, len, pos) => {
        if (len < 0.6) return;
        if (top) {
          if (pos === 'front') {
            const a = len > P.phong_tho.sau_toi_da_truoc_khi_tach_san_m ? P.phong_tho.sau_khi_tach_m : len;
            fl.rooms.push(room(0, yy, B, a, 'Phòng thờ', 'tho'));
            fl.altars.push(altarAt(cfg, B / 2, yy + a));
            if (len - a > EPS) fl.rooms.push(room(0, yy + a, B, len - a, 'Sân thượng', 'san'));
          } else fl.rooms.push(room(0, yy, B, len, 'Sân thượng + phơi', 'san'));
          return;
        }
        const ctx = { pn, firstFront: pos === 'front' && i === 1, minRest: (SN === 0 && pos === 'front' && mode === 'loi_giua') ? cfg.sanh : 0 };
        suites(cfg, fl, 0, B, yy, len, pos, ctx); pn = ctx.pn;
      };
      fill(y0, s - y0, 'front'); fill(e, rearEnd - e, 'rear');
      if (priv) { const w = fl.rooms.find(r => r.priv); const pnR = fl.rooms.find(r => r.key === 'pn' && shared(r, w)); if (pnR) pnR.sub = 'khép kín'; }
      floors.push(fl);
    }
    const ys = [0, y0, ...seq.map(z => Z[z.k].y), yE, g.d];
    const lwShort = Z.lw ? Math.min(B - CORR, Z.lw.len) : 0;
    return { mode, floors, ys, xs: [0, B], notes, steps, pn, obPlaced: !!Z.ob, wcBeside, lwShort, Z };
  }

  /* ---------- Phương án C: ba dải khô / đệm / ướt ---------- */
  function layoutWide(g) {
    const { B, inp, cfg } = g, P = cfg.phong, T = cfg.thang;
    const y0 = g.f, avail = g.Db, notes = [];
    const SW = T.W, LS = T.L;
    const wetW = Math.max(cfg.dai.dai_uot_toi_thieu_m, (B - SW) * cfg.dai.ty_le_dai_uot), dryW = B - SW - wetW, xb = dryW, xw = dryW + SW;
    const fs = frontSpec(inp, P);
    let fL = fs.pref; let steps = 0;
    const lwL = g.needLW ? cfg.gieng.macDinh : 0;
    const obL = inp.ongba ? P.pn_ong_ba.sau_uu_tien_m : 0;
    const needL = LS + cfg.sanh + lwL + cfg.loidi + obL + 1.5;
    if (avail - fL < needL) { fL = Math.max(fs.min, avail - needL); if (fL < fs.pref - EPS) { notes.push('Vùng trước thu ngắn để đủ chỗ cho dải phía sau.'); steps++; } }
    let ob = obL;
    if (avail - fL < LS + cfg.sanh + lwL + 1.5 + ob && ob) { ob = 0; g.obDropped = true; steps++; }
    const L = avail - fL - ob; if (L < (inp.tang === 1 ? 0 : LS + cfg.sanh) + lwL + 1.5) return null;
    const y1 = y0 + fL, yS = y1 + L, yE = y0 + avail, floors = [];
    const SN = cfg.sanh;
    const sL = inp.tang === 1 ? 0 : LS + SN; // mô-đun thang = sảnh + thang
    // giếng trời kéo ngang qua dải khô: hai phòng khô trước/sau giếng đều lấy sáng
    const band = !!(lwL && sL && L - sL - lwL >= 1.5);
    const bLen = L - sL - lwL;
    const dry = (fl, a, b, merged) => {
      if (band) { fl.rooms.push(room(0, y1, dryW, sL, a[0], a[1])); fl.rooms.push(room(0, y1 + sL + lwL, dryW, bLen, bLen >= P.phong_ngu.canh_ngan_toi_thieu_m ? b[0] : b[2] || b[0], bLen >= P.phong_ngu.canh_ngan_toi_thieu_m ? b[1] : b[3] || b[1])); }
      else if (L >= 6) { fl.rooms.push(room(0, y1, dryW, L / 2, a[0], a[1])); fl.rooms.push(room(0, y1 + L / 2, dryW, L / 2, b[0], b[1])); }
      else fl.rooms.push(room(0, y1, dryW, L, merged[0], merged[1]));
    };
    const buffer = (fl, dir) => {
      if (sL) { fl.rooms.push(room(xb, y1, SW, SN, 'Sảnh thang', 'sanh')); fl.stairs.push({ x: xb, y: y1 + SN, w: SW, h: LS, dir }); }
      if (lwL) fl.rooms.push(band ? room(0, y1 + sL, xw, lwL, 'Giếng trời', 'lw') : room(xb, y1 + sL, SW, lwL, 'Giếng trời', 'lw'));
      const r = L - sL - lwL;
      if (r > 0.05) fl.rooms.push(fl.ground || r < 2.5 ? room(xb, y1 + sL + lwL, SW, r, 'Hành lang', 'corr') : room(xb, y1 + sL + lwL, SW, r, 'Sinh hoạt', 'sh'));
    };
    const topIdx = inp.tang - 1;
    const gf = mkFloor('Tầng trệt', 0, true);
    gf.rooms.push(room(0, y0, B, fL, fs.lb, fs.key, { entrance: true }));
    if (inp.oto > 0 && !inp.kd) gf.cars = carsIn(cfg, 0, y0, B, fL, inp.oto);
    buffer(gf, 'LÊN');
    dry(gf, ['Phòng khách', 'khach'], ['Ăn + bếp khô', 'bep', 'Bếp khô', 'bep'], ['Khách + ăn', 'khach']);
    const wcL = Math.min(2, L);
    gf.rooms.push(room(xw, y1, wetW, wcL, 'WC', 'wc'));
    const mid = L - wcL;
    if (mid > 4.5) { gf.rooms.push(room(xw, y1 + wcL, wetW, 3, 'Bếp ướt', 'bep_uot')); gf.rooms.push(room(xw, y1 + wcL + 3, wetW, mid - 3, 'Giặt + kho', 'giat')); }
    else if (mid > 0.05) gf.rooms.push(room(xw, y1 + wcL, wetW, mid, 'Bếp ướt', 'bep_uot'));
    if (ob) gf.rooms.push(...obRooms(cfg, 0, yS, B, ob, false));
    floors.push(gf);
    let pn = 0;
    for (let i = 1; i < inp.tang; i++) {
      const top = (i === topIdx && inp.tang >= 3);
      const fl = mkFloor(top ? `Lầu ${i} · thờ` : `Lầu ${i}`, i, false);
      fl.bal = g.proj > 0 ? { x: 0, y: y0 - g.proj, w: B, h: g.proj } : null;
      if (top) { fl.rooms.push(room(0, y0, B, fL, 'Phòng thờ', 'tho')); fl.altars.push(altarAt(cfg, B / 2, y0 + fL)); }
      else if (fL >= P.phong_ngu.canh_ngan_toi_thieu_m) {
        const wcD = Math.min(fL, P.pn_khep_kin.sau_dai_wc_m + 0.4);
        fl.rooms.push(room(0, y0, xw, fL, `PN ${++pn} (master)`, 'pn', { sub: 'khép kín' }));
        fl.rooms.push(room(xw, y0 + fL - wcD, wetW, wcD, 'WC', 'wc', { doorTo: 'pn' }));
        if (fL - wcD > 0.05) fl.rooms.push(room(xw, y0, wetW, fL - wcD, 'Tủ đồ', 'kho', { doorTo: 'pn' }));
      } else fl.rooms.push(room(0, y0, B, fL, 'Ban công', 'phoi'));
      buffer(fl, (i === topIdx && !inp.tum) ? 'XUỐNG' : 'LÊN');
      if (top) {
        if (band) { fl.rooms.push(room(0, y1, dryW, sL, 'Sân thượng', 'san')); fl.rooms.push(room(0, y1 + sL + lwL, dryW, bLen, 'Sân thượng', 'san')); }
        else fl.rooms.push(room(0, y1, dryW, L, 'Sân thượng', 'san'));
        fl.rooms.push(room(xw, y1, wetW, wcL, 'WC', 'wc'));
        if (L - wcL > 0.05) fl.rooms.push(room(xw, y1 + wcL, wetW, L - wcL, 'Phơi', 'phoi'));
        if (ob) fl.rooms.push(room(0, yS, B, ob, 'Sân thượng sau', 'san'));
      } else {
        const before = fl.rooms.length;
        dry(fl, ['PN', 'pn'], ['PN', 'pn', 'Sinh hoạt', 'sh'], ['PN', 'pn']);
        for (const r of fl.rooms.slice(before)) if (r.key === 'pn') r.lb = `PN ${++pn}`;
        fl.rooms.push(room(xw, y1, wetW, wcL, 'WC', 'wc'));
        if (L >= 8) { fl.rooms.push(room(xw, y1 + 2, wetW, L - 4, 'Thay đồ / kho', 'kho')); fl.rooms.push(room(xw, y1 + L - 2, wetW, 2, 'WC', 'wc')); }
        else if (L - wcL > 0.05) fl.rooms.push(room(xw, y1 + wcL, wetW, L - wcL, 'Thay đồ / kho', 'kho'));
        if (ob) fl.rooms.push(ob >= P.phong_ngu.canh_ngan_toi_thieu_m ? room(0, yS, B, ob, `PN ${++pn}`, 'pn') : room(0, yS, B, ob, 'Phơi', 'phoi'));
      }
      floors.push(fl);
    }
    const ys = [0, y0, y1, y1 + sL, ...(lwL ? [y1 + sL + lwL] : []), ...(ob ? [yS] : []), yE, g.d];
    return { mode: 'ba_dai', floors, ys, xs: [0, xb, xw, B], notes, steps, pn, obPlaced: !!ob, lwShort: lwL ? Math.min(band ? xw : SW, lwL) : 0, wide: true, dryW, wetW, band };
  }


  /* ---------- Phương án D: nhà nông, thang sát ranh phải ---------- */
  function layoutShallow(g) {
    const { B, inp, cfg } = g, P = cfg.phong, T = cfg.thang, CORR = cfg.loidi;
    const y0 = g.f, Db = g.Db, yE = y0 + Db, notes = [];
    const SW = T.W, LS = T.L;
    const Lw = B - SW - CORR, xc = Lw, xs = Lw + CORR;
    if (Lw < P.phong_ngu.canh_ngan_toi_thieu_m || Db < LS + cfg.sanh) return null;
    const fs = frontSpec(inp, P);
    const rem = Db - LS - cfg.sanh;
    let steps = 0;
    // giếng trời sau cho phần phòng bên trái khi mặt hậu sát ranh
    const lw2L = (!g.rearOpen && Db - cfg.gieng.canhAln >= 2 * P.phong_ngu.canh_ngan_toi_thieu_m) ? cfg.gieng.canhAln : 0;
    const DL = Db - lw2L, yL = y0 + DL;
    const stairCol = (fl, dir) => {
      fl.rooms.push(room(xs, y0, SW, cfg.sanh, 'Sảnh thang', 'sanh'));
      fl.stairs.push({ x: xs, y: y0 + cfg.sanh, w: SW, h: LS, dir });
      if (rem > 0.05) fl.rooms.push(rem >= P.wc.canh_ngan_toi_thieu_m ? room(xs, y0 + cfg.sanh + LS, SW, rem, 'WC', 'wc') : room(xs, y0 + cfg.sanh + LS, SW, rem, 'Hộp KT', 'kho'));
      fl.rooms.push(room(xc, y0, CORR, Db, fl.ground ? 'Lối đi' : 'Hành lang', 'corr'));
      if (lw2L) fl.rooms.push(room(0, yL, Lw, lw2L, 'Giếng trời sau', 'lw'));
    };
    // tầng trệt
    const gf = mkFloor('Tầng trệt', 0, true);
    let fL = Math.min(fs.pref, Db);
    const obDeep = Lw - P.pn_ong_ba.rong_wc_rieng_m < P.pn_ong_ba.rong_toi_thieu_m;
    const obL = inp.ongba ? P.pn_ong_ba.sau_toi_thieu_m + (obDeep ? P.pn_ong_ba.sau_wc_khi_hep_m : 0) : 0;
    let ob = obL && DL >= fs.min + obL ? obL : 0;
    if (inp.ongba && !ob) { g.obDropped = true; steps++; }
    const restL = DL - ob;
    let rows = [];
    if (restL >= fs.min + P.bep_an.sau_toi_thieu_m) { fL = Math.max(fs.min, Math.min(fs.pref, restL - P.bep_an.sau_toi_thieu_m)); rows = [[fL, fs.lb, fs.key, true], [restL - fL, 'Khách + bếp', 'khach']]; }
    else { rows = [[restL, fs.lb + ' + khách + bếp', fs.key, true]]; notes.push('Lô nông: gộp vùng trước với khách và bếp — cần bếp gọn sát tường WC.'); steps++; }
    let y = y0;
    for (const [len, lb, key, ent] of rows) { gf.rooms.push(room(0, y, Lw, len, lb, key, ent ? { entrance: true } : null)); y += len; }
    if (ob) gf.rooms.push(...obRooms(cfg, 0, y, Lw, ob, obDeep));
    stairCol(gf, 'LÊN');
    if (inp.oto > 0 && !inp.kd && Lw >= cfg.doxe.o_to_thong_thuy_m.rong && fL >= cfg.doxe.o_to_thong_thuy_m.dai) gf.cars = carsIn(cfg, 0, y0, Lw, fL, inp.oto);
    else if (inp.oto > 0 && !inp.kd) notes.push('Vùng trước không đủ ô đỗ ô tô 2,5 × 5,0 m.');
    const floors = [gf];
    let pn = 0;
    const topIdx = inp.tang - 1;
    for (let i = 1; i < inp.tang; i++) {
      const top = (i === topIdx && inp.tang >= 3);
      const fl = mkFloor(top ? `Lầu ${i} · thờ` : `Lầu ${i}`, i, false);
      fl.bal = g.proj > 0 ? { x: 0, y: y0 - g.proj, w: B, h: g.proj } : null;
      stairCol(fl, (i === topIdx && !inp.tum) ? 'XUỐNG' : 'LÊN');
      if (top) {
        const a = Math.min(DL, Math.max(P.phong_tho.sau_toi_thieu_m, Math.min(P.phong_tho.sau_khi_tach_m, DL / 2)));
        fl.rooms.push(room(0, y0, Lw, a, 'Phòng thờ', 'tho')); fl.altars.push(altarAt(cfg, Lw / 2, y0 + a));
        if (DL - a > 0.05) fl.rooms.push(room(0, y0 + a, Lw, DL - a, 'Sân thượng', 'san'));
      } else { const ctx = { pn, firstFront: false }; suites(cfg, fl, 0, Lw, y0, DL, 'front', ctx); pn = ctx.pn; }
      floors.push(fl);
    }
    const ys = [0, y0, y0 + cfg.sanh, y0 + cfg.sanh + LS, yE, g.d].concat(rows.length > 1 ? [y0 + rows[0][0]] : []).concat(ob ? [yL - ob] : []).concat(lw2L ? [yL] : []);
    return { mode: 'nong', floors, ys, xs: [0, xc, xs, B], notes, steps, pn, obPlaced: !!ob, lwShort: lw2L ? Math.min(Lw, lw2L) : 0 };
  }

  /* ---------- Phương án E / G: thang ở dải sau, chạy ngang (U xoay ngang) hoặc thang xoắn ---------- */
  function layoutCross(g, kind) {
    const { B, inp, cfg } = g, P = cfg.phong, T = cfg.thang, CORR = cfg.loidi;
    const y0 = g.f, Db = g.Db, yE = y0 + Db, notes = [];
    const xo = kind === 'xoan', one = inp.tang === 1;
    const sw = one ? 0 : xo ? cfg.xoan.d : T.L, sh = one ? P.wc.sau_khi_dung_rieng_vung_m : xo ? cfg.xoan.d : T.W;
    if (B < sw - EPS || Db < sh + 2.0) return null;
    if (!xo && !one && B - sw < cfg.sanh - EPS) return null; // thang ngang cần sảnh ≥ 1 m ở đầu thang
    if (!one && FAok() < P.phong_ngu.canh_ngan_toi_thieu_m) return null; // lầu phải đặt được ít nhất một phòng
    if (xo && g.needLW) return null; // thang xoắn không kèm giếng trời → không dùng cho nhà sâu
    function FAok() { return Db - sh; }
    let steps = xo ? 2 : 0;
    const yR = yE - sh, FA = yR - y0, lx = B - sw;
    const stairAt = (fl, dir) => {
      if (one) { const ww = Math.min(B, P.wc.dai_uu_tien_m); fl.rooms.push(room(0, yR, ww, sh, 'WC', 'wc')); if (B - ww > 0.05) fl.rooms.push(room(ww, yR, B - ww, sh, B - ww >= 1.2 ? 'Giặt + kho' : 'Hộp KT', B - ww >= 1.2 ? 'giat' : 'kho')); return; }
      fl.stairs.push({ x: lx, y: yR, w: sw, h: sh, dir, kind: xo ? 'xoan' : 'Ungang' });
      if (xo) { if (lx > 0.05) fl.rooms.push(lx >= P.wc.canh_ngan_toi_thieu_m ? room(0, yR, lx, sh, 'WC', 'wc') : room(0, yR, lx, sh, 'Hộp KT', 'kho')); return; }
      // thang ngang: đầu lên xuống ở mép trái → sảnh ngay bên trái thang
      const sw2 = cfg.sanh, wcw = lx - sw2;
      if (wcw >= P.wc.canh_ngan_toi_thieu_m) { fl.rooms.push(room(0, yR, wcw, sh, 'WC', 'wc')); fl.rooms.push(room(wcw, yR, sw2, sh, 'Sảnh thang', 'sanh')); }
      else fl.rooms.push(room(0, yR, lx, sh, 'Sảnh thang', 'sanh'));
    };
    const fs = frontSpec(inp, P);
    const obDeep = B - P.pn_ong_ba.rong_wc_rieng_m < P.pn_ong_ba.rong_toi_thieu_m;
    const obL = inp.ongba ? P.pn_ong_ba.sau_toi_thieu_m + (obDeep ? P.pn_ong_ba.sau_wc_khi_hep_m : 0) : 0;
    let ob = obL && FA >= fs.min + obL + 2.0 ? obL : 0;
    const rest = FA - ob;
    let fL, merged = false;
    if (rest >= fs.min + P.bep_an.sau_toi_thieu_m) fL = Math.max(fs.min, Math.min(fs.pref, rest - P.bep_an.sau_toi_thieu_m));
    else { fL = FA; merged = true; ob = 0; notes.push('Lô nông: gộp vùng trước với khách và bếp.'); steps++; }
    if (inp.ongba && !ob) { g.obDropped = true; steps++; }
    const gf = mkFloor('Tầng trệt', 0, true);
    let y = y0;
    gf.rooms.push(room(0, y, B, fL, merged ? fs.lb + ' + khách + bếp' : fs.lb, fs.key, { entrance: true })); y += fL;
    if (ob) { gf.rooms.push(...obRooms(cfg, 0, y, B, ob, obDeep)); y += ob; }
    if (!merged) gf.rooms.push(room(0, y, B, yR - y, 'Khách + bếp', 'khach'));
    stairAt(gf, 'LÊN');
    const cw = cfg.doxe.o_to_thong_thuy_m;
    if (inp.oto > 0 && !inp.kd) { if (fs.key === 'gara' && fL >= cw.dai && B >= cw.rong) gf.cars = carsIn(cfg, 0, y0, B, fL, inp.oto); else { g.carDropped = true; } }
    const floors = [gf];
    let pn = 0;
    const topIdx = inp.tang - 1;
    const two = FA >= 2 * P.phong_ngu.canh_ngan_toi_thieu_m;
    const a = two ? Math.max(P.phong_ngu.canh_ngan_toi_thieu_m, Math.min(P.phong_ngu.sau_uu_tien_m, FA / 2)) : FA;
    for (let i = 1; i < inp.tang; i++) {
      const top = (i === topIdx && inp.tang >= 3);
      const fl = mkFloor(top ? `Lầu ${i} · thờ` : `Lầu ${i}`, i, false);
      fl.bal = g.proj > 0 ? { x: 0, y: y0 - g.proj, w: B, h: g.proj } : null;
      stairAt(fl, (i === topIdx && !inp.tum) ? 'XUỐNG' : 'LÊN');
      if (top) {
        const t = Math.min(FA, Math.max(P.phong_tho.sau_toi_thieu_m, Math.min(P.phong_tho.sau_khi_tach_m, FA / 2)));
        fl.rooms.push(room(0, y0, B, t, 'Phòng thờ', 'tho')); fl.altars.push(altarAt(cfg, B / 2, y0 + t));
        if (FA - t > 0.05) fl.rooms.push(room(0, y0 + t, B, FA - t, 'Sân thượng', 'san'));
      } else { const ctx = { pn, firstFront: false, wcRight: true }; suites(cfg, fl, 0, B, y0, FA, 'front', ctx); pn = ctx.pn; }
      floors.push(fl);
    }
    const ys = [0, y0, y0 + fL, yR, yE, g.d].concat(ob ? [y0 + fL + ob] : []).concat(two ? [y0 + a] : []);
    return { mode: one ? 'gon' : kind === 'xoan' ? 'xoan' : 'ngang', floors, ys, xs: [0, lx, B], notes, steps, pn, obPlaced: !!ob, lwShort: 0 };
  }

  /* ---------- Mặt cắt dọc nhà ---------- */
  function section(g, P, opt) {
    opt = opt || {};
    const { cfg, inp } = g, T = cfg.thang;
    const out = { lines: [], rects: [], texts: [], levels: [], notes: [] };
    const L = (y1, z1, y2, z2, c) => out.lines.push({ y1, z1, y2, z2, c });
    const R = (y, z, w, h, c) => out.rects.push({ y, z, w, h, c });
    const X = (y, z, t, c, a, m) => out.texts.push({ y, z, t, c: c || 'lb', a: a || 'middle', m: m || 99 });
    const y0 = g.f, yE = g.f + g.Db, n = inp.tang, SL = 0.15;
    const floors = P.floors.filter(f => !f.isTum);
    const st0 = P.floors[0].stairs[0];
    // nhà nông (D): cắt qua dãy phòng, thang chiếu lên mặt cắt bằng nét đứt
    const xc = P.mode === 'nong' ? P.xs[1] / 2 : !st0 ? g.B / 2 : st0.kind === 'Ungang' ? st0.x + T.run / 2 : st0.kind === 'xoan' ? st0.x + st0.w / 2 : st0.x + T.rong / 2;
    out.xc = xc;
    const cut = fl => fl.rooms.concat(fl.stairs.map(s => Object.assign({ isStair: true, t: 'stair', lb: 'Thang' }, s))).filter(r => r.x <= xc + EPS && r.x + r.w >= xc - EPS).sort((a, b) => a.y - b.y);
    const split = !!opt.split && st0 && st0.kind !== 'xoan';
    const hasTum = !!P.floors[P.floors.length - 1].isTum;
    const ys = st0 ? st0.y : null, ye = st0 ? st0.y + st0.h : null;
    // cao độ sàn theo vị trí (lệch tầng: phía sau thang cao thêm nửa tầng)
    const lev = (i, y) => i * FH + (split && y >= ye - EPS ? FH / 2 : 0);
    // đất và ranh
    L(-1.2, 0, g.d + 1.2, 0, 'dat');
    L(0, -0.4, 0, (n + 1.2) * FH, 'ranh'); L(g.d, -0.4, g.d, (n + 1.2) * FH, 'ranh');
    X(-0.6, -0.35, 'ĐƯỜNG', 'nho', 'end');
    // sàn từng tầng
    floors.forEach((fl, i) => {
      for (const r of cut(fl)) {
        const z = lev(i, r.y + r.h / 2);
        const zTop = lev(i + 1, r.y + r.h / 2);
        if (i === 0) { R(r.y, -SL, r.h, SL, 'san'); if (z > EPS && !r.isStair) { R(r.y, z - SL, r.h, SL, 'san'); if (r.h >= 2.5) X(r.y + r.h / 2, z / 2, 'gầm / bể nước', 'nho', 'middle', r.h - 0.2); } }
        else if (!(r.t === 'void') && !r.isStair) R(r.y, z - SL, r.h, SL, 'san');
        if (r.isStair) { if (i < n - 1 || hasTum) stairSec(r, i, z); }
        else if (r.lb && r.h >= 0.9) X(r.y + r.h / 2, z + Math.min(zTop - z, FH) / 2, r.t === 'void' ? 'GT' : r.lb, r.t === 'void' ? 'void' : 'lb', 'middle', r.h - 0.15);
        if (r.t === 'void') R(r.y, z, r.h, FH, 'void');
      }
      // thang nằm ngoài mặt cắt: chiếu nét đứt
      for (const st of fl.stairs) if (!(st.x <= xc + EPS && st.x + st.w >= xc - EPS) && (i < n - 1 || hasTum)) {
        if (st.kind === 'U' || !st.kind) { L(st.y, i * FH, st.y + T.run, i * FH + FH / 2, 'thangthay'); L(st.y + T.run, i * FH + FH / 2, st.y, (i + 1) * FH, 'thangthay'); }
        else R(st.y, i * FH, st.h, FH, 'thangkhoi');
      }
      if (fl.bal) R(fl.bal.y, i * FH - SL, fl.bal.h, SL, 'bal');
      if (fl.bal) L(fl.bal.y, i * FH, fl.bal.y, i * FH + 1.0, 'lancan');
    });
    // mái
    const roofSegs = cut(floors[floors.length - 1]);
    for (const r of roofSegs) {
      const z = lev(n, r.y + r.h / 2);
      if (r.t === 'void') { L(r.y, z, r.y + r.h, z, 'kinh'); continue; }
      if (r.isStair && hasTum) continue;
      if (r.t === 'open') { L(r.y, z - FH, r.y, z - FH + 1.0, 'lancan'); L(r.y + r.h, z - FH, r.y + r.h, z - FH + 1.0, 'lancan'); continue; } // sân thượng: không mái
      R(r.y, z - SL, r.h, SL, 'san');
    }
    const zRoofF = lev(n, y0), zRoofR = lev(n, yE - 0.01);
    L(y0, zRoofF, y0, zRoofF + 1.0, 'lancan'); L(yE, zRoofR, yE, zRoofR + 1.0, 'lancan');
    // tường mặt tiền và mặt hậu
    L(y0, 0, y0, zRoofF, 'tuong'); L(yE, 0, yE, zRoofR, 'tuong');
    // tum
    const tf = P.floors[P.floors.length - 1];
    if (tf.isTum && tf.tum && tf.tum.x <= xc + EPS && tf.tum.x + tf.tum.w >= xc - EPS) {
      const z = lev(n, tf.tum.y + tf.tum.h / 2), h = Math.min(cfg.tum.cao, 2.8);
      L(tf.tum.y, z, tf.tum.y, z + h, 'tuong'); L(tf.tum.y + tf.tum.h, z, tf.tum.y + tf.tum.h, z + h, 'tuong');
      R(tf.tum.y, z + h - SL, tf.tum.h, SL, 'san');
      X(tf.tum.y + tf.tum.h / 2, z + h / 2, 'TUM', 'lb');
      out.tumTop = z + h;
    } else if (tf.isTum && tf.tum) {
      // tum nằm ngoài mặt cắt: chiếu nét đứt
      const z = n * FH, h = Math.min(cfg.tum.cao, 2.8), a = tf.tum.y, b = tf.tum.y + tf.tum.h;
      L(a, z, a, z + h, 'thangthay'); L(a, z + h, b, z + h, 'thangthay'); L(b, z + h, b, z, 'thangthay');
      X((a + b) / 2, z + h / 2, 'TUM (phía sau)', 'nho', 'middle', b - a - 0.1);
      out.tumTop = z + h;
    }
    // cao độ
    const lv = new Set();
    floors.forEach((f, i) => { lv.add(+(i * FH).toFixed(2)); if (split) lv.add(+(i * FH + FH / 2).toFixed(2)); });
    lv.add(+(n * FH).toFixed(2)); if (split) lv.add(+zRoofR.toFixed(2));
    out.levels = [...lv].sort((a, b) => a - b);
    out.H = Math.max(zRoofF, zRoofR) + 1.0;
    out.Htum = out.tumTop || null;
    out.split = split;
    if (split) out.notes.push(`Phía sau thang nâng nửa tầng (${fmt(FH / 2, 1)} m); mỗi vế thang lên nửa tầng (${Math.round(T.soCo / 2)} bậc). Mái phía sau cao hơn mái trước ${fmt(FH / 2, 1)} m — kiểm lại chiều cao theo L-LUI-01.`);
    return out;

    function stairSec(s, i, z) {
      if (s.kind === 'doc') { const zb = i * FH; L(s.y + s.h, zb, s.y, zb + FH, 'thang'); return; }
      if (s.kind === 'xoan' || s.kind === 'Ungang') { R(s.y, lev(i, s.y), s.h, FH, 'thangkhoi'); X(s.y + s.h / 2, lev(i, s.y) + FH / 2, s.kind === 'xoan' ? 'Thang xoắn' : 'Thang', 'lb'); return; }
      const zb = i * FH;
      if (!split) {
        // vế 1 (bị cắt) đi lên từ mép trước tới chiếu nghỉ; vế 2 (thấy) quay về
        L(s.y, zb, s.y + T.run, zb + FH / 2, 'thang');
        R(s.y + T.run, zb + FH / 2 - SL, T.chieuNghi, SL, 'san');
        L(s.y + T.run, zb + FH / 2, s.y, zb + FH, 'thangthay');
      } else {
        // lệch tầng: vế lên nửa tầng ra phía sau, vế tiếp lên nửa tầng ra phía trước
        L(s.y, zb, s.y + s.h, zb + FH / 2, 'thang');
        L(s.y + s.h, zb + FH / 2, s.y, zb + FH, 'thangthay');
      }
    }
  }

  /* ---------- Phòng ngủ khép kín (S-PHONG-01.pn_khep_kin) ----------
     pos 'front': phòng sát mặt tiền → dải WC + lối vào → phần dư (giáp lõi)
     pos 'rear' : phần dư (giáp lõi) → dải WC + lối vào → phòng sát mặt hậu */
  function suites(cfg, fl, x0, w, yy, len, pos, ctx) {
    const P = cfg.phong, K = P.pn_khep_kin, CORR = cfg.loidi, pnMin = P.phong_ngu.canh_ngan_toi_thieu_m, sD = K.sau_dai_wc_m;
    if (len < 0.6) return;
    if (ctx.minRest && len < pnMin + ctx.minRest) { fl.rooms.push(room(x0, yy, w, len, 'Sinh hoạt', 'sh')); return; }
    if (len < pnMin) { fl.rooms.push(room(x0, yy, w, len, 'Phơi / ban công', 'phoi')); return; }
    if (len < pnMin + sD || w < K.wc_rong_m * 0.5 + 0.9) { fl.rooms.push(room(x0, yy, w, len, `PN ${++ctx.pn}`, 'pn', { sub: 'WC chung' })); return; }
    const mr = ctx.minRest || 0;
    if (mr) {
      // phần giáp thang phải là không gian mở ≥ mr để bước lên/xuống thang
      if (len - mr < pnMin) { fl.rooms.push(room(x0, yy, w, len, 'Sinh hoạt', 'sh')); return; }
      if (len - mr < pnMin + sD) { fl.rooms.push(room(x0, yy, w, len - mr, `PN ${++ctx.pn}`, 'pn', { sub: 'WC chung' })); fl.rooms.push(room(x0, yy + len - mr, w, mr, 'Sảnh + sinh hoạt', 'sh')); return; }
    }
    let pnD = Math.min(K.pn_sau_toi_da_m, len - sD - mr), rest = len - sD - pnD;
    if (rest > mr + EPS && rest - mr < K.gop_phan_du_duoi_m) { pnD += rest - mr; rest = mr; }
    else if (!mr && rest > EPS && rest < K.gop_phan_du_duoi_m) { pnD += rest; rest = 0; }
    const wcW = Math.min(K.wc_rong_m, w - 0.9);
    const strip = ys => {
      if (ctx.wcRight) { fl.rooms.push(room(x0 + w - wcW, ys, wcW, sD, 'WC', 'wc', { doorTo: 'corr' })); fl.rooms.push(room(x0, ys, w - wcW, sD, 'Lối vào + tủ', 'corr')); }
      else { fl.rooms.push(room(x0, ys, wcW, sD, 'WC', 'wc', { doorTo: 'corr' })); fl.rooms.push(room(x0 + wcW, ys, w - wcW, sD, 'Lối vào + tủ', 'corr')); }
    };
    const restRooms = ys => {
      if (rest <= EPS) return;
      if (!ctx.firstFront && !mr && rest >= pnMin && w - CORR >= 2.4) { fl.rooms.push(room(x0, ys, w - CORR, rest, `PN ${++ctx.pn}`, 'pn', { sub: 'WC chung' })); fl.rooms.push(room(x0 + w - CORR, ys, CORR, rest, 'Hành lang', 'corr')); }
      else fl.rooms.push(room(x0, ys, w, rest, ctx.firstFront ? 'Sinh hoạt chung' : (mr && rest < 2.0 ? 'Sảnh + sinh hoạt' : 'Sinh hoạt'), 'sh'));
    };
    const pnRoom = ys => fl.rooms.push(room(x0, ys, w, pnD, `PN ${++ctx.pn}`, 'pn', { sub: 'khép kín' }));
    if (pos === 'front') { pnRoom(yy); strip(yy + pnD); restRooms(yy + pnD + sD); }
    else { restRooms(yy); strip(yy + rest); pnRoom(yy + rest + sD); }
  }

  /* ---------- Cửa đi: loại và hình học thể hiện (S-CUA-02) ---------- */
  function doorKind(cfg, w) { const K = cfg.loaiCua; return w <= K.mot_canh_toi_da_m + 1e-6 ? '1' : w <= K.hai_canh_toi_da_m + 1e-6 ? '2' : '4'; }
  function doorGeom(d) {
    // trả về hình học trong hệ toạ độ mặt bằng (y hướng xuống): khe tường, cánh (line), cung (arc), nét đứt
    const t = 0.075, G = { gap: null, lines: [], arcs: [], dashes: [] };
    const H = d.o === 'h';
    G.gap = H ? { x: d.a, y: d.at - t, w: d.w, h: 2 * t } : { x: d.at - t, y: d.a, w: 2 * t, h: d.w };
    // phía cánh mở: vào phòng (into) hoặc ra ngoài (out)
    let sgn = 1;
    if (d.into) sgn = H ? (d.into.y >= d.at - 1e-3 ? 1 : -1) : (d.into.x >= d.at - 1e-3 ? 1 : -1);
    if (d.out) sgn = -sgn;
    if (d.kind === 'cuon') { G.dashes.push(H ? [d.a, d.at + sgn * 0.12, d.a + d.w, d.at + sgn * 0.12] : [d.at + sgn * 0.12, d.a, d.at + sgn * 0.12, d.a + d.w]); return G; }
    const leaf = (h, dir, L) => {
      if (H) {
        const tip = [h, d.at + sgn * L], end = [h + dir * L, d.at];
        G.lines.push([h, d.at, tip[0], tip[1]]);
        G.arcs.push({ cx: h, cy: d.at, r: L, x0: tip[0], y0: tip[1], x1: end[0], y1: end[1], sweep: (-sgn * dir > 0) ? 1 : 0 });
      } else {
        const tip = [d.at + sgn * L, h], end = [d.at, h + dir * L];
        G.lines.push([d.at, h, tip[0], tip[1]]);
        G.arcs.push({ cx: d.at, cy: h, r: L, x0: tip[0], y0: tip[1], x1: end[0], y1: end[1], sweep: (sgn * dir > 0) ? 1 : 0 });
      }
    };
    const a = d.a, w = d.w;
    if (d.kind === '4') { const q = w / 4; leaf(a, 1, q); leaf(a + q, 1, q); leaf(a + w, -1, q); leaf(a + w - q, -1, q); }
    else if (d.kind === '2') { leaf(a, 1, w / 2); leaf(a + w, -1, w / 2); }
    else if (d.flip) leaf(a + w, -1, w);
    else leaf(a, 1, w);
    return G;
  }

  function obRooms(cfg, x, y, w, len, deep) {
    const P = cfg.phong.pn_ong_ba;
    if (deep) { const wd = P.sau_wc_khi_hep_m; return [room(x, y, w, len - wd, 'PN ông bà', 'ongba', { sub: 'cửa 900' }), room(x, y + len - wd, w, wd, 'WC ông bà', 'wc_ongba', { doorTo: 'ongba' })]; }
    const wcW = P.rong_wc_rieng_m;
    return [room(x, y, w - wcW, len, 'PN ông bà', 'ongba', { sub: 'cửa 900' }), room(x + w - wcW, y, wcW, len, 'WC', 'wc_ongba', { doorTo: 'ongba' })];
  }
  function mkFloor(name, idx, ground) { return { name, idx, ground, rooms: [], stairs: [], cars: [], altars: [], doors: [], windows: [], bal: null }; }
  function carsIn(cfg, x, y, w, h, n) {
    const cw = cfg.doxe.o_to_thong_thuy_m.rong, cl = cfg.doxe.o_to_thong_thuy_m.dai, out = [];
    if (n > 1 && w >= 2 * cw + 0.4) { const gx = (w - 2 * cw) / 3; out.push({ x: x + gx, y: y + (h - cl) / 2, w: cw, h: cl }, { x: x + 2 * gx + cw, y: y + (h - cl) / 2, w: cw, h: cl }); }
    else out.push({ x: x + (w - cw) / 2, y: y + (h - cl) / 2, w: cw, h: cl });
    return out;
  }
  function altarAt(cfg, cx, yBack) { const w = cfg.bantho.rong / 100, d = cfg.bantho.sau / 100; return { x: cx - w / 2, y: yBack - d - 0.05, w, h: d, lb: `${cfg.bantho.rong}×${cfg.bantho.sau}` }; }

  /* ---------- Tum ---------- */
  function addTum(g, P) {
    const { inp, cfg } = g;
    if (!inp.tum || inp.tang < 2) return;
    const last = P.floors[P.floors.length - 1];
    const st = last.stairs[0];
    if (!st) return;
    // tum = lồng thang + sảnh đầu thang (S-THANG-03)
    const sn = last.rooms.find(r => r.key === 'sanh' && shared(r, st));
    const x0 = Math.min(st.x, sn ? sn.x : st.x), y0t = Math.min(st.y, sn ? sn.y : st.y);
    const x1 = Math.max(st.x + st.w, sn ? sn.x + sn.w : 0), y1t = Math.max(st.y + st.h, sn ? sn.y + sn.h : 0);
    const T = { x: x0, y: y0t, w: x1 - x0, h: y1t - y0t };
    if (T.w * T.h > cfg.tum.tyLe * g.fp + EPS) { P.tumRejected = T.w * T.h; return; }
    const fl = mkFloor('Mái · tum', inp.tang, false);
    fl.isTum = true;
    fl.stairs.push({ x: st.x, y: st.y, w: st.w, h: st.h, dir: 'XUỐNG', kind: st.kind });
    if (sn) fl.rooms.push(room(sn.x, sn.y, sn.w, sn.h, 'Sảnh ra mái', 'sanh'));
    // phần trong tum không phải thang / sảnh → kỹ thuật
    const snBeside = sn && sn.y < st.y + st.h - EPS && sn.y + sn.h > st.y + EPS; // sảnh nằm cạnh thang (thang ngang)
    if (!snBeside) {
      if (st.x + st.w < T.x + T.w - 0.05) fl.rooms.push(room(st.x + st.w, st.y, T.x + T.w - st.x - st.w, st.h, 'Kỹ thuật', 'kho'));
      if (st.x > T.x + 0.05) fl.rooms.push(room(T.x, st.y, st.x - T.x, st.h, 'Kỹ thuật', 'kho'));
    }
    fl.tum = T;
    const y0 = g.f, yE = g.f + g.Db, B = g.B;
    if (T.y - y0 > 0.05) fl.rooms.push(room(0, y0, B, T.y - y0, 'Mái / sân thượng', 'san'));
    if (yE - (T.y + T.h) > 0.05) fl.rooms.push(room(0, T.y + T.h, B, yE - T.y - T.h, 'Mái / sân thượng', 'san'));
    if (T.x > 0.05) fl.rooms.push(room(0, T.y, T.x, T.h, 'Mái', 'san'));
    if (B - T.x - T.w > 0.05) fl.rooms.push(room(T.x + T.w, T.y, B - T.x - T.w, T.h, 'Mái', 'san'));
    P.floors.push(fl);
    P.tumArea = T.w * T.h;
  }

  /* ---------- Luật bố cục KTS Trần Long chốt 03/10/2026 (chạy sau bố cục, trước cửa/cửa sổ) ---------- */
  function rulesALN(g, P) {
    const B = g.B, log = [], near = (a, b) => Math.abs(a - b) < 1e-3;
    const fullRow = (fl, r) => { const row = fl.rooms.filter(q => near(q.y, r.y) && near(q.h, r.h)); const x0 = Math.min(...row.map(q => q.x)), x1 = Math.max(...row.map(q => q.x + q.w)); return near(x0, 0) && near(x1, B) && Math.abs(row.reduce((s, q) => s + q.w, 0) - B) < 1e-2 ? row : null; };
    const fullW = (fl, y, pick, ex) => fl.rooms.filter(q => q.t !== 'void' && !(ex || []).includes(q) && near(q.x, 0) && near(q.w, B) && (near(q.y + q.h, y) || near(q.y, y))).sort(pick)[0];
    const absorb = (fl, row, into) => { // gộp cả dải row vào phòng into (cùng bề ngang B, kề trước hoặc sau)
      const y0 = Math.min(into.y, row[0].y), y1 = Math.max(into.y + into.h, row[0].y + row[0].h);
      into.y = y0; into.h = y1 - y0; fl.rooms = fl.rooms.filter(q => !row.includes(q));
    };
    const rank = keys => (a, b) => (keys.indexOf(a.key) < 0 ? 99 : keys.indexOf(a.key)) - (keys.indexOf(b.key) < 0 ? 99 : keys.indexOf(b.key));
    // 1. Tầng trệt không bố trí giếng trời
    const gf = P.floors[0]; let nLW = 0;
    for (const v of gf.rooms.filter(r => r.t === 'void')) {
      if (!gf.rooms.includes(v)) continue;
      const row = fullRow(gf, v), host = row && (fullW(gf, v.y + v.h, rank(['bep', 'khach', 'sh', 'ongba']), row) || fullW(gf, v.y, rank(['bep', 'khach', 'sh', 'ongba']), row));
      if (row && host && !row.includes(host)) { absorb(gf, row, host); nLW++; }
      else {
        // dải phòng phía trước (hoặc phía sau) phủ kín bề ngang ô giếng → kéo dài từng phòng phủ lên ô giếng
        const cover = ys => { const row = gf.rooms.filter(q => q !== v && q.t !== 'void' && ys(q) && q.x >= v.x - 1e-3 && q.x + q.w <= v.x + v.w + 1e-3); return Math.abs(row.reduce((s, q) => s + q.w, 0) - v.w) < 1e-2 ? row : null; };
        const fr = cover(q => near(q.y + q.h, v.y)), bk = !fr && cover(q => near(q.y, v.y + v.h));
        if (fr) { for (const q of fr) q.h += v.h; gf.rooms.splice(gf.rooms.indexOf(v), 1); }
        else if (bk) { for (const q of bk) { q.y -= v.h; q.h += v.h; } gf.rooms.splice(gf.rooms.indexOf(v), 1); }
        else Object.assign(v, { t: 'room', key: 'kho', loai: 'phu', lb: 'Kho sau' });
        nLW++;
      }
    }
    if (nLW) log.push({ st: 'dat', ma: 'ALN-BC-01', t: 'Tầng trệt không bố trí giếng trời', d: `Đã bỏ ${nLW} ô giếng trời ở trệt, gộp diện tích vào phòng kề. Giếng trời bắt đầu từ lầu 1.` });
    // 3. Cả nhà chỉ 1 không gian sinh hoạt (ngoài phòng khách) — chạy trước luật WC để đếm đúng phòng ngủ, chạy lại sau đó
    let nSanh = 0, nSh = 0;
    const shPass = allowPN => {
      for (const f of P.floors) for (const r of f.rooms) if (r.key === 'sh' && Math.min(r.w, r.h) < 2.4) { Object.assign(r, { key: 'sanh', t: 'corr', loai: 'gt', lb: 'Sảnh tầng' }); nSanh++; }
      const shs = P.floors.flatMap(f => f.rooms.filter(r => r.key === 'sh').map(r => ({ f, r })));
      if (shs.length < 2) return;
      const keep = shs.slice().sort((a, b) => b.r.w * b.r.h - a.r.w * a.r.h)[0];
      for (const o of shs) {
        if (o === keep) continue;
        if (allowPN && Math.min(o.r.w, o.r.h) >= g.cfg.phong.phong_ngu.canh_ngan_toi_thieu_m) Object.assign(o.r, { key: 'pn', t: 'room', loai: 'o', lb: 'PN', sub: 'WC chung' });
        else Object.assign(o.r, { key: 'sanh', t: 'corr', loai: 'gt', lb: 'Sảnh tầng' });
        nSh++;
      }
    };
    shPass(true);
    // 2. Phòng ngủ ≥ 3: master có WC riêng, các phòng còn lại dùng 1 WC chung mỗi tầng
    const pns = P.floors.flatMap(f => f.rooms.filter(r => r.key === 'pn').map(r => ({ f, r })));
    if (pns.length >= 3) {
      // dải phòng khép kín: hàng full bề ngang gồm WC + lối vào/tủ (không có phòng ở)
      const strips = f => { const seen = new Set(), out = []; for (const w of f.rooms.filter(q => q.key === 'wc')) { const row = fullRow(f, w); if (!row || seen.has(row[0].y)) continue; if (row.every(q => ['wc', 'corr', 'kho', 'sanh'].includes(q.key))) { seen.add(row[0].y); const owner = f.rooms.find(q => q.key === 'pn' && near(q.x, 0) && near(q.w, B) && (near(q.y + q.h, w.y) || near(q.y, w.y + w.h))); out.push({ row, owner }); } } return out; };
      const privOf = (f, pn) => [].concat(...strips(f).filter(s => s.owner === pn).map(s => s.row.filter(q => q.key === 'wc')), f.rooms.filter(w => w.key === 'wc' && (w.doorTo === 'pn' || w.priv) && shared(w, pn)));
      const bySize = (a, b) => b.r.w * b.r.h - a.r.w * a.r.h;
      // master hợp lệ: có WC riêng, và nếu tầng đó còn phòng ngủ khác thì tầng đó phải còn một WC chung
      const okMaster = o => { const pv = privOf(o.f, o.r); if (!pv.length) return false; const others = o.f.rooms.some(q => q.key === 'pn' && q !== o.r); return !others || o.f.rooms.some(q => q.key === 'wc' && !pv.includes(q)); };
      const hasStrip = o => strips(o.f).some(s => s.owner === o.r);
      // 95 mẫu tham khảo: master đặt phía trước, ra ban công → ưu tiên phòng ở nửa trước nhà
      const isFront = o => o.r.y - g.f < g.Db * 0.4;
      const master = pns.filter(okMaster).sort((a, b) => isFront(b) - isFront(a) || hasStrip(b) - hasStrip(a) || bySize(a, b))[0] || null;
      if (!master) {
        for (const f of P.floors) for (const w of f.rooms.filter(q => q.key === 'wc' && (q.doorTo === 'pn' || q.priv))) { delete w.doorTo; delete w.priv; }
        for (const o of pns) { if (o.r.sub === 'khép kín') o.r.sub = 'WC chung'; o.r.lb = o.r.lb.replace(/ \(master\)/, ''); }
        log.push({ st: 'cb', ma: 'ALN-BC-02', t: 'Nhà ≥ 3 phòng ngủ: chưa có chỗ cho WC riêng của master', d: `${pns.length} phòng ngủ nhưng phương án này không có tầng nào vừa WC riêng cho master vừa còn WC chung cho phòng cùng tầng. Tạm để mọi phòng dùng WC chung — KTS bố trí WC master bằng công cụ chỉnh tay.` });
      } else {
      let nConv = 0;
      for (const f of P.floors) {
        for (const s of strips(f)) {
          if (!s.owner || s.owner === master.r) continue;
          const inStrip = new Set(s.row);
          const otherWC = f.rooms.some(q => q.key === 'wc' && !inStrip.has(q));
          if (!otherWC) continue; // tầng này không còn WC nào khác → giữ làm WC chung
          const y0 = s.row[0].y, y1 = y0 + s.row[0].h;
          const host = f.rooms.filter(q => !inStrip.has(q) && q !== s.owner && near(q.x, 0) && near(q.w, B) && (near(q.y + q.h, y0) || near(q.y, y1)) && ['sh', 'sanh', 'corr'].includes(q.key))[0];
          if (host) { absorb(f, s.row, host); if (host.h >= 2.4) Object.assign(host, { key: 'sh', t: 'room', loai: 'o', lb: 'Sinh hoạt' }); }
          else { absorb(f, s.row, s.owner); }
          if (s.owner.sub === 'khép kín') s.owner.sub = 'WC chung';
          nConv++;
        }
        for (const w of f.rooms.filter(q => q.key === 'wc' && (q.doorTo === 'pn' || q.priv))) { if (!shared(w, master.r) || f !== master.f) { delete w.doorTo; delete w.priv; nConv++; } }
      }
      // an toàn: tầng nào còn phòng ngủ khác mà mọi WC đều là WC riêng của master → trả WC lõi về WC chung
      for (const f of P.floors) {
        const others = f.rooms.some(q => q.key === 'pn' && q !== master.r);
        const pv = f === master.f ? privOf(f, master.r) : [];
        if (others && f === master.f && !f.rooms.some(q => q.key === 'wc' && !pv.includes(q))) for (const w of pv) { delete w.doorTo; delete w.priv; }
      }
      for (const o of pns) if (o !== master) { if (o.r.sub === 'khép kín') o.r.sub = 'WC chung'; o.r.lb = o.r.lb.replace(/ \(master\)/, ''); }
      if (!/master/i.test(master.r.lb)) master.r.lb += ' (master)';
      master.r.sub = 'khép kín';
      log.push({ st: 'dat', ma: 'ALN-BC-02', t: 'Nhà ≥ 3 phòng ngủ: master có WC riêng, phòng còn lại dùng WC chung', d: `${pns.length} phòng ngủ. Giữ WC riêng cho phòng master; ${nConv ? `${nConv} WC riêng của phòng khác đã bỏ (gộp vào sinh hoạt/sảnh) hoặc chuyển thành WC chung` : 'các phòng còn lại đã dùng WC chung'}.` });
      }
    }
    shPass(false);
    if (nSanh || nSh) log.push({ st: 'dat', ma: 'ALN-BC-03', t: 'Cả nhà chỉ một không gian sinh hoạt', d: `${nSanh ? `${nSanh} dải "sinh hoạt" hẹp dưới 2,4 m đổi thành sảnh tầng. ` : ''}${nSh ? `${nSh} không gian sinh hoạt thừa đổi thành phòng ngủ hoặc sảnh. ` : ''}Giữ phòng khách + tối đa một phòng sinh hoạt.` });
    // 4. Kho, giặt không lặp ở mọi tầng: giữ 1 kho ở trệt, 1 giặt ở tầng trên cùng (cạnh sân phơi)
    const isStore = r => r.key === 'kho' && r.lb === 'Kho' && !r.doorTo;
    let nKho = 0, giat = P.floors.flatMap(f => f.rooms.filter(r => r.key === 'giat').map(r => ({ f, r })));
    const upper = P.floors.slice(1), top = upper[upper.length - 1];
    for (const f of upper) for (const k of f.rooms.filter(isStore)) {
      if (f === top && !giat.length) { Object.assign(k, { key: 'giat', t: 'wet', loai: 'phu', lb: 'Giặt' }); giat.push({ f, r: k }); nKho++; continue; }
      const wc = f.rooms.find(w => w.t === 'wet' && near(w.x, k.x) && near(w.w, k.w) && (near(w.y + w.h, k.y) || near(k.y + k.h, w.y)));
      if (wc) { const y0 = Math.min(wc.y, k.y), y1 = Math.max(wc.y + wc.h, k.y + k.h); wc.y = y0; wc.h = y1 - y0; f.rooms.splice(f.rooms.indexOf(k), 1); }
      else Object.assign(k, { lb: 'Hộp KT' });
      nKho++;
    }
    if (giat.length > 1) { giat.sort((a, b) => b.f.idx - a.f.idx); for (const o of giat.slice(1)) { Object.assign(o.r, o.f.ground ? { key: 'kho', t: 'room', loai: 'phu', lb: 'Kho' } : { key: 'kho', t: 'room', loai: 'phu', lb: 'Hộp KT' }); nKho++; } }
    if (nKho) log.push({ st: 'dat', ma: 'ALN-BC-04', t: 'Kho và giặt không lặp ở mọi tầng', d: `Giữ kho ở tầng trệt và một chỗ giặt ở tầng trên cùng cạnh sân phơi; ${nKho} kho / giặt ở các tầng khác đã gộp vào WC bên cạnh hoặc đổi công năng.` });
    // 6. Phương án WC tầng trệt dưới gầm thang (vế hai, chỗ đủ cao), chỗ WC cũ thành lối đi rộng
    if (g.inp.wcGam) {
      const st = gf.stairs[0], T = g.cfg.thang;
      const okKind = st && !st.kind;
      const side = okKind && gf.rooms.find(r => r.key === 'wc' && near(r.x, st.x + st.w) && r.y >= st.y - 1e-3 && r.y + r.h <= st.y + st.h + 1e-3);
      const dmin = (2.35 - g.cfg.FH / 2) / (T.coBac / T.matBac); // cao thông thuỷ dưới bản thang ≥ 2,2 m (+0,15 bản)
      const w = st ? st.w - T.rong : 0, h = T.run - dmin;
      if (okKind && side && w >= 0.9 && h >= 1.2) {
        Object.assign(side, { key: 'corr', t: 'corr', loai: 'gt', lb: '' });
        gf.rooms.push(Object.assign(room(st.x + T.rong, st.y, w, h, 'WC gầm thang', 'wc'), { underStair: true, sub: `cao ≥ 2,2 m` }));
        log.push({ st: 'dat', ma: 'ALN-BC-06', t: 'WC tầng trệt dưới gầm thang', d: `WC ${fmt(w)} × ${fmt(h)} m đặt dưới vế thứ hai, đoạn bản thang cao từ 2,2 m trở lên. Chỗ WC cũ cạnh thang nhập vào lối đi cho hành lang trệt rộng, thấy phòng khách và tới thang dễ. WC hẹp: chỉ bố trí bồn cầu + lavabo.` });
      } else log.push({ st: 'cb', ma: 'ALN-BC-06', t: 'WC tầng trệt dưới gầm thang — không áp được', d: okKind ? 'Gầm thang của phương án này không đủ chỗ cao ≥ 2,2 m cho WC (cần ≥ 0,9 × 1,2 m) hoặc không có WC cạnh thang để dời.' : 'Phương án này dùng thang ngang / xoắn, chưa có mẫu WC gầm thang.' });
    }
    // đánh số lại phòng ngủ theo tầng
    let n = 0; for (const f of P.floors) for (const r of f.rooms) if (r.key === 'pn') { const m = /\(master\)/.test(r.lb); r.lb = `PN ${++n}${m ? ' (master)' : ''}`; }
    log.push({ st: 'dat', ma: 'ALN-BC-05', t: 'Cửa đi sát tường, cánh nép tường · vế thang và sảnh lọt lòng ≥ 90 cm', d: `Cửa phòng đặt sát góc tường trái/phải (cách góc 10 cm), bản lề phía góc. Vế thang ${Math.round(g.cfg.thang.rong * 100)} cm tính từ mép khối = lọt lòng 90 cm sau khi trừ tường biên 10 cm; lối đi ${Math.round(g.cfg.loidi * 100)} cm = lọt lòng 90 cm sau khi trừ tường biên 10 cm và nửa tường trong 5 cm. Bản phương án không vẽ cột.` });
    return log;
  }

  /* ---------- Hậu xử lý: id, cửa đi, cửa sổ, cột, kiểm tra ---------- */
  function shared(a, b) {
    // cạnh chung giữa hai hình chữ nhật: trả về {o:'h'|'v', at, a0, a1}
    const ov = (p0, p1, q0, q1) => [Math.max(p0, q0), Math.min(p1, q1)];
    if (Math.abs(a.y + a.h - b.y) < 1e-3 || Math.abs(b.y + b.h - a.y) < 1e-3) {
      const [s0, s1] = ov(a.x, a.x + a.w, b.x, b.x + b.w); if (s1 - s0 > 0.05) return { o: 'h', at: Math.abs(a.y + a.h - b.y) < 1e-3 ? a.y + a.h : a.y, a0: s0, a1: s1 };
    }
    if (Math.abs(a.x + a.w - b.x) < 1e-3 || Math.abs(b.x + b.w - a.x) < 1e-3) {
      const [s0, s1] = ov(a.y, a.y + a.h, b.y, b.y + b.h); if (s1 - s0 > 0.05) return { o: 'v', at: Math.abs(a.x + a.w - b.x) < 1e-3 ? a.x + a.w : a.x, a0: s0, a1: s1 };
    }
    return null;
  }
  const OPEN_PLAN = ['khach', 'bep', 'sh', 'kd', 'gara', 'san_xe'];
  function doorW(cfg, r) { const C = cfg.cua; if (r.key === 'ongba') return C.pn_ong_ba_m; if (['wc', 'wc_ongba', 'kho', 'giat'].includes(r.key)) return C.wc_kho_m; return C.phong_o_m; }
  const PASS_RANK = r => r.isStair && r.kind === 'xoan' ? 3 : r.isStair ? 0.5 : r.t === 'corr' ? 0 : ['khach', 'sh', 'bep', 'kd', 'gara', 'san_xe', 'san', 'phoi', 'tho'].includes(r.key) ? 1 : ['pn', 'ongba'].includes(r.key) ? 9 : 5;

  function post(g, P) {
    const { cfg, inp } = g;
    const fy0 = g.f, fy1 = g.f + g.Db, B = g.B;
    const sideOpenL = inp.thoang >= 2, sideOpenR = inp.thoang >= 3;
    const issues = [];
    let idn = 0;
    for (const fl of P.floors) {
      fl.rooms.forEach(r => r.id = 'r' + (idn++));
      const stairsAsRooms = fl.stairs.map(s => ({ x: s.x, y: s.y, w: s.w, h: s.h, isStair: true, kind: s.kind, t: 'corr', key: 'stair', lb: 'Thang' }));
      const all = fl.rooms.concat(stairsAsRooms);
      // --- cửa đi
      for (const r of fl.rooms) {
        if (r.t === 'void' || r.t === 'corr' || r.t === 'shaft') continue;
        if (fl.isTum) continue;
        if (r.entrance) {
          const kdW = Math.max(2.4, B * cfg.loaiCua.cua_chinh_kinh_doanh_ty_le_be_ngang);
          const want = r.key === 'gara' ? Math.max(cfg.cua.cua_gara_toi_thieu_m, Math.min(B - 0.4, inp.oto > 1 ? 5.2 : 3.0)) : r.key === 'kd' ? Math.min(B - 0.4, kdW) : Math.min(B - 0.4, Math.max(cfg.cua.cua_chinh_toi_thieu_m, 1.6));
          const w = Math.min(want, B - 0.3);
          // cửa cuốn cho gara và kinh doanh sát đường; có sân trước thì kinh doanh dùng cửa mở quay
          const kind = r.key === 'gara' || (r.key === 'kd' && !P.yard) ? 'cuon' : doorKind(cfg, w);
          // có sân trước (trong lô) thì cửa chính mở ra sân như bản vẽ A Hoàng; sát vỉa hè thì mở vào trong
          fl.doors.push({ o: 'h', at: fy0, a: (B - w) / 2, w, main: true, kind, room: r.id, into: r, out: !!P.yard });
          continue;
        }
        let cands = [];
        for (const n of all) {
          if (n === r || n.t === 'void') continue;
          const sh = shared(r, n); if (!sh) continue;
          let rank = PASS_RANK(n);
          if (r.doorTo) rank = n.key === r.doorTo ? -1 : 50;
          if (r.t === 'open') rank = Math.min(rank, 2); // ban công/sân được đi qua phòng
          cands.push({ n, sh, rank, len: sh.a1 - sh.a0 });
        }
        cands.sort((a, b) => a.rank - b.rank || b.len - a.len);
        const c = cands[0];
        if (!c || c.rank >= 50) { r.noDoor = true; issues.push({ kind: 'nodoor', fl: fl.name, r }); continue; }
        if (c.rank === 9 && r.t !== 'open') issues.push({ kind: 'via_pn', fl: fl.name, r, via: c.n });
        r.doorVia = c.n.key;
        if (OPEN_PLAN.includes(r.key) || r.t === 'open' && c.n.t !== 'corr') continue; // không gian mở: thông, không vẽ cánh cửa
        const w = Math.min(doorW(cfg, r), c.len - 0.1);
        // đặt cửa sát đầu đoạn chung phía lối đi (đầu gần ranh phải với nhà hẹp)
        // quy ước 03/10: cửa sát tường trái/phải (cách góc 10 cm), bản lề phía góc để cánh nép tường
        const lo = c.sh.o === 'h' ? r.x : r.y, hi = c.sh.o === 'h' ? r.x + r.w : r.y + r.h;
        const atLo = Math.abs(c.sh.a0 - lo) < 1e-3 && !(Math.abs(c.sh.a1 - hi) < 1e-3 && c.sh.a1 - c.sh.a0 < 0);
        const useHi = Math.abs(c.sh.a1 - hi) < 1e-3 || !atLo;
        const a = useHi ? c.sh.a1 - w - 0.1 : c.sh.a0 + 0.1;
        fl.doors.push({ o: c.sh.o, at: c.sh.at, a: Math.max(c.sh.a0 + 0.02, Math.min(a, c.sh.a1 - w - 0.02)), w, kind: doorKind(cfg, w), room: r.id, into: r, flip: useHi });
      }
      // --- cửa ra ban công (mặt tiền các lầu): mở ra phía ban công
      if (fl.bal && !fl.ground && !fl.isTum) {
        for (const r of fl.rooms) {
          if (Math.abs(r.y - fy0) > 1e-3 || !(r.loai === 'o' || r.t === 'open') || r.w < 1.2) continue;
          const pub = ['khach', 'sh', 'kd', 'tho', 'san'].includes(r.key);
          const w = pub ? Math.min(r.w - 0.4, Math.max(2.4, r.w * 0.72)) : Math.min(r.w - 0.6, 1.4);
          const a = pub ? r.x + (r.w - w) / 2 : r.x + r.w - w - 0.3;
          fl.doors.push({ o: 'h', at: fy0, a, w, kind: doorKind(cfg, w), out: true, room: r.id, into: r, banCong: true });
        }
      }
      // --- cửa sổ / cạnh thoáng
      const voids = fl.rooms.filter(r => r.t === 'void' || r.t === 'open');
      for (const r of fl.rooms) {
        if (!(r.loai === 'o' || r.loai === 'phu')) continue;
        const segs = [];
        if (Math.abs(r.y - fy0) < 1e-3) segs.push({ o: 'h', at: fy0, a0: r.x, a1: r.x + r.w, src: 'mặt tiền' });
        if (Math.abs(r.y + r.h - fy1) < 1e-3 && g.rearOpen) segs.push({ o: 'h', at: fy1, a0: r.x, a1: r.x + r.w, src: 'mặt hậu' });
        if (r.x < 1e-3 && sideOpenL) segs.push({ o: 'v', at: 0, a0: r.y, a1: r.y + r.h, src: 'mặt bên' });
        if (Math.abs(r.x + r.w - B) < 1e-3 && sideOpenR) segs.push({ o: 'v', at: B, a0: r.y, a1: r.y + r.h, src: 'mặt bên' });
        for (const v of voids) { if (v === r) continue; const sh = shared(r, v); if (sh) segs.push(Object.assign(sh, { src: v.t === 'void' ? 'giếng trời' : 'sân' })); }
        const len = segs.reduce((s, q) => s + (q.a1 - q.a0), 0);
        const area = r.w * r.h;
        const open = len * cfg.cuaso.ty_le_mo_tren_chieu_dai_canh * cfg.cuaso.chieu_cao_cua_m;
        const need = area * (r.loai === 'o' ? cfg.thonggio.o : cfg.thonggio.phu);
        r.win = { len, open, need, ok: open + EPS >= need, segs };
        for (const q of segs) {
          // phần cạnh đã có cửa đi (cửa chính, cửa ban công) thì cửa sổ đặt vào đoạn trống còn lại
          const ds = fl.doors.filter(dd => dd.o === q.o && Math.abs(dd.at - q.at) < 1e-3 && dd.a < q.a1 && dd.a + dd.w > q.a0);
          let free = [[q.a0, q.a1]];
          for (const dd of ds) free = free.flatMap(([u, v]) => [[u, Math.min(v, dd.a - 0.1)], [Math.max(u, dd.a + dd.w + 0.1), v]]).filter(([u, v]) => v - u > 0.05);
          const best = free.sort((m, n) => (n[1] - n[0]) - (m[1] - m[0]))[0];
          if (!best) continue;
          const L = best[1] - best[0]; if (ds.length && L < 0.6) continue;
          const w = L * (ds.length ? 0.8 : cfg.cuaso.ty_le_mo_tren_chieu_dai_canh);
          fl.windows.push({ o: q.o, at: q.at, a: best[0] + (L - w) / 2, w, src: q.src });
        }
        if (r.loai === 'o' || r.key === 'bep' || r.key === 'bep_uot') {
          if (!r.win.ok) issues.push({ kind: 'dark', fl: fl.name, r });
          // khoảng cách tới nguồn thoáng xa nhất
          if (segs.length) {
            const corners = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]];
            const dist = (p, q) => q.o === 'h' ? Math.hypot(Math.max(q.a0 - p[0], 0, p[0] - q.a1), p[1] - q.at) : Math.hypot(Math.max(q.a0 - p[1], 0, p[1] - q.a1), p[0] - q.at);
            r.win.xa = Math.max(...corners.map(p => Math.min(...segs.map(q => dist(p, q)))));
            if (r.win.xa > cfg.thonggio.xaToiDa) issues.push({ kind: 'far', fl: fl.name, r });
          }
        }
      }
    }
    // --- cột
    P.columns = columns(g, P);
    // --- quan hệ kề
    const gf = P.floors[0];
    const ob = gf.rooms.find(r => r.key === 'ongba');
    if (ob) {
      const kitchenNear = gf.rooms.some(r => (r.key === 'bep_uot' || r.key === 'bep') && shared(ob, r));
      if (kitchenNear) issues.push({ kind: 'ob_bep', fl: gf.name, r: ob });
    }
    // WC trên phòng thờ
    for (let i = 1; i < P.floors.length; i++) {
      const below = P.floors[i - 1], cur = P.floors[i];
      for (const t of below.rooms.filter(r => r.key === 'tho')) for (const w of cur.rooms.filter(r => r.t === 'wet')) if (overlapArea(t, w) > 0.05) issues.push({ kind: 'wc_tren_tho', fl: cur.name, r: w });
    }
    // WC chồng trục
    let wcStack = 0, wcUp = 0;
    for (let i = 1; i < P.floors.length; i++) for (const w of P.floors[i].rooms.filter(r => r.key === 'wc')) { wcUp++; if (P.floors[i - 1].rooms.some(r => r.t === 'wet' && overlapArea(r, w) > 0.5)) wcStack++; }
    P.wcStack = { up: wcUp, ok: wcStack };
    P.issues = issues;
    P.selfCheck = selfCheck(g, P);
    P.stats = stats(g, P);
    return P;
  }
  function overlapArea(a, b) { const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); return w > 0 && h > 0 ? w * h : 0; }
  function columns(g, P) {
    const S = g.cfg.cot.nhip_toi_da_m, y0 = g.f, y1 = g.f + g.Db;
    const fillAxis = (cands, a, b) => {
      const c = [...new Set(cands.filter(v => v > a + 0.5 && v < b - 0.5).map(v => Math.round(v * 100) / 100))].sort((p, q) => p - q);
      const out = [a]; let cur = a;
      while (b - cur > S + EPS) {
        const ok = c.filter(v => v > cur + 1.5 && v <= cur + S + EPS);
        let nx = ok.length ? ok[ok.length - 1] : null;
        if (nx === null) { const n = Math.ceil((b - cur) / S); nx = cur + (b - cur) / n; }
        out.push(nx); cur = nx;
      }
      out.push(b); return out;
    };
    const ys = fillAxis(P.ys, y0, y1);
    const xs = fillAxis(P.xs, 0, g.B);
    const out = []; for (const x of xs) for (const y of ys) out.push({ x, y });
    return { xs, ys, pts: out, s: g.cfg.cot.cot_m };
  }
  function selfCheck(g, P) {
    const errs = [];
    const fx0 = 0, fx1 = g.B, fy0 = g.f, fy1 = g.f + g.Db, E = 1e-3;
    for (const fl of P.floors) {
      const items = fl.rooms.filter(r => !r.underStair).concat(fl.stairs.map(s => Object.assign({ lb: 'Thang' }, s)));
      let sum = 0;
      for (const r of items) {
        if (!(r.w > 0.05 && r.h > 0.05) || [r.x, r.y, r.w, r.h].some(v => !isFinite(v))) errs.push(`${fl.name}: "${r.lb}" kích thước hỏng`);
        if (r.x < fx0 - E || r.x + r.w > fx1 + E || r.y < fy0 - E || r.y + r.h > fy1 + E) errs.push(`${fl.name}: "${r.lb}" lọt ra ngoài khối xây`);
        sum += r.w * r.h;
      }
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const o = overlapArea(items[i], items[j]); if (o > 0.01) errs.push(`${fl.name}: "${items[i].lb}" chồng "${items[j].lb}" ${o.toFixed(2)} m²`); }
      const cov = sum / (g.B * g.Db);
      if (Math.abs(cov - 1) > 0.01) errs.push(`${fl.name}: phủ ${(cov * 100).toFixed(1)}% khối xây`);
      for (const r of fl.rooms) if (r.noDoor && !fl.isTum) errs.push(`${fl.name}: "${r.lb}" không có cửa vào`);
    }
    // S-THANG-03: đầu lên xuống của thang phải giáp sàn đi lại
    const WALK = ['sanh', 'corr', 'khach', 'sh', 'kd', 'gara', 'san_xe', 'san', 'bep', 'tho'];
    for (const fl of P.floors) for (const st of fl.stairs) {
      if (st.kind === 'xoan') continue;
      if (st.kind === 'doc') { // thang một vế dọc tường, rẻ quạt hai đầu (mẫu A Hoàng): lên/xuống từ cạnh dài giáp hành lang
        let ok2 = 0; const sx = st.side === 'L' ? st.x : st.x + st.w;
        for (const r of fl.rooms) if (WALK.includes(r.key) && (Math.abs(r.x - sx) < 1e-3 || Math.abs(r.x + r.w - sx) < 1e-3)) ok2 += Math.max(0, Math.min(r.y + r.h, st.y + st.h) - Math.max(r.y, st.y));
        if (ok2 < 1.0) errs.push(`${fl.name}: thang không giáp hành lang`);
        continue;
      }
      const e = st.kind === 'Ungang' ? { x: st.x - 0.01, y: st.y, w: 0.01, h: st.h } : { x: st.x, y: st.y - 0.01, w: st.w, h: 0.01 };
      let ok = 0;
      for (const r of fl.rooms) if (WALK.includes(r.key)) ok += Math.max(0, Math.min(r.x + r.w, e.x + e.w) - Math.max(r.x, e.x)) * (st.kind === 'Ungang' ? 0 : 1) + (st.kind === 'Ungang' ? Math.max(0, Math.min(r.y + r.h, e.y + e.h) - Math.max(r.y, e.y)) * (Math.abs(r.x + r.w - st.x) < 1e-3 ? 1 : 0) : 0) * 1;
      if (st.kind !== 'Ungang') { ok = 0; for (const r of fl.rooms) if (WALK.includes(r.key) && Math.abs(r.y + r.h - st.y) < 1e-3) ok += Math.max(0, Math.min(r.x + r.w, st.x + st.w) - Math.max(r.x, st.x)); }
      if (ok < st.w - 0.15 && st.kind !== 'Ungang') errs.push(`${fl.name}: đầu thang không có chỗ bước lên/xuống`);
      if (st.kind === 'Ungang' && ok < st.h - 0.15) errs.push(`${fl.name}: đầu thang ngang không có chỗ bước lên/xuống`);
      // sảnh phải nối tiếp ra chỗ khác ngoài thang
      for (const sn of fl.rooms.filter(r => r.key === 'sanh')) {
        if (fl.isTum) continue;
        const nb = fl.rooms.filter(r => r !== sn && shared(r, sn) && (WALK.includes(r.key) || r.key === 'pn' || r.key === 'tho' || r.key === 'ongba'));
        if (!nb.length) errs.push(`${fl.name}: sảnh thang cụt`);
      }
    }
    // lõi thang thẳng trục
    const s0 = P.floors[0].stairs[0];
    if (g.inp.tang > 1 && !s0) errs.push('Nhà nhiều tầng nhưng không có thang');
    if (s0) for (const fl of P.floors) { const s = fl.stairs[0]; if (!s || Math.abs(s.x - s0.x) > E || Math.abs(s.y - s0.y) > E) errs.push(`${fl.name}: thang lệch trục`); }
    return errs;
  }
  function stats(g, P) {
    let useful = 0, total = 0, lwArea = 0, oArea = 0, oOk = 0;
    for (const fl of P.floors) {
      if (fl.isTum) continue;
      for (const r of fl.rooms) {
        const a = r.w * r.h;
        if (r.t === 'void') { lwArea += a; continue; }
        total += a;
        if (r.t !== 'corr' && r.t !== 'open') useful += a;
        if (r.loai === 'o') { oArea += a; if (r.win && r.win.ok) oOk += a; }
      }
      for (const s of fl.stairs) total += s.w * s.h;
    }
    const lwPer = P.floors[0].rooms.filter(r => r.t === 'void').reduce((s, r) => s + r.w * r.h, 0);
    return { useful, total, ratio: total ? useful / total : 0, lightRatio: oArea ? oOk / oArea : 1, lwPer, san: g.fp * g.inp.tang - lwPer * Math.max(0, g.inp.tang - 1) };
  }

  /* ---------- Chấm điểm S-DIEM-01 ---------- */
  function score(g, P, rec) {
    const W = g.cfg.diem;
    const a = W.anh_sang_thong_gio.diem * P.stats.lightRatio;
    const b = W.dien_tich_dung_duoc.diem * Math.max(0, Math.min(1, (P.stats.ratio - 0.55) / 0.30));
    const c = rec === null ? W.dung_bien_the_adn.diem : (P.mode === rec ? W.dung_bien_the_adn.diem : 0); // không luật nào chỉ định → mọi phương án đủ điểm
    const blocked = g.obDropped && g.inp.ongba;
    const d = blocked ? 0 : Math.max(0, W.khong_phai_thu_gon.diem - 5 * P.steps);
    return { total: Math.round(a + b + c + d), parts: { anhSang: Math.round(a), dienTich: Math.round(b), bienThe: c, thuGon: d } };
  }

  /* ---------- Luật theo phương án ---------- */
  const HOT = ['Tây', 'Tây Nam', 'Tây Bắc'];
  function planRules(g, P) {
    const { inp, cfg } = g, T = cfg.thang, r = [];
    if (P.lwShort > 0) r.push({ st: P.lwShort + EPS >= cfg.gieng.canhAln ? 'dat' : 'cb', ma: 'K-GIENGTROI-01', t: 'Cạnh ngắn giếng trời', d: `Cạnh ngắn ${fmt(P.lwShort)} m — ALN ≥ ${fmt(cfg.gieng.canhAln)} m (pháp lý ≥ ${fmt(cfg.gieng.canhPL)} m). Thông tầng ${fmt(P.stats.lwPer, 1)} m² mỗi sàn.` });
    if (P.mode === 'xoan') r.push({ st: 'cb', ma: 'S-THANG-02', t: 'Thang xoắn — phương án cuối cùng', d: `Không phương án thang chữ U nào đặt vừa lô này. Thang xoắn đường kính ${fmt(cfg.xoan.d)} m: mặt bậc ở mép trong nhỏ hơn 0,25 m, không đạt S-CAUTHANG-01 theo nghĩa chặt${inp.ongba ? '; nhà có ông bà — KHÔNG nên dùng' : ''}. Cần KTS xác nhận.` });
    if (P.floors.some(f => f.stairs.length && f.stairs[0].kind !== 'xoan')) r.push(P.noSanh
      ? { st: 'dat', ma: 'S-THANG-03', t: 'Chỗ bước lên / xuống thang', d: 'Không làm sảnh riêng: tầng trệt dùng phòng khách, các lầu chừa phần sinh hoạt ≥ 1 m trước đầu thang.' }
      : { st: 'dat', ma: 'S-THANG-03', t: 'Sảnh đầu thang', d: `Sảnh ${fmt(cfg.sanh)} m trước đầu bậc, nối ra lối đi / hành lang ở mọi tầng.` });
    if (P.mode === 'ngang') r.push({ st: 'goi', ma: 'S-THANG-02', t: 'Thang chữ U xoay ngang', d: 'Lô nông: thang đặt ở dải sau, vế chạy theo bề ngang; WC hoặc hộp kỹ thuật cạnh thang.' });
    if (inp.tang > 1 && P.mode !== 'xoan') r.push({ st: 'dat', ma: 'S-CAUTHANG-01', t: P.mode === 'ngang' ? 'Cầu thang chữ U (xoay ngang)' : 'Cầu thang chữ U', d: `Vế ${fmt(T.rong)} m · mặt bậc ${fmt(T.matBac)} · cổ bậc ${fmt(T.coBac, 3)} (${T.soCo} bậc / tầng ${fmt(FH, 1)} m) · ${T.bacMoiVe} mặt bậc mỗi vế, dài ${fmt(T.run)} m + chiếu nghỉ ${fmt(T.chieuNghi)} m.` });
    const nb = 2 * T.coBac + T.matBac;
    if (inp.tang > 1 && P.mode !== 'xoan') r.push({ st: nb >= 0.6 - EPS && nb <= 0.64 + EPS ? 'dat' : 'cb', ma: 'S-CAUTHANG-02', t: 'Nhịp bước', d: `2 × ${fmt(T.coBac, 3)} + ${fmt(T.matBac)} = ${fmt(nb, 3)} m (khoảng 0,60–0,64).` });
    const B = g.B;
    if (inp.tang > 1 && ['loi_giua', 'loi_sau'].includes(P.mode) && B < T.W + cfg.loidi) r.push({ st: 'cb', ma: 'S-LOIDI-01', t: 'Lô quá hẹp cho thang + lối đi', d: `Thang U cần ${fmt(T.W)} m + lối đi ${fmt(cfg.loidi)} m = ${fmt(T.W + cfg.loidi)} m, khối xây chỉ ${fmt(B)} m. Lối đi bị hẹp — cân nhắc thang một vế.` });
    if (B <= 4.5 && inp.d > 12) r.push(inp.ongba ? { st: 'cb', ma: 'S-BT-01', t: 'Lệch tầng — không áp dụng', d: 'Lô hẹp sâu hợp với lệch tầng, nhưng nhà có ông bà nên bỏ biến thể này.' } : { st: 'goi', ma: 'S-BT-01', t: 'Có thể làm lệch tầng', d: `Mặt tiền ${fmt(B)} m ≤ 4,5 và sâu > 12 m: lệch nửa tầng quanh giếng trời giúp thông gió. Bản phác vẽ sàn phẳng.` });
    if (B >= 4 && B <= 5 && inp.kd) r.push({ st: 'goi', ma: 'S-BT-02', t: 'Kinh doanh → thang ra sau', d: 'Mặt tiền 4–5 m có kinh doanh: dồn thang về sau để mặt bằng bán hàng liền mạch (phương án B).' });
    if (B >= 6) r.push({ st: 'goi', ma: 'S-BT-03', t: 'Ba dải khô / đệm / ướt', d: `Dải khô ${fmt(P.dryW || B - T.W - Math.max(cfg.dai.dai_uot_toi_thieu_m, (B - T.W) * cfg.dai.ty_le_dai_uot))} m · đệm ${fmt(T.W)} m · ướt ${fmt(P.wetW || Math.max(cfg.dai.dai_uot_toi_thieu_m, (B - T.W) * cfg.dai.ty_le_dai_uot))} m (S-DAI-01) — phương án C.` });
    if (B >= 7 && inp.thoang >= 2) r.push({ st: 'goi', ma: 'S-BT-04', t: 'Lõi giữa', d: 'Mặt tiền ≥ 7 m, ≥ 2 mặt thoáng: phương án C đặt dải đệm (thang + giếng trời) ở giữa.' });
    if (g.area >= 250 && inp.thoang >= 2) r.push({ st: 'goi', ma: 'S-BT-05', t: 'Biệt thự chữ L', d: 'Diện tích ≥ 250 m², ≥ 2 mặt thoáng: nên xét khối chữ L ôm sân. Bản phác chưa vẽ dạng này.' });
    if (inp.ongba) r.push(P.obPlaced ? { st: 'dat', ma: 'C-ONGBA-01', t: 'Phòng ông bà tầng trệt', d: 'Tầng trệt, WC riêng mở cửa trong phòng, cửa thông thủy 900 mm.' } : { st: 'chan', ma: 'C-ONGBA-01', t: 'Không xếp được phòng ông bà tầng trệt', d: 'Chiều sâu còn lại không đủ cho phòng ông bà + WC ở tầng trệt. Đổi phương án hoặc giảm vùng trước.' });
    if (inp.oto > 0) {
      const D = cfg.doxe;
      if (g.carDropped) r.push({ st: 'cb', ma: 'S-DOXE-01', t: 'Không xếp được chỗ đậu ô tô', d: 'Chiều sâu không đủ cho gara 5,5 m cùng lõi thang — phương án này bỏ gara.' });
      else if (inp.kd) r.push({ st: 'cb', ma: 'S-DOXE-01', t: 'Kinh doanh chiếm chỗ ô tô', d: 'Tầng trệt dành cho kinh doanh, chưa xếp chỗ đậu ô tô.' });
      else if (B < D.cua_vao_o_to_rong_toi_thieu_m) r.push({ st: 'cb', ma: 'S-DOXE-01', t: 'Cửa ô tô không đủ', d: `Cửa vào ô tô cần ≥ ${fmt(D.cua_vao_o_to_rong_toi_thieu_m)} m, khối xây rộng ${fmt(B)} m.` });
      else if (inp.oto > 1 && B < 2 * D.o_to_thong_thuy_m.rong + 0.4) r.push({ st: 'cb', ma: 'S-DOXE-01', t: 'Không đủ ngang cho 2 ô tô', d: `2 xe song song cần ≥ ${fmt(2 * D.o_to_thong_thuy_m.rong + 0.4)} m, khối xây ${fmt(B)} m — chỉ vẽ 1 xe.` });
      else r.push({ st: 'dat', ma: 'S-DOXE-01', t: 'Chỗ đậu ô tô', d: `${inp.oto} ô ${fmt(D.o_to_thong_thuy_m.rong)} × ${fmt(D.o_to_thong_thuy_m.dai)} m, cửa vào ≥ ${fmt(D.cua_vao_o_to_rong_toi_thieu_m)} m.` });
    }
    const kitLW = P.floors[0].rooms.some(k => (k.key === 'bep' || k.key === 'bep_uot') && P.floors[0].rooms.some(v => v.t === 'void' && shared(k, v)));
    r.push({ st: kitLW ? 'cb' : 'goi', ma: 'C-BEP-01', t: 'Bếp khô / bếp ướt', d: kitLW ? 'Bếp giáp giếng trời: lấy sáng được, nhưng ống hút mùi phải đi ra tường ngoài hoặc lên mái — cấm xả vào giếng trời.' : 'Tách bếp khô và bếp ướt; hút mùi ≥ 1000 m³/h xả ra tường ngoài.' });
    // thông gió K-THONGGIO-01 / 02
    const dark = P.issues.filter(i => i.kind === 'dark');
    const darkO = dark.filter(i => i.r.loai === 'o');
    r.push(darkO.length ? { st: 'cb', ma: 'K-THONGGIO-01', t: `${darkO.length} phòng ở thiếu cửa lấy sáng`, d: darkO.map(i => `${i.fl} · ${i.r.lb}${i.r.win.len ? ` (mở ${fmt(i.r.win.open, 1)}/${fmt(i.r.win.need, 1)} m²)` : ' (không có cạnh thoáng)'}`).join('; ') + `. Ngưỡng 1/8 sàn, ước theo S-CUASO-01.${g.rearOpen ? '' : ' Mặt hậu sát ranh nên không tính cửa sổ phía sau.'}` }
      : { st: 'dat', ma: 'K-THONGGIO-01', t: 'Phòng ở đủ cửa lấy sáng', d: `Mọi phòng ở đạt ≥ 1/8 diện tích sàn (ước theo S-CUASO-01).${g.rearOpen ? '' : ' Mặt hậu sát ranh, không tính cửa sổ phía sau.'}` });
    const darkK = dark.filter(i => i.r.loai !== 'o');
    if (darkK.length) r.push({ st: 'cb', ma: 'K-THONGGIO-01', t: 'Bếp thiếu cửa thông gió', d: darkK.map(i => `${i.fl} · ${i.r.lb}`).join('; ') + '. Ngưỡng 1/10 cho phòng phụ.' });
    const far = P.issues.filter(i => i.kind === 'far');
    if (far.length) r.push({ st: 'goi', ma: 'K-THONGGIO-02', t: 'Điểm xa nguồn thoáng > 12 m', d: far.map(i => `${i.fl} · ${i.r.lb} (${fmt(i.r.win.xa, 1)} m)`).join('; ') });
    // quan hệ kề S-KE-01
    const ke = [];
    for (const i of P.issues) {
      if (i.kind === 'via_pn') ke.push(`${i.fl}: vào "${i.r.lb}" phải đi qua "${i.via.lb}"`);
      if (i.kind === 'ob_bep') ke.push('PN ông bà sát bếp');
      if (i.kind === 'wc_tren_tho') ke.push(`${i.fl}: WC nằm trên phòng thờ`);
      if (i.kind === 'nodoor') ke.push(`${i.fl}: "${i.r.lb}" không có lối vào`);
    }
    r.push(ke.length ? { st: 'cb', ma: 'S-KE-01', t: 'Quan hệ kề cần xem lại', d: ke.join('; ') + '.' } : { st: 'dat', ma: 'S-KE-01', t: 'Quan hệ kề', d: `Không phòng ngủ nào làm lối đi bắt buộc; không WC trên phòng thờ.${P.wcStack.up ? ` WC chồng trục ${P.wcStack.ok}/${P.wcStack.up}.` : ''}` });
    if (HOT.includes(inp.huong)) r.push(g.proj > 0
      ? { st: 'cb', ma: 'K-HUONG', t: `Mặt tiền hướng ${inp.huong} — nắng chiều`, d: `Che nắng bằng ô văng/ban công tối đa ${fmt(g.proj)} m (giới hạn bởi L-BANCONG-01). Thêm lam đứng hoặc cây.` }
      : { st: 'cb', ma: 'K-HUONG', t: `Mặt tiền hướng ${inp.huong}, không được vươn`, d: 'Giải pháp thay thế (đề xuất từ rà soát gen K, chờ duyệt): lô-gia lùi vào trong ranh, tường hai lớp có khe khí, gạch thông gió, cây xanh; đặt thang/WC/kho làm đệm nhiệt phía nắng.' });
    if (inp.tang >= 3) r.push({ st: 'goi', ma: 'C-BANTHO-01', t: 'Phòng thờ tầng trên cùng', d: `Bàn thờ ${cfg.bantho.rong} × ${cfg.bantho.sau} cm (cung tốt thước 38,8 cm) đặt phía sau phòng thờ, quay ra mặt tiền. Thước cho cửa chờ KTS chốt.` });
    if (inp.tum) {
      if (inp.tang < 2) r.push({ st: 'goi', ma: 'L-TUM-01', t: 'Nhà 1 tầng — không vẽ tum', d: 'Tum chỉ áp dụng khi có thang lên mái.' });
      else if (P.tumRejected) r.push({ st: 'cb', ma: 'L-TUM-01', t: 'Bỏ tum — vượt 30% sàn mái', d: `Lồng thang + lối ra mái ${fmt(P.tumRejected, 1)} m² = ${fmt(P.tumRejected / g.fp * 100, 1)}% sàn mái, vượt ${cfg.tum.tyLe * 100}%: nếu xây sẽ bị tính thành một tầng. Bản phác bỏ tum; lên mái bằng thang thăm.` });
      else { const ty = P.tumArea / g.fp; r.push({ st: ty <= cfg.tum.tyLe + EPS ? 'dat' : 'chan', ma: 'L-TUM-01', t: 'Tum không tính tầng', d: `Tum ${fmt(P.tumArea, 1)} m² = ${fmt(ty * 100, 1)}% sàn mái (≤ ${cfg.tum.tyLe * 100}%), cao ≤ ${cfg.tum.cao} m, chỉ chứa lồng thang — không đặt phòng ngủ hay WC.` }); }
    }
    r.push({ st: 'goi', ma: 'S-COT-01', t: 'Lưới cột sơ bộ', d: `${P.columns.xs.length} trục ngang × ${P.columns.ys.length} trục dọc, nhịp lớn nhất ${fmt(Math.max(...gaps(P.columns.ys), ...gaps(P.columns.xs)))} m (≤ ${fmt(cfg.cot.nhip_toi_da_m)} m). Kết cấu thật do kỹ sư tính.` });
    for (const n of P.notes) r.push({ st: 'cb', ma: 'S-THUTU-01', t: 'Thu gọn bố cục', d: n });
    return r;
  }
  const gaps = a => a.slice(1).map((v, i) => v - a[i]);

  /* ---------- Chạy trọn ---------- */
  const OPTS = { loi_giua: 'A · Lõi giữa', loi_sau: 'B · Thang ra sau', ba_dai: 'C · Ba dải', nong: 'D · Nhà nông', ngang: 'E · Thang ngang', xoan: 'G · Thang xoắn', gon: 'E · Một tầng gọn' };
  function recommend(g) { const B = g.B; if (g.inp.tang > 1 && !g.needLW && g.Db < 11 && B >= g.cfg.thang.W + g.cfg.loidi + g.cfg.phong.phong_ngu.canh_ngan_toi_thieu_m) return 'nong'; if (B >= 6) return 'ba_dai'; if (B >= 4 && B <= 5 && g.inp.kd) return 'loi_sau'; return null; }
  function run(inp, cfg) {
    const g0 = envelope(inp, cfg);
    if (g0.blocked) return { g: g0, blocked: true, options: {} };
    const keys = ['loi_giua', 'loi_sau'].concat(g0.B >= 6 ? ['ba_dai'] : []).concat(g0.B >= cfg.thang.W + cfg.loidi + cfg.phong.phong_ngu.canh_ngan_toi_thieu_m && !g0.needLW && inp.tang > 1 ? ['nong'] : []);
    if (inp.tang > 1 && !g0.needLW && g0.B >= cfg.thang.L + cfg.sanh && g0.Db < 11) keys.push('ngang');
    if (inp.tang === 1 && !g0.needLW) keys.push('gon');
    let rec = recommend(g0), recBy = rec ? 'luat' : 'diem';
    const options = {};
    const build = k => {
      const g = envelope(inp, cfg);
      const P = k === 'ba_dai' ? layoutWide(g) : k === 'nong' ? layoutShallow(g) : (k === 'ngang' || k === 'xoan' || k === 'gon') ? layoutCross(g, k) : layoutNarrow(g, k);
      if (!P) return { g, P: null };
      const L03 = rulesALN(g, P); addTum(g, P); post(g, P); P.rules = g.rules.concat(planRules(g, P)).concat(L03);
      return { g, P };
    };
    for (const k of keys) {
      let o = build(k);
      // A: nếu thiếu chỗ cho sảnh thang riêng → thử dùng phòng mở phía trước thang làm chỗ bước lên
      if (k === 'loi_giua') {
        const g2 = envelope(inp, cfg); const P2 = layoutNarrow(g2, 'loi_giua', { noSanh: true });
        if (P2) {
          const L03b = rulesALN(g2, P2); addTum(g2, P2); post(g2, P2); P2.rules = g2.rules.concat(planRules(g2, P2)).concat(L03b); P2.noSanh = true;
          const bad1 = !o.P || o.P.selfCheck.length;
          // chọn bản tốt hơn: sảnh riêng, hay dùng phòng khách / sinh hoạt phía trước làm chỗ bước lên thang
          // KTS: giữ phòng khách riêng — chỉ dùng bản gộp khách vào gara/kinh doanh khi bản sảnh riêng không dựng được
          if (!P2.selfCheck.length && bad1) o = { g: g2, P: P2 };
        }
      }
      // không đưa ra phương án hỏng hình học / không lên xuống được thang
      if (o.P && o.P.selfCheck.length) o = { g: o.g, P: null, broken: o.P.selfCheck };
      options[k] = o;
    }
    // không phương án nào dựng được → thử thang xoắn (phương án cuối cùng)
    if (inp.tang > 1 && !keys.some(k => options[k].P)) { const o = build('xoan'); if (o.P) { keys.push('xoan'); options.xoan = o; } }
    // không có luật S-BT nào chỉ định → chọn phương án điểm cao nhất (chấm trước, chưa tính điểm biến thể)
    const ok = keys.filter(k => options[k].P);
    if (!rec || !options[rec] || !options[rec].P) {
      if (rec && ok.length) recBy = 'diem_thay_the';
      let bestK = null, bestS = -1;
      for (const k of ok) { const sc = score(options[k].g, options[k].P, '__').total; if (sc > bestS) { bestS = sc; bestK = k; } }
      rec = bestK || rec;
    }
    for (const k of ok) { const { g, P } = options[k]; P.score = score(g, P, recBy === 'luat' ? rec : null); }
    return { g: g0, rec, recBy, options, keys };
  }

  /* ---------- Xuất DXF (R12, nét + chữ) ---------- */
  function toDXF(g, P) {
    const out = [];
    const L = (layer, x1, y1, x2, y2) => out.push('0', 'LINE', '8', layer, '10', x1.toFixed(3), '20', (-y1).toFixed(3), '30', '0', '11', x2.toFixed(3), '21', (-y2).toFixed(3), '31', '0');
    const Rr = (layer, x, y, w, h) => { L(layer, x, y, x + w, y); L(layer, x + w, y, x + w, y + h); L(layer, x + w, y + h, x, y + h); L(layer, x, y + h, x, y); };
    // chữ tiếng Việt: mã hoá \U+XXXX để AutoCAD đọc đúng trên file R12
    const enc = s => s.replace(/[^\x20-\x7e]/g, c => '\\U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
    const TX = (layer, x, y, h, s) => out.push('0', 'TEXT', '8', layer, '10', x.toFixed(3), '20', (-y).toFixed(3), '30', '0', '40', h.toFixed(3), '1', enc(s), '72', '1', '11', x.toFixed(3), '21', (-y).toFixed(3), '31', '0');
    const W = Math.max(g.w1, g.w2), gap = W + 4;
    const layers = ['RANH', 'CHIGIOI', 'TUONG', 'PHONG', 'GIENGTROI', 'THANG', 'CUA', 'CUASO', 'COT', 'BANCONG', 'CHU'];
    out.push('0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', String(layers.length));
    const col = { RANH: 8, CHIGIOI: 5, TUONG: 7, PHONG: 7, GIENGTROI: 4, THANG: 3, CUA: 1, CUASO: 4, COT: 7, BANCONG: 5, CHU: 7 };
    for (const n of layers) out.push('0', 'LAYER', '2', n, '70', '0', '62', String(col[n]), '6', 'CONTINUOUS');
    out.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
    P.floors.forEach((fl, i) => {
      const ox = i * gap;
      const LL = (ly, x1, y1, x2, y2) => L(ly, x1 + ox, y1, x2 + ox, y2);
      LL('RANH', 0, 0, g.w1, 0); LL('RANH', g.w1, 0, g.w2, g.d); LL('RANH', g.w2, g.d, 0, g.d); LL('RANH', 0, g.d, 0, 0);
      if (g.f > 0) LL('CHIGIOI', -0.5, g.f, W + 0.5, g.f);
      Rr('TUONG', ox, g.f, g.B, g.Db);
      for (const r of fl.rooms) { Rr(r.t === 'void' ? 'GIENGTROI' : 'PHONG', r.x + ox, r.y, r.w, r.h); if (r.lb) TX('CHU', r.x + r.w / 2 + ox, r.y + r.h / 2, 0.25, r.lb + (r.t === 'room' || r.t === 'wet' ? ` ${(r.w * r.h).toFixed(1)}m2` : '')); }
      for (const s of fl.stairs) {
        Rr('THANG', s.x + ox, s.y, s.w, s.h); const T = g.cfg.thang;
        if (s.kind === 'xoan') { const cx = s.x + s.w / 2, cy = s.y + s.h / 2, R = s.w / 2; for (let k = 0; k < 16; k++) { const a = k / 16 * 2 * Math.PI; LL('THANG', cx + 0.1 * Math.cos(a), cy + 0.1 * Math.sin(a), cx + R * Math.cos(a), cy + R * Math.sin(a)); } }
        else if (s.kind === 'Ungang') { for (let k = 1; k <= T.bacMoiVe; k++) { const xx = s.x + k * T.matBac; LL('THANG', xx, s.y, xx, s.y + T.rong); LL('THANG', xx, s.y + T.rong + T.khe, xx, s.y + s.h); } LL('THANG', s.x, s.y + T.rong, s.x + T.run, s.y + T.rong); LL('THANG', s.x, s.y + T.rong + T.khe, s.x + T.run, s.y + T.rong + T.khe); }
        else { for (let k = 1; k <= T.bacMoiVe; k++) { const yy = s.y + k * T.matBac; LL('THANG', s.x, yy, s.x + T.rong, yy); LL('THANG', s.x + T.rong + T.khe, yy, s.x + s.w, yy); } LL('THANG', s.x + T.rong, s.y, s.x + T.rong, s.y + T.run); LL('THANG', s.x + T.rong + T.khe, s.y, s.x + T.rong + T.khe, s.y + T.run); }
      }
      for (const d of fl.doors) {
        const Gd = doorGeom(d);
        for (const l of Gd.lines) LL('CUA', l[0], l[1], l[2], l[3]);
        for (const l of Gd.dashes) LL('CUA', l[0], l[1], l[2], l[3]);
        for (const c of Gd.arcs) { // DXF lật trục y → góc tính trên toạ độ đã lật, cung ngược chiều kim đồng hồ
          let a0 = Math.atan2(-(c.y0 - c.cy), c.x0 - c.cx) * 180 / Math.PI, a1 = Math.atan2(-(c.y1 - c.cy), c.x1 - c.cx) * 180 / Math.PI;
          if (((a1 - a0) % 360 + 360) % 360 > 180) [a0, a1] = [a1, a0];
          out.push('0', 'ARC', '8', 'CUA', '10', (c.cx + ox).toFixed(3), '20', (-c.cy).toFixed(3), '30', '0', '40', c.r.toFixed(3), '50', a0.toFixed(2), '51', a1.toFixed(2));
        }
      }
      for (const w of fl.windows) { if (w.o === 'h') LL('CUASO', w.a, w.at, w.a + w.w, w.at); else LL('CUASO', w.at, w.a, w.at, w.a + w.w); }
      for (const c of P.columns.pts) Rr('COT', c.x - P.columns.s / 2 + ox, c.y - P.columns.s / 2, P.columns.s, P.columns.s);
      for (const a of fl.altars) Rr('PHONG', a.x + ox, a.y, a.w, a.h);
      if (fl.bal) Rr('BANCONG', fl.bal.x + ox, fl.bal.y, fl.bal.w, fl.bal.h);
      TX('CHU', W / 2 + ox, g.d + 1.2, 0.4, fl.name.toUpperCase());
    });
    out.push('0', 'ENDSEC', '0', 'EOF');
    return out.join('\n');
  }

  const api = { doorGeom, _int: { room: (...a) => room(...a), mkFloor: (...a) => mkFloor(...a), post: (...a) => post(...a), addTum: (...a) => addTum(...a), planRules: (...a) => planRules(...a), score: (...a) => score(...a), shared: (...a) => shared(...a), altarAt: (...a) => altarAt(...a), carsIn: (...a) => carsIn(...a), obRooms: (...a) => obRooms(...a), vuon: (...a) => vuon(...a) }, section, cfgFromDNA, envelope, layoutNarrow, layoutWide, layoutShallow, layoutCross, post, run, toDXF, OPTS, fmt, FH, overlapArea };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ALNPlan = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== mau-a-hoang.js ===== */
/* ALN · Mẫu gốc A Hoàng → biến thể
 * Mẫu đo từ MB_NHA_A_HOANG_-_GV.dxf (Gò Vấp, lô 4,0 m, 7 sàn + tum, thang máy).
 * Ba khoang theo chiều sâu: khoang trước | khoang lõi 3,69 (thang một vế dọc tường + hành lang + thang máy/WC) | khoang sau.
 * Biến thể = co giãn theo lô + đổi chương trình tầng + bật/tắt thang máy, lửng, giếng trời, gara, ông bà + lật trái/phải.
 * Mọi biến thể chạy qua cùng bộ kiểm của ADN (engine.js).
 */
(function (root) {
  'use strict';
  const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.ALNPlan;
  const I = E._int, fmt = E.fmt, EPS = 1e-6;

  // ---- Kích thước mẫu gốc (m), đo từ DXF ----
  const M = {
    ten: 'A Hoàng · Gò Vấp',
    lo: { w: 4.0, d: 15.04, san: 2.5, tang: 7 },
    core: 3.69,          // khoang lõi giữa trục 2–3
    thang: 1.14,         // dải thang một vế dọc tường: 1,04 thông thủy + tường 0,10 (đo DXF 03/10)
    hanhLangMin: 1.0,    // hành lang lõi (mẫu: 1,04)
    tmBand: 1.77,        // dải thang máy + WC (kể tường)
    tmLen: 1.62,         // hộp thang máy theo chiều sâu (thông thủy 1,5 × 1,45)
    wcLoi: 2.07,         // WC lõi cạnh thang máy
    wcBandNoTm: 1.5,     // khi bỏ thang máy: dải WC + kho
    tiLeTruoc: 4.40 / 8.79, // chia khoang trước / sau
    wcSau: { rong: 0.95, dai: 3.25 }, // WC dài dọc tường khoang sau
    banCong: 1.2,
    tho: 0.52,           // phòng thờ chiếm ~52% khoang trước ở sân thượng
    gieng: 1.5,
    khoangMin: 3.0
  };

  // Công năng chủ nhà tự đổi cho từng khoang (trang /thiet-ke-mat-bang/, 07/10/2026).
  // pnWc = phòng ngủ có WC riêng DO CHỦ NHÀ CHỌN → giữ WC riêng cả khi nhà ≥ 3 phòng ngủ (KTS chốt: "trừ khi chủ nhà yêu cầu thêm WC").
  const VAI_DOI = { pnF: 'Phòng ngủ', pnWc: 'Phòng ngủ có WC riêng', khach: 'Phòng khách', sh: 'Phòng sinh hoạt chung', bep: 'Bếp + ăn', lv: 'Phòng làm việc' };
  const VAI_DUY_NHAT = ['khach', 'sh', 'bep'];
  const laPn = r => r === 'pnF' || r === 'pnR' || r === 'pnWc';
  /** Khoang (tầng i, phía F/R) có cho chủ nhà đổi công năng không. */
  function doiDuoc(p, phia) {
    if (!p || p.lung || p.top) return false;
    if (p.ground && phia === 'F') return false; // mặt tiền trệt theo lựa chọn kinh doanh / gara / phòng khách
    const vai = phia === 'F' ? p.f : p.r;
    return vai !== 'ongba' && vai !== 'void' && vai !== 'kd';
  }

  const OPT_DEF = {
    kd: 'Kinh doanh tầng trệt', kd2: 'Kinh doanh thêm lầu 1', lung: 'Có lửng', tm: 'Thang máy', gara: 'Gara ô tô',
    ongba: 'PN ông bà tầng trệt', bepTren: 'Bếp ở tầng trên', sinhHoatCao: 'Khách + bếp ở tầng cao', gieng: 'Giếng trời', lat: 'Lật trái/phải', san: 'Sân trước 2,5 m'
  };

  function build(inp, cfg, v) {
    const n = v.n;
    const g = E.envelope(Object.assign({}, inp, { tang: n, tum: true, ongba: v.ongba, kd: v.kd, oto: v.gara ? 1 : 0 }), cfg);
    if (g.blocked) return { fail: 'L-LODAT-01' };
    const B = g.B, yE = g.f + g.Db;
    if (v.tm && B < M.thang + M.hanhLangMin + M.tmBand - EPS) return { fail: 'hẹp quá cho thang máy' };
    const bB = v.tm ? M.tmBand : (B - M.thang - M.hanhLangMin >= 1.4 ? M.wcBandNoTm : 0);
    const hallW = B - M.thang - bB;
    if (hallW < 0.9 - EPS) return { fail: 'hành lang lõi < 0,9 m' };
    const yB = v.san ? Math.max(g.f, M.lo.san) : g.f; // mép nhà
    const Lt = yE - yB - M.core - (v.gieng ? M.gieng : 0);
    if (Lt < 2 * M.khoangMin - EPS) return { fail: 'không đủ sâu cho hai khoang' };
    const tl = typeof v.tl === 'number' && v.tl >= 0.2 && v.tl <= 0.8 ? v.tl : M.tiLeTruoc; // chủ nhà dời tường giữa khoang trước / sau
    const Fd = Math.round(Lt * tl * 100) / 100, Rd = Lt - Fd;
    if (Rd < M.khoangMin - EPS || Fd < M.khoangMin - EPS) return { fail: 'khoang < 3 m' };
    const cw = cfg.doxe.o_to_thong_thuy_m;
    if (v.gara && (yB + Fd < cw.dai || B < cfg.doxe.cua_vao_o_to_rong_toi_thieu_m)) return { fail: 'không đủ chỗ ô tô' };
    if (v.ongba && Rd < cfg.phong.pn_ong_ba.sau_toi_thieu_m) return { fail: 'khoang sau nhỏ cho PN ông bà' };

    // ---- chương trình tầng ----
    const front0 = v.kd ? 'kd' : v.gara ? 'gara' : 'khach';
    const kitchenUp = v.ongba || v.bepTren;
    const rear0 = v.ongba ? 'ongba' : (v.bepTren ? 'bepcho' : 'bep');
    const needLivingUp = front0 !== 'khach';
    const prog = [{ name: 'Tầng trệt', f: front0, r: rear0, ground: true }];
    if (v.lung) prog.push({ name: 'Lửng', f: v.kd ? 'kd' : 'sh', r: 'void', lung: true });
    if (v.kd2) prog.push({ name: '', f: 'kd', r: 'kd' });
    let sinhHoat = null;
    if (kitchenUp || needLivingUp) sinhHoat = { name: '', f: needLivingUp ? 'khach' : 'sh', r: kitchenUp ? 'bep' : 'pnR' };
    const top = n >= 3 ? { name: 'Sân thượng · thờ', f: 'tho', r: 'phoi', top: true } : null;
    const used = prog.length + (sinhHoat ? 1 : 0) + (top ? 1 : 0);
    const bed = n - used;
    if (bed < 0) return { fail: 'không đủ tầng cho chương trình' };
    const beds = Array.from({ length: bed }, () => ({ name: '', f: 'pnF', r: 'pnR' }));
    if (sinhHoat && !v.sinhHoatCao) prog.push(sinhHoat, ...beds); else prog.push(...beds, ...(sinhHoat ? [sinhHoat] : []));
    if (top) prog.push(top);
    let li = 0; prog.forEach(p => { if (!p.ground && !p.lung && !p.top) p.name = `Lầu ${++li}`; });
    // chủ nhà đổi công năng khoang: v.doi = { '<tầng>F' | '<tầng>R': vai }
    if (v.doi && typeof v.doi === 'object') {
      for (const k of Object.keys(v.doi)) {
        const m = /^(\d{1,2})([FR])$/.exec(k), vai = v.doi[k];
        if (!m || !VAI_DOI[vai]) return { fail: 'đổi phòng không hợp lệ' };
        const p = prog[+m[1]];
        if (!doiDuoc(p, m[2])) return { fail: 'khoang này không đổi được' };
        if (m[2] === 'F') p.f = vai; else p.r = vai;
      }
      const dem = vai => prog.reduce((s, p) => s + (p.f === vai) + (p.r === vai), 0);
      if (dem('bep') < 1) return { fail: 'nhà chưa có bếp' };
      if (dem('bep') > 1) return { fail: 'hơn một bếp' };
      if (dem('khach') < 1) return { fail: 'nhà chưa có phòng khách' };
      if (dem('khach') > 1) return { fail: 'hơn một phòng khách' };
      if (!prog.some(p => laPn(p.f) || laPn(p.r))) return { fail: 'nhà chưa có phòng ngủ' };
    }
    // KTS chốt 03/10: cả nhà chỉ một không gian sinh hoạt (ngoài phòng khách)
    const nSh = prog.reduce((s, p) => s + (p.f === 'sh') + (p.r === 'sh'), 0);
    if (nSh > 1) return { fail: 'hơn một không gian sinh hoạt (KTS chốt 03/10)' };
    // KTS chốt 03/10: nhà ≥ 3 phòng ngủ → chỉ master có WC riêng, phòng khác dùng WC lõi
    const nPN = prog.reduce((s, p) => s + laPn(p.f) + laPn(p.r), 0);
    let masterLeft = nPN >= 3 && bB > 0 ? 1 : 99;

    // ---- hình học ----
    const cy = yB + Fd, cE = cy + M.core, rB = cE + (v.gieng ? M.gieng : 0);
    const R = I.room;
    const floors = [];
    let pn = 0, obPlaced = false;
    const P = { mode: 'mau', template: true, floors, notes: [], steps: 0, lwShort: v.gieng ? Math.min(M.thang, M.gieng) : 0 };
    prog.forEach((p, i) => {
      const fl = I.mkFloor(p.name, i, !!p.ground);
      // lõi
      fl.stairs.push({ x: 0, y: cy, w: M.thang, h: M.core, dir: i === prog.length - 1 ? 'LÊN MÁI' : 'LÊN', kind: 'doc', side: 'R' });
      fl.rooms.push(R(M.thang, cy, hallW, M.core, 'Hành lang', 'sanh'));
      if (bB > 0) {
        const xB = B - bB;
        if (!v.tm && !p.ground) {
          // KTS chốt 03/10: kho chỉ ở trệt; tầng trên cùng dùng ô kho làm chỗ giặt, các tầng khác gộp vào WC
          if (p.top) { fl.rooms.push(R(xB, cy, bB, M.wcLoi, 'WC', 'wc', { doorTo: 'sanh' })); fl.rooms.push(R(xB, cy + M.wcLoi, bB, M.core - M.wcLoi, 'Giặt', 'giat', { doorTo: 'sanh' })); }
          else fl.rooms.push(R(xB, cy, bB, M.core, 'WC', 'wc', { doorTo: 'sanh' }));
        } else if (v.tm) {
          fl.rooms.push(R(xB, cy, bB, M.core - M.tmLen, 'WC', 'wc', { doorTo: 'sanh' }));
          fl.rooms.push(R(xB, cE - M.tmLen, bB, M.tmLen, 'Thang máy', 'tm', { t: 'shaft', loai: 'shaft' }));
        } else {
          fl.rooms.push(R(xB, cy, bB, M.wcLoi, 'WC', 'wc', { doorTo: 'sanh' }));
          fl.rooms.push(R(xB, cy + M.wcLoi, bB, M.core - M.wcLoi, 'Kho', 'kho', { doorTo: 'sanh' }));
        }
      }
      if (v.gieng && !p.ground) { // KTS chốt 03/10: tầng trệt không bố trí giếng trời
        fl.rooms.push(R(0, cE, M.thang, M.gieng, 'Giếng trời', 'lw'));
        fl.rooms.push(R(M.thang, cE, hallW, M.gieng, 'Hành lang', 'corr'));
        if (bB > 0) fl.rooms.push(R(B - bB, cE, bB, M.gieng, 'Giếng trời', 'lw'));
      }
      bay(fl, p.f, yB, Fd, 'F', p);
      if (p.ground && v.gieng) bay(fl, p.r, cE, Rd + M.gieng, 'R', p); else bay(fl, p.r, rB, Rd, 'R', p);
      if (!p.ground && !p.lung) {
        const bd = yB > 0.05 ? Math.min(M.banCong, yB) : g.proj;
        if (bd > 0.05) fl.bal = { x: 0, y: yB - bd, w: B, h: bd };
      }
      floors.push(fl);
    });
    function bay(fl, role, y, d, side, p) {
      const n0 = fl.rooms.length;
      bay0(fl, role, y, d, side, p);
      // đánh dấu khoang để trang chủ nhà biết phòng nào thuộc khoang nào (đổi công năng)
      fl.rooms.slice(n0).forEach((q, i) => { q.bay = side; if (!i) q.bayChinh = true; });
      if (p.ground && side === 'F' && fl.rooms[n0]) fl.rooms[n0].entrance = true; // cửa chính ở mặt tiền tầng trệt
    }
    function bay0(fl, role, y, d, side, p) {
      switch (role) {
        case 'kd': fl.rooms.push(R(0, y, B, d, 'Kinh doanh', 'kd')); break;
        case 'khach': fl.rooms.push(R(0, y, B, d, 'Phòng khách', 'khach')); break;
        case 'sh': fl.rooms.push(R(0, y, B, d, 'Sinh hoạt', 'sh')); break;
        case 'gara': fl.rooms.push(R(0, y, B, d, 'Gara + sảnh', 'gara')); break;
        case 'bep': fl.rooms.push(R(0, y, B, d, 'Bếp + ăn', 'bep')); break;
        case 'bepcho': fl.rooms.push(R(0, y, B, d, 'Bếp chờ / kho', 'bep')); break;
        case 'void': fl.rooms.push(R(0, y, B, d, 'Thông tầng', 'lw')); break;
        case 'pnF': fl.rooms.push(R(0, y, B, d, `PN ${++pn}`, 'pn', { sub: bB > 0 ? 'WC ở lõi' : 'WC chung' })); break;
        case 'lv': fl.rooms.push(R(0, y, B, d, 'Phòng làm việc', 'lv')); break;
        case 'pnR': case 'pnWc': case 'ongba': {
          const ob = role === 'ongba', yeuCau = role === 'pnWc';
          if (!ob && !yeuCau && masterLeft <= 0) { fl.rooms.push(R(0, y, B, d, `PN ${++pn}`, 'pn', { sub: 'WC ở lõi' })); break; }
          if (!ob && !yeuCau && masterLeft !== 99) masterLeft--;
          const wl = Math.min(M.wcSau.dai, d - 1.0), w0 = M.wcSau.rong;
          fl.rooms.push(R(w0, y, B - w0, d, ob ? 'PN ông bà' : `PN ${++pn}${!yeuCau && masterLeft === 0 ? ' (master)' : ''}`, ob ? 'ongba' : 'pn', { sub: ob ? 'cửa 900 · WC riêng' : 'khép kín' }));
          fl.rooms.push(R(0, y + d - wl, w0, wl, 'WC', ob ? 'wc_ongba' : 'wc', { doorTo: ob ? 'ongba' : 'pn' }));
          fl.rooms.push(R(0, y, w0, d - wl, 'Tủ', 'kho', { doorTo: ob ? 'ongba' : 'pn' }));
          if (ob) obPlaced = true;
          break;
        }
        case 'tho': {
          const t = Math.max(cfg.phong.phong_tho.sau_toi_thieu_m, Math.min(d, d * M.tho));
          fl.rooms.push(R(0, y + d - t, B, t, 'Phòng thờ', 'tho'));
          fl.altars.push(I.altarAt(cfg, B / 2, y + d)); // bàn thờ sát lõi, quay ra mặt tiền
          if (d - t > 0.05) fl.rooms.push(R(0, y, B, d - t, 'Sân thượng', 'san'));
          break;
        }
        case 'phoi': fl.rooms.push(R(0, y, B, d, 'Sân phơi', 'phoi')); break;
      }
    }
    // ô tô
    if (v.gara) floors[0].cars = [{ x: (B - cw.rong) / 2, y: yB + Fd - cw.dai, w: cw.rong, h: cw.dai }];
    // phần sân trước (ngoài khối nhà, trong lô)
    if (yB > 0.05) P.yard = { y: 0, h: yB, label: v.gara ? 'Sân + lối xe' : 'Sân trước' };
    // altar position fix: bàn thờ quay ra mặt tiền → đặt sát cạnh giáp lõi
    floors.forEach(fl => fl.altars.forEach(a => { a.y = Math.min(a.y, cy - a.h - 0.05); }));

    // tum: lõi (thang + hành lang + thang máy)
    const last = floors[floors.length - 1];
    if (n >= 2) {
      const tumW = v.tm ? B : M.thang + hallW;
      if (tumW * M.core <= cfg.tum.tyLe * B * (yE - yB) + EPS) {
        const fl = I.mkFloor('Mái · tum', n, false); fl.isTum = true;
        fl.stairs.push({ x: 0, y: cy, w: M.thang, h: M.core, dir: 'XUỐNG', kind: 'doc', side: 'R' });
        fl.rooms.push(R(M.thang, cy, hallW, M.core, 'Sảnh ra mái', 'sanh'));
        if (bB > 0) {
          if (v.tm) { fl.rooms.push(R(B - bB, cy, bB, M.core - M.tmLen, 'Kỹ thuật', 'kho')); fl.rooms.push(R(B - bB, cE - M.tmLen, bB, M.tmLen, 'Phòng máy TM', 'tm', { t: 'shaft', loai: 'shaft' })); }
          else fl.rooms.push(R(B - bB, cy, bB, M.core, 'Mái', 'san'));
        }
        fl.rooms.push(R(0, yB, B, cy - yB, 'Mái', 'san'));
        fl.rooms.push(R(0, cE, B, yE - cE, 'Mái', 'san'));
        fl.tum = { x: 0, y: cy, w: tumW, h: M.core };
        floors.push(fl); P.tumArea = tumW * M.core;
      } else P.tumRejected = tumW * M.core;
    }

    // lật trái/phải
    if (v.lat) for (const fl of floors) {
      for (const r of fl.rooms) r.x = B - r.x - r.w;
      for (const s of fl.stairs) { s.x = B - s.x - s.w; s.side = s.side === 'R' ? 'L' : 'R'; }
      for (const c of fl.cars) c.x = B - c.x - c.w;
      for (const a of fl.altars) a.x = B - a.x - a.w;
      if (fl.tum) fl.tum.x = B - fl.tum.x - fl.tum.w;
    }
    const xs = v.lat ? [0, B - M.thang - hallW, B - M.thang, B] : [0, M.thang, M.thang + hallW, B];
    P.ys = [0, yB, cy, cE, rB, yE, g.d].filter((x, i, a) => a.indexOf(x) === i);
    P.xs = xs.filter(x => x >= 0 && x <= B);
    P.pn = pn; P.obPlaced = obPlaced;
    P.tl = tl; P.Fd = Fd; P.Rd = Rd; P.prog = prog.map(p => ({ name: p.name, f: p.f, r: p.r, ground: !!p.ground, lung: !!p.lung, top: !!p.top }));
    // footprint dùng cho kiểm tra: mép nhà ở yB
    g.f = yB; g.Db = yE - yB; g.fp = B * g.Db; g.san = yB;
    I.post(g, P);
    // luật: bỏ các dòng của bộ máy tự sinh không áp cho mẫu, thêm dòng mẫu
    const drop = new Set(['S-CAUTHANG-01', 'S-CAUTHANG-02', 'S-THANG-03', 'S-BT-01', 'S-BT-02', 'S-BT-03', 'S-BT-04', 'S-BT-05', 'S-LOIDI-01', 'S-THUTU-01', 'K-GIENGTROI-02']);
    const rules = g.rules.concat(I.planRules(g, P)).filter(r => !drop.has(r.ma));
    rules.unshift({ st: 'goi', ma: 'MẪU GỐC', t: `Biến thể của mẫu ${M.ten}`, d: `Giữ nguyên lõi 3,69 m của mẫu: thang một vế dọc tường rẻ quạt hai đầu (dải ${fmt(M.thang)} m), hành lang ${fmt(hallW)} m${v.tm ? ', thang máy 1,5 × 1,45 m + WC' : bB ? ', WC + kho' : ''}. Khoang trước ${fmt(Fd)} m, khoang sau ${fmt(Rd)} m (mẫu: 4,40 / 4,45).` });
    rules.push({ st: 'cb', ma: 'S-CAUTHANG-01', t: 'Thang theo mẫu gốc', d: 'Bậc thang lấy theo bản vẽ gốc của KTS (thang một vế, rẻ quạt hai đầu); máy không kiểm lại cổ bậc / mặt bậc với chiều cao tầng mới — KTS soát khi đổi chiều cao tầng.' });
    const G = cfg.gieng;
    if (v.gieng) rules.push({ st: 'dat', ma: 'K-GIENGTROI-02', t: 'Giếng trời sau lõi', d: `Giếng trời ${fmt(M.gieng)} m giữa lõi và khoang sau, hành lang lõi đi xuyên qua.` });
    else if (inp.d > G.sauPL) rules.push({ st: 'chan', ma: 'K-GIENGTROI-02', t: 'Nhà sâu > 18 m chưa có giếng trời', d: 'TCVN 9411:2012 mục 5.1.2 — chọn biến thể có giếng trời.' });
    else if (inp.d > G.sauAln) rules.push({ st: 'cb', ma: 'K-GIENGTROI-02', t: `Sâu ${fmt(inp.d)} m, không giếng trời`, d: `Mẫu gốc không có giếng trời. Pháp lý chỉ bắt buộc từ ${G.sauPL} m; ALN siết từ ${G.sauAln} m → nên chọn biến thể có giếng trời.` });
    rules.push({ st: 'dat', ma: 'ALN-BC', t: 'Luật bố cục KTS chốt 03/10', d: `Trệt không giếng trời${v.gieng ? ' (giếng trời bắt đầu từ lầu 1, trệt dùng làm bếp/ăn)' : ''}; một không gian sinh hoạt; ${nPN >= 3 ? (bB > 0 ? 'nhà ≥ 3 phòng ngủ: chỉ master có WC riêng, phòng khác dùng WC lõi; ' : 'nhà ≥ 3 phòng ngủ nhưng không có WC lõi nên phòng sau giữ WC riêng; ') : ''}${!v.tm && bB > 0 ? 'kho chỉ ở trệt, chỗ giặt ở tầng trên cùng; ' : ''}cửa phòng sát góc tường, cánh nép tường; không vẽ cột; tường giữa các không gian mở và lối đi bỏ nét để luồng đi liên tục.` });
    P.rules = rules;
    P.fail = P.selfCheck.length ? P.selfCheck : null;
    return { g, P, prog };
  }

  // ---- liệt kê biến thể ----
  function variants(inp, cfg, nList, withLat) {
    const out = []; let tried = 0;
    const B = Math.min(inp.w1, inp.w2);
    for (const n of nList) for (const kd of [0, 1]) for (const kd2 of kd ? [0, 1] : [0]) for (const gara of kd ? [0] : [0, 1])
      for (const lung of [0, 1]) for (const tm of B >= M.thang + M.hanhLangMin + M.tmBand ? [0, 1] : [0]) for (const ongba of [0, 1])
        for (const bepTren of ongba ? [1] : [0, 1]) for (const sinhHoatCao of [0, 1]) for (const gieng of inp.d > cfg.gieng.sauAln ? [0, 1] : [0])
          for (const san of [1, 0]) for (const lat of withLat ? [0, 1] : [0]) {
            const v = { n, kd, kd2, gara, lung, tm, ongba, bepTren, sinhHoatCao, gieng, san, lat };
            // bỏ tổ hợp trùng: sinhHoatCao chỉ có nghĩa khi có tầng khách/bếp ở trên
            const needUp = kd || gara || ongba || bepTren; if (!needUp && sinhHoatCao) continue;
            tried++;
            const r = build(inp, cfg, v);
            if (r.fail || !r.P || r.P.fail) continue;
            r.v = v; out.push(r);
          }
    return { list: out, tried };
  }

  // ---- khớp nhu cầu ----
  function match(r, need) {
    const v = r.v, P = r.P; let s = 100; const why = [];
    const pnAll = P.pn + (P.obPlaced ? 1 : 0);
    if (need.pn) { const d = pnAll - need.pn; if (d < 0) { s -= 18 * -d; why.push(`thiếu ${-d} PN`); } else if (d > 0) { s -= 4 * d; } }
    if (!!need.kd !== !!v.kd) { s -= 35; why.push(need.kd ? 'không có kinh doanh' : 'có kinh doanh'); }
    if (need.tm && !v.tm) { s -= 35; why.push('không thang máy'); }
    if (!need.tm && v.tm) { s -= 12; why.push('thêm thang máy'); }
    if (!!need.oto !== !!v.gara) { s -= need.oto ? 35 : 8; if (need.oto) why.push('không gara'); }
    if (need.ongba && !v.ongba) { s -= 40; why.push('không có PN ông bà trệt'); }
    if (!need.ongba && v.ongba) s -= 10;
    if (need.lung === 1 && !v.lung) s -= 8; if (need.lung === 0 && v.lung) s -= 8;
    const adn = I.score(r.g, P, null).total;
    const chan = P.rules.filter(x => x.st === 'chan').length;
    s -= 30 * chan;
    return { total: Math.round(0.65 * s + 0.35 * adn), khop: Math.max(0, Math.round(s)), adn, why, chan };
  }

  function goc() { return { kd: 1, kd2: 1, gara: 0, lung: 1, tm: 1, ongba: 0, bepTren: 1, sinhHoatCao: 1, gieng: 0, san: 1, lat: 0, n: 7 }; }

  const api = { M, OPT_DEF, VAI_DOI, VAI_DUY_NHAT, doiDuoc, build, variants, match, goc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ALNMau = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== ve-chung.js ===== */
/* ALN · Phần vẽ dùng chung (bản rút gọn cho trang chủ nhà): thư viện nội thất, đoạn tường, điểm ghi kích thước.
 * Rút từ ALNCad (chuẩn CAD ALN V1.0) — bỏ phần sinh DXF/LSP/ZIP, không xuất bản vẽ CAD trên trang công khai.
 */
(function (root) {
  'use strict';
  const LY = {
    ranh: 'ALN-00-DUONG-DAT', chigioi: 'ALN-00-KY-HIEU', tuong: 'ALN-KT-TUONG', gieng: 'ALN-KT-NET-KHUAT', thang: 'ALN-KT-CAU-THANG',
    cua: 'ALN-KT-CUA-DI', cuaso: 'ALN-KT-CUA-SO', cot: 'ALN-KC-COT', noithat: 'ALN-KT-NOI-THAT', vesinh: 'ALN-KT-VE-SINH',
    bancong: 'ALN-KT-SAN', chu: 'ALN-00-GHI-CHU', kt: 'ALN-00-KICH-THUOC', truc: 'ALN-00-LUOI-TRUC'
  };
  const LY_LABEL = [
    ['Ranh lô', LY.ranh], ['Chỉ giới xây dựng', LY.chigioi], ['Tường', LY.tuong], ['Giếng trời (nét khuất)', LY.gieng],
    ['Cầu thang', LY.thang], ['Cửa đi', LY.cua], ['Cửa sổ', LY.cuaso], ['Cột (khi bật)', LY.cot], ['Nội thất, ô tô, bàn thờ', LY.noithat],
    ['Thiết bị vệ sinh, giặt', LY.vesinh], ['Ban công vươn', LY.bancong], ['Chữ, tên phòng', LY.chu], ['Kích thước (DIM ALN-1-100)', LY.kt]
  ];

  /* ---------- Thư viện đồ đạc (mét, gốc góc trên-trái, y hướng xuống như mặt bằng web) ---------- */
  const R = (x, y, w, h) => ({ k: 'r', x, y, w, h }), Ln = (x1, y1, x2, y2) => ({ k: 'l', x1, y1, x2, y2 }), C = (cx, cy, r) => ({ k: 'c', cx, cy, r }), El = (cx, cy, rx, ry) => ({ k: 'e', cx, cy, rx, ry });
  const LIB = {
    giuong_doi: { lb: 'Giường đôi 1,8×2,0', w: 1.8, h: 2.0, ly: 'noithat', g: [R(0, 0, 1.8, 2.0), R(0.15, 0.1, 0.65, 0.4), R(1.0, 0.1, 0.65, 0.4), Ln(0, 0.75, 1.8, 0.75)] },
    giuong_don: { lb: 'Giường 1,2×2,0', w: 1.2, h: 2.0, ly: 'noithat', g: [R(0, 0, 1.2, 2.0), R(0.2, 0.1, 0.8, 0.4), Ln(0, 0.75, 1.2, 0.75)] },
    giuong_16: { lb: 'Giường 1,6×2,0', w: 1.6, h: 2.0, ly: 'noithat', g: [R(0, 0, 1.6, 2.0), R(0.12, 0.1, 0.6, 0.4), R(0.88, 0.1, 0.6, 0.4), Ln(0, 0.75, 1.6, 0.75)] },
    ke_tv: { lb: 'Kệ TV 1,8×0,4', w: 1.8, h: 0.4, ly: 'noithat', g: [R(0, 0, 1.8, 0.4), R(0.4, 0.02, 1.0, 0.06)] },
    tu_ao: { lb: 'Tủ áo 1,6×0,6', w: 1.6, h: 0.6, ly: 'noithat', g: [R(0, 0, 1.6, 0.6), Ln(0, 0.3, 1.6, 0.3), Ln(0.8, 0, 0.8, 0.6)] },
    sofa: { lb: 'Sofa 2,1×0,85', w: 2.1, h: 0.85, ly: 'noithat', g: [R(0, 0, 2.1, 0.85), R(0, 0, 2.1, 0.2), R(0, 0.2, 0.2, 0.65), R(1.9, 0.2, 0.2, 0.65), Ln(0.767, 0.2, 0.767, 0.85), Ln(1.333, 0.2, 1.333, 0.85)] },
    ban_tra: { lb: 'Bàn trà 1,0×0,5', w: 1.0, h: 0.5, ly: 'noithat', g: [R(0, 0, 1.0, 0.5)] },
    ban_an: { lb: 'Bàn ăn 4 ghế', w: 1.2, h: 1.6, ly: 'noithat', g: [R(0, 0.4, 1.2, 0.8), R(0.1, 0, 0.45, 0.35), R(0.65, 0, 0.45, 0.35), R(0.1, 1.25, 0.45, 0.35), R(0.65, 1.25, 0.45, 0.35)] },
    bep_i: { lb: 'Tủ bếp 2,4×0,6', w: 2.4, h: 0.6, ly: 'noithat', g: [R(0, 0, 2.4, 0.6), R(0.3, 0.1, 0.75, 0.42), C(1.6, 0.3, 0.12), C(1.95, 0.3, 0.12)] },
    bep_i18: { lb: 'Tủ bếp 1,8×0,6', w: 1.8, h: 0.6, ly: 'noithat', g: [R(0, 0, 1.8, 0.6), R(0.2, 0.1, 0.6, 0.42), C(1.15, 0.3, 0.12), C(1.5, 0.3, 0.12)] },
    ban_an_hep: { lb: 'Bàn ăn hẹp 2–4 ghế', w: 1.2, h: 1.15, ly: 'noithat', g: [R(0, 0.4, 1.2, 0.7), R(0.1, 0, 0.45, 0.35), R(0.65, 0, 0.45, 0.35)] },
    tu_lanh: { lb: 'Tủ lạnh 0,7×0,7', w: 0.7, h: 0.7, ly: 'noithat', g: [R(0, 0, 0.7, 0.7), Ln(0, 0.6, 0.7, 0.6)] },
    ban_lam_viec: { lb: 'Bàn làm việc 1,2', w: 1.2, h: 1.05, ly: 'noithat', g: [R(0, 0, 1.2, 0.6), R(0.37, 0.65, 0.46, 0.4)] },
    ban_tho: { lb: 'Bàn thờ 1,27×0,61', w: 1.27, h: 0.61, ly: 'noithat', g: [R(0, 0, 1.27, 0.61), R(0.08, 0.08, 1.11, 0.45)] },
    xe_may: { lb: 'Xe máy 0,8×2,0', w: 0.8, h: 2.0, ly: 'noithat', g: [R(0.25, 0.1, 0.3, 1.8), Ln(0, 0.4, 0.8, 0.4)] },
    bon_cau: { lb: 'Bồn cầu', w: 0.4, h: 0.7, ly: 'vesinh', g: [R(0, 0, 0.4, 0.18), El(0.2, 0.44, 0.18, 0.25)] },
    lavabo: { lb: 'Lavabo', w: 0.5, h: 0.45, ly: 'vesinh', g: [R(0, 0, 0.5, 0.45), El(0.25, 0.26, 0.17, 0.13), C(0.25, 0.07, 0.025)] },
    sen_tam: { lb: 'Sen tắm 0,9×0,9', w: 0.9, h: 0.9, ly: 'vesinh', g: [R(0, 0, 0.9, 0.9), Ln(0, 0, 0.9, 0.9), Ln(0.9, 0, 0, 0.9), C(0.45, 0.45, 0.05)] },
    may_giat: { lb: 'Máy giặt 0,6', w: 0.6, h: 0.6, ly: 'vesinh', g: [R(0, 0, 0.6, 0.6), C(0.3, 0.33, 0.2)] },
    lavabo_doi: { lb: 'Lavabo đôi 1,2', w: 1.2, h: 0.5, ly: 'vesinh', g: [R(0, 0, 1.2, 0.5), El(0.3, 0.28, 0.17, 0.13), El(0.9, 0.28, 0.17, 0.13), C(0.3, 0.07, 0.025), C(0.9, 0.07, 0.025)] },
    bon_tam: { lb: 'Bồn tắm 1,6×0,75', w: 1.6, h: 0.75, ly: 'vesinh', g: [R(0, 0, 1.6, 0.75), El(0.85, 0.375, 0.62, 0.27), C(0.35, 0.375, 0.035)] },
    tam_dung: { lb: 'Tắm đứng kính 0,9×0,9', w: 0.9, h: 0.9, ly: 'vesinh', g: [R(0, 0, 0.9, 0.9), Ln(0, 0.9, 0.9, 0.9), Ln(0.05, 0.85, 0.85, 0.85), C(0.45, 0.45, 0.05), Ln(0, 0, 0.9, 0.9), Ln(0.9, 0, 0, 0.9)] }
  };
  // biến hình: xoay 0/90/180/270 (theo chiều kim đồng hồ trên mặt bằng), rồi dời tới (x, y) = góc trên-trái khung bao
  // kích thước riêng từng món (KTS kéo giãn): f.w, f.h theo hệ của món (chưa xoay)
  const fW = f => f.w || LIB[f.t].w, fH = f => f.h || LIB[f.t].h;
  function furnBox(f) { const sw = f.rot % 180 !== 0, W = fW(f), H = fH(f); return { x: f.x, y: f.y, w: sw ? H : W, h: sw ? W : H }; }
  // vẽ lại theo kích thước mới cho món co giãn được (không kéo méo chi tiết)
  const GEN = {
    tu_ao: (w, h) => { const g = [R(0, 0, w, h), Ln(0, h / 2, w, h / 2)], n = Math.max(1, Math.round(w / 0.5)); for (let i = 1; i < n; i++) g.push(Ln(w * i / n, 0, w * i / n, h)); return g; },
    ke_tv: (w, h) => { const tw = Math.min(1.0, w * 0.6); return [R(0, 0, w, h), R((w - tw) / 2, 0.02, tw, Math.min(0.06, h * 0.3))]; },
    bep_i: (w, h) => { const g = [R(0, 0, w, h)]; if (w >= 1.2) g.push(R(0.3, 0.1, Math.min(0.75, w * 0.3), h * 0.7)); if (w >= 1.0) { g.push(C(w - 0.8, h / 2, 0.12), C(w - 0.45, h / 2, 0.12)); } const n = Math.round(w / 0.6); for (let i = 1; i < n; i++) g.push(Ln(w * i / n, h - 0.02, w * i / n, h)); return g; },
    sofa: (w, h) => { const a = Math.min(0.2, w * 0.1), g = [R(0, 0, w, h), R(0, 0, w, Math.min(0.2, h * 0.25)), R(0, 0.2, a, h - 0.2), R(w - a, 0.2, a, h - 0.2)], n = Math.max(1, Math.round((w - 2 * a) / 0.6)); for (let i = 1; i < n; i++) { const x = a + (w - 2 * a) * i / n; g.push(Ln(x, 0.2, x, h)); } return g; },
    ban_an: (w, h) => { const ch = 0.4, g = [R(0, ch, w, Math.max(0.3, h - 2 * ch))], n = Math.max(1, Math.floor(w / 0.6)); for (let i = 0; i < n; i++) { const cx = w * (i + 0.5) / n - 0.225; g.push(R(cx, 0, 0.45, 0.35), R(cx, h - 0.35, 0.45, 0.35)); } return g; },
    ban_an_hep: (w, h) => { const ch = 0.4, g = [R(0, ch, w, Math.max(0.3, h - ch))], n = Math.max(1, Math.floor(w / 0.6)); for (let i = 0; i < n; i++) g.push(R(w * (i + 0.5) / n - 0.225, 0, 0.45, 0.35)); return g; },
    ban_lam_viec: (w, h) => [R(0, 0, w, Math.min(0.6, h * 0.6)), R(w / 2 - 0.23, Math.min(0.65, h * 0.62), 0.46, Math.min(0.4, h * 0.38))],
    ban_tho: (w, h) => [R(0, 0, w, h), R(0.08, 0.08, Math.max(0.1, w - 0.16), Math.max(0.1, h - 0.16))],
    ban_tra: (w, h) => [R(0, 0, w, h)],
    giuong_doi: (w, h) => { const g = [R(0, 0, w, h), Ln(0, 0.75, w, 0.75)]; if (w >= 1.4) { const pw = (w - 0.5) / 2; g.push(R(0.15, 0.1, pw, 0.4), R(w - 0.15 - pw, 0.1, pw, 0.4)); } else g.push(R(0.2, 0.1, w - 0.4, 0.4)); return g; }
  };
  GEN.lavabo = (w, h) => w >= 1.05 ? GEN.lavabo_doi(w, h) : [R(0, 0, w, h), El(w / 2, h * 0.58, Math.min(0.17, w * 0.34), h * 0.29), C(w / 2, 0.07, 0.025)];
  GEN.lavabo_doi = (w, h) => { const g = [R(0, 0, w, h)]; for (const cx of [w * 0.25, w * 0.75]) g.push(El(cx, h * 0.56, Math.min(0.17, w * 0.14), h * 0.26), C(cx, 0.07, 0.025)); return g; };
  GEN.bon_tam = (w, h) => [R(0, 0, w, h), El(w * 0.53, h / 2, w * 0.39, h * 0.36), C(w * 0.22, h / 2, 0.035)];
  GEN.tam_dung = (w, h) => [R(0, 0, w, h), Ln(0, h, w, h), Ln(0.05, h - 0.05, w - 0.05, h - 0.05), C(w / 2, h / 2, 0.05), Ln(0, 0, w, h), Ln(w, 0, 0, h)];
  GEN.sen_tam = (w, h) => [R(0, 0, w, h), Ln(0, 0, w, h), Ln(w, 0, 0, h), C(w / 2, h / 2, 0.05)];
  GEN.bep_i18 = GEN.bep_i; GEN.giuong_16 = GEN.giuong_doi; GEN.giuong_don = GEN.giuong_doi;
  function geomOf(f) {
    const L = LIB[f.t], W = fW(f), H = fH(f);
    if (Math.abs(W - L.w) < 1e-4 && Math.abs(H - L.h) < 1e-4) return L.g;
    if (GEN[f.t]) return GEN[f.t](W, H);
    const sx = W / L.w, sy = H / L.h, sr = Math.min(sx, sy); // món khác: co giãn tỉ lệ, vòng tròn giữ tròn
    return L.g.map(p => p.k === 'r' ? R(p.x * sx, p.y * sy, p.w * sx, p.h * sy) : p.k === 'l' ? Ln(p.x1 * sx, p.y1 * sy, p.x2 * sx, p.y2 * sy) : p.k === 'c' ? C(p.cx * sx, p.cy * sy, p.r * sr) : Object.assign({}, p, { cx: p.cx * sx, cy: p.cy * sy, rx: p.rx * sx, ry: p.ry * sy }));
  }
  const furnLb = f => { const L = LIB[f.t]; if (!f.w && !f.h) return L.lb; const base = L.lb.replace(/\s[\d,]+×[\d,]+$|\s[\d,]+$/, ''); return `${base} ${String(Math.round(fW(f) * 100) / 100).replace('.', ',')}×${String(Math.round(fH(f) * 100) / 100).replace('.', ',')}`; };
  function furnXf(f) {
    const W = fW(f), H = fH(f);
    return (u, v) => {
      let p;
      if (f.rot === 90) p = [H - v, u]; else if (f.rot === 180) p = [W - u, H - v]; else if (f.rot === 270) p = [v, W - u]; else p = [u, v];
      return [p[0] + f.x, p[1] + f.y];
    };
  }
  // trả về primitives ở toạ độ mặt bằng web (m, y xuống): {k:'pl',pts,closed}|{k:'l'}|{k:'c'}
  function furnPrims(f) {
    const X = furnXf(f), out = [];
    for (const p of geomOf(f)) {
      if (p.k === 'r') out.push({ k: 'pl', closed: true, pts: [X(p.x, p.y), X(p.x + p.w, p.y), X(p.x + p.w, p.y + p.h), X(p.x, p.y + p.h)] });
      else if (p.k === 'l') { const a = X(p.x1, p.y1), b = X(p.x2, p.y2); out.push({ k: 'l', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }); }
      else if (p.k === 'c') { const c = X(p.cx, p.cy); out.push({ k: 'c', cx: c[0], cy: c[1], r: p.r }); }
      else if (p.k === 'e') { const pts = []; for (let i = 0; i < 20; i++) { const a = i / 20 * 2 * Math.PI; pts.push(X(p.cx + p.rx * Math.cos(a), p.cy + p.ry * Math.sin(a))); } out.push({ k: 'pl', closed: true, pts }); }
    }
    return out;
  }


  /* ---------- Cầu thang co giãn: 2 vế chữ U ↔ 1 vế thẳng, số bậc 17–22 (mặc định 21), mặt bậc nhảy theo khung ---------- */
  // s: {x,y,w,h, n, type:'U'|'I'|undefined(tự động theo bề rộng), axis:'v'|'h', rev, flip, dir}
  const STAIR_U_MIN = 1.5; // bề rộng khung ≥ 1,5 m → đủ 2 vế (2 × 0,7 + khe)
  function stairCfg(s, T) {
    const axis = s.axis || (s.kind === 'Ungang' ? 'h' : 'v'), gap = (T && T.khe) || 0.1;
    const Lb = axis === 'v' ? s.h : s.w, Wd = axis === 'v' ? s.w : s.h, n = s.n || (T && T.soCo) || 21;
    const type = s.type || (Wd >= STAIR_U_MIN ? 'U' : 'I');
    if (type === 'U') {
      const ve = (Wd - gap) / 2, n1 = Math.ceil(n / 2), n2 = n - n1, land = Math.min(Math.max(ve, 1.0), Lb * 0.5), b = (Lb - land) / (n1 - 1);
      return { axis, Lb, Wd, n, n1, n2, type, ve, land, b, gap, run: (n1 - 1) * b };
    }
    return { axis, Lb, Wd, n, n1: n, n2: 0, type: 'I', ve: Wd, land: 0, b: Lb / (n - 1), gap, run: Lb };
  }
  // khung cần có cho một cấu hình (giữ góc trên-trái)
  function stairBox(type, n, b, ve, gap) {
    gap = gap || 0.1;
    if (type === 'U') { const n1 = Math.ceil(n / 2); return { Lb: (n1 - 1) * b + Math.max(ve, 1.0), Wd: 2 * ve + gap }; }
    return { Lb: (n - 1) * b, Wd: ve };
  }
  function stairSet(s, axis, Lb, Wd) { if (axis === 'v') { s.w = Wd; s.h = Lb; } else { s.w = Lb; s.h = Wd; } }
  // nét thang trong toạ độ mặt bằng: lines [[x1,y1,x2,y2]], arrow [[x,y]...], label {x,y}
  function stairPrims(s, T) {
    const c = stairCfg(s, T), out = { lines: [], arrow: [], label: null, cfg: c };
    const P = (u, v) => { const vv = s.flip ? c.Wd - v : v, uu = s.rev ? c.Lb - u : u; return c.axis === 'v' ? [s.x + vv, s.y + uu] : [s.x + uu, s.y + vv]; };
    const LN = (u1, v1, u2, v2) => { const a = P(u1, v1), b = P(u2, v2); out.lines.push([a[0], a[1], b[0], b[1]]); };
    if (c.type === 'U') {
      const v2 = c.ve + c.gap, run = c.run, u2end = run - (c.n2 - 1) * c.b;
      LN(0, c.ve, run, c.ve); LN(0, v2, run, v2);
      for (let j = 1; j <= c.n1 - 1; j++) LN(j * c.b, 0, j * c.b, c.ve);
      for (let j = 1; j <= c.n2 - 1; j++) LN(run - j * c.b, v2, run - j * c.b, c.Wd);
      const um = run + c.land / 2;
      out.arrow = [P(0, c.ve / 2), P(um, c.ve / 2), P(um, v2 + c.ve / 2), P(0, v2 + c.ve / 2)]; // đuôi ở mép đầu, mũi ở mép cuối
      out.label = P(run + c.land * 0.78, c.Wd / 2);
    } else {
      for (let j = 1; j <= c.n - 1; j++) LN(j * c.b, 0, j * c.b, c.Wd);
      out.arrow = [P(0, c.Wd / 2), P(c.Lb, c.Wd / 2)];
      out.label = P(c.Lb * 0.5, c.Wd / 2);
    }
    if (s.arr) out.arrow.reverse(); // đổi chiều mũi tên 180°
    return out;
  }

  /* ---------- Tường nét đơn: hợp các cạnh phòng + khối xây, cắt khe cửa đi / cửa sổ ---------- */
  const WALL_T = ['room', 'wet', 'void', 'shaft'];
  const FLOW_KEYS = ['khach', 'bep', 'sh', 'kd'];
  const isFlow = r => r.t === 'corr' || FLOW_KEYS.includes(r.key) || /kh\u00e1ch|khách/i.test(r.lb || '');
  function flowOpen(fl, o, at) { // các đoạn trên đường (o, at) mà hai bên đều là không gian mở / lối đi
    const out = [], rs = fl.rooms.filter(r => isFlow(r) || r.grp), n = (a, b) => Math.abs(a - b) < 0.004;
    for (const a of rs) for (const b of rs) {
      if (a === b || !((isFlow(a) && isFlow(b)) || (a.grp && a.grp === b.grp))) continue; // mảnh cùng nhóm (phòng chữ L) không có tường giữa
      if (o === 'h' && n(a.y + a.h, at) && n(b.y, at)) { const u = Math.max(a.x, b.x), v = Math.min(a.x + a.w, b.x + b.w); if (v - u > 0.01) out.push([u, v]); }
      if (o === 'v' && n(a.x + a.w, at) && n(b.x, at)) { const u = Math.max(a.y, b.y), v = Math.min(a.y + a.h, b.y + b.h); if (v - u > 0.01) out.push([u, v]); }
    }
    return out;
  }
  /* ---------- Đường bao đa giác (nhà nhiều cạnh): tường thẳng góc chỉ giữ phần nằm trong đa giác ---------- */
  function inPoly(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function clipToPoly(pts, o, at, a0, a1) {
    const ts = [a0, a1];
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length];
      const [pu, pv, qu, qv] = o === 'h' ? [p[0], p[1], q[0], q[1]] : [p[1], p[0], q[1], q[0]];
      if ((pv - at) * (qv - at) < 0) { const t = pu + (qu - pu) * (at - pv) / (qv - pv); if (t > a0 && t < a1) ts.push(t); }
      if (Math.abs(pv - at) < 1e-6 && pu > a0 && pu < a1) ts.push(pu); }
    ts.sort((a, b) => a - b); const out = [];
    for (let k = 0; k + 1 < ts.length; k++) { const u = ts[k], v = ts[k + 1]; if (v - u < 0.005) continue; const m = (u + v) / 2;
      const ok = o === 'h' ? (inPoly(pts, m, at + 0.01) || inPoly(pts, m, at - 0.01)) : (inPoly(pts, at + 0.01, m) || inPoly(pts, at - 0.01, m));
      if (ok) { const l = out[out.length - 1]; if (l && Math.abs(l[1] - u) < 0.005) l[1] = v; else out.push([u, v]); } }
    return out;
  }
  function wallSegs(g, fl, cut, all) {
    const B = g.B, y0 = g.f, y1 = g.f + g.Db, groups = new Map();
    const add = (o, at, a0, a1) => { if (a1 - a0 < 0.01) return; const k = o + '|' + Math.round(at * 1000); if (!groups.has(k)) groups.set(k, { o, at: Math.round(at * 1000) / 1000, iv: [] }); groups.get(k).iv.push([a0, a1]); };
    if (!g.poly) { add('h', y0, 0, B); add('h', y1, 0, B); add('v', 0, y0, y1); add('v', B, y0, y1); }
    for (const r of fl.rooms) {
      if (!all && !WALL_T.includes(r.t)) continue;
      add('h', r.y, r.x, r.x + r.w); add('h', r.y + r.h, r.x, r.x + r.w); add('v', r.x, r.y, r.y + r.h); add('v', r.x + r.w, r.y, r.y + r.h);
    }
    if (all) for (const r of fl.stairs) { add('h', r.y, r.x, r.x + r.w); add('h', r.y + r.h, r.x, r.x + r.w); add('v', r.x, r.y, r.y + r.h); add('v', r.x + r.w, r.y, r.y + r.h); }
    if (fl.tum) { const T = fl.tum; add('h', T.y, T.x, T.x + T.w); add('h', T.y + T.h, T.x, T.x + T.w); add('v', T.x, T.y, T.y + T.h); add('v', T.x + T.w, T.y, T.y + T.h); }
    const out = [];
    for (const G of groups.values()) {
      G.iv.sort((a, b) => a[0] - b[0]);
      let merged = [];
      for (const iv of G.iv) { const m = merged[merged.length - 1]; if (m && iv[0] <= m[1] + 0.005) m[1] = Math.max(m[1], iv[1]); else merged.push(iv.slice()); }
      // luồng giao thông liên tục (KTS chốt 03/10): không vẽ tường giữa hai không gian mở / lối đi kề nhau
      if (!all) {
        const opens = flowOpen(fl, G.o, G.at);
        for (const h of opens) merged = merged.flatMap(([u, v]) => (h[1] <= u + 0.005 || h[0] >= v - 0.005) ? [[u, v]] : [[u, Math.min(v, h[0])], [Math.max(u, h[1]), v]]).filter(([u, v]) => v - u > 0.005);
      }
      if (cut) {
        const holes = fl.doors.filter(d => d.o === G.o && Math.abs(d.at - G.at) < 0.005).map(d => [d.a, d.a + d.w])
          .concat(fl.windows.filter(w => w.o === G.o && Math.abs(w.at - G.at) < 0.005).map(w => [w.a, w.a + w.w]));
        for (const h of holes) merged = merged.flatMap(([u, v]) => (h[1] <= u || h[0] >= v) ? [[u, v]] : [[u, Math.min(v, h[0])], [Math.max(u, h[1]), v]]).filter(([u, v]) => v - u > 0.005);
      }
      if (g.poly) merged = merged.flatMap(([u, v]) => clipToPoly(g.poly, G.o, G.at, u, v));
      for (const [a0, a1] of merged) out.push({ o: G.o, at: G.at, a0, a1 });
    }
    return out;
  }

  function polyOffsetIn(pts, d) {
    let A = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; A += a[0] * b[1] - b[0] * a[1]; }
    const sg = A > 0 ? 1 : -1, n = pts.length, L = [], out = [];
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; L.push([[a[0] - dy / l * d * sg, a[1] + dx / l * d * sg], [dx, dy]]); }
    for (let i = 0; i < n; i++) { const [p1, d1] = L[(i - 1 + n) % n], [p2, d2] = L[i], den = d1[0] * d2[1] - d1[1] * d2[0];
      if (Math.abs(den) < 1e-9) { out.push(p2); continue; } const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den; out.push([p1[0] + d1[0] * t, p1[1] + d1[1] * t]); }
    return out;
  }
  // trục: {xs:[...], ys:[...]} — xs trục chữ A,B… (đường dọc), ys trục số 1,2… (đường ngang, từ mặt tiền vào)
  const axLetter = i => { const s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; return i < 26 ? s[i] : s[Math.floor(i / 26) - 1] + s[i % 26]; };
  /* ---------- Tường đôi: mặt tiền / mặt hậu 200, tường biên hai bên 100 (vào trong từ mép khối), tường trong 100 (tim) ---------- */
  const T_NGOAI = 0.2, T_BIEN = 0.1, T_TRONG = 0.1;
  function wallBand(g, o, at) {
    const n = (a, b) => Math.abs(a - b) < 0.004, y0 = g.f, y1 = g.f + g.Db;
    if (o === 'v') { if (n(at, 0)) return [0, T_BIEN]; if (n(at, g.B)) return [-T_BIEN, 0]; } // tường biên sát ranh hai bên 100
    else { if (n(at, y0)) return [0, T_NGOAI]; if (n(at, y1)) return [-T_NGOAI, 0]; }
    return [-T_TRONG / 2, T_TRONG / 2];
  }
  // hợp các dải tường (đã chừa khe cửa) rồi lấy đường bao → nét tường đôi sạch ở góc và chỗ giao chữ T
  function wallOutline(g, fl) {
    const R = [];
    for (const s of wallSegs(g, fl, true)) {
      const [lo, hi] = wallBand(g, s.o, s.at);
      if (s.o === 'h') R.push([s.a0, s.at + lo, s.a1, s.at + hi]); else R.push([s.at + lo, s.a0, s.at + hi, s.a1]);
    }
    const q = v => Math.round(v * 1000) / 1000;
    const xs = [...new Set(R.flatMap(r => [q(r[0]), q(r[2])]))].sort((a, b) => a - b), ys = [...new Set(R.flatMap(r => [q(r[1]), q(r[3])]))].sort((a, b) => a - b);
    const nx = xs.length - 1, ny = ys.length - 1, F = new Uint8Array(Math.max(0, nx * ny));
    for (const r of R) { const i0 = xs.indexOf(q(r[0])), i1 = xs.indexOf(q(r[2])), j0 = ys.indexOf(q(r[1])), j1 = ys.indexOf(q(r[3])); for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) F[j * nx + i] = 1; }
    const f = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && F[j * nx + i] === 1;
    const H = new Map(), V = new Map(), push = (M, k, a, b) => { if (!M.has(k)) M.set(k, []); M.get(k).push([a, b]); };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (!f(i, j)) continue;
      if (!f(i, j - 1)) push(H, ys[j], xs[i], xs[i + 1]);
      if (!f(i, j + 1)) push(H, ys[j + 1], xs[i], xs[i + 1]);
      if (!f(i - 1, j)) push(V, xs[i], ys[j], ys[j + 1]);
      if (!f(i + 1, j)) push(V, xs[i + 1], ys[j], ys[j + 1]);
    }
    const out = [], merge = (M, o) => { for (const [at, iv] of M) { iv.sort((a, b) => a[0] - b[0]); let cur = null; for (const v of iv) { if (cur && Math.abs(v[0] - cur[1]) < 1e-6) cur[1] = v[1]; else { if (cur) out.push({ o, at, a0: cur[0], a1: cur[1] }); cur = v.slice(); } } if (cur) out.push({ o, at, a0: cur[0], a1: cur[1] }); } };
    merge(H, 'h'); merge(V, 'v');
    return out;
  }

  /* ---------- Mô hình nét chuẩn ALN cho một phương án ---------- */
  /* ---------- Điểm ghi kích thước: chỉ nơi có tường / vách thật và mép cửa trên mặt đang ghi ---------- */
  function dimPts(g, fl, sideX) {
    const y0 = g.f, y1 = g.f + g.Db, B = g.B, q = v => Math.round(v * 1000) / 1000;
    const xs = [0, B], ys = [y0, y1];
    if (g.f > 0.01) ys.push(0); if (g.d - y1 > 0.01) ys.push(g.d);
    for (const s of wallSegs(g, fl, false)) {
      if (s.a1 - s.a0 < 0.05) continue;
      if (s.o === 'h' && s.at > y0 - 1e-3 && s.at < y1 + 1e-3) ys.push(s.at);
      if (s.o === 'v' && s.at > -1e-3 && s.at < B + 1e-3) xs.push(s.at);
    }
    for (const w of (fl.doors || []).concat(fl.windows || [])) {
      if (w.o === 'v' && Math.abs(w.at - sideX) < 0.01) ys.push(w.a, w.a + w.w);
      if (w.o === 'h' && Math.abs(w.at - y1) < 0.01) xs.push(w.a, w.a + w.w);
    }
    const clean = a => { a = [...new Set(a.map(q))].sort((m, n) => m - n); const o = []; for (const v of a) if (!o.length || v - o[o.length - 1] > 0.03) o.push(v); return o; };
    return { xs: clean(xs).filter(v => v >= -1e-3 && v <= B + 1e-3), ys: clean(ys) };
  }
  /* ---------- Vị trí chữ tên phòng: KTS kéo (r.lx, r.ly) hoặc tự né đồ đạc / cầu thang ---------- */
  function labelSpot(r, fl, bw, bh, extra) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const clampC = (x, y) => ({ x: Math.max(r.x + Math.min(bw, r.w) / 2, Math.min(r.x + r.w - Math.min(bw, r.w) / 2, x)), y: Math.max(r.y + Math.min(bh, r.h) / 2, Math.min(r.y + r.h - Math.min(bh, r.h) / 2, y)) });
    if (r.lx != null || r.ly != null) return clampC(cx + (r.lx || 0), cy + (r.ly || 0));
    const ov = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const obs = (fl.furn || []).map(furnBox).concat(fl.stairs || [], extra || []).filter(b => ov(b, r) > 1e-4);
    if (!obs.length) return { x: cx, y: cy };
    const score = (x, y) => { const bx = { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh }; let s = 0; for (const b of obs) s += ov(bx, b); return s; };
    let best = { x: cx, y: cy, s: score(cx, cy) * 100 };
    if (best.s === 0) return best;
    const hx = Math.max(0, (r.w - bw) / 2), hy = Math.max(0, (r.h - bh) / 2);
    for (let dx = -hx; dx <= hx + 1e-6; dx += 0.1) for (let dy = -hy; dy <= hy + 1e-6; dy += 0.1) {
      const sc = score(cx + dx, cy + dy) * 100 + Math.hypot(dx, dy);
      if (sc < best.s) best = { x: cx + dx, y: cy + dy, s: sc };
    }
    return best;
  }

  /* ---------- DXF R12, mm ---------- */
  const api = { axLetter, inPoly, polyOffsetIn, clipToPoly, wallOutline, wallBand, LY, LY_LABEL, LIB, furnBox, furnPrims, furnLb, dimPts, labelSpot, stairCfg, stairBox, stairSet, stairPrims, wallSegs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ALNCad = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== noi-that.js ===== */
/* ALN · Tự bố trí nội thất cho bản phác (quy ước nhà phố VN)
 * Nguồn quy ước: nội thất nhà phố hẹp xếp tuyến tính dọc tường, chừa lối giữa; bếp chữ I dọc tường với tam giác
 * bếp–chậu–tủ lạnh; tủ áo cao kịch trần sát tường; giường tựa tường đặc, không tựa vách WC (C-CAM-07), không chắn cửa.
 * Mỗi món đặt theo: tựa tường → không chạm vùng mở cửa / lối vào → không chồng món khác → chừa khoảng đi lại.
 * Món nào không đặt vừa thì trả về cảnh báo — đó là dấu hiệu phòng thiếu kích thước.
 */
(function (root) {
  'use strict';
  const K = () => root.ALNCad;
  const n = (a, b) => Math.abs(a - b) < 0.004;
  const inter = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.005 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.005;
  const inside = (a, r) => a.x >= r.x - 1e-3 && a.y >= r.y - 1e-3 && a.x + a.w <= r.x + r.w + 1e-3 && a.y + a.h <= r.y + r.h + 1e-3;
  const WALLS = ['top', 'right', 'bottom', 'left'], ROT = { top: 0, right: 90, bottom: 180, left: 270 };

  // độ dày phần tường ăn vào phòng tại cạnh (theo tường đôi ở gói CAD)
  function inset(g, side, r) {
    const E = { x0: 0, x1: g.B, y0: g.f, y1: g.f + g.Db };
    if (side === 'top') return n(r.y, E.y0) ? 0.2 : 0.05;
    if (side === 'bottom') return n(r.y + r.h, E.y1) ? 0.2 : 0.05;
    if (side === 'left') return n(r.x, E.x0) ? 0.1 : 0.05;
    return n(r.x + r.w, E.x1) ? 0.1 : 0.05;
  }
  function usable(g, r) { const t = inset(g, 'top', r), b = inset(g, 'bottom', r), l = inset(g, 'left', r), rr = inset(g, 'right', r); return { x: r.x + l, y: r.y + t, w: r.w - l - rr, h: r.h - t - b }; }

  // vùng cấm: cánh cửa quét + 0,7 m trước khe cửa (cả hai phía), cửa sổ (cho đồ cao), cầu thang
  function zones(fl, room) {
    const Z = [], W = [];
    for (const d of fl.doors) {
      const G = root.ALNPlan.doorGeom(d);
      const pts = [];
      for (const l of G.lines) pts.push([l[0], l[1]], [l[2], l[3]]);
      for (const c of G.arcs) pts.push([c.cx, c.cy], [c.x0, c.y0], [c.x1, c.y1]);
      if (pts.length) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); Z.push({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }); }
      const c = 0.7; Z.push(d.o === 'h' ? { x: d.a, y: d.at - c, w: d.w, h: 2 * c } : { x: d.at - c, y: d.a, w: 2 * c, h: d.w });
    }
    for (const w of fl.windows) W.push(w.o === 'h' ? { x: w.a, y: w.at - 0.35, w: w.w, h: 0.7 } : { x: w.at - 0.35, y: w.a, w: 0.7, h: w.w });
    for (const s of fl.stairs) Z.push({ x: s.x, y: s.y, w: s.w, h: s.h });
    for (const c of fl.cars) Z.push({ x: c.x - 0.3, y: c.y - 0.3, w: c.w + 0.6, h: c.h + 0.6 });
    for (const a of fl.altars) Z.push({ x: a.x, y: a.y, w: a.w, h: a.h + 0.6 });
    return { Z: Z.filter(z => inter(z, room)), W: W.filter(z => inter(z, room)) };
  }
  // cạnh phòng giáp khu ướt (vách WC) — giường không tựa (C-CAM-07)
  function wetSides(fl, r) {
    const out = new Set();
    for (const q of fl.rooms) {
      if (q === r || q.t !== 'wet') continue;
      if (n(q.y + q.h, r.y) && q.x < r.x + r.w && q.x + q.w > r.x) out.add('top');
      if (n(q.y, r.y + r.h) && q.x < r.x + r.w && q.x + q.w > r.x) out.add('bottom');
      if (n(q.x + q.w, r.x) && q.y < r.y + r.h && q.y + q.h > r.y) out.add('left');
      if (n(q.x, r.x + r.w) && q.y < r.y + r.h && q.y + q.h > r.y) out.add('right');
    }
    return out;
  }
  function hasOpening(fl, r, side) {
    const at = side === 'top' ? r.y : side === 'bottom' ? r.y + r.h : side === 'left' ? r.x : r.x + r.w, o = side === 'top' || side === 'bottom' ? 'h' : 'v';
    const lo = o === 'h' ? r.x : r.y, hi = o === 'h' ? r.x + r.w : r.y + r.h;
    const hit = q => q.o === o && n(q.at, at) && q.a < hi && q.a + q.w > lo;
    return { door: fl.doors.some(hit), win: fl.windows.some(hit) };
  }
  // hộp đặt món t tựa tường side, vị trí s∈[0,1] dọc tường
  function boxAt(t, U, side, s) {
    const L = K().LIB[t], rot = ROT[side], sw = rot % 180 !== 0, bw = sw ? L.h : L.w, bh = sw ? L.w : L.h;
    let x, y;
    if (side === 'top' || side === 'bottom') { x = U.x + (U.w - bw) * s; y = side === 'top' ? U.y : U.y + U.h - bh; }
    else { y = U.y + (U.h - bh) * s; x = side === 'left' ? U.x : U.x + U.w - bw; }
    return { t, rot, x, y, w: bw, h: bh, side };
  }
  // vùng phía trước món (khoảng dùng), theo hướng ra giữa phòng
  function front(b, depth) {
    if (b.side === 'top') return { x: b.x, y: b.y + b.h, w: b.w, h: depth };
    if (b.side === 'bottom') return { x: b.x, y: b.y - depth, w: b.w, h: depth };
    if (b.side === 'left') return { x: b.x + b.w, y: b.y, w: depth, h: b.h };
    return { x: b.x - depth, y: b.y, w: depth, h: b.h };
  }
  function place(ctx, t, opt) {
    opt = opt || {};
    const { U, Z, W, placed, keep } = ctx; let best = null;
    const sides = opt.sides || WALLS;
    const steps = opt.align === 'center' ? [0.5] : opt.align === 'ends' ? [0, 1] : [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
    for (const side of sides) for (const s of steps) {
      const b = boxAt(t, U, side, s);
      if (b.w > U.w + 1e-3 || b.h > U.h + 1e-3) continue;
      if (!inside(b, U)) continue;
      if (Z.some(z => inter(z, b))) continue;
      if (opt.tall && W.some(z => inter(z, b))) continue;
      if (placed.some(p => inter(p, b)) || keep.some(k => inter(k, b))) continue;
      let fz = null;
      if (opt.clear) { fz = front(b, opt.clear); const fzc = { x: Math.max(fz.x, U.x), y: Math.max(fz.y, U.y), w: 0, h: 0 }; fzc.w = Math.min(fz.x + fz.w, U.x + U.w) - fzc.x; fzc.h = Math.min(fz.y + fz.h, U.y + U.h) - fzc.y; if (fzc.w < fz.w - 0.05 || fzc.h < fz.h - 0.05) continue; if (placed.some(p => inter(p, fz))) continue; }
      const sc = (opt.score ? opt.score(b, side, s) : 0) + Math.abs(s - 0.5) * (opt.align === 'corner' ? -1 : 0.3);
      if (opt.all) { (opt.all.list || (opt.all.list = [])).push({ b, sc, fz }); continue; }
      if (!best || sc < best.sc) best = { b, sc, fz };
    }
    if (opt.all) { (opt.all.list || []).sort((a, b) => a.sc - b.sc); return null; }
    if (!best) return null;
    placed.push(best.b); if (best.fz) keep.push(best.fz);
    return best.b;
  }
  function furnishRoom(g, fl, r) {
    const U = usable(g, r); if (U.w < 0.5 || U.h < 0.5) return { items: [], miss: [] };
    const { Z, W } = zones(fl, r), ctx = { U, Z, W, placed: [], keep: [] }, miss = [];
    const op = Object.fromEntries(WALLS.map(s => [s, hasOpening(fl, r, s)])), wet = wetSides(fl, r);
    const longSides = U.w >= U.h ? ['top', 'bottom'] : ['left', 'right'], shortSides = U.w >= U.h ? ['left', 'right'] : ['top', 'bottom'];
    const solid = s => (op[s].door ? 4 : 0) + (op[s].win ? 2 : 0);
    const P = (t, o, why) => { const b = place(ctx, t, o); if (!b) miss.push(why || K().LIB[t].lb); return b; };
    const key = r.key, mn = Math.min(U.w, U.h);
    if (key === 'pn' || key === 'ongba') {
      // thử giường lớn → nhỏ; với mỗi cỡ, thử các vị trí giường từ tốt nhất tới kém, giữ cặp giường + tủ áo đầu tiên đặt vừa
      const sizes = (mn >= 2.9 && U.w * U.h >= 9.5 ? ['giuong_doi', 'giuong_16'] : mn >= 2.5 ? ['giuong_16'] : []).concat(['giuong_don']);
      const bedScore = (b, s) => (op[s].door ? 12 : 0) + (op[s].win ? 9 : 0) + (wet.has(s) ? 8 : 0);
      let done = false, firstBed = null;
      for (const t of sizes) {
        const all = {}; place(ctx, t, { clear: 0.6, score: bedScore, all });
        for (const c of (all.list || []).slice(0, 40)) {
          const bed = c.b, n0 = ctx.placed.length, k0 = ctx.keep.length;
          ctx.placed.push(bed); if (c.fz) ctx.keep.push(c.fz);
          if (t !== 'giuong_don') { const sd = 0.5; const L = bed.side === 'top' || bed.side === 'bottom' ? [{ x: bed.x - sd, y: bed.y, w: sd, h: bed.h }, { x: bed.x + bed.w, y: bed.y, w: sd, h: bed.h }] : [{ x: bed.x, y: bed.y - sd, w: bed.w, h: sd }, { x: bed.x, y: bed.y + bed.h, w: bed.w, h: sd }]; for (const z of L) if (inside(z, U)) ctx.keep.push(z); }
          if (!firstBed) firstBed = { c, t };
          if (place(ctx, 'tu_ao', { tall: true, clear: 0.6, score: (b, s) => (s === bed.side ? 5 : 0) + solid(s) })) { done = true; break; }
          ctx.placed.length = n0; ctx.keep.length = k0;
        }
        if (done) break;
      }
      if (!done) { if (firstBed) { ctx.placed.push(firstBed.c.b); if (firstBed.c.fz) ctx.keep.push(firstBed.c.fz); miss.push('Tủ áo 1,6 m (cạnh giường)'); } else miss.push('Giường'); }
      if (U.w * U.h >= 15) place(ctx, 'ban_lam_viec', { score: (b, s) => (op[s].win ? -1 : 0) });
    } else if (key === 'khach' || key === 'sh' || /khách/i.test(r.lb || '')) {
      // xếp tuyến tính: sofa tựa một tường dài, kệ TV tường đối diện, lối đi ở giữa
      const sofa = place(ctx, 'sofa', { align: 'center', score: (b, s) => solid(s) * 2 });
      if (!sofa) { miss.push('Sofa 2,1 m'); }
      else {
        const opp = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[sofa.side];
        const fz = front(sofa, 0.4), tb = { x: 0, y: 0 };
        const tv = place(ctx, 'ke_tv', { sides: [opp], align: 'center' });
        if (!tv) miss.push('Kệ TV đối diện sofa');
        // bàn trà giữa sofa và TV, cách sofa 0,4 m
        const L = K().LIB.ban_tra, sw = sofa.side === 'left' || sofa.side === 'right';
        const bw = sw ? L.h : L.w, bh = sw ? L.w : L.h;
        const cx = sofa.x + sofa.w / 2, cy = sofa.y + sofa.h / 2;
        const bt = sofa.side === 'top' ? { x: cx - bw / 2, y: sofa.y + sofa.h + 0.4 } : sofa.side === 'bottom' ? { x: cx - bw / 2, y: sofa.y - 0.4 - bh } : sofa.side === 'left' ? { x: sofa.x + sofa.w + 0.4, y: cy - bh / 2 } : { x: sofa.x - 0.4 - bw, y: cy - bh / 2 };
        const bb = { t: 'ban_tra', rot: sw ? 90 : 0, x: bt.x, y: bt.y, w: bw, h: bh, side: sofa.side };
        if (inside(bb, U) && !Z.some(z => inter(z, bb)) && !ctx.placed.some(p => inter(p, bb))) ctx.placed.push(bb);
      }
    } else if (key === 'bep' || key === 'bep_uot') {
      // bếp chữ I dọc tường, tủ lạnh nối đầu tủ bếp; bàn ăn thon dài ở phần còn lại
      const kOpt = { tall: true, clear: 0.9, align: 'corner', score: (b, s) => solid(s) * 2 + (longSides.includes(s) ? 0 : 1) };
      const k = place(ctx, 'bep_i', kOpt) || place(ctx, 'bep_i18', kOpt);
      if (!k) miss.push('Tủ bếp chữ I ≥ 1,8 m');
      else place(ctx, 'tu_lanh', { sides: [k.side], tall: true, score: b => Math.abs((b.x + b.w / 2) - (k.x + k.w / 2)) + Math.abs((b.y + b.h / 2) - (k.y + k.h / 2)) }) || miss.push('Tủ lạnh cạnh tủ bếp');
      if (key === 'bep' && U.w * U.h >= 7) {
        let cand = [];
        for (const [tt, pd] of [['ban_an', 0.3], ['ban_an_hep', 0.2]]) { if (cand.length) break; const L = K().LIB[tt];
        for (const rot of [0, 90]) { const w = rot ? L.h : L.w, h = rot ? L.w : L.h; for (let x = U.x + 0.2; x + w <= U.x + U.w - 0.2 + 1e-6; x += 0.1) for (let y = U.y + 0.2; y + h <= U.y + U.h - 0.2 + 1e-6; y += 0.1) { const b = { t: tt, rot, x, y, w, h }; const pad = { x: x - pd, y: y - pd, w: w + 2 * pd, h: h + 2 * pd }; if (Z.some(z => inter(z, b)) || ctx.placed.some(p => inter(p, pad)) || ctx.keep.some(q => inter(q, b))) continue; cand.push({ b, d: Math.hypot(x + w / 2 - (U.x + U.w / 2), y + h / 2 - (U.y + U.h / 2)) }); } } }
        cand.sort((a, b) => a.d - b.d); if (cand[0]) ctx.placed.push(cand[0].b); else miss.push('Bàn ăn');
      }
    } else if (key === 'wc' || key === 'wc_ongba') {
      // thiết bị thẳng hàng một tường không có cửa: lavabo gần cửa, bồn cầu giữa, sen cuối
      const sides = WALLS.filter(s => !op[s].door).sort((a, b) => (longSides.includes(a) ? 0 : 1) - (longSides.includes(b) ? 0 : 1));
      const doorC = fl.doors.filter(d => inter(d.o === 'h' ? { x: d.a, y: d.at - 0.1, w: d.w, h: 0.2 } : { x: d.at - 0.1, y: d.a, w: 0.2, h: d.w }, { x: r.x - 0.01, y: r.y - 0.01, w: r.w + 0.02, h: r.h + 0.02 })).map(d => d.o === 'h' ? [d.a + d.w / 2, d.at] : [d.at, d.a + d.w / 2])[0] || [r.x, r.y];
      const dist = b => Math.hypot(b.x + b.w / 2 - doorC[0], b.y + b.h / 2 - doorC[1]);
      if (!r.underStair && mn >= 1.5 && Math.max(U.w, U.h) >= 2.0) place(ctx, 'sen_tam', { align: 'ends', sides, score: b => -dist(b) }) || miss.push('Sen tắm 0,9');
      place(ctx, 'bon_cau', { sides, clear: 0.5, score: b => -dist(b) * 0.3 }) || miss.push('Bồn cầu');
      place(ctx, 'lavabo', { sides, clear: 0.5, score: b => dist(b) }) || miss.push('Lavabo');
    } else if (key === 'giat') {
      place(ctx, 'may_giat', { clear: 0.6 }) || miss.push('Máy giặt');
    }
    return { items: ctx.placed.map(b => ({ t: b.t, x: Math.round(b.x * 1000) / 1000, y: Math.round(b.y * 1000) / 1000, rot: b.rot, auto: true, room: r.id })), miss };
  }
  function furnishFloor(g, fl) {
    const out = [], miss = [];
    if (fl.isTum) return { items: out, miss };
    for (const r of fl.rooms) { const res = furnishRoom(g, fl, r); out.push(...res.items); if (res.miss.length) miss.push({ room: r.lb || r.key, items: res.miss }); }
    return { items: out, miss };
  }
  function furnishPlan(g, P) {
    const report = [];
    for (const fl of P.floors) {
      if (fl.edited) continue; // tầng KTS đã chỉnh tay: giữ đồ của KTS
      const res = furnishFloor(g, fl);
      fl.furn = res.items;
      fl.furnMiss = res.miss;
      for (const m of res.miss) report.push(`${fl.name} · ${m.room}: không đặt vừa ${m.items.join(', ')}`);
    }
    return report;
  }
  const api = { furnishRoom, furnishFloor, furnishPlan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ALNFurnish = api;
})(typeof window !== 'undefined' ? window : globalThis);
