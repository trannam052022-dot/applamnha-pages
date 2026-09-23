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
            // Thanh Zalo sẵn có của Dự toán: đổi event tại cùng handler để không nhân Contact.
            var estimateBottom = /\/du-toan-nha\.html$/.test(window.location.pathname) && el.getAttribute('data-aln-cta') === 'widget-sticky';
            if (estimateBottom) payload = { event: 'aln_zalo_click', vi_tri: 'thanh_day' };
            // Nút Zalo trong khối xác nhận sau khi lưu dự toán (scripts/aln-callback.js).
            var afterSave = el.getAttribute('data-aln-cta') === 'sau_luu';
            if (afterSave) payload = { event: 'aln_zalo_click', vi_tri: 'sau_luu' };
            var utm = !estimateBottom && !afterSave && window.alnGetUtm ? window.alnGetUtm() : {};
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

/* ══ ALN Attribution v1.0 — ALN_PROOF_LOOP_CONTRACT_v1.0.md §A ══════════════
   Ghi điểm chạm (first/last/asset) cho MỌI trang nhúng file này, để lead ở
   /du-toan/ biết mình đến từ kênh nào và bài Cẩm nang nào.
   - localStorage key 'aln_attr' (KHÔNG đụng aln_utm/aln_fbc/aln_internal).
   - Không PII: chỉ nguồn/kênh/đường dẫn/ID asset.
   - aln-gi-conversion.js giữ nguyên hợp đồng "không storage" của nó — phần
     lưu trữ nằm ở đây.
   - ?aln_test=1 bật cờ test 24h (tắt: ?aln_test=0): mọi lead mang aln_test,
     gtag chạy debug_mode → thấy trong DebugView, bị bộ lọc Developer traffic
     của GA4 loại khỏi báo cáo.
   ES5 thuần. */
