/* ALN — khối "ai gọi, gọi từ số nào, gọi giờ nào" sau khi chủ nhà lưu dự toán.
 * Dùng chung cho du-toan-nha.html (ngay sau lưu thành công) và
 * khong-gian-nha.html (khối "Bước tiếp theo", house trang_thai='truoc_c1').
 *
 * NGUỒN DUY NHẤT cho tên/số người gọi (SO_GOI, NGUOI_GOI) — đổi người gọi
 * thì sửa đúng 1 chỗ ở đây. Danh sách khung giờ khớp KHUNG_GIO_ENUM trong
 * functions/khChonKhungGio.js (server validate lại).
 *
 * Không chứa PII của khách; dataLayer chỉ nhận mã khung giờ.
 * Nút Zalo mang data-aln-cta (mặc định 'sau_luu') để aln-tracking.js bắn
 * aln_zalo_click + Meta Contact qua cùng handler sẵn có — không tự bắn ở đây.
 */
(function () {
  var SO_GOI = '0909829696';
  var NGUOI_GOI = 'KTS Trần Long';
  var KHUNG_GIO = [
    { v: 'sang', l: 'Sáng (8–11h)' },
    { v: 'trua', l: 'Trưa (11–14h)' },
    { v: 'chieu', l: 'Chiều (14–17h)' },
    { v: 'toi', l: 'Tối (18–20h)' },
  ];

  function soHienThi(so) { return so.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3'); }
  function soE164(so) { return '+84' + so.replace(/^0/, ''); }
  function nhanKhungGio(v) {
    for (var i = 0; i < KHUNG_GIO.length; i++) if (KHUNG_GIO[i].v === v) return KHUNG_GIO[i].l;
    return '';
  }
  function vcardHref() {
    var vcard = [
      'BEGIN:VCARD', 'VERSION:3.0',
      'FN:' + NGUOI_GOI,
      'N:;' + NGUOI_GOI + ';;;',
      'ORG:ALN - App Làm Nhà',
      'TEL;TYPE=CELL:' + soE164(SO_GOI),
      'URL:https://applamnha.vn',
      'END:VCARD', '',
    ].join('\r\n');
    return 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcard);
  }

  function injectStyle() {
    if (document.getElementById('alnCallbackStyle')) return;
    var st = document.createElement('style');
    st.id = 'alnCallbackStyle';
    // Token màu lấy theo trang (du-toan-nha: --ink/--sub/--line; khong-gian-nha:
    // --text-1/--text-2/--border-soft), fallback về bảng sáng chung.
    st.textContent =
      '.aln-cb{margin-top:12px;padding:14px;border:1px solid var(--line,var(--border-soft,#e3dfd4));border-left:3px solid var(--gold,#b8860b);' +
        'border-radius:10px;background:var(--card,#fff);color:var(--ink,var(--text-1,#141a2b));font-size:15px;line-height:1.6;text-align:left}' +
      '.aln-cb p{margin:0 0 4px}' +
      '.aln-cb .aln-cb-head{font-weight:700}' +
      '.aln-cb .aln-cb-so{font-family:var(--mono,var(--f-mono,monospace));font-weight:600;white-space:nowrap}' +
      '.aln-cb .aln-cb-sub{color:var(--sub,var(--text-2,#4a5268));font-size:14px}' +
      '.aln-cb .aln-cb-vcard{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin:8px 0 4px;padding:8px 14px;' +
        'border:1px solid var(--gold,#b8860b);border-radius:9px;color:var(--gold,#b8860b);font-weight:600;text-decoration:none;font-size:14px}' +
      '.aln-cb .aln-cb-slot{margin-top:10px;padding-top:10px;border-top:1px solid var(--line,var(--border-soft,#e3dfd4))}' +
      '.aln-cb label{display:block;font-size:13px;color:var(--sub,var(--text-2,#4a5268));margin-bottom:4px;font-weight:500}' +
      '.aln-cb .aln-cb-row{display:flex;gap:8px;flex-wrap:wrap}' +
      '.aln-cb select{flex:1 1 170px;min-width:0;min-height:44px;font:inherit;font-size:15px;color:var(--ink,var(--text-1,#141a2b));background:var(--card,#fff);' +
        'border:1.5px solid var(--line2,var(--border-soft,#c9c0aa));border-radius:9px;padding:8px 10px}' +
      '.aln-cb .aln-cb-save{flex:0 0 auto;min-height:44px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;border-radius:9px;padding:8px 14px;' +
        'border:1px solid var(--navy2,#111c33);background:var(--navy2,#111c33);color:#fff}' +
      '.aln-cb .aln-cb-save:disabled{opacity:.7;cursor:default}' +
      '.aln-cb .aln-cb-status{min-height:1.4em;margin-top:6px;font-size:13.5px;color:var(--sub,var(--text-2,#4a5268))}' +
      '.aln-cb .aln-cb-status.ok{color:var(--ink,var(--text-1,#141a2b));font-weight:600}' +
      '.aln-cb .aln-cb-status.err{color:var(--warn,var(--red,#8a5e08))}' +
      '.aln-cb .aln-cb-relogin{color:inherit;font-weight:700;text-decoration:underline}' +
      '.aln-cb .aln-cb-zalo{display:flex;align-items:center;justify-content:center;min-height:44px;margin-top:10px;padding:10px 14px;border-radius:9px;' +
        'background:#0068ff;color:#fff;font-weight:700;font-size:14px;text-decoration:none;text-align:center}';
    document.head.appendChild(st);
  }

  // Lỗi "cần đăng nhập lại": trang tự báo trước khi gọi (không còn phiên
  // Phone Auth) hoặc server trả unauthenticated.
  var LOI_CAN_DANG_NHAP = 'aln/can-dang-nhap';
  function canDangNhapLai(err) {
    var code = err && err.code;
    return code === LOI_CAN_DANG_NHAP || code === 'functions/unauthenticated' || code === 'unauthenticated';
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /**
   * mount(container, opts) — vẽ khối xác nhận vào container.
   * opts.houseId, opts.khungGio (giá trị đã lưu, nếu có), opts.viTri
   * (data-aln-cta cho nút Zalo), opts.save(houseId, khungGio) -> Promise,
   * opts.loginUrl (trang đăng nhập lại khi phiên đã mất).
   * Trả về { setHouse(houseId, khungGio) } để trang cập nhật lại từ dữ liệu mới.
   */
  function mount(container, opts) {
    opts = opts || {};
    injectStyle();
    container.replaceChildren();
    container.classList.add('aln-cb');

    container.appendChild(el('p', 'aln-cb-head', 'ALN đã nhận dự toán của anh/chị.'));
    var p2 = el('p');
    p2.appendChild(document.createTextNode(NGUOI_GOI + ' sẽ gọi trong 24 giờ từ số '));
    p2.appendChild(el('span', 'aln-cb-so', soHienThi(SO_GOI)));
    p2.appendChild(document.createTextNode('.'));
    container.appendChild(p2);
    container.appendChild(el('p', 'aln-cb-sub', 'Anh/chị lưu số này để không lỡ cuộc gọi.'));

    var vcard = el('a', 'aln-cb-vcard', 'Lưu số vào danh bạ');
    vcard.href = vcardHref();
    vcard.setAttribute('download', 'KTS-Tran-Long-ALN.vcf');
    container.appendChild(vcard);

    var slot = el('div', 'aln-cb-slot');
    var selId = 'alnCbSel' + Math.random().toString(36).slice(2, 8);
    var lab = el('label', null, 'Khung giờ anh/chị tiện nghe máy');
    lab.htmlFor = selId;
    var row = el('div', 'aln-cb-row');
    var sel = el('select');
    sel.id = selId;
    var ph = el('option', null, 'Chọn khung giờ');
    ph.value = '';
    sel.appendChild(ph);
    KHUNG_GIO.forEach(function (k) { var o = el('option', null, k.l); o.value = k.v; sel.appendChild(o); });
    var btn = el('button', 'aln-cb-save', 'Lưu khung giờ');
    btn.type = 'button';
    var status = el('div', 'aln-cb-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    row.appendChild(sel);
    row.appendChild(btn);
    slot.appendChild(lab);
    slot.appendChild(row);
    slot.appendChild(status);
    container.appendChild(slot);

    var zalo = el('a', 'aln-cb-zalo', 'Muốn trao đổi ngay? Chat Zalo');
    zalo.href = 'https://zalo.me/' + SO_GOI;
    zalo.target = '_blank';
    zalo.rel = 'noopener';
    zalo.setAttribute('data-aln-cta', opts.viTri || 'sau_luu');
    container.appendChild(zalo);

    var houseId = null;
    var saved = '';
    var dirty = false;
    var busy = false;
    function setStatus(text, kind) {
      status.textContent = text;
      status.className = 'aln-cb-status' + (kind ? ' ' + kind : '');
    }
    function setHouse(id, khungGio) {
      houseId = id || null;
      slot.hidden = !houseId;
      var v = nhanKhungGio(khungGio) ? khungGio : '';
      // Không ghi đè lựa chọn khách đang sửa dở bằng dữ liệu snapshot.
      if (!dirty && !busy) {
        saved = v;
        sel.value = v;
        if (v && !status.textContent) setStatus('Đã chọn: ' + nhanKhungGio(v), 'ok');
      }
    }
    sel.addEventListener('change', function () { dirty = sel.value !== saved; if (dirty) setStatus(''); });
    btn.addEventListener('click', function () {
      if (busy || !houseId) return;
      var v = sel.value;
      if (!nhanKhungGio(v)) { setStatus('Chọn một khung giờ trước.', 'err'); return; }
      busy = true;
      btn.disabled = true;
      setStatus('Đang lưu…');
      Promise.resolve()
        .then(function () { return opts.save(houseId, v); })
        .then(function () {
          saved = v;
          dirty = false;
          setStatus('Đã lưu: ' + nhanKhungGio(v), 'ok');
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: 'aln_khung_gio_chon', khung_gio: v });
        }, function (err) {
          if (canDangNhapLai(err) && opts.loginUrl) {
            // Phiên Phone Auth đã mất (vd tab khác cùng trình duyệt đăng xuất)
            // — thử lại cũng không được, mời đăng nhập lại thay cho "Chưa lưu được".
            setStatus('Phiên đăng nhập trên trình duyệt này đã kết thúc nên chưa lưu được khung giờ. ', 'err');
            var a = el('a', 'aln-cb-relogin', 'Đăng nhập lại');
            a.href = opts.loginUrl;
            status.appendChild(a);
            return;
          }
          setStatus('Chưa lưu được — bấm Lưu khung giờ để thử lại.', 'err');
        })
        .then(function () { busy = false; btn.disabled = false; });
    });

    setHouse(opts.houseId, opts.khungGio);
    return { setHouse: setHouse };
  }

  window.alnCallback = {
    SO_GOI: SO_GOI,
    NGUOI_GOI: NGUOI_GOI,
    KHUNG_GIO: KHUNG_GIO,
    soHienThi: soHienThi,
    nhanKhungGio: nhanKhungGio,
    LOI_CAN_DANG_NHAP: LOI_CAN_DANG_NHAP,
    mount: mount,
  };
})();
