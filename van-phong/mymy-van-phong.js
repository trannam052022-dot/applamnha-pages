/* ═══════════════════════════════════════════════════════════════
   MyMy ở Văn phòng ALN (/van-phong/) — lễ tân chủ động chào khách (01/11/2026)

   Nam chốt 01/11/2026: "chủ động chào khách đến và trao đổi công việc bất cứ lúc nào
   khách có nhu cầu". Khác các trang công cụ (MyMy chỉ mở khi khách bấm), ở văn phòng
   MyMy là lễ tân: van-phong.js tự mở khung chat MỘT lần mỗi phiên sau khi MyMy chào
   (sessionStorage aln_vp_mymy_chao). Khách đóng là thôi, nút MyMy vẫn ở góc để mở lại.

   Lời mở đầu + nút soạn sẵn (không gọi AI): nút đưa khách tới đúng phòng
   (window.ALNVanPhong.vaoPhong). Câu khách tự gõ đi alnChat như MyMy chung — trả lời
   24/7. Số điện thoại gõ trong chat đi theo quy tắc chung của widget: hiện câu đồng ý
   mymy_chat, khách bấm đồng ý mới lưu (trang này không đặt xuLySdt).
   Phải nạp TRƯỚC mymy-widget.js. Chữ vào khung chat chỉ qua API của widget.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function ga(buoc) { try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: 'aln_mymy_vp', buoc: buoc }); } catch (e) { /* bỏ qua */ } }
  function noi(api, cau) { api.bot(cau); api.ghiLichSu('assistant', cau.replace(/\*\*/g, '')); }
  function vao(api, phong, buoc) {
    return function () {
      ga(buoc); api.dong();
      try { if (window.ALNVanPhong && window.ALNVanPhong.vaoPhong) window.ALNVanPhong.vaoPhong(phong); } catch (e) { console.error('MyMy văn phòng:', e); }
    };
  }
  function nutChinh(api) {
    api.nut([
      { nhan: 'Tư vấn thiết kế', lam: vao(api, 'tiep', 'tu_van') },
      { nhan: 'Tính phí thiết kế', lam: vao(api, 'gd', 'tinh_phi') },
      { nhan: 'Dự toán xây nhà', lam: vao(api, 'dt', 'du_toan') },
      { nhan: 'Xem hồ sơ mẫu', lam: vao(api, 'kho', 'ho_so_mau') },
      { nhan: 'Nhờ KTS gọi lại', lam: function () {
        ga('nho_kts_goi');
        noi(api, 'Dạ, anh/chị gõ số điện thoại vào ô bên dưới. Anh/chị bấm đồng ý thì em mới lưu số và báo KTS Trần Long gọi lại trong 1–2 ngày làm việc ạ.');
      } },
      { nhan: 'Tôi muốn hỏi', lam: function () { ga('hoi'); noi(api, 'Dạ, anh/chị gõ câu hỏi bên dưới, em trả lời ngay ạ.'); } },
    ]);
  }

  /* Khu chờ (08/11/2026, Nam: khách chờ KTS ở khu chờ, MyMy tư vấn và hướng dẫn dịch vụ).
     van-phong.js gọi window.alnMyMyKhuCho khi "Bạn" ngồi xuống khu chờ. Nút đưa tới đúng phòng;
     khách tự gõ câu hỏi thì đi alnChat như thường. */
  var apiDaCo = null, choKhuCho = null;
  function khuCho(api, sauHen) {
    ga(sauHen ? 'khu_cho_sau_hen' : 'khu_cho');
    noi(api, sauHen
      ? 'Dạ, KTS Trần Long sẽ gọi anh/chị theo giờ đã hẹn. Trong lúc chờ, anh/chị muốn xem gì, em đưa tới đúng phòng ạ.'
      : 'Dạ, anh/chị đang cần việc gì, em đưa tới đúng phòng ạ. Anh/chị cũng có thể gõ câu hỏi, em tư vấn ngay.');
    api.nut([
      { nhan: 'Phòng Dự toán', lam: vao(api, 'dt', 'kc_du_toan') },
      { nhan: 'Phòng Nội thất', lam: vao(api, 'nt', 'kc_noi_that') },
      { nhan: 'Xưởng thiết kế · thử mặt bằng', lam: vao(api, 'tk', 'kc_mat_bang') },
      { nhan: 'Phòng Phong thủy', lam: vao(api, 'pt', 'kc_phong_thuy') },
      { nhan: 'Không gian Nhà · Quản lý thi công', lam: vao(api, 'kgn', 'kc_qltc') },
      { nhan: 'Thư viện hồ sơ mẫu', lam: vao(api, 'kho', 'kc_ho_so_mau') },
      { nhan: 'Tôi muốn hỏi', lam: function () { ga('kc_hoi'); noi(api, 'Dạ, anh/chị gõ câu hỏi bên dưới, em trả lời ngay ạ.'); } },
    ]);
  }
  window.alnMyMyKhuCho = function (sauHen) {
    if (apiDaCo) khuCho(apiDaCo, sauHen); else choKhuCho = { sauHen: !!sauHen };
    if (typeof window.alnMyMyMo === 'function') window.alnMyMyMo(true);
  };

  /* Phòng có chủ phòng nói chuyện (09/11/2026, thử ở phòng Dự toán): van-phong.js gọi
     window.alnMyMyPhong('dt') khi "Bạn" ngồi xuống bàn. Trong lúc ngồi phòng, xuLyTin/xuLySdt/nguCanh
     chuyển cho bộ hội thoại của phòng (phong-du-toan.js); rời phòng thì gỡ ra, trở lại như lễ tân. */
  var CP = function (id) { return function () { return window.ALNChuPhong && window.ALNChuPhong[id]; }; };
  var PHONG = { dt: function () { return window.ALNPhongDuToan; }, pt: CP('pt'), nt: CP('nt'), tk: CP('tk'), kho: CP('kho'), kgn: CP('kgn') }, choPhong = null;
  /* Xưng hô theo phòng (Nam duyệt 09/11/2026). Khách tự chọn nhân vật (giới tính, dưới/từ 50 tuổi):
     - MyMy + chủ phòng trẻ: xưng "em", gọi khách anh/chị (dưới 50) hoặc cô/chú (từ 50).
     - Chủ phòng Phong thủy (lớn tuổi): xưng "tôi", gọi khách anh/chị ở mọi tuổi.
     - Khung chat ghi tên vai ("Trợ lý Dự toán · ALN"), không đặt tên người (chủ phòng là trợ lý tự động).
     Chưa chọn nhân vật: giữ "anh/chị". */
  var VAI = { dt: 'Trợ lý Dự toán', pt: 'Trợ lý Phong thủy', nt: 'Trợ lý Nội thất', kgn: 'Trợ lý Quản lý thi công', tk: 'Trợ lý Xưởng thiết kế', kho: 'Thủ thư Hồ sơ mẫu' };
  var XUNG_TOI = { pt: 1 }, phongNoi = null;
  function goiKhach() {
    var k = window.alnKhachVP && window.alnKhachVP(); if (!k) return null;
    if (k.tuoi === 'tu_50' && !XUNG_TOI[phongNoi]) return k.gioi === 'nu' ? 'cô' : 'chú';
    return k.gioi === 'nu' ? 'chị' : 'anh';
  }
  var hoa = function (x) { return x.charAt(0).toUpperCase() + x.slice(1); };
  var RE_EM = /(^|[^\p{L}])(em|Em)(?=[^\p{L}]|$)/gu;
  function loi(t) {
    if (typeof t !== 'string') return t;
    var x = goiKhach(); if (x) t = t.replace(/anh\/chị/g, x).replace(/Anh\/chị/g, hoa(x));
    if (XUNG_TOI[phongNoi]) t = t.replace(RE_EM, function (m, a, e) { return a + (e === 'Em' ? 'Tôi' : 'tôi'); });
    return t;
  }
  window.alnVpLoi = loi; // van-phong.js: lời chủ phòng trong bong bóng 3D
  function datNguoiNoi(id) {
    phongNoi = id || null;
    if (window.alnMyMyTen) window.alnMyMyTen(id && VAI[id] ? VAI[id] + ' · ALN' : 'MyMy · ALN');
    if (window.alnBieuCamAn) window.alnBieuCamAn(!!(id && VAI[id])); // mặt MyMy chỉ hiện khi MyMy nói
    var x = goiKhach(); if (x && window.alnMyMyXungHo) window.alnMyMyXungHo(x);
  }
  function vaoPhongNoi(api, id) {
    var p = PHONG[id] && PHONG[id](); if (!p) return false;
    datNguoiNoi(id);
    var T = window.ALN_MYMY_TRANG;
    T.xuLyTin = function (text, a) { return p.xuLyTin(text, a); };
    // phòng không tự xử lý số (xuLySdt) → widget tự hỏi đồng ý chung (mymy_chat)
    if (typeof p.xuLySdt === 'function') T.xuLySdt = function (text, a) { return p.xuLySdt(text, a); }; else delete T.xuLySdt;
    T.nguCanh = function () { return p.nguCanh(); };
    p.batDau(api); return true;
  }
  window.alnMyMyPhong = function (id) {
    if (apiDaCo) vaoPhongNoi(apiDaCo, id); else choPhong = id;
    if (typeof window.alnMyMyMo === 'function') window.alnMyMyMo(true);
  };
  window.alnMyMyRoiPhong = function () {
    choPhong = null; datNguoiNoi(null); var T = window.ALN_MYMY_TRANG; if (!T || !T.xuLyTin) return;
    delete T.xuLyTin; delete T.xuLySdt; delete T.nguCanh;
    Object.keys(PHONG).forEach(function (k) { var p = PHONG[k](); if (p && p.dangMo()) p.ketThuc(); });
  };

  window.ALN_MYMY_TRANG = {
    loiMoi: 'Em là MyMy, anh/chị cần gì cứ hỏi em nhé.',
    khongMoiChung: true,
    locTraLoi: function (t) { return loi(t); }, // câu trả lời của AI cũng theo xưng hô của phòng // văn phòng tự chào (van-phong.js), không cần bóng chat mời chung
    moDau: function (api) {
      apiDaCo = api;
      // khách đã chọn nhân vật → câu soạn sẵn đổi "anh/chị" theo khách, "em" → "tôi" ở phòng xưng tôi
      if (!api._xungHo) { api._xungHo = 1; var botGoc = api.bot;
        api.bot = function (t) { return botGoc.apply(this, [loi(t)].concat([].slice.call(arguments, 1))); };
        datNguoiNoi(phongNoi); }
      if (choPhong) { var ph = choPhong; choPhong = null; if (vaoPhongNoi(api, ph)) return true; }
      if (choKhuCho) { var k = choKhuCho; choKhuCho = null; khuCho(api, k.sauHen); try { api.hienTuDau(); } catch (e) { /* widget cũ */ } return true; }
      ga('mo');
      noi(api, 'Dạ, em chào anh/chị! Em là MyMy, lễ tân của ALN. Anh/chị đang cần gì ạ? Em đưa anh/chị tới đúng phòng, hoặc anh/chị gõ câu hỏi, em trả lời ngay, cả ngoài giờ làm việc.');
      nutChinh(api);
      try { api.hienTuDau(); } catch (e) { /* widget cũ */ }
      return true;
    },
  };
})();
