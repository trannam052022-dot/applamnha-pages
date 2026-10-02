/**
 * du-toan-nha-ui.js — phần tính THUẦN được phép CÔNG KHAI của công cụ dự toán
 * (du-toan-nha.html): parse số, diện tích, chọn nhà mẫu, luật ngoài vùng,
 * hằng số mái/móng. KHÔNG chứa bảng khối lượng/hao phí nhà mẫu lẫn công
 * thức ra tiền — 2 thứ đó nằm ở functions/du-toan-nha-shared/
 * (du-toan-nha-data.js + du-toan-nha-calc.js) và CHỈ chạy trên Cloud
 * Function `tinhDuToanNha` (02/10/2026, tách từ du-toan-nha-calc.js để
 * đối thủ không tải được định mức qua View Source).
 *
 * Nguồn gốc: 1 file gốc repo, copy sang functions/du-toan-nha-shared/ bằng
 * scripts/sync-dutoan-nha-calc.js (CI check-dutoan-nha-calc-sync.js chặn lệch).
 * du-toan-nha-calc.js (máy chủ) require() file này để dùng chung num()/
 * computeAreas()… — sửa công thức ở ĐÂY, không chép lại bên calc.
 *
 * UMD: <script src> → window.ALN_DUTOAN_UI; Node → require().
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ALN_DUTOAN_UI = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  /**
   * num(v) — parse LINH HOẠT số kiểu Việt Nam (dấu phẩy thập phân, dấu chấm
   * ngăn cách hàng nghìn) LẪN kiểu Mỹ (dấu chấm thập phân, dấu phẩy ngăn
   * cách hàng nghìn). Quy tắc:
   *  - Có CẢ 2 loại dấu: dấu xuất hiện SAU CÙNG là thập phân, dấu còn lại bị
   *    coi là ngăn cách hàng nghìn (bỏ). VD "1.234,56"→1234.56, "1,234.56"→1234.56.
   *  - CHỈ 1 loại dấu, xuất hiện NHIỀU LẦN và MỌI cụm sau dấu đầu tiên đều
   *    ĐÚNG 3 CHỮ SỐ → coi là ngăn cách hàng nghìn thuần tuý (không có phần
   *    thập phân thật). VD "650.000"→650000, "1.500.000"→1500000.
   *  - CHỈ 1 loại dấu, còn lại (xuất hiện 1 lần, hoặc nhiều lần nhưng không
   *    khớp mẫu 3-chữ-số) → coi LÀ thập phân. VD "0,8"→0.8, "10.5"→10.5.
   *
   * THÊM 21/09/2026 (4) — sự cố production PR #219: input type="number"
   * chuẩn HTML5 CHỈ chấp nhận dấu CHẤM làm thập phân, dấu PHẨY bị từ chối
   * hoàn toàn khiến `.value` trả về CHUỖI RỖNG (không phải lỗi/NaN) khi gõ
   * kiểu Việt Nam (vd "0,8") — `Number("")===0` nên lọt qua validate range
   * dưới dạng số 0 "hợp lệ" thay vì báo lỗi rõ ràng (server báo nhầm "Độ dốc
   * mái phải trong khoảng [10, 60]" dù ô hiển thị đúng 35, vì field KHÁC
   * — "Độ đua mái" — gõ "0,8" bị rỗng làm lệch state). Đã đổi 3 field mái
   * Thái (dua/doc_mai/dong_gia_mai_thai) sang type="text" (xem
   * du-toan-nha.html) để `.value` giữ ĐÚNG chuỗi người dùng gõ — BẮT BUỘC
   * dùng num() NÀY (hàm DUY NHẤT dùng chung client + Cloud Function qua
   * functions/du-toan-nha-shared/) để parse, KHÔNG dùng Number()/parseFloat()
   * trực tiếp cho bất kỳ field nào cho phép gõ tay kiểu Việt Nam.
   *
   * GIỚI HẠN CÒN LẠI (chấp nhận được — cực hiếm gặp với các field hiện có):
   * số CHỈ 1 loại dấu, xuất hiện 1 lần, VÀ đúng 3 chữ số sau dấu (vd người
   * dùng gõ "0,800" định ý nghĩa 0.8) sẽ bị hiểu NHẦM thành số nguyên 800 —
   * validate range server-side sẽ bắt được ngay (800 ngoài khoảng cho phép
   * của mọi field hiện có), KHÔNG âm thầm sai.
   *
   * SỬA 21/09/2026 (5) — Founder yêu cầu chuỗi RỖNG hoặc KHÔNG parse được
   * ("", "abc") phải trả về NaN, KHÔNG còn coi là 0: bản trước trả 0 cho cả
   * 2 ca này để tiện cho việc tính live-preview (field đang gõ dở không làm
   * vỡ UI) — nhưng CHÍNH việc "0" giả này là gốc rễ sự cố PR #219 (server
   * `soHopLe()` gọi `Number.isFinite(n)` để phân biệt "không phải số" với
   * "ngoài khoảng", nếu num() luôn trả 0 thì nhánh "không phải số" không
   * bao giờ chạy được — lỗi thật (field rỗng) bị báo nhầm thành lỗi khác
   * ("ngoài khoảng [10,60]"), như đã xảy ra thật trong production). Số ĐÃ
   * là number JS (kể cả NaN/Infinity) và null/undefined (sentinel nội bộ,
   * KHÔNG phải input người dùng gõ) vẫn giữ nguyên trả 0 — không đổi, vì đó
   * là 2 trường hợp khác hẳn "người dùng gõ chuỗi không hợp lệ".
   */
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v === null || typeof v === "undefined") return 0;
    var s = String(v).trim();
    if (s === "") return NaN;
    var am = false;
    if (s.charAt(0) === "-") { am = true; s = s.slice(1); }
    s = s.replace(/[^0-9.,]/g, "");
    if (s === "") return NaN;

    function laNhomHangNghin(chuoi, dauTach) {
      var nhom = chuoi.split(dauTach);
      if (nhom.length < 2) return false;
      for (var i = 1; i < nhom.length; i++) if (nhom[i].length !== 3) return false;
      return true;
    }

    var coComma = s.indexOf(",") !== -1;
    var coDot = s.indexOf(".") !== -1;
    var ketQua;
    if (!coComma && !coDot) {
      ketQua = parseFloat(s);
    } else if (coComma && coDot) {
      var iComma = s.lastIndexOf(","), iDot = s.lastIndexOf(".");
      ketQua = iComma > iDot
        ? parseFloat(s.slice(0, iComma).replace(/[.,]/g, "") + "." + s.slice(iComma + 1).replace(/[.,]/g, ""))
        : parseFloat(s.slice(0, iDot).replace(/[.,]/g, "") + "." + s.slice(iDot + 1).replace(/[.,]/g, ""));
    } else {
      var dau = coComma ? "," : ".";
      if (laNhomHangNghin(s, dau)) {
        ketQua = parseFloat(s.split(dau).join(""));
      } else {
        var iDau = s.lastIndexOf(dau);
        ketQua = parseFloat(s.slice(0, iDau).split(dau).join("") + "." + s.slice(iDau + 1));
      }
    }
    if (!isFinite(ketQua)) return NaN;
    return am ? -ketQua : ketQua;
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
    // n===1 KHÔNG còn bị chặn từ 21/09/2026 (2) — chuyển sang tính riêng qua
    // computeBietThuVuonMaiThai() (Biệt thự vườn 1 tầng mái Thái), xem bên
    // dưới. Trước đó bị chặn hẳn ("nhà cấp 4") vì chưa có công thức riêng.
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

  var MAI_THAI_MAC_DINH = { dua: 0.6, docDo: 35, donGia: 650000 };

  /** Móng mặc định cho Biệt thự vườn 1 tầng — Founder chốt 21/09/2026 (3):
   * móng đơn 50% (KHÁC mặc định 70% "móng cọc" của nhà phố nhiều tầng —
   * xem MONG_MAC_DINH_NHA_PHO ngay dưới, dùng để client tự đổi giá trị
   * hiển thị khi chuyển qua lại 2 chế độ mà chưa bị người dùng tự sửa). */
  var MONG_MAC_DINH_BIET_THU_VUON = 50;
  var MONG_MAC_DINH_NHA_PHO = 70;

  /** Hệ số quy đổi diện tích nằm ngang -> diện tích mái nghiêng theo độ dốc
   * (độ, KHÔNG phải radian) — công thức hình học chuẩn 1/cos(góc dốc).
   * docDo<=0 hoặc >=90 (mái không nghiêng được hoặc thẳng đứng) -> trả 0,
   * KHÔNG chia cho 0/số âm (Math.cos ở biên có thể ra số âm/rất nhỏ). */
  function heSoDocMaiThai(docDo) {
    var d = num(docDo);
    if (d <= 0 || d >= 90) return 0;
    var c = Math.cos((d * Math.PI) / 180);
    return c > 0 ? 1 / c : 0;
  }

  /**
   * computeMaiThai(params) — diện tích + thành tiền khối mái Thái, TÁCH RIÊNG
   * khỏi computeEstimate() (mái Thái không đi qua bảng vật tư/nhân công của
   * nhà mẫu — trọn gói theo giá thị trường, đã gồm công lợp).
   *
   * params: { w, l, dua, docDo, donGia } — w/l là bề rộng/bề sâu MẶT BẰNG nhà
   * (đã lấy trung bình 2 cạnh, KHÔNG phải w1/w2/l1/l2 thô — dùng lại đúng w/l
   * mà computeAreasBietThuVuon() bên dưới đã tính, tránh tính trùng 2 nơi).
   *
   * dienTichNghieng = (l + 2×dua) × (w + 2×dua) × hệ số dốc.
   * qdHienThi = 70% × dienTichNghieng — Founder chốt hiển thị "m² quy đổi"
   * phần mái theo đúng tỷ lệ thị trường cho mái ngói/kèo thép (khớp
   * MAI_LOAI.ngoi_keo_thep.tyLe ở trên — CÙNG 1 con số, không định nghĩa lại
   * hằng số riêng để tránh lệch nếu sau này đổi tỷ lệ đó).
   */
  function computeMaiThai(params) {
    var p = params || {};
    var w = num(p.w), l = num(p.l), dua = num(p.dua);
    var heSoDoc = heSoDocMaiThai(p.docDo);
    var dienTichNghieng = (l + 2 * dua) * (w + 2 * dua) * heSoDoc;
    var donGia = num(p.donGia);
    var thanhTien = dienTichNghieng * donGia;
    var qdHienThi = dienTichNghieng * MAI_LOAI.ngoi_keo_thep.tyLe;
    return { dienTichNghieng: dienTichNghieng, heSoDoc: heSoDoc, donGia: donGia, thanhTien: thanhTien, qdHienThi: qdHienThi };
  }

  /**
   * computeAreasBietThuVuon(inputs) — diện tích PHẦN THÂN của biệt thự vườn
   * 1 tầng mái Thái. KHÁC computeAreas() ở chỗ: n LUÔN = 1 (định nghĩa của
   * loại nhà này), KHÔNG có sân thượng/mái phẳng (toàn bộ mái là mái Thái,
   * tính riêng qua computeMaiThai() — KHÔNG gọi hàm này cho phần mái).
   * inputs: {w1,w2,l1,l2,sant,bc,mong} — KHÔNG đọc n/st/tm/ham/mai/mai_loai
   * (không áp dụng cho loại nhà này).
   * Trả về {fp, w, l, txThan, qdThan, kmThan, mongDienTich}.
   */
  function computeAreasBietThuVuon(inputs) {
    var d = inputs || {};
    var w = (num(d.w1) + num(d.w2)) / 2;
    var l = (num(d.l1) + num(d.l2)) / 2;
    var fp = w * l;
    var sant = w * num(d.sant);
    var bc = num(d.bc);
    var mg = num(d.mong) / 100;
    var mongDienTich = mg * (fp + sant);
    var txThan = fp + sant + bc;
    var qdThan = fp + sant * 0.7 + bc + mongDienTich;
    return { fp: fp, w: w, l: l, txThan: txThan, qdThan: qdThan, kmThan: qdThan - mongDienTich, mongDienTich: mongDienTich };
  }

  return {
    num: num,
    fmt: fmt,
    pickModel: pickModel,
    computeAreas: computeAreas,
    kiemTraNgoaiVung: kiemTraNgoaiVung,
    MAI_LOAI: MAI_LOAI,
    MAI_LOAI_MAC_DINH: MAI_LOAI_MAC_DINH,
    tyLeMai: tyLeMai,
    ghiChuMai: ghiChuMai,
    heSoDocMaiThai: heSoDocMaiThai,
    computeMaiThai: computeMaiThai,
    computeAreasBietThuVuon: computeAreasBietThuVuon,
    MAI_THAI_MAC_DINH: MAI_THAI_MAC_DINH,
    MONG_MAC_DINH_BIET_THU_VUON: MONG_MAC_DINH_BIET_THU_VUON,
    MONG_MAC_DINH_NHA_PHO: MONG_MAC_DINH_NHA_PHO,
  };
});
