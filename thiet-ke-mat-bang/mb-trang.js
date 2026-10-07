/* ALN · Trang /thiet-ke-mat-bang/ — chế độ CHỦ NHÀ dùng thử (07/10/2026).
 *
 * Khách nhập lô + nhu cầu → máy sinh phương án từ mặt bằng gốc nhà A Hoàng (mb-dong-co.js), chọn
 * 3 phương án khác nhau, vẽ từng tầng bằng DOM SVG (không ghép chuỗi HTML), tóm tắt bằng lời thường.
 * Không có bảng luật, điểm ADN, xuất CAD — phần đó chỉ ở công cụ nội bộ của KTS.
 *
 * Gửi lên máy chủ (mb-may.js, callable): bước dùng (ẩn danh), góp ý từng phương án, lead "Nhờ KTS chỉnh".
 */
(function () {
  'use strict';
  var E = window.ALNPlan, T = window.ALNMau, CAD = window.ALNCad, FURN = window.ALNFurnish, CFG = window.ALN_MB_CFG;
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var fmt = function (v, d) { return (Math.round(v * Math.pow(10, d == null ? 2 : d)) / Math.pow(10, d == null ? 2 : d)).toLocaleString('vi-VN'); };
  var nn = function (v) { return Math.round(v * 1000) / 1000; };

  /* Mã phiên ngẫu nhiên — chỉ trong bộ nhớ trang, không lưu trình duyệt */
  var MA_PHIEN = (function () {
    var a = 'abcdefghijkmnpqrstuvwxyz23456789', s = '';
    try { var b = new Uint8Array(16); crypto.getRandomValues(b); for (var i = 0; i < 16; i++) s += a.charAt(b[i] % a.length); }
    catch (e) { for (var j = 0; j < 16; j++) s += a.charAt(Math.floor(Math.random() * a.length)); }
    return s;
  })();

  /* ---------- đo hành vi ---------- */
  function ga(ten, p) { try { if (window.gtag) window.gtag('event', ten, p || {}); } catch (e) {} }
  /* mb-may (ES module, nạp Firebase) có thể chưa sẵn lúc trang gọi → xếp hàng chờ, quá 15 giây thì bỏ */
  function may(ten, d) {
    var dd = Object.assign({ ma_phien: MA_PHIEN }, d);
    if (window.alnMbMay && window.alnMbMay[ten]) {
      try { return window.alnMbMay[ten](dd); } catch (e) { return Promise.resolve(null); }
    }
    return new Promise(function (res, rej) {
      var muc = { ten: ten, d: dd, res: res, rej: rej };
      (window.alnMbHang = window.alnMbHang || []).push(muc);
      setTimeout(function () {
        var h = window.alnMbHang || [], i = h.indexOf(muc);
        if (i >= 0) { h.splice(i, 1); rej(new Error('het_gio')); }
      }, 15000);
    });
  }
  function khoangMatTien(w) { return w < 4 ? 'duoi_4' : w < 5 ? '4_5' : w < 6 ? '5_6' : w < 8 ? '6_8' : 'tu_8'; }
  function khoangSau(d) { return d < 12 ? 'duoi_12' : d < 16 ? '12_16' : d < 20 ? '16_20' : 'tu_20'; }

  /* ---------- tạo phương án ---------- */
  function docForm() {
    var w = parseFloat(String($('mt').value).replace(',', '.')), d = parseFloat(String($('sau').value).replace(',', '.'));
    return {
      w: w, d: d, n: +$('tang').value, pn: +$('pn').value, lg: +$('duong').value,
      kd: $('kd').checked, tm: $('tm').checked, oto: $('oto').checked, ongba: $('ongba').checked, hem: $('hem').checked
    };
  }
  function kiemForm(f) {
    if (!(f.w >= 3 && f.w <= 7)) return f.w > 7 && f.w <= 30 ? 'Bản dùng thử hiện dựng từ mẫu nhà phố mặt tiền hẹp (3–7 m). Lô rộng hơn: anh/chị để lại số ở cuối trang, KTS của ALN phác riêng cho lô của mình.' : 'Mặt tiền nhập từ 3 đến 7 m.';
    if (!(f.d >= 8 && f.d <= 40)) return 'Chiều sâu lô nhập từ 8 đến 40 m.';
    return '';
  }
  function dauVaoMay(f) {
    return { w1: f.w, w2: f.w, d: f.d, lg: f.lg, huong: 'Nam', thoang: 1, luiOverride: 0, sauThoang: f.hem, lgQH: 0, vuonOverride: null };
  }
  function canTren(v) { return v.kd || v.gara || v.ongba || v.bepTren; }

  /* Chỉ thử các tổ hợp khớp nhu cầu "cứng" của khách (kinh doanh, thang máy, ô tô, ông bà) —
     nhanh hơn ~10 lần so với thử mọi tổ hợp; không ra gì thì thử hết rồi xếp theo độ khớp. */
  function sinhBienThe(inp, f, need, tatCa) {
    var M = T.M, B = Math.min(inp.w1, inp.w2), out = [];
    var tmOk = B >= M.thang + M.hanhLangMin + M.tmBand;
    var L = function (ok, a, b) { return ok ? a : b; };
    var dsKd = tatCa ? [0, 1] : [f.kd ? 1 : 0];
    for (var i1 = 0; i1 < dsKd.length; i1++) {
      var kd = dsKd[i1];
      var dsKd2 = kd ? [0, 1] : [0];
      var dsGara = kd ? [0] : (tatCa ? [0, 1] : [f.oto ? 1 : 0]);
      var dsTm = tmOk ? (tatCa ? [0, 1] : [f.tm ? 1 : 0]) : [0];
      var dsOb = tatCa ? [0, 1] : [f.ongba ? 1 : 0];
      for (var a = 0; a < dsKd2.length; a++) for (var b = 0; b < dsGara.length; b++) for (var c = 0; c < 2; c++)
        for (var e = 0; e < dsTm.length; e++) for (var g = 0; g < dsOb.length; g++) {
          var ongba = dsOb[g], dsBep = L(ongba, [1], [0, 1]);
          for (var h = 0; h < dsBep.length; h++) for (var k = 0; k < 2; k++) {
            var dsGieng = inp.d > CFG.gieng.sauAln ? [0, 1] : [0];
            for (var m = 0; m < dsGieng.length; m++) for (var s = 0; s < 2; s++) {
              var v = { n: f.n, kd: kd, kd2: dsKd2[a], gara: dsGara[b], lung: c, tm: dsTm[e], ongba: ongba, bepTren: dsBep[h], sinhHoatCao: k, gieng: dsGieng[m], san: s ? 0 : 1, lat: 0 };
              if (!canTren(v) && v.sinhHoatCao) continue;
              var r;
              try { r = T.build(inp, CFG, v); } catch (err) { continue; }
              if (!r || r.fail || !r.P || r.P.fail) continue;
              r.v = v; out.push(r);
            }
          }
        }
    }
    return out;
  }
  function chuKy(r) {
    return r.P.floors.map(function (fl) { return fl.rooms.filter(function (q) { return q.lb; }).map(function (q) { return q.lb; }).join(','); }).join('|') + '#' + r.v.gieng + r.v.lung + r.v.san;
  }
  function taoPhuongAn(f) {
    var inp = dauVaoMay(f), need = { pn: f.pn, kd: f.kd, tm: f.tm, oto: f.oto, ongba: f.ongba, lung: -1 };
    var ds = sinhBienThe(inp, f, need, false), thuHet = false;
    if (!ds.length) { ds = sinhBienThe(inp, f, need, true); thuHet = true; }
    var xep = ds.map(function (r) { return { r: r, m: T.match(r, need) }; }).sort(function (x, y) { return y.m.total - x.m.total; });
    var chon = [], da = {};
    for (var i = 0; i < xep.length && chon.length < 3; i++) {
      var ck = chuKy(xep[i].r); if (da[ck]) continue; da[ck] = 1; chon.push(xep[i]);
    }
    return { inp: inp, need: need, ds: chon, thuHet: thuHet, soThu: ds.length };
  }

  /* ---------- lời thường ---------- */
  function tenPhong(lb) {
    return String(lb || '').replace(/^PN ông bà/, 'Phòng ngủ ông bà').replace(/^PN /, 'Phòng ngủ ').replace(/\(master\)/, '(phòng chính)')
      .replace(/^Gara \+ sảnh$/, 'Gara ô tô + sảnh').replace(/^Tủ$/, 'Tủ quần áo').replace(/^Kỹ thuật$/, 'Phòng kỹ thuật')
      .replace(/^Bếp chờ \/ kho$/, 'Bếp phụ / kho');
  }
  function ghiChuPhong(sub) {
    if (!sub) return '';
    if (sub === 'khép kín') return 'có WC riêng';
    if (sub === 'WC ở lõi') return 'dùng WC chung cạnh cầu thang';
    if (/WC riêng/.test(sub)) return 'có WC riêng';
    return '';
  }
  function demPhong(r) {
    var P = r.P, wc = 0;
    P.floors.forEach(function (fl) { fl.rooms.forEach(function (q) { if (q.t === 'wet' && /^WC/.test(q.lb || '')) wc++; }); });
    return { pn: P.pn + (P.obPlaced ? 1 : 0), wc: wc, san: Math.round(r.g.fp * r.v.n), tum: P.tumArea ? Math.round(P.tumArea) : 0 };
  }
  function nhanPhuongAn(r) {
    var v = r.v, t = [];
    t.push(v.bepTren || v.ongba ? (v.sinhHoatCao ? 'Khách + bếp ở tầng cao' : 'Bếp ở tầng trên') : 'Bếp + ăn ở tầng trệt');
    if (v.kd) t.push(v.kd2 ? 'Kinh doanh trệt + lầu 1' : 'Kinh doanh tầng trệt');
    if (v.gara) t.push('Gara ô tô');
    if (v.ongba) t.push('Phòng ông bà ở trệt');
    if (v.lung) t.push('Có tầng lửng');
    if (v.gieng) t.push('Có giếng trời');
    t.push(v.san ? 'Có sân trước' : 'Không sân trước');
    if (v.tm) t.push('Thang máy');
    return t;
  }
  function luuY(r, m, f) {
    var o = [];
    (m.why || []).forEach(function (w) {
      var x = /^thiếu (\d+) PN/.exec(w);
      if (x) o.push('Ít hơn số phòng ngủ anh/chị chọn ' + x[1] + ' phòng — lô này chưa xếp đủ.');
      else if (w === 'không thang máy') o.push('Mặt tiền hẹp, phương án này chưa đặt được thang máy.');
      else if (w === 'không gara') o.push('Chưa có gara ô tô trong nhà ở phương án này.');
      else if (w === 'không có PN ông bà trệt') o.push('Chưa có phòng ngủ ông bà ở tầng trệt.');
      else if (w === 'không có kinh doanh') o.push('Phương án này không dành tầng trệt để kinh doanh.');
      else if (w === 'có kinh doanh') o.push('Phương án này có dành mặt bằng kinh doanh ở trệt.');
    });
    if (!r.v.gieng && f.d > 15 && !f.hem) o.push('Nhà sâu, phòng phía sau có thể thiếu sáng nếu sau nhà không có hẻm — KTS sẽ xem thêm giếng trời hoặc ô thoáng.');
    return o;
  }

  /* ---------- vẽ SVG bằng DOM ---------- */
  function el(tag, at, chu) {
    var e = document.createElementNS(NS, tag);
    if (at) for (var k in at) if (Object.prototype.hasOwnProperty.call(at, k)) e.setAttribute(k, String(at[k]));
    if (chu != null) e.textContent = String(chu);
    return e;
  }
  function chuSvg(cls, x, y, size, chu, them) {
    var at = { 'class': cls, x: nn(x), y: nn(y), 'font-size': nn(size), 'text-anchor': 'middle', 'dominant-baseline': 'middle' };
    if (them) for (var k in them) at[k] = them[k];
    return el('text', at, chu);
  }
  var uidMarker = 0;
  function veTang(r, fl, nho) {
    var g = r.g, P = r.P, W = Math.max(g.w1, g.w2), D = g.d, B = g.B;
    var padL = 0.4, padR = nho ? 0.4 : 1.6, padT = nho ? 0.4 : 1.6, padB = nho ? 0.4 : 1.4;
    var vw = W + padL + padR, vh = D + padT + padB, fs = Math.min(0.46, Math.max(0.3, vw / 15));
    var svg = el('svg', { 'class': 'mb-plan' + (nho ? ' mini' : ''), viewBox: [nn(-padL), nn(-padT), nn(vw), nn(vh)].join(' '), role: 'img', 'aria-label': 'Mặt bằng ' + fl.name });
    var id = 'mbm' + (uidMarker++);
    var defs = el('defs'), mk = el('marker', { id: id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
    mk.appendChild(el('path', { d: 'M0 0L10 5L0 10z', 'class': 'p-ah' })); defs.appendChild(mk); svg.appendChild(defs);
    svg.appendChild(el('polygon', { 'class': 'p-lot', points: '0,0 ' + nn(g.w1) + ',0 ' + nn(g.w2) + ',' + nn(D) + ' 0,' + nn(D) }));
    if (P.yard && fl.ground) {
      svg.appendChild(el('rect', { 'class': 'p-open', x: 0, y: nn(P.yard.y), width: nn(B), height: nn(P.yard.h) }));
      if (!nho) svg.appendChild(chuSvg('p-c', B / 2, P.yard.y + P.yard.h * 0.4, fs * 0.85, P.yard.label));
    }
    fl.rooms.forEach(function (q) {
      var cls = { room: 'p-room', wet: 'p-wet', 'void': 'p-void', open: 'p-open', corr: 'p-corr', shaft: 'p-shaft' }[q.t] || 'p-room';
      svg.appendChild(el('rect', { 'class': cls, x: nn(q.x), y: nn(q.y), width: nn(q.w), height: nn(q.h) }));
      if (q.t === 'shaft' || q.t === 'void') svg.appendChild(el('path', { 'class': q.t === 'void' ? 'p-x' : 'p-thin', d: 'M' + nn(q.x) + ' ' + nn(q.y) + 'L' + nn(q.x + q.w) + ' ' + nn(q.y + q.h) + 'M' + nn(q.x + q.w) + ' ' + nn(q.y) + 'L' + nn(q.x) + ' ' + nn(q.y + q.h) }));
    });
    var wp = '';
    CAD.wallSegs(g, fl, false).forEach(function (w) { wp += w.o === 'h' ? 'M' + nn(w.a0) + ' ' + nn(w.at) + 'H' + nn(w.a1) : 'M' + nn(w.at) + ' ' + nn(w.a0) + 'V' + nn(w.a1); });
    if (wp) svg.appendChild(el('path', { 'class': 'p-iw', d: wp }));
    (fl.cars || []).forEach(function (c) {
      svg.appendChild(el('rect', { 'class': 'p-car', x: nn(c.x), y: nn(c.y), width: nn(c.w), height: nn(c.h), rx: 0.35 }));
      if (!nho) svg.appendChild(chuSvg('p-s', c.x + c.w / 2, c.y + c.h - 0.6, fs * 0.75, 'Ô TÔ'));
    });
    (fl.stairs || []).forEach(function (s) { veThang(svg, s, id, fs, nho); });
    (fl.altars || []).forEach(function (a) {
      svg.appendChild(el('rect', { 'class': 'p-altar', x: nn(a.x), y: nn(a.y), width: nn(a.w), height: nn(a.h) }));
      if (!nho) svg.appendChild(chuSvg('p-s', a.x + a.w / 2, a.y + a.h / 2, Math.min(fs * 0.6, a.h * 0.55), 'bàn thờ'));
    });
    if (fl.bal) {
      svg.appendChild(el('rect', { 'class': 'p-bal', x: nn(fl.bal.x), y: nn(fl.bal.y), width: nn(fl.bal.w), height: nn(fl.bal.h) }));
      if (!nho) svg.appendChild(chuSvg('p-a', fl.bal.x + fl.bal.w / 2, fl.bal.y + fl.bal.h / 2, fs * 0.75, 'ban công'));
    }
    svg.appendChild(el('rect', { 'class': 'p-wall', x: 0, y: nn(g.f), width: nn(B), height: nn(g.Db) }));
    if (fl.tum) svg.appendChild(el('rect', { 'class': 'p-wall', x: nn(fl.tum.x), y: nn(fl.tum.y), width: nn(fl.tum.w), height: nn(fl.tum.h) }));
    (fl.windows || []).forEach(function (w) {
      if (w.o === 'h') svg.appendChild(el('rect', { 'class': 'p-win', x: nn(w.a), y: nn(w.at - 0.07), width: nn(w.w), height: 0.14 }));
      else svg.appendChild(el('rect', { 'class': 'p-win', x: nn(w.at - 0.07), y: nn(w.a), width: 0.14, height: nn(w.w) }));
    });
    (fl.doors || []).forEach(function (d) { veCua(svg, d); });
    if (!nho) {
      (fl.furn || []).forEach(function (f) { veNoiThat(svg, f); });
      if (fl.ground) svg.appendChild(chuSvg('p-a', B / 2, g.f - 0.45, fs * 0.85, 'LỐI VÀO ↓'));
      fl.rooms.forEach(function (q) { if (q.lb) veNhan(svg, q, fs); });
      veKichThuoc(svg, g, fs, W, D, B);
    }
    return svg;
  }
  function veCua(svg, d) {
    var G = E.doorGeom(d);
    svg.appendChild(el('rect', { 'class': 'p-gap', x: nn(G.gap.x), y: nn(G.gap.y), width: nn(G.gap.w), height: nn(G.gap.h) }));
    G.dashes.forEach(function (l) { svg.appendChild(el('line', { 'class': 'p-roll', x1: nn(l[0]), y1: nn(l[1]), x2: nn(l[2]), y2: nn(l[3]) })); });
    G.lines.forEach(function (l) { svg.appendChild(el('line', { 'class': 'p-door', x1: nn(l[0]), y1: nn(l[1]), x2: nn(l[2]), y2: nn(l[3]) })); });
    G.arcs.forEach(function (c) { svg.appendChild(el('path', { 'class': 'p-door', d: 'M' + nn(c.x0) + ' ' + nn(c.y0) + 'A' + nn(c.r) + ' ' + nn(c.r) + ' 0 0 ' + (c.sweep ? 1 : 0) + ' ' + nn(c.x1) + ' ' + nn(c.y1) })); });
  }
  function veNoiThat(svg, f) {
    var L = CAD.LIB[f.t], cls = L && L.ly === 'vesinh' ? 'p-vs' : 'p-furn';
    CAD.furnPrims(f).forEach(function (p) {
      if (p.k === 'pl') svg.appendChild(el('polygon', { 'class': cls, points: p.pts.map(function (q) { return nn(q[0]) + ',' + nn(q[1]); }).join(' ') }));
      else if (p.k === 'l') svg.appendChild(el('line', { 'class': cls, x1: nn(p.x1), y1: nn(p.y1), x2: nn(p.x2), y2: nn(p.y2) }));
      else svg.appendChild(el('circle', { 'class': cls, cx: nn(p.cx), cy: nn(p.cy), r: nn(p.r) }));
    });
  }
  function veThang(svg, s, id, fs, nho) {
    if (s.kind !== 'doc') { svg.appendChild(el('rect', { 'class': 'p-stair', x: nn(s.x), y: nn(s.y), width: nn(s.w || 1), height: nn(s.h || 1) })); return; }
    var x = s.x, y = s.y, w = s.w, h = s.h, q = Math.min(w, 1.0), TB = 0.27;
    svg.appendChild(el('rect', { 'class': 'p-stair', x: nn(x), y: nn(y), width: nn(w), height: nn(h) }));
    var inner = s.side === 'L' ? x : x + w, outer = s.side === 'L' ? x + w : x, p = '';
    for (var yy = y + q + TB; yy < y + h - q - 0.05; yy += TB) p += 'M' + nn(x) + ' ' + nn(yy) + 'H' + nn(x + w);
    [[y + q, -1], [y + h - q, 1]].forEach(function (cd) { for (var k = 0; k <= 3; k++) { var a = k / 3 * q; p += 'M' + nn(inner) + ' ' + nn(cd[0]) + 'L' + nn(outer) + ' ' + nn(cd[0] + cd[1] * a); } });
    svg.appendChild(el('path', { 'class': 'p-thin', d: p }));
    if (nho) return;
    var ax = x + w / 2;
    svg.appendChild(el('polyline', { 'class': 'p-arrow', points: nn(ax) + ',' + nn(y + h - 0.2) + ' ' + nn(ax) + ',' + nn(y + 0.25), 'marker-end': 'url(#' + id + ')' }));
  }
  function veNhan(svg, q, fs) {
    var cx = q.x + q.w / 2, cy = q.y + q.h / 2, isC = q.t === 'corr';
    var size = isC ? fs * 0.8 : fs, tw = q.lb.length * size * 0.56;
    var coDt = (q.t === 'room' || q.t === 'wet') && q.w * q.h >= 2.5;
    var xoay = tw > q.w - 0.1 && q.h > q.w;
    var gr = el('g', xoay ? { transform: 'rotate(-90 ' + nn(cx) + ' ' + nn(cy) + ')' } : null);
    var span = xoay ? q.w : q.h, hai = coDt && span >= size * 3, ty = hai ? cy - size * 0.6 : cy;
    gr.appendChild(chuSvg(isC ? 'p-c' : 'p-t', cx, ty, size, q.lb));
    if (hai) gr.appendChild(chuSvg('p-s', cx, cy + size * 0.75, size * 0.78, fmt(q.w * q.h, 1) + ' m²'));
    svg.appendChild(gr);
  }
  function veKichThuoc(svg, g, fs, W, D, B) {
    var y = -0.9, x = W + 0.8, T = 0.15;
    svg.appendChild(el('path', { 'class': 'p-dim', d: 'M0 ' + y + 'H' + nn(B) + 'M' + nn(-T) + ' ' + nn(y + T) + 'L' + nn(T) + ' ' + nn(y - T) + 'M' + nn(B - T) + ' ' + nn(y + T) + 'L' + nn(B + T) + ' ' + nn(y - T) }));
    svg.appendChild(chuSvg('p-dm', B / 2, y - 0.35, fs, fmt(B, 2) + ' m'));
    svg.appendChild(el('path', { 'class': 'p-dim', d: 'M' + nn(x) + ' 0V' + nn(D) + 'M' + nn(x - T) + ' ' + nn(T) + 'L' + nn(x + T) + ' ' + nn(-T) + 'M' + nn(x - T) + ' ' + nn(D + T) + 'L' + nn(x + T) + ' ' + nn(D - T) }));
    svg.appendChild(chuSvg('p-dm', x + 0.4, D / 2, fs, fmt(D, 2) + ' m', { transform: 'rotate(-90 ' + nn(x + 0.4) + ' ' + nn(D / 2) + ')' }));
  }

  /* ---------- giao diện ---------- */
  var KQ = null, CHON = 0, TANG = 0, LAT = {}, FORM = null, CUR = null, DA_GOP_Y = {};
  function xay(i) {
    var goc = KQ.ds[i]; if (!goc) return null;
    if (!LAT[i]) return goc;
    var v = Object.assign({}, goc.r.v, { lat: 1 });
    var r; try { r = T.build(KQ.inp, CFG, v); } catch (e) { return goc; }
    if (!r || r.fail || !r.P || r.P.fail) return goc;
    r.v = v; return { r: r, m: goc.m };
  }
  function tangHienThi(r) { return r.P.floors; }

  function veKetQua() {
    var box = $('paTabs'); box.textContent = '';
    KQ.ds.forEach(function (x, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pa-tab'; b.setAttribute('aria-pressed', i === CHON ? 'true' : 'false');
      var t1 = document.createElement('b'); t1.textContent = 'Phương án ' + (i + 1);
      var t2 = document.createElement('span'); t2.textContent = nhanPhuongAn(x.r).slice(0, 2).join(' · ');
      b.appendChild(t1); b.appendChild(t2);
      b.addEventListener('click', function () { if (CHON === i) return; CHON = i; TANG = 0; veKetQua(); ga('aln_mb_xem_pa', { thu_tu: i + 1 }); may('ghiBuoc', { buoc: 'xem_pa', thu_tu: i + 1 }); });
      box.appendChild(b);
    });
    vePhuongAn();
  }
  function vePhuongAn() {
    var x = xay(CHON); CUR = x; if (!x) return;
    var r = x.r, f = FORM;
    if (!r.P.floors.some(function (fl) { return fl.furn; })) { try { FURN.furnishPlan(r.g, r.P); } catch (e) {} }
    var dem = demPhong(r);
    $('paTen').textContent = 'Phương án ' + (CHON + 1);
    var nhan = $('paNhan'); nhan.textContent = '';
    nhanPhuongAn(r).forEach(function (t) { var s = document.createElement('span'); s.className = 'chip'; s.textContent = t; nhan.appendChild(s); });
    $('paTomTat').textContent = 'Lô ' + fmt(f.w, 2) + ' × ' + fmt(f.d, 2) + ' m, nhà ' + f.n + ' tầng (tầng trên cùng là sân thượng' + (dem.tum ? ', có tum thang' : '') + '): ' +
      dem.pn + ' phòng ngủ, ' + dem.wc + ' WC, tổng sàn khoảng ' + dem.san + ' m²' + (dem.tum ? ' (chưa tính tum ' + dem.tum + ' m²)' : '') + '.';
    var ly = $('paLuuY'); ly.textContent = '';
    luuY(r, x.m, f).forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ly.appendChild(li); });
    ly.hidden = !ly.childNodes.length;
    /* hàng tầng nhỏ */
    var fls = tangHienThi(r), strip = $('tangTabs'); strip.textContent = '';
    if (TANG >= fls.length) TANG = 0;
    fls.forEach(function (fl, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tang-tab'; b.setAttribute('aria-pressed', i === TANG ? 'true' : 'false');
      b.appendChild(veTang(r, fl, true));
      var s = document.createElement('span'); s.textContent = fl.name.replace(' · thờ', '').replace('Mái · tum', 'Mái'); b.appendChild(s);
      b.addEventListener('click', function () { TANG = i; veTangLon(); capNhatTab(); });
      strip.appendChild(b);
    });
    veTangLon();
    $('btnLat').setAttribute('aria-pressed', LAT[CHON] ? 'true' : 'false');
    capNhatGopY();
  }
  function capNhatTab() {
    var bs = $('tangTabs').querySelectorAll('.tang-tab');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', i === TANG ? 'true' : 'false');
  }
  function veTangLon() {
    var r = CUR.r, fls = tangHienThi(r), fl = fls[TANG], hop = $('tangVe');
    hop.textContent = ''; hop.appendChild(veTang(r, fl, false));
    $('tangTen').textContent = fl.name;
    $('tangTruoc').disabled = TANG === 0; $('tangSau').disabled = TANG === fls.length - 1;
    var ds = $('tangPhong'); ds.textContent = '';
    var da = {};
    fl.rooms.forEach(function (q) {
      if (!q.lb || q.t === 'corr' || q.t === 'void' || q.t === 'shaft') return;
      if (q.w * q.h < 0.8) return;
      var ten = tenPhong(q.lb); if (q.t === 'open' && q.lb === 'Mái') { if (da.mai) return; da.mai = 1; }
      var li = document.createElement('li');
      var a = document.createElement('span'); a.textContent = ten + (ghiChuPhong(q.sub) ? ' — ' + ghiChuPhong(q.sub) : '');
      var b = document.createElement('b'); b.textContent = q.t === 'open' && q.lb === 'Mái' ? '' : fmt(q.w * q.h, 1) + ' m²';
      li.appendChild(a); li.appendChild(b); ds.appendChild(li);
    });
  }

  /* ---------- góp ý ---------- */
  var LY_DO = [
    ['thieu_phong', 'Số phòng chưa đúng ý'], ['phong_nho', 'Phòng nhỏ quá'], ['cau_thang', 'Cầu thang chưa hợp lý'],
    ['bep_an', 'Bếp, chỗ ăn chưa đúng ý'], ['wc', 'WC chưa hợp lý'], ['anh_sang', 'Thiếu ánh sáng, thông gió'],
    ['de_xe', 'Chỗ để xe chưa như ý'], ['tho_cung', 'Phòng thờ chưa hợp'], ['kho_hieu', 'Bản vẽ khó hiểu'], ['khac', 'Lý do khác']
  ];
  var GY = { danh_gia: '', ly_do: {} };
  function capNhatGopY() {
    var xong = !!DA_GOP_Y[CHON];
    $('gyHoi').hidden = xong; $('gyXong').hidden = !xong;
    GY = { danh_gia: '', ly_do: {} };
    var bs = document.querySelectorAll('[data-gy]');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', 'false');
    $('gyChiTiet').hidden = true; $('gyGhiChu').value = ''; $('gyMsg').textContent = '';
    var cs = $('gyLyDo').querySelectorAll('input'); for (var j = 0; j < cs.length; j++) cs[j].checked = false;
  }
  function dungLyDo() {
    var box = $('gyLyDo');
    LY_DO.forEach(function (x) {
      var lb = document.createElement('label'); lb.className = 'chk-chip';
      var ip = document.createElement('input'); ip.type = 'checkbox'; ip.value = x[0];
      ip.addEventListener('change', function () { if (ip.checked) GY.ly_do[x[0]] = 1; else delete GY.ly_do[x[0]]; });
      var sp = document.createElement('span'); sp.textContent = x[1];
      lb.appendChild(ip); lb.appendChild(sp); box.appendChild(lb);
    });
  }
  function tomTatPa() {
    var r = CUR.r, d = demPhong(r), v = r.v;
    return {
      thu_tu: CHON + 1, lat: LAT[CHON] ? 1 : 0,
      v: { kd: v.kd, kd2: v.kd2, gara: v.gara, lung: v.lung, tm: v.tm, ongba: v.ongba, bepTren: v.bepTren, sinhHoatCao: v.sinhHoatCao, gieng: v.gieng, san: v.san },
      so_pn: d.pn, so_wc: d.wc, tong_san: d.san, diem: CUR.m.total
    };
  }
  function dauVaoGui() {
    var f = FORM;
    return { mat_tien: f.w, sau: f.d, so_tang: f.n, so_pn: f.pn, lo_gioi: f.lg, kd: f.kd, tm: f.tm, oto: f.oto, ongba: f.ongba, hem: f.hem };
  }
  function guiGopY() {
    if (!GY.danh_gia) return;
    var ghiChu = String($('gyGhiChu').value || '').slice(0, 300);
    var ly = Object.keys(GY.ly_do);
    $('gyGui').disabled = true; $('gyMsg').textContent = 'Đang gửi…';
    may('gopY', { danh_gia: GY.danh_gia, ly_do: ly, ghi_chu: ghiChu, dau_vao: dauVaoGui(), phuong_an: tomTatPa() }).then(function (kq) {
      $('gyGui').disabled = false;
      if (!kq || !kq.ok) { $('gyMsg').textContent = 'Chưa gửi được, anh/chị thử lại giúp.'; return; }
      DA_GOP_Y[CHON] = GY.danh_gia; ga('aln_mb_gop_y', { danh_gia: GY.danh_gia, so_ly_do: ly.length, thu_tu: CHON + 1 });
      capNhatGopY();
    }, function () { $('gyGui').disabled = false; $('gyMsg').textContent = 'Chưa gửi được, anh/chị thử lại giúp.'; });
  }

  /* ---------- lead ---------- */
  var DA_MO_LEAD = false;
  function sdtHopLe(s) { var p = String(s || '').replace(/[\s.\-()]/g, '').replace(/^\+84/, '0'); return /^0[35789]\d{8}$/.test(p) || /^09000000\d{2}$/.test(p); }
  function guiLead() {
    var ten = String($('ldTen').value || '').trim(), sdt = String($('ldSdt').value || '').trim(), msg = $('ldMsg');
    if ((ten.match(/\p{L}/gu) || []).length < 2) { msg.textContent = 'Anh/chị nhập họ tên giúp để KTS tiện xưng hô.'; $('ldTen').focus(); return; }
    if (!sdtHopLe(sdt)) { msg.textContent = 'Số điện thoại chưa đúng. Vui lòng nhập số di động 10 số, ví dụ 09xx xxx xxx.'; $('ldSdt').focus(); return; }
    if (!$('ldDongY').checked) { msg.textContent = 'Anh/chị tick ô đồng ý để KTS của ALN được liên hệ.'; return; }
    $('ldGui').disabled = true; msg.textContent = 'Đang gửi…';
    var gopY = DA_GOP_Y[CHON] ? { danh_gia: DA_GOP_Y[CHON] } : null;
    may('lead', { name: ten, phone: sdt, dongY: true, dau_vao: dauVaoGui(), phuong_an: tomTatPa(), gop_y: gopY, ghi_chu: String($('ldGhiChu').value || '').slice(0, 300) }).then(function (kq) {
      $('ldGui').disabled = false;
      if (!kq || !kq.ok) { msg.textContent = (kq && kq.loi) || 'Chưa gửi được, anh/chị thử lại hoặc nhắn Zalo 0909 829 696.'; return; }
      $('ldForm').hidden = true; $('ldXong').hidden = false; msg.textContent = '';
      ga('aln_mb_lead', { thu_tu: CHON + 1 });
    }, function (e) {
      $('ldGui').disabled = false;
      msg.textContent = (e && e.message && /Số điện thoại|họ tên|đồng ý/i.test(e.message)) ? e.message : 'Chưa gửi được, anh/chị thử lại hoặc nhắn Zalo 0909 829 696.';
    });
  }

  /* ---------- khởi động ---------- */
  function chay() {
    var f = docForm(), loi = kiemForm(f), tb = $('mbLoi');
    tb.textContent = loi; if (loi) { if (f.w > 7) $('ldKhoi').hidden = false; return; }
    $('btnTao').disabled = true; $('btnTao').textContent = 'Đang vẽ phương án…';
    setTimeout(function () {
      var kq;
      try { kq = taoPhuongAn(f); } catch (e) { kq = null; }
      $('btnTao').disabled = false; $('btnTao').textContent = 'Vẽ lại phương án';
      ga('aln_mb_tao', { mat_tien_khoang: khoangMatTien(f.w), sau_khoang: khoangSau(f.d), so_tang: f.n, so_pn: f.pn, co_ket_qua: kq && kq.ds.length ? 1 : 0 });
      may('ghiBuoc', { buoc: 'tao', dau_vao: { mat_tien: f.w, sau: f.d, so_tang: f.n, so_pn: f.pn, lo_gioi: f.lg, kd: f.kd, tm: f.tm, oto: f.oto, ongba: f.ongba, hem: f.hem }, so_pa: kq ? kq.ds.length : 0 });
      if (!kq || !kq.ds.length) {
        $('mbKetQua').hidden = true;
        tb.textContent = 'Mẫu gốc hiện tại chưa co giãn vừa lô này (thường do lô quá nông, dưới khoảng 10 m). Anh/chị để lại số ở cuối trang, KTS của ALN sẽ phác riêng cho lô của mình.';
        $('ldKhoi').hidden = false;
        return;
      }
      KQ = kq; FORM = f; CHON = 0; TANG = 0; LAT = {}; DA_GOP_Y = {};
      $('mbKetQua').hidden = false; $('ldKhoi').hidden = false;
      tb.textContent = kq.thuHet ? 'Lô này chưa xếp được đúng mọi yêu cầu đã chọn — dưới đây là các phương án gần nhất, phần còn thiếu ghi ở mục "Lưu ý".' : '';
      veKetQua();
      $('mbKetQua').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  }
  function khoiDong() {
    if (!E || !T || !CAD || !FURN || !CFG) { $('mbLoi').textContent = 'Trang chưa tải xong bộ vẽ. Anh/chị tải lại trang giúp.'; return; }
    dungLyDo();
    $('btnTao').addEventListener('click', chay);
    $('mbForm').addEventListener('submit', function (e) { e.preventDefault(); chay(); });
    $('tangTruoc').addEventListener('click', function () { if (TANG > 0) { TANG--; veTangLon(); capNhatTab(); } });
    $('tangSau').addEventListener('click', function () { var n = tangHienThi(CUR.r).length; if (TANG < n - 1) { TANG++; veTangLon(); capNhatTab(); } });
    $('btnLat').addEventListener('click', function () { LAT[CHON] = !LAT[CHON]; vePhuongAn(); ga('aln_mb_lat', { thu_tu: CHON + 1 }); may('ghiBuoc', { buoc: 'lat', thu_tu: CHON + 1 }); });
    var gb = document.querySelectorAll('[data-gy]');
    for (var i = 0; i < gb.length; i++) gb[i].addEventListener('click', function () {
      GY.danh_gia = this.getAttribute('data-gy');
      for (var j = 0; j < gb.length; j++) gb[j].setAttribute('aria-pressed', gb[j] === this ? 'true' : 'false');
      $('gyChiTiet').hidden = false; $('gyLyDoKhoi').hidden = GY.danh_gia !== 'chua_hop';
      $('gyGhiChuNhan').textContent = GY.danh_gia === 'hop' ? 'Anh/chị thích điểm nào nhất? (không bắt buộc)' : 'Anh/chị muốn đổi gì? (không bắt buộc)';
    });
    $('gyGui').addEventListener('click', guiGopY);
    $('ldGui').addEventListener('click', guiLead);
    ['ldTen', 'ldSdt'].forEach(function (id) { $(id).addEventListener('focus', function () { if (DA_MO_LEAD) return; DA_MO_LEAD = true; ga('aln_mb_lead_bat_dau', {}); may('ghiBuoc', { buoc: 'mo_lead' }); }); });
    may('ghiBuoc', { buoc: 'mo_trang' });
  }
  window.alnMbMaPhien = function () { return MA_PHIEN; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', khoiDong); else khoiDong();
})();
