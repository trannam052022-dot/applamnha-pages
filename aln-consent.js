/* aln-consent.js — thông báo cookie + xin phép trước khi bật GA4 đo lường và
 * Meta Pixel (spec "PR 3: Thông báo cookie và đồng ý", Nam chốt 03/10/2026).
 *
 * NẠP ĐỒNG BỘ trong <head>, TRƯỚC snippet GTM, gtag.js và Meta Pixel (CI
 * scripts/check-consent.js kiểm vị trí trên mọi trang deploy). Không async/defer.
 *
 * Làm 3 việc ngay khi nạp:
 *  1. Đọc lựa chọn đã lưu: localStorage['aln_consent'] = {do_luong, quang_cao, ngay}
 *     (ngay = mốc ms lúc chọn; quá 180 ngày hoặc đọc lỗi → coi như chưa chọn).
 *  2. Google Consent Mode v2 — 'default' theo lựa chọn, chưa chọn thì denied cả 4.
 *  3. window.ALN_QC = true chỉ khi đã đồng ý Quảng cáo. Snippet Pixel (vẫn gọi
 *     cứng trong <head>, kiến trúc đã khoá) có thêm dòng
 *       fbq('consent', window.ALN_QC===true?'grant':'revoke');
 *     ngay TRƯỚC fbq('init') — scripts/gan-consent.js chèn dòng đó.
 *
 * Giao diện (thanh đáy + hộp Tuỳ chỉnh + link "Cài đặt cookie" ở chân trang)
 * dựng bằng DOM lúc trang tải xong, không cần sửa markup từng trang.
 * Thời điểm hiện (không hiện ngay khi vào trang):
 *   - du-toan-nha.html, /du-toan/: 3 giây sau aln_dt_result_view
 *     (aln-dt-su-kien.js gọi window.alnConsent.sauKetQua());
 *   - trang có form (có ô SĐT): sau khi gửi form thành công hoặc sau 30 giây;
 *   - bài viết, Kho Mẫu, trang còn lại: cuộn 50% hoặc 30 giây;
 *   - đã có lựa chọn còn hạn: không hiện.
 * ?internal=1 vẫn chặn tất cả như cũ (scripts/aln-optout.js), bất kể lựa chọn.
 * ES5 thuần.
 */
