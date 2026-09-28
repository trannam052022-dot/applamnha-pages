/*
 * aln-esc.js — hàm escape dùng chung cho các trang công khai và dashboard (28/09/2026).
 * Nạp SỚM, trước mọi <script> khác của trang:  <script src="aln-esc.js"></script>
 * (trang trong thư mục con dùng ../aln-esc.js). Bản gốc cùng quy tắc: đầu founder_panel.html.
 *
 *   eH(s)          chữ hoặc giá trị thuộc tính HTML (& < > " ' `)
 *   eJ(v)          tham số chuỗi JS trong thuộc tính on*  → onclick="f('+eJ(id)+')"
 *                  (eJ tự thêm dấu nháy; KHÔNG đặt thêm \' quanh nó)
 *   eU(u)          URL đặt vào href/src khi dựng chuỗi HTML (đã escape HTML); URL lạ → '#'
 *   alnUrl(u)      URL gán qua DOM (a.href = …, img.src = …, window.open) — KHÔNG escape HTML
 *   alnLocHtml(h)  chỗ CỐ Ý hiển thị HTML định dạng (bài viết, trả lời AI…): chỉ giữ thẻ an toàn
 *
 * Script thường (không phải module) → các hàm là biến toàn cục, module gọi được trực tiếp.
 */
(function (w) {
  'use strict';
  var BANG_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  function eH(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"'`]/g, function (c) { return BANG_ESC[c]; });
  }
  function eJ(v) { return eH(JSON.stringify(v === undefined || v === null ? '' : String(v))); }

  // Có scheme thì chỉ nhận http(s)/mailto/tel/blob/data:image; không scheme (đường dẫn tương đối) thì giữ.
  var SCHEME_TOT = { http: 1, https: 1, mailto: 1, tel: 1, blob: 1 };
  function alnUrl(u) {
    var t = String(u === undefined || u === null ? '' : u).trim();
    // Bỏ ký tự điều khiển/khoảng trắng mà trình duyệt lờ đi khi đọc scheme (java\tscript:)
    var goc = t.replace(/[\u0000- \u007f]/g, '');
    var m = /^([a-z][a-z0-9+.\-]*):/i.exec(goc);
    if (!m) return t;
    var sc = m[1].toLowerCase();
    if (SCHEME_TOT[sc]) return t;
    if (sc === 'data' && /^data:image\/(?:png|jpe?g|gif|webp)[;,]/i.test(goc)) return t;
    return '#';
  }
  function eU(u) { return eH(alnUrl(u)); }

  // Bộ lọc HTML: chỉ giữ thẻ định dạng, bỏ mọi thuộc tính trừ href (qua alnUrl) ở <a>.
  var THE_GIU = {
    B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, BR: 1, P: 1, DIV: 1, SPAN: 1, UL: 1, OL: 1, LI: 1, A: 1,
    CODE: 1, PRE: 1, BLOCKQUOTE: 1, H2: 1, H3: 1, H4: 1, H5: 1, HR: 1, SUB: 1, SUP: 1, SMALL: 1, MARK: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TH: 1, TD: 1
  };
  // Thẻ bỏ luôn cả nội dung bên trong (không giữ lại chữ).
  var THE_BO_HAN = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, NOSCRIPT: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, SVG: 1, MATH: 1, TEXTAREA: 1, TITLE: 1, XMP: 1, NOEMBED: 1, NOFRAMES: 1, SELECT: 1, OPTION: 1, HEAD: 1 };
  function chepNut(nut, dich, doc) {
    for (var c = nut.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { dich.appendChild(doc.createTextNode(c.nodeValue)); continue; }
      if (c.nodeType !== 1) continue;
      var ten = String(c.nodeName).toUpperCase();
      if (THE_BO_HAN[ten]) continue;
      if (!THE_GIU[ten]) { chepNut(c, dich, doc); continue; } // thẻ lạ: giữ chữ, bỏ thẻ
      var moi = doc.createElement(ten.toLowerCase());
      if (ten === 'A') {
        var href = alnUrl(c.getAttribute('href'));
        if (href !== '#') {
          moi.setAttribute('href', href);
          if (/^https?:\/\//i.test(href)) { moi.setAttribute('target', '_blank'); moi.setAttribute('rel', 'noopener noreferrer nofollow'); }
        }
      }
      chepNut(c, moi, doc);
      dich.appendChild(moi);
    }
  }
  function alnLocHtml(html) {
    var s = String(html === undefined || html === null ? '' : html);
    if (!s) return '';
    var doc = w.document;
    // <template> là tài liệu "trơ": không chạy script, không tải ảnh, không bắn onerror khi phân tích.
    var tpl = doc.createElement('template');
    tpl.innerHTML = s;
    var ra = doc.createElement('div');
    chepNut(tpl.content, ra, doc);
    return ra.innerHTML;
  }

  // Câu trả lời MyMy/AI: escape TRƯỚC, rồi mới định dạng — chỉ sinh 2 thẻ <strong> và <br>.
  // **chữ** → <strong>chữ</strong> (cùng dòng); bỏ '*', '#', '-' thừa ở đầu dòng (gạch đầu dòng,
  // tiêu đề Markdown); ** lẻ còn sót bị bỏ; xuống dòng → <br>. Bản sao y hệt ở mymy-widget.js
  // (mmHtml) — sửa ở đây thì sửa cả bên đó (scripts/_test_aln_esc.js đối chiếu 2 bản).
  function alnMyMyHtml(text) {
    return eH(text).split(/\r?\n/).map(function (dong) {
      return dong
        .replace(/^\s*(?:(?:#{1,6}|\*{1,2}(?!\*)|[-•])\s+)+/, '')
        .replace(/\*\*(?=\S)([^*]*?\S)\*\*/g, '<strong>$1</strong>')
        .replace(/\*\*/g, '');
    }).join('<br>');
  }

  w.eH = eH; w.eJ = eJ; w.eU = eU; w.alnUrl = alnUrl; w.alnLocHtml = alnLocHtml; w.alnMyMyHtml = alnMyMyHtml;
})(window);
