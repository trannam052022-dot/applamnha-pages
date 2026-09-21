/**
 * du-toan-nha-calc.js — hàm tính THUẦN (không đụng DOM), dùng chung cho
 * du-toan-nha.html (client) VÀ Cloud Function saveEstimateToHouse
 * (functions/saveEstimateToHouse.js, qua bản copy đồng bộ trong
 * functions/du-toan-nha-shared/ — xem scripts/sync-dutoan-nha-calc.js).
 *
 * Port nguyên vẹn logic areas()/cur()/price()/run() từng nhúng inline trong
 * du-toan-nha.html (P1.1) — KHÔNG đổi công thức, chỉ bỏ mọi chỗ đọc/ghi DOM
 * (id, localStorage) để dùng lại được phía Cloud Function. Quyết định P1.2
 * (19-20/09/2026): "Tách DATA + hàm tính ra module dùng chung client +
 * Cloud Function. Test bắt buộc: nhập đúng diện tích nhà mẫu (qd=161,09222,
 * mep theo A0 mẫu, ql 23,834107892826273%) → Mr Thi ra 5.015.763 đ/m², A
 * Hoàng (qd=404,42) ra 5.878.168 đ/m²; server và client ra cùng số." — xem
 * functions/_test_duToanCalc.js cho 2 mốc kiểm chứng này.
 *
 * UMD: dùng được cả qua <script src> (window.ALN_DUTOAN_CALC) lẫn require()
 * (Node/Cloud Functions). Phụ thuộc du-toan-nha-data.js phải nạp TRƯỚC khi
 * dùng qua <script src> (browser); phía Node truyền DATA/GROUPS vào qua
 * require() trực tiếp (xem functions/saveEstimateToHouse.js).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ALN_DUTOAN_CALC = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function num(v) {
    var x = parseFloat(v);
    return isFinite(x) ? x : 0;
  }

  function fmt(n) {
    return Math.round(n).toLocaleString("vi-VN");
  }

  /**
   * pickModel(n, tm) — chọn nhà mẫu 'thi' hay 'hoang'. Nguyên văn cur() gốc:
   * (tm truthy HOẶC n>=6) → 'hoang', ngược lại 'thi'.
   */
  function pickModel(n, tm) {
    var nn = num(n);
    var tmv = typeof tm === "string" ? num(tm) : tm;
    return (tmv || nn >= 6) ? "hoang" : "thi";
  }

  /**
   * MAI_LOAI — tỷ lệ quy đổi diện tích mái theo loại mái (Founder chốt
   * 21/09/2026, sau khi phát hiện bug computeAreas() cộng nhầm mái vào m²
   * thực xây — xem bugfix bên dưới). Tỷ lệ này CHỈ ảnh hưởng `qd` (m² quy
   * đổi) — mái KHÔNG BAO GIỜ cộng vào `tx` (m² thực xây), bất kể loại mái.
   *
   * `canhBaoKhacMauMacDinh`: 2 nhà mẫu (Mr Thi, A Hoàng) đều xây mái BTCT
   * phẳng thật — khối lượng "cốt thép/bê tông sàn mái" trong du-toan-nha-data.js
   * chỉ đúng cho loại mái này. Chọn loại mái khác vẫn TÍNH ĐƯỢC (đổi đúng
   * tỷ lệ quy đổi `qd`), nhưng khối lượng vật tư mái vẫn lấy nguyên theo nhà
   * mẫu mái bằng — không có nhà mẫu riêng cho tôn/ngói nên KHÔNG BỊA khối
   * lượng khác, chỉ cảnh báo (xem ghiChuMai()).
   */
  var MAI_LOAI = {
    ton: { label: "Mái tôn", tyLe: 0.30, canhBaoKhacMauMacDinh: true },
    btct_phang: { label: "Mái BTCT phẳng", tyLe: 0.50, canhBaoKhacMauMacDinh: false },
    ngoi_keo_thep: { label: "Mái ngói kèo thép", tyLe: 0.70, canhBaoKhacMauMacDinh: true },
    btct_dan_ngoi: { label: "Mái BTCT dán ngói / mái Thái", tyLe: 1.00, canhBaoKhacMauMacDinh: true },
  };
  var MAI_LOAI_MAC_DINH = "btct_phang";

  /** Tỷ lệ quy đổi mái theo `loai` — không khớp key nào trong MAI_LOAI thì
   * dùng mặc định MAI_LOAI_MAC_DINH (khớp hành vi cũ trước khi có chọn loại
   * mái: hằng số cứng 0.5). */
  function tyLeMai(loai) {
    var m = MAI_LOAI[loai];
    return m ? m.tyLe : MAI_LOAI[MAI_LOAI_MAC_DINH].tyLe;
  }

  /** Ghi chú cảnh báo khi loại mái KHÁC nhà mẫu (BTCT phẳng) — null nếu
   * đúng nhà mẫu hoặc loại không hợp lệ (không cảnh báo mù, giữ nguyên hành
   * vi mặc định). */
  function ghiChuMai(loai) {
    var m = MAI_LOAI[loai];
    if (!m || !m.canhBaoKhacMauMacDinh) return null;
    return "Khối lượng mái đang tính theo nhà mẫu mái bằng (BTCT phẳng) — chênh lệch mái thật sẽ được bóc khi có bản vẽ.";
  }

  /**
   * kiemTraNgoaiVung(inputs) — chặn ước tính cho các trường hợp NGOÀI vùng
   * dữ liệu nhà mẫu hiện có (Mr Thi 4-5 tầng, A Hoàng 6-8 tầng), TRẢ VỀ
   * chuỗi thông báo (hiện cho chủ nhà) hoặc null nếu trong vùng tính được.
   * DÙNG CHUNG client (du-toan-nha.html run()) VÀ server
   * (functions/saveEstimateToHouse.js xuLyLuu()) — tách ra đây từ 19-20/09/2026
   * (2 chỗ đã lặp gần giống nhau, dễ lệch khi thêm luật mới) SAU KHI phát
   * hiện thêm luật "nhà 1 tầng/cấp 4" 21/09/2026, để không phải nhớ sửa cả
   * 2 nơi mỗi lần thêm 1 điều kiện out-of-scope.
   */
  function kiemTraNgoaiVung(inputs) {
    var d = inputs || {};
    var n = num(d.n);
    var hamRaw = d.ham;
    var ham = typeof hamRaw === "string" ? num(hamRaw) : hamRaw;
    if (ham) {
      return "ALN chưa có nhà mẫu có tầng hầm, chưa ước tính được. Gửi thông tin để KTS ALN ước tính riêng cho nhà bạn.";
    }
    if (n === 1) {
      return "ALN chưa có nhà mẫu cho nhà 1 tầng / nhà cấp 4 — gửi thông tin để KTS ước tính riêng.";
    }
    if (n > 8) {
      return "Nhà trên 8 sàn nằm ngoài vùng ALN đã có dữ liệu. Gửi thông tin để KTS ALN ước tính riêng.";
    }
    return null;
  }

  /**
   * computeAreas(inputs) — nguyên văn areas() gốc, chỉ đổi nguồn đọc từ DOM
   * sang object `inputs`: {w1,w2,l1,l2,n,st,sant,bc,mai,mai_loai,mong}.
   * - st: hệ số sân thượng (0 | 0.7 | 1), KHÔNG phải chuỗi id option.
   * - mai: số (m²) HOẶC '' | null | undefined để áp mặc định như UI gốc
   *   (mai = st ? 0 : fp — tự điền theo diện tích tầng trệt khi không có
   *   sân thượng).
   * - mai_loai: khoá trong MAI_LOAI ('ton'|'btct_phang'|'ngoi_keo_thep'|
   *   'btct_dan_ngoi') — quyết định tỷ lệ quy đổi mái vào `qd`. Thiếu/lạ ->
   *   dùng MAI_LOAI_MAC_DINH (btct_phang, 50% — khớp hằng số cứng cũ).
   * Trả về {fp, tx, qd, km} — km = qd trừ diện tích móng quy đổi.
   *
   * BUGFIX 21/09/2026 (Founder phát hiện: nhà 10x20, 1 sàn, không sân thượng
   * ra 400 m² thực xây thay vì đúng 200 m²) — mái (`mai`) TRƯỚC ĐÂY cộng
   * thẳng vào `tx` (thực xây) NGOÀI việc đã tính vào `qd` (quy đổi, x0.5),
   * khiến nhà không sân thượng (mái tự điền = full diện tích tầng trệt) bị
   * đếm mái 2 LẦN — 1 lần nguyên vẹn trong tx, 1 lần theo tỷ lệ trong qd.
   * Đúng ra mái KHÔNG PHẢI diện tích sàn sử dụng được nên KHÔNG được tính
   * vào thực xây — thực xây = sàn các tầng + sân thượng (nếu có mái riêng)
   * + ban công + sân trước; mái chỉ vào quy đổi theo đúng tỷ lệ loại mái.
   */
  function computeAreas(inputs) {
    var d = inputs || {};
    var w = (num(d.w1) + num(d.w2)) / 2;
    var l = (num(d.l1) + num(d.l2)) / 2;
    var fp = w * l;
    var n = num(d.n);
    var stp = num(d.st);
    var sant = w * num(d.sant);
    var bc = num(d.bc);
    var mg = num(d.mong) / 100;
    var mai = d.mai;
    if (mai === "" || mai === null || typeof mai === "undefined") {
      mai = stp ? 0 : fp;
    }
    mai = num(mai);
    var maiTyLe = tyLeMai(d.mai_loai);
    var stA = stp ? fp : 0;
    var tx = fp * n + stA + sant + bc;
    var mongDienTich = mg * (fp + sant);
    var qd = fp * n + stA * stp + sant * 0.7 + bc + mai * maiTyLe + mongDienTich;
    return { fp: fp, tx: tx, qd: qd, km: qd - mongDienTich };
  }

  /**
   * computeEstimate(params, ctx) — nguyên văn phần tính tiền của run() gốc
   * (từ `const f=a.qd/S.A` tới hết), tách khỏi phần render/DOM.
   *
   * params:
   *   modelKey: 'thi' | 'hoang'
   *   qd, km: số — diện tích quy đổi / quy đổi trừ móng (từ computeAreas)
   *   priceOverrides: {tenVatTu: giá} — chỉ override, thiếu thì dùng giá
   *     mặc định S.prices[tenVatTu] (nguyên văn price() gốc)
   *   nhanCong: {cheDo: 'khoan'|'cong', khoanDonGia, congDonGia}
   *   mepDonGia: đ/m² điện nước khoán (tính trên `km`, KHÔNG phải `qd`)
   *   qlPct, vatPct: số (%)
   *
   * ctx: { DATA, GROUPS } — inject từ ngoài (browser: window.ALN_DUTOAN_DATA;
   *   Cloud Function: require du-toan-nha-data.js) thay vì import cứng bên
   *   trong, để 1 file .js này không phụ thuộc thứ tự nạp cụ thể.
   *
   * Trả về đúng hình dạng lines/tổng client đang render (rows/rowsH), CỘNG
   * thêm vài field tổng hợp máy đọc được (totalChuaVat, perM2ChuaVat...) để
   * Cloud Function ghi thẳng vào `du_toan_versions.ket_qua` không cần tính
   * lại lần nữa ở lớp gọi.
   */
  function computeEstimate(params, ctx) {
    var p = params || {};
    var DATA = ctx && ctx.DATA;
    var GROUPS = ctx && ctx.GROUPS;
    if (!DATA || !GROUPS) throw new Error("computeEstimate: thiếu ctx.DATA/ctx.GROUPS.");
    var S = DATA[p.modelKey];
    if (!S) throw new Error("computeEstimate: modelKey không hợp lệ: " + p.modelKey);

    var qd = num(p.qd);
    var km = num(p.km);
    var priceOverrides = p.priceOverrides || {};

    function price(m) {
      var ov = priceOverrides[m];
      return (ov !== undefined && ov !== null && ov !== "") ? num(ov) : S.prices[m];
    }

    var f = S.A ? qd / S.A : 0;
    var g = {}, gh = {}, gi = {}, ghi = {};
    var may = 0, cau = 0, cong = 0;

    S.items.forEach(function (it) {
      var vt = it.lt, vh = it.lh;
      for (var mt in it.t) vt += it.t[mt] * price(mt);
      for (var mh in it.h) vh += it.h[mh] * price(mh);
      vt *= f; vh *= f;
      may += it.m * f;
      cau += it.k * S.b58 * f;
      cong += it.c * f;
      var G = GROUPS[it.g] || it.g;
      if (vt > 0) {
        g[G] = (g[G] || 0) + vt;
        (gi[G] = gi[G] || []).push([it.n, it.q * f, it.u, vt]);
      }
      if (vh > 0) {
        gh[G] = (gh[G] || 0) + vh;
        (ghi[G] = ghi[G] || []).push([it.n, it.q * f, it.u, vh]);
      }
    });

    var nhanCong = p.nhanCong || {};
    var cheDo = nhanCong.cheDo === "cong" ? "cong" : "khoan";
    var khoanDonGia = num(nhanCong.khoanDonGia);
    var congDonGia = num(nhanCong.congDonGia);
    var nc = cheDo === "khoan" ? khoanDonGia * qd : congDonGia * cong;
    var mepDonGia = num(p.mepDonGia);
    var mep = mepDonGia * km;
    var bp = S.bp * f;

    var lines = [];
    Object.keys(GROUPS).map(function (k) { return GROUPS[k]; }).forEach(function (G) {
      if (g[G]) lines.push({ n: "Vật tư — " + G.toLowerCase(), v: g[G], items: gi[G] });
    });
    lines.push({
      n: "Nhân công" + (cheDo === "khoan" ? " khoán" : " theo ngày công"),
      v: nc,
      tag: cheDo === "khoan" ? (fmt(khoanDonGia) + " đ/m²") : (fmt(cong) + " công"),
    });
    lines.push({ n: "Điện nước khoán", v: mep, tag: "gồm công, vật tư, lãi thầu điện nước" });
    lines.push({ n: "Máy thi công" + (cau > 0 ? " & vận thăng" : ""), v: may + cau });
    lines.push({ n: "Giàn giáo, che chắn, biện pháp thi công", v: bp });

    var base = lines.reduce(function (s, x) { return s + x.v; }, 0);
    var qlPct = num(p.qlPct);
    var ql = base * qlPct / 100;
    lines.push({
      n: "Quản lý & lợi nhuận của nhà thầu",
      v: ql,
      tag: qlPct.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "% — chi phí thật của đơn vị thi công",
    });

    var total = base + ql;
    var vatPct = num(p.vatPct);
    var totalSauVat = total * (1 + vatPct / 100);
    var perM2 = qd > 0 ? total / qd : 0;

    var lineHoanThien = Object.keys(GROUPS).map(function (k) { return GROUPS[k]; })
      .filter(function (G) { return gh[G]; })
      .map(function (G) { return { n: G, v: gh[G], items: ghi[G] }; });
    var totalHoanThien = lineHoanThien.reduce(function (s, x) { return s + x.v; }, 0);

    return {
      modelKey: p.modelKey,
      modelLabel: S.label,
      qd: qd,
      km: km,
      congDinhMuc: cong,
      lines: lines,
      totalChuaVat: total,
      vatPct: vatPct,
      totalSauVat: totalSauVat,
      perM2ChuaVat: perM2,
      lineHoanThien: lineHoanThien,
      totalHoanThien: totalHoanThien,
    };
  }

  return {
    num: num,
    fmt: fmt,
    pickModel: pickModel,
    computeAreas: computeAreas,
    computeEstimate: computeEstimate,
    kiemTraNgoaiVung: kiemTraNgoaiVung,
    MAI_LOAI: MAI_LOAI,
    MAI_LOAI_MAC_DINH: MAI_LOAI_MAC_DINH,
    tyLeMai: tyLeMai,
    ghiChuMai: ghiChuMai,
  };
});
