/* ═══════════════════════════════════════════════════════════════
   Khung biểu cảm MyMy trong khung trò chuyện — Văn phòng ALN (08/11/2026, đợt 0)

   Mặt 3D trong văn phòng cố định; biểu cảm là clip Kling 3–5 giây hiện ở dải trên cùng
   khung chat MyMy, đổi theo việc khách đang làm:
     mở chat → chao · khách đang gõ → nghe · chờ trả lời → suy_nghi
     MyMy trả lời → noi_1 / noi_2 xen kẽ (hoặc vui, dong_cam, ngac_nhien, luu_y, tam_biet theo câu)
     nói xong → nghe
   Clip: mo-hinh-3d/nguoi/<ma>/<bieu_cam>.mp4 (không tiếng, quay vòng được càng tốt).
   Chưa có clip nào thì hiện ảnh tĩnh <ma>/anh.webp — thêm clip chỉ cần chép file, không sửa mã.
   Clip nào thiếu (404) thì nhớ lại, lần sau dùng ảnh tĩnh. Máy bật giảm chuyển động / tiết kiệm
   dữ liệu: chỉ ảnh tĩnh. Chỉ đọc khung chat (không sửa mymy-widget.js), không dùng innerHTML.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var MA = 'mymy';
  var GOC = new URL('../mo-hinh-3d/nguoi/' + MA + '/', document.currentScript ? document.currentScript.src : location.href).href;
  var V = '?v=1';
  var VONG = { nghe: 1, suy_nghi: 1 }; // biểu cảm nền: quay vòng; còn lại phát 1 lần rồi về "nghe"
  var tinh = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
    (navigator.connection && navigator.connection.saveData);
  var thieu = {}, dai = null, vid = null, anh = null, dang = '', henVe = 0, luotNoi = 0;

  function css() {
    var s = document.createElement('style');
    s.textContent = '.mm-bc{position:relative;height:132px;flex-shrink:0;overflow:hidden;background:#d7d9de;border-bottom:1px solid rgba(255,255,255,.18)}' +
      '.mm-bc video,.mm-bc img{position:absolute;top:0;left:50%;transform:translateX(-50%);height:100%;aspect-ratio:1;width:auto;object-fit:cover;object-position:50% 25%}' +
      '.mm-bc video{opacity:0;transition:opacity .25s}.mm-bc video.hien{opacity:1}' +
      '@media(max-width:480px){.mm-bc{height:104px}}';
    document.head.appendChild(s);
  }
  function dung(win) {
    if (dai) return;
    var dau = win.querySelector('.mymy-head'); if (!dau) return;
    css();
    dai = document.createElement('div'); dai.className = 'mm-bc'; dai.setAttribute('aria-hidden', 'true');
    anh = document.createElement('img'); anh.alt = ''; anh.decoding = 'async'; anh.src = alnUrl(GOC + 'anh.webp' + V);
    anh.onerror = function () { dai.style.display = 'none'; }; // không có cả ảnh tĩnh: ẩn dải
    dai.appendChild(anh);
    if (!tinh) {
      vid = document.createElement('video'); vid.muted = true; vid.defaultMuted = true; vid.playsInline = true;
      vid.setAttribute('playsinline', ''); vid.setAttribute('muted', ''); vid.preload = 'none';
      vid.addEventListener('error', function () { if (dang) thieu[dang] = 1; vid.classList.remove('hien'); });
      vid.addEventListener('playing', function () { vid.classList.add('hien'); });
      vid.addEventListener('ended', function () { if (!VONG[dang]) dat('nghe'); });
      dai.appendChild(vid);
    }
    dau.parentNode.insertBefore(dai, dau.nextSibling);
    if (an) dai.style.display = 'none';
  }
  // chủ phòng không phải MyMy đang nói (Văn phòng ALN, 09/11/2026): ẩn mặt MyMy để khung chat khỏi lệch người
  var an = false;
  window.alnBieuCamAn = function (v) { an = !!v; if (dai && anh) dai.style.display = an ? 'none' : ''; if (an && vid) { try { vid.pause(); } catch (e) { /* bỏ qua */ } } };
  function dat(ten, giu) {
    clearTimeout(henVe);
    if (giu) henVe = setTimeout(function () { dat('nghe'); }, giu);
    if (!vid || ten === dang) return;
    dang = ten;
    try { (window.dataLayer = window.dataLayer || []).push({ event: 'aln_mymy_bieu_cam', bieu_cam: ten }); } catch (e) { /* bỏ qua */ }
    if (thieu[ten]) { vid.classList.remove('hien'); return; }
    vid.loop = !!VONG[ten]; vid.src = alnUrl(GOC + ten + '.mp4' + V);
    var p = vid.play(); if (p && p.catch) p.catch(function () { vid.classList.remove('hien'); });
  }
  // chọn biểu cảm theo nội dung câu MyMy vừa trả lời
  function theoCau(t) {
    t = (t || '').toLowerCase();
    if (/tạm biệt|hẹn gặp lại|chúc anh\/chị một ngày/.test(t)) return 'tam_biet';
    if (/rất tiếc|xin lỗi|thông cảm|lo lắng/.test(t)) return 'dong_cam';
    if (/lưu ý|chú ý|cần cẩn thận|quan trọng/.test(t)) return 'luu_y';
    if (/^(dạ,? )?(ồ|ôi|wow)/.test(t)) return 'ngac_nhien';
    if (/tuyệt|chúc mừng|rất vui/.test(t)) return 'vui';
    luotNoi++; return luotNoi % 2 ? 'noi_1' : 'noi_2';
  }
  function theoDoi(win) {
    dung(win);
    var dsTin = win.querySelector('#mymy-msgs'), o = win.querySelector('#mymy-input'), moTruoc = false;
    new MutationObserver(function () {
      var mo = win.classList.contains('open');
      if (mo && !moTruoc) dat('chao', 4500);
      if (!mo && vid) { vid.pause(); dang = ''; }
      moTruoc = mo;
    }).observe(win, { attributes: true, attributeFilter: ['class'] });
    if (dsTin) new MutationObserver(function (ds) {
      ds.forEach(function (m) { m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.id === 'mymy-typing') { dat('suy_nghi'); return; }
        if (n.classList && n.classList.contains('bot')) { var b = n.querySelector('.mm-bubble'); var cau = b ? b.textContent : '';
          dat(theoCau(cau), Math.min(7000, 2200 + cau.length * 45)); }
      }); });
    }).observe(dsTin, { childList: true });
    if (o) o.addEventListener('input', function () { if (dang !== 'suy_nghi') dat('nghe'); });
  }
  function cho() {
    var win = document.getElementById('mymy-win');
    if (win) { theoDoi(win); return; }
    var ob = new MutationObserver(function () { var w = document.getElementById('mymy-win'); if (w) { ob.disconnect(); theoDoi(w); } });
    ob.observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) cho(); else document.addEventListener('DOMContentLoaded', cho);
})();
