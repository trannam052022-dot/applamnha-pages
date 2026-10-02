/* ═══════════════════════════════════════════════════════════════
   MyMy Widget — bản dùng chung cho các trang công khai KHÔNG phải
   index.html (forum.html, mau/*.html...). index.html giữ nguyên bản
   inline gốc (không đụng — tránh rủi ro regression cho luồng lead
   đang chạy thật ở đó); file này là bản tự chứa cho các trang khác.

   Gọi Cloud Function `alnChat` (đăng nhập ẩn danh) — CÙNG backend với
   widget gốc trên index.html. Gợi ý điều hướng (routing suggestion,
   xem ALN_SPEC_MYMY_DIEUHUONG.md Phần A/B) do server chèn/gỡ tag
   [[SUGGEST:key]] trong CÙNG 1 lệnh gọi Claude — không tốn thêm lệnh
   gọi riêng. Client chỉ việc hiển thị suggestion nếu có, và không lặp
   lại cùng 1 key trong phiên duyệt trang hiện tại.

   Dùng: thêm đúng 1 dòng vào trước </body>:
     <script type="module" src="mymy-widget.js"></script>          (trang ở gốc repo)
     <script type="module" src="../mymy-widget.js"></script>       (trang trong thư mục con)
   Không cần cấu hình gì thêm — script tự chèn CSS + HTML + gắn sự kiện.
   ═══════════════════════════════════════════════════════════════ */

