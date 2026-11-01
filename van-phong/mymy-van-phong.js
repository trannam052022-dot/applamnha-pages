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

  window.ALN_MYMY_TRANG = {
    loiMoi: 'Em là MyMy, anh/chị cần gì cứ hỏi em nhé.',
    khongMoiChung: true, // văn phòng tự chào (van-phong.js), không cần bóng chat mời chung
    moDau: function (api) {
      ga('mo');
      noi(api, 'Dạ, em chào anh/chị! Em là MyMy, lễ tân của ALN. Anh/chị đang cần gì ạ? Em đưa anh/chị tới đúng phòng, hoặc anh/chị gõ câu hỏi, em trả lời ngay, cả ngoài giờ làm việc.');
      nutChinh(api);
      try { api.hienTuDau(); } catch (e) { /* widget cũ */ }
      return true;
    },
  };
})();
