/* ALN · Bộ ký hiệu phác tay v0.1 (23/10/2026) — dùng chung cho bản vẽ trên trang, ảnh xuất và DXF.
 * Mỗi ký hiệu trả về danh sách nét trong toạ độ riêng (mét, gốc góc trên-trái, y hướng xuống):
 *   {k:'l', x1,y1,x2,y2}            đoạn thẳng
 *   {k:'r', x,y,w,h, f}              chữ nhật (f = tô)
 *   {k:'c', cx,cy,r, f}              đường tròn
 *   {k:'e', cx,cy,rx,ry}             elip
 *   {k:'a', cx,cy,r,a0,a1}           cung tròn, độ, quay theo chiều kim đồng hồ trên màn hình
 *   {k:'p', pts:[[x,y]..], z, f}     đường gấp khúc (z = khép kín)
 *   {k:'t', x,y, s, v}               chữ (s = cỡ chữ, mét)
 * Mỗi nét có thể kèm m (màu: 'muc' mực, 'go' đồ gỗ, 'nuoc' thiết bị nước, 'gen' hộp gen, 'cay' cây, 'nhan' chữ phụ)
 * và d (nét đứt). Mã ký hiệu trùng với bảng "Ký hiệu phác tay ALN" và tên block CAD.
 */
