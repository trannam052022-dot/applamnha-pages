/* ═══════════════════════════════════════════════════════════════
   Phòng Dự toán trong Văn phòng ALN — khách ngồi bàn, chủ phòng nói chuyện (09/11/2026)

   Nam 09/11/2026: "khách đến phòng ngồi vào ghế để làm việc thì chủ phòng nói chuyện và trả
   kết quả, giống 2 người nói chuyện thật thay vì sổ ra cả trang phải điền… chủ phòng chốt luôn".
   Phòng thử đầu tiên: Dự toán. Chủ phòng tạm là MyMy. Chốt theo thứ tự Nam chọn:
   (1) để lại số + bấm đồng ý cho KTS gọi → (2) chọn buổi tiện nghe máy → (3) lưu vào Không gian Nhà.
   Cách nói: câu soạn sẵn + nút bấm (5 câu hỏi); khách tự gõ câu hỏi thì đi alnChat như MyMy.

   KHÔNG tính số ở đây: một khung ẩn mở du-toan-nha.html (cùng nguồn) và dùng chính các hàm của
   trang đó — alnDuToanDienGiup (tính trên máy chủ), alnDuToanGuiLeadMyMy (submitDuToanLead kênh
   mymy, cùng kiểm SĐT/lead test/đồng ý như MyMy trên trang dự toán). Số đã tính lưu ở localStorage
   của trang dự toán, nên bước "Lưu vào Không gian Nhà" mở trang đầy đủ với đúng số đó rồi mở hộp lưu.
   Câu chữ dùng lại câu đã có ở mymy-du-toan-nha.js; câu đồng ý = CONSENT_TEXTS.du_toan.
   Chữ vào khung chat chỉ qua API của widget (không innerHTML).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function ga(buoc, them) {
    try { var d = { event: 'aln_vp_phong', phong: 'dt', buoc: buoc }; for (var k in them || {}) d[k] = them[k]; (window.dataLayer = window.dataLayer || []).push(d); } catch (e) { /* bỏ qua */ }
  }
  var MM = null, mo = false, dl = {}, kqCuoi = null;
  var lead = { daGui: false, zalo: false, dangGui: false, dongY: '', sdt: '', buoi: '' };
  var VP = function () { return window.ALNVanPhong || {}; };

  /* ── khung ẩn chạy trang dự toán ── */
  var khung = null, hua = null;
  function trangDuToan() {
    if (hua) return hua;
    khung = document.createElement('iframe');
    khung.title = 'Bảng tính dự toán (chạy ngầm)'; khung.setAttribute('aria-hidden', 'true'); khung.tabIndex = -1;
    khung.style.cssText = 'position:fixed;left:-10000px;top:0;width:420px;height:900px;border:0;opacity:0;pointer-events:none';
    khung.src = '/du-toan-nha.html?vp=1';
    document.body.appendChild(khung);
    hua = new Promise(function (res, rej) {
      var bd = Date.now();
      (function cho() {
        var w = null; try { w = khung.contentWindow; } catch (e) { w = null; }
        if (w && typeof w.alnDuToanDienGiup === 'function' && typeof w.alnDuToanGuiLeadMyMy === 'function') {
          Promise.resolve(w.alnDuToanCho ? w.alnDuToanCho() : null).catch(function () {}).then(function () { res(w); });
          return;
        }
        if (Date.now() - bd > 30000) { hua = null; if (khung) khung.remove(); khung = null; rej(new Error('khong_mo_duoc_bang_tinh')); return; }
        setTimeout(cho, 250);
      })();
    });
    return hua;
  }

  /* ── đọc số, đọc câu (như mymy-du-toan-nha.js) ── */
  function docSo(text) {
    var t = String(text || '').toLowerCase().replace(/mét|met/g, 'm');
    var m = /(\d+)\s*m\s*(\d{1,2})(?!\d)/.exec(t); if (m) return Number(m[1] + '.' + m[2]);
    m = /(\d+(?:[.,]\d+)?)/.exec(t); return m ? Number(m[1].replace(',', '.')) : NaN;
  }
  function soDep(x) { return String(Math.round(x * 100) / 100).replace('.', ','); }
  function docCau(text) {
    var t = String(text || '').toLowerCase().replace(/(\d)m(\d)/g, '$1.$2').replace(/,/g, '.'), kq = {};
    var m = /(\d+(?:\.\d+)?)\s*m?\s*[x×*]\s*(\d+(?:\.\d+)?)/.exec(t);
    if (m) { kq.ngang = Number(m[1]); kq.dai = Number(m[2]); }
    var lau = /(\d+)\s*(?:lầu|lau)/.exec(t), tang = /(\d+)\s*(?:tầng|tang|sàn|san)(?!\s*thượng|\s*thuong)/.exec(t), lung = /lửng|lung/.test(t) ? 1 : 0;
    if (lau) kq.san = Number(lau[1]) + 1 + lung; else if (tang) kq.san = Number(tang[1]);
    else if (/chỉ\s*(?:có\s*)?(?:tầng\s*)?trệt|nhà cấp 4|cấp bốn/.test(t)) kq.san = 1;
    if (/không\s*(?:có\s*)?sân thượng|ko\s*sân thượng/.test(t)) kq.st = '0'; else if (/sân thượng/.test(t)) kq.st = '0.7';
    return kq;
  }
  var NGANG = [2, 30], DAI = [3, 100];
  function goNutTreo() { var h = document.querySelectorAll('#mymy-msgs .mm-nut-hang'); for (var i = 0; i < h.length; i++) { var r = h[i].closest('.mm-row'); if (r) r.remove(); } }

  /* ── 5 câu hỏi ── */
  function hoiSo(cau, goiY, cacNut, khoang, ten, tiep) {
    MM.bot(cau);
    MM.nut(cacNut.map(function (v) { return { nhan: soDep(v) + ' m', lam: function () { dl[ten] = v; tiep(); } }; })
      .concat([{ nhan: 'Số khác', lam: function () { MM.bot('Dạ anh/chị gõ số mét vào ô bên dưới giúp em, ví dụ ' + goiY + ' ạ.'); } }]));
    nhanSo(khoang, ten, tiep, goiY);
  }
  function nhanSo(khoang, ten, tiep, goiY) {
    MM.cho(function (text) {
      if (dienTuCau(text)) return true;
      var v = docSo(text);
      if (!isFinite(v) || v < khoang[0] || v > khoang[1]) {
        if (!/\d/.test(text)) return false;
        MM.bot('Dạ số này em chưa hiểu. Anh/chị gõ số mét, ví dụ ' + goiY + ' giúp em nha.'); nhanSo(khoang, ten, tiep, goiY); return true;
      }
      goNutTreo(); dl[ten] = v; tiep(); return true;
    }, 'Ví dụ ' + goiY + ' hoặc 5x20');
  }
  function hoiNgang() { hoiSo('Câu 1/5: Bề ngang lô đất (mặt tiền) bao nhiêu mét ạ?', '4,5', [4, 4.5, 5, 6, 8], NGANG, 'ngang', hoiDai); }
  function hoiDai() { hoiSo('Câu 2/5: Chiều dài lô đất bao nhiêu mét ạ?', '18', [12, 15, 18, 20, 25], DAI, 'dai', hoiTang); }
  function hoiTang() {
    MM.bot('Câu 3/5: Nhà định xây mấy tầng, tính cả tầng trệt ạ?');
    MM.nut([['Chỉ tầng trệt', 1], ['1 trệt 1 lầu', 2], ['1 trệt 2 lầu', 3], ['1 trệt 3 lầu', 4], ['1 trệt 4 lầu', 5], ['1 trệt 5 lầu', 6]]
      .map(function (x) { return { nhan: x[0], lam: function () { dl.san = x[1]; sauTang(); } }; }));
    MM.cho(function (text) {
      if (dienTuCau(text)) return true;
      var k = docCau(text), v = k.san || docSo(text);
      if (!isFinite(v) || v < 1 || v > 9) { if (!/\d|trệt|lầu|tầng/i.test(text)) return false; MM.bot('Dạ anh/chị gõ giúp em kiểu "1 trệt 2 lầu" hoặc "3 tầng" nha.'); hoiTang(); return true; }
      goNutTreo(); dl.san = Math.round(v); sauTang(); return true;
    }, 'Ví dụ: 1 trệt 2 lầu');
  }
  function sauTang() {
    if (dl.san === 1) { dl.st = '0'; hoiThangMay(); return; }
    MM.bot('Câu 4/5: Trên cùng có sân thượng không ạ?');
    MM.nut([
      { nhan: 'Có sân thượng', lam: function () { dl.st = '0.7'; hoiThangMay(); } },
      { nhan: 'Không, lợp mái', lam: function () { dl.st = '0'; hoiThangMay(); } },
      { nhan: 'Chưa biết', lam: function () { dl.st = '0.7'; hoiThangMay(); } },
    ]);
  }
  function hoiThangMay() {
    MM.bot('Câu 5/5: Nhà có thang máy hoặc tầng hầm không ạ?');
    MM.nut([['Không có', '0', '0'], ['Có thang máy', '1', '0'], ['Có tầng hầm', '0', '1'], ['Có cả hai', '1', '1']]
      .map(function (x) { return { nhan: x[0], lam: function () { dl.tm = x[1]; dl.ham = x[2]; tinh(); } }; }));
  }
  function dienTuCau(text) {
    var k = docCau(text);
    if (!(k.ngang >= NGANG[0] && k.ngang <= NGANG[1] && k.dai >= DAI[0] && k.dai <= DAI[1])) return false;
    goNutTreo(); ga('go_tu_do');
    dl = { ngang: k.ngang, dai: k.dai };
    if (k.san >= 1 && k.san <= 9) {
      dl.san = k.san; if (k.st !== undefined) dl.st = k.st; else if (dl.san === 1) dl.st = '0';
      MM.bot('Dạ em ghi nhận ' + moTaNha().replace(/, không sân thượng|, có sân thượng/, '') + '.');
      if (dl.st === undefined) sauTang(); else hoiThangMay();
    } else { MM.bot('Dạ em ghi nhận lô ' + soDep(k.ngang) + ' × ' + soDep(k.dai) + ' m.'); hoiTang(); }
    return true;
  }
  function moTaNha() {
    var s = 'lô ' + soDep(dl.ngang) + ' × ' + soDep(dl.dai) + ' m, ';
    s += dl.san === 1 ? 'nhà 1 tầng trệt' : '1 trệt ' + (dl.san - 1) + ' lầu (' + dl.san + ' sàn)';
    if (dl.san > 1 && dl.st !== undefined) s += dl.st === '0' ? ', không sân thượng' : ', có sân thượng';
    if (dl.tm === '1') s += ', có thang máy';
    if (dl.ham === '1') s += ', có tầng hầm';
    return s;
  }

  /* ── tính bằng trang dự toán chạy ngầm ── */
  function tinh() {
    MM.bot('Dạ em đang tính, anh/chị chờ em vài giây ạ…');
    if (VP().chuPhongNoi) VP().chuPhongNoi('Để em tính cho anh/chị nhé…', 0);
    var gt = { w1: dl.ngang, w2: dl.ngang, l1: dl.dai, l2: dl.dai, n: dl.san };
    if (dl.st !== undefined) gt.st = dl.st; if (dl.tm !== undefined) gt.tm = dl.tm; if (dl.ham !== undefined) gt.ham = dl.ham;
    trangDuToan().then(function (w) { return w.alnDuToanDienGiup(gt); }).then(function (kq) {
      kq = kq || {}; kqCuoi = kq; ga('ket_qua', { co_ket_qua: kq.tong ? 1 : 0 });
      docKetQua(kq);
    }, function (e) {
      ga('ket_qua', { co_ket_qua: 0 });
      console.error('Phòng Dự toán:', e);
      docKetQua({ tong: 0, chan: 'chưa kết nối được máy chủ tính' });
    });
  }
  /* Cách chủ phòng chốt (Nam 09/11/2026, áp cho mọi chủ phòng về sau): báo miệng con số → mời nhận
     BẢNG CHI TIẾT qua Zalo (cần số + bấm đồng ý) → chưa muốn để số thì đưa BẢNG SƠ BỘ ngay trong chat
     (từng phần lớn, đúng như trang công khai) → giữ chân: đặt giờ KTS gọi, lưu Không gian Nhà, các phòng khác. */
  function docKetQua(kq) {
    if (!kq.tong) {
      MM.bot('Dạ em đã ghi ' + moTaNha() + ', nhưng bảng chưa tính được: ' + (kq.chan || 'có ô cần sửa') + '\nAnh/chị để lại số, KTS Trần Long tính trực tiếp cho mình nha.');
      MM.nut([{ nhan: 'Để lại số cho KTS gọi', lam: function () { moiSo('goi'); } }, { nhan: 'Tính lại từ đầu', lam: batDauHoi }]);
      return;
    }
    if (VP().chuPhongNoi) VP().chuPhongNoi('Nhà anh/chị khoảng ' + kq.tongChu + ' ạ.', 1);
    MM.bot('Dạ nhà anh/chị (' + moTaNha() + '):\n'
      + 'Ước tính phần xây dựng khoảng **' + kq.tongChu + '** (giá nhà thầu nhận, chưa thuế GTGT)'
      + (kq.moiM2 && kq.moiM2 !== '—' ? ', tức khoảng ' + kq.moiM2 + ' đ/m² quy đổi' : '') + '.\n'
      + 'Đây là ước tính theo nhà mẫu cùng loại, chưa phải dự toán chính thức cho nhà anh/chị.'
      + (kq.ghiChu ? '\nLưu ý: ' + kq.ghiChu : ''));
    moiBang();
  }
  function moiBang() {
    if (lead.zalo) { MM.bot('Dạ bảng chi tiết em đã chuyển để gửi qua Zalo số …' + lead.sdt.slice(-4) + ' rồi ạ.'); giuChan(); return; }
    MM.bot('Bảng dự toán chi tiết từng hạng mục (khối lượng, đơn giá, thành tiền) em gửi qua Zalo cho anh/chị. Anh/chị cho em số Zalo nhé. Chưa tiện thì em gửi bảng sơ bộ ngay đây ạ.');
    MM.nut([
      { nhan: 'Nhận bảng chi tiết qua Zalo', lam: function () { moiSo('zalo'); } },
      { nhan: 'Xem bảng sơ bộ ngay', lam: bangSoBo },
      { nhan: 'Tính lại nhà khác', lam: batDauHoi },
    ]);
  }
  // bảng sơ bộ = các phần lớn (dòng tổng) đúng như trang dự toán công khai, không có hạng mục chi tiết
  function fmtD(v) { return Math.round(Number(v) || 0).toLocaleString('vi-VN') + ' đ'; }
  function bangSoBo() {
    ga('so_bo');
    var r = null; try { var e = khung && khung.contentWindow && khung.contentWindow.__lastEstimate; r = e && e.result; } catch (x) { r = null; }
    var nhom = (r && (r.lines || [])) || [], ht = (r && (r.lineHoanThien || [])) || [];
    if (!nhom.length) { MM.bot('Dạ em chưa lấy được bảng sơ bộ, anh/chị để em gửi bảng chi tiết qua Zalo nhé.'); MM.nut([{ nhan: 'Nhận bảng chi tiết qua Zalo', lam: function () { moiSo('zalo'); } }]); return; }
    var dong = nhom.filter(function (x) { return Number(x.v) > 0; }).map(function (x) { return x.n + ': ' + fmtD(x.v); });
    var tongHt = ht.reduce(function (a, x) { return a + (Number(x.v) || 0); }, 0);
    MM.bot('**Bảng dự toán sơ bộ** — ' + moTaNha() + '\n' + dong.join('\n')
      + '\n**Cộng phần xây dựng: ' + (kqCuoi ? kqCuoi.tongChu : '') + '** (chưa thuế GTGT)'
      + (tongHt > 0 ? '\nPhần chủ nhà tự mua (gạch ốp lát, thiết bị vệ sinh, cửa…): khoảng ' + fmtD(tongHt) + ', tính riêng.' : ''));
    MM.bot('Bảng sơ bộ chỉ có từng phần lớn. Muốn xem từng hạng mục với khối lượng và đơn giá thì em gửi bảng chi tiết qua Zalo cho anh/chị ạ.');
    MM.nut([
      { nhan: 'Nhận bảng chi tiết qua Zalo', lam: function () { moiSo('zalo'); } },
      { nhan: 'Lưu vào Không gian Nhà', lam: luuKhongGianNha },
      { nhan: 'Tôi muốn hỏi thêm', lam: function () { MM.boCho(); MM.bot('Dạ anh/chị gõ câu hỏi bên dưới, em trả lời ngay ạ.'); } },
    ]);
  }
  // giữ chân sau khi đã nhận yêu cầu: các việc tiếp theo trong văn phòng
  function giuChan() {
    MM.bot('Trong lúc chờ, anh/chị có thể làm tiếp mấy việc này ngay trong văn phòng ạ:');
    var ds = [];
    if (!lead.buoi) ds.push({ nhan: 'Hẹn giờ KTS gọi tư vấn', lam: function () { if (lead.sdt) { MM.bot('Dạ anh/chị tiện nghe máy buổi nào ạ?'); chonBuoi(lead.sdt); } else moiSo('goi'); } });
    ds.push({ nhan: 'Lưu vào Không gian Nhà', lam: luuKhongGianNha });
    ds.push({ nhan: 'Hướng nhà hợp tuổi', lam: function () { sangPhong('pt'); } });
    ds.push({ nhan: 'Ước chi phí nội thất', lam: function () { sangPhong('nt'); } });
    ds.push({ nhan: 'Gói quản lý thi công', lam: function () { sangPhong('kgn'); } });
    MM.nut(ds);
  }
  function sangPhong(id) { ga('sang_phong', { toi: id }); MM.dong(); if (VP().vaoPhong) VP().vaoPhong(id); }
  function nutChot() {
    var ds = [];
    if (!lead.zalo) ds.push({ nhan: 'Nhận bảng chi tiết qua Zalo', lam: function () { moiSo('zalo'); } });
    ds.push({ nhan: 'Xem bảng sơ bộ ngay', lam: bangSoBo });
    ds.push({ nhan: 'Lưu vào Không gian Nhà', lam: luuKhongGianNha });
    ds.push({ nhan: 'Tính lại nhà khác', lam: batDauHoi });
    MM.nut(ds);
  }

  /* ── chốt 1: số điện thoại + bấm đồng ý (CHƯA ĐỒNG Ý THÌ CHƯA LƯU SỐ) ── */
  var cauPhapLy = '';
  function napCauPhapLy() {
    if (cauPhapLy) return Promise.resolve(cauPhapLy);
    var p; try { p = import('/consent-constants.js'); } catch (e) { p = Promise.reject(e); }
    return p.then(function (m) { cauPhapLy = (m && m.CONSENT_TEXTS && m.CONSENT_TEXTS.du_toan) || ''; }).catch(function () {}).then(function () {
      if (!cauPhapLy && khung) { try { var el = khung.contentDocument.getElementById('tvDongYText'); cauPhapLy = el ? String(el.textContent || '').trim() : ''; } catch (e) { /* bỏ qua */ } }
      return cauPhapLy;
    });
  }
  function ghiChuDongY() { return cauPhapLy + ' (applamnha.vn/chinh-sach-quyen-rieng-tu) Bạn có thể yêu cầu ngừng liên hệ hoặc xoá dữ liệu bất cứ lúc nào.'; }
  function anSdt(t) { return String(t || '').replace(/(?:\+?84|0)[\d\s.\-]{7,13}\d/g, '[số điện thoại]'); }
  function docTen(text) {
    var m = /(?:tên(?:\s+(?:tôi|em|mình|con))?(?:\s+là)?|tôi\s+là|em\s+là|mình\s+là|anh\s+là|chị\s+là)\s+([^\d,.;:!?\n]{2,40})/i.exec(String(text || ''));
    if (!m) return ''; var ten = m[1].replace(/\s+(số|sđt|sdt|điện thoại|dt|đt)\b.*$/i, '').trim();
    return (ten.match(/\p{L}/gu) || []).length >= 2 ? ten.slice(0, 40) : '';
  }
  // muc: 'zalo' = gửi bảng chi tiết qua Zalo (mặc định khi khách tự gõ số); 'goi' = KTS gọi
  var mucCho = 'zalo';
  function moiSo(muc) {
    mucCho = muc; ga(muc === 'zalo' ? 'bam_zalo' : 'bam_de_lai_so');
    if (lead.sdt && (muc === 'zalo' ? lead.zalo : lead.daGui)) { MM.bot('Dạ em đã nhận yêu cầu rồi ạ (số …' + lead.sdt.slice(-4) + ').'); giuChan(); return; }
    MM.bot(muc === 'zalo' ? 'Dạ anh/chị gõ số Zalo vào ô bên dưới giúp em nhé.' : 'Dạ anh/chị gõ số điện thoại vào ô bên dưới giúp em nhé.');
    MM.cho(function (text) {
      if (coSdt(text)) return true;
      MM.bot('Dạ em chưa thấy số điện thoại trong tin nhắn. Anh/chị gõ lại số giúp em (VD: 0909 123 456) nhé.'); return true;
    }, 'Số điện thoại, VD: 0909 123 456');
  }
  function coSdt(text) {
    if (!MM || typeof MM.laySdt !== 'function') return false;
    var sdt = MM.laySdt(text); if (!sdt) return false;
    MM.ghiLichSu('user', anSdt(text));
    var muc = mucCho;
    if (muc === 'zalo' ? lead.zalo : lead.daGui) { MM.bot('Dạ em đã nhận yêu cầu rồi ạ. Muốn đổi số thì anh/chị nhắn Zalo 0909 829 696 giúp em nhé.'); return true; }
    var ten = docTen(text); lead.dongY = 'chua'; ga('moi_dong_y', { muc: muc });
    MM.bot(muc === 'zalo'
      ? 'Dạ, nếu anh/chị muốn nhận bảng dự toán chi tiết qua Zalo số …' + sdt.slice(-4) + ' thì bấm nút đồng ý dưới đây nhé. Chưa bấm thì ALN chưa lưu số này.'
      : 'Dạ, nếu anh/chị muốn KTS Trần Long liên hệ số …' + sdt.slice(-4) + ' thì bấm nút đồng ý dưới đây nhé. Chưa bấm thì ALN chưa lưu số này.');
    hienNutDongY(sdt, ten, true, muc);
    return true;
  }
  function hienNutDongY(sdt, ten, coDeSau, muc) {
    muc = muc || 'goi';
    napCauPhapLy().then(function () {
      if (muc === 'zalo' ? lead.zalo : lead.daGui) return;
      if (!cauPhapLy) { MM.bot('Dạ anh/chị nhắn Zalo 0909 829 696 giúp em để KTS liên hệ nhé.'); return; }
      var ds = [muc === 'zalo'
        ? { nhan: 'Đồng ý — gửi bảng qua Zalo cho tôi', lam: function () { guiZalo(sdt); } }
        : { nhan: 'Đồng ý để KTS Trần Long liên hệ', lam: function () { guiLead(sdt, ten); } }];
      if (coDeSau) ds.push({ nhan: 'Để sau', lam: function () {
        ga('de_sau'); var c = 'Dạ, khi nào cần KTS xem giúp thì anh/chị bấm nút này nhé.';
        MM.bot(c); MM.ghiLichSu('assistant', c + ' (Khách CHƯA đồng ý để KTS liên hệ — không nói KTS sẽ gọi, không xin số lại.)');
        if (muc === 'zalo') { MM.bot('Em gửi anh/chị bảng sơ bộ trước nhé.'); bangSoBo(); }
        hienNutDongY(sdt, ten, false, muc);
      } });
      MM.nut(ds, ghiChuDongY());
    });
  }
  // gửi bảng chi tiết qua Zalo: cùng đường với nút "Nhận bảng chi tiết qua Zalo" trên trang dự toán
  // (submitDuToanLead kênh zalo → máy chủ dựng PDF gửi nhóm KTS để chuyển qua Zalo khách)
  function guiZalo(sdt) {
    if (lead.zalo || lead.dangGui) return; lead.dangGui = true; ga('dong_y', { muc: 'zalo' });
    trangDuToan().then(function (w) { return w.alnDuToanGuiZalo({ phone: sdt, dongY: true }); }).then(function (kq) {
      lead.dangGui = false; if (!kq || !kq.id) throw new Error('khong_co_ma_lead');
      lead.zalo = true; lead.dongY = 'da'; lead.sdt = sdt; ga('da_gui', { muc: 'zalo', trung: kq.dup ? 1 : 0 });
      if (VP().chuPhongDongTac) VP().chuPhongDongTac('gat_dau');
      var cam = 'Dạ em cảm ơn anh/chị. KTS Trần Long sẽ gửi bảng dự toán chi tiết qua Zalo số …' + sdt.slice(-4) + ' trong giờ làm việc ạ.';
      MM.bot(cam); MM.ghiLichSu('assistant', cam + ' (Khách đã để số và bấm đồng ý — không xin liên hệ nữa.)');
      giuChan();
    }).catch(function (err) {
      lead.dangGui = false; var code = (err && err.code) || ''; ga('loi', { muc: 'zalo', ma_loi: String(code || 'khong_ro').slice(0, 60) });
      if (/invalid-argument/.test(code) && err.message) MM.bot('Dạ ' + err.message);
      else { if (window.alnBaoLoiNeuCan) window.alnBaoLoiNeuCan('van-phong phong-du-toan zalo', err); MM.bot('Dạ em chưa gửi được, anh/chị bấm lại giúp em nhé.'); }
      hienNutDongY(sdt, '', false, 'zalo');
    });
  }
  function guiLead(sdt, ten) {
    if (lead.daGui || lead.dangGui) return; lead.dangGui = true; ga('dong_y');
    trangDuToan().then(function (w) { return w.alnDuToanGuiLeadMyMy({ phone: sdt, name: ten, dongY: true }); }).then(function (kq) {
      lead.dangGui = false; if (!kq || !kq.id) throw new Error('khong_co_ma_lead');
      lead.daGui = true; lead.dongY = 'da'; lead.sdt = sdt; ga('da_gui', { trung: kq.dup ? 1 : 0 });
      if (VP().chuPhongDongTac) VP().chuPhongDongTac('gat_dau');
      var cam = 'Dạ em cảm ơn anh/chị. KTS Trần Long sẽ gọi anh/chị trong 1–2 ngày làm việc, vào buổi anh/chị chọn ạ.';
      MM.bot(cam); MM.ghiLichSu('assistant', cam + ' (Khách đã để số và bấm đồng ý — không xin liên hệ nữa.)');
      chonBuoi(sdt);
    }).catch(function (err) {
      lead.dangGui = false; var code = (err && err.code) || ''; ga('loi', { ma_loi: String(code || 'khong_ro').slice(0, 60) });
      if (/invalid-argument/.test(code) && err.message) MM.bot('Dạ ' + err.message);
      else { if (window.alnBaoLoiNeuCan) window.alnBaoLoiNeuCan('van-phong phong-du-toan lead', err); MM.bot('Dạ em chưa gửi được, anh/chị bấm lại giúp em nhé.'); }
      hienNutDongY(sdt, ten, false);
    });
  }

  /* ── chốt 2: buổi tiện nghe máy (ghi thêm 1 lần chạm qua upsertContact, như MyMy trang dự toán) ── */
  var BUOI = [['sang', 'Sáng (8–11h)'], ['trua', 'Trưa (11–14h)'], ['chieu', 'Chiều (14–17h)'], ['toi', 'Tối (18–20h)'], ['bat_ky', 'Lúc nào cũng được']];
  function chonBuoi(sdt) {
    MM.nut(BUOI.map(function (b) {
      return { nhan: b[1], lam: function () {
        ga('chon_buoi', { buoi: b[0] }); lead.buoi = b[0];
        MM.ghiLienHe(sdt, 'MyMy (Văn phòng ALN, phòng Dự toán) — buổi tiện nghe máy: ' + b[1].toLowerCase(), 'mymy_du_toan');
        if (VP().luuHen) VP().luuHen(b[0] === 'bat_ky' ? 'lúc nào cũng được' : b[1].toLowerCase());
        MM.bot('Dạ em đã ghi buổi ' + b[1].toLowerCase() + ' ạ. Anh/chị lưu dự toán này vào Không gian Nhà để xem chi tiết từng hạng mục và mở lại khi KTS gọi nhé.');
        MM.nut([{ nhan: 'Lưu vào Không gian Nhà', lam: luuKhongGianNha }, { nhan: 'Để sau', lam: function () { ga('khong_luu'); MM.bot('Dạ vâng ạ. Anh/chị cần gì cứ gõ, em ở đây ạ.'); } }]);
      } };
    }));
  }

  /* ── chốt 3: lưu vào Không gian Nhà — mở trang dự toán đầy đủ (đúng số vừa tính) và hộp lưu ── */
  function luuKhongGianNha() {
    ga('luu_kgn');
    if (!kqCuoi || !kqCuoi.tong) { MM.bot('Dạ mình tính xong con số trước rồi em lưu cho anh/chị nhé.'); batDauHoi(); return; }
    MM.bot('Dạ em mở bảng dự toán của anh/chị. Anh/chị nhập số điện thoại và mã xác nhận là lưu xong, xem được chi tiết từng hạng mục ạ.');
    if (VP().moTrangPhong) VP().moTrangPhong('dt', function (w) { if (w.alnLuuChiTiet && w.alnLuuChiTiet.mo) w.alnLuuChiTiet.mo('chan_bang'); });
    MM.dong();
  }

  // khách tự gõ: hỏi bảng dự toán / gửi Zalo / file → trả lời ngay, không đi AI (AI không biết đã tính xong)
  function yDinh(text) {
    var t = String(text || '').toLowerCase();
    if (!/(bảng|file|pdf|zalo|gửi|chi tiết|báo giá|dự toán)/.test(t)) return false;
    ga('y_dinh_bang');
    if (!kqCuoi || !kqCuoi.tong) { MM.bot('Dạ em hỏi nhanh 5 câu về căn nhà rồi lập bảng cho anh/chị ngay ạ.'); batDauHoi(); return true; }
    if (/sơ bộ|xem (luôn|ngay|trước)|ở đây|trên này/.test(t)) { bangSoBo(); return true; }
    moiBang(); return true;
  }
  function batDauHoi() { dl = {}; kqCuoi = null; ga('bat_dau'); hoiNgang(); }

  window.ALNPhongDuToan = {
    // khách vừa ngồi xuống bàn phòng Dự toán
    batDau: function (api) {
      MM = api; mo = true; ga('ngoi');
      trangDuToan().catch(function () { /* báo lúc tính */ });
      api.bot('Dạ em chào anh/chị, em là MyMy phụ trách phòng Dự toán. Em hỏi anh/chị 5 câu ngắn rồi báo ngay chi phí xây nhà, khỏi điền bảng ạ.');
      if (kqCuoi && kqCuoi.tong) { api.bot('Lần trước em tính cho ' + moTaNha() + ': khoảng **' + kqCuoi.tongChu + '**.'); nutChot(); }
      else batDauHoi();
      try { api.hienTuDau(); } catch (e) { /* widget cũ */ }
    },
    chuanBi: function () { trangDuToan().catch(function () { /* báo lúc tính */ }); },
    ketThuc: function () { mo = false; if (MM) try { MM.boCho(); } catch (e) { /* bỏ qua */ } },
    dangMo: function () { return mo; },
    xuLyTin: function (text, api) { MM = api; if (coSdt(text)) return true; if (dienTuCau(text)) return true; return yDinh(text); },
    xuLySdt: function (text, api) { MM = api; return coSdt(text); },
    // ngữ cảnh gửi alnChat: như trang dự toán (máy chủ tự quyết lúc xin liên hệ)
    nguCanh: function () {
      var v = {}; try { v = (khung && khung.contentWindow && khung.contentWindow.alnDuToanLanTinh) || {}; } catch (e) { v = {}; }
      var pa = Array.isArray(v.pa) ? v.pa : [];
      return { trang: 'du-toan-nha', so_lan_tinh: Number(v.so) || 0, pa_1: pa[0] || '', pa_2: pa[1] || '', dong_y_lien_he: lead.dongY };
    },
    _dl: function () { return dl; }
  };
})();
