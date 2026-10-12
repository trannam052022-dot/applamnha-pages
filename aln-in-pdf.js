/*
 * aln-in-pdf.js — nút "Tải PDF" chạy được cả khi điện thoại không mở hộp In (12/10/2026).
 *
 * Sự cố 12/10/2026: khách bấm "Tải PDF" ở in-du-toan.html trên điện thoại, không có gì
 * xảy ra. Nguyên nhân thường gặp: trang mở trong trình duyệt nằm trong Zalo/Facebook/
 * Messenger/Instagram — window.print() ở đó không làm gì, không báo lỗi.
 *
 * Cách làm: gọi window.print() NGAY trong lượt bấm (Safari iOS chặn print sau await).
 * Hộp In mở thật thì trình duyệt phát "beforeprint". Sau 1,5 giây không có tín hiệu đó
 * → hiện khung hướng dẫn mở trang bằng Chrome/Safari (+ nút mở Chrome trên Android,
 * nút sao chép link). Không dò user-agent để quyết định có in hay không — chỉ dùng để
 * chọn câu hướng dẫn cho đúng app.
 *
 * Dùng: window.alnInPdf({ trang: 'in-du-toan' }) trong handler click.
 * Chỉ textContent, không innerHTML.
 */
(function () {
  'use strict';
  var UA = navigator.userAgent || '';
  var IOS = /iPhone|iPad|iPod/i.test(UA);
  var ANDROID = /Android/i.test(UA);
  var TEN_APP = /Zalo/i.test(UA) ? 'Zalo'
    : /FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(UA) ? 'Facebook'
    : /Instagram/i.test(UA) ? 'Instagram'
    : /TikTok|musical_ly|BytedanceWebview/i.test(UA) ? 'TikTok'
    : '';
  var WEBVIEW = !!TEN_APP || (ANDROID && /; wv\)/.test(UA)) || (IOS && !/Safari\//.test(UA));
  var CHO_MS = 1500;

  var daIn = false;
  function danhDauIn() { daIn = true; an(); }
  window.addEventListener('beforeprint', danhDauIn);
  try {
    var mq = window.matchMedia && window.matchMedia('print');
    if (mq) {
      var nghe = function (e) { if (e.matches) danhDauIn(); };
      if (mq.addEventListener) mq.addEventListener('change', nghe);
      else if (mq.addListener) mq.addListener(nghe);
    }
  } catch (e) {}

  function day(ev, p) {
    try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, p || {})); } catch (e) {}
  }

  var hop = null;
  function an() { if (hop) hop.hidden = true; }

  function nut(chu, chinh, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = chu;
    b.style.cssText = 'font:inherit;font-size:15px;font-weight:600;min-height:44px;padding:10px 14px;border-radius:8px;cursor:pointer;'
      + (chinh ? 'background:#0f1a30;color:#fff;border:1px solid #0f1a30' : 'background:#fff;color:#0f1a30;border:1px solid #9ea4b0');
    b.addEventListener('click', fn);
    return b;
  }

  function saoChep(b) {
    var link = location.href;
    function xong() { b.textContent = 'Đã sao chép link ✓'; }
    function thuCu() {
      try {
        var t = document.createElement('textarea');
        t.value = link; t.setAttribute('readonly', '');
        t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(t); t.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(t);
        if (ok) { xong(); return; }
      } catch (e) {}
      window.prompt('Sao chép link này rồi dán vào Chrome hoặc Safari:', link);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(xong, thuCu);
    } else thuCu();
  }

  function moChrome() {
    // intent:// chỉ có trên Android; mở đúng trang hiện tại bằng Chrome.
    var u = new URL(location.href);
    var intentUrl = 'intent://' + u.host + u.pathname + u.search + u.hash
      + '#Intent;scheme=https;package=com.android.chrome;end';
    window.location.assign(intentUrl);
  }

  function hien(trang) {
    if (!hop) {
      hop = document.createElement('div');
      hop.className = 'no-print';
      hop.setAttribute('role', 'alertdialog');
      hop.setAttribute('aria-live', 'assertive');
      hop.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:520px;margin:0 auto;'
        + 'background:#fff;border:2px solid #b8860b;border-radius:12px;padding:16px;box-shadow:0 8px 30px rgba(0,0,0,.25);'
        + 'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#10151f';
      document.body.appendChild(hop);
    }
    hop.textContent = '';
    var h = document.createElement('p');
    h.style.cssText = 'margin:0 0 6px;font-weight:700;font-size:16px';
    h.textContent = 'Điện thoại chưa mở được hộp lưu PDF';
    var p = document.createElement('p');
    p.style.margin = '0 0 6px';
    if (TEN_APP) {
      p.textContent = 'Anh/chị đang mở trang trong ứng dụng ' + TEN_APP + ' — trình duyệt trong ứng dụng này không lưu được PDF. '
        + (IOS ? 'Bấm nút ⋯ hoặc biểu tượng la bàn ở góc màn hình → chọn "Mở bằng Safari" / "Mở trong trình duyệt".'
               : 'Bấm nút ⋮ hoặc ⋯ ở góc trên → chọn "Mở bằng trình duyệt" / "Mở trong Chrome".');
    } else if (WEBVIEW) {
      p.textContent = 'Trình duyệt đang dùng không lưu được PDF. Anh/chị mở trang này bằng '
        + (IOS ? 'Safari' : 'Chrome') + ' rồi bấm "Tải PDF" lại.';
    } else {
      p.textContent = 'Anh/chị thử bấm "Tải PDF" lại. Nếu vẫn không thấy hộp In, mở trang này bằng '
        + (IOS ? 'Safari' : 'Chrome') + ' rồi bấm lại.';
    }
    var p2 = document.createElement('p');
    p2.style.cssText = 'margin:0 0 12px;font-size:14px;color:#343b4a';
    p2.textContent = 'Mở bằng trình duyệt khác có thể phải nhập lại mã OTP gửi về số điện thoại.';
    var hang = document.createElement('div');
    hang.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
    if (ANDROID) hang.appendChild(nut('Mở bằng Chrome', true, function () { day('aln_in_pdf_mo_chrome', { trang: trang }); moChrome(); }));
    var bChep = nut('Sao chép link', !ANDROID, function () { day('aln_in_pdf_sao_chep', { trang: trang }); saoChep(bChep); });
    hang.appendChild(bChep);
    hang.appendChild(nut('Đóng', false, an));
    hop.appendChild(h); hop.appendChild(p); hop.appendChild(p2); hop.appendChild(hang);
    hop.hidden = false;
  }

  window.alnInPdf = function (opt) {
    var trang = (opt && opt.trang) || '';
    daIn = false;
    an();
    try { window.print(); } catch (e) {}
    setTimeout(function () {
      if (daIn) return;
      day('aln_in_pdf_khong_mo', { trang: trang, trong_app: TEN_APP || (WEBVIEW ? 'webview' : 'khong') });
      hien(trang);
    }, CHO_MS);
  };
})();