(function () {
  'use strict';
  var w = window, d = document;
  var KEY = 'aln_consent';
  var HAN_MS = 180 * 864e5;
  // Meta có tự gửi lại sự kiện đang chờ sau 'grant' không: chưa kiểm được trong
  // môi trường test (không ra được facebook.com). Nam kiểm trên Events Manager;
  // nếu thấy PageView trùng sau khi bấm Đồng ý thì đổi thành false.
  var BAN_LAI_PAGEVIEW = true;
  var CHINH_SACH = '/chinh-sach-quyen-rieng-tu/';

  function doc() {
    try {
      var v = JSON.parse(w.localStorage.getItem(KEY) || 'null');
      if (v && typeof v.do_luong === 'boolean' && typeof v.quang_cao === 'boolean' &&
          typeof v.ngay === 'number' && Date.now() - v.ngay >= 0 && Date.now() - v.ngay < HAN_MS) return v;
    } catch (e) {}
    return null;
  }
  function ghi(v) {
    try { w.localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
  }

  var daChon = doc();
  var hienTai = { do_luong: !!(daChon && daChon.do_luong), quang_cao: !!(daChon && daChon.quang_cao) };
  var chonTrongPhien = ''; // dong_y | tu_choi | tuy_chinh
  w.ALN_QC = hienTai.quang_cao;

  w.dataLayer = w.dataLayer || [];
  function g() { w.dataLayer.push(arguments); }
  function trangThaiGoogle(c) {
    return {
      analytics_storage: c.do_luong ? 'granted' : 'denied',
      ad_storage: c.quang_cao ? 'granted' : 'denied',
      ad_user_data: c.quang_cao ? 'granted' : 'denied',
      ad_personalization: c.quang_cao ? 'granted' : 'denied'
    };
  }
  g('consent', 'default', trangThaiGoogle(hienTai));

  function apDung(moi, kieu) {
    var truoc = { do_luong: hienTai.do_luong, quang_cao: hienTai.quang_cao };
    hienTai = { do_luong: !!moi.do_luong, quang_cao: !!moi.quang_cao };
    chonTrongPhien = kieu;
    ghi({ do_luong: hienTai.do_luong, quang_cao: hienTai.quang_cao, ngay: Date.now() });
    w.ALN_QC = hienTai.quang_cao;
    g('consent', 'update', trangThaiGoogle(hienTai));
    try {
      if (typeof w.fbq === 'function') {
        w.fbq('consent', hienTai.quang_cao ? 'grant' : 'revoke');
        if (hienTai.quang_cao && !truoc.quang_cao && BAN_LAI_PAGEVIEW) w.fbq('track', 'PageView');
      }
    } catch (e) {}
    try { d.dispatchEvent(new CustomEvent('aln:consent', { detail: { do_luong: hienTai.do_luong, quang_cao: hienTai.quang_cao, kieu: kieu, moi_bat_qc: hienTai.quang_cao && !truoc.quang_cao } })); } catch (e) {}
  }

  /* ───────── Giao diện ───────── */
  var CSS = '' +
    '.aln-ck{--ck-bg:#fff;--ck-ink:#141a2b;--ck-sub:#4a5268;--ck-line:#e3dfd4;--ck-navy:#0a1224;--ck-gold:#b8860b;--ck-focus:#b8860b;' +
    // Thẻ nhỏ góc dưới trái (10/10/2026, Nam: thanh ngang toàn màn hình gây khó chịu như mọi trang khác).
    'position:fixed;left:16px;bottom:16px;z-index:2147483000;width:min(380px,calc(100% - 32px));background:var(--ck-bg);color:var(--ck-ink);' +
    'border:1px solid var(--ck-line);border-radius:14px;box-shadow:0 8px 28px rgba(10,18,36,.16);font-family:"Be Vietnam Pro",Arial,sans-serif;font-size:15px;line-height:1.5;max-height:40vh;overflow:auto}' +
    '.aln-ck-in{padding:14px 16px;display:flex;flex-direction:column;gap:10px}' +
    '.aln-ck p{margin:0;color:var(--ck-sub)}.aln-ck p b{color:var(--ck-ink);font-weight:600}' +
    '@media (max-width:719px){.aln-ck{left:8px;bottom:8px;width:auto;right:8px;max-height:28vh;font-size:14px}.aln-ck-in{padding:10px 12px;gap:8px}.aln-ck .ck-chinh{min-width:96px}}' +
    '.aln-ck-nut{display:flex;flex-wrap:wrap;align-items:center;gap:8px}' +
    '.aln-ck button,.aln-ckd button{font:inherit;font-size:16px;cursor:pointer;border-radius:10px;min-height:44px}' +
    '.aln-ck .ck-chinh{min-width:104px;padding:8px 16px;font-weight:600;background:var(--ck-navy);color:#fff;border:1.5px solid var(--ck-navy)}' +
    '.aln-ck .ck-lk,.aln-ckd .ck-lk{background:none;border:0;padding:8px 6px;color:var(--ck-ink);text-decoration:underline;text-underline-offset:3px}' +
    '.aln-ck button:focus-visible,.aln-ckd button:focus-visible,.aln-ckd a:focus-visible,.aln-ckd input:focus-visible+span,.aln-ck-cd:focus-visible{outline:3px solid var(--ck-focus);outline-offset:2px}' +
    '.aln-ckd-nen{position:fixed;inset:0;z-index:2147483001;background:rgba(10,18,36,.55);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.aln-ckd{--ck-bg:#fff;--ck-ink:#141a2b;--ck-sub:#4a5268;--ck-line:#e3dfd4;--ck-navy:#0a1224;--ck-focus:#b8860b;background:var(--ck-bg);color:var(--ck-ink);' +
    'border-radius:14px;max-width:520px;width:100%;max-height:90vh;overflow:auto;padding:20px;font-family:"Be Vietnam Pro",Arial,sans-serif;font-size:16px;line-height:1.5;box-shadow:0 20px 50px rgba(0,0,0,.3)}' +
    '.aln-ckd h2{font-size:20px;margin:0 0 12px;line-height:1.3}' +
    '.aln-ckd .ck-dong{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;padding:12px 0;border-top:1px solid var(--ck-line)}' +
    '.aln-ckd .ck-dong b{display:block}.aln-ckd .ck-dong span.mt{color:var(--ck-sub)}' +
    '.aln-ckd label.sw{position:relative;flex:none;width:52px;height:30px;margin-top:2px}' +
    '.aln-ckd label.sw input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}' +
    '.aln-ckd label.sw span{position:absolute;inset:0;border-radius:30px;background:#c9c0aa;transition:background .15s;pointer-events:none}' +
    '.aln-ckd label.sw span:after{content:"";position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .15s}' +
    '.aln-ckd label.sw input:checked+span{background:#1f6f43}.aln-ckd label.sw input:checked+span:after{transform:translateX(22px)}' +
    '.aln-ckd .ck-chan{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid var(--ck-line)}' +
    '.aln-ckd .ck-luu{padding:8px 18px;font-weight:600;background:var(--ck-navy);color:#fff;border:1.5px solid var(--ck-navy)}' +
    '.aln-ckd a{color:var(--ck-ink)}' +
    '.aln-ck-cd{background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer}' +
    '.aln-ck-cd-dong{text-align:center;font-size:14px;padding:12px 16px 20px;color:#7a8196;font-family:"Be Vietnam Pro",Arial,sans-serif}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .aln-ck,:root:not([data-theme="light"]) .aln-ckd{--ck-bg:#121a2e;--ck-ink:#eef0f5;--ck-sub:#b5bccb;--ck-line:#24304a;--ck-navy:#e8c877;--ck-focus:#d4a017}' +
    ':root:not([data-theme="light"]) .aln-ck .ck-chinh,:root:not([data-theme="light"]) .aln-ckd .ck-luu{color:#0a1224}}' +
    '@media (prefers-reduced-motion:reduce){.aln-ckd label.sw span,.aln-ckd label.sw span:after{transition:none}}' +
    '.aln-quyen{margin:8px 0 0;font-size:max(13px,.85em);line-height:1.5;color:inherit;font-style:normal;text-align:inherit;flex-basis:100%}' +
    '@media print{.aln-ck,.aln-ckd-nen,.aln-ck-cd,.aln-ck-cd-dong{display:none!important}}';

  var thanh = null, hop = null, daCss = false, padCu = null, nutMoTruoc = null;

  function css() {
    if (daCss) return;
    daCss = true;
    var s = d.createElement('style');
    s.id = 'aln-consent-css';
    s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }
  function el(tag, attrs, chu) {
    var e = d.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (chu) e.textContent = chu;
    return e;
  }

  function dungThanh() {
    if (thanh) return thanh;
    css();
    thanh = el('div', { 'class': 'aln-ck', role: 'region', 'aria-label': 'Thông báo cookie', id: 'alnCk' });
    var vao = el('div', { 'class': 'aln-ck-in' });
    var p = el('p');
    // Câu chữ Nam duyệt 10/10/2026.
    p.appendChild(el('b', null, 'ALN sẽ nhắc lại bảng dự toán cho bạn trên Facebook.'));
    var nut = el('div', { 'class': 'aln-ck-nut' });
    var dy = el('button', { type: 'button', 'class': 'ck-chinh', 'data-ck': 'dong_y' }, 'Đồng ý');
    var tc = el('button', { type: 'button', 'class': 'ck-chinh', 'data-ck': 'tu_choi' }, 'Từ chối');
    var tu = el('button', { type: 'button', 'class': 'ck-lk', 'data-ck': 'tuy_chinh', 'aria-haspopup': 'dialog' }, 'Tuỳ chỉnh');
    dy.onclick = function () { apDung({ do_luong: true, quang_cao: true }, 'dong_y'); anThanh(); };
    tc.onclick = function () { apDung({ do_luong: false, quang_cao: false }, 'tu_choi'); anThanh(); };
    tu.onclick = function () { moHop(tu); };
    nut.appendChild(dy); nut.appendChild(tc); nut.appendChild(tu);
    vao.appendChild(p); vao.appendChild(nut); thanh.appendChild(vao);
    return thanh;
  }
  function hienThanh() {
    if (!d.body) return;
    var t = dungThanh();
    if (!t.parentNode) d.body.appendChild(t);
    t.hidden = false;
    // Đệm đáy trang bằng chiều cao thanh để thanh không che kết quả / form ở cuối trang.
    if (padCu !== null) return;
    // Màn rộng: thẻ chỉ chiếm một góc, không đệm đáy trang.
    try { if (w.matchMedia && !w.matchMedia('(max-width:719px)').matches) return; } catch (e) {}
    try {
      padCu = d.body.style.paddingBottom || '';
      var cao = t.getBoundingClientRect().height;
      var cu = parseFloat(w.getComputedStyle(d.body).paddingBottom) || 0;
      d.body.style.paddingBottom = (cu + cao) + 'px';
      // Link neo (#tuVan) và scrollIntoView dừng phía trên thanh, không bị thanh che.
      d.documentElement.style.scrollPaddingBottom = cao + 'px';
    } catch (e) {}
  }
  function anThanh() {
    if (thanh) { thanh.hidden = true; if (thanh.parentNode) thanh.parentNode.removeChild(thanh); }
    if (padCu !== null && d.body) { d.body.style.paddingBottom = padCu; padCu = null; d.documentElement.style.scrollPaddingBottom = ''; }
  }

  function moHop(nutGoi) {
    css();
    nutMoTruoc = nutGoi || d.activeElement;
    if (hop) dongHop(false);
    var nen = el('div', { 'class': 'aln-ckd-nen' });
    var h = el('div', { 'class': 'aln-ckd', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'alnCkdTieuDe' });
    h.appendChild(el('h2', { id: 'alnCkdTieuDe' }, 'Cài đặt cookie'));
    function dong(id, ten, mota, bat) {
      var r = el('div', { 'class': 'ck-dong' });
      var chu = el('div');
      chu.appendChild(el('b', { id: id + 'Ten' }, ten));
      chu.appendChild(el('span', { 'class': 'mt', id: id + 'Mt' }, mota));
      var lb = el('label', { 'class': 'sw' });
      var ip = el('input', { type: 'checkbox', role: 'switch', id: id, 'aria-labelledby': id + 'Ten', 'aria-describedby': id + 'Mt' });
      ip.checked = !!bat;
      lb.appendChild(ip); lb.appendChild(el('span'));
      r.appendChild(chu); r.appendChild(lb);
      h.appendChild(r);
      return ip;
    }
    // Mặc định tắt; mở lại từ "Cài đặt cookie" thì hiện đúng lựa chọn đang có.
    var ipDo = dong('alnCkDoLuong', 'Đo lường', 'Giúp ALN biết khách dùng trang thế nào để làm trang dễ dùng hơn.', !!doc() && hienTai.do_luong);
    var ipQc = dong('alnCkQuangCao', 'Quảng cáo', 'Để nhắc lại bảng dự toán của bạn trên Facebook.', !!doc() && hienTai.quang_cao);
    var chan = el('div', { 'class': 'ck-chan' });
    var cs = el('a', { href: CHINH_SACH, target: '_blank', rel: 'noopener' }, 'Chính sách quyền riêng tư');
    var nutDong = el('button', { type: 'button', 'class': 'ck-lk' }, 'Đóng');
    var luu = el('button', { type: 'button', 'class': 'ck-luu' }, 'Lưu lựa chọn');
    luu.onclick = function () {
      apDung({ do_luong: ipDo.checked, quang_cao: ipQc.checked }, 'tuy_chinh');
      dongHop(true);
    };
    nutDong.onclick = function () { dongHop(false); };
    var phai = el('div', { 'class': 'aln-ck-nut' });
    phai.appendChild(nutDong); phai.appendChild(luu);
    chan.appendChild(cs); chan.appendChild(phai);
    h.appendChild(chan);
    nen.appendChild(h);
    nen.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); dongHop(false); return; }
      if (e.key !== 'Tab') return;
      var f = h.querySelectorAll('a[href],button,input');
      if (!f.length) return;
      var dau = f[0], cuoi = f[f.length - 1];
      if (e.shiftKey && d.activeElement === dau) { e.preventDefault(); cuoi.focus(); }
      else if (!e.shiftKey && d.activeElement === cuoi) { e.preventDefault(); dau.focus(); }
    });
    nen.addEventListener('click', function (e) { if (e.target === nen) dongHop(false); });
    d.body.appendChild(nen);
    hop = nen;
    ipDo.focus();
  }
  // Đóng không lưu: quay lại thanh thông báo (nếu chưa có lựa chọn), KHÔNG tính là đồng ý.
  function dongHop(daLuu) {
    if (hop && hop.parentNode) hop.parentNode.removeChild(hop);
    hop = null;
    if (daLuu) anThanh();
    else if (!doc()) hienThanh();
    try { if (nutMoTruoc && nutMoTruoc.focus && d.body.contains(nutMoTruoc)) nutMoTruoc.focus(); } catch (e) {}
  }

  // Link "Cài đặt cookie" ở chân trang: chèn vào <footer> cuối, không có thì một dòng cuối trang.
  function ganChanTrang() {
    if (!d.body || d.getElementById('alnCkCaiDat')) return;
    var b = el('button', { type: 'button', 'class': 'aln-ck-cd', id: 'alnCkCaiDat', 'aria-haspopup': 'dialog' }, 'Cài đặt cookie');
    b.onclick = function () { moHop(b); };
    css();
    var fs = d.getElementsByTagName('footer');
    if (fs.length) {
      var dong = el('div', { 'class': 'aln-ck-cd-dong' });
      dong.style.padding = '8px 0 0';
      dong.style.color = 'inherit';
      dong.appendChild(b);
      fs[fs.length - 1].appendChild(dong);
    } else {
      var dong2 = el('div', { 'class': 'aln-ck-cd-dong' });
      dong2.appendChild(b);
      d.body.appendChild(dong2);
    }
  }

  /* ───────── Câu quyền dưới mọi form (Nam chốt 03/10/2026) ─────────
     Dưới mọi form có ô số điện thoại, ngay sau nút gửi, giữ một câu ngắn. Chi tiết
     vẫn ở trang chính sách. Trang tự đặt câu này (phần tử [data-aln-quyen]) thì
     không chèn thêm. Form vẽ sau (bước 2, hộp thoại) được bắt bằng MutationObserver. */
  var CAU_QUYEN = 'Bạn có thể yêu cầu ngừng liên hệ hoặc xoá dữ liệu bất cứ lúc nào.';
  function vungForm(tel) {
    var f = tel.closest ? tel.closest('form') : null;
    if (f) return f;
    var n = tel.parentElement;
    for (var i = 0; n && n !== d.body && i < 8; i++, n = n.parentElement) {
      if (n.querySelector('button, input[type="submit"]')) return n;
    }
    return null;
  }
  function nutGui(vung, tel) {
    var ds = vung.querySelectorAll('button, input[type="submit"]');
    var chon = null;
    for (var i = 0; i < ds.length; i++) {
      var b = ds[i];
      if (!(tel.compareDocumentPosition(b) & 4)) continue; // chỉ nút nằm SAU ô SĐT
      if (b.type === 'submit' || !chon) chon = b;
      if (b.type === 'submit') break;
    }
    return chon;
  }
  function ganCauQuyen() {
    if (!d.body) return;
    var tels = d.querySelectorAll('input[type="tel"]');
    for (var i = 0; i < tels.length; i++) {
      var vung = vungForm(tels[i]);
      if (!vung || vung.hasAttribute('data-aln-quyen-xong') || vung.querySelector('[data-aln-quyen]')) continue;
      vung.setAttribute('data-aln-quyen-xong', '');
      var p = el('p', { 'class': 'aln-quyen', 'data-aln-quyen': '' }, CAU_QUYEN);
      var nut = nutGui(vung, tels[i]);
      var sau = nut;
      // Nút nằm trong hàng ngang (flex row) → chèn dưới cả hàng, không chen giữa hàng.
      try {
        var cha = nut && nut.parentElement;
        var cs = cha && w.getComputedStyle(cha);
        if (cha && cha !== vung && cs && /flex/.test(cs.display) && !/column/.test(cs.flexDirection)) sau = cha;
      } catch (e) {}
      if (sau && sau.parentNode) sau.parentNode.insertBefore(p, sau.nextSibling);
      else vung.appendChild(p);
    }
  }
  function theoDoiForm() {
    ganCauQuyen();
    if (!w.MutationObserver || !d.body) return;
    var hen = null;
    new MutationObserver(function () {
      if (hen) return;
      hen = setTimeout(function () { hen = null; ganCauQuyen(); }, 300);
    }).observe(d.body, { childList: true, subtree: true });
  }

  /* ───────── Thời điểm hiện ───────── */
  var daHenHien = false;
  function henHien(ms) {
    if (daHenHien || doc()) return;
    daHenHien = true;
    setTimeout(function () { if (!doc() && !hop) hienThanh(); }, ms || 0);
  }
  function kieuTrang() {
    var p = location.pathname;
    var dn = /(^|[?&])dn=1(&|$)/.test(location.search.substring(1));
    if ((/\/du-toan-nha(\.html)?$/.test(p) && !dn) || /\/du-toan\/(index\.html)?$/.test(p)) return 'du_toan';
    if (/\/(cam-nang|mau|thiet-ke-nha|thicong|sua-nha)\//.test(p) || /\/sua-vat\/blog\//.test(p)) return 'bai';
    if (d.querySelector('input[type="tel"]')) return 'form';
    return 'bai';
  }
  function batDauHen() {
    ganChanTrang();
    css();
    try { theoDoiForm(); } catch (e) {}
    if (doc()) return;
    var kieu = kieuTrang();
    if (kieu === 'du_toan') return; // chờ alnConsent.sauKetQua()
    setTimeout(function () { henHien(0); }, 30000);
    if (kieu === 'form') {
      var RE = /^aln_(lead_submit|du_toan_luu|lead_nha_thau)$/;
      var t = setInterval(function () {
        if (daHenHien) { clearInterval(t); return; }
        var dl = w.dataLayer || [];
        for (var i = 0; i < dl.length; i++) if (dl[i] && RE.test(dl[i].event || '')) { clearInterval(t); henHien(1500); return; }
      }, 1000);
    } else {
      var nghe = function () {
        var de = d.documentElement;
        var cao = Math.max(de.scrollHeight - w.innerHeight, 1);
        if ((w.pageYOffset || de.scrollTop) / cao >= 0.5) { w.removeEventListener('scroll', nghe); henHien(0); }
      };
      w.addEventListener('scroll', nghe, { passive: true });
    }
  }

  w.alnConsent = {
    // Đã đồng ý Quảng cáo / Đo lường (lựa chọn đang có hiệu lực).
    qc: function () { return hienTai.quang_cao; },
    doLuong: function () { return hienTai.do_luong; },
    // Lần chọn gần nhất trong phiên; chưa chọn trong phiên thì suy từ lựa chọn đã lưu.
    trangThai: function () {
      if (chonTrongPhien) return chonTrongPhien;
      var c = doc();
      if (!c) return 'chua_chon';
      if (c.do_luong && c.quang_cao) return 'dong_y';
      if (!c.do_luong && !c.quang_cao) return 'tu_choi';
      return 'tuy_chinh';
    },
    sauKetQua: function () { if (kieuTrang() === 'du_toan') henHien(3000); },
    moCaiDat: function () { moHop(null); },
    CAU_QUYEN: CAU_QUYEN
  };

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', batDauHen);
  else batDauHen();
})();
