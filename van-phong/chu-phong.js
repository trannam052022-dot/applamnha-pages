/* ═══════════════════════════════════════════════════════════════
   Chủ phòng nói chuyện — các phòng còn lại của Văn phòng ALN (09/11/2026)

   Nam 09/11/2026: "áp dụng cách làm việc cho các phòng khác như phòng dự toán".
   Cách chủ phòng làm việc (giống phòng Dự toán — phong-du-toan.js):
     hỏi vài câu bằng nút → báo kết quả bằng lời (bóng chữ + khung chat)
     → mời nhận BẢN CHI TIẾT qua Zalo (số + bấm đồng ý)
     → chưa để số thì đưa BẢN SƠ BỘ ngay trong chat
     → giữ chân: mời sang các phòng/dịch vụ khác của ALN.
   Phòng có ở đây: pt (Phong thủy), nt (Nội thất), tk (Xưởng thiết kế), kho (Hồ sơ mẫu), kgn (Quản lý thi công).
   Chủ phòng tạm là MyMy (Nam 09/11/2026) nhưng mỗi phòng xưng theo phòng mình phụ trách.

   Tính kết quả bằng chính hàm máy chủ các trang công cụ đang dùng (gọi thẳng như bat-trach.html):
     pt → xemBatTrach; lưu phiếu → guiLeadBatTrach (câu đồng ý CONSENT_TEXTS.bat_trach)
     nt → tinhKhoangGiaNoiThat (diện tích phòng chuẩn nhà phố của bảng khoảng giá)
   Các phòng còn lại (nt, tk, kho, kgn): khách gõ số thì widget MyMy tự hỏi đồng ý chung (mymy_chat,
   chưa bấm thì chưa lưu số); tóm tắt việc khách vừa làm đi kèm vào lần chạm qua nguCanh().pa_1.
   Chữ vào khung chat chỉ qua API của widget (không innerHTML).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var FN = 'https://asia-southeast1-aln-platform.cloudfunctions.net/';
  var VP = function () { return window.ALNVanPhong || {}; };
  function ga(phong, buoc, them) {
    try { var d = { event: 'aln_vp_phong', phong: phong, buoc: buoc }; for (var k in them || {}) d[k] = them[k]; (window.dataLayer = window.dataLayer || []).push(d); } catch (e) { /* bỏ qua */ }
  }
  // gọi hàm onCall công khai bằng fetch (như bat-trach.html), lỗi trả {code, message}
  function goiHam(ten, data) {
    return fetch(FN + ten, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: data }) })
      .then(function (res) { return res.json().catch(function () { return null; }).then(function (j) {
        if (res.ok && j && j.result) return j.result;
        var e = new Error((j && j.error && j.error.message) || 'loi_may_chu'); e.code = (j && j.error && j.error.status) || String(res.status); throw e;
      }); });
  }
  function boMa(t) { return String(t || '').replace(/\[\[[a-z]+\|([^\]]*)\]\]/g, '$1'); }
  function fmtD(v) { return Math.round(Number(v) || 0).toLocaleString('vi-VN') + ' đ'; }
  function trieu(v) { v = Number(v) || 0; return v >= 1e9 ? (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ' : Math.round(v / 1e6).toLocaleString('vi-VN') + ' triệu'; }
  function goNutTreo() { var h = document.querySelectorAll('#mymy-msgs .mm-nut-hang'); for (var i = 0; i < h.length; i++) { var r = h[i].closest('.mm-row'); if (r) r.remove(); } }
  function anSdt(t) { return String(t || '').replace(/(?:\+?84|0)[\d\s.\-]{7,13}\d/g, '[số điện thoại]'); }

  /* ── giữ chân: các phòng/dịch vụ khác ── */
  var PHONG_KHAC = [['dt', 'Dự toán xây nhà'], ['pt', 'Hướng nhà hợp tuổi'], ['nt', 'Chi phí nội thất'], ['tk', 'Thử chia phòng'], ['kgn', 'Gói quản lý thi công'], ['kho', 'Xem hồ sơ thiết kế mẫu']];
  function giuChan(P) {
    var MM = P.MM;
    MM.bot('Trong lúc chờ, anh/chị có thể làm tiếp mấy việc này ngay trong văn phòng ạ:');
    var ds = PHONG_KHAC.filter(function (x) { return x[0] !== P.id; }).slice(0, 4).map(function (x) {
      return { nhan: x[1], lam: function () { ga(P.id, 'sang_phong', { toi: x[0] }); MM.dong(); if (VP().vaoPhong) VP().vaoPhong(x[0]); } };
    });
    MM.nut(ds);
  }
  // phòng dùng đồng ý chung của widget: thấy câu cảm ơn của widget thì mời tiếp (giữ chân) một lần
  function theoDoiDongYChung(P) {
    var ds = document.getElementById('mymy-msgs'); if (!ds || P._ob) return;
    P._ob = new MutationObserver(function () {
      if (!P.mo || P.daGiuChan) return;
      var b = ds.querySelectorAll('.mm-row.bot .mm-bubble'), t = b.length ? b[b.length - 1].textContent : '';
      if (/KTS của ALN sẽ liên hệ anh\/chị trong 1–2 ngày/.test(t)) { P.daGiuChan = true; P.coSo = true; ga(P.id, 'da_gui', { muc: 'mymy_chat' }); setTimeout(function () { giuChan(P); }, 300); }
    });
    P._ob.observe(ds, { childList: true, subtree: true });
  }
  function moiZaloChung(P, cau) {
    ga(P.id, 'bam_zalo');
    if (P.coSo) { P.MM.bot('Dạ em đã nhận số của anh/chị rồi ạ.'); giuChan(P); return; }
    P.MM.bot(cau + ' Anh/chị gõ số Zalo vào ô bên dưới giúp em nhé.');
  }
  // khách tự gõ đòi bản chi tiết / gửi Zalo → trả lời ngay theo phòng, không đi AI
  function yDinhBang(P, text) {
    var t = String(text || '').toLowerCase();
    if (!/(bảng|bản|phiếu|file|pdf|zalo|gửi|chi tiết|báo giá)/.test(t)) return false;
    ga(P.id, 'y_dinh_bang'); P.moiBang(); return true;
  }

  /* ── khung chung một phòng ── */
  function phong(id, cfg) {
    var P = { id: id, mo: false, MM: null, coSo: false, daGiuChan: false };
    P.moiBang = function () { cfg.moiBang(P); };
    P.obj = {
      chuanBi: function () {},
      batDau: function (api) { P.MM = api; P.mo = true; P.daGiuChan = P.coSo; ga(id, 'ngoi'); theoDoiDongYChung(P); cfg.batDau(P); try { api.hienTuDau(); } catch (e) { /* widget cũ */ } },
      ketThuc: function () { P.mo = false; if (P.MM) try { P.MM.boCho(); } catch (e) { /* bỏ qua */ } },
      dangMo: function () { return P.mo; },
      xuLyTin: function (text, api) { P.MM = api; if (cfg.xuLyTin && cfg.xuLyTin(P, text)) return true; return yDinhBang(P, text); },
      nguCanh: function () { return { trang: 'van-phong-' + id, pa_1: (cfg.tomTat && cfg.tomTat(P)) || '' }; }
    };
    if (cfg.xuLySdt) P.obj.xuLySdt = function (text, api) { P.MM = api; return cfg.xuLySdt(P, text); };
    return P.obj;
  }

  /* ════════ PHONG THỦY (pt) ════════ */
  var HUONG = [['Bắc', 0], ['Đông Bắc', 45], ['Đông', 90], ['Đông Nam', 135], ['Nam', 180], ['Tây Nam', 225], ['Tây', 270], ['Tây Bắc', 315]];
  var pt = { dl: {}, r: null, lead: { sdt: '', ten: '', da: false, dang: false } };
  function ptNgay(text) {
    var m = /(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})/.exec(String(text || ''));
    if (!m) return null; var d = +m[1], mo = +m[2], y = +m[3];
    if (y < 1920 || y > 2015 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var dt = new Date(Date.UTC(y, mo - 1, d)); if (dt.getUTCDate() !== d) return null;
    return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  function ptHoiNgay(P) {
    P.MM.bot('Câu 1/4: Anh/chị cho em ngày sinh dương lịch của gia chủ (người đứng tên làm nhà), ví dụ 15/08/1985 ạ.');
    P.MM.cho(function (text) {
      var ns = ptNgay(text);
      if (!ns) {
        if (/^\s*\d{4}\s*$/.test(text)) { P.MM.bot('Dạ anh/chị cho em cả ngày tháng nhé, vì người sinh tháng 1–2 dương lịch (trước Tết) tính tuổi theo năm trước ạ. Ví dụ 15/08/1985.'); ptHoiNgay(P); return true; }
        if (!/\d/.test(text)) return false;
        P.MM.bot('Dạ em chưa đọc được ngày này. Anh/chị gõ theo dạng ngày/tháng/năm, ví dụ 15/08/1985 giúp em nhé.'); ptHoiNgay(P); return true;
      }
      pt.dl.ns = ns; ptHoiGioi(P); return true;
    }, 'Ví dụ 15/08/1985');
  }
  function ptHoiGioi(P) {
    P.MM.bot('Câu 2/4: Gia chủ là nam hay nữ ạ?');
    P.MM.nut([{ nhan: 'Nam', lam: function () { pt.dl.gt = 'nam'; ptHoiHuong(P); } }, { nhan: 'Nữ', lam: function () { pt.dl.gt = 'nu'; ptHoiHuong(P); } }]);
  }
  function ptHoiHuong(P) {
    P.MM.bot('Câu 3/4: Nhà quay mặt về hướng nào ạ? (đứng trong nhà nhìn ra cửa chính)');
    P.MM.nut(HUONG.map(function (h) { return { nhan: h[0], lam: function () { pt.dl.deg = h[1]; pt.dl.tenHuong = h[0]; ptHoiNam(P); } }; })
      .concat([{ nhan: 'Chưa biết / chưa có đất', lam: function () { pt.dl.deg = null; pt.dl.tenHuong = ''; ptHoiNam(P); } }]));
  }
  function ptHoiNam(P) {
    var y = new Date().getFullYear();
    P.MM.bot('Câu 4/4: Anh/chị định khởi công năm nào ạ?');
    P.MM.nut([y, y + 1, y + 2].map(function (n) { return { nhan: 'Năm ' + n, lam: function () { pt.dl.namxay = n; ptTinh(P); } }; }));
  }
  function ptTinh(P) {
    P.MM.bot('Dạ em đang xem, anh/chị chờ em một chút ạ…');
    if (VP().chuPhongNoi) VP().chuPhongNoi('Để em xem cho anh/chị nhé…', 0);
    goiHam('xemBatTrach', { ns: pt.dl.ns, gt: pt.dl.gt, deg: pt.dl.deg, namxay: pt.dl.namxay, fam: [] }).then(function (kq) {
      pt.r = kq && kq.r; if (!pt.r || !pt.r.Q) throw new Error('khong_co_ket_qua');
      ga('pt', 'ket_qua', { co_ket_qua: 1 }); ptBao(P);
    }).catch(function (e) {
      ga('pt', 'ket_qua', { co_ket_qua: 0 });
      P.MM.bot(/INVALID_ARGUMENT/.test(e.code) ? 'Dạ ' + e.message : 'Dạ em chưa xem được lúc này. Anh/chị thử lại giúp em, hoặc mở trang Bát trạch đầy đủ ạ.');
      P.MM.nut([{ nhan: 'Làm lại từ đầu', lam: function () { ptBatDauHoi(P); } }, { nhan: 'Mở trang Bát trạch', lam: function () { ptMoTrang(P); } }]);
    });
  }
  function ptHuongTot(r) {
    return HUONG.map(function (h, i) { var s = r.sao[r.dn[i]]; return s && s.cat ? h[0] + ' (' + s.n + ')' : null; }).filter(Boolean);
  }
  function ptBao(P) {
    var r = pt.r, tot = ptHuongTot(r), cau = 'Dạ gia chủ tuổi ' + r.canchi + ' (' + r.Y + '), cung phi **' + r.Q.n + ' (' + r.Q.h + ')**, thuộc ' + r.Q.g + ' tứ mệnh.\n'
      + 'Bốn hướng tốt: ' + tot.join(', ') + '.';
    if (r.house) {
      var s = r.sao[r.house.star];
      cau += '\nNhà hướng ' + pt.dl.tenHuong + ' là cung **' + s.n + '** (' + s.rank + ')' + (s.cat ? ' — hợp với gia chủ.' : ' — chưa hợp, có cách bố trí để hóa giải.');
    }
    if (r.tuoiLam && r.tuoiLam.concl) cau += '\n' + boMa(r.tuoiLam.concl);
    if (VP().chuPhongNoi) VP().chuPhongNoi('Anh/chị cung ' + r.Q.n + ', hợp hướng ' + tot.slice(0, 2).map(function (x) { return x.replace(/ \(.*/, ''); }).join(', ') + ' ạ.', 1);
    P.MM.bot(cau);
    P.moiBang();
  }
  function ptMoiBang(P) {
    if (!pt.r) { P.MM.bot('Dạ em hỏi nhanh 4 câu rồi xem hướng cho anh/chị ngay ạ.'); ptBatDauHoi(P); return; }
    if (pt.lead.da) { P.MM.bot('Dạ phiếu đầy đủ em đã chuyển để gửi qua Zalo số …' + pt.lead.sdt.slice(-4) + ' rồi ạ.'); giuChan(P); return; }
    P.MM.bot('Phiếu Bát trạch đầy đủ (bố trí phòng ngủ, bếp, bàn thờ cho cả nhà, cách hóa giải, file PDF) em gửi qua Zalo cho anh/chị. Anh/chị cho em số Zalo nhé. Chưa tiện thì em gửi bản sơ bộ ngay đây ạ.');
    P.MM.nut([
      { nhan: 'Nhận phiếu đầy đủ qua Zalo', lam: function () { ptMoiSo(P); } },
      { nhan: 'Xem bản sơ bộ ngay', lam: function () { ptSoBo(P); } },
      { nhan: 'Thêm vợ/chồng, con vào phiếu', lam: function () { ptMoTrang(P); } },
    ]);
  }
  function ptSoBo(P) {
    var r = pt.r; ga('pt', 'so_bo'); if (!r) { ptMoiBang(P); return; }
    var d = r.danhGia || {}, t = r.tuoiLam || {}, dong = ['**Bản Bát trạch sơ bộ** — gia chủ ' + r.canchi + ', cung ' + r.Q.n];
    if (r.house) { (d.pros || []).slice(0, 2).forEach(function (x) { dong.push('Tốt: ' + boMa(x)); }); (d.cons || []).slice(0, 2).forEach(function (x) { dong.push('Lưu ý: ' + boMa(x)); }); (d.tips || []).slice(0, 2).forEach(function (x) { dong.push('Gợi ý: ' + boMa(x)); }); }
    (t.pros || []).slice(0, 2).forEach(function (x) { dong.push(boMa(x)); });
    (t.y || []).forEach(function (x) { dong.push(boMa(x)); });
    P.MM.bot(dong.join('\n'));
    P.MM.bot('Bản sơ bộ chỉ có phần chính. Phiếu đầy đủ có bố trí phòng cho từng người trong nhà, em gửi qua Zalo cho anh/chị ạ.');
    P.MM.nut([{ nhan: 'Nhận phiếu đầy đủ qua Zalo', lam: function () { ptMoiSo(P); } }, { nhan: 'Xem trên trang Bát trạch', lam: function () { ptMoTrang(P); } }]);
  }
  function ptLinkNap() {
    var d = pt.dl; if (!d.ns) return '/bat-trach.html';
    return '/bat-trach.html#nap=g.' + d.ns + '.' + (d.gt === 'nam' ? 'n' : 'u') + (d.deg !== null && d.deg !== undefined ? '_h.' + d.deg : '') + (d.namxay ? '_x.' + d.namxay : '');
  }
  function ptMoTrang(P) { ga('pt', 'mo_trang'); P.MM.bot('Dạ em mở trang Bát trạch với thông tin anh/chị vừa cho, anh/chị thêm người trong nhà ở đó nhé.'); if (VP().moTrangPhong) VP().moTrangPhong('pt', null, ptLinkNap()); P.MM.dong(); }
  // lưu phiếu (guiLeadBatTrach) cần họ tên + số + bấm đồng ý (CONSENT bat_trach)
  function ptMoiSo(P) {
    ga('pt', 'bam_zalo');
    if (!pt.r) { ptMoiBang(P); return; }
    if (pt.lead.da) { ptMoiBang(P); return; }
    P.MM.bot('Dạ anh/chị gõ tên và số Zalo vào ô bên dưới giúp em, ví dụ: Lan 0909 123 456.');
    P.MM.cho(function (text) { if (ptCoSdt(P, text)) return true; P.MM.bot('Dạ em chưa thấy số điện thoại. Anh/chị gõ lại giúp em, ví dụ: Lan 0909 123 456.'); return true; }, 'Tên + số Zalo');
  }
  function ptCoSdt(P, text) {
    var sdt = P.MM.laySdt ? P.MM.laySdt(text) : ''; if (!sdt) return false;
    P.MM.ghiLichSu('user', anSdt(text));
    if (pt.lead.da) { P.MM.bot('Dạ em đã nhận yêu cầu rồi ạ.'); return true; }
    if (!pt.r) { P.MM.bot('Dạ em ghi nhận. Mình xem hướng xong rồi em gửi phiếu cho anh/chị nhé.'); ptBatDauHoi(P); return true; }
    var ten = String(text).replace(/(?:\+?84|0)[\d\s.\-]{7,13}\d/g, ' ').replace(/(tên|tôi là|em là|anh|chị|số|sđt|zalo|là|:|,)/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    pt.lead.sdt = sdt;
    if ((ten.match(/\p{L}/gu) || []).length < 2) {
      P.MM.bot('Dạ anh/chị cho em xin tên để KTS xưng hô cho đúng ạ.');
      P.MM.cho(function (t) { var tt = String(t || '').trim().slice(0, 60); if ((tt.match(/\p{L}/gu) || []).length < 2) return false; pt.lead.ten = tt; ptDongY(P); return true; }, 'Tên của anh/chị');
      return true;
    }
    pt.lead.ten = ten; ptDongY(P); return true;
  }
  var cauBT = '';
  function napCau(khoa) {
    var p; try { p = import('/consent-constants.js'); } catch (e) { p = Promise.reject(e); }
    return p.then(function (m) { return (m && m.CONSENT_TEXTS && m.CONSENT_TEXTS[khoa]) || ''; }).catch(function () { return ''; });
  }
  function ptDongY(P) {
    ga('pt', 'moi_dong_y');
    P.MM.bot('Dạ, nếu anh/chị muốn nhận phiếu Bát trạch đầy đủ qua Zalo số …' + pt.lead.sdt.slice(-4) + ' thì bấm nút đồng ý dưới đây nhé. Chưa bấm thì ALN chưa lưu số này.');
    (cauBT ? Promise.resolve(cauBT) : napCau('bat_trach')).then(function (c) {
      cauBT = c;
      if (!c) { P.MM.bot('Dạ anh/chị nhắn Zalo 0909 829 696 giúp em để KTS gửi phiếu nhé.'); return; }
      P.MM.nut([
        { nhan: 'Đồng ý — gửi phiếu qua Zalo cho tôi', lam: function () { ptGui(P); } },
        { nhan: 'Để sau', lam: function () { ga('pt', 'de_sau'); P.MM.bot('Dạ vâng, em gửi anh/chị bản sơ bộ trước nhé.'); ptSoBo(P); } },
      ], c + ' (applamnha.vn/chinh-sach-quyen-rieng-tu) Bạn có thể yêu cầu ngừng liên hệ hoặc xoá dữ liệu bất cứ lúc nào.');
    });
  }
  function ptGui(P) {
    if (pt.lead.da || pt.lead.dang) return; pt.lead.dang = true; ga('pt', 'dong_y');
    var r = pt.r, d = pt.dl;
    goiHam('guiLeadBatTrach', { name: pt.lead.ten, phone: pt.lead.sdt, dongY: true, giai_doan: null, optout: window.ALN_INTERNAL === true,
      dau_vao: { gia_chu: { ten: pt.lead.ten, ns: d.ns, gt: d.gt, nam_am: r.Y, cung: r.Q.n }, huong: d.deg, nam_xay: d.namxay, thanh_vien: [] } })
      .then(function (kq) {
        pt.lead.dang = false; if (!kq || !kq.ok) throw new Error('khong_luu_duoc');
        pt.lead.da = true; P.coSo = true; P.daGiuChan = true; ga('pt', 'da_gui', { trung: kq.dup ? 1 : 0 });
        if (VP().chuPhongDongTac) VP().chuPhongDongTac('gat_dau');
        var cam = 'Dạ em cảm ơn ' + pt.lead.ten + '. KTS Trần Long sẽ gửi phiếu Bát trạch đầy đủ qua Zalo số …' + pt.lead.sdt.slice(-4) + ' trong giờ làm việc ạ.';
        P.MM.bot(cam); P.MM.ghiLichSu('assistant', cam + ' (Khách đã để số và bấm đồng ý — không xin liên hệ nữa.)');
        giuChan(P);
      }).catch(function (e) {
        pt.lead.dang = false; ga('pt', 'loi', { ma_loi: String(e.code || 'khong_ro').slice(0, 60) });
        if (/INVALID_ARGUMENT|RESOURCE_EXHAUSTED/.test(e.code)) P.MM.bot('Dạ ' + e.message);
        else { if (window.alnBaoLoiNeuCan) window.alnBaoLoiNeuCan('van-phong chu-phong pt', e); P.MM.bot('Dạ em chưa gửi được, anh/chị bấm lại giúp em nhé.'); }
        ptDongY(P);
      });
  }
  function ptBatDauHoi(P) { pt.dl = {}; pt.r = null; ga('pt', 'bat_dau'); ptHoiNgay(P); }

  /* ════════ NỘI THẤT (nt) ════════ */
  // diện tích phòng chuẩn nhà phố 5x20 của bảng khoảng giá (data/noi_that_khoang_gia.json)
  var MUC = [['co_ban', 'Cơ bản'], ['kha', 'Khá'], ['cao_cap', 'Cao cấp']];
  var nt = { dl: {}, r: null };
  function ntHoi(P) {
    P.MM.bot('Câu 1/3: Nhà mình có mấy phòng ngủ ạ?');
    P.MM.nut([1, 2, 3, 4, 5].map(function (n) { return { nhan: n + ' phòng ngủ', lam: function () { nt.dl.pn = n; ntHoiWc(P); } }; }));
  }
  function ntHoiWc(P) {
    P.MM.bot('Câu 2/3: Mấy phòng vệ sinh (WC) ạ?');
    P.MM.nut([1, 2, 3, 4].map(function (n) { return { nhan: n + ' WC', lam: function () { nt.dl.wc = n; ntHoiMuc(P); } }; }));
  }
  function ntHoiMuc(P) {
    P.MM.bot('Câu 3/3: Anh/chị muốn làm nội thất ở mức nào ạ?');
    P.MM.nut(MUC.map(function (m) { return { nhan: m[1], lam: function () { nt.dl.muc = m[0]; ntTinh(P); } }; })
      .concat([{ nhan: 'Chưa biết, so cả 3 mức', lam: function () { nt.dl.muc = ''; ntTinh(P); } }]));
  }
  function ntPhong() {
    var ds = [{ ma: 'PK', dien_tich: 25 }, { ma: 'BEP', dien_tich: 25 }, { ma: 'PN1', dien_tich: 20 }];
    for (var i = 1; i < nt.dl.pn; i++) ds.push({ ma: 'PN', dien_tich: 12 });
    for (var j = 0; j < nt.dl.wc; j++) ds.push({ ma: 'WC', dien_tich: 4 });
    return ds.slice(0, 10);
  }
  function ntTong(m) { return (nt.r.phong || []).reduce(function (a, p) { var x = p.muc && p.muc[m]; return { thap: a.thap + (x ? x.thap : 0), cao: a.cao + (x ? x.cao : 0) }; }, { thap: 0, cao: 0 }); }
  function ntTinh(P) {
    P.MM.bot('Dạ em đang tính, anh/chị chờ em một chút ạ…');
    if (VP().chuPhongNoi) VP().chuPhongNoi('Để em tính nội thất cho nhà mình nhé…', 0);
    goiHam('tinhKhoangGiaNoiThat', { phong: ntPhong() }).then(function (r) {
      nt.r = r; if (!r || !r.phong) throw new Error('khong_co_ket_qua'); ga('nt', 'ket_qua', { co_ket_qua: 1 }); ntBao(P);
    }).catch(function (e) {
      ga('nt', 'ket_qua', { co_ket_qua: 0 });
      P.MM.bot('Dạ em chưa tính được lúc này. Anh/chị thử lại giúp em, hoặc mở công cụ nội thất đầy đủ ạ.');
      P.MM.nut([{ nhan: 'Làm lại', lam: function () { ntBatDauHoi(P); } }, { nhan: 'Mở công cụ nội thất', lam: function () { ntMoTrang(P); } }]);
    });
  }
  function ntMoTa() { return nt.dl.pn + ' phòng ngủ, ' + nt.dl.wc + ' WC, phòng khách, bếp + ăn'; }
  function ntBao(P) {
    var dong = [], m = nt.dl.muc;
    if (m) { var t = ntTong(m); dong.push('Nội thất mức **' + MUC.filter(function (x) { return x[0] === m; })[0][1] + '** khoảng **' + trieu(t.thap) + ' – ' + trieu(t.cao) + '**.'); }
    else MUC.forEach(function (x) { var t = ntTong(x[0]); dong.push(x[1] + ': khoảng **' + trieu(t.thap) + ' – ' + trieu(t.cao) + '**'); });
    if (VP().chuPhongNoi) { var t0 = ntTong(m || 'kha'); VP().chuPhongNoi('Nhà mình khoảng ' + trieu(t0.thap) + ' – ' + trieu(t0.cao) + ' ạ.', 1); }
    P.MM.bot('Dạ nhà anh/chị (' + ntMoTa() + ', diện tích phòng theo nhà phố chuẩn):\n' + dong.join('\n') + '\nĐây là khoảng tham khảo trước khi có bản thiết kế, đồ đạc và vật liệu chọn khác thì số khác.');
    P.moiBang();
  }
  function ntMoiBang(P) {
    if (!nt.r) { P.MM.bot('Dạ em hỏi nhanh 3 câu rồi báo chi phí nội thất cho anh/chị ngay ạ.'); ntBatDauHoi(P); return; }
    if (P.coSo) { P.MM.bot('Dạ em đã nhận số của anh/chị rồi ạ, KTS sẽ gửi bảng qua Zalo.'); giuChan(P); return; }
    P.MM.bot('Bảng chi tiết từng món (đồ, vật liệu, đơn giá từng phòng) em gửi qua Zalo cho anh/chị. Anh/chị cho em số Zalo nhé. Chưa tiện thì em gửi bản sơ bộ ngay đây ạ.');
    P.MM.nut([
      { nhan: 'Nhận bảng chi tiết qua Zalo', lam: function () { moiZaloChung(P, 'Dạ vâng.'); } },
      { nhan: 'Xem bản sơ bộ ngay', lam: function () { ntSoBo(P); } },
      { nhan: 'Tự chỉnh từng phòng', lam: function () { ntMoTrang(P); } },
    ]);
  }
  function ntSoBo(P) {
    ga('nt', 'so_bo'); if (!nt.r) { ntMoiBang(P); return; }
    var m = nt.dl.muc || 'kha', ten = MUC.filter(function (x) { return x[0] === m; })[0][1], dem = {};
    var dong = (nt.r.phong || []).map(function (p) {
      var x = p.muc && p.muc[m]; dem[p.ma] = (dem[p.ma] || 0) + 1;
      var nhan = p.ma === 'PN' ? 'Phòng ngủ ' + (dem[p.ma] + 1) : p.ma === 'WC' ? 'WC ' + dem[p.ma] : p.ten;
      return x ? nhan + ': ' + fmtD(x.thap) + ' – ' + fmtD(x.cao) : null;
    }).filter(Boolean);
    var t = ntTong(m);
    P.MM.bot('**Bản nội thất sơ bộ — mức ' + ten + '**\n' + dong.join('\n') + '\n**Cộng: ' + trieu(t.thap) + ' – ' + trieu(t.cao) + '**');
    P.MM.bot('Bản sơ bộ chỉ có từng phòng. Muốn xem từng món đồ và vật liệu thì em gửi bảng chi tiết qua Zalo cho anh/chị ạ.');
    P.MM.nut([{ nhan: 'Nhận bảng chi tiết qua Zalo', lam: function () { moiZaloChung(P, 'Dạ vâng.'); } }, { nhan: 'Tự chỉnh từng phòng', lam: function () { ntMoTrang(P); } }]);
  }
  function ntMoTrang(P) { ga('nt', 'mo_trang'); if (VP().moTrangPhong) VP().moTrangPhong('nt'); P.MM.dong(); }
  function ntBatDauHoi(P) { nt.dl = {}; nt.r = null; ga('nt', 'bat_dau'); ntHoi(P); }

  /* ════════ XƯỞNG THIẾT KẾ (tk) — thử chia phòng ════════ */
  var tk = { dl: {} };
  function tkHoi(P) {
    P.MM.bot('Câu 1/3: Bề ngang lô đất bao nhiêu mét ạ?');
    P.MM.nut([4, 5, 6, 8].map(function (v) { return { nhan: v + ' m', lam: function () { tk.dl.w = v; tkHoiDai(P); } }; }));
    P.MM.cho(function (text) { var v = parseFloat(String(text).replace(',', '.')); if (!(v >= 3 && v <= 12)) return false; goNutTreo(); tk.dl.w = v; tkHoiDai(P); return true; }, 'Ví dụ 4,5');
  }
  function tkHoiDai(P) {
    P.MM.bot('Câu 2/3: Chiều dài lô đất bao nhiêu mét ạ?');
    P.MM.nut([15, 18, 20, 25].map(function (v) { return { nhan: v + ' m', lam: function () { tk.dl.d = v; tkHoiTang(P); } }; }));
    P.MM.cho(function (text) { var v = parseFloat(String(text).replace(',', '.')); if (!(v >= 8 && v <= 40)) return false; goNutTreo(); tk.dl.d = v; tkHoiTang(P); return true; }, 'Ví dụ 18');
  }
  function tkHoiTang(P) {
    P.MM.bot('Câu 3/3: Nhà mấy tầng, tính cả sân thượng ạ?');
    P.MM.nut([3, 4, 5, 6].map(function (n) { return { nhan: n + ' tầng', lam: function () { tk.dl.n = n; tkMo(P); } }; }));
  }
  function tkMo(P) {
    ga('tk', 'ket_qua');
    var url = '/thiet-ke-mat-bang/?loai=pho&tu=van_phong&w=' + tk.dl.w + '&d=' + tk.dl.d + '&n=' + tk.dl.n;
    if (VP().chuPhongNoi) VP().chuPhongNoi('Em vẽ thử 3 phương án cho lô ' + tk.dl.w + ' × ' + tk.dl.d + ' m nhé.', 1);
    P.MM.bot('Dạ em mở bản vẽ thử 3 phương án chia phòng cho lô ' + tk.dl.w + ' × ' + tk.dl.d + ' m, ' + tk.dl.n + ' tầng. Anh/chị xem từng tầng, bấm đổi phòng được ạ.');
    P.MM.bot('Muốn KTS chỉnh phương án cho đúng nhu cầu nhà mình thì anh/chị gõ số Zalo vào ô bên dưới, em chuyển cho KTS ạ.');
    if (VP().moTrangPhong) VP().moTrangPhong('tk', null, url);
  }
  function tkMoiBang(P) {
    if (!tk.dl.n) { P.MM.bot('Dạ em hỏi nhanh 3 câu về lô đất rồi vẽ thử cho anh/chị ạ.'); tk.dl = {}; tkHoi(P); return; }
    moiZaloChung(P, 'Dạ, KTS sẽ gửi phương án qua Zalo cho anh/chị.');
  }

  /* ════════ HỒ SƠ MẪU (kho) ════════ */
  function khoBatDau(P) {
    P.MM.bot('Dạ em chào anh/chị, em phụ trách Thư viện hồ sơ mẫu. Ở đây có một bộ hồ sơ thiết kế thật đủ 4 bộ môn: kiến trúc, kết cấu, điện nước, nội thất.');
    P.MM.bot('Anh/chị xem thử 8 tờ ngay, hoặc xem đủ bộ sau khi nhập mã xác nhận số điện thoại ạ.');
    P.MM.nut([
      { nhan: 'Xem 8 tờ mẫu', lam: function () { ga('kho', 'mo_trang'); if (VP().moTrangPhong) VP().moTrangPhong('kho'); P.MM.dong(); } },
      { nhan: 'Xem đủ bộ hồ sơ', lam: function () { ga('kho', 'du_bo'); if (VP().moTrangPhong) VP().moTrangPhong('kho', null, '/ho-so-mau-xem.html'); P.MM.dong(); } },
      { nhan: 'Nhờ KTS tư vấn qua Zalo', lam: function () { moiZaloChung(P, 'Dạ vâng.'); } },
    ]);
  }

  /* ════════ QUẢN LÝ THI CÔNG (kgn) ════════ */
  function kgnBatDau(P) {
    P.MM.bot('Dạ em chào anh/chị, em phụ trách Không gian Nhà và Gói quản lý thi công. Gói giúp anh/chị theo dõi từng mốc thi công, việc cần kiểm trước khi đổ sàn, ảnh kiểm và sổ tạm ứng so với dự toán.');
    P.MM.bot('Anh/chị muốn xem phí gói cho nhà mình, hay nhờ KTS tư vấn ạ?');
    P.MM.nut([
      { nhan: 'Xem phí gói cho nhà tôi', lam: function () { ga('kgn', 'mo_trang'); if (VP().moTrangPhong) VP().moTrangPhong('kgn', null, '/quan-ly-thi-cong.html'); P.MM.dong(); } },
      { nhan: 'Mở Không gian Nhà của tôi', lam: function () { ga('kgn', 'mo_kgn'); if (VP().moTrangPhong) VP().moTrangPhong('kgn'); P.MM.dong(); } },
      { nhan: 'Nhờ KTS tư vấn qua Zalo', lam: function () { moiZaloChung(P, 'Dạ vâng.'); } },
    ]);
  }

  window.ALNChuPhong = {
    pt: phong('pt', {
      batDau: function (P) {
        P.MM.bot('Dạ em chào anh/chị, em phụ trách phòng Phong thủy. Em hỏi 4 câu ngắn rồi xem hướng nhà hợp tuổi cho anh/chị ngay ạ.');
        if (pt.r) { P.MM.bot('Lần trước em xem cho gia chủ ' + pt.r.canchi + ', cung ' + pt.r.Q.n + '.'); ptMoiBang(P); } else ptBatDauHoi(P);
      },
      moiBang: ptMoiBang,
      xuLySdt: function (P, text) { return ptCoSdt(P, text); },
      xuLyTin: function (P, text) { if (ptCoSdt(P, text)) return true; return false; },
      tomTat: function () { return pt.r ? 'Bát trạch: gia chủ ' + pt.r.canchi + ', cung ' + pt.r.Q.n + (pt.dl.tenHuong ? ', nhà hướng ' + pt.dl.tenHuong : '') : ''; }
    }),
    nt: phong('nt', {
      batDau: function (P) {
        P.MM.bot('Dạ em chào anh/chị, em phụ trách phòng Nội thất. Em hỏi 3 câu ngắn rồi báo khoảng chi phí nội thất cho nhà mình ngay ạ.');
        if (nt.r) { ntBao(P); } else ntBatDauHoi(P);
      },
      moiBang: ntMoiBang,
      tomTat: function () { if (!nt.r) return ''; var t = ntTong(nt.dl.muc || 'kha'); return 'Nội thất: ' + ntMoTa() + ', mức ' + (nt.dl.muc || 'chưa chọn') + ' ≈ ' + trieu(t.thap) + '–' + trieu(t.cao); }
    }),
    tk: phong('tk', {
      batDau: function (P) {
        P.MM.bot('Dạ em chào anh/chị, em phụ trách Xưởng thiết kế. Em hỏi 3 câu về lô đất rồi vẽ thử phương án chia phòng cho anh/chị xem ngay ạ.');
        tk.dl = {}; tkHoi(P);
      },
      moiBang: tkMoiBang,
      tomTat: function () { return tk.dl.n ? 'Thử mặt bằng: lô ' + tk.dl.w + 'x' + tk.dl.d + ' m, ' + tk.dl.n + ' tầng' : ''; }
    }),
    kho: phong('kho', { batDau: khoBatDau, moiBang: function (P) { moiZaloChung(P, 'Dạ vâng.'); }, tomTat: function () { return 'Xem hồ sơ thiết kế mẫu'; } }),
    kgn: phong('kgn', { batDau: kgnBatDau, moiBang: function (P) { moiZaloChung(P, 'Dạ vâng.'); }, tomTat: function () { return 'Quan tâm Gói quản lý thi công'; } })
  };
})();