(function(){
  var KEY = 'aln_attr', VER = 1;
  var FT_TTL = 90 * 864e5;      // first_touch hết hạn sau 90 ngày
  var AT_TTL = 30 * 864e5;      // asset_touch còn hiệu lực 30 ngày
  var SESSION_GAP = 30 * 60e3;  // 30 phút không hoạt động = phiên mới
  var TEST_TTL = 864e5;
  var ASSET_RE = /^W\d{2}-A\d{2}$/;
  var CTA_RE = /^(W\d{2}-A\d{2})-[a-z0-9-]{1,80}$/;
  var SELF_RE = /(^|\.)applamnha\.vn$/i;
  var SEARCH_RE = /(^|\.)(google\.[a-z.]+|bing\.com|coccoc\.com|search\.yahoo\.com|duckduckgo\.com|yandex\.[a-z.]+)$/i;
  var SOCIAL_RE = /(^|\.)(facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|threads\.net|linkedin\.com|lnkd\.in|t\.co|x\.com|twitter\.com|pinterest\.[a-z.]+)$/i;
  var ZALO_RE = /(^|\.)zalo(app)?\.(me|vn|com)$/i;
  var PAID_MEDIUM_RE = /^(cpc|ppc|cpm|cpv|paid|paid[_-]?social|paidsocial|ads?|display|retargeting)$/i;

  function now(){ return new Date().getTime(); }
  function cut(v, n){ return (typeof v === 'string') ? v.slice(0, n) : ''; }
  function hostOf(url){
    var m = /^[a-z][a-z0-9+.-]*:\/\/([^\/?#:]+)/i.exec(url || '');
    return m ? m[1].toLowerCase() : '';
  }
  function params(){
    var out = {}, parts = location.search.substring(1).split('&');
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var kv = parts[i].split('=');
      try {
        out[decodeURIComponent(kv[0])] = kv.length > 1 ? decodeURIComponent(kv.slice(1).join('=').replace(/\+/g, ' ')) : '';
      } catch (e) {}
    }
    return out;
  }
  /* mem: bản sao trong bộ nhớ trang — khi localStorage bị chặn (trình duyệt
     riêng tư/ITP) vẫn giữ được attribution trong lượt tải trang hiện tại. */
  var mem = null;
  function read(){
    var s = null;
    try { s = localStorage.getItem(KEY); } catch (e) {}
    if (!s) s = mem;
    if (!s) return {};
    try {
      var o = JSON.parse(s);
      return (o && o.v === VER) ? o : {};
    } catch (e) { return {}; }
  }
  function write(o){
    o.v = VER;
    mem = JSON.stringify(o);
    try { localStorage.setItem(KEY, mem); } catch (e) {}
  }

  /* Quy tắc suy ra kenh — thứ tự ưu tiên: click id quảng cáo > UTM > referrer.
     Trả null khi là điều hướng nội bộ (không phải điểm chạm mới). */
  function classify(p, referrer){
    var src = cut(p.utm_source || '', 100).toLowerCase();
    var med = cut(p.utm_medium || '', 100).toLowerCase();
    var camp = cut(p.utm_campaign || '', 120);
    var touch = { kenh: '', source: src, medium: med, campaign: camp };
    if (p.fbclid || p.gclid || p.gbraid || p.wbraid || p.ttclid) {
      touch.kenh = 'paid';
      if (!touch.source) touch.source = p.gclid || p.gbraid || p.wbraid ? 'google' : (p.ttclid ? 'tiktok' : 'facebook');
      return touch;
    }
    if (src || med) {
      if (PAID_MEDIUM_RE.test(med)) touch.kenh = 'paid';
      else if (/zalo/.test(src) || /zalo/.test(med)) touch.kenh = 'zalo';
      else if (med === 'organic') touch.kenh = 'organic_search';
      else if (/social/.test(med)) touch.kenh = 'social';
      else touch.kenh = 'referral';
      return touch;
    }
    var h = hostOf(referrer);
    if (!h) { touch.kenh = 'direct'; touch.source = '(direct)'; touch.medium = '(none)'; return touch; }
    if (SELF_RE.test(h)) return null;
    touch.source = h;
    if (SEARCH_RE.test(h)) { touch.kenh = 'organic_search'; touch.medium = 'organic'; }
    else if (ZALO_RE.test(h)) { touch.kenh = 'zalo'; touch.medium = 'referral'; }
    else if (SOCIAL_RE.test(h)) { touch.kenh = 'social'; touch.medium = 'referral'; }
    else { touch.kenh = 'referral'; touch.medium = 'referral'; }
    return touch;
  }

  function assetFromCta(ctaId){
    var m = CTA_RE.exec(ctaId || '');
    return m ? m[1] : '';
  }

  function capture(){
    var p = params(), o = read(), t = now();
    var newSession = !o.seen || (t - o.seen) > SESSION_GAP;

    // Cờ test
    if (p.aln_test === '1') o.test = t;
    else if (p.aln_test === '0') delete o.test;
    if (o.test && t - o.test > TEST_TTL) delete o.test;

    var touch = classify(p, document.referrer || '');
    if (touch) {
      touch.landing = cut(location.pathname, 200);
      touch.ts = t;
      var isDirect = touch.kenh === 'direct';
      // direct giữa phiên (vd refresh, mở tab mới) không phải điểm chạm mới
      if (!(isDirect && !newSession)) {
        if (!o.ft || (t - o.ft.ts) > FT_TTL) o.ft = touch;          // first_touch: ghi một lần
        if (!isDirect || !o.lt) o.lt = touch;                        // last non-direct click
      }
    }

    // Fallback khi storage không giữ được asset_touch: CTA đã gắn aln_a/aln_c
    // vào URL lúc click. Chỉ tin khi đến từ chính applamnha.vn (link bị chia sẻ
    // lại ra ngoài không được tính là chạm asset).
    if (p.aln_c && SELF_RE.test(hostOf(document.referrer || ''))) {
      var a = assetFromCta(p.aln_c);
      if (a && (!p.aln_a || p.aln_a === a) && (!o.at || o.at.cta_id !== p.aln_c)) {
        o.at = { asset_id: a, cta_id: cut(p.aln_c, 120), ts: t, path: '(url)' };
      }
    }
    if (o.at && (t - o.at.ts) > AT_TTL) delete o.at;

    o.seen = t;
    write(o);
    return o;
  }

  var state = capture();

  if (state.test) {
    window.ALN_TEST = true;
    try {
      window.dataLayer = window.dataLayer || [];
      (function(){ window.dataLayer.push(arguments); })('set', { debug_mode: true });
    } catch (e) {}
  }

  /* Click CTA Cẩm nang: lưu asset_touch và gắn aln_a/aln_c vào href NGAY LÚC
     CLICK (không sửa DOM trước → crawler không thấy URL có tham số). */
  document.addEventListener('click', function(ev){
    var el = ev.target;
    while (el && el.getAttribute) {
      var cta = el.getAttribute('data-aln-gi-cta');
      if (cta) {
        var a = assetFromCta(cta);
        if (!a) return;
        var o = read();
        o.at = { asset_id: a, cta_id: cut(cta, 120), ts: now(), path: cut(location.pathname, 200) };
        o.seen = now();
        write(o);
        if (el.tagName === 'A') {
          var href = el.getAttribute('href') || '';
          if (href.charAt(0) === '/' && href.charAt(1) !== '/' && href.indexOf('aln_c=') === -1) {
            var hashAt = href.indexOf('#');
            var base = hashAt === -1 ? href : href.slice(0, hashAt);
            var hash = hashAt === -1 ? '' : href.slice(hashAt);
            el.setAttribute('href', base + (base.indexOf('?') === -1 ? '?' : '&') +
              'aln_a=' + encodeURIComponent(a) + '&aln_c=' + encodeURIComponent(cta) + hash);
          }
        }
        return;
      }
      el = el.parentNode;
    }
  }, true);

  function pub(t){
    if (!t) return null;
    return { kenh: t.kenh, source: t.source || '', medium: t.medium || '', campaign: t.campaign || '',
             landing: t.landing || '', ts: t.ts };
  }

  window.alnAttr = {
    contract: 'aln-attr-1.0',
    isTest: function(){ var o = read(); return !!(o.test && now() - o.test <= TEST_TTL); },
    /* Payload gửi kèm lead (submitDuToanLead) — đúng schema §A.1 */
    forLead: function(){
      var o = read(), t = now();
      var at = (o.at && (t - o.at.ts) <= AT_TTL) ? o.at : null;
      return {
        contract_version: 'aln-attr-1.0',
        first_touch: pub(o.ft),
        last_touch: pub(o.lt),
        asset_touch: at ? { asset_id: at.asset_id, cta_id: at.cta_id, ts: at.ts } : null,
        aln_test: this.isTest()
      };
    },
    _classify: classify
  };
})();
