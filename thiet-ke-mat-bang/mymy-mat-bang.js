/* MyMy hướng dẫn khách ở trang Thiết kế mặt bằng (/thiet-ke-mat-bang/) và trình dựng (/thiet-ke-mat-bang/dung/)
   — 27/10/2026, Nam: "làm từng bước và mymy hướng dẫn cho khách".
   Nạp TRƯỚC mymy-widget.js. Không tự mở khung chat (chỉ bóng chat mời chung). Mở chat thì MyMy hỏi khách muốn làm gì,
   trả lời bằng câu soạn sẵn (không gọi AI) + nút "Chỉ trên trang" tô sáng đúng chỗ cần bấm. Câu khách tự gõ đi AI
   (alnChat) kèm ngữ cảnh trang (functions/lib/mymyPrompt.js khoiMatBang) — không có họ tên, SĐT. */
(function () {
  'use strict';
  var DUNG = /\/thiet-ke-mat-bang\/dung\//.test(location.pathname);
  var $ = function (id) { return document.getElementById(id); };
  function ga(buoc) { try { if (window.gtag) window.gtag('event', 'aln_mymy_mb', { trang: DUNG ? 'dung' : 'mat_bang', buoc: buoc }); } catch (e) { /* bỏ qua */ } }
  function hien(el) { return !!(el && el.getClientRects().length && !el.closest('[hidden]')); }
  // tô sáng chỗ cần bấm; khung chat đóng lại để khách nhìn thấy (bấm nút MyMy là quay lại cuộc trò chuyện)
  function toSang(api, el) {
    if (!hien(el)) return false;
    api.dong();
    // trình dựng là ứng dụng toàn màn hình (mọi nút luôn hiện): không cuộn, cuộn sẽ đẩy cả khung lệch khỏi màn hình
    if (!DUNG) { try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch (e) { el.scrollIntoView(); } }
    el.classList.remove('mm-to-sang'); void el.offsetWidth; el.classList.add('mm-to-sang');
    setTimeout(function () { el.classList.remove('mm-to-sang'); }, 5200);
    return true;
  }
  function chiTren(api, lay, khongCo) {
    return { nhan: 'Chỉ trên trang', lam: function () { ga('chi'); if (!toSang(api, lay())) { api.bot(khongCo || 'Dạ chỗ đó chưa hiện trên trang ạ.'); menu(api); } } };
  }
  var viecKhac = function (api) { return { nhan: 'Việc khác', lam: function () { menu(api); } }; };

  /* ---------- trang Thiết kế mặt bằng ---------- */
  function ttMb() { try { return window.alnMbTrangThai ? window.alnMbTrangThai() : {}; } catch (e) { return {}; } }
  function chuaCoPa(api) {
    api.bot('Dạ anh/chị vẽ phương án trước đã ạ: nhập lô đất ở mục 1 rồi bấm "Vẽ phương án".');
    api.nut([chiTren(api, function () { return $('mt'); }), viecKhac(api)]);
  }
  var MB = [
    { nhan: 'Vẽ phương án cho lô của tôi', lam: function (api) {
      ga('ve');
      api.bot('Dạ anh/chị làm 3 bước:\n1. Chọn loại nhà (nhà phố, nhà vườn…).\n2. Nhập bề ngang và chiều sâu lô (mét), số tầng, số phòng ngủ; tick thêm nếu cần kinh doanh, ô tô, thang máy…\n3. Bấm "Vẽ phương án". Máy đưa ra 3 phương án để so.');
      api.nut([chiTren(api, function () { return $('mt'); }), viecKhac(api)]);
    } },
    { nhan: 'Tự chỉnh phương án', lam: function (api) {
      ga('chinh');
      if (!ttMb().co_pa) return chuaCoPa(api);
      api.bot('Dạ chọn phương án ưng nhất rồi chỉnh:\n• Bấm "Đổi" cạnh tên phòng (hoặc bấm thẳng vào phòng trên bản vẽ) để đổi công năng.\n• "Phòng phía trước rộng thêm" / "Phòng phía sau rộng thêm" để dời tường 20 cm mỗi lần.\n• "+ Thêm 1 tầng", bật tắt giếng trời, thang máy… ở mục "Chỉnh cho cả nhà".\nBấm nhầm thì "Quay lại bước trước".');
      api.nut([chiTren(api, function () { return $('chMucTuong') || $('tangPhong'); }), viecKhac(api)]);
    } },
    { nhan: 'Xem 3D, đi trong nhà', lam: function (api) {
      ga('3d');
      if (!ttMb().co_pa) return chuaCoPa(api);
      api.bot('Dạ chọn tầng muốn xem (nút ‹ › hoặc hàng tầng), rồi bấm "Chỉnh tiếp tầng này & xem 3D" ngay dưới bản vẽ. Sang trang mới anh/chị kéo tường, thêm đồ đạc được, bấm "Xem 3D" để đi trong nhà.');
      api.nut([chiTren(api, function () { return $('nutSangDung'); }),
        { nhan: 'Mở tầng này luôn', lam: function () { ga('sang_dung'); var b = $('nutSangDung'); if (hien(b)) b.click(); else menu(api); } }, viecKhac(api)]);
    } },
    { nhan: 'Nhờ KTS chỉnh giúp', lam: function (api) {
      ga('kts');
      if (!ttMb().co_pa) return chuaCoPa(api);
      api.bot('Dạ cuối trang có mục "Nhờ KTS của ALN chỉnh phương án này". Anh/chị điền họ tên, số điện thoại, tick đồng ý rồi gửi; KTS của ALN xem phương án anh/chị đang chọn và liên hệ lại.');
      api.nut([chiTren(api, function () { return $('ldKhoi'); }), viecKhac(api)]);
    } }
  ];

  /* ---------- trình dựng ---------- */
  function nutCc(ma) { return function () { return document.querySelector('.cong-cu [data-cc="' + ma + '"]'); }; }
  var DG = [
    { nhan: 'Đổi cỡ phòng (dời tường)', lam: function (api) {
      ga('tuong');
      api.bot('Dạ bấm "Chọn & kéo", chạm vào bức tường trong nhà rồi kéo sang bên. Hai phòng hai bên tự co giãn, diện tích tính lại ngay; con số "lọt lòng" hiện khi kéo.\nTường ngoài, cầu thang, thang máy đã khoá để giữ an toàn kết cấu. Kéo nhầm thì bấm "Quay lại" ở trên cùng.');
      api.nut([chiTren(api, nutCc('chon')), viecKhac(api)]);
    } },
    { nhan: 'Thêm đồ đạc, cửa', lam: function (api) {
      ga('do');
      api.bot('Dạ bấm "Thiết bị", chọn món (giường, tủ, bếp, bồn cầu…) rồi chạm vào chỗ muốn đặt — máy tính thì kéo thả. Đồ tự áp sát tường.\nCửa đi, cửa sổ: bấm nút cùng tên rồi chạm lên bức tường. Bấm vào món đã đặt để xoay, lật, nhân bản hoặc xoá.');
      api.nut([chiTren(api, nutCc('thu_vien')), viecKhac(api)]);
    } },
    { nhan: 'Xem 3D, đi trong nhà', lam: function (api) {
      ga('3d');
      api.bot('Dạ bấm "Xem 3D" ở trên cùng:\n• "Toàn cảnh" xoay quanh nhà; "Đi trong nhà": kéo để nhìn, chạm sàn để đi tới.\n• "Tham quan": máy tự đi qua các phòng; ghim góc đang xem làm điểm nhìn, quay video được.\n• Nút giờ: xem sáng, trưa, chiều, tối, mùa mưa. Nút sofa: đổi tông gỗ, vải. Chạm sàn hoặc tường để đổi vật liệu; chạm đèn, quạt, vòi nước để bật tắt.\nMáy chạy chậm thì bật "Nhẹ máy".');
      api.nut([{ nhan: 'Mở 3D ngay', lam: function () { ga('mo_3d'); api.dong(); var b = $('nut3D'); if (b) b.click(); } }, chiTren(api, function () { return $('nut3D'); }), viecKhac(api)]);
    } },
    { nhan: 'Lưu, gửi người nhà hoặc KTS', lam: function (api) {
      ga('luu');
      api.bot('Dạ bản vẽ tự lưu trong máy này. Bấm "Lưu & xuất":\n• "Gửi bản vẽ qua Zalo": tạo link, người nhận bấm là mở đúng bản này và xem 3D được, không cần cài gì.\n• "Lưu phiên bản" để giữ lại, so các cách chia.\n• "Xuất ảnh PNG" hoặc "Tải file mặt bằng" để gửi KTS.');
      api.nut([{ nhan: 'Tạo link gửi ngay', lam: function () { ga('gui_link'); api.dong(); var b = document.querySelector('#menuTep [data-lenh="gui_link"]'); if (b) b.click(); } },
        chiTren(api, function () { return $('nutTep'); }), viecKhac(api)]);
    } },
    { nhan: 'Bắt đầu từ lô của tôi', lam: function (api) {
      ga('lo');
      api.bot('Dạ muốn máy chia phòng sẵn theo lô đất của anh/chị: mở trang Thiết kế mặt bằng, nhập lô, chọn phương án rồi bấm "Chỉnh tiếp tầng này & xem 3D" — tầng đó sẽ sang đây để chỉnh tiếp. Bản đang làm ở đây được cất vào "Các phiên bản đã lưu".');
      api.nut([{ nhan: 'Mở trang Thiết kế mặt bằng', lam: function () { ga('sang_mb'); location.href = '/thiet-ke-mat-bang/'; } }, viecKhac(api)]);
    } }
  ];

  function menu(api) {
    var ds = DUNG ? DG : MB;
    api.nut(ds.map(function (v) { return { nhan: v.nhan, lam: function () { v.lam(api); } }; }).concat([
      { nhan: 'Câu hỏi khác', lam: function () { ga('hoi'); api.bot('Dạ anh/chị gõ câu hỏi vào ô bên dưới, em trả lời ngay ạ.'); } }
    ]));
  }

  window.ALN_MYMY_TRANG = {
    loiMoi: DUNG ? 'Cần em chỉ cách kéo tường, xem 3D không ạ?' : 'Cần em chỉ cách vẽ mặt bằng, xem 3D không ạ?',
    moDau: function (api) {
      ga('mo');
      api.bot(DUNG
        ? 'Dạ em là MyMy của ALN. Trang này để anh/chị tự chỉnh mặt bằng rồi đi trong nhà bằng 3D. Anh/chị muốn làm gì trước ạ?'
        : 'Dạ em là MyMy của ALN. Trang này vẽ thử mặt bằng cho lô đất của anh/chị. Anh/chị muốn làm gì trước ạ?');
      menu(api);
      return true;
    },
    nguCanh: function () {
      if (DUNG) {
        var p = null; try { p = window.ALNDungMB && window.ALNDungMB.lay(); } catch (e) { p = null; }
        var phong = []; (p && p.phong || []).forEach(function (r) { if (r && r.ten && phong.indexOf(r.ten) < 0 && phong.length < 12) phong.push(String(r.ten)); });
        return { trang: 'dung-mat-bang', tu_mb: !!(p && p.tu_mb), phong: phong };
      }
      var t = ttMb();
      return { trang: 'thiet-ke-mat-bang', co_pa: !!t.co_pa, loai_nha: t.loai_nha || '', w: t.w || 0, d: t.d || 0, so_tang: t.so_tang || 0, tang: t.tang || '', phong: t.phong || [] };
    }
  };
  if (DUNG) { if (document.body) document.body.classList.add('co-mymy'); else document.addEventListener('DOMContentLoaded', function () { document.body.classList.add('co-mymy'); }); }
})();