(function () {
  'use strict';
  function L(x1, y1, x2, y2, m, d) { return { k: 'l', x1: x1, y1: y1, x2: x2, y2: y2, m: m, d: d }; }
  function R(x, y, w, h, m, f, d) { return { k: 'r', x: x, y: y, w: w, h: h, m: m, f: f, d: d }; }
  function C(cx, cy, r, m, f) { return { k: 'c', cx: cx, cy: cy, r: r, m: m, f: f }; }
  function E(cx, cy, rx, ry, m) { return { k: 'e', cx: cx, cy: cy, rx: rx, ry: ry, m: m }; }
  function A(cx, cy, r, a0, a1, m) { return { k: 'a', cx: cx, cy: cy, r: r, a0: a0, a1: a1, m: m }; }
  function P(pts, z, m, f, d) { return { k: 'p', pts: pts, z: z, m: m, f: f, d: d }; }
  function T(x, y, s, v, m) { return { k: 't', x: x, y: y, s: s, v: v, m: m }; }

  /* ---------- Cầu thang: một vế (I), hai vế (U), ba vế (U3) ----------
     Toạ độ riêng: vào thang ở cạnh dưới (y = h), đi lên về phía y = 0; dao = lật đầu vào lên trên.
     Quy ước bậc (theo các phiên trước, S-CAUTHANG-01): n bậc mỗi tầng (17–22), mặt bậc 0,25–0,30 m
     (ALN nhắm 0,27), bề rộng vế ≥ 0,90 m, chiếu nghỉ sâu ≥ bề rộng vế. Một vế có k bậc thì có k − 1 mặt bậc
     (bậc trên cùng là sàn hoặc chiếu nghỉ), nên I có n − 1 mặt bậc, U có n − 2, U3 có n − 3.
     Nam 23/10/2026: đuôi mũi tên chạm mép bậc đầu, mũi chạm mép bậc cuối. */
  var KHE_U = 0.1, MAT_BAC_ALN = 0.27;
  function kieuThang(k) { return k === 'U3' ? 'U3' : (k === 'U' ? 'U' : 'I'); }
  function thangBoTri(o) {
    var w = Math.max(0.3, o.w || 1), h = Math.max(0.3, o.h || 1), n = Math.max(4, Math.min(30, Math.round(o.n || 21)));
    var kieu = kieuThang(o.kieu), r = { kieu: kieu, n: n, w: w, h: h, ve: w, land: 0, gieng: 0, vế: [] };
    if (kieu === 'I') {
      r.vế.push({ so_bac: n, mat: n - 1, b: h / (n - 1), dai: h });
      return r;
    }
    if (kieu === 'U') {
      var ve = (w - KHE_U) / 2, n1 = Math.ceil(n / 2), n2 = n - n1;
      var land = Math.min(Math.max(ve, 1.0), h * 0.5), b = (h - land) / Math.max(1, n1 - 1);
      r.ve = ve; r.land = land; r.gieng = KHE_U;
      r.vế.push({ so_bac: n1, mat: n1 - 1, b: b, dai: (n1 - 1) * b }, { so_bac: n2, mat: n2 - 1, b: b, dai: (n2 - 1) * b });
      return r;
    }
    // ba vế: vế 1 lên dọc cạnh trái, chiếu nghỉ góc trên-trái, vế 2 chạy ngang cạnh trên, chiếu nghỉ góc trên-phải, vế 3 dọc cạnh phải
    var v3 = Math.max(0.3, Math.min(o.ve || 1.0, w / 2 - 0.15, h - 0.3));
    var R1 = h - v3, R2 = Math.max(0.05, w - 2 * v3), T = Math.max(3, n - 3);
    var b0 = (2 * R1 + R2) / T, t2 = Math.max(1, Math.round(R2 / b0)), t1 = Math.max(1, Math.round(R1 / b0));
    if (t1 + t2 > T - 1) { t1 = Math.max(1, Math.min(t1, T - t2 - 1)); t2 = Math.max(1, T - t1 - 1); }
    var t3 = Math.max(1, T - t1 - t2), b1 = R1 / t1, b2 = R2 / t2, b3 = Math.min(b1, R1 / t3);
    r.ve = v3; r.land = v3; r.gieng = w - 2 * v3;
    r.vế.push({ so_bac: t1 + 1, mat: t1, b: b1, dai: R1 }, { so_bac: t2 + 1, mat: t2, b: b2, dai: R2 }, { so_bac: t3 + 1, mat: t3, b: b3, dai: t3 * b3 });
    return r;
  }
  /* Kích thước gọn nhất cho số bậc, kiểu thang và bề rộng vế đã chọn (mặt bậc 0,27 m). */
  function thangKichThuoc(kieu, n, ve, b) {
    kieu = kieuThang(kieu); n = Math.max(4, Math.round(n || 21)); ve = Math.max(0.6, ve || 1.0); b = b || MAT_BAC_ALN;
    var tron5 = function (x) { return Math.round(x * 20) / 20; };
    if (kieu === 'I') return { w: tron5(ve), h: tron5((n - 1) * b) };
    if (kieu === 'U') { var land = Math.max(ve, 1.0); return { w: tron5(2 * ve + KHE_U), h: tron5(land + (Math.ceil(n / 2) - 1) * b) }; }
    var T = n - 3, t2 = Math.max(2, Math.round(T / 4)), t1 = Math.ceil((T - t2) / 2);
    return { w: tron5(2 * ve + t2 * b), h: tron5(ve + t1 * b) };
  }
  function cauThang(o) {
    var t = thangBoTri(o), w = t.w, h = t.h, dao = !!o.dao, out = [R(0, 0, w, h, 'muc')];
    var Y = function (y) { return dao ? h - y : y; };
    var mui = function (pts, huong) { // đuôi chấm tròn ở điểm đầu, mũi tên ở điểm cuối
      out.push(P(pts.map(function (q) { return [q[0], Y(q[1])]; }), false, 'mui_ten'));
      out.push(C(pts[0][0], Y(pts[0][1]), 0.045, 'mui_ten', true));
      var e = pts[pts.length - 1], d = 0.2, s = 0.12;
      if (huong === 'len') out.push(P([[e[0] - s, Y(e[1] + d)], [e[0], Y(e[1])], [e[0] + s, Y(e[1] + d)]], false, 'mui_ten'));
      else out.push(P([[e[0] - s, Y(e[1] - d)], [e[0], Y(e[1])], [e[0] + s, Y(e[1] - d)]], false, 'mui_ten'));
    };
    if (t.kieu === 'I') {
      var b = t.vế[0].b;
      for (var i = 1; i <= t.n - 2; i++) out.push(L(0, i * b, w, i * b, 'muc'));
      mui([[w / 2, h], [w / 2, 0]], 'len');
      out.push(T(w / 2 + 0.05, Y(h / 2), 0.16, 'LÊN', 'mui_ten'));
      return out;
    }
    if (t.kieu === 'U') {
      var ve = t.ve, land = t.land, b2 = t.vế[0].b, d2 = t.vế[1].dai;
      out.push(L(0, Y(land), w, Y(land), 'muc'));
      out.push(L(ve, Y(land), ve, Y(h), 'muc'), L(ve + KHE_U, Y(land), ve + KHE_U, Y(h), 'muc'));
      for (var j = 1; j <= t.vế[0].mat - 1; j++) out.push(L(0, Y(land + j * b2), ve, Y(land + j * b2), 'muc'));
      for (var k = 1; k <= t.vế[1].mat; k++) out.push(L(ve + KHE_U, Y(land + k * b2), w, Y(land + k * b2), 'muc'));
      mui([[ve / 2, h], [ve / 2, land / 2], [w - ve / 2, land / 2], [w - ve / 2, land + d2]], 'xuong');
      out.push(T(ve / 2 + 0.05, Y(h - (h - land) / 2), 0.16, 'LÊN', 'mui_ten'));
      return out;
    }
    var v = t.ve, b1 = t.vế[0].b, bb = t.vế[1].b, b3 = t.vế[2].b, d3 = t.vế[2].dai;
    // ranh vế với giếng thang và hai chiếu nghỉ
    out.push(L(v, Y(v), v, Y(h), 'muc'), L(w - v, Y(v), w - v, Y(h), 'muc'), L(v, Y(v), w - v, Y(v), 'muc'));
    out.push(L(0, Y(v), v, Y(v), 'muc'), L(w - v, Y(v), w, Y(v), 'muc'), L(v, Y(0), v, Y(v), 'muc'), L(w - v, Y(0), w - v, Y(v), 'muc'));
    for (var a1 = 1; a1 < t.vế[0].mat; a1++) out.push(L(0, Y(v + a1 * b1), v, Y(v + a1 * b1), 'muc'));
    for (var a2 = 1; a2 < t.vế[1].mat; a2++) out.push(L(v + a2 * bb, Y(0), v + a2 * bb, Y(v), 'muc'));
    for (var a3 = 1; a3 <= t.vế[2].mat; a3++) out.push(L(w - v, Y(v + a3 * b3), w, Y(v + a3 * b3), 'muc'));
    mui([[v / 2, h], [v / 2, v / 2], [w - v / 2, v / 2], [w - v / 2, v + d3]], 'xuong');
    out.push(T(v / 2 + 0.05, Y(v + (h - v) / 2), 0.16, 'LÊN', 'mui_ten'));
    return out;
  }

  /* Thang máy: hố thang, cabin lùi vào trong (Nam 23/10/2026: phải có cabin), gạch chéo trong cabin,
     cửa lùa hai cánh ở cạnh dưới (cạnh vào). */
  function thangMay(o) {
    var w = o.w, h = o.h, k = Math.min(0.15, w * 0.12, h * 0.12), cw = w - 2 * k, ch = h - 2 * k - 0.08;
    var cd = Math.min(0.8, cw * 0.7), x0 = (w - cd) / 2;
    return [
      R(0, 0, w, h, 'muc'),
      R(k, k, cw, ch, 'muc'),
      L(k, k, k + cw, k + ch, 'muc'), L(k + cw, k, k, k + ch, 'muc'),
      L(x0, h - 0.05, x0 + cd / 2 + 0.04, h - 0.05, 'muc'), L(x0 + cd / 2 - 0.04, h - 0.11, x0 + cd, h - 0.11, 'muc'),
      T(w / 2, k + ch / 2 - 0.02, 0.15, 'TM', 'nhan')
    ];
  }

  function hopGen(o) {
    var w = o.w, h = o.h, out = [R(0, 0, w, h, 'gen')], s = 0.09;
    for (var t = s; t < w + h; t += s) {
      var x1 = Math.max(0, t - h), y1 = Math.min(h, t), x2 = Math.min(w, t), y2 = Math.max(0, t - w);
      out.push(L(x1, y1, x2, y2, 'gen'));
    }
    out.push(T(w / 2, h / 2 + 0.06, Math.min(0.2, w * 0.6), 'G', 'gen_chu'));
    return out;
  }

  /* ---------- Khối WC tự bố trí ----------
     Khối là lọt lòng phòng WC. Thiết bị xếp thẳng hàng theo một cạnh dài ("tường ướt"): đầu xa là khu tắm,
     ngay sau đó hộp gen kỹ thuật sát tường ướt, rồi bồn cầu cạnh hộp gen (ống thoát ngắn nhất), lavabo gần cửa.
     Co giãn khối là tự xếp lại. Toạ độ (u dọc tường ướt từ đầu xa, v vuông góc từ tường ướt). Khối đứng (h ≥ w):
     tường ướt là cạnh trái, cửa ở cạnh dưới; khối nằm: tường ướt là cạnh trên. lat (của đồ vật) đổi tường ướt
     sang cạnh đối diện; dao đảo đầu (khu tắm về phía cạnh kia). */
  var TAM_VAT = 0.35, KINH_DAY = 0.03;
  var BX_W = 0.45, BX_S = 0.7, LV_W = 0.6, LV_S = 0.45, CACH_BX = 0.4, TRONG_TRUOC = 0.6;
  function so2(x) { return (Math.round(x * 100) / 100).toString().replace('.', ','); }
  function wcBoTri(o) {
    var w = Math.max(0.5, o.w || 1.5), h = Math.max(0.5, o.h || 2.4), doc = o.truc === 'doc' ? true : (o.truc === 'ngang' ? false : h >= w), L = doc ? h : w, D = doc ? w : h, dao = !!o.dao;
    var sen = ['kinh', 'vat', 'tu_do', 'bon', 'khong'].indexOf(o.sen) >= 0 ? o.sen : 'kinh';
    var parts = [], thieu = [], u = 0;
    var hop = function (u0, v0, du, dv) { // ô (u,v) → ô (x,y) trong khối
      var ua = dao ? L - u0 - du : u0;
      return doc ? { x: v0, y: ua, w: dv, h: du } : { x: ua, y: v0, w: du, h: dv };
    };
    var lung = function (sv) { return doc ? (sv > 0 ? 'trai' : 'phai') : (sv > 0 ? 'tren' : 'duoi'); };
    // Nam 23/10/2026: khối WC không có hộp gen; KTS tự thêm hộp gen (G) đúng chỗ khi cần
    var vTam = 0;
    if (sen === 'bon' && D - vTam < 1.4 - 1e-6) { thieu.push('Bồn tắm cần phòng rộng ít nhất ' + so2(1.4 + vTam) + ' m (đang ' + so2(D) + ' m). Đã đổi sang tắm đứng.'); sen = 'kinh'; }
    // tắm vát góc: góc 0,9 × 0,9 m sát tường ướt, vách kính hai cạnh + cạnh vát; phòng hẹp dưới 1,2 m thì vách thẳng
    if (sen === 'vat' && D < 1.2 - 1e-6) { thieu.push('Tắm vát góc cần phòng rộng ít nhất 1,2 m (đang ' + so2(D) + ' m). Đã đổi sang vách kính thẳng.'); sen = 'kinh'; }
    if (sen === 'vat') {
      parts.push({ ma: 'TD', vat: TAM_VAT, u0: 0, v0: 0, du: 0.9, dv: 0.9, hop: hop(0, 0, 0.9, 0.9) });
      u = 0.9;
    } else if (sen !== 'khong') {
      var s = sen === 'bon' ? 0.75 : 0.9;
      if (sen !== 'bon' && D - vTam < 0.8 - 1e-6) thieu.push('Khu tắm cần rộng ít nhất 0,8 m (đang ' + so2(D - vTam) + ' m).');
      parts.push({ ma: sen === 'bon' ? 'BT' : (sen === 'tu_do' ? 'SEN' : 'TD'), u0: 0, v0: vTam, du: s, dv: D - vTam, hop: hop(0, vTam, s, D - vTam) });
      u = s;
    }
    var cT = u + CACH_BX;
    parts.push({ ma: 'BX', u0: cT - BX_W / 2, v0: 0, du: BX_W, dv: BX_S, sv: 1, lung: lung(1), hop: hop(cT - BX_W / 2, 0, BX_W, BX_S) });
    var canDai = cT + CACH_BX;
    if (D - BX_S < TRONG_TRUOC - 1e-6) thieu.push('Trước bồn cầu chỉ còn ' + so2(Math.max(0, D - BX_S)) + ' m, nên để ít nhất 0,6 m. Nới phòng rộng thêm.');
    var cL = cT + CACH_BX + LV_W / 2 + 0.05;
    if (cL + LV_W / 2 <= L + 1e-6) {
      parts.push({ ma: 'LV', u0: cL - LV_W / 2, v0: 0, du: LV_W, dv: LV_S, sv: 1, lung: lung(1), hop: hop(cL - LV_W / 2, 0, LV_W, LV_S) });
      canDai = cL + LV_W / 2;
    } else if (D - BX_S - LV_S >= TRONG_TRUOC - 1e-6 && cT + LV_W / 2 <= L + 1e-6) {
      // không đủ dài: lavabo sang tường đối diện, ngang bồn cầu
      // lv (0–1): vị trí lavabo dọc tường đối diện, 0 = ngay sau khu tắm, 1 = sát đầu kia; trống = ngang bồn cầu
      var uMin = sen !== 'khong' ? (sen === 'bon' ? 0.75 : 0.9) + 0.02 : 0.02;
      var uL = typeof o.lv === 'number' ? uMin + Math.max(0, Math.min(1, o.lv)) * Math.max(0, L - LV_W - uMin) : cT - LV_W / 2;
      parts.push({ ma: 'LV', u0: uL, v0: D - LV_S, du: LV_W, dv: LV_S, sv: -1, lung: lung(-1), hop: hop(uL, D - LV_S, LV_W, LV_S) });
    } else {
      thieu.push('Chưa đủ chỗ cho lavabo: cần phòng dài ít nhất ' + so2(cL + LV_W / 2) + ' m (đang ' + so2(L) + ' m).');
    }
    if (canDai > L + 1e-6) thieu.push('Phòng ngắn: thiết bị cần dài ít nhất ' + so2(canDai) + ' m theo tường ướt (đang ' + so2(L) + ' m).');
    return { w: w, h: h, doc: doc, L: L, D: D, sen: sen, parts: parts, thieu: thieu };
  }
  function doiNet(nets, f, doi) { // f(x,y) → [x,y]; doi = đổi chiều rộng/cao (đối xứng qua đường chéo)
    return nets.map(function (q) {
      var o = {}; for (var k in q) o[k] = q[k];
      if (q.k === 'l') { var a = f(q.x1, q.y1), b = f(q.x2, q.y2); o.x1 = a[0]; o.y1 = a[1]; o.x2 = b[0]; o.y2 = b[1]; }
      else if (q.k === 'r') { var c = f(q.x, q.y), d = f(q.x + q.w, q.y + q.h); o.x = Math.min(c[0], d[0]); o.y = Math.min(c[1], d[1]); o.w = Math.abs(d[0] - c[0]); o.h = Math.abs(d[1] - c[1]); }
      else if (q.k === 'c' || q.k === 'e' || q.k === 'a') { var m = f(q.cx, q.cy); o.cx = m[0]; o.cy = m[1]; if (q.k === 'e' && doi) { o.rx = q.ry; o.ry = q.rx; } }
      else if (q.k === 'p') o.pts = q.pts.map(function (z) { return f(z[0], z[1]); });
      else if (q.k === 't') { var t = f(q.x, q.y); o.x = t[0]; o.y = t[1]; }
      return o;
    });
  }
  function veWC(o) {
    var b = wcBoTri(o), out = [];
    var uvXy = function (u, v) { var uu = o.dao ? b.L - u : u; return b.doc ? [v, uu] : [uu, v]; };
    b.parts.forEach(function (p) {
      var H = p.hop;
      if (p.ma === 'G') { out = out.concat(doiNet(hopGen({ w: H.w, h: H.h }), function (x, y) { return [H.x + x, H.y + y]; })); return; }
      if (p.ma === 'TD' && p.vat) { // tắm vát góc: tường ở u = 0 và v = 0, kính ở u = du, v = dv và cạnh vát
        var c = p.vat, d = KINH_DAY, k2 = d * (Math.SQRT2 - 1), mp = function (pts) { return pts.map(function (q) { return uvXy(q[0], q[1]); }); };
        out.push(P(mp([[0, 0], [p.du, 0], [p.du, p.dv - c], [p.du - c, p.dv], [0, p.dv]]), true, 'nuoc'));
        out.push(P(mp([[p.du - d, 0], [p.du - d, p.dv - c - k2], [p.du - c - k2, p.dv - d], [0, p.dv - d]]), false, 'nuoc'));
        var tv = uvXy(p.du * 0.4, p.dv * 0.4); out.push(C(tv[0], tv[1], 0.04, 'nuoc', true));
        return;
      }
      if (p.ma === 'TD') { // tắm đứng: vách kính ở ranh khu tắm, ga thoát giữa
        out.push(R(H.x, H.y, H.w, H.h, 'nuoc'));
        var g0 = uvXy(p.du, p.v0), g1 = uvXy(p.du, p.v0 + p.dv);
        out.push(L(g0[0], g0[1], g1[0], g1[1], 'nuoc'));
        var gm0 = uvXy(p.du - 0.03, p.v0), gm1 = uvXy(p.du - 0.03, p.v0 + p.dv);
        out.push(L(gm0[0], gm0[1], gm1[0], gm1[1], 'nuoc'));
        out.push(L(H.x, H.y, H.x + H.w, H.y + H.h, 'nuoc'), L(H.x + H.w, H.y, H.x, H.y + H.h, 'nuoc'), C(H.x + H.w / 2, H.y + H.h / 2, 0.04, 'nuoc', true));
        return;
      }
      if (p.ma === 'SEN') { out.push(R(H.x, H.y, H.w, H.h, 'nuoc', false, true), C(H.x + H.w / 2, H.y + H.h / 2, 0.04, 'nuoc', true)); return; }
      if (p.ma === 'BT') { out.push(R(H.x, H.y, H.w, H.h, 'nuoc'), R(H.x + 0.08, H.y + 0.08, Math.max(0.05, H.w - 0.16), Math.max(0.05, H.h - 0.16), 'nuoc')); var dr = uvXy(p.du / 2, p.v0 + 0.25); out.push(C(dr[0], dr[1], 0.035, 'nuoc', true)); return; }
      // bồn cầu, lavabo: vẽ theo hình gốc (lưng ở cạnh trên), đưa lưng về tường
      var hinh = LIB[p.ma].ve({ w: p.du, h: p.dv });
      out = out.concat(doiNet(hinh, function (fx, fy) { return uvXy(p.u0 + fx, p.sv > 0 ? p.v0 + fy : p.v0 + p.dv - fy); }, b.doc));
    });
    return out;
  }

  /* ---------- Tắm đứng vát góc (đồ rời) ----------
     Tường ở cạnh trên (y = 0) và cạnh trái (x = 0); vách kính ở cạnh phải, cạnh dưới và cạnh vát góc
     dưới-phải (cửa kính ở cạnh vát). o.vat = độ vát (m, mặc định 0,35). */
  function tamVatGoc(o) {
    var w = o.w, h = o.h, c = Math.max(0.15, Math.min(o.vat || TAM_VAT, Math.min(w, h) - 0.2)), d = KINH_DAY, k2 = d * (Math.SQRT2 - 1);
    return [P([[0, 0], [w, 0], [w, h - c], [w - c, h], [0, h]], true, 'nuoc'),
      P([[w - d, 0], [w - d, h - c - k2], [w - c - k2, h - d], [0, h - d]], false, 'nuoc'),
      C(w * 0.4, h * 0.4, 0.04, 'nuoc', true)];
  }
  /* ---------- Vách kính (có thể kèm cửa kính) ----------
     Dài theo o.w, dày cố định 0,10 m (khung + kính). o.cua: 'khong' | 'mo' (cửa kính mở quay) | 'lua' (cửa kính lùa);
     o.rc: bề rộng cửa (0,6–1,2 m); o.vt: 'dau' (cửa ở đầu trái) | 'giua'. Cánh mở về phía y > 0 (mặt trước). */
  var VK_DAY = 0.1;
  function vachKinh(o) {
    var w = o.w, h = VK_DAY, y1 = h * 0.35, y2 = h * 0.65, out = [];
    var cua = o.cua === 'mo' || o.cua === 'lua' ? o.cua : 'khong', rc = Math.max(0.5, Math.min(o.rc || 0.7, w - 0.2));
    var x0 = cua === 'khong' ? w : (o.vt === 'giua' ? (w - rc) / 2 : 0.05), x1 = x0 + (cua === 'khong' ? 0 : rc);
    var doan = function (a, b) { if (b - a > 0.01) out.push(L(a, y1, b, y1, 'nuoc'), L(a, y2, b, y2, 'nuoc'), L(a, y1, a, y2, 'nuoc'), L(b, y1, b, y2, 'nuoc')); };
    doan(0, x0); doan(x1, w);
    if (cua === 'mo') {
      out.push(L(x0, h / 2, x0, h / 2 + rc, 'cua'), A(x0, h / 2, rc, 0, 90, 'cua'), C(x0, h / 2, 0.015, 'cua', true));
    } else if (cua === 'lua') { // tấm kính lùa chạy sát mặt trước, chồng lên phần kính cố định 5 cm
      var lx0 = x0 - 0.05 < 0 ? 0 : x0 - 0.05;
      out.push(R(lx0, h * 0.72, Math.min(w, x1 + 0.05) - lx0, h * 0.2, 'cua'), L(x0 + rc * 0.25, h + 0.08, x0 + rc * 0.75, h + 0.08, 'mui_ten'),
        L(x0 + rc * 0.75, h + 0.08, x0 + rc * 0.68, h + 0.05, 'mui_ten'), L(x0 + rc * 0.75, h + 0.08, x0 + rc * 0.68, h + 0.11, 'mui_ten'));
    }
    return out;
  }
  /* ---------- Kệ tivi: sâu 0,45 m, tivi đặt trên kệ (sát lưng kệ) ---------- */
  function tivi(x, y, w) { return [R(x, y, w, 0.06, 'muc', true), R(x + w * 0.38, y + 0.06, w * 0.24, 0.12, 'muc')]; }
  function keTivi(o) {
    var out = [R(0, 0, o.w, o.h, 'go'), L(0.04, o.h - 0.04, o.w - 0.04, o.h - 0.04, 'go')];
    if (o.tivi !== false) { var tw = Math.min(o.w - 0.1, TIVI_MAC_DINH); out = out.concat(tivi((o.w - tw) / 2, 0.06, tw)); }
    return out;
  }
  var TIVI_MAC_DINH = 1.25; // tivi 55 inch ngang khoảng 1,23 m

  /* ---------- Khối CAD (thư viện mở rộng, nạp từ thu-vien-cad.json khi KTS mở) ---------- */
  var CAD = {};
  function veCad(o) {
    var k = CAD[o.cad];
    if (!k) return [R(0, 0, o.w, o.h, 'nhan', false, true), T(o.w / 2, o.h / 2 + 0.05, Math.min(0.15, o.w * 0.3), 'CAD', 'nhan')];
    var sx = o.w / (k.w / 1000), sy = o.h / (k.h / 1000);
    return k.p.map(function (fl) {
      var pts = [];
      for (var i = 0; i < fl.length; i += 2) pts.push([fl[i] / 1000 * sx, fl[i + 1] / 1000 * sy]);
      return P(pts, false, 'muc');
    });
  }
  function napCad(d) {
    var ds = [];
    (d && d.khoi || []).forEach(function (k) {
      if (!k || typeof k.ma !== 'string' || !Array.isArray(k.p) || !(k.w > 0) || !(k.h > 0)) return;
      CAD[k.ma] = k;
      LIB['CAD:' + k.ma] = { ten: String(k.ten || k.ma), nhom: 'CAD', nhom_cad: String(k.nhom || 'Khác'), w: k.w / 1000, h: k.h / 1000, cad: k.ma,
        tao: { ma: 'CAD', cad: k.ma }, ve: (function (ma) { return function (o) { return veCad({ w: o.w, h: o.h, cad: ma }); }; })(k.ma) };
      ds.push('CAD:' + k.ma);
    });
    return ds;
  }

  var LIB = {
    /* ---- lên xuống, kết cấu, kỹ thuật (khoá với chủ nhà) ---- */
    TH: { ten: 'Cầu thang một vế', nhom: 'Lên xuống & kỹ thuật', w: 1.0, h: 5.4, khoa: true, thang: true, ve: cauThang,
      mo: 'Mũi tên chạy suốt vế: đuôi chạm mép bậc đầu, mũi chạm mép bậc cuối. Bậc 17–22, mặc định 21, mặt bậc 0,27 m.' },
    TH2: { ten: 'Cầu thang hai vế', nhom: 'Lên xuống & kỹ thuật', w: 2.1, h: 3.7, khoa: true, tao: { ma: 'TH', kieu: 'U' },
      ve: function (o) { return cauThang({ w: o.w, h: o.h, n: o.n, kieu: 'U' }); } },
    TH3: { ten: 'Cầu thang ba vế', nhom: 'Lên xuống & kỹ thuật', w: 3.35, h: 2.9, khoa: true, tao: { ma: 'TH', kieu: 'U3' },
      ve: function (o) { return cauThang({ w: o.w, h: o.h, n: o.n, kieu: 'U3', ve: 1.0 }); } },
    TM: { ten: 'Thang máy', nhom: 'Lên xuống & kỹ thuật', w: 1.6, h: 1.6, khoa: true, ve: thangMay,
      mo: 'Hố thang, cabin bên trong, cửa lùa hai cánh ở cạnh vào.' },
    G: { ten: 'Hộp gen kỹ thuật', nhom: 'Lên xuống & kỹ thuật', w: 0.4, h: 0.6, khoa: true, ve: hopGen,
      mo: 'Ô hẹp sát tường, gạch chéo, chữ G. Đi ống thoát và đường kỹ thuật.' },
    GT: { ten: 'Giếng trời', nhom: 'Lên xuống & kỹ thuật', w: 1.5, h: 1.5, khoa: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'muc', false, true), L(0, 0, o.w, o.h, 'muc', true), L(o.w, 0, 0, o.h, 'muc', true)];
    }, mo: 'Viền nét đứt, dấu X nét đứt.' },
    COT: { ten: 'Cột', nhom: 'Lên xuống & kỹ thuật', w: 0.22, h: 0.22, khoa: true, ve: function (o) { return [R(0, 0, o.w, o.h, 'muc', true)]; } },

    /* ---- vệ sinh ---- */
    WC: { ten: 'Khối WC tự bố trí', nhom: 'Vệ sinh', w: 1.5, h: 2.4, khoi_wc: true, ve: veWC,
      mo: 'Thả vào phòng WC là tự vừa khít. Kéo giãn hay thu nhỏ thì thiết bị tự xếp lại: khu tắm ở đầu xa, hộp gen sát tường, bồn cầu cạnh hộp gen, lavabo gần cửa.' },
    BX: { ten: 'Bồn cầu', nhom: 'Vệ sinh', w: 0.45, h: 0.7, bam: true, ve: function (o) {
      return [R(0.02, 0, o.w - 0.04, 0.2, 'nuoc'), E(o.w / 2, 0.2 + (o.h - 0.2) / 2, o.w / 2 - 0.04, (o.h - 0.2) / 2, 'nuoc')];
    } },
    LV: { ten: 'Lavabo', nhom: 'Vệ sinh', w: 0.6, h: 0.45, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'nuoc'), E(o.w / 2, o.h * 0.55, o.w * 0.32, o.h * 0.28, 'nuoc'), C(o.w / 2, o.h * 0.25, 0.02, 'nuoc', true)];
    } },
    TD: { ten: 'Tắm đứng', nhom: 'Vệ sinh', w: 0.9, h: 0.9, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'nuoc'), L(0, 0, o.w, o.h, 'nuoc'), L(o.w, 0, 0, o.h, 'nuoc'), C(o.w / 2, o.h / 2, 0.04, 'nuoc', true)];
    } },
    TDV: { ten: 'Tắm đứng vát góc', nhom: 'Vệ sinh', w: 0.9, h: 0.9, bam: true, ve: tamVatGoc,
      mo: 'Đặt vào góc phòng tắm: hai cạnh sát tường, vách kính hai cạnh còn lại, cửa kính ở cạnh vát.' },
    VK: { ten: 'Vách kính, cửa kính', nhom: 'Vệ sinh', w: 1.5, h: VK_DAY, sau: VK_DAY, ve: vachKinh, vach: true,
      mo: 'Vách kính dày 0,10 m, kéo dài theo thiết kế. Chọn cửa kính mở quay hoặc lùa ngay trên bảng.' },
    BT: { ten: 'Bồn tắm', nhom: 'Vệ sinh', w: 1.6, h: 0.75, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'nuoc'), R(0.08, 0.08, o.w - 0.16, o.h - 0.16, 'nuoc'), C(0.25, o.h / 2, 0.035, 'nuoc', true)];
    } },

    /* ---- bếp ---- */
    TB: { ten: 'Tủ bếp dưới', nhom: 'Bếp', w: 2.4, h: 0.6, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'go'), L(0, o.h - 0.04, o.w, o.h - 0.04, 'go')];
    } },
    BN: { ten: 'Bếp nấu', nhom: 'Bếp', w: 0.75, h: 0.6, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'go'), C(o.w * 0.3, o.h / 2, Math.min(o.w, o.h) * 0.2, 'go'), C(o.w * 0.7, o.h / 2, Math.min(o.w, o.h) * 0.2, 'go')];
    } },
    CR: { ten: 'Chậu rửa', nhom: 'Bếp', w: 0.8, h: 0.6, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'nuoc'), R(0.1, 0.1, o.w - 0.2, o.h - 0.18, 'nuoc'), C(o.w / 2, o.h / 2, 0.025, 'nuoc', true)];
    } },
    TL: { ten: 'Tủ lạnh', nhom: 'Bếp', w: 0.7, h: 0.7, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'go'), T(o.w / 2, o.h / 2 + 0.06, 0.18, 'TL', 'go')];
    } },

    /* ---- nội thất ---- */
    GD: { ten: 'Giường đôi', nhom: 'Nội thất', w: 1.6, h: 2.0, bam: true, ve: function (o) {
      var g = (o.w - 0.3) / 2;
      return [R(0, 0, o.w, o.h, 'go'), R(0.1, 0.08, g, 0.32, 'go'), R(o.w - 0.1 - g, 0.08, g, 0.32, 'go'), L(0, 0.6, o.w, 0.6, 'go')];
    } },
    GN: { ten: 'Giường đơn', nhom: 'Nội thất', w: 1.2, h: 2.0, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'go'), R(0.15, 0.08, o.w - 0.3, 0.32, 'go'), L(0, 0.6, o.w, 0.6, 'go')];
    } },
    TA: { ten: 'Tủ áo', nhom: 'Nội thất', w: 1.8, h: 0.6, sau: 0.6, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'go'), L(0.05, o.h / 2, o.w - 0.05, o.h / 2, 'go', true), L(0, o.h, o.w, 0, 'go')];
    }, mo: 'Tủ áo luôn sâu 0,60 m. Kéo góc chỉ đổi chiều dài theo thiết kế.' },
    TDG: { ten: 'Tab đầu giường', nhom: 'Nội thất', w: 0.45, h: 0.4, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'go'), C(o.w / 2, o.h / 2, Math.min(o.w, o.h) * 0.22, 'go'), L(o.w / 2 - 0.05, o.h / 2, o.w / 2 + 0.05, o.h / 2, 'go'), L(o.w / 2, o.h / 2 - 0.05, o.w / 2, o.h / 2 + 0.05, 'go')];
    }, mo: 'Đặt hai bên đầu giường, lưng sát tường.' },
    SF: { ten: 'Sofa', nhom: 'Nội thất', w: 2.2, h: 0.9, bam: true, ve: function (o) {
      var t = 0.18;
      return [P([[0, 0], [o.w, 0], [o.w, o.h], [o.w - t, o.h], [o.w - t, t + 0.12], [t, t + 0.12], [t, o.h], [0, o.h]], true, 'go'), L(t, o.h, o.w - t, o.h, 'go')];
    } },
    BA: { ten: 'Bàn ăn 6 ghế', nhom: 'Nội thất', w: 1.6, h: 1.9, ve: function (o) {
      var out = [R(0.1, 0.5, o.w - 0.2, o.h - 1.0, 'go')], cw = 0.42, s = (o.w - 3 * cw) / 4;
      for (var i = 0; i < 3; i++) {
        var x = s + i * (cw + s);
        out.push(R(x, 0.05, cw, 0.4, 'go'), R(x, o.h - 0.45, cw, 0.4, 'go'));
      }
      return out;
    } },
    BL: { ten: 'Bàn làm việc', nhom: 'Nội thất', w: 1.2, h: 0.6, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'go'), C(o.w / 2, o.h + 0.28, 0.22, 'go')];
    } },
    TV: { ten: 'Kệ tivi', nhom: 'Nội thất', w: 1.8, h: 0.45, sau: 0.45, bam: true, ve: keTivi,
      mo: 'Kệ sâu 0,45 m, tivi đặt trên kệ sát lưng. Kéo góc chỉ đổi chiều dài kệ.' },
    TVR: { ten: 'Tivi rời', nhom: 'Nội thất', w: 1.25, h: 0.18, sau: 0.18, bam: true, ve: function (o) { return tivi(0, 0, o.w); },
      mo: 'Tivi treo tường hoặc đặt lên kệ, tủ có sẵn. Bề ngang mặc định 1,25 m (tivi 55 inch).' },
    BC: { ten: 'Bồn cây', nhom: 'Nội thất', w: 1.2, h: 0.5, ve: function (o) {
      var out = [R(0, 0, o.w, o.h, 'cay')], r = Math.min(o.h, 0.6) * 0.32;
      for (var x = r + 0.08; x < o.w - r; x += r * 2.6) out.push(C(x, o.h / 2, r, 'cay'));
      return out;
    } },

    /* khối CAD đã đặt lên bản vẽ (it.cad = tên block); món chọn được nằm trong LIB['CAD:<tên>'] sau khi nạp */
    CAD: { ten: 'Khối CAD', nhom: 'CAD_GOC', w: 1, h: 1, ve: veCad },

    /* ---- ghi chú ---- */
    VAO: { ten: 'Lối vào chính', nhom: 'Ghi chú', w: 0.6, h: 0.9, ve: function (o) {
      return [L(o.w / 2, 0, o.w / 2, o.h * 0.5, 'mui_ten'), P([[0.06, o.h * 0.5], [o.w - 0.06, o.h * 0.5], [o.w / 2, o.h]], true, 'mui_ten', true)];
    } },
    BAC: { ten: 'Hướng Bắc', nhom: 'Ghi chú', w: 0.9, h: 0.9, ve: function (o) {
      var c = o.w / 2, r = o.w * 0.4;
      return [C(c, o.h / 2 + 0.05, r, 'muc'), P([[c, o.h / 2 + 0.05 - r], [c + 0.12, o.h / 2 + 0.2], [c, o.h / 2 + 0.12], [c - 0.12, o.h / 2 + 0.2]], true, 'muc', true), T(c, 0.0, 0.2, 'N', 'muc')];
    } }
  };

  /* Cửa đi và cửa sổ — kích thước PHỦ BÌ theo ký hiệu ALN (Nam duyệt 17/10/2026) */
  var CUA = {
    D1: { ten: 'Cửa đi 1 cánh', w: 0.91, min: 0.7, max: 1.0, loai: 'di', canh: 1 },
    Dw: { ten: 'Cửa WC', w: 0.81, min: 0.7, max: 0.9, loai: 'di', canh: 1 },
    D2: { ten: 'Cửa đi 2 cánh', w: 1.4, min: 1.2, max: 1.6, loai: 'di', canh: 2 },
    D4: { ten: 'Cửa xếp 4 cánh', w: 2.4, min: 1.6, max: 3.2, loai: 'di', xep: true },
    DL: { ten: 'Cửa lùa', w: 1.6, min: 0.8, max: 3.2, loai: 'di', lua: true },
    Dob: { ten: 'Cửa phòng ông bà', w: 1.0, min: 1.0, max: 1.1, loai: 'di', canh: 1, ghi: 'ob' },
    LM: { ten: 'Lỗ mở không cánh', w: 0.9, min: 0.6, max: 4.0, loai: 'di', lo: true },
    S1: { ten: 'Cửa sổ 1 cánh', w: 0.6, min: 0.4, max: 0.8, loai: 'so', song: 0 },
    S2: { ten: 'Cửa sổ 2 cánh', w: 1.4, min: 1.2, max: 1.6, loai: 'so', song: 1 },
    S4: { ten: 'Cửa sổ 4 cánh', w: 2.0, min: 1.6, max: 2.4, loai: 'so', song: 3 }
  };

  var NHOM = ['Vệ sinh', 'Bếp', 'Nội thất', 'Lên xuống & kỹ thuật', 'Ghi chú'];

  window.ALNKyHieu = { LIB: LIB, CAD: CAD, napCad: napCad, VK_DAY: VK_DAY, CUA: CUA, NHOM: NHOM, thangBoTri: thangBoTri, thangKichThuoc: thangKichThuoc, wcBoTri: wcBoTri, MAT_BAC_ALN: MAT_BAC_ALN, ve: function (ma, o) { var s = LIB[ma]; return s ? s.ve(o) : []; } };
})();
