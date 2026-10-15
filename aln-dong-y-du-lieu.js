/* aln-dong-y-du-lieu.js — ô đồng ý dữ liệu Gói Quản lý Thi công (PR-4, 15/10/2026).
 *
 * Dùng chung cho Không gian Nhà và cửa vào tự phục vụ (PR-9). Chỉ vẽ + gọi hàm
 * do trang truyền vào; ghi thật ở Cloud Function khDongYDuLieu (máy chủ kiểm
 * phiên OTP + đúng chủ nhà + đúng phiên bản điều khoản).
 *
 *   const ctl = window.alnDongYDuLieu.mount(el, {
 *     goi: (data) => Promise,      // gọi khDongYDuLieu, data đã có houseId
 *     xemFounder: false,           // true → chỉ xem, khoá nút
 *   });
 *   ctl.capNhat(house.dong_y_du_lieu);  // mỗi lần snapshot house đổi
 *
 * Câu đồng ý đọc từ consent-constants.js (bản sao của functions/consent_constants.js,
 * functions/_test_dongYDuLieu.js kiểm hai bản giống hệt). Chỉ textContent, không innerHTML.
 */
(function () {
  'use strict';
  var NAP = null;
  function napCau() {
    if (!NAP) NAP = import('/consent-constants.js');
    return NAP;
  }
  function tao(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function ngay(ts) {
    try {
      var d = ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
      return d ? d.toLocaleDateString('vi-VN') : '';
    } catch (e) { return ''; }
  }
  function ngayPhienBan(pb) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:-\d+)?$/.exec(pb || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : (pb || '');
  }
  var CSS = '.dydl{border:1px solid var(--line,#d8dee6);border-radius:12px;padding:16px;margin-top:14px;background:var(--card,#fff)}'
    + '.dydl h3{margin:0 0 8px;font-size:var(--text-md,1.05rem)}'
    + '.dydl label{display:flex;gap:10px;align-items:flex-start;margin:10px 0;line-height:1.5;cursor:pointer}'
    + '.dydl input[type=checkbox]{width:20px;height:20px;flex:0 0 20px;margin-top:2px}'
    + '.dydl .dydl-nho{font-size:var(--text-sm,.9rem);color:var(--sub,#55606e);margin:8px 0}'
    + '.dydl .dydl-loi{color:#b42318;margin:8px 0}'
    + '.dydl .dydl-ok{color:#166534;font-weight:600;margin:6px 0}'
    + '.dydl .dydl-nut{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}'
    + '.dydl button{min-height:44px;padding:0 16px;border-radius:10px;font:inherit;cursor:pointer}'
    + '.dydl .dydl-chinh{background:var(--nut-vang,#9a6b08);color:#fff;border:0;font-weight:600}'
    + '.dydl .dydl-phu{background:transparent;border:1px solid var(--line,#c7cfd9);color:inherit}'
    + '.dydl .dydl-link{min-height:0;padding:4px 0;border:0;background:none;color:var(--sub,#55606e);text-decoration:underline;font-size:var(--text-sm,.9rem)}'
    + '.dydl button:disabled{opacity:.55;cursor:not-allowed}';
  function chenCss() {
    if (document.getElementById('dydl-css')) return;
    var s = document.createElement('style');
    s.id = 'dydl-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function mount(el, opts) {
    chenCss();
    var o = opts || {};
    var trangThai = null;
    var dangGui = false;
    var loi = '';
    // Giữ lựa chọn đang tick khi vẽ lại (snapshot house đổi, báo lỗi).
    var chon = { dy: false, tk: false };
    el.classList.add('dydl');

    function goi(data) {
      if (o.xemFounder) return Promise.reject({ message: 'Chế độ xem của Founder không ghi đồng ý thay chủ nhà.' });
      dangGui = true; loi = ''; ve();
      return Promise.resolve(o.goi(data)).then(function () {
        dangGui = false; ve();
      }, function (e) {
        dangGui = false;
        loi = (e && e.message) || 'Chưa lưu được — anh/chị thử lại.';
        ve();
      });
    }

    function ve() {
      napCau().then(function (C) {
        var PB = C.CONSENT_VERSIONS.du_lieu_nha;
        var t = trangThai || {};
        var daDongY = t.dong_y === true && t.phien_ban_dieu_khoan === PB;
        el.textContent = '';
        el.appendChild(tao('h3', null, 'Đồng ý dữ liệu cho Gói Quản lý Thi công'));

        if (daDongY) {
          var nd = ngay(t.thoi_diem);
          el.appendChild(tao('p', 'dydl-ok', nd ? 'Anh/chị đã đồng ý ngày ' + nd + '.' : 'Anh/chị đã đồng ý.'));
          el.appendChild(tao('p', 'dydl-nho', C.CONSENT_TEXTS.du_lieu_nha));
          el.appendChild(tao('p', 'dydl-nho', 'Thống kê giá theo khu vực (đã bỏ thông tin cá nhân): '
            + (t.thong_ke_an_danh ? 'có cho phép.' : 'không cho phép.')));
          var nut = tao('div', 'dydl-nut');
          var bTk = tao('button', 'dydl-phu', t.thong_ke_an_danh ? 'Không cho dùng để thống kê' : 'Cho dùng để thống kê');
          bTk.type = 'button';
          bTk.disabled = dangGui || !!o.xemFounder;
          bTk.addEventListener('click', function () {
            goi({ hanh_dong: 'dong_y', dong_y: true, phien_ban: PB, thong_ke_an_danh: !t.thong_ke_an_danh });
          });
          nut.appendChild(bTk);
          el.appendChild(nut);
          // Rút lại: link chữ nhỏ (Nam chốt 15/10/2026), luôn hỏi xác nhận.
          var bRut = tao('button', 'dydl-link', 'Rút lại đồng ý');
          bRut.type = 'button';
          bRut.disabled = dangGui || !!o.xemFounder;
          bRut.addEventListener('click', function () {
            if (!window.confirm('Rút lại đồng ý thì ALN không bật được Gói Quản lý Thi công cho hồ sơ này và ALN sẽ xoá dữ liệu cá nhân của anh/chị trong vòng 30 ngày; số liệu đã ẩn danh đưa vào thống kê không rút ra được. Anh/chị chắc chắn?')) return;
            goi({ hanh_dong: 'rut' });
          });
          var pRut = tao('p', 'dydl-nho');
          pRut.appendChild(bRut);
          el.appendChild(pRut);
        } else {
          if (t.dong_y === true) {
            el.appendChild(tao('p', 'dydl-nho', 'Điều khoản đã cập nhật ngày ' + ngayPhienBan(PB) + ' — anh/chị đọc và đồng ý lại.'));
          }
          var l1 = tao('label');
          var c1 = document.createElement('input'); c1.type = 'checkbox'; c1.id = 'dydlDongY'; c1.checked = chon.dy;
          c1.addEventListener('change', function () { chon.dy = c1.checked; });
          l1.appendChild(c1); l1.appendChild(tao('span', null, C.CONSENT_TEXTS.du_lieu_nha));
          var l2 = tao('label');
          var c2 = document.createElement('input'); c2.type = 'checkbox'; c2.id = 'dydlThongKe'; c2.checked = chon.tk;
          c2.addEventListener('change', function () { chon.tk = c2.checked; });
          l2.appendChild(c2); l2.appendChild(tao('span', null, C.CONSENT_TEXTS.thong_ke_an_danh + ' (không bắt buộc)'));
          el.appendChild(l1); el.appendChild(l2);
          var cs = tao('p', 'dydl-nho');
          var a = tao('a', null, 'Chính sách quyền riêng tư');
          a.href = '/chinh-sach-quyen-rieng-tu/';
          a.target = '_blank'; a.rel = 'noopener';
          cs.appendChild(document.createTextNode('Xem ')); cs.appendChild(a);
          cs.appendChild(document.createTextNode('. Anh/chị rút lại đồng ý được bất cứ lúc nào ngay tại đây.'));
          el.appendChild(cs);
          var nut2 = tao('div', 'dydl-nut');
          var bOk = tao('button', 'dydl-chinh', dangGui ? 'Đang lưu…' : 'Đồng ý');
          bOk.type = 'button';
          bOk.disabled = dangGui || !!o.xemFounder;
          bOk.addEventListener('click', function () {
            if (!c1.checked) { loi = 'Anh/chị đánh dấu ô đầu tiên để đồng ý.'; ve(); return; }
            goi({ hanh_dong: 'dong_y', dong_y: true, phien_ban: PB, thong_ke_an_danh: c2.checked });
          });
          nut2.appendChild(bOk);
          el.appendChild(nut2);
        }
        if (loi) el.appendChild(tao('p', 'dydl-loi', loi));
        el.appendChild(tao('p', 'dydl-nho', 'Gói Quản lý Thi công là công cụ để anh/chị tự theo dõi công trình của mình — không thay thế công tác giám sát thi công.'));
      }, function () {
        el.textContent = '';
        el.appendChild(tao('p', 'dydl-loi', 'Chưa tải được điều khoản — anh/chị tải lại trang.'));
      });
    }

    ve();
    return {
      capNhat: function (dongYDuLieu) { trangThai = dongYDuLieu || null; ve(); },
    };
  }

  window.alnDongYDuLieu = { mount: mount };
})();
