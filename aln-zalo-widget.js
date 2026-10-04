/* ALN — nút "Chat Zalo" dùng CHUNG, tự chèn vào trang (không có header/
 * footer include trong site này — cùng lý do đã áp dụng cho
 * ncc-network-badge.js). CHỈ dùng cho trang CHƯA có sẵn link Zalo riêng
 * (chu-nha.html/chu-nha-old.html tự có link Zalo hand-built, KHÔNG nhúng
 * file này).
 *
 * - Desktop/tablet (≥768px): pill nổi góc trên-phải, dưới khu vực topbar
 *   thường gặp (top:76px, không đè top:0 để tránh chồng logo/nav thật của
 *   từng trang — mỗi template có chiều cao topbar khác nhau).
 * - Mobile (<768px): sticky bar full-width dưới đáy màn hình.
 * - Số Zalo: 1 hằng số ZALO_NUMBER — sau này tách số theo đối tượng thì chỉ
 *   sửa đúng 1 chỗ.
 * - Có data-aln-cta để aln-tracking.js (nếu đã nhúng, đứng TRƯỚC file này)
 *   đo được click qua cùng cơ chế delegation dùng cho mọi link Zalo khác.
 *
 * Mount lúc window 'load' (không phải DOMContentLoaded) — cố ý đợi các
 * widget nổi khác (mymy-widget.js, aln-suggest-widget.js, ncc-network-
 * badge.js, nếu trang có nhúng) kịp tự render trước, để tự phát hiện và
 * tránh chồng lấn ở góc dưới màn hình trên mobile (xem computeLift()).
 */
(function(){
  var ZALO_NUMBER = '0909829696';
  var ZALO_URL = 'https://zalo.me/' + ZALO_NUMBER;

  /* Vị trí thanh dưới đáy trên điện thoại (sửa 04/10/2026 — đo thật: bản cũ nâng
     cứng 70px khi có nút MyMy vẫn đè nút 14px, và đè 47px ở du-toan-nha.html vì nút
     MyMy ở đó đã tự nâng lên trên thanh .dock):
     - Đứng NGAY TRÊN thanh cố định riêng của trang (phần tử có data-mymy-tranh,
       vd .dock của du-toan-nha) thay vì đè lên nó.
     - Thanh Zalo tự gắn data-mymy-tranh → mymy-moi.js nâng nút MyMy + khung chat
       lên trên thanh Zalo (không cần đoán chiều cao nút MyMy ở đây nữa).
     - Chip gợi ý (aln-suggest-widget.js, góc dưới-trái) / huy hiệu NCC không có cơ
       chế tự né → giữ cách cũ: nâng thêm 70px khi trang có chúng. */
  function chieuCaoThanhTrang(sticky){
    var ds = document.querySelectorAll('[data-mymy-tranh]');
    var H = window.innerHeight, W = window.innerWidth, cao = 0;
    for (var i = 0; i < ds.length; i++) {
      if (ds[i] === sticky) continue;
      var q = ds[i].getBoundingClientRect();
      if (!q.width || !q.height || q.width < W * 0.6 || q.bottom < H - 4) continue;
      if (getComputedStyle(ds[i]).position !== 'fixed') continue;
      cao = Math.max(cao, Math.ceil(H - q.top));
    }
    return cao;
  }
  function coWidgetKhongTuNe(){
    return !!(document.querySelector('.aln-sw-chip') || document.getElementById('alnNccNetworkBadge'));
  }
  function datViTri(sticky){
    if (getComputedStyle(sticky).display === 'none') { sticky.style.bottom = ''; return; }
    var b = chieuCaoThanhTrang(sticky) + (coWidgetKhongTuNe() ? 70 : 0);
    var moi = b ? b + 'px' : '';
    if (sticky.style.bottom !== moi) sticky.style.bottom = moi;
  }

  function mount(){
    if (document.getElementById('alnZaloWidget')) return; // tránh chèn 2 lần

    var style = document.createElement('style');
    style.textContent =
      '.aln-zalo-top{position:fixed;top:76px;right:14px;z-index:65;display:flex;align-items:center;gap:7px;' +
        'background:#0068ff;color:#fff;text-decoration:none;padding:9px 14px;border-radius:999px;' +
        'box-shadow:0 6px 20px rgba(0,104,255,.35);font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,"Inter",sans-serif;' +
        'font-size:13px;font-weight:600;line-height:1}' +
      '.aln-zalo-top svg{width:16px;height:16px;flex-shrink:0}' +
      '.aln-zalo-sticky{display:none}' +
      '@media(max-width:767px){' +
        '.aln-zalo-top{display:none}' +
        '.aln-zalo-sticky{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:65;' +
          'background:#0068ff;color:#fff;text-decoration:none;align-items:center;justify-content:center;gap:8px;' +
          'padding:13px 10px;font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,"Inter",sans-serif;' +
          'font-size:14px;font-weight:700;box-shadow:0 -4px 16px rgba(0,0,0,.18)}' +
        '.aln-zalo-sticky svg{width:18px;height:18px;flex-shrink:0}' +
      '}';
    document.head.appendChild(style);

    var iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.2 9.2 0 0 1-2.6-.4' +
      'L3 21l1.6-4.7A8.2 8.2 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 9 8.4z"/></svg>';

    var top = document.createElement('a');
    top.id = 'alnZaloWidget';
    top.className = 'aln-zalo-top';
    top.href = ZALO_URL;
    top.target = '_blank';
    top.rel = 'noopener';
    top.setAttribute('data-aln-cta', 'widget-topbar');
    top.setAttribute('aria-label', 'Chat Zalo tư vấn');
    top.innerHTML = iconSvg + '<span>Chat Zalo</span>';
    document.body.appendChild(top);

    var sticky = document.createElement('a');
    sticky.className = 'aln-zalo-sticky';
    sticky.setAttribute('data-mymy-tranh', '');
    sticky.href = ZALO_URL;
    sticky.target = '_blank';
    sticky.rel = 'noopener';
    sticky.setAttribute('data-aln-cta', 'widget-sticky');
    sticky.setAttribute('aria-label', 'Chat Zalo tư vấn');
    sticky.innerHTML = iconSvg + '<span>Chat Zalo tư vấn</span>';
    document.body.appendChild(sticky);
    datViTri(sticky);
    var hen = null;
    function henDat(){ if (!hen) hen = setTimeout(function(){ hen = null; datViTri(sticky); }, 80); }
    window.addEventListener('resize', henDat);
    window.addEventListener('scroll', henDat, { passive: true });
    setInterval(henDat, 1000); // thanh của trang có thể hiện/ẩn khi đổi nội dung
  }

  if (document.readyState === 'complete') mount();
  else window.addEventListener('load', mount);
})();
