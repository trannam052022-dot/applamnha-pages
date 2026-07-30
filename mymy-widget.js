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
#mymy-btn::after{content:'';position:absolute;inset:-5px;border-radius:50%;border:2px solid rgba(201,168,76,.45);animation:mymy-pulse 2.2s ease-out infinite}
@keyframes mymy-pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.5);opacity:0}}
.mymy-badge{position:absolute;top:-3px;right:-3px;width:18px;height:18px;border-radius:50%;background:#dc2626;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
.mymy-teaser{position:fixed;bottom:96px;right:24px;z-index:78;max-width:220px;font-family:-apple-system,"Segoe UI",system-ui,sans-serif;font-size:12.5px;line-height:1.5;color:#efe9dc;text-shadow:0 1px 3px rgba(0,0,0,.6);background:rgba(16,23,35,.9);backdrop-filter:blur(24px) saturate(2);-webkit-backdrop-filter:blur(24px) saturate(2);border:1px solid rgba(255,255,255,.28);border-radius:14px;padding:11px 30px 11px 14px;cursor:pointer;box-shadow:0 14px 40px rgba(8,12,20,.4);animation:mymy-teaser-in .3s ease}
@keyframes mymy-teaser-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.mymy-teaser-close{position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#cfc6b0;font-size:12px;line-height:1;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center}
.mymy-teaser-close:hover{color:#fff;background:rgba(255,255,255,.24)}
@media(max-width:480px){.mymy-teaser{right:10px;max-width:calc(100vw - 86px)}}
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

  /* ── State ── */
  const S = {
    history: [], opened: false, userTurns: 0, askedPhone: false, addr: 'bạn',
    shownSuggestKeys: new Set(), sending: false,
  };

  /* ── Lời chào chủ động (Part D, ALN_SPEC_MYMY_DIEUHUONG.md) ──
     MYMY_CHATTED_KEY (localStorage, vĩnh viễn): đánh dấu khách ĐÃ từng
     tương tác thật với MyMy (chọn xưng hô hoặc gửi tin) — còn cờ này thì
     không tự hiện bong bóng mời chào nữa ở bất kỳ trang nào sau, tránh làm
     phiền khách quen. Không còn giới hạn "tối đa 1 lần/phiên" qua
     sessionStorage như bản trước — mỗi trang có widget (forum.html, nhiều
     trang mau/*.html...) tự tính lại số lần nhắc từ đầu, xem
     scheduleNextTeaser() bên dưới. */
  const MYMY_CHATTED_KEY = 'aln_mymy_has_chatted';
  function markChatted(){
    try { localStorage.setItem(MYMY_CHATTED_KEY, '1'); } catch (e) { /* private mode — bỏ qua, không chặn chat */ }
  }

  const $msgs = document.getElementById('mymy-msgs');
  function esc(s){ const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

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

  function toggle(){
    const win = document.getElementById('mymy-win');
    win.classList.toggle('open');
    document.getElementById('mymy-badge').style.display = 'none';
    if (win.classList.contains('open') && !S.opened) {
      S.opened = true;
      addBot('Chào bạn! Em là MyMy bên ALN. Cho em hỏi xưng hô là anh hay chị để em tiện trò chuyện ạ?');
      askGenderButtons();
    }
  }
  document.getElementById('mymy-btn').addEventListener('click', toggle);
  document.getElementById('mymy-close-btn').addEventListener('click', toggle);

  /* Bong bóng mời chào nhỏ, lặp lại định kỳ — KHÔNG tự mở cả khung chat lớn
     nữa (bản cũ mở hẳn #mymy-win làm che gần hết màn hình điện thoại, Founder
     phản hồi 30/07/2026 là quá to). Chỉ hiện 1 bong bóng nhỏ cạnh nút tròn,
     bấm vào mới mở khung chat đầy đủ (toggle() lo phần chào/hỏi xưng hô như
     khách tự bấm mở).
     Founder phản hồi thêm (30/07/2026, cùng ngày): khách lần đầu có thể
     không để ý bong bóng thoáng qua rồi tự ẩn sau 12s — cần hiện LẠI sau
     một khoảng thời gian thay vì chỉ 1 lần/phiên như bản trước. Giờ lặp lại
     tối đa MYMY_TEASER_MAX_ATTEMPTS lần trong 1 lượt xem trang (không dùng
     sessionStorage chặn nữa — mỗi trang có widget được tính lại từ đầu),
     dừng ngay khi: khách tự mở chat (S.opened), hoặc đã chat thật ít nhất 1
     lần trước đó (localStorage, vĩnh viễn — không nhắc lại người đã dùng
     rồi). Vẫn giữ: có nút đóng riêng cho bong bóng, tự biến mất sau 12s nếu
     không tương tác (tránh treo mãi trên màn hình). */
  const MYMY_TEASER_MAX_ATTEMPTS = 3;
  const MYMY_TEASER_REPEAT_MS = 45000; // 45s giữa các lần nhắc lại, đủ giãn cách để không làm phiền
  let teaserAttempts = 0;

  function showTeaser(onDismissWithoutOpen){
    if (S.opened) return; // khách đã tự mở trước khi hết giờ đếm — khỏi chen ngang
    if (document.getElementById('mymy-teaser')) return;
    const teaser = document.createElement('div');
    teaser.className = 'mymy-teaser';
    teaser.id = 'mymy-teaser';
    teaser.innerHTML = 'Xin chào! Em là MyMy bên ALN 👋 Anh/chị cần hỗ trợ gì không ạ?<button class="mymy-teaser-close" aria-label="Đóng" type="button">×</button>';
    document.body.appendChild(teaser);
    let dismissed = false;
    const autoHide = setTimeout(() => { dismissed = true; teaser.remove(); if (onDismissWithoutOpen) onDismissWithoutOpen(); }, 12000);
    teaser.querySelector('.mymy-teaser-close').addEventListener('click', (e) => {
      e.stopPropagation();
      if (dismissed) return;
      dismissed = true;
      clearTimeout(autoHide);
      teaser.remove();
      if (onDismissWithoutOpen) onDismissWithoutOpen();
    });
    teaser.addEventListener('click', () => {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(autoHide);
      teaser.remove();
      if (!document.getElementById('mymy-win').classList.contains('open')) toggle();
    });
  }
  function scheduleNextTeaser(delay){
    setTimeout(() => {
      let alreadyChatted = false;
      try { alreadyChatted = localStorage.getItem(MYMY_CHATTED_KEY) === '1'; } catch (e) { return; }
      if (alreadyChatted || S.opened) return; // đã chat thật hoặc đã tự mở chat — dừng nhắc
      if (teaserAttempts >= MYMY_TEASER_MAX_ATTEMPTS) return;
      teaserAttempts++;
      showTeaser(() => {
        if (teaserAttempts < MYMY_TEASER_MAX_ATTEMPTS) scheduleNextTeaser(MYMY_TEASER_REPEAT_MS);
      });
    }, delay);
  }
  function scheduleProactiveGreeting(){
    let alreadyChatted = false;
    try {
      alreadyChatted = localStorage.getItem(MYMY_CHATTED_KEY) === '1';
    } catch (e) {
      return; // Storage bị chặn (chế độ riêng tư nghiêm ngặt) — bỏ qua tính năng chủ động, widget vẫn hoạt động bình thường khi khách tự bấm
    }
    if (alreadyChatted) return;
    const delay = 3000 + Math.random() * 2000; // 3-5 giây, ngẫu nhiên hoá cho tự nhiên
    scheduleNextTeaser(delay);
  }
  scheduleProactiveGreeting();

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
  function setGender(g){
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
    addBot('<a class="mm-suggest" href="' + esc(suggestion.url) + '" target="_blank" rel="noopener">' + esc(suggestion.label) + ' →</a>');
  }

  let callAlnChat = null, ensureAuth = null, upsertContact = null;

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
    S.history.push({ role: 'user', content: text });
    S.userTurns++;

    const phone = extractPhone(text);
    if (phone && upsertContact) upsertContact(phone);

    if (text.match(/^[0-9 .+-]{8,14}$/) && S.askedPhone) {
      addBot('Dạ em ghi nhận SĐT ' + esc(text) + ' rồi ạ. Đội ngũ ALN sẽ liên hệ lại trong giờ hành chính nha!');
      return;
    }

    if (!callAlnChat) { addBot('Dạ hệ thống đang khởi động, anh/chị thử lại sau vài giây giúp em nha!'); return; }

    setSending(true);
    showTyping();
    callAlnChat(text, S.history).then((res) => {
      removeTyping();
      addBot((res.reply || '').replace(/\n/g, '<br>'));
      S.history.push({ role: 'assistant', content: res.reply || '' });
      renderSuggestion(res.suggestion);
      if (S.userTurns >= 3 && !S.askedPhone) {
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

      let authReady = false;
      authMod.signInAnonymously(auth).catch((e) => console.error('MyMy anon-auth lỗi:', e));
      authMod.onAuthStateChanged(auth, (u) => { authReady = !!u; });

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
        if (!authReady) {
          await withTimeout(
            new Promise((resolve) => {
              const unsub = authMod.onAuthStateChanged(auth, (u) => { if (u) { unsub(); resolve(); } });
            }),
            10000,
            'Hết thời gian chờ đăng nhập ẩn danh'
          );
        }
        const res = await withTimeout(
          fnAlnChat({
            messages: history, agentName: 'MyMy', toUser: S.addr,
            userName: null, role: null, pageContext,
          }),
          20000,
          'Hết thời gian chờ phản hồi từ MyMy'
        );
        return res.data || {};
      };
      upsertContact = (phone) => {
        fnUpsertContact({ phone, name: null, loai_lien_he: 'khach_hang', nguon: 'mymy_chat', chi_tiet_nguon: 'MyMy chat — ' + pageContext }).catch((e) => console.warn('upsertContact:', e.message));
      };
    } catch (e) {
      console.error('MyMy widget init lỗi:', e);
    }
  })();
}
