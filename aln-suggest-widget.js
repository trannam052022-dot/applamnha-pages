/* Ô gợi ý chương trình nổi (kính mờ) — dùng chung trên các trang công khai
   khách vãng lai duyệt xem (không gắn vào dashboard nội bộ đã đăng nhập,
   không gắn vào landing page quảng cáo/form đăng ký — tránh phân tán mục
   tiêu chuyển đổi của các trang đó). Style tự chứa, không phụ thuộc biến
   CSS của từng trang, cùng cách làm với ncc-network-badge.js. Nháp + lý do
   thiết kế xem CLAUDE.md mục "Ô gợi ý chương trình nổi". */
(function () {
  if (document.getElementById('alnSuggestWidget')) return; // tránh chèn 2 lần

  var DISMISS_KEY = 'alnSuggestWidget_dismiss_v1';
  var ENTRANCE_DELAY_MS = 3500;

  var DATA = {
    cn: { label: 'Chủ nhà', color: '#4ade80', cards: [
      { badge: '0đ tham khảo', title: 'Kho hồ sơ mẫu giá tốt', desc: 'Chọn bản vẽ đã bàn giao, rẻ hơn thiết kế riêng', href: '/index.html#khomau',
        icon: '<path d="M4 10.5 12 4l8 6.5" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 9.5V19a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1V9.5" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>' },
      { badge: 'Minh bạch 4 bước', title: 'Theo dõi công trình realtime', desc: 'Xem tiến độ, phương án, hồ sơ mọi lúc', href: '/register.html',
        icon: '<circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>' }
    ]},
    kts: { label: 'KTS', color: '#e0972f', cards: [
      { badge: 'Duyệt hồ sơ 24-48h', title: 'Nhận dự án đều tay', desc: 'Không cần tự chạy quảng cáo tìm khách', href: '/kts-apply.html',
        icon: '<rect x="4" y="7" width="16" height="12" rx="1.6" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" stroke-width="1.7" fill="none"/>' },
      { badge: 'Miễn phí tham gia', title: 'Cộng đồng Hỏi‑Đáp KTS', desc: 'Trao đổi case thật, nhận thêm khách qua Diễn đàn', href: '/forum.html',
        icon: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V14a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5v-3.5H6.5A2.5 2.5 0 0 1 4 14V6.5Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>' }
    ]},
    dn: { label: 'Doanh nghiệp', color: '#5b8def', cards: [
      { badge: 'Đối tác đầu tư', title: 'Mở rộng quỹ dự án', desc: 'Hợp tác đầu tư, quản lý minh bạch từng chặng', href: '/dn-studio.html',
        icon: '<path d="M3 20V9.5l6-3.5 6 3.5V20" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M15 20v-7l6-2v9" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>' },
      { badge: 'Đa dự án', title: 'Xem dự án đang triển khai', desc: 'Theo dõi nhiều công trình cùng lúc, 1 nơi duy nhất', href: '/dn-studio.html',
        icon: '<rect x="4" y="4" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7" fill="none"/><rect x="13" y="4" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7" fill="none"/><rect x="4" y="13" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7" fill="none"/><rect x="13" y="13" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.7" fill="none"/>' }
    ]},
    dt: { label: 'Đối tác', color: '#e0aa3e', cards: [
      { badge: 'Khách tự tìm đến', title: 'Gian hàng Vật tư – Đội thi công', desc: 'Có sẵn lead giới thiệu, không cần tự quảng cáo', href: '/ncc-showcase.html',
        icon: '<path d="M4 9 12 4l8 5-8 5-8-5Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M4 9v6l8 5 8-5V9" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>' },
      { badge: 'Không cần tài khoản', title: 'Nhận Gạch &amp; hoa hồng', desc: 'Giới thiệu khách ký HĐ, nhận 15% chặng C1', href: '/ctv_dashboard.html',
        icon: '<rect x="5" y="10" width="14" height="9" rx="1.6" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M12 10V6.8c0-1 .8-1.8 1.8-1.8 1 0 1.8.8 1.8 1.7 0 1-1 1.3-1.8 1.3H8.4c-.9 0-1.8-.4-1.8-1.3 0-1 .8-1.7 1.8-1.7 1 0 1.8.8 1.8 1.8V10" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>' }
    ]}
  };
  var ORDER = ['cn', 'kts', 'dn', 'dt'];

  var style = document.createElement('style');
  style.textContent =
    '.aln-sw-chip{position:fixed;left:18px;bottom:18px;z-index:50;display:flex;align-items:center;gap:0;' +
      'opacity:0;transform:translateY(14px) scale(.94);pointer-events:none;font-family:-apple-system,"Segoe UI",system-ui,sans-serif}' +
    '.aln-sw-chip.aln-sw-show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}' +
    '@media(prefers-reduced-motion:no-preference){.aln-sw-chip{transition:opacity .5s cubic-bezier(.16,1,.3,1),transform .5s cubic-bezier(.16,1,.3,1)}}' +
    '.aln-sw-chip-btn{display:flex;align-items:center;gap:9px;background:rgba(15,22,34,.82);backdrop-filter:blur(14px) saturate(1.3);' +
      '-webkit-backdrop-filter:blur(14px) saturate(1.3);color:#f3ede0;border:1px solid rgba(224,170,62,.35);border-radius:99px;' +
      'padding:11px 16px 11px 12px;cursor:pointer;box-shadow:0 8px 26px rgba(15,20,30,.28);font-size:12.6px;font-weight:700;letter-spacing:.01em}' +
    '.aln-sw-chip-btn .aln-sw-dotwrap{position:relative;width:8px;height:8px;flex-shrink:0}' +
    '.aln-sw-chip-btn .aln-sw-dotcore{position:absolute;inset:0;border-radius:50%;background:#e0aa3e}' +
    '.aln-sw-chip-btn .aln-sw-dotring{position:absolute;inset:0;border-radius:50%;background:#e0aa3e;opacity:.5}' +
    '@media(prefers-reduced-motion:no-preference){.aln-sw-chip-btn .aln-sw-dotring{animation:aln-sw-breathe 2.6s ease-in-out infinite}}' +
    '@keyframes aln-sw-breathe{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(2.1);opacity:0}}' +
    '.aln-sw-chip-x{width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.2);' +
      'color:#cfc6b0;margin-left:6px;font-size:12px;cursor:pointer;flex-shrink:0;line-height:1}' +
    '.aln-sw-chip-btn:focus-visible,.aln-sw-chip-x:focus-visible{outline:2px solid #e0aa3e;outline-offset:2px}' +
    '.aln-sw-panel{position:fixed;left:18px;bottom:18px;z-index:51;width:336px;max-width:calc(100vw - 36px);' +
      'background:rgba(16,23,35,.86);backdrop-filter:blur(18px) saturate(1.35);-webkit-backdrop-filter:blur(18px) saturate(1.35);' +
      'border:1px solid rgba(224,170,62,.28);border-radius:18px;box-shadow:0 24px 60px rgba(8,12,20,.38);color:#f3ede0;' +
      'overflow:hidden;opacity:0;transform:translateY(10px) scale(.97);pointer-events:none;transform-origin:bottom left;' +
      'font-family:-apple-system,"Segoe UI",system-ui,sans-serif}' +
    '.aln-sw-panel.aln-sw-show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}' +
    '@media(prefers-reduced-motion:no-preference){.aln-sw-panel{transition:opacity .3s cubic-bezier(.16,1,.3,1),transform .3s cubic-bezier(.16,1,.3,1)}}' +
    '.aln-sw-head{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 10px}' +
    '.aln-sw-head strong{font-size:13px;font-weight:700}' +
    '.aln-sw-head button{width:24px;height:24px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.22);' +
      'color:#cfc6b0;font-size:13px;cursor:pointer;line-height:1}' +
    '.aln-sw-tabs{display:flex;gap:5px;padding:0 12px 12px;flex-wrap:wrap}' +
    '.aln-sw-tab{font-size:11px;font-weight:700;letter-spacing:.01em;padding:6px 11px;border-radius:99px;border:1px solid transparent;' +
      'background:rgba(255,255,255,.06);color:#c7bea9;cursor:pointer}' +
    '.aln-sw-tab[aria-selected="true"]{background:var(--aln-sw-c,#e0aa3e);color:#1a1400;border-color:var(--aln-sw-c,#e0aa3e)}' +
    '.aln-sw-tab:focus-visible{outline:2px solid #e0aa3e;outline-offset:1px}' +
    '.aln-sw-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 12px 14px}' +
    '.aln-sw-card{display:flex;flex-direction:column;gap:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);' +
      'border-radius:12px;padding:11px 11px 12px;text-decoration:none;color:inherit}' +
    '@media(prefers-reduced-motion:no-preference){.aln-sw-card{transition:background .18s,border-color .18s,transform .18s}}' +
    '.aln-sw-card:hover,.aln-sw-card:focus-visible{background:rgba(255,255,255,.10);border-color:var(--aln-sw-c,#e0aa3e);transform:translateY(-1px)}' +
    '.aln-sw-card:focus-visible{outline:2px solid var(--aln-sw-c,#e0aa3e);outline-offset:1px}' +
    '.aln-sw-badge{align-self:flex-start;font-size:9.5px;font-weight:700;letter-spacing:.02em;color:var(--aln-sw-c,#e0aa3e);' +
      'background:rgba(255,255,255,.14);padding:2px 7px;border-radius:6px}' +
    '.aln-sw-card .aln-sw-ic{width:20px;height:20px;color:var(--aln-sw-c,#e0aa3e)}' +
    '.aln-sw-card .aln-sw-t{font-size:12.5px;font-weight:700;line-height:1.25}' +
    '.aln-sw-card .aln-sw-d{font-size:11px;color:#b9b09a;line-height:1.4}' +
    '.aln-sw-card .aln-sw-go{font-size:11px;font-weight:700;color:var(--aln-sw-c,#e0aa3e);display:flex;align-items:center;gap:4px;margin-top:auto}' +
    '@media(max-width:480px){.aln-sw-chip,.aln-sw-panel{left:12px;bottom:12px}}';
  document.head.appendChild(style);

  var chip = document.createElement('div');
  chip.className = 'aln-sw-chip';
  chip.id = 'alnSuggestWidget';
  chip.innerHTML =
    '<button type="button" class="aln-sw-chip-btn" aria-haspopup="dialog" aria-expanded="false">' +
      '<span class="aln-sw-dotwrap"><span class="aln-sw-dotring"></span><span class="aln-sw-dotcore"></span></span>' +
      'Chương trình dành cho bạn' +
    '</button>' +
    '<button type="button" class="aln-sw-chip-x" aria-label="Đóng gợi ý, không hiện lại hôm nay">×</button>';

  var panel = document.createElement('div');
  panel.className = 'aln-sw-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chương trình đề xuất từ ALN');
  panel.innerHTML =
    '<div class="aln-sw-head"><strong>Chương trình phù hợp với bạn</strong>' +
      '<button type="button" aria-label="Thu gọn">×</button></div>' +
    '<div class="aln-sw-tabs" role="tablist"></div>' +
    '<div class="aln-sw-cards"></div>';

  document.body.appendChild(chip);
  document.body.appendChild(panel);

  var chipBtn = chip.querySelector('.aln-sw-chip-btn');
  var chipX = chip.querySelector('.aln-sw-chip-x');
  var panelClose = panel.querySelector('.aln-sw-head button');
  var tabsEl = panel.querySelector('.aln-sw-tabs');
  var cardsEl = panel.querySelector('.aln-sw-cards');
  var activeTab = 'cn';

  function renderTabs() {
    tabsEl.innerHTML = '';
    ORDER.forEach(function (key) {
      var d = DATA[key];
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'aln-sw-tab'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', key === activeTab ? 'true' : 'false');
      b.style.setProperty('--aln-sw-c', d.color);
      b.textContent = d.label;
      b.addEventListener('click', function () { activeTab = key; renderTabs(); renderCards(); });
      tabsEl.appendChild(b);
    });
  }

  function renderCards() {
    var d = DATA[activeTab];
    cardsEl.innerHTML = '';
    cardsEl.style.setProperty('--aln-sw-c', d.color);
    d.cards.forEach(function (c) {
      var a = document.createElement('a');
      a.className = 'aln-sw-card'; a.href = c.href;
      a.style.setProperty('--aln-sw-c', d.color);
      a.innerHTML =
        '<span class="aln-sw-badge">' + c.badge + '</span>' +
        '<svg class="aln-sw-ic" viewBox="0 0 24 24" fill="none">' + c.icon + '</svg>' +
        '<span class="aln-sw-t">' + c.title + '</span>' +
        '<span class="aln-sw-d">' + c.desc + '</span>' +
        '<span class="aln-sw-go">Xem thêm →</span>';
      cardsEl.appendChild(a);
    });
  }
  renderTabs(); renderCards();

  function openPanel() {
    panel.classList.add('aln-sw-show'); chip.classList.remove('aln-sw-show');
    chipBtn.setAttribute('aria-expanded', 'true');
  }
  function closePanel(toChip) {
    panel.classList.remove('aln-sw-show'); chipBtn.setAttribute('aria-expanded', 'false');
    if (toChip) chip.classList.add('aln-sw-show');
  }
  chipBtn.addEventListener('click', openPanel);
  panelClose.addEventListener('click', function () { closePanel(true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('aln-sw-show')) closePanel(true);
  });
  document.addEventListener('click', function (e) {
    if (panel.classList.contains('aln-sw-show') && !panel.contains(e.target) && e.target !== chipBtn && !chipBtn.contains(e.target)) {
      closePanel(true);
    }
  });
  chipX.addEventListener('click', function (e) {
    e.stopPropagation();
    chip.classList.remove('aln-sw-show');
    try { localStorage.setItem(DISMISS_KEY, new Date().toDateString()); } catch (err) {}
  });

  var dismissedToday = false;
  try { dismissedToday = localStorage.getItem(DISMISS_KEY) === new Date().toDateString(); } catch (err) {}
  if (!dismissedToday) {
    setTimeout(function () { chip.classList.add('aln-sw-show'); }, ENTRANCE_DELAY_MS);
  }
})();
