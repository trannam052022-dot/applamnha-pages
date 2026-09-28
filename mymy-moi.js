/* ═══════════════════════════════════════════════════════════════
   MyMy — bóng chat mời trò chuyện (dùng chung, thêm 28/09/2026)

   Chạy trên MỌI trang có nút MyMy (#mymy-btn + #mymy-win):
   - mymy-widget.js tự nạp file này (forum, trang đăng ký, thiet-ke-nha/...)
   - index.html nạp bằng thẻ <script src="mymy-moi.js" defer>

   Nam chốt 28/09/2026:
   1. Sau 8 giây hiện bóng chat cạnh nút, có nút × để tắt.
   2. Khi bóng chat hiện, nút nhịp sáng nhẹ 3 lần rồi dừng (không chớp liên
      tục). prefers-reduced-motion: không chạy hiệu ứng nào.
   3. Chưa mở chat thì nhắc lại 1 lần khi cuộn quá 50% trang hoặc đứng yên
      30 giây. Tối đa 2 lần/phiên (đếm chung mọi trang, sessionStorage).
      Đã bấm × hoặc đã mở chat → không nhắc nữa trong phiên.
   4. Không che thanh cố định (thanh tổng tiền, thanh CTA dưới đáy), nút
      "Gọi KTS", link, nút bấm hay form: đo trước khi hiện, đang hiện mà
      cuộn tới chỗ bị che thì tự ẩn.
   5. GA4: aln_mymy_moi (bóng chat hiện), aln_mymy_mo (mở chat), tham số
      vi_tri = tên trang. Không bắn Meta Pixel.

   Khách đã từng chat thật (localStorage aln_mymy_has_chatted, cùng key với
   widget) thì không mời nữa — giữ quy tắc cũ "không làm phiền khách quen".
   ═══════════════════════════════════════════════════════════════ */
