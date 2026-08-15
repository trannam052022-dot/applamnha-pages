/* ALN — helper tracking dùng chung cho các trang phễu (kts-apply, index, forum,
   recruit, tuyen-kts, giữ chỗ). KHÔNG thay UTM/Pixel hiện có ở từng trang —
   chỉ bổ sung dataLayer cho các điểm chạm mới theo spec FB Pixel + UTM (2026-07-14).
   Load bằng <script src="aln-tracking.js"></script> (ES5, không optional chaining). */
(function(){

  window.alnAdTypeHint = function(){
    try{
      var ref = document.referrer || '';
      if (/m\.me|messenger\.com/i.test(ref)) return 'ctm';
      return 'unknown';
    }catch(e){ return 'unknown'; }
  };

  /* Nhãn trang cho event tự động: trang nào muốn tên đẹp thì đặt
     window.ALN_PAGE_LABEL = 'homepage' TRƯỚC khi load file này; không đặt thì
     dùng location.pathname. */
  function pageLabelAuto(){
    return window.ALN_PAGE_LABEL || location.pathname;
  }

  /* nhom_trang: phân loại đối tượng trang theo đường dẫn — cho phép tách
     luồng khi đọc báo cáo Zalo (chủ nhà/KTS/NCC/thợ lẫn vào 1 số tổng thì vô
     dụng cho việc phân bổ ngân sách ads theo từng đối tượng). Rule cụ thể
     xét trước, "chu_nha" là nhóm mặc định rộng nhất nên xét gần cuối, "chung"
     mới thật sự là fallback cuối cùng. Trang nào muốn ép nhóm khác tự động
     dò ra thì đặt window.ALN_PAGE_GROUP = 'kts' TRƯỚC khi load file này. */
  function nhomTrangAuto(){
    if (window.ALN_PAGE_GROUP) return window.ALN_PAGE_GROUP;
    var p = location.pathname;
    function has(list){
      for (var i = 0; i < list.length; i++) { if (p.indexOf(list[i]) !== -1) return true; }
      return false;
    }
    // kts: KTS + đối tác chuyên môn (DN/Designer/KS Vùng dùng chung phễu "đối tác")
    if (has(['/aln-giu-cho/', 'kts-apply', 'dn-studio', 'designer-apply', 'ks-apply', 'recruit.html', 'tuyen-kts', 'kts_profile'])) return 'kts';
    // tho: Thợ - Đội thi công
    if (has(['/thicong/', 'tho-thi-cong', 'tho-giu-cho', 'ktv-apply'])) return 'tho';
    // ncc: Nhà cung cấp vật tư/thiết bị
    if (has(['ncc-apply', 'ncc-showcase', 'ncc_profile', 'nccshowcase'])) return 'ncc';
    // chu_nha: mọi phễu/nội dung hướng tới chủ nhà (SEO tỉnh/mẫu/dự toán/cẩm
    // nang, trang chủ, đăng ký CN, sửa vặt...)
    if (has(['/thiet-ke-nha/', '/mau/', '/du-toan/', '/cam-nang/', 'sua-vat', 'chu-nha', 'register.html', 'home.html']) || p === '/' || p === '' || /index\.html$/.test(p)) return 'chu_nha';
    return 'chung';
  }

  /* Tự động bắn tracking khi click link tel: hoặc zalo.me/<hotline> (KHÔNG
     tính zalo.me/share/... — đó là chia sẻ, khác hẳn mục đích liên hệ) — mọi
     trang nhúng file này đều có, KHÔNG cần gắn onclick từng link. Delegation
     ở document nên bắt cả link render sau (dùng capture để chạy trước khi
     rời trang). vi_tri lấy từ data-aln-cta nếu link đã có sẵn (quy ước đặt
     tên CTA dùng chung toàn site), không có thì 'unknown'. */
  document.addEventListener('click', function(ev){
    var el = ev.target;
    while (el && el.getAttribute) {
      if (el.tagName === 'A') {
        var href = el.getAttribute('href') || '';
        if (href.indexOf('tel:') === 0) {
          try{
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'aln_click_call', aln_source_page: pageLabelAuto() });
            if (window.fbq) window.fbq('track', 'Contact', { content_name: 'Hotline' });
            if (window.gtag) window.gtag('event', 'contact', { method: 'hotline' });
          }catch(e){}
          return;
        }
        if (href.indexOf('zalo.me') !== -1 && href.indexOf('zalo.me/share') === -1) {
          try{
            var payload = {
              event: 'aln_click_zalo',
              vi_tri: el.getAttribute('data-aln-cta') || 'unknown',
              trang: pageLabelAuto(),
              nhom_trang: nhomTrangAuto()
            };
            var utm = window.alnGetUtm ? window.alnGetUtm() : {};
            for (var k in utm) { if (Object.prototype.hasOwnProperty.call(utm, k) && k !== 'ts') payload['utm_' + k] = utm[k]; }
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push(payload);
            if (window.fbq) window.fbq('track', 'Contact', { content_name: 'Zalo' });
          }catch(e){}
          return;
        }
      }
      el = el.parentNode;
    }
  }, true);

  /* Bắn dataLayer khi cuộn qua các mốc % chiều cao trang (1 lần / mốc). */
  var scrollDepthInited = false;
  window.alnScrollDepth = function(pageLabel, thresholds){
    scrollDepthInited = true;
    thresholds = thresholds || [25, 50, 75, 100];
    var fired = {};
    function check(){
      var doc = document.documentElement;
      var scrollTop = window.pageYOffset || doc.scrollTop || 0;
      var height = doc.scrollHeight - doc.clientHeight;
      if (height <= 0) return;
      var pct = Math.round((scrollTop / height) * 100);
      for (var i = 0; i < thresholds.length; i++) {
        var t = thresholds[i];
        if (pct >= t && !fired[t]) {
          fired[t] = true;
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: 'aln_scroll_depth', aln_scroll_pct: t, aln_source_page: pageLabel });
        }
      }
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  };

  /* Bắn dataLayer khi video xem qua các mốc % thời lượng (1 lần / mốc / lượt tải trang). */
  window.alnVideoProgress = function(videoEl, label, thresholds){
    if (!videoEl) return;
    thresholds = thresholds || [25, 50, 75, 100];
    var fired = {};
    videoEl.addEventListener('timeupdate', function(){
      if (!videoEl.duration) return;
      var pct = Math.round((videoEl.currentTime / videoEl.duration) * 100);
      for (var i = 0; i < thresholds.length; i++) {
        var t = thresholds[i];
        if (pct >= t && !fired[t]) {
          fired[t] = true;
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: 'aln_video_progress', aln_video_pct: t, aln_video_label: label || '' });
        }
      }
    });
  };

  /* Tự init scroll depth cho trang không gọi tay (các trang SEO tĩnh).
     Trang nào đã gọi window.alnScrollDepth('label') trong script sync thì
     giữ nguyên label đó, không init đôi. */
  function autoInitScroll(){
    if (!scrollDepthInited) window.alnScrollDepth(pageLabelAuto());
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitScroll);
  } else {
    autoInitScroll();
  }

})();
