/**
 * aln-pricing.js — nguồn cấu hình giá DUY NHẤT cho Gói Kiểm nhanh/Đồng hành
 * xây (SPEC_KHONG_GIAN_NHA_DU_TOAN_v1.md mục 3). Dùng ở khong-gian-nha.html
 * (P1.3, hiển thị bảng giá — CHƯA có luồng mua/thanh toán, Phase 3 mới có).
 *
 * TẤT CẢ số tiền/chính sách hiển thị PHẢI tính từ đây — không hardcode rải
 * rác ở trang khác. Số liệu (`don_gia_moc`, `so_moc_mien_phi`, tỷ lệ chia
 * đợt, % giảm trả 1 lần, `thue_suat_vat`...) đã đối chiếu ĐỦ 7 dòng bảng
 * kiểm mục 3 của spec (2–8 sàn) + phí bóc 2 mốc (300m²/200m²) — xem
 * scripts/_test_aln_pricing.js.
 *
 * CƠ CẤU GÓI (Founder chốt 22/09/2026, sửa từ bản đầu 20/09/2026 — bản đầu
 * gán NHẦM phí bóc khối lượng cho Gói Kiểm nhanh, đúng ra phí bóc thuộc
 * Gói Đồng hành xây):
 *   - Gói Kiểm nhanh = MIỄN PHÍ (có hạn mức lượt dùng/tuần, số cụ thể CHƯA
 *     chốt) — đọc bản vẽ ra 3 con số diện tích, đối chiếu báo giá, KHÔNG
 *     thu tiền, KHÔNG dùng `tinhPhiBoc`.
 *   - Gói Đồng hành xây = phí bóc khối lượng (`tinhPhiBoc`) + phí theo mốc
 *     (`tinhDongHanh`), CỘNG LẠI thành 1 tổng — dùng `tinhGoiDongHanh()`.
 *
 * `thue_suat_vat: 8` là TẠM TÍNH áp tới 31/12/2026 theo spec — kế toán xác
 * nhận diện áp dụng, CHƯA phải quyết định cuối cùng (xem mục 8 "Việc còn
 * mở" của spec).
 *
 * UMD: dùng qua <script src> (window.ALN_PRICING) hoặc require() (Node,
 * cho test thuần — CHƯA có Cloud Function nào cần bản đồng bộ trong
 * functions/, khác du-toan-nha-calc.js — chỉ thêm sync+CI-check kiểu đó
 * nếu Phase 3 (thanh toán) thật sự cần đọc file này server-side).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ALN_PRICING = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PRICING = {
    thue_suat_vat: 8, // % — TẠM TÍNH tới 31/12/2026, kế toán xác nhận diện áp dụng (spec mục 8)
    boc: {
      don_gia_m2: 8000, // đ/m² quy đổi, chưa VAT
      toi_thieu: 2000000, // đ, chưa VAT
    },
    dong_hanh: {
      don_gia_moc: 400000, // đ/mốc, chưa VAT — TẠM TÍNH, Founder có thể đổi (spec mục 8)
      so_moc: function (soSan) { return soSan + 3; }, // móng + mỗi lần đổ sàn phía trên (gồm sàn mái/sân thượng) + hoàn thiện + hoàn công
      so_moc_mien_phi: 1, // mốc móng miễn phí — CHỈ áp cho phần đồng hành, KHÔNG áp cho phí bóc
      chia_dot: [0.40, 0.40, 0.20], // sau nghiệm thu móng / xong phần thô (đổ xong sàn mái) / hoàn công
      tra_1_lan: { giam: 0.10, lam_tron: 50000 }, // chọn SAU khi nghiệm thu móng — làm tròn đến 50.000đ gần nhất
      bao_luu_thang: 24, // đề xuất — Founder xác nhận (spec mục 8)
    },
  };

  function round50k(x) {
    return Math.round(x / 50000) * 50000;
  }

  /** sau_vat = round(chua_vat × (1 + thue_suat/100)) — làm tròn đồng, không làm tròn 50k (chỉ trả 1 lần mới làm tròn 50k, ở BƯỚC TRƯỚC khi áp VAT). */
  function apDungVat(chuaVat) {
    return Math.round(chuaVat * (1 + PRICING.thue_suat_vat / 100));
  }

  /** phi_boc = max(8.000 × diện tích quy đổi, 2.000.000) — thu NGAY khi nhận hồ sơ, trước khi bóc. */
  function tinhPhiBoc(dienTichQuyDoi) {
    var chuaVat = Math.max(PRICING.boc.don_gia_m2 * (Number(dienTichQuyDoi) || 0), PRICING.boc.toi_thieu);
    return { chuaVat: chuaVat, sauVat: apDungVat(chuaVat) };
  }

  /**
   * tinhDongHanh(soSan) — toàn bộ số của Gói Đồng hành xây cho 1 số sàn.
   * mocTinhTien = so_moc(soSan) − so_moc_mien_phi (mốc móng miễn phí không
   * tính tiền — số mốc HIỂN THỊ trong bảng giá spec mục 3 là số này, KHÔNG
   * phải so_moc() thô).
   */
  function tinhDongHanh(soSan) {
    var d = PRICING.dong_hanh;
    var soMoc = d.so_moc(Number(soSan) || 0);
    var mocTinhTien = soMoc - d.so_moc_mien_phi;
    var chuaVat3Dot = d.don_gia_moc * mocTinhTien;
    var dotChuaVat = d.chia_dot.map(function (ty_le) { return Math.round(chuaVat3Dot * ty_le); });
    var tra1LanChuaVat = round50k(chuaVat3Dot * (1 - d.tra_1_lan.giam));
    return {
      soSan: Number(soSan) || 0,
      soMoc: soMoc,
      mocTinhTien: mocTinhTien,
      chuaVat3Dot: chuaVat3Dot,
      sauVat3Dot: apDungVat(chuaVat3Dot),
      dotChuaVat: dotChuaVat,
      tra1LanChuaVat: tra1LanChuaVat,
      tra1LanSauVat: apDungVat(tra1LanChuaVat),
    };
  }

  /**
   * tinhGoiDongHanh(dienTichQuyDoi, soSan) — TỔNG giá Gói Đồng hành xây =
   * phí bóc khối lượng (tinhPhiBoc, thu 1 lần trước khi bóc) + phí theo mốc
   * (tinhDongHanh, chia 3 đợt hoặc trả 1 lần). Tổng = CỘNG 2 số ĐÃ tính VAT
   * riêng (boc.sauVat + moc.sauVat3Dot), KHÔNG cộng 2 số chưa VAT rồi áp VAT
   * 1 lần trên tổng — để dòng "gồm bóc khối lượng X + theo mốc Y" hiển thị
   * trên UI LUÔN cộng khớp đúng bằng tổng hiển thị (không lệch do làm tròn
   * 2 lần khác nhau). Đã đối chiếu khớp ví dụ Founder xác nhận 22/09/2026
   * (2 sàn / 432 m² quy đổi): 3 đợt chưa VAT 5.056.000/sau VAT 5.460.480,
   * trả 1 lần chưa VAT 4.906.000/sau VAT 5.298.480 — xem scripts/_test_aln_pricing.js.
   */
  function tinhGoiDongHanh(dienTichQuyDoi, soSan) {
    var boc = tinhPhiBoc(dienTichQuyDoi);
    var moc = tinhDongHanh(soSan);
    return {
      boc: boc,
      moc: moc,
      chuaVat3Dot: boc.chuaVat + moc.chuaVat3Dot,
      sauVat3Dot: boc.sauVat + moc.sauVat3Dot,
      chuaVatTra1Lan: boc.chuaVat + moc.tra1LanChuaVat,
      sauVatTra1Lan: boc.sauVat + moc.tra1LanSauVat,
    };
  }

  return {
    PRICING: PRICING,
    round50k: round50k,
    apDungVat: apDungVat,
    tinhPhiBoc: tinhPhiBoc,
    tinhDongHanh: tinhDongHanh,
    tinhGoiDongHanh: tinhGoiDongHanh,
  };
});
