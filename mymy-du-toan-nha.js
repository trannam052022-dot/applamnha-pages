/* ═══════════════════════════════════════════════════════════════
   MyMy hướng dẫn điền bảng dự toán — du-toan-nha.html (30/09/2026)

   Nam: khách nhiều người lớn tuổi, không rành công nghệ, không biết điền
   bảng. MyMy phải chủ động giúp, không chỉ là ô chat chờ hỏi.

   Ba việc, chạy hoàn toàn trên trình duyệt (không gọi AI, không tốn phí,
   luôn trả lời giống nhau):
   1. Điền giúp: hỏi 5 câu bằng nút bấm (ngang, dài, số tầng, sân thượng,
      thang máy/hầm) → đặt vào đúng các ô qua window.alnDuToanDienGiup (trang
      tự tính như khách tự gõ) → đọc lại con số ước tính.
   2. Chỉ từng bước: đóng khung chat, tô sáng từng ô trên trang và đặt một
      khung giải thích ngay cạnh ô đó.
   3. Hiểu câu gõ tự do kiểu "5x20 1 trệt 2 lầu" — điền luôn, không cần hỏi.
   Câu khác (hỏi phí thiết kế, hỏi quy trình...) vẫn đi AI như trước.

   Phải nạp TRƯỚC mymy-widget.js. Không ghép HTML từ dữ liệu: mọi chữ vào
   trang đều qua textContent; chữ vào khung chat đi qua mmHtml của widget.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  // Chế độ doanh nghiệp (?dn=1): nhà thầu lập báo giá, không phải chủ nhà —
  // không hướng dẫn kiểu chủ nhà, MyMy chat như trang thường.
  var cheDoDN = false;
  try { cheDoDN = new URLSearchParams(window.location.search).get('dn') === '1'; } catch (e) { /* bỏ qua */ }
  if (cheDoDN) {
    // Ẩn luôn nút "Để MyMy điền giúp" — không đợi CSS body.che-do-dn (lớp này
    // do module Firebase gắn, có thể chậm hoặc lỗi mạng).
    var nutMoi = document.querySelectorAll('.mm-moi');
    for (var i = 0; i < nutMoi.length; i++) nutMoi[i].style.display = 'none';
    return;
  }

  function ga(ten, thamSo) {
    try {
      var d = { event: ten };
      if (thamSo) for (var k in thamSo) if (Object.prototype.hasOwnProperty.call(thamSo, k)) d[k] = thamSo[k];
      (window.dataLayer = window.dataLayer || []).push(d);
    } catch (e) { /* bỏ qua */ }
  }

  /* ── Đọc số kiểu Việt: "4,5" "4.5" "4m5" "5 mét" ── */
  function docSo(text) {
    var t = String(text || '').toLowerCase().replace(/mét|met/g, 'm');
    var m = /(\d+)\s*m\s*(\d{1,2})(?!\d)/.exec(t); // 4m5 = 4,5 m
    if (m) return Number(m[1] + '.' + m[2]);
    m = /(\d+(?:[.,]\d+)?)/.exec(t);
    return m ? Number(m[1].replace(',', '.')) : NaN;
  }

  function soDep(x) { return String(Math.round(x * 100) / 100).replace('.', ','); }

  /* ── Hiểu câu tự do: kích thước "5x20", "5 x 20m", "ngang 5 dài 20";
        số sàn "3 tầng", "4 sàn", "1 trệt 2 lầu", "2 lầu" (= 3 sàn), "có lửng" ── */
  function docCau(text) {
    var t = String(text || '').toLowerCase().replace(/(\d)m(\d)/g, '$1.$2').replace(/,/g, '.');
    var kq = {};
    var m = /(\d+(?:\.\d+)?)\s*m?\s*[x×*]\s*(\d+(?:\.\d+)?)/.exec(t);
    if (m) { kq.ngang = Number(m[1]); kq.dai = Number(m[2]); }
    else {
      var mn = /(?:ngang|rộng|mặt tiền)\s*:?\s*(\d+(?:\.\d+)?)/.exec(t);
      var md = /(?:dài|sâu)\s*:?\s*(\d+(?:\.\d+)?)/.exec(t);
      if (mn) kq.ngang = Number(mn[1]);
      if (md) kq.dai = Number(md[1]);
    }
    var lau = /(\d+)\s*(?:lầu|lau)/.exec(t);
    var tang = /(\d+)\s*(?:tầng|tang|sàn|san)(?!\s*thượng|\s*thuong)/.exec(t);
    var lung = /lửng|lung/.test(t) ? 1 : 0;
    if (lau) kq.san = Number(lau[1]) + 1 + lung;
    else if (tang) kq.san = Number(tang[1]);
    else if (/chỉ\s*(?:có\s*)?(?:tầng\s*)?trệt|nhà cấp 4|cấp bốn/.test(t)) kq.san = 1;
    if (/không\s*(?:có\s*)?sân thượng|ko\s*sân thượng/.test(t)) kq.st = '0';
    else if (/sân thượng/.test(t)) kq.st = '0.7';
    return kq;
  }

  var NGANG_HOP_LE = [2, 30];
  var DAI_HOP_LE = [3, 100];

  /* ── Tô sáng + khung giải thích cạnh ô trên trang ── */
  var CSS = ''
    + '.mm-chi{outline:3px solid #e0aa3e!important;outline-offset:3px;border-radius:8px;animation:mmChi 1.1s ease-in-out 3}'
    + '@keyframes mmChi{0%,100%{outline-color:#e0aa3e}50%{outline-color:rgba(224,170,62,.25)}}'
    + '@media (prefers-reduced-motion:reduce){.mm-chi{animation:none}}'
    + '.mm-goi{margin:12px 0;padding:14px 16px;border-radius:12px;background:#101723;color:#efe9dc;border:1px solid #e0aa3e;'
    + 'font-size:16px;line-height:1.55;box-shadow:0 8px 24px rgba(8,12,20,.25)}'
    + '.mm-goi b.mm-goi-ten{display:block;color:#e0aa3e;font-size:13px;letter-spacing:.02em;margin-bottom:4px}'
    + '.mm-goi-nut{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}'
    + '.mm-goi-nut button{font:inherit;font-size:15px;font-weight:600;padding:9px 16px;border-radius:99px;cursor:pointer;'
    + 'border:1px solid #e0aa3e;background:linear-gradient(135deg,#e0aa3e,#98690a);color:#1a1400}'
    + '.mm-goi-nut button.phu{background:transparent;color:#efe9dc;border-color:rgba(255,255,255,.35)}';
  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  var dangChi = { khung: null, dich: null };
  function goChi() {
    if (dangChi.khung) dangChi.khung.remove();
    if (dangChi.dich) dangChi.dich.classList.remove('mm-chi');
    dangChi = { khung: null, dich: null };
  }

  function moSection(el) {
    var d = el && el.closest ? el.closest('details') : null;
    if (d && !d.open) d.open = true;
  }

  // dich: phần tử tô sáng; neo: chèn khung ngay TRƯỚC phần tử này (hoặc đầu
  // phần tử nếu vaoTrong) — tách neo khỏi dich để không phá lưới ô nhập.
  function chiVao(dich, neo, vaoTrong, dong, nut) {
    goChi();
    if (!dich) return;
    moSection(dich);
    dich.classList.add('mm-chi');
    var k = document.createElement('div');
    k.className = 'mm-goi';
    k.setAttribute('role', 'note');
    var ten = document.createElement('b');
    ten.className = 'mm-goi-ten';
    ten.textContent = 'MyMy hướng dẫn';
    k.appendChild(ten);
    (dong || []).forEach(function (s) {
      var p = document.createElement('div');
      p.textContent = s;
      k.appendChild(p);
    });
    var hang = document.createElement('div');
    hang.className = 'mm-goi-nut';
    (nut || []).forEach(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      if (n.phu) b.className = 'phu';
      b.textContent = n.nhan;
      b.addEventListener('click', n.lam);
      hang.appendChild(b);
    });
    k.appendChild(hang);
    // Khung đặt NGAY TRÊN phần được chỉ (trong neo nếu vaoTrong) rồi cuộn cho
    // khung nằm đầu màn hình: người đọc thấy lời dặn trước, ô tô sáng ngay dưới.
    // (Đặt dưới thì trên điện thoại khung rơi khỏi màn hình vì lưới ô nhập dài.)
    var n0 = neo || dich;
    if (vaoTrong) n0.insertBefore(k, n0.firstChild);
    else n0.parentNode.insertBefore(k, n0);
    dangChi = { khung: k, dich: dich };
    setTimeout(function () {
      var y = k.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - 12;
      try { window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); } catch (e) { window.scrollTo(0, Math.max(0, y)); }
    }, 60);
  }

  var $ = function (id) { return document.getElementById(id); };
  var MM = null; // API của widget, có khi khách mở chat lần đầu

  /* ── Chỉ từng bước ── */
  var BUOC = [
    function () {
      var luoi = $('w1') ? $('w1').closest('.grid') : null;
      chiVao(luoi, luoi, false, [
        'Bước 1: Gõ kích thước lô đất, đơn vị mét. Mặt tiền là bề ngang phía trước, mặt hậu là bề ngang phía sau, hai cạnh sâu là chiều dài hai bên.',
        'Đất vuông vức thì mặt tiền = mặt hậu, hai cạnh sâu bằng nhau. Không nhớ số thì xem trên sổ hồng, hoặc gõ gần đúng cũng được.',
      ], [
        { nhan: 'Tiếp theo ›', lam: function () { chayBuoc(1); } },
        { nhan: 'Để MyMy điền giúp', phu: true, lam: function () { goChi(); batDauDienGiup(true); } },
        { nhan: 'Tắt hướng dẫn', phu: true, lam: goChi },
      ]);
    },
    function () {
      var o = $('n');
      var luoi = o ? o.closest('.grid') : null;
      chiVao(o, luoi, false, [
        'Bước 2: Chọn số sàn — đếm cả tầng trệt, tầng lửng và các lầu. Ví dụ nhà 1 trệt 2 lầu là 3 sàn.',
        'Các ô còn lại (sân thượng, thang máy, tầng hầm) chọn đúng như nhà định xây. Ô nào không rõ thì để nguyên.',
      ], [
        { nhan: 'Tiếp theo ›', lam: function () { chayBuoc(2); } },
        { nhan: 'Tắt hướng dẫn', phu: true, lam: goChi },
      ]);
    },
    function () {
      var o = $('total');
      var the = $('out');
      chiVao(o, the, true, [
        'Bước 3: Đây là con số ước tính, tự tính lại mỗi khi anh/chị sửa ô bên trái. Là giá nhà thầu nhận, chưa gồm thuế GTGT.',
        'Bấm vào từng dòng bên dưới để xem tiền đi vào đâu. Phần "Giá vật tư" và "Nhân công" không rành thì cứ để nguyên.',
      ], [
        { nhan: 'Tiếp theo ›', lam: function () { chayBuoc(3); } },
        { nhan: 'Tắt hướng dẫn', phu: true, lam: goChi },
      ]);
    },
    function () { chiFormKTS(); },
  ];
  function chayBuoc(i) {
    ga('aln_mymy_huong_dan', { buoc: i + 1 });
    if (BUOC[i]) BUOC[i]();
  }

  function chiFormKTS() {
    var f = $('tuVan');
    if (!f || f.hidden) { goChi(); return; }
    chiVao(f, f, true, [
      'Muốn KTS xem giúp miễn phí: gõ họ tên, số điện thoại, chọn dự kiến khởi công, đánh dấu ô đồng ý rồi bấm "Gửi yêu cầu".',
      'KTS Trần Long sẽ gọi lại trong 1–2 ngày làm việc. Không ràng buộc gì.',
    ], [
      { nhan: 'Bắt đầu điền tên', lam: function () { goChi(); var o = $('tvTen'); if (o) { o.focus(); o.classList.add('mm-chi'); setTimeout(function () { o.classList.remove('mm-chi'); }, 3500); } } },
      { nhan: 'Tắt hướng dẫn', phu: true, lam: goChi },
    ]);
  }

  /* ── Điền giúp: 5 câu hỏi bằng nút ── */
  var dl = {};

  function hoiSo(cau, goiY, cacNut, khoang, ten, tiep, them) {
    MM.bot(cau);
    var ds = cacNut.map(function (v) {
      return { nhan: soDep(v) + ' m', lam: function () { dl[ten] = v; tiep(); } };
    });
    ds.push({ nhan: 'Số khác', lam: function () { MM.bot('Dạ anh/chị gõ số mét vào ô bên dưới giúp em, ví dụ ' + goiY + ' ạ.'); nhanSo(khoang, ten, tiep, goiY); } });
    (them || []).forEach(function (n) { ds.push(n); });
    MM.nut(ds);
    nhanSo(khoang, ten, tiep, goiY);
  }
  function nhanSo(khoang, ten, tiep, goiY) {
    MM.cho(function (text) {
      if (dienTuCau(text)) return true;
      var v = docSo(text);
      if (!isFinite(v) || v < khoang[0] || v > khoang[1]) {
        if (!/\d/.test(text)) return false; // không có số → câu hỏi khác, để AI trả lời
        MM.bot('Dạ số này em chưa hiểu. Anh/chị gõ số mét, ví dụ ' + goiY + ' giúp em nha.');
        nhanSo(khoang, ten, tiep, goiY);
        return true;
      }
      // khách gõ thay vì bấm nút: gỡ hàng nút còn treo của câu này
      var hang = document.querySelectorAll('#mymy-msgs .mm-nut-hang');
      if (hang.length) hang[hang.length - 1].closest('.mm-row').remove();
      dl[ten] = v;
      tiep();
      return true;
    }, 'Ví dụ ' + goiY + ' hoặc 5x20');
  }

  function batDauDienGiup(tuTrang) {
    ga('aln_mymy_dien_giup', { buoc: 'bat_dau' });
    dl = {};
    if (tuTrang) MM_moRoi(function () { hoiNgang(); });
    else hoiNgang();
  }
  function MM_moRoi(fn) { if (MM) { MM.mo(); fn(); } else { choMo = fn; nutMyMy(); } }
  var choMo = null;
  function nutMyMy() {
    if (typeof window.alnMyMyMo === 'function') { window.alnMyMyMo(false); return; }
    var b = $('mymy-btn'); if (b) b.click();
  }

  function hoiNgang(them) {
    hoiSo('Câu 1/5: Bề ngang lô đất (mặt tiền) bao nhiêu mét ạ?', '4,5', [4, 4.5, 5, 6, 8], NGANG_HOP_LE, 'ngang', hoiDai, them);
  }
  function hoiDai() {
    hoiSo('Câu 2/5: Chiều dài lô đất bao nhiêu mét ạ?', '18', [12, 15, 18, 20, 25], DAI_HOP_LE, 'dai', hoiTang);
  }
  function hoiTang() {
    MM.bot('Câu 3/5: Nhà định xây mấy tầng, tính cả tầng trệt ạ?');
    var ds = [
      { nhan: 'Chỉ tầng trệt', v: 1 }, { nhan: '1 trệt 1 lầu', v: 2 }, { nhan: '1 trệt 2 lầu', v: 3 },
      { nhan: '1 trệt 3 lầu', v: 4 }, { nhan: '1 trệt 4 lầu', v: 5 }, { nhan: '1 trệt 5 lầu', v: 6 },
    ].map(function (x) { return { nhan: x.nhan, lam: function () { dl.san = x.v; sauTang(); } }; });
    MM.nut(ds);
    MM.cho(function (text) {
      if (dienTuCau(text)) return true;
      var k = docCau(text);
      var v = k.san || docSo(text);
      if (!isFinite(v) || v < 1 || v > 9) {
        if (!/\d|trệt|lầu|tầng/i.test(text)) return false;
        MM.bot('Dạ anh/chị gõ giúp em kiểu "1 trệt 2 lầu" hoặc "3 tầng" nha.');
        hoiTangGo();
        return true;
      }
      var hang = document.querySelectorAll('#mymy-msgs .mm-nut-hang');
      if (hang.length) hang[hang.length - 1].closest('.mm-row').remove();
      dl.san = Math.round(v);
      sauTang();
      return true;
    }, 'Ví dụ: 1 trệt 2 lầu');
  }
  function hoiTangGo() {
    MM.cho(function (text) {
      var k = docCau(text); var v = k.san || docSo(text);
      if (!isFinite(v) || v < 1 || v > 9) { if (!/\d/.test(text)) return false; MM.bot('Dạ nhà từ 1 tới 9 sàn thôi ạ, anh/chị gõ lại giúp em.'); hoiTangGo(); return true; }
      dl.san = Math.round(v); sauTang(); return true;
    }, 'Ví dụ: 1 trệt 2 lầu');
  }
  function sauTang() {
    if (dl.san === 1) { dl.st = '0'; hoiThangMay(); return; } // nhà 1 tầng: không hỏi sân thượng
    MM.bot('Câu 4/5: Trên cùng có sân thượng không ạ?');
    MM.nut([
      { nhan: 'Có sân thượng', lam: function () { dl.st = '0.7'; hoiThangMay(); } },
      { nhan: 'Không, lợp mái', lam: function () { dl.st = '0'; hoiThangMay(); } },
      { nhan: 'Chưa biết', lam: function () { dl.st = '0.7'; hoiThangMay(); } },
    ]);
  }
  function hoiThangMay() {
    MM.bot('Câu 5/5: Nhà có thang máy hoặc tầng hầm không ạ?');
    MM.nut([
      { nhan: 'Không có', lam: function () { dl.tm = '0'; dl.ham = '0'; dienVaTinh(); } },
      { nhan: 'Có thang máy', lam: function () { dl.tm = '1'; dl.ham = '0'; dienVaTinh(); } },
      { nhan: 'Có tầng hầm', lam: function () { dl.tm = '0'; dl.ham = '1'; dienVaTinh(); } },
      { nhan: 'Có cả hai', lam: function () { dl.tm = '1'; dl.ham = '1'; dienVaTinh(); } },
    ]);
  }

  function moTaNha() {
    var s = 'lô ' + soDep(dl.ngang) + ' × ' + soDep(dl.dai) + ' m, ';
    s += dl.san === 1 ? 'nhà 1 tầng trệt' : '1 trệt ' + (dl.san - 1) + ' lầu (' + dl.san + ' sàn)';
    if (dl.san > 1) s += dl.st === '0' ? ', không sân thượng' : ', có sân thượng';
    if (dl.tm === '1') s += ', có thang máy';
    if (dl.ham === '1') s += ', có tầng hầm';
    return s;
  }

  function dienVaTinh() {
    if (typeof window.alnDuToanDienGiup !== 'function') {
      MM.bot('Dạ bảng tính chưa sẵn sàng, anh/chị tải lại trang giúp em nha.');
      return;
    }
    var gt = { w1: dl.ngang, w2: dl.ngang, l1: dl.dai, l2: dl.dai, n: dl.san };
    if (dl.st !== undefined) gt.st = dl.st;
    if (dl.tm !== undefined) gt.tm = dl.tm;
    if (dl.ham !== undefined) gt.ham = dl.ham;
    // 02/10/2026: bảng tính trên máy chủ — alnDuToanDienGiup trả Promise
    // (bản cũ trả thẳng object; Promise.resolve bọc cả hai cho an toàn).
    MM.bot('Dạ em đang tính, anh/chị chờ em vài giây ạ…');
    Promise.resolve(window.alnDuToanDienGiup(gt)).then(function (kq) {
      kq = kq || {};
      ga('aln_mymy_dien_giup', { buoc: 'xong', co_ket_qua: kq.tong ? 1 : 0 });
      docKetQuaDienGiup(kq);
    }, function () {
      ga('aln_mymy_dien_giup', { buoc: 'xong', co_ket_qua: 0 });
      docKetQuaDienGiup({ tong: 0, chan: 'chưa kết nối được máy chủ tính' });
    });
  }

  function docKetQuaDienGiup(kq) {
    if (!kq.tong) {
      MM.bot('Dạ em đã điền ' + moTaNha() + ', nhưng bảng chưa tính được: ' + (kq.chan || 'có ô cần sửa') + '\nAnh/chị bấm "Nhờ KTS xem giúp" để KTS tính trực tiếp cho mình nha.');
      MM.nut([
        { nhan: 'Nhờ KTS xem giúp', lam: function () { MM.dong(); chiFormKTS(); } },
        { nhan: 'Điền lại từ đầu', lam: function () { batDauDienGiup(false); } },
      ]);
      return;
    }
    MM.bot('Dạ em đã điền xong: ' + moTaNha() + '.\n'
      + 'Ước tính phần xây dựng khoảng **' + kq.tongChu + '** (giá nhà thầu nhận, chưa thuế GTGT)'
      + (kq.moiM2 && kq.moiM2 !== '—' ? ', tức khoảng ' + kq.moiM2 + ' đ/m² quy đổi' : '') + '.\n'
      + 'Đây là ước tính theo nhà mẫu cùng loại, chưa phải dự toán chính thức cho nhà anh/chị.'
      + (kq.ghiChu ? '\nLưu ý: ' + kq.ghiChu : ''));
    MM.bot('Anh/chị muốn làm gì tiếp ạ?');
    nutSauKetQua();
  }

  function nutSauKetQua() {
    MM.nut([
      { nhan: 'Nhờ KTS xem giúp (miễn phí)', lam: function () { MM.dong(); chiFormKTS(); } },
      { nhan: NUT_DE_LAI_SO, lam: moiDeLaiSo },
      { nhan: 'Xem bảng chi tiết', lam: function () { MM.dong(); chayBuoc(2); } },
      { nhan: 'Tính lại nhà khác', lam: function () { batDauDienGiup(false); } },
      { nhan: 'Hỏi MyMy điều khác', lam: hoiKhac },
    ]);
  }

  /* Nút "Để lại số cho KTS gọi" (Nam 02/10/2026: hiếm ai tự gõ số vào chat) — MyMy
     mời gõ số; câu có số đi qua xuLySdt như khi khách tự gõ (hỏi đồng ý, chưa lưu
     số khi chưa bấm). Gõ chữ không có số → nhắc 1 lần rồi thôi chờ, không kẹt khách. */
  var NUT_DE_LAI_SO = 'Để lại số cho KTS gọi';
  function moiDeLaiSo() {
    ga('aln_mymy_lead', { buoc: 'bam_de_lai_so' });
    if (leadMyMy.daGui) {
      MM.bot('Dạ em đã gửi yêu cầu rồi ạ, KTS Trần Long sẽ gọi số anh/chị đã đồng ý trước đó.');
      return;
    }
    MM.bot('Dạ anh/chị gõ số điện thoại vào ô bên dưới giúp em nhé.');
    MM.cho(function (text) {
      if (moiDongYNeuCoSdt(text)) return true;
      MM.bot('Dạ em chưa thấy số điện thoại trong tin nhắn. Anh/chị gõ lại số giúp em (VD: 0909 123 456) nhé.');
      return true;
    }, 'Số điện thoại, VD: 0909 123 456');
  }

  function hoiKhac() {
    MM.boCho();
    MM.hienNutChung();
    MM.bot('Dạ anh/chị cứ gõ câu hỏi vào ô bên dưới, em trả lời ngay ạ.');
  }

  function menuChinh() {
    MM.nut([
      { nhan: 'Điền giúp tôi', lam: function () { batDauDienGiup(false); } },
      { nhan: 'Chỉ tôi từng bước', lam: function () { MM.dong(); chayBuoc(0); } },
      { nhan: 'Nhờ KTS xem giúp', lam: function () { MM.dong(); chiFormKTS(); } },
      { nhan: NUT_DE_LAI_SO, lam: moiDeLaiSo },
      { nhan: 'Hỏi điều khác', lam: hoiKhac },
    ]);
  }

  /* ── SĐT trong chat → lead L0 khi khách bấm đồng ý (Nam chốt 02/10/2026) ──
     CHƯA ĐỒNG Ý THÌ CHƯA LƯU SỐ (Nam chốt 02/10/2026 (4)): trang đặt xuLySdt nên
     widget KHÔNG tự ghi contacts. Số chỉ nằm trong bộ nhớ của khung chat đang mở
     (không localStorage/sessionStorage); lịch sử gửi AI thay số bằng "[số điện
     thoại]". "Để sau"/không bấm → không contacts, không Telegram, chỉ GA4
     aln_mymy_de_sau (không kèm số). Bấm nút → trang gọi submitDuToanLead
     (window.alnDuToanGuiLeadMyMy, du-toan-nha.html) — cùng đường ghi lead + contacts,
     kiểm SĐT, lead test, CAPI như form.
     Câu đồng ý phía trên nút = ĐÚNG câu pháp lý của form (CONSENT_TEXTS.du_toan,
     đọc từ consent-constants.js — bản sao của functions/consent_constants.js, test
     functions/_test_tuVanPhanTho.js kiểm 2 bản giống nhau). Không có câu riêng cho chat. */
  var CAU_DONG_Y = 'Đồng ý để KTS Trần Long liên hệ'; // chữ trên nút (hành động), không phải câu pháp lý
  var CAU_DE_SAU = 'Dạ, khi nào cần KTS xem giúp thì anh/chị bấm nút này nhé.';
  var BUOI = [
    { ma: 'sang', nhan: 'Sáng (8–11h)' }, { ma: 'trua', nhan: 'Trưa (11–14h)' },
    { ma: 'chieu', nhan: 'Chiều (14–17h)' }, { ma: 'toi', nhan: 'Tối (18–20h)' },
  ];
  // dongY: '' = chưa có số trong chat; 'chua' = đã gõ số, chưa bấm đồng ý (kể cả "Để sau");
  // 'da' = đã bấm và lead đã gửi. Gửi kèm nguCanh để AI biết có được nói KTS sẽ gọi hay không.
  var leadMyMy = { daGui: false, dangGui: false, dongY: '' };

  // Câu pháp lý: nạp sẵn từ consent-constants.js; không nạp được thì lấy đúng câu
  // đang hiện ở form trên trang (#tvDongYText — test kiểm giống hệt CONSENT_TEXTS.du_toan).
  var cauPhapLy = '';
  var napCauPhapLy = (function () {
    var p;
    try { p = import('./consent-constants.js'); } catch (e) { p = Promise.reject(e); }
    return p.then(function (m) {
      cauPhapLy = (m && m.CONSENT_TEXTS && m.CONSENT_TEXTS.du_toan) || '';
    }).catch(function () {}).then(function () {
      if (!cauPhapLy) {
        var el = document.getElementById('tvDongYText');
        cauPhapLy = el ? String(el.textContent || '').trim() : '';
      }
      return cauPhapLy;
    });
  })();

  function ghiChuDongY() {
    return cauPhapLy + ' Chính sách bảo mật: applamnha.vn/privacy.html';
  }

  // Tên khách tự xưng trong cùng câu ("tên Hoa 0909…", "tôi là Nguyễn Văn A") — không có thì để trống.
  function docTen(text) {
    var m = /(?:tên(?:\s+(?:tôi|em|mình|con))?(?:\s+là)?|tôi\s+là|em\s+là|mình\s+là|anh\s+là|chị\s+là)\s+([^\d,.;:!?\n]{2,40})/i.exec(String(text || ''));
    if (!m) return '';
    var ten = m[1].replace(/\s+(số|sđt|sdt|điện thoại|dt|đt)\b.*$/i, '').trim();
    return (ten.match(/\p{L}/gu) || []).length >= 2 ? ten.slice(0, 40) : '';
  }

  // Nút đồng ý (+ "Để sau" khi deSau) kèm câu pháp lý phía trên. Thiếu câu pháp lý
  // thì KHÔNG hiện nút đồng ý — chỉ mời dùng form có đủ câu đồng ý.
  function hienNutDongY(sdt, ten, coDeSau) {
    napCauPhapLy.then(function () {
      if (leadMyMy.daGui) return;
      if (!cauPhapLy) {
        MM.bot('Dạ anh/chị bấm "Nhờ KTS xem giúp dự toán này" ở cuối bảng để gửi yêu cầu nhé.');
        return;
      }
      var ds = [{ nhan: CAU_DONG_Y, lam: function () { guiLeadMyMy(sdt, ten); } }];
      if (coDeSau) ds.push({ nhan: 'Để sau', lam: function () {
        ga('aln_mymy_de_sau', {}); // không kèm số
        MM.bot(CAU_DE_SAU);
        MM.ghiLichSu('assistant', CAU_DE_SAU + ' (Khách CHƯA đồng ý để KTS liên hệ — không nói KTS sẽ gọi, không xin số lại.)');
        hienNutDongY(sdt, ten, false); // nút đồng ý vẫn bấm lại được trong phiên
      } });
      MM.nut(ds, ghiChuDongY());
    });
  }

  // Thay mọi số điện thoại trong câu bằng "[số điện thoại]" trước khi đưa vào lịch sử gửi AI.
  function anSdt(text) {
    return String(text || '').replace(/(?:\+?84|0)[\d\s.\-]{7,13}\d/g, '[số điện thoại]');
  }

  // Câu khách gõ có SĐT (widget gọi qua xuLySdt TRƯỚC khi ghi bất cứ đâu). Luôn trả
  // true khi có số — số không bao giờ đi tiếp sang AI hay contacts từ đây.
  function moiDongYNeuCoSdt(text) {
    if (!MM || typeof MM.laySdt !== 'function') return false;
    var sdt = MM.laySdt(text);
    if (!sdt) return false;
    MM.ghiLichSu('user', anSdt(text));
    if (leadMyMy.daGui) {
      MM.bot('Dạ em đã gửi yêu cầu rồi ạ, KTS Trần Long sẽ gọi số anh/chị đã đồng ý trước đó. Muốn đổi số thì anh/chị nhắn Zalo 0909 829 696 giúp em nhé.');
      return true;
    }
    if (typeof window.alnDuToanGuiLeadMyMy !== 'function') {
      MM.bot('Dạ anh/chị bấm "Nhờ KTS xem giúp dự toán này" ở cuối bảng để gửi yêu cầu nhé.');
      return true;
    }
    var ten = docTen(text);
    leadMyMy.dongY = 'chua';
    ga('aln_mymy_lead', { buoc: 'moi_dong_y' });
    MM.bot('Dạ, nếu anh/chị muốn KTS Trần Long liên hệ số …' + sdt.slice(-4) + ' thì bấm nút đồng ý dưới đây nhé. Chưa bấm thì ALN chưa lưu số này.');
    hienNutDongY(sdt, ten, true);
    return true;
  }

  function guiLeadMyMy(sdt, ten) {
    if (leadMyMy.daGui || leadMyMy.dangGui) return;
    leadMyMy.dangGui = true;
    ga('aln_mymy_lead', { buoc: 'dong_y' });
    window.alnDuToanGuiLeadMyMy({ phone: sdt, name: ten, dongY: true }).then(function (kq) {
      leadMyMy.dangGui = false;
      if (!kq || !kq.id) throw new Error('khong_co_ma_lead');
      leadMyMy.daGui = true;
      leadMyMy.dongY = 'da';
      ga('aln_mymy_lead', { buoc: 'da_gui', trung: kq.dup ? 1 : 0 });
      var cam = 'Dạ em cảm ơn anh/chị. KTS Trần Long sẽ gọi anh/chị trong 1–2 ngày làm việc, vào buổi anh/chị chọn ạ.';
      MM.bot(cam);
      MM.ghiLichSu('assistant', cam + ' (Khách đã để số và bấm đồng ý — không xin liên hệ nữa.)');
      MM.nut(BUOI.map(function (b) {
        return { nhan: b.nhan, lam: function () {
          ga('aln_mymy_lead', { buoc: 'chon_buoi', buoi: b.ma });
          // Buổi tiện nghe ghi thêm 1 lần chạm qua upsertContact có sẵn — không đường ghi mới.
          MM.ghiLienHe(sdt, 'MyMy — buổi tiện nghe máy: ' + b.nhan, 'mymy_du_toan');
          MM.bot('Dạ em đã ghi buổi ' + b.nhan.toLowerCase() + ' ạ.');
        } };
      }).concat([{ nhan: 'Lúc nào cũng được', lam: function () {
        ga('aln_mymy_lead', { buoc: 'chon_buoi', buoi: 'bat_ky' });
        MM.ghiLienHe(sdt, 'MyMy — buổi tiện nghe máy: lúc nào cũng được', 'mymy_du_toan');
        MM.bot('Dạ em đã ghi ạ.');
      } }]));
    }).catch(function (err) {
      leadMyMy.dangGui = false;
      var code = (err && err.code) || '';
      ga('aln_mymy_lead', { buoc: 'loi', ma_loi: String(code || 'khong_ro').slice(0, 60) });
      if (/invalid-argument/.test(code) && err.message) {
        MM.bot('Dạ ' + err.message);
        hienNutDongY(sdt, ten, false); // không để khách kẹt: vẫn bấm lại được
      } else {
        if (window.alnBaoLoiNeuCan) window.alnBaoLoiNeuCan('du-toan-nha mymy-lead', err);
        MM.bot('Dạ em chưa gửi được, anh/chị bấm lại giúp em nhé.');
        hienNutDongY(sdt, ten, false);
      }
    });
  }

  window.ALN_MYMY_TRANG = {
    loiMoi: 'Không rành điền bảng? Em điền giúp anh/chị ạ.', // ngắn như câu mời chung — bóng chat dài dễ đè ô nhập

    moDau: function (api) {
      MM = api;
      ga('aln_mymy_huong_dan', { buoc: 'mo' });
      // Lời chào ngắn (2 dòng) để lời chào + câu hỏi + nút vừa khung chat, không bị cuộn mất.
      // Gợi ý gõ tự do "5x20, 1 trệt 2 lầu" nằm ở ô nhập, không chiếm chỗ lời chào.
      api.bot('Dạ em chào anh/chị, em là MyMy của ALN. Em **điền giúp bảng dự toán** nhé!');
      if (choMo) { var f = choMo; choMo = null; f(); } // mở từ nút trên trang: vào thẳng câu hỏi
      else menuChinh();
      api.hienTuDau();
    },

    // Câu có SĐT → mời bấm đồng ý (lead L0 như form). Câu gõ tự do có kích
    // thước → điền luôn; thiếu gì thì hỏi tiếp phần thiếu.
    xuLyTin: function (text, api) {
      MM = api;
      if (moiDongYNeuCoSdt(text)) return true;
      return dienTuCau(text);
    },

    // Widget gọi hàm này cho câu có SĐT, TRƯỚC khi ghi contacts — trang tự hỏi đồng ý.
    xuLySdt: function (text, api) {
      MM = api;
      return moiDongYNeuCoSdt(text);
    },

    // Ngữ cảnh gửi kèm mỗi câu hỏi AI (02/10/2026): số lần tính + 2 phương án gần
    // nhất (du-toan-nha.html ghi window.alnDuToanLanTinh). Máy chủ lọc lại và tự
    // quyết lúc nào được xin liên hệ (functions/lib/mymyPrompt.js khoiDuToanNha) —
    // nên widget KHÔNG tự chen câu xin SĐT trên trang này.
    nguCanh: function () {
      var v = window.alnDuToanLanTinh || {};
      var pa = Array.isArray(v.pa) ? v.pa : [];
      return { trang: 'du-toan-nha', so_lan_tinh: Number(v.so) || 0, pa_1: pa[0] || '', pa_2: pa[1] || '', dong_y_lien_he: leadMyMy.dongY };
    },
  };

  // Câu có đủ ngang × dài → điền luôn (dùng cả khi MyMy đang chờ 1 con số:
  // khách gõ trọn "4m5 x 18, 1 trệt 2 lầu" thì câu đầy đủ thắng).
  function dienTuCau(text) {
    var api = MM;
    var k = docCau(text);
    var coKichThuoc = isFinite(k.ngang) && isFinite(k.dai)
      && k.ngang >= NGANG_HOP_LE[0] && k.ngang <= NGANG_HOP_LE[1]
      && k.dai >= DAI_HOP_LE[0] && k.dai <= DAI_HOP_LE[1];
    if (!coKichThuoc) return false;
    ga('aln_mymy_dien_giup', { buoc: 'go_tu_do' });
    var hang = document.querySelectorAll('#mymy-msgs .mm-nut-hang');
    for (var i = 0; i < hang.length; i++) hang[i].closest('.mm-row').remove();
    dl = { ngang: k.ngang, dai: k.dai };
    if (k.san >= 1 && k.san <= 9) {
      dl.san = k.san;
      if (k.st !== undefined) dl.st = k.st;
      else if (dl.san === 1) dl.st = '0';
      api.bot('Dạ em ghi nhận ' + moTaNha().replace(/, không sân thượng|, có sân thượng/, '') + '.');
      if (dl.st === undefined) sauTang(); else hoiThangMay();
    } else {
      api.bot('Dạ em ghi nhận lô ' + soDep(k.ngang) + ' × ' + soDep(k.dai) + ' m.');
      hoiTang();
    }
    return true;
  }

  /* ── MyMy tự chào và hỏi luôn (Nam 30/09/2026: "MyMy nên chào và chủ động hỏi
        để điền thông tin cho khách") ──
     Sau TU_CHAO_SAU_MS, nếu khách chưa gõ ô nào, không đang ở trong ô nhập và
     chưa mở chat → mở khung chat, chào, hỏi ngay câu 1/5, kèm nút "Để lại số cho KTS gọi"
     và "Để tôi tự điền".
     1 lần mỗi phiên trình duyệt (bấm "tự điền" hay × cũng không hỏi lại trong phiên).
     Chỉ chạy khi widget đúng bản có window.alnMyMyMo — bản cũ còn trong bộ nhớ
     đệm thì bỏ qua, không mở lời chào cũ. Không tính là khách mở chat (GA4). */
  var TU_CHAO_SAU_MS = 5000;
  var KEY_TU_CHAO = 'aln_mymy_dt_tu_chao';
  function daTuChaoPhienNay() { try { return sessionStorage.getItem(KEY_TU_CHAO) === '1'; } catch (e) { return false; } }
  function ghiDaTuChao() { try { sessionStorage.setItem(KEY_TU_CHAO, '1'); } catch (e) { /* bỏ qua */ } }
  function tuDienThoi() {
    MM.boCho();
    var hang = document.querySelectorAll('#mymy-msgs .mm-nut-hang');
    for (var i = 0; i < hang.length; i++) hang[i].closest('.mm-row').remove();
    ga('aln_mymy_huong_dan', { buoc: 'tu_chao_tu_dien' });
    MM.bot('Dạ, anh/chị cứ điền ạ. Cần giúp thì bấm nút MyMy ở góc dưới, em hỗ trợ ngay.');
    setTimeout(function () { MM.dong(); }, 1600);
  }
  setTimeout(function () {
    if (daTuChaoPhienNay() || MM || daGo) return;
    if (typeof window.alnMyMyMo !== 'function') return;
    var win = $('mymy-win');
    if (!win || win.classList.contains('open')) return;
    var dang = document.activeElement;
    if (dang && /^(INPUT|SELECT|TEXTAREA)$/.test(dang.tagName)) return; // đang tự điền
    ghiDaTuChao();
    ga('aln_mymy_huong_dan', { buoc: 'tu_chao' });
    dl = {};
    // Nam 02/10/2026: đa số khách chỉ thấy luồng tự chào này → để sẵn nút để lại số.
    choMo = function () {
      hoiNgang([
        { nhan: NUT_DE_LAI_SO, lam: moiDeLaiSo },
        { nhan: 'Để tôi tự điền', lam: tuDienThoi, khongNhacLai: false },
      ]);
    };
    window.alnMyMyMo(true);
  }, TU_CHAO_SAU_MS);

  /* ── Dấu hiệu sống trên trang (không phụ thuộc bóng chat mời — góc dưới
        phải trang này luôn có nút/ô nhập nên bóng chat mời thường không hiện) ──
     1. Gõ sai kích thước (ô báo lỗi) → MyMy hiện ngay dưới bảng, mời điền giúp.
        Tối đa 1 lần mỗi lượt xem trang.
     2. Đứng yên 40 giây, chưa gõ gì, chưa mở chat → dải "Để MyMy điền giúp"
        nhấp nháy 3 lần (chỉ khi đang nằm trong màn hình). */
  var daMoiKhiLoi = false, daNhayMoi = false, daGo = false;
  var O_KICH_THUOC = ['w1', 'w2', 'l1', 'l2', 'sant', 'bc', 'mong'];
  var henLoi = null;
  function kiemLoiKichThuoc() {
    if (daMoiKhiLoi) return;
    var sai = null;
    for (var i = 0; i < O_KICH_THUOC.length; i++) {
      var err = $(O_KICH_THUOC[i] + 'Err');
      if (err && !err.hidden) { sai = $(O_KICH_THUOC[i]); break; }
    }
    if (!sai) return;
    var win = $('mymy-win');
    if (win && win.classList.contains('open')) return; // đang chat với MyMy rồi
    daMoiKhiLoi = true;
    ga('aln_mymy_huong_dan', { buoc: 'moi_khi_go_sai' });
    chiVao(sai, sai.closest('.grid'), false, [
      'Ô này cần gõ số mét, ví dụ 5 hoặc 4,5.',
      'Anh/chị không rành thì để em điền giúp — chỉ cần trả lời vài câu ạ.',
    ], [
      { nhan: 'Để MyMy điền giúp', lam: function () { goChi(); batDauDienGiup(true); } },
      { nhan: 'Tôi tự sửa', phu: true, lam: function () { goChi(); sai.focus(); } },
    ]);
  }
  O_KICH_THUOC.forEach(function (id) {
    var o = $(id);
    if (!o) return;
    o.addEventListener('input', function (e) {
      if (!e.isTrusted) return; // MyMy tự điền thì không tính
      daGo = true;
      clearTimeout(henLoi);
      henLoi = setTimeout(kiemLoiKichThuoc, 1500); // chờ khách gõ xong
    });
  });
  setTimeout(function () {
    if (daGo || daNhayMoi) return;
    var win = $('mymy-win');
    if (win && win.classList.contains('open')) return;
    var dai = document.querySelector('.mm-moi');
    if (!dai || dai.style.display === 'none') return;
    var r = dai.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= window.innerHeight) return;
    daNhayMoi = true;
    dai.classList.add('mm-chi');
    setTimeout(function () { dai.classList.remove('mm-chi'); }, 3600);
  }, 40000);

  // Trang cho nút bấm ngoài khung chat gọi MyMy: data-mymy-dien-giup
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-mymy-dien-giup]') : null;
    if (!el) return;
    e.preventDefault();
    batDauDienGiup(true);
  });
})();