(function () {
  if (window.__alnMyMyMoi) return;
  window.__alnMyMyMoi = true;

  var KEY_DEM = 'aln_mymy_moi_dem';   // số lần bóng chat đã hiện trong phiên
  var KEY_DUNG = 'aln_mymy_moi_dung'; // 'x' = đã bấm ×, 'mo' = đã mở chat
  var KEY_DA_CHAT = 'aln_mymy_has_chatted';
  var CHO_LAN_DAU = 8000;
  var CHO_DUNG_YEN = 30000;
  var TU_AN_SAU = 15000;
  var TOI_DA_PHIEN = 2;
  var LOI_MOI = 'Anh/Chị cần tư vấn? Nhắn em để được hỗ trợ ạ.';

  // sessionStorage có thể ném lỗi (chế độ riêng tư, chặn cookie) — khi đó
  // nhớ tạm trong bộ nhớ của trang, vẫn đúng giới hạn trong lượt xem này.
  var boNhoTam = {};
  function ssDoc(k) {
    try { var v = sessionStorage.getItem(k); if (v !== null) return v; } catch (e) { /* bỏ qua */ }
    return Object.prototype.hasOwnProperty.call(boNhoTam, k) ? boNhoTam[k] : null;
  }
  function ssGhi(k, v) {
    boNhoTam[k] = v;
    try { sessionStorage.setItem(k, v); } catch (e) { /* bỏ qua */ }
  }
  function daChatTruocDo() {
    try { return localStorage.getItem(KEY_DA_CHAT) === '1'; } catch (e) { return false; }
  }
  function giamChuyenDong() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function soLanDaHien() {
    var n = parseInt(ssDoc(KEY_DEM) || '0', 10);
    return isNaN(n) ? 0 : n;
  }

  // Tên trang cho GA4: "/" → trang-chu, "/thiet-ke-nha/tp-hcm.html" → thiet-ke-nha/tp-hcm
  function viTri() {
    var p = String(location.pathname || '/').replace(/^\/+/, '').replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '').replace(/\/+$/, '');
    return p || 'trang-chu';
  }
  function guiGA(ten) {
    var thamSo = { vi_tri: viTri() };
    try {
      if (typeof window.gtag === 'function') window.gtag('event', ten, thamSo);
      else (window.dataLayer = window.dataLayer || []).push({ event: ten, vi_tri: thamSo.vi_tri });
    } catch (e) { /* đo lường lỗi không được làm hỏng widget */ }
  }

  var CSS =
    '.mymy-moi{position:fixed;right:94px;bottom:28px;z-index:81;box-sizing:border-box;max-width:240px;' +
    'font-family:-apple-system,"Segoe UI",system-ui,sans-serif;font-size:14px;line-height:1.45;color:#efe9dc;' +
    'text-shadow:0 1px 3px rgba(0,0,0,.6);background:rgba(16,23,35,.94);border:1px solid rgba(255,255,255,.28);' +
    'border-radius:14px;padding:10px 34px 10px 13px;cursor:pointer;box-shadow:0 12px 34px rgba(8,12,20,.38);' +
    'animation:mymy-moi-vao .25s ease}' +
    '.mymy-moi::after{content:"";position:absolute;right:-6px;bottom:18px;width:10px;height:10px;background:inherit;' +
    'border-right:1px solid rgba(255,255,255,.28);border-top:1px solid rgba(255,255,255,.28);transform:rotate(45deg)}' +
    '.mymy-moi-x{position:absolute;top:4px;right:4px;width:26px;height:26px;border-radius:50%;border:none;' +
    'background:rgba(255,255,255,.14);color:#e6dfcc;font-size:16px;line-height:1;cursor:pointer;padding:0;' +
    'display:flex;align-items:center;justify-content:center}' +
    '.mymy-moi-x:hover,.mymy-moi-x:focus-visible{color:#fff;background:rgba(255,255,255,.26)}' +
    '@keyframes mymy-moi-vao{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:translateX(0)}}' +
    '#mymy-btn.mymy-nhip::after{content:"";position:absolute;inset:-5px;border-radius:50%;' +
    'border:2px solid rgba(224,170,62,.6);animation:mymy-nhip 1.3s ease-out 3}' +
    '@keyframes mymy-nhip{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.45);opacity:0}}' +
    '@media(max-width:480px){.mymy-moi{right:90px;max-width:calc(100vw - 102px)}}' +
    // Nâng lên trên thanh cố định: đứng ngay trên nút, bỏ đuôi chỉ sang ngang
    '.mymy-moi.mymy-moi-nang{right:16px;max-width:min(260px,calc(100vw - 32px))}.mymy-moi.mymy-moi-nang::after{display:none}' +
    '@media(prefers-reduced-motion:reduce){.mymy-moi{animation:none}#mymy-btn.mymy-nhip::after{animation:none;display:none}}';

  function khoiDong() {
    var nut = document.getElementById('mymy-btn');
    var khung = document.getElementById('mymy-win');
    if (!nut || !khung) return;

    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    var dung = false;       // đã × hoặc đã mở chat → không mời nữa
    var bong = null;        // phần tử bóng chat đang hiện
    var hengAn = null;      // hẹn giờ tự ẩn
    var dangCho = false;    // đang chờ chỗ trống để hiện (bị che)
    var henDungYen = null;
    var dangNghe = false;   // đang nghe cuộn/đứng yên để nhắc lại

    function dungHet(lyDo) {
      dung = true;
      if (lyDo) ssGhi(KEY_DUNG, lyDo);
      anBong();
      boNghe();
      dangCho = false;
      window.removeEventListener('scroll', thuLaiKhiCuon);
      window.removeEventListener('resize', thuLaiKhiCuon);
    }

    /* ── Mở chat: theo dõi class "open" của khung chat, bắt được mọi đường mở
       (bấm nút, bấm bóng chat, ?mymy=1, nút "Chat với MyMy" trên trang). ── */
    var dangMo = khung.classList.contains('open');
    function khiMo() {
      guiGA('aln_mymy_mo');
      dungHet('mo');
    }
    if (dangMo) khiMo();
    if (window.MutationObserver) {
      new MutationObserver(function () {
        var mo = khung.classList.contains('open');
        if (mo && !dangMo) khiMo();
        dangMo = mo;
      }).observe(khung, { attributes: true, attributeFilter: ['class'] });
    }

    /* ── Kiểm bóng chat có che thứ quan trọng không ──
       Lấy mẫu lưới điểm trong vùng bóng chat (bóng chat tạm "pointer-events:none"
       nên elementsFromPoint thấy xuyên qua), rồi xét từng phần tử + tổ tiên:
       thanh cố định/dính (position fixed/sticky), form, link, nút bấm, ô nhập. */
    var QUAN_TRONG = 'a[href],button,input,select,textarea,label,form,[role="button"],[data-aln-cta],[onclick]';
    function laCuaWidget(el) {
      return !!(el.closest && el.closest('#mymy-btn,#mymy-win,.mymy-moi'));
    }
    // Trả về phần tử bị che (ưu tiên khối cố định/dính bao ngoài, vd cả thanh
    // tổng tiền chứ không chỉ nút trong thanh), hoặc null nếu không quan trọng.
    function phanTuQuanTrong(el) {
      var trung = null;
      for (var n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        if (laCuaWidget(n)) return null;
        if (!trung && n.matches && n.matches(QUAN_TRONG)) trung = n;
        var vt = '';
        try { vt = getComputedStyle(n).position; } catch (e) { /* bỏ qua */ }
        if (vt === 'fixed' || vt === 'sticky') return n;
      }
      return trung;
    }
    // true = nằm ngoài màn hình; phần tử = thứ đang bị che; null = chỗ trống
    function timChe(el) {
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.left < 0 || r.top < 0 || r.right > window.innerWidth || r.bottom > window.innerHeight) return true;
      if (!document.elementsFromPoint) return null;
      var cot = 6, hang = 4;
      for (var i = 0; i <= cot; i++) {
        for (var j = 0; j <= hang; j++) {
          var x = r.left + 1 + (r.width - 2) * i / cot;
          var y = r.top + 1 + (r.height - 2) * j / hang;
          var ds = document.elementsFromPoint(x, y);
          for (var k = 0; k < ds.length; k++) {
            if (ds[k] === el || el.contains(ds[k])) continue;
            var qt = phanTuQuanTrong(ds[k]);
            if (qt) return qt;
          }
        }
      }
      return null;
    }
    // Thanh cố định ngang ở phần dưới màn hình (thanh tổng tiền, thanh Zalo
    // trên điện thoại — nằm cách đáy 70px, thanh CTA)?
    function laThanhDuoi(n) {
      if (!n || n === true || !n.getBoundingClientRect) return false;
      var vt = '';
      try { vt = getComputedStyle(n).position; } catch (e) { return false; }
      var q = n.getBoundingClientRect();
      var H = window.innerHeight;
      if (n.hasAttribute && n.hasAttribute('data-mymy-tranh')) return q.top >= H * 0.4; // trang tự đánh dấu (vd thanh tổng tiền nội thất)
      return (vt === 'fixed' || vt === 'sticky') && q.width >= window.innerWidth * 0.6 && q.top >= H * 0.55 && q.height < H * 0.4;
    }
    // Đặt bóng chat: mặc định cạnh nút; nếu đè thanh cố định ở phần dưới thì
    // nâng lên ngay trên thanh đó (tối đa 3 lần cho nhiều thanh chồng nhau).
    function datViTri(b) {
      b.style.bottom = nutNang ? (nutNang + 4) + 'px' : ''; // đứng cạnh nút, kể cả khi nút đang nâng
      b.classList.remove('mymy-moi-nang');
      for (var lan = 0; lan < 3; lan++) {
        var che = timChe(b);
        if (!che || !laThanhDuoi(che)) return che;
        var dinhThanh = che.getBoundingClientRect().top;
        b.classList.add('mymy-moi-nang');
        b.style.bottom = Math.ceil(window.innerHeight - dinhThanh + 10) + 'px';
      }
      return timChe(b);
    }

    function taoBong() {
      var b = document.createElement('div');
      b.className = 'mymy-moi';
      b.id = 'mymy-moi';
      b.setAttribute('role', 'dialog');
      b.setAttribute('aria-label', 'MyMy mời trò chuyện');
      var chu = document.createElement('span');
      chu.textContent = LOI_MOI;
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'mymy-moi-x';
      x.setAttribute('aria-label', 'Tắt lời mời');
      x.textContent = '×';
      b.appendChild(chu);
      b.appendChild(x);
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        dungHet('x');
      });
      b.addEventListener('click', function () {
        anBong();
        if (!khung.classList.contains('open')) nut.click();
      });
      return b;
    }

    function anBong() {
      if (hengAn) { clearTimeout(hengAn); hengAn = null; }
      window.removeEventListener('scroll', kiemKhiDangHien);
      window.removeEventListener('resize', kiemKhiDangHien);
      if (bong) { bong.remove(); bong = null; }
    }

    function nhipNut() {
      if (giamChuyenDong()) return;
      nut.classList.remove('mymy-nhip');
      void nut.offsetWidth; // chạy lại hiệu ứng nếu lần nhắc thứ 2
      nut.classList.add('mymy-nhip');
      setTimeout(function () { nut.classList.remove('mymy-nhip'); }, 4200); // 3 × 1,3 s
    }

    var henKiem = null;
    function kiemKhiDangHien() {
      if (henKiem) return;
      henKiem = setTimeout(function () {
        henKiem = null;
        if (!bong) return;
        bong.style.pointerEvents = 'none';
        var che = !!datViTri(bong);
        bong.style.pointerEvents = '';
        if (che) { anBong(); sauKhiAn(); }
      }, 150);
    }

    function thuHien() {
      if (dung || bong || khung.classList.contains('open')) return;
      if (soLanDaHien() >= TOI_DA_PHIEN) return;
      var b = taoBong();
      b.style.visibility = 'hidden';
      b.style.pointerEvents = 'none';
      document.body.appendChild(b);
      if (datViTri(b)) {
        b.remove();
        choChoTrong();
        return;
      }
      dangCho = false;
      window.removeEventListener('scroll', thuLaiKhiCuon);
      window.removeEventListener('resize', thuLaiKhiCuon);
      b.style.visibility = '';
      b.style.pointerEvents = '';
      bong = b;
      ssGhi(KEY_DEM, String(soLanDaHien() + 1));
      guiGA('aln_mymy_moi');
      nhipNut();
      window.addEventListener('scroll', kiemKhiDangHien, { passive: true });
      window.addEventListener('resize', kiemKhiDangHien);
      hengAn = setTimeout(function () { anBong(); sauKhiAn(); }, TU_AN_SAU);
    }

    // Chỗ bóng chat sắp hiện đang có form/nút/thanh cố định → chờ khách cuộn
    // tới chỗ trống rồi thử lại (không tính là 1 lần mời).
    var henThuLai = null;
    function thuLaiKhiCuon() {
      if (henThuLai) return;
      henThuLai = setTimeout(function () { henThuLai = null; if (dangCho) thuHien(); }, 400);
    }
    function choChoTrong() {
      if (dangCho) return;
      dangCho = true;
      window.addEventListener('scroll', thuLaiKhiCuon, { passive: true });
      window.addEventListener('resize', thuLaiKhiCuon);
    }

    // Bóng chat đã ẩn (hết giờ hoặc cuộn tới chỗ bị che) mà khách chưa × / chưa mở
    // → còn lượt thì chờ tín hiệu nhắc lại.
    function sauKhiAn() {
      if (!dung && soLanDaHien() < TOI_DA_PHIEN) ngheNhacLai();
    }

    /* ── Nhắc lại: cuộn quá 50% trang hoặc đứng yên 30 giây ── */
    function tiLeCuon() {
      var tong = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0) - window.innerHeight;
      return tong > 0 ? (window.pageYOffset || document.documentElement.scrollTop || 0) / tong : 0;
    }
    function khiCuon() {
      datLaiDungYen();
      if (tiLeCuon() > 0.5) kichNhacLai();
    }
    function datLaiDungYen() {
      if (henDungYen) clearTimeout(henDungYen);
      henDungYen = setTimeout(kichNhacLai, CHO_DUNG_YEN);
    }
    var SU_KIEN_HOAT_DONG = ['mousemove', 'keydown', 'touchstart', 'pointerdown', 'wheel'];
    function ngheNhacLai() {
      if (dangNghe) return;
      dangNghe = true;
      window.addEventListener('scroll', khiCuon, { passive: true });
      for (var i = 0; i < SU_KIEN_HOAT_DONG.length; i++) window.addEventListener(SU_KIEN_HOAT_DONG[i], datLaiDungYen, { passive: true });
      datLaiDungYen();
    }
    function boNghe() {
      if (!dangNghe) return;
      dangNghe = false;
      window.removeEventListener('scroll', khiCuon);
      for (var i = 0; i < SU_KIEN_HOAT_DONG.length; i++) window.removeEventListener(SU_KIEN_HOAT_DONG[i], datLaiDungYen);
      if (henDungYen) { clearTimeout(henDungYen); henDungYen = null; }
    }
    function kichNhacLai() {
      boNghe();
      thuHien();
    }

    /* ── Nâng nút MyMy (và khung chat) lên trên thanh trang tự đánh dấu data-mymy-tranh
       (vd thanh tổng tiền có "Lưu lựa chọn"/"Gọi KTS" ở trang nội thất) khi thanh đó
       đang nằm dưới nút. Chỉ áp cho phần tử có đánh dấu — không đổi vị trí nút ở trang khác. ── */
    var nutNang = 0;
    var henNang = null;
    function nangNut() {
      henNang = null;
      var ds = document.querySelectorAll('[data-mymy-tranh]');
      var cu = nutNang;
      nut.style.bottom = '';
      var r = nut.getBoundingClientRect();
      var dinh = window.innerHeight;
      for (var i = 0; i < ds.length; i++) {
        var q = ds[i].getBoundingClientRect();
        if (!q.width || !q.height) continue;
        if (q.top < r.bottom + 8 && q.bottom > r.top && q.left < r.right && q.right > r.left) dinh = Math.min(dinh, q.top);
      }
      nutNang = dinh < window.innerHeight ? Math.ceil(window.innerHeight - dinh + 12) : 0;
      nut.style.bottom = nutNang ? nutNang + 'px' : '';
      khung.style.bottom = nutNang ? (nutNang + 72) + 'px' : '';
      if (bong && nutNang !== cu) kiemKhiDangHien();
    }
    function henNangNut() { if (!henNang) henNang = setTimeout(nangNut, 80); }
    if (document.querySelector('[data-mymy-tranh]')) {
      nangNut();
      window.addEventListener('scroll', henNangNut, { passive: true });
      window.addEventListener('resize', henNangNut);
      setInterval(henNangNut, 1000); // thanh có thể hiện/ẩn khi trang đổi nội dung (vd mở bảng từng món)
    }

    if (dung || ssDoc(KEY_DUNG) || daChatTruocDo()) { dung = true; return; }
    var daHien = soLanDaHien();
    if (daHien >= TOI_DA_PHIEN) return;
    if (daHien === 0) setTimeout(thuHien, CHO_LAN_DAU);
    else ngheNhacLai(); // trang thứ 2 trong phiên: đã mời 1 lần, chỉ còn lượt nhắc lại
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', khoiDong);
  else khoiDong();
})();
