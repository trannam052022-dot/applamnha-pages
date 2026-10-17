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
  // Màu riêng của khối, KHÔNG dựa biến màu của trang: quan-ly-thi-cong.html và
  // khong-gian-nha.html đặt tên biến khác nhau, dark mode từng cho chữ sáng trên
  // nền trắng (chữ gần như mất) và checkbox gốc của trình duyệt thành khối đen
  // (17/10/2026). Mọi cặp chữ/nền dưới đây ≥ 4.5:1, kể cả nút đang khoá.
  var CHECK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5' fill='none' stroke='%23fff' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  var CHECK_TOI = CHECK.replace('%23fff', '%230a1224');
  var MAU_SANG = '--dy-nen:#ffffff;--dy-chu:#1f2937;--dy-phu:#4b5563;--dy-vien:#cfd6e3;--dy-o:#4b5563;'
    + '--dy-tick:#8a5f07;--dy-tick-dau:' + CHECK + ';--dy-nut:#8a5f07;--dy-nut-chu:#ffffff;'
    + '--dy-khoa:#e5e7eb;--dy-khoa-chu:#374151;--dy-loi:#b42318;--dy-ok:#166534;--dy-link:#1d4ed8;--dy-focus:#2563eb;';
  var MAU_TOI = '--dy-nen:#111c33;--dy-chu:#eef1f7;--dy-phu:#c3cde0;--dy-vien:#3a4a6e;--dy-o:#c3cde0;'
    + '--dy-tick:#e0b43c;--dy-tick-dau:' + CHECK_TOI + ';--dy-nut:#e0b43c;--dy-nut-chu:#0a1224;'
    + '--dy-khoa:#26344f;--dy-khoa-chu:#d5ddeb;--dy-loi:#f5a39b;--dy-ok:#86e0b6;--dy-link:#9cc1ff;--dy-focus:#7aa7ff;';
  var CSS = '.dydl{' + MAU_SANG + 'color-scheme:light;color:var(--dy-chu);background:var(--dy-nen);border:1px solid var(--dy-vien);border-radius:12px;padding:16px;margin-top:14px}'
    + '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .dydl{' + MAU_TOI + 'color-scheme:dark}}'
    + ':root[data-theme="dark"] .dydl{' + MAU_TOI + 'color-scheme:dark}'
    + '.dydl h3{margin:0 0 8px;font-size:var(--text-md,1.05rem);color:var(--dy-chu)}'
    + '.dydl label{display:flex;gap:12px;align-items:flex-start;margin:12px 0;line-height:1.55;cursor:pointer;color:var(--dy-chu);opacity:1;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}'
    + '.dydl label span{color:var(--dy-chu)}'
    + '.dydl input[type=checkbox]{-webkit-appearance:none;appearance:none;width:24px;height:24px;flex:0 0 24px;margin:1px 0 0;'
    + 'border:2px solid var(--dy-o);border-radius:5px;background:var(--dy-nen) center/18px 18px no-repeat;cursor:pointer;opacity:1}'
    + '.dydl input[type=checkbox]:checked{background-color:var(--dy-tick);border-color:var(--dy-tick);background-image:var(--dy-tick-dau)}'
    + '.dydl input[type=checkbox]:focus-visible,.dydl button:focus-visible{outline:3px solid var(--dy-focus);outline-offset:2px}'
    + '.dydl .dydl-nho{font-size:var(--text-sm,.9rem);color:var(--dy-phu);margin:8px 0}'
    + '.dydl a{color:var(--dy-link)}'
    + '.dydl .dydl-loi{color:var(--dy-loi);margin:8px 0}'
    + '.dydl .dydl-ok{color:var(--dy-ok);font-weight:600;margin:6px 0}'
    + '.dydl .dydl-nut{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}'
    + '.dydl button{min-height:44px;padding:0 16px;border-radius:10px;font:inherit;cursor:pointer}'
    + '.dydl .dydl-chinh{background:var(--dy-nut);color:var(--dy-nut-chu);border:0;font-weight:600}'
    + '.dydl .dydl-phu{background:transparent;border:1px solid var(--dy-o);color:var(--dy-chu)}'
    + '.dydl .dydl-link{min-height:0;padding:4px 0;border:0;background:none;color:var(--dy-phu);text-decoration:underline;font-size:var(--text-sm,.9rem)}'
    + '.dydl button:disabled{background:var(--dy-khoa);color:var(--dy-khoa-chu);border-color:var(--dy-khoa);cursor:not-allowed;opacity:1}'
    + '.dydl .dydl-link:disabled{background:none}';
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
          c1.addEventListener('change', function () {
            chon.dy = c1.checked;
            // Nút Đồng ý chỉ bật khi đã tick ô 1 (ô 2 tuỳ chọn) — đổi tại chỗ, không vẽ lại.
            bOk.disabled = dangGui || !!o.xemFounder || !c1.checked;
          });
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
          bOk.disabled = dangGui || !!o.xemFounder || !chon.dy;
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
