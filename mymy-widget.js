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

  const CSS = `
#mymy-btn{position:fixed;bottom:24px;right:24px;z-index:80;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--gold2,#e0aa3e),var(--gold,#98690a));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(152,105,10,.34),inset 0 1px 0 rgba(255,255,255,.3);transition:transform .3s ease,box-shadow .3s ease}
#mymy-btn:hover{box-shadow:0 14px 38px rgba(152,105,10,.42),inset 0 1px 0 rgba(255,255,255,.34);transform:scale(1.08)}
#mymy-btn i{font-size:26px;color:#1a1400}
#mymy-btn::after{content:'';position:absolute;inset:-5px;border-radius:50%;border:2px solid rgba(201,168,76,.45);animation:mymy-pulse 2.2s ease-out infinite}
@keyframes mymy-pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.5);opacity:0}}
.mymy-badge{position:absolute;top:-3px;right:-3px;width:18px;height:18px;border-radius:50%;background:var(--red,#dc2626);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
#mymy-win{position:fixed;bottom:96px;right:24px;z-index:79;width:360px;max-height:520px;background:var(--bg2,#12181f);border:1px solid var(--border2,#2a3340);border-radius:18px;display:none;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg,0 20px 60px rgba(0,0,0,.4))}
#mymy-win.open{display:flex}
@media(max-width:480px){#mymy-win{right:10px;left:10px;width:auto;bottom:88px;max-height:72vh}}
.mymy-head{background:linear-gradient(135deg,var(--gold,#98690a),#a07d12);padding:14px 16px;display:flex;align-items:center;gap:10px}
.mymy-av{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:19px;color:#1a1400}
.mm-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#0f7a37;margin-right:6px;vertical-align:middle;box-shadow:0 0 0 2px rgba(15,122,55,.28)}
.mymy-head .mm-name{font-weight:700;font-size:13px;color:#1a1400}
.mymy-head .mm-status{font-size:10px;color:rgba(0,0,0,.6)}
.mymy-head .mm-close{margin-left:auto;background:none;border:none;font-size:20px;color:rgba(0,0,0,.6);cursor:pointer;line-height:1}
#mymy-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;max-height:320px}
#mymy-msgs::-webkit-scrollbar{width:4px}
#mymy-msgs::-webkit-scrollbar-thumb{background:rgba(201,168,76,.3);border-radius:2px}
.mm-row{display:flex;gap:8px;align-items:flex-end}
.mm-row.user{flex-direction:row-reverse}
.mm-bubble{max-width:80%;padding:9px 13px;border-radius:14px;font-size:12.5px;line-height:1.55}
.mm-row.bot .mm-bubble{background:var(--bg3,#1a212b);color:var(--text2,#bcc8dc);border-bottom-left-radius:4px}
.mm-row.user .mm-bubble{background:linear-gradient(135deg,var(--gold,#98690a),#a07d12);color:#1a1400;font-weight:500;border-bottom-right-radius:4px}
.mm-avatar-sm{width:26px;height:26px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--gold,#98690a),var(--gold2,#e0aa3e));display:flex;align-items:center;justify-content:center;font-size:14px;color:#1a1400;box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}
.mm-typing{display:flex;gap:4px;padding:4px 0}
.mm-typing span{width:6px;height:6px;border-radius:50%;background:rgba(201,168,76,.6);animation:mm-bounce 1.2s ease-in-out infinite}
.mm-typing span:nth-child(2){animation-delay:.2s}
.mm-typing span:nth-child(3){animation-delay:.4s}
@keyframes mm-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
.mm-suggest{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:7px 13px;border-radius:20px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.4);color:var(--gold,#c9a84c);font-size:12px;font-weight:600;text-decoration:none;cursor:pointer}
.mm-suggest:hover{background:rgba(201,168,76,.2)}
#mymy-quick{padding:0 14px 10px;display:flex;flex-wrap:wrap;gap:6px}
.mm-qbtn{padding:5px 11px;border-radius:20px;font-size:11px;border:1px solid var(--border2,#2a3340);color:var(--gold,#98690a);background:transparent;cursor:pointer}
.mm-qbtn:hover{background:rgba(138,109,20,.08)}
#mymy-input-row{padding:10px 12px;border-top:1px solid var(--border,#232b36);display:flex;gap:8px;align-items:center}
#mymy-input{flex:1;background:var(--bg3,#1a212b);border:1px solid var(--border2,#2a3340);border-radius:20px;padding:8px 14px;color:var(--text,#1e293b);font-size:13px;outline:none}
#mymy-input:focus{border-color:var(--gold,#98690a)}
#mymy-send{width:34px;height:34px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--gold,#98690a),var(--gold2,#e0aa3e));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
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

    console.log('[MyMy DEBUG] sendClick: qua hết các điều kiện chặn, callAlnChat =', typeof callAlnChat);
    if (!callAlnChat) { addBot('Dạ hệ thống đang khởi động, anh/chị thử lại sau vài giây giúp em nha!'); return; }

    setSending(true);
    showTyping();
    console.log('[MyMy DEBUG] sendClick: chuẩn bị gọi callAlnChat() lúc', new Date().toISOString());
    callAlnChat(text, S.history).then((res) => {
      console.log('[MyMy DEBUG] callAlnChat() đã RESOLVE lúc', new Date().toISOString());
      removeTyping();
      addBot((res.reply || '').replace(/\n/g, '<br>'));
      S.history.push({ role: 'assistant', content: res.reply || '' });
      renderSuggestion(res.suggestion);
      if (S.userTurns >= 3 && !S.askedPhone) {
        S.askedPhone = true;
        setTimeout(() => addBot('Để đội ngũ ALN liên hệ tư vấn kỹ hơn, ' + S.addr + ' để lại SĐT giúp em nha?'), 900);
      }
    }).catch((err) => {
      console.log('[MyMy DEBUG] callAlnChat() đã REJECT lúc', new Date().toISOString(), '— message:', err && err.message);
      removeTyping();
      addBot('Dạ hệ thống đang bận, anh/chị thử lại sau ít phút giúp em nha!');
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
  console.log('[MyMy DEBUG] bắt đầu init Firebase lúc', new Date().toISOString());
  (async () => {
    try {
      const [{ app }, authMod, fnMod] = await Promise.all([
        import('./firebase-config.js'),
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js'),
      ]);
      console.log('[MyMy DEBUG] đã import xong firebase-config.js + firebase-auth.js + firebase-functions.js lúc', new Date().toISOString());
      const auth = authMod.getAuth(app);
      const functions = fnMod.getFunctions(app, 'asia-southeast1');
      const fnAlnChat = fnMod.httpsCallable(functions, 'alnChat');
      const fnUpsertContact = fnMod.httpsCallable(functions, 'upsertContact');

      let authReady = false;
      authMod.signInAnonymously(auth)
        .then(() => console.log('[MyMy DEBUG] signInAnonymously() RESOLVE lúc', new Date().toISOString()))
        .catch((e) => console.error('[MyMy DEBUG] signInAnonymously() REJECT:', e && e.code, e && e.message));
      authMod.onAuthStateChanged(auth, (u) => {
        console.log('[MyMy DEBUG] onAuthStateChanged (listener gốc) lúc', new Date().toISOString(), '— u =', u ? ('uid=' + u.uid + ' isAnonymous=' + u.isAnonymous) : null);
        authReady = !!u;
      });
      console.log('[MyMy DEBUG] callAlnChat sắp được gán (setup xong) lúc', new Date().toISOString());

      const pageContext = (document.title || '').split('|')[0].trim().slice(0, 100);

      /* Bọc timeout cho mọi bước có thể "treo âm thầm" — không chỉ chờ
         đăng nhập ẩn danh, mà cả chính lệnh gọi Cloud Function. Lý do: SDK
         Functions tự gắn token App Check (đã initializeAppCheck toàn app
         qua firebase-config.js) cho MỌI request callable một khi đã bật,
         KHÔNG phụ thuộc hàm đó có enforceAppCheck:true hay không — nếu
         bước lấy token reCAPTCHA v3 bị chặn/chậm (mạng công ty, ad-block),
         SDK tự retry NGẦM, không bắn request thật lẫn không báo lỗi Console
         (hiện tượng đã ghi nhận thật ở các hàm khác trong hệ thống, xem
         CLAUDE.md "appCheck/recaptcha-error lặp lại nhiều phút"). Không bọc
         timeout ở đây thì UI treo vô thời hạn — đúng triệu chứng gặp trên
         forum.html sau khi deploy. */
      function withTimeout(promise, ms, message){
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
        ]);
      }

      /* ═══ LOG CHẨN ĐOÁN TẠM THỜI (prefix [MyMy DEBUG]) — xoá sau khi tìm ra
         chỗ treo thật. Đánh dấu từng bước để xác định CHÍNH XÁC dòng nào
         không bao giờ chạy tới, thay vì đoán tiếp (App Check/domain đã bị
         loại trừ bằng bằng chứng Cloud Run log — 0 request tới alnChat
         trong khi timeout 20s vẫn tự kích hoạt đúng lúc). ═══ */
      callAlnChat = async (text, history) => {
        console.log('[MyMy DEBUG] callAlnChat() bắt đầu — authReady =', authReady);
        if (!authReady) {
          console.log('[MyMy DEBUG] authReady=false, bắt đầu chờ onAuthStateChanged (tối đa 10s)...');
          await withTimeout(
            new Promise((resolve) => {
              const unsub = authMod.onAuthStateChanged(auth, (u) => {
                console.log('[MyMy DEBUG] onAuthStateChanged fired trong lúc chờ — u =', u ? ('uid=' + u.uid + ' isAnonymous=' + u.isAnonymous) : null);
                if (u) { unsub(); resolve(); }
              });
            }),
            10000,
            'Hết thời gian chờ đăng nhập ẩn danh'
          );
          console.log('[MyMy DEBUG] đã qua bước chờ auth (không timeout) lúc', new Date().toISOString());
        }
        console.log('[MyMy DEBUG] chuẩn bị gọi fnAlnChat(...) lúc', new Date().toISOString(), '— auth.currentUser =', auth.currentUser ? ('uid=' + auth.currentUser.uid) : null);
        const callPromise = fnAlnChat({
          messages: history, agentName: 'MyMy', toUser: S.addr,
          userName: null, role: null, pageContext,
        });
        console.log('[MyMy DEBUG] fnAlnChat(...) đã được GỌI (đã return Promise, SDK đang xử lý) lúc', new Date().toISOString());
        const res = await withTimeout(
          callPromise,
          20000,
          'Hết thời gian chờ phản hồi từ MyMy (có thể do App Check token bị chặn)'
        );
        console.log('[MyMy DEBUG] fnAlnChat(...) đã SETTLE (có phản hồi thật từ server) lúc', new Date().toISOString());
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