if (!document.getElementById('mymy-btn')) {

  /* Toàn bộ màu ở đây CỐ Ý viết cứng (không dùng var(--token) của trang chủ) —
     forum.html/mau/*.html có --text2/--border2/--text riêng theo theme SÁNG
     của trang, widget luôn cần nền TỐI để đọc được chữ sáng, độc lập hoàn
     toàn theme trang bên dưới (từng có bug thật do lẫn biến, xem PR sửa lỗi
     tương phản trước — không lặp lại chi tiết ở đây).

     Bảng màu/hiệu ứng đối chiếu TRỰC TIẾP từ aln-suggest-widget.js ("Chương
     trình dành cho bạn" — cùng trang) để 2 widget trông cùng 1 hệ thống
     thiết kế: nền navy-charcoal rgba(16,23,35,..), viền trắng sáng
     rgba(255,255,255,.22-.32), backdrop-filter blur+saturate mạnh, chữ ấm
     #efe9dc/#fff kèm text-shadow, bo tròn 99px cho pill/badge, font
     -apple-system. Độ mờ nền ĐẬM hơn bản gốc (.16) vì MyMy là khung chat cần
     đọc liên tục nhiều tin nhắn, không phải card lướt nhanh — đã đo tỷ lệ
     tương phản THẬT bằng cách dựng lại :root vars của forum.html (theme
     sáng) + Playwright screenshot + lấy mẫu pixel qua backdrop-filter thật
     (không suy đoán), chỉnh độ mờ tới khi mọi phần tử đều qua ngưỡng WCAG AA
     (>=4.5:1) trên nền sáng — kịch bản khó nhất vì forum.html/mau/*.html
     đều dùng theme sáng. */
  const CSS = `
#mymy-btn{position:fixed;bottom:24px;right:24px;z-index:80;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#e0aa3e,#98690a);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(152,105,10,.34),inset 0 1px 0 rgba(255,255,255,.3);transition:transform .3s ease,box-shadow .3s ease}
#mymy-btn:hover{box-shadow:0 14px 38px rgba(152,105,10,.42),inset 0 1px 0 rgba(255,255,255,.34);transform:scale(1.08)}
#mymy-btn i{font-size:26px;color:#1a1400}
.mymy-badge{position:absolute;top:-3px;right:-3px;width:18px;height:18px;border-radius:50%;background:#dc2626;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
#mymy-win{position:fixed;bottom:96px;right:24px;z-index:79;width:360px;max-height:520px;font-family:-apple-system,"Segoe UI",system-ui,sans-serif;background:rgba(16,23,35,.66);backdrop-filter:blur(32px) saturate(2);-webkit-backdrop-filter:blur(32px) saturate(2);border:1px solid rgba(255,255,255,.32);border-radius:18px;display:none;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(8,12,20,.42),inset 0 1px 0 rgba(255,255,255,.28)}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){#mymy-win{background:rgba(16,23,35,.94)}}
#mymy-win.open{display:flex}
@media(max-width:480px){#mymy-win{right:10px;left:10px;width:auto;bottom:88px;max-height:72vh}}
.mymy-head{border-bottom:1px solid rgba(255,255,255,.18);padding:14px 16px;display:flex;align-items:center;gap:10px}
.mymy-av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#e0aa3e,#98690a);display:flex;align-items:center;justify-content:center;font-size:19px;color:#1a1400;box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}
.mm-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;margin-right:6px;vertical-align:middle;box-shadow:0 0 0 2px rgba(34,197,94,.28)}
.mymy-head .mm-name{font-weight:700;font-size:13px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.7)}
.mymy-head .mm-status{font-size:10px;color:#efe9dc;text-shadow:0 1px 3px rgba(0,0,0,.65)}
.mymy-head .mm-close{margin-left:auto;width:24px;height:24px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.22);color:#cfc6b0;font-size:13px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;padding:0}
.mymy-head .mm-close:hover{color:#fff}
#mymy-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;max-height:320px}
#mymy-msgs::-webkit-scrollbar{width:4px}
#mymy-msgs::-webkit-scrollbar-thumb{background:rgba(224,170,62,.35);border-radius:2px}
.mm-row{display:flex;gap:8px;align-items:flex-end}
.mm-row.user{flex-direction:row-reverse}
.mm-bubble{max-width:80%;padding:9px 13px;border-radius:14px;font-size:12.5px;line-height:1.55}
.mm-row.bot .mm-bubble{background:rgba(20,26,36,.55);border:1px solid rgba(255,255,255,.26);color:#efe9dc;text-shadow:0 1px 3px rgba(0,0,0,.6);border-bottom-left-radius:4px}
.mm-row.user .mm-bubble{background:linear-gradient(135deg,#e0aa3e,#98690a);color:#1a1400;font-weight:500;border-bottom-right-radius:4px}
.mm-avatar-sm{width:26px;height:26px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#98690a,#e0aa3e);display:flex;align-items:center;justify-content:center;font-size:14px;color:#1a1400;box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}
.mm-typing{display:flex;gap:4px;padding:4px 0}
.mm-typing span{width:6px;height:6px;border-radius:50%;background:rgba(224,170,62,.7);animation:mm-bounce 1.2s ease-in-out infinite}
.mm-typing span:nth-child(2){animation-delay:.2s}
.mm-typing span:nth-child(3){animation-delay:.4s}
@keyframes mm-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
.mm-suggest{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:7px 13px;border-radius:99px;background:rgba(0,0,0,.48);border:1px solid rgba(224,170,62,.55);color:#e0aa3e;text-shadow:0 1px 3px rgba(0,0,0,.6);font-size:12px;font-weight:700;text-decoration:none;cursor:pointer}
.mm-suggest:hover{background:rgba(224,170,62,.22);border-color:#e0aa3e}
#mymy-quick{padding:0 14px 10px;display:flex;flex-wrap:wrap;gap:6px}
.mm-nut-hang{display:flex;flex-wrap:wrap;gap:7px;max-width:88%}
.mm-qbtn.mm-nut-lon{font-size:14px;padding:9px 14px;font-weight:600}
.mm-nut-ghichu{flex-basis:100%;font-size:12.8px;line-height:1.5;color:#d6cfc0;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.mm-nut-ghichu a{color:#e0aa3e}
/* Trang có hướng dẫn riêng (khách nhiều người lớn tuổi): chữ lớn hơn */
#mymy-win.mm-chu-lon .mm-bubble{font-size:15px;line-height:1.55}
#mymy-win.mm-chu-lon .mm-qbtn.mm-nut-lon{font-size:15px;padding:10px 15px}
#mymy-win.mm-chu-lon #mymy-input{font-size:16px}
#mymy-win.mm-chu-lon #mymy-msgs{max-height:min(460px,56vh)}
@media(min-width:481px){#mymy-win.mm-chu-lon{max-height:min(560px,calc(100vh - 120px))}}
.mm-qbtn{padding:6px 12px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.01em;border:1px solid rgba(255,255,255,.22);color:#efe9dc;text-shadow:0 1px 3px rgba(0,0,0,.6);background:rgba(0,0,0,.44);cursor:pointer}
.mm-qbtn:hover{background:rgba(224,170,62,.22);border-color:rgba(224,170,62,.55);color:#fff}
#mymy-input-row{padding:10px 12px;border-top:1px solid rgba(255,255,255,.18);display:flex;gap:8px;align-items:center}
#mymy-input{flex:1;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.24);border-radius:20px;padding:8px 14px;color:#fff;font-size:13px;outline:none;font-family:inherit}
#mymy-input::placeholder{color:rgba(239,233,220,.75)}
#mymy-input:focus{border-color:rgba(224,170,62,.7);background:rgba(0,0,0,.34)}
#mymy-input:disabled{opacity:.6}
#mymy-send{width:34px;height:34px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#e0aa3e,#98690a);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
#mymy-send:disabled{opacity:.6;cursor:default}
#mymy-send i{color:#1a1400;font-size:15px}
`;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  /* Biểu tượng (nút, avatar, nút gửi) dùng Phosphor duotone. Trang nào chưa nạp
     bộ này thì widget tự nạp — 02/10/2026 du-toan-nha.html thiếu, nút MyMy chỉ
     còn vòng tròn vàng trống. */
  if (!document.querySelector('link[href*="@phosphor-icons/web"][href*="/duotone/"]')) {
    const ph = document.createElement('link');
    ph.rel = 'stylesheet';
    ph.href = 'https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/duotone/style.css';
    document.head.appendChild(ph);
  }

  const HTML = `
<button id="mymy-btn" aria-label="Trò chuyện với MyMy">
  <i class="ph-duotone ph-chat-circle-dots"></i>
  <span class="mymy-badge" id="mymy-badge">1</span>
</button>
<div id="mymy-win">
  <div class="mymy-head">
    <div class="mymy-av"><i class="ph-duotone ph-headset"></i></div>
    <div>
      <div class="mm-name">MyMy · ALN</div>
      <div class="mm-status"><span class="mm-dot"></span>Đang trực tuyến</div>
    </div>
    <button class="mm-close" id="mymy-close-btn">×</button>
  </div>
  <div id="mymy-msgs"></div>
  <div id="mymy-quick" style="display:none">
    <button class="mm-qbtn" data-q="Cho em hỏi về ALN">Về ALN</button>
    <button class="mm-qbtn" data-q="Bảng giá thế nào ạ">Bảng giá</button>
    <button class="mm-qbtn" data-q="Quy trình C1-C4 ra sao">Quy trình</button>
    <button class="mm-qbtn" data-q="Em muốn để lại thông tin liên hệ">Liên hệ</button>
  </div>
  <div id="mymy-input-row">
    <input id="mymy-input" type="text" placeholder="Nhắn cho MyMy...">
    <button id="mymy-send"><i class="ph-duotone ph-paper-plane-tilt"></i></button>
  </div>
</div>`;
  const wrap = document.createElement('div');
  wrap.innerHTML = HTML;
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

  // Trang có hướng dẫn riêng (nạp trước widget) → chữ lớn cho dễ đọc.
  if (window.ALN_MYMY_TRANG) document.getElementById('mymy-win').classList.add('mm-chu-lon');

  /* ── State ── */
  const S = {
    history: [], opened: false, userTurns: 0, askedPhone: false, addr: 'bạn',
    shownSuggestKeys: new Set(), sending: false, cho: null,
  };

  /* ── Lời chào chủ động (Part D, ALN_SPEC_MYMY_DIEUHUONG.md) ──
     MYMY_CHATTED_KEY (localStorage, vĩnh viễn): đánh dấu khách ĐÃ từng
     tương tác thật với MyMy (chọn xưng hô hoặc gửi tin) — còn cờ này thì
     không tự hiện bong bóng mời chào nữa ở bất kỳ trang nào sau, tránh làm
     phiền khách quen. Bóng chat mời + giới hạn số lần/phiên: mymy-moi.js. */
  const MYMY_CHATTED_KEY = 'aln_mymy_has_chatted';
  function markChatted(){
    try { localStorage.setItem(MYMY_CHATTED_KEY, '1'); } catch (e) { /* private mode — bỏ qua, không chặn chat */ }
  }

  const $msgs = document.getElementById('mymy-msgs');
  // Escape đủ & < > " ' ` (bản cũ dùng textContent→innerHTML không escape dấu nháy — thoát được
  // khỏi href="…"). Widget chạy độc lập, không phụ thuộc aln-esc.js.
  function esc(s){ return String(s === undefined || s === null ? '' : s).replace(/[&<>"'`]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c])); }
  // Câu trả lời AI: escape TRƯỚC rồi mới định dạng — chỉ sinh <strong> và <br>. Bản sao y hệt
  // alnMyMyHtml trong aln-esc.js (widget chạy cả trên trang không nạp aln-esc.js);
  // scripts/_test_aln_esc.js đối chiếu 2 bản ra cùng kết quả.
  // Link applamnha.vn → <a> cùng tab — bản sao alnLinkALN trong aln-esc.js (xem chú thích ở đó).
  function mmLink(dong){
    return dong.replace(/(^|[\s(\[>]|&quot;|&#39;)((?:https?:\/\/)?(?:www\.)?applamnha\.vn(?![\w-]|\.[\w-])(?:[\/?#](?:&amp;|[^\s<&*])*)?)/gi, (m, lkTruoc, lkUrl) => {
      let lkDuoi = ''; let c;
      while ((c = /(?:[.,;:!?)\]]|&amp;)$/.exec(lkUrl))) { lkDuoi = c[0] + lkDuoi; lkUrl = lkUrl.slice(0, -c[0].length); }
      const lkHref = /^https?:\/\//i.test(lkUrl) ? lkUrl : 'https://' + lkUrl;
      return lkTruoc + '<a href="' + lkHref + '">' + lkUrl + '</a>' + lkDuoi;
    });
  }
  function mmHtml(text){
    return esc(text).split(/\r?\n/).map((dong) => mmLink(dong
      .replace(/^\s*(?:(?:#{1,6}|\*{1,2}(?!\*)|[-•])\s+)+/, '')
      .replace(/\*\*(?=\S)([^*]*?\S)\*\*/g, '<strong>$1</strong>')
      .replace(/\*\*/g, ''))).join('<br>');
  }
  // URL gợi ý: chỉ đường dẫn nội bộ hoặc http(s) — còn lại '#'
  function escUrl(u){ const t = String(u || '').trim(); const goc = t.replace(/[\u0000-\u0020\u007f]/g, ''); return (/^([a-z][a-z0-9+.-]*):/i.test(goc) && !/^https?:/i.test(goc)) ? '#' : esc(t); }

  function addBot(html){
    const row = document.createElement('div');
    row.className = 'mm-row bot';
    row.innerHTML = '<div class="mm-avatar-sm"><i class="ph-duotone ph-headset"></i></div><div class="mm-bubble">' + html + '</div>';
    $msgs.appendChild(row);
    $msgs.scrollTop = $msgs.scrollHeight;
  }
  function addUser(text){
    const row = document.createElement('div');
    row.className = 'mm-row user';
    row.innerHTML = '<div class="mm-bubble">' + esc(text) + '</div>';
    $msgs.appendChild(row);
    $msgs.scrollTop = $msgs.scrollHeight;
  }
  function showTyping(){
    const row = document.createElement('div');
    row.className = 'mm-row bot'; row.id = 'mymy-typing';
    row.innerHTML = '<div class="mm-avatar-sm"><i class="ph-duotone ph-headset"></i></div><div class="mm-bubble"><div class="mm-typing"><span></span><span></span><span></span></div></div>';
    $msgs.appendChild(row);
    $msgs.scrollTop = $msgs.scrollHeight;
  }
  function removeTyping(){ const el = document.getElementById('mymy-typing'); if (el) el.remove(); }

  /* ── Hướng dẫn theo trang (30/09/2026) ──
     Trang nào muốn MyMy hướng dẫn riêng (vd du-toan-nha.html: điền giúp kích
     thước, chỉ từng ô) thì nạp script đặt window.ALN_MYMY_TRANG TRƯỚC widget:
       { loiMoi: 'câu bóng chat mời',            (mymy-moi.js đọc)
         moDau(api): lời chào + nút riêng, thay câu hỏi xưng hô,
         xuLyTin(text, api): trả true nếu tự trả lời được, không gửi AI }
     Trang không đặt biến này giữ nguyên hành vi cũ. Chữ do trang đưa vào đi
     qua mmHtml/textContent — không có đường nào ghép HTML thô. */
  const API = {
    bot(text){ addBot(mmHtml(text)); },
    user(text){ addUser(text); },
    // Hàng nút lớn (dễ bấm cho người lớn tuổi). Bấm 1 nút: gỡ hàng nút, hiện
    // lại chữ của nút như khách vừa nói, rồi chạy việc của nút. ghiChu (tuỳ chọn):
    // dòng chữ nhỏ ngay phía trên các nút (vd câu đồng ý xử lý dữ liệu), qua mmHtml.
    nut(ds, ghiChu){
      const row = document.createElement('div');
      row.className = 'mm-row bot';
      const av = document.createElement('div');
      av.className = 'mm-avatar-sm';
      av.innerHTML = '<i class="ph-duotone ph-headset"></i>';
      const bb = document.createElement('div');
      bb.className = 'mm-bubble mm-nut-hang';
      if (ghiChu) {
        const gc = document.createElement('div');
        gc.className = 'mm-nut-ghichu';
        gc.innerHTML = mmHtml(String(ghiChu));
        bb.appendChild(gc);
      }
      (ds || []).forEach((d) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mm-qbtn mm-nut-lon';
        b.textContent = String(d.nhan || '');
        b.addEventListener('click', () => {
          row.remove();
          markChatted();
          API.boCho(); // bấm nút = đã trả lời, bỏ lượt chờ gõ của câu hỏi này
          if (!d.khongNhacLai) addUser(String(d.nhan || ''));
          try { d.lam(); } catch (e) { console.error('MyMy nút lỗi:', e); }
        });
        bb.appendChild(b);
      });
      row.appendChild(av); row.appendChild(bb);
      $msgs.appendChild(row);
      $msgs.scrollTop = $msgs.scrollHeight;
    },
    // Tin kế tiếp khách gõ sẽ đi vào fn(text) trước; fn trả true = đã xử lý.
    cho(fn, goiY){
      S.cho = fn;
      const input = document.getElementById('mymy-input');
      if (input) { input.placeholder = goiY || 'Nhắn cho MyMy...'; if (window.innerWidth > 480) input.focus(); }
    },
    boCho(){ S.cho = null; const input = document.getElementById('mymy-input'); if (input) input.placeholder = 'Nhắn cho MyMy...'; },
    mo(){ if (!document.getElementById('mymy-win').classList.contains('open')) toggle(); },
    // Đóng khung chat để khách nhìn thấy chỗ MyMy đang chỉ trên trang; hiện lại
    // chấm đỏ để khách biết bấm nút là quay lại được cuộc trò chuyện.
    dong(){
      if (document.getElementById('mymy-win').classList.contains('open')) toggle();
      document.getElementById('mymy-badge').style.display = 'flex';
    },
    hienNutChung(){ document.getElementById('mymy-quick').style.display = 'flex'; },
    // SĐT trong câu khách gõ (cùng quy tắc widget dùng để ghi contacts), null nếu không có.
    laySdt(text){ return extractPhone(String(text || '')); },
    // Ghi 1 lượt vào lịch sử gửi AI — trang tự trả lời mà vẫn muốn AI biết chuyện đã xảy ra
    // (vd khách đã để số + bấm đồng ý) để AI không xin lại.
    ghiLichSu(role, content){
      if ((role === 'user' || role === 'assistant') && content) S.history.push({ role, content: String(content).slice(0, 600) });
    },
    // Thêm 1 lần chạm vào contacts qua đúng upsertContact công khai (không đường ghi mới).
    ghiLienHe(phone, chiTiet, kenhLead){ if (ghiLienHeChiTiet) ghiLienHeChiTiet(phone, chiTiet, kenhLead); },
    // Cuộn khung tin về đầu (lời chào) nếu từ lời chào tới cuối vừa khung; không vừa
    // thì giữ ở cuối để khách luôn thấy câu hỏi + nút đang chờ trả lời.
    hienTuDau(){
      const dau = $msgs.firstElementChild;
      if (!dau) return;
      const conLai = $msgs.scrollHeight - dau.offsetTop;
      if (conLai <= $msgs.clientHeight + 2) $msgs.scrollTop = Math.max(0, dau.offsetTop - 16);
    },
  };

  function toggle(){
    const win = document.getElementById('mymy-win');
    win.classList.toggle('open');
    document.getElementById('mymy-badge').style.display = 'none';
    if (win.classList.contains('open') && !S.opened) {
      S.opened = true;
      const trang = window.ALN_MYMY_TRANG;
      if (trang && typeof trang.moDau === 'function') {
        try { S.addr = 'anh/chị'; trang.moDau(API); return; } catch (e) { console.error('MyMy moDau lỗi:', e); }
      }
      addBot('Chào bạn! Em là MyMy của ALN. Cho em hỏi xưng hô là anh hay chị để em tiện trò chuyện ạ?');
      askGenderButtons();
    }
  }
  document.getElementById('mymy-btn').addEventListener('click', toggle);

  /* Trang mở chat không qua cú bấm của khách (vd du-toan-nha: MyMy tự chào).
     tuDong=true: đánh dấu để mymy-moi.js KHÔNG tính là khách mở chat (aln_mymy_mo). */
  window.alnMyMyMo = function (tuDong) {
    const win = document.getElementById('mymy-win');
    if (win.classList.contains('open')) return;
    if (tuDong) win.setAttribute('data-tu-mo', '1');
    toggle();
  };
  document.getElementById('mymy-close-btn').addEventListener('click', toggle);

  /* Bóng chat mời trò chuyện + nhịp sáng nút + GA4 (aln_mymy_moi/aln_mymy_mo):
     file dùng chung mymy-moi.js (cùng file với index.html). Nạp theo đường
     dẫn của CHÍNH module này nên đúng cả ở trang trong thư mục con. */
  if (!document.getElementById('aln-mymy-moi-js')) {
    const moiJs = document.createElement('script');
    moiJs.id = 'aln-mymy-moi-js';
    // Mang theo số phiên bản của chính widget (vd mymy-widget.js?v=3 → mymy-moi.js?v=3)
    // để trang đổi phiên bản là nạp lại cả bóng chat mời, không dùng bản cũ trong bộ nhớ đệm.
    const moiJsUrl = new URL('mymy-moi.js' + new URL(import.meta.url).search, import.meta.url).href;
    moiJs.src = moiJsUrl;
    document.head.appendChild(moiJs);
  }

  function askGenderButtons(){
    const row = document.createElement('div');
    row.className = 'mm-row bot'; row.id = 'mymy-gender-ask';
    row.innerHTML = '<div class="mm-avatar-sm"><i class="ph-duotone ph-headset"></i></div><div class="mm-bubble" style="display:flex;gap:8px"><button class="mm-qbtn" data-g="anh" style="padding:7px 16px">Dạ anh</button><button class="mm-qbtn" data-g="chị" style="padding:7px 16px">Dạ chị</button></div>';
    $msgs.appendChild(row);
    $msgs.scrollTop = $msgs.scrollHeight;
    row.querySelectorAll('[data-g]').forEach((btn) => {
      btn.addEventListener('click', () => setGender(btn.getAttribute('data-g')));
    });
  }
  function setGender(chon){
    const g = chon === 'chị' ? 'chị' : 'anh'; // chỉ 2 giá trị từ nút data-g
    markChatted();
    S.addr = g;
    const ask = document.getElementById('mymy-gender-ask');
    if (ask) ask.remove();
    addUser('Dạ ' + g);
    document.getElementById('mymy-quick').style.display = 'flex';
    addBot('Dạ em cảm ơn ' + g + '! ' + g.charAt(0).toUpperCase() + g.slice(1) + ' đang tìm hiểu về xây/sửa nhà hay thiết kế nội thất ạ?');
  }

  document.querySelectorAll('#mymy-quick .mm-qbtn').forEach((btn) => {
    btn.addEventListener('click', () => { document.getElementById('mymy-input').value = btn.getAttribute('data-q'); sendClick(); });
  });

  /* Dò SĐT ở bất kỳ đâu trong câu — cùng logic với index.html, ghi vào
     Bảng liên hệ hợp nhất (contacts/) nếu tìm thấy. */
  // Ngữ cảnh riêng của trang (window.ALN_MYMY_TRANG.nguCanh) — null nếu trang không có.
  function nguCanhTrang(){
    const trang = window.ALN_MYMY_TRANG;
    if (!trang || typeof trang.nguCanh !== 'function') return null;
    try { return trang.nguCanh() || null; } catch (e) { console.error('MyMy nguCanh lỗi:', e); return null; }
  }
  function extractPhone(text){
    const candidates = text.match(/(?:\+?84|0)[\d\s.\-]{7,13}/g);
    if (!candidates) return null;
    for (const raw0 of candidates) {
      let raw = raw0.replace(/[\s.\-]/g, '').replace(/^\+/, '');
      if (raw.indexOf('84') === 0 && raw.length > 9) raw = '0' + raw.slice(2);
      if (/^0\d{8,10}$/.test(raw)) return raw;
    }
    return null;
  }

  function renderSuggestion(suggestion){
    if (!suggestion || !suggestion.url || !suggestion.key) return;
    if (S.shownSuggestKeys.has(suggestion.key)) return;
    S.shownSuggestKeys.add(suggestion.key);
    addBot('<a class="mm-suggest" href="' + escUrl(suggestion.url) + '" target="_blank" rel="noopener">' + esc(suggestion.label) + ' →</a>');
  }

  let callAlnChat = null, ensureAuth = null, upsertContact = null, ghiLienHeChiTiet = null;

  /* Khoá gửi trong lúc đang chờ phản hồi — chặn double-submit nếu người
     dùng bấm Enter/click gửi nhiều lần liên tiếp (mạng chậm, sốt ruột...). */
  function setSending(on){
    S.sending = on;
    const btn = document.getElementById('mymy-send');
    const input = document.getElementById('mymy-input');
    if (btn) btn.disabled = on;
    if (input) input.disabled = on;
  }

  function sendClick(){
    if (S.sending) return;
    const input = document.getElementById('mymy-input');
    const text = input.value.trim();
    if (!text) return;
    markChatted();
    input.value = '';
    addUser(text);

    // SĐT trong câu: trang nào tự xử lý số (xuLySdt — vd du-toan-nha hỏi đồng ý
    // trước, Nam chốt 02/10/2026: chưa đồng ý thì chưa lưu số) thì widget KHÔNG tự
    // ghi contacts; trang khác giữ hành vi cũ (ghi contacts ngay).
    const phone = extractPhone(text);
    const trangSdt = window.ALN_MYMY_TRANG;
    if (phone && trangSdt && typeof trangSdt.xuLySdt === 'function') {
      API.boCho();
      try { if (trangSdt.xuLySdt(text, API) === true) return; } catch (e) { console.error('MyMy xuLySdt lỗi:', e); }
    } else if (phone && upsertContact) upsertContact(phone);

    // Trang tự trả lời trước (câu MyMy đang chờ, hoặc câu trang hiểu được như
    // "5x20 3 tầng") — không tốn lượt gọi AI, không vào lịch sử gửi AI.
    if (S.cho) {
      const fn = S.cho; API.boCho();
      try { if (fn(text) === true) return; } catch (e) { console.error('MyMy cho lỗi:', e); }
    }
    const trang = window.ALN_MYMY_TRANG;
    if (trang && typeof trang.xuLyTin === 'function') {
      try { if (trang.xuLyTin(text, API) === true) return; } catch (e) { console.error('MyMy xuLyTin lỗi:', e); }
    }

    S.history.push({ role: 'user', content: text });
    S.userTurns++;

    if (text.match(/^[0-9 .+-]{8,14}$/) && S.askedPhone) {
      addBot('Dạ em ghi nhận SĐT ' + esc(text) + ' rồi ạ. Đội ngũ ALN sẽ liên hệ lại trong giờ hành chính nha!');
      return;
    }

    if (!callAlnChat) { addBot('Dạ hệ thống đang khởi động, anh/chị thử lại sau vài giây giúp em nha!'); return; }

    setSending(true);
    showTyping();
    callAlnChat(text, S.history).then((res) => {
      removeTyping();
      addBot(mmHtml(res.reply || '')); // escape rồi mới định dạng (**đậm**, xuống dòng)
      S.history.push({ role: 'assistant', content: res.reply || '' });
      renderSuggestion(res.suggestion);
      // Trang có ngữ cảnh riêng (nguCanh) để máy chủ tự quyết lúc xin liên hệ —
      // không chen câu xin SĐT cố định, tránh xin 2 lần.
      if (S.userTurns >= 3 && !S.askedPhone && !nguCanhTrang()) {
        S.askedPhone = true;
        setTimeout(() => addBot('Để đội ngũ ALN liên hệ tư vấn kỹ hơn, ' + S.addr + ' để lại SĐT giúp em nha?'), 900);
      }
    }).catch((err) => {
      removeTyping();
      addBot(err && err.isMymyTimeout
        ? 'Dạ trình duyệt của anh/chị có vẻ đang chặn kết nối của em (thường gặp ở chế độ ẩn danh/riêng tư hoặc Safari) 😔 Anh/chị thử tắt chế độ ẩn danh, hoặc đổi sang trình duyệt khác (Chrome, Cốc Cốc...) rồi nhắn lại giúp em nha! Không được thì để lại SĐT ở đây, đội ngũ ALN sẽ liên hệ trực tiếp ạ.'
        : 'Dạ hệ thống đang bận, anh/chị thử lại sau ít phút giúp em nha!');
      console.error('MyMy lỗi:', err);
    }).finally(() => {
      setSending(false);
      document.getElementById('mymy-input').focus();
    });
  }
  document.getElementById('mymy-send').addEventListener('click', sendClick);
  document.getElementById('mymy-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendClick(); });

  /* Mở khung chat MyMy tự động khi đến từ link ?mymy=1 (cùng cơ chế index.html). */
  function autoOpenFromQuery(){
    const params = new URLSearchParams(window.location.search);
    if (params.get('mymy') === '1') {
      if (!document.getElementById('mymy-win').classList.contains('open')) toggle();
      if (window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('mymy');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    }
  }
  autoOpenFromQuery();

  /* Link/nút "Hỏi MyMy" trên trang (thuộc tính data-mymy-mo): mở khung chat ngay
     tại trang thay vì chuyển về trang chủ. href giữ "/?mymy=1" làm đường dự phòng
     khi widget chưa nạp được. */
  document.addEventListener('click', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-mymy-mo]') : null;
    if (!el) return;
    e.preventDefault();
    if (!document.getElementById('mymy-win').classList.contains('open')) toggle();
  });

  /* ── Kết nối Firebase (ẩn danh) — module con, không chặn phần UI ở trên ── */
  (async () => {
    try {
      const [{ app }, authMod, fnMod] = await Promise.all([
        import('./firebase-config.js'),
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js'),
      ]);
      const auth = authMod.getAuth(app);
      const functions = fnMod.getFunctions(app, 'asia-southeast1');
      const fnAlnChat = fnMod.httpsCallable(functions, 'alnChat');
      const fnUpsertContact = fnMod.httpsCallable(functions, 'upsertContact');

      // Phiên đăng nhập cho alnChat/upsertContact. CHỈ tạo phiên ẩn danh khi
      // khách THẬT SỰ gửi tin và trình duyệt chưa có phiên nào (đợi
      // authStateReady() trước — sự cố 23/09/2026: kiểm currentUser ngay lúc
      // tải thì SDK chưa khôi phục xong phiên nên tưởng chưa có).
      // Sự cố production 22/09/2026 (4): gọi signInAnonymously() khi đã có
      // phiên Phone Auth sẽ GHI ĐÈ phiên đó (chủ nhà bị đá khỏi phiên OTP).
      // 28/09/2026: không tạo phiên ẩn danh lúc tải trang nữa — trang nội thất
      // có OTP ngay trên trang, phiên ẩn danh tạo lúc tải mà xong SAU khi khách
      // xác nhận OTP sẽ ghi đè phiên OTP (lead đã ghi taoBoiUid = uid OTP →
      // khách mất quyền mở bảng/lưu lựa chọn). Khách chưa chat thì không cần phiên.
      let dangTaoPhien = null;
      function damBaoPhien(){
        if (!dangTaoPhien) {
          dangTaoPhien = auth.authStateReady().then(() => {
            if (auth.currentUser) return;
            return authMod.signInAnonymously(auth).then(() => undefined);
          }).catch((e) => { dangTaoPhien = null; throw e; });
        }
        return dangTaoPhien;
      }

      const pageContext = (document.title || '').split('|')[0].trim().slice(0, 100);

      /* Bọc timeout cho mọi bước có thể treo — không chỉ chờ đăng nhập ẩn
         danh mà cả chính lệnh gọi Cloud Function — để UI luôn có lối thoát
         rõ ràng (báo lỗi + mở khoá lại input) thay vì "3 chấm" vô thời hạn,
         dù nguyên nhân treo là gì. (Từng nghi App Check/reCAPTCHA domain —
         đã loại trừ bằng log thật trên production: nguyên nhân thật là
         forum.html tự signOut() phiên ẩn danh này vì không thấy users/{uid}
         tương ứng — đã sửa ở forum.html, xem onAuthStateChanged trong file
         đó. Giữ timeout ở đây làm lớp phòng thủ chung cho mọi nguyên nhân
         treo khác có thể phát sinh sau này.) */
      function withTimeout(promise, ms, message){
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => {
            const e = new Error(message);
            e.isMymyTimeout = true; // đánh dấu để sendClick() hiện thông báo thân thiện, gợi ý tắt chế độ ẩn danh/đổi trình duyệt
            reject(e);
          }, ms)),
        ]);
      }

      callAlnChat = async (text, history) => {
        await withTimeout(damBaoPhien(), 10000, 'Hết thời gian chờ đăng nhập ẩn danh');
        const res = await withTimeout(
          fnAlnChat({
            messages: history, agentName: 'MyMy', toUser: S.addr,
            userName: null, role: null, pageContext, nguCanhTrang: nguCanhTrang(),
          }),
          20000,
          'Hết thời gian chờ phản hồi từ MyMy'
        );
        return res.data || {};
      };
      upsertContact = (phone) => {
        // Trang có ngữ cảnh: ghi kèm phương án gần nhất để KTS gọi lại không phải hỏi lại kích thước.
        const nc = nguCanhTrang();
        const chiTiet = 'MyMy chat — ' + pageContext + (nc && nc.pa_1 ? ' · ' + nc.pa_1 : '');
        damBaoPhien().then(() => fnUpsertContact({ phone, name: null, loai_lien_he: 'khach_hang', nguon: 'mymy_chat', chi_tiet_nguon: chiTiet.slice(0, 200), kenh_lead: nc && nc.trang === 'du-toan-nha' ? 'mymy_du_toan' : 'mymy_chat' })).catch((e) => console.warn('upsertContact:', e.message));
      };
      ghiLienHeChiTiet = (phone, chiTiet, kenhLead) => {
        damBaoPhien().then(() => fnUpsertContact({ phone, name: null, loai_lien_he: 'khach_hang', nguon: 'mymy_chat', chi_tiet_nguon: String(chiTiet || '').slice(0, 200), kenh_lead: kenhLead || 'mymy_chat' })).catch((e) => console.warn('upsertContact:', e.message));
      };
    } catch (e) {
      console.error('MyMy widget init lỗi:', e);
    }
  })();
}
