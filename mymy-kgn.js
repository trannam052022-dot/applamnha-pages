/* ═══════════════════════════════════════════════════════════════
   MyMy trên Không gian Nhà — hướng dẫn chủ nhà từng bước tới khi xong công trình (18/10/2026)

   Nam chốt 18/10/2026: khách chọn "đã có bản vẽ / dự toán" thì nhắc cập nhật diện tích, hỏi có
   bảng thống kê thép để đối soát; MyMy hỗ trợ hướng dẫn từng bước cho tới khi hoàn tất công trình.
   MyMy KHÔNG tự mở: khách bấm nút MyMy hoặc nút "Nhờ MyMy …" ở thẻ Việc tiếp theo (window.alnMyMyMo).
   Mỗi lần mở, MyMy đọc VIỆC ĐANG HIỆN ở thẻ Việc tiếp theo (window.alnKgnTrangThai().viec_hien)
   và hướng dẫn đúng việc đó; nút "Làm việc này" bấm thay nút chính của thẻ (window.alnKgnLamViec).
   Hướng dẫn soạn sẵn (không gọi AI); câu khách tự gõ mới gửi alnChat kèm ngữ cảnh 'khong-gian-nha'
   (việc đang làm, danh sách sàn tên + m², trạng thái thép — không có họ tên/SĐT) — máy chủ
   functions/lib/mymyPrompt.js khoiKgn: không xin số, không hứa KTS gọi, không đoán số thay khách.
   Phải nạp TRƯỚC mymy-widget.js. Chữ vào khung chat chỉ qua API của widget.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function trangThai() {
    try { return (typeof window.alnKgnTrangThai === 'function' && window.alnKgnTrangThai()) || {}; } catch (e) { return {}; }
  }
  function ga(buoc) { try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: 'aln_mymy_kgn', buoc: buoc }); } catch (e) { /* bỏ qua */ } }
  function goi(ten) { try { if (typeof window[ten] === 'function') return window[ten](); } catch (e) { console.error('MyMy KGN:', e); } return false; }
  function noi(api, cau) { api.bot(cau); api.ghiLichSu('assistant', cau.replace(/\*\*/g, '')); }

  var CHUNG_DT = 'Tầng có ban công, lô gia thì cộng cả phần đó vào. Mái, tum, lửng chưa có số rõ thì cứ giữ số tạm, có số thì cập nhật sau.';
  var CACH_DT = {
    ban_ve: 'Dạ, anh/chị mở bộ bản vẽ, tìm bảng thống kê diện tích sàn từng tầng (bộ hồ sơ xin phép xây dựng thường có). Không có bảng thì xem mặt bằng từng tầng. ' + CHUNG_DT + ' Có số rồi thì bấm nút dưới đây, chọn **Bản vẽ**, gõ số từng sàn rồi bấm **Lưu diện tích**.',
    du_toan: 'Dạ, anh/chị mở file dự toán, tìm phần diện tích sàn từng tầng. ' + CHUNG_DT + ' Có số rồi thì bấm nút dưới đây, chọn **Dự toán**, gõ số từng sàn rồi bấm **Lưu diện tích**.',
  };
  var CACH_THEP = 'Dạ, bảng thống kê thép thường nằm ở các trang bản vẽ kết cấu (móng, cột, dầm, sàn), cột cuối ghi **trọng lượng (kg)** và có dòng **tổng**. Anh/chị cộng tổng các cấu kiện của cùng một mốc: thép dầm, sàn của sàn lầu N ghi vào mốc tầng N-1 (giống cách chia dự toán theo tầng); thép móng, đà kiềng ghi vào mốc Móng. Mốc nào chưa rõ thì để trống. Cách nhanh hơn: tải file bảng thống kê (PDF, Excel .xlsx hoặc ảnh chụp rõ) lên thư mục **Thống kê thép** — ALN đọc số và điền sẵn từng mốc, anh/chị chỉ cần kiểm lại với bảng rồi bấm **Lưu số thép**.';
  var LO_TRINH = 'Dạ, các bước của Gói Quản lý Thi công: (1) đồng ý dữ liệu, (2) nhập các sàn, (3) tải dự toán hoặc bản vẽ, (4) cập nhật diện tích từng sàn, (5) nhập thép theo bảng thống kê để đối soát, (6) mở sàn, (7) mỗi mốc: bắt đầu → chụp ảnh từng việc cần kiểm, đánh dấu Đạt / Cần sửa → ghi lần ứng tiền thợ → khép mốc, (8) xong phần thô thì sang hoàn thiện. Thẻ **Việc tiếp theo** ở trang Tổng quan luôn hiện đúng việc kế tiếp, anh/chị cứ mở MyMy là em chỉ tiếp.';

  function nutCuoi(api, them) {
    api.nut((them || []).concat([
      { nhan: 'Việc tiếp theo là gì?', lam: function () { moDauViec(api); } },
      { nhan: 'Tôi còn thắc mắc', lam: function () { api.bot('Dạ anh/chị gõ câu hỏi bên dưới, em trả lời ngay ạ.'); } },
    ]));
  }
  function nutMoBangDt(api) { return { nhan: 'Mở bảng cập nhật diện tích', lam: function () { ga('mo_bang_dt'); api.dong(); goi('alnKgnCapNhatDt'); } }; }
  function nutMoThep(api) { return { nhan: 'Mở bảng nhập thép', lam: function () { ga('mo_bang_thep'); api.dong(); goi('alnKgnNhapThep'); } }; }
  function nutLamViec(api, nhan) {
    return { nhan: nhan || 'Làm việc này', lam: function () { ga('lam_viec'); api.dong(); if (!goi('alnKgnLamViec')) api.mo(); } };
  }

  function huongDanDt(api) {
    noi(api, 'Dạ, anh/chị lấy diện tích từ đâu ạ?');
    api.nut([
      { nhan: 'Từ bản vẽ', lam: function () { ga('cach_ban_ve'); noi(api, CACH_DT.ban_ve); nutCuoi(api, [nutMoBangDt(api)]); } },
      { nhan: 'Từ dự toán', lam: function () { ga('cach_du_toan'); noi(api, CACH_DT.du_toan); nutCuoi(api, [nutMoBangDt(api)]); } },
      nutMoBangDt(api),
    ]);
  }
  function huongDanThep(api) {
    ga('cach_thep');
    noi(api, CACH_THEP);
    nutCuoi(api, [nutMoThep(api)]);
  }

  /* Mở đầu theo việc đang hiện ở thẻ Việc tiếp theo. */
  function moDauViec(api) {
    var t = trangThai();
    var v = t.viec_hien || null;
    var ma = v && v.ma ? String(v.ma) : '';
    if (ma === 'cap_nhat_dt') {
      noi(api, 'Dạ, việc tiếp theo là cập nhật diện tích từng sàn theo bản vẽ hoặc dự toán, để mốc thi công đúng với nhà thật.');
      huongDanDt(api);
      return;
    }
    if (ma === 'thep') {
      noi(api, 'Dạ, việc tiếp theo là nhập thép theo bảng thống kê (nếu bộ bản vẽ kết cấu có), để đối soát với số thép trong dự toán trước khi mua thép.');
      huongDanThep(api);
      return;
    }
    if (v && v.ten) {
      noi(api, 'Dạ, việc anh/chị cần làm bây giờ: **' + v.ten + '**.' + (v.mo_ta ? ' ' + v.mo_ta : ''));
      nutCuoi(api, [nutLamViec(api)].concat([{ nhan: 'Cả lộ trình các bước', lam: function () { ga('lo_trinh'); noi(api, LO_TRINH); nutCuoi(api); } }]));
      return;
    }
    noi(api, LO_TRINH);
    nutCuoi(api);
  }

  window.ALN_MYMY_TRANG = {
    loiMoi: 'Cần em chỉ việc tiếp theo không ạ?',
    khongMoiChung: true,
    moDau: function (api) {
      ga('mo');
      noi(api, 'Dạ, em là MyMy của ALN. Em đi cùng anh/chị từng bước tới khi xong công trình.');
      moDauViec(api);
      return true;
    },
    nguCanh: function () {
      var t = trangThai();
      var v = t.viec_hien || null;
      return {
        trang: 'khong-gian-nha',
        viec: v && v.ma ? String(v.ma).slice(0, 40) : '',
        viec_ten: v && v.ten ? String(v.ten).slice(0, 120) : '',
        viec_mo_ta: v && v.mo_ta ? String(v.mo_ta).slice(0, 300) : '',
        buoc_xay: t.buoc_xay || '',
        san: Array.isArray(t.san) ? t.san.slice(0, 20) : [],
        co_nguon: t.co_nguon === true,
        da_tra: t.da_tra === true,
        thep: t.thep ? (t.thep.da_nhap ? 'da_nhap' : t.thep.khong_co ? 'khong_co' : 'chua_nhap') : '',
      };
    },
  };
})();
