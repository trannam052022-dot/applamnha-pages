/* ALN · Dựng mặt bằng — trình chỉnh cho chủ nhà và KTS (23/10/2026)
 * Chạy hoàn toàn trên trình duyệt, không gửi bản vẽ lên máy chủ. Lưu tự động trong máy (localStorage).
 * Dữ liệu (đơn vị mét, gốc tuỳ ý, trục y hướng xuống như trên màn hình):
 *   nodes {id:{x,y}}               điểm nối tường (tường chung điểm thì kéo cùng nhau)
 *   walls [{id,a,b,t,khoa}]         tường từ nút a tới nút b, dày t; khoa = chủ nhà không kéo được
 *   ops   [{id,w,s,rong,ma,ban_le,phia}]  cửa trên tường w, tâm cách nút a một đoạn s
 *   items [{id,ma,cx,cy,w,h,rot,lat,khoa,...}]  thiết bị theo mã trong dung-ky-hieu.js
 *   phong [{id,ten,x,y}]            tên phòng; diện tích tính bằng cách tô loang từ điểm đặt tên
 *   ghi   [{id,x,y,nd}]             ghim ghi chú
 *   ranh  [[x,y]...]                ranh lô (khép kín), chỉ để tính diện tích hiên/sân
 * Mọi chữ hiển thị đi qua textContent; không ghép chuỗi HTML.
 */
(function () {
  'use strict';
  var KH = window.ALNKyHieu, LIB = KH.LIB, CUA = KH.CUA;
  var NS = 'http://www.w3.org/2000/svg';
  var KHOA_LUU = 'aln_dung_mb_v1', KHOA_PB = 'aln_dung_mb_pb_v1', KHOA_HD = 'aln_dung_mb_hd_v1', KHOA_ANH = 'aln_dung_mb_anh_v1';
  var LUOI = 0.05;          // bước bắt điểm 5 cm
  var O = 0.05;             // ô lưới tính diện tích 5 × 5 cm
  var MAU = { muc: '#1a2634', go: '#8a5a1c', nuoc: '#2f6fb0', gen: '#b4532a', gen_chu: '#b4532a', cay: '#2f6b3e', nhan: '#5b6b7f', mui_ten: '#1f5fa8', tuong: '#1a2634', cua: '#a8650a', so: '#1f5fa8', chon: '#1f5fa8', khoa: '#b8860b', do: '#b42318', vang: '#c27c00', goi_y: '#1f5fa8' };
  var FONT = "'Be Vietnam Pro',Arial,sans-serif";
  var TEN_NHANH = ['Phòng khách', 'Phòng ăn', 'Bếp', 'Phòng ngủ', 'PN master', 'WC', 'Hành lang', 'Sảnh', 'Phòng thờ', 'Kho', 'Giặt phơi', 'Gara', 'Hiên', 'Sân'];

  var $ = function (id) { return document.getElementById(id); };
  var svg = $('banVe');

  /* ================= trạng thái ================= */
  var plan = null, sel = null, cong = 'chon', datMa = null, maCua = 'D1', maSo = 'S2', dayTuongMoi = 0.1;
  var cheDo = 'chu';           // 'chu' chủ nhà | 'kts'
  var view = { x: -2, y: -2, s: 60 };   // s = điểm ảnh / mét
  var lichSu = [], tienLai = [];
  var phanTichCache = null;
  var veTuong = null;          // nét tường đang vẽ {a:{x,y,nut,tuong}, ...}
  var keo = null;              // thao tác kéo đang diễn ra
  var conTro = new Map();      // ngón tay / chuột đang chạm
  var theDangMo = 'chon';
  var anh = null;              // ảnh nền để đồ lại {src, cx, cy, w, h, rot, mo, an, tyLe} — không vào bản vẽ, không xuất file
  var doAnh = null;            // đang đặt tỷ lệ ảnh: [điểm 1, điểm 2]

  /* ================= tiện ích ================= */
  function tron(v, b) { b = b || LUOI; return Math.round(v / b) * b; }
  function so(v, n) { n = n === undefined ? 2 : n; return (Math.round(v * Math.pow(10, n)) / Math.pow(10, n)).toFixed(n).replace('.', ','); }
  function docSo(s) { var v = parseFloat(String(s).replace(',', '.')); return isFinite(v) ? v : null; }
  function kc(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function idMoi(tienTo) { plan.seq = (plan.seq || 0) + 1; return tienTo + plan.seq; }
  function nut(id) { return plan.nodes[id]; }
  function tuong(id) { for (var i = 0; i < plan.walls.length; i++) if (plan.walls[i].id === id) return plan.walls[i]; return null; }
  function timTheo(ds, id) { for (var i = 0; i < ds.length; i++) if (ds[i].id === id) return ds[i]; return null; }
  function hinh(w) {
    var A = nut(w.a), B = nut(w.b), len = kc(A, B) || 1e-9, ux = (B.x - A.x) / len, uy = (B.y - A.y) / len;
    return { A: A, B: B, len: len, ux: ux, uy: uy, nx: -uy, ny: ux };
  }
  function chieu(p, g) { return (p.x - g.A.x) * g.ux + (p.y - g.A.y) * g.uy; }
  function lech(p, g) { return (p.x - g.A.x) * g.nx + (p.y - g.A.y) * g.ny; }
  function dsTuongTaiNut(id) { return plan.walls.filter(function (w) { return w.a === id || w.b === id; }); }
  function khoa(o) { return cheDo !== 'kts' && !!(o && o.khoa); }
  function ga(ten, ts) { try { if (window.gtag) window.gtag('event', ten, ts || {}); } catch (e) { /* bỏ qua */ } }
  function el(ten, ts, cha) {
    var e = document.createElementNS(NS, ten);
    if (ts) for (var k in ts) if (Object.prototype.hasOwnProperty.call(ts, k) && ts[k] !== undefined && ts[k] !== null) e.setAttribute(k, String(ts[k]));
    if (cha) cha.appendChild(e);
    return e;
  }
  function h(ten, ts, con) {
    var e = document.createElement(ten);
    if (ts) for (var k in ts) {
      if (!Object.prototype.hasOwnProperty.call(ts, k) || ts[k] === undefined || ts[k] === null) continue;
      if (k === 'text') e.textContent = ts[k];
      else if (k === 'cls') e.className = ts[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), ts[k]);
      else e.setAttribute(k, ts[k]);
    }
    (con || []).forEach(function (c) { if (c === null || c === undefined) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function icon(d) {
    var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    d.split('|').forEach(function (p) { el('path', { d: p }, s); });
    return s;
  }
  var IC = {
    khoa: 'M7 11V7a5 5 0 0 1 10 0v4|M5 11h14v10H5z',
    xoay: 'M20 12a8 8 0 1 1-2.3-5.6|M20 4v5h-5',
    lat: 'M12 3v18|M9 7 4 12l5 5|M15 7l5 5-5 5',
    nhan: 'M8 8h12v12H8z|M4 16V4h12',
    xoa: 'M4 7h16|M9 7V4h6v3|M6 7l1 13h10l1-13',
    goc: 'M4 4v16h16|M8 16l8-8',
    cua: 'M3 20h4M17 20h4|M7 20V6|M7 6a14 14 0 0 1 10 14',
    so: 'M3 12h3M18 12h3|M6 9h12M6 12h12M6 15h12',
    thuoc: 'M3 17 17 3l4 4L7 21z|M7 13l2 2M10 10l2 2M13 7l2 2',
    tuong: 'M3 9h18v6H3z',
    keo: 'M12 3v18M3 12h18|M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',
    mat: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z|M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    anh: 'M3 5h18v14H3z|M3 16l5-5 4 4 3-3 6 6|M15 9h.01'
  };

  /* ================= dựng từ đoạn tường ================= */
  function taoTuDoan(doan) {
    var nodes = {}, walls = [], seq = 0, ds = [];
    function nutTai(p) {
      for (var i = 0; i < ds.length; i++) if (Math.abs(ds[i].x - p[0]) < 1e-6 && Math.abs(ds[i].y - p[1]) < 1e-6) return ds[i].id;
      var id = 'n' + (++seq); nodes[id] = { x: p[0], y: p[1] }; ds.push({ id: id, x: p[0], y: p[1] }); return id;
    }
    doan.forEach(function (d) { nutTai(d.a); nutTai(d.b); });
    doan.forEach(function (d) {
      var ax = d.a[0], ay = d.a[1], bx = d.b[0], by = d.b[1], len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
      var tren = ds.filter(function (n) {
        var t = (n.x - ax) * ux + (n.y - ay) * uy, l = Math.abs((n.x - ax) * -uy + (n.y - ay) * ux);
        return l < 1e-6 && t > 1e-6 && t < len - 1e-6;
      }).map(function (n) { return { id: n.id, t: (n.x - ax) * ux + (n.y - ay) * uy }; }).sort(function (p, q) { return p.t - q.t; });
      var chuoi = [nutTai(d.a)].concat(tren.map(function (n) { return n.id; }), [nutTai(d.b)]);
      for (var i = 0; i < chuoi.length - 1; i++) walls.push({ id: 'w' + (++seq), a: chuoi[i], b: chuoi[i + 1], t: d.t, khoa: !!d.khoa });
    });
    return { nodes: nodes, walls: walls, seq: seq };
  }
  // cửa cho bằng toạ độ thật: p1, p2 hai mép; banLe = điểm bản lề (một trong hai mép); huong = một điểm phía cánh mở
  function themCuaToaDo(p, c) {
    var mid = { x: (c.p1[0] + c.p2[0]) / 2, y: (c.p1[1] + c.p2[1]) / 2 }, tot = null, d0 = 1e9;
    p.walls.forEach(function (w) {
      var A = p.nodes[w.a], B = p.nodes[w.b], len = kc(A, B), ux = (B.x - A.x) / len, uy = (B.y - A.y) / len;
      var t = (mid.x - A.x) * ux + (mid.y - A.y) * uy, l = Math.abs((mid.x - A.x) * -uy + (mid.y - A.y) * ux);
      if (t > 0 && t < len && l < d0) { d0 = l; tot = { w: w, A: A, ux: ux, uy: uy, t: t }; }
    });
    if (!tot || d0 > 0.2) return;
    var rong = Math.hypot(c.p2[0] - c.p1[0], c.p2[1] - c.p1[1]), s = tot.t;
    var op = { id: 'o' + (++p.seq), w: tot.w.id, s: s, rong: rong, ma: c.ma, ban_le: 'a', phia: 1 };
    if (c.banLe) {
      var tb = (c.banLe[0] - tot.A.x) * tot.ux + (c.banLe[1] - tot.A.y) * tot.uy;
      op.ban_le = tb < s ? 'a' : 'b';
    }
    if (c.huong) {
      var nx = -tot.uy, ny = tot.ux;
      op.phia = ((c.huong[0] - mid.x) * nx + (c.huong[1] - mid.y) * ny) >= 0 ? 1 : -1;
    }
    p.ops.push(op);
  }
  function themDo(p, ma, x, y, w, h, rot, ext) {
    var r = rot || 0, ww = (r % 180 === 0) ? w : h, hh = (r % 180 === 0) ? h : w;
    var it = { id: 'i' + (++p.seq), ma: ma, cx: x + ww / 2, cy: y + hh / 2, w: w, h: h, rot: r, lat: false, khoa: !!(LIB[ma] && LIB[ma].khoa) };
    if (ext) for (var k in ext) if (Object.prototype.hasOwnProperty.call(ext, k)) it[k] = ext[k];
    p.items.push(it);
  }

  /* Mặt bằng mẫu: nhà 12 × 8 m (+1 m khối giữa) dựng lại từ bản phác tay của KTS Trần Long ngày 23/10/2026. */
  function matBangMau() {
    var E = 0.2, I = 0.1, seg = function (a, b, t, k) { return { a: a, b: b, t: t, khoa: k }; };
    var g = taoTuDoan([
      seg([0, 0], [0, 8], E, true), seg([0, 0], [3, 0], E, true), seg([3, -1], [3, 0], E, true), seg([3, -1], [6.5, -1], E, true),
      seg([6.5, -1], [6.5, 0], E, true), seg([6.5, 0], [11, 0], E, true), seg([11, 0], [11, 4], E, true), seg([9, 4], [12, 4], E, true),
      seg([12, 4], [12, 7.5], E, true), seg([8, 7.5], [12, 7.5], E, true), seg([8, 5.7], [8, 8], E, true), seg([0, 8], [8, 8], E, true),
      seg([6.5, 0], [6.5, 4], I, false), seg([3, 0], [3, 3], I, false), seg([0, 3], [3, 3], I, false), seg([0, 4], [6.5, 4], I, false),
      seg([0, 6], [2, 6], I, false), seg([2, 4], [2, 8], I, false), seg([5, 4], [5, 8], I, false), seg([6.5, 4], [6.5, 5.7], I, false),
      seg([5, 5.7], [9, 5.7], I, false), seg([9, 4], [9, 5.7], I, false)
    ]);
    var p = { phien_ban: 1, ten: 'Nhà 12 × 8 m — dựng từ bản phác 23/10', nodes: g.nodes, walls: g.walls, seq: g.seq, ops: [], items: [], phong: [], ghi: [], ranh: [[0, -1], [12, -1], [12, 8], [0, 8]] };
    [
      { ma: 'D1', p1: [1.6, 3], p2: [2.4, 3], banLe: [2.4, 3], huong: [2, 2.5] },
      { ma: 'D1', p1: [6.5, 0.9], p2: [6.5, 1.7], banLe: [6.5, 0.9], huong: [6, 1.3] },
      { ma: 'D1', p1: [0, 3.1], p2: [0, 3.9], banLe: [0, 3.9], huong: [0.5, 3.5] },
      { ma: 'Dw', p1: [0.9, 4], p2: [1.6, 4], banLe: [0.9, 4], huong: [1.2, 4.5] },
      { ma: 'D1', p1: [2.2, 4], p2: [3.0, 4], banLe: [2.2, 4], huong: [2.6, 4.5] },
      { ma: 'Dw', p1: [2, 6.0], p2: [2, 6.7], banLe: [2, 6.7], huong: [1.5, 6.3] },
      { ma: 'D1', p1: [5.6, 4], p2: [6.4, 4], banLe: [6.4, 4], huong: [6, 4.5] },
      { ma: 'D1', p1: [5.5, 5.7], p2: [6.3, 5.7], banLe: [5.5, 5.7], huong: [5.9, 6.2] },
      { ma: 'D1', p1: [9, 4.1], p2: [9, 4.9], banLe: [9, 4.1], huong: [9.5, 4.5] },
      { ma: 'D4', p1: [11, 1.0], p2: [11, 3.4], huong: [11.5, 2] },
      { ma: 'S2', p1: [1.6, 0], p2: [2.8, 0], huong: [2, -0.5] },
      { ma: 'S2', p1: [4.0, -1], p2: [5.4, -1], huong: [4.7, -1.5] },
      { ma: 'S4', p1: [7.9, 0], p2: [9.9, 0], huong: [8.9, -0.5] },
      { ma: 'S2', p1: [2.6, 8], p2: [3.9, 8], huong: [3, 8.5] },
      { ma: 'S1', p1: [0.6, 8], p2: [1.2, 8], huong: [1, 8.5] },
      { ma: 'S2', p1: [6.0, 8], p2: [7.2, 8], huong: [6.6, 8.5] },
      { ma: 'S2', p1: [9.6, 7.5], p2: [10.8, 7.5], huong: [10, 8] }
    ].forEach(function (c) { themCuaToaDo(p, c); });
    themDo(p, 'GD', 0.1, 0.1, 1.6, 2.0, 0);
    themDo(p, 'BL', 1.8, 0.1, 1.1, 0.55, 0);
    themDo(p, 'G', 2.55, 1.4, 0.4, 1.55, 0);
    themDo(p, 'BA', 3.95, 0.65, 1.6, 1.9, 90);
    themDo(p, 'G', 1.5, 4.05, 0.45, 1.9, 0);
    themDo(p, 'GD', 3.35, 6.0, 1.6, 1.9, 180);
    themDo(p, 'BL', 2.1, 7.3, 1.2, 0.55, 180);
    themDo(p, 'G', 5.05, 4.05, 0.4, 1.6, 0);
    themDo(p, 'GN', 5.95, 6.3, 1.2, 1.95, 90);
    themDo(p, 'G', 8.1, 5.75, 0.55, 1.7, 0);
    themDo(p, 'GD', 10.3, 5.5, 1.6, 1.9, 180);
    themDo(p, 'BL', 9.05, 6.85, 1.1, 0.5, 180);
    themDo(p, 'BC', 6.6, -0.95, 5.3, 0.85, 0);
    themDo(p, 'BC', 8.1, 7.62, 3.85, 0.33, 0);
    themDo(p, 'VAO', 12.15, 1.85, 0.6, 0.9, 90);
    themDo(p, 'BAC', 12.6, -2.1, 0.9, 0.9, 0);
    [['PN1', 2.2, 2.45], ['Phòng ăn', 4.75, -0.45], ['Hành lang', 1.05, 3.5], ['Phòng khách', 8.75, 2.1], ['Hiên', 11.5, 0.45],
      ['WC1', 0.75, 5.0], ['WC2', 1.0, 7.0], ['PN2', 3.55, 5.0], ['Sảnh', 5.95, 5.1], ['Khu mở (bếp?)', 7.75, 4.95], ['PN4', 6.2, 7.75], ['PN3', 10.1, 5.0]]
      .forEach(function (r) { p.phong.push({ id: 'p' + (++p.seq), ten: r[0], x: r[1], y: r[2] }); });
    [[4.2, 2.8, 'Sọc dọc ở phòng ăn và hành lang trên bản phác: sàn gỗ, lam trần hay giếng trời? (chờ KTS xác nhận)'],
      [8.4, 6.6, 'Bốn khối gạch chéo hẹp sát tường: hộp gen hay tủ âm? (chờ KTS xác nhận)'],
      [7.75, 4.45, 'Trên bản phác chưa thấy bếp. Khu này có phải bếp không? (chờ KTS xác nhận)']]
      .forEach(function (g2) { p.ghi.push({ id: 'g' + (++p.seq), x: g2[0], y: g2[1], nd: g2[2] }); });
    return p;
  }
  function matBangTrong(W, D) {
    var g = taoTuDoan([
      { a: [0, 0], b: [W, 0], t: 0.2, khoa: true }, { a: [W, 0], b: [W, D], t: 0.2, khoa: true },
      { a: [W, D], b: [0, D], t: 0.2, khoa: true }, { a: [0, D], b: [0, 0], t: 0.2, khoa: true }
    ]);
    return { phien_ban: 1, ten: 'Lô ' + so(W, 1) + ' × ' + so(D, 1) + ' m', nodes: g.nodes, walls: g.walls, seq: g.seq, ops: [], items: [], phong: [], ghi: [], ranh: null };
  }

  /* ================= hình học tường / cửa / đồ ================= */
  function dauNoi(w, idNut) { // phần kéo dài ở đầu tường để góc kín
    var m = 0;
    dsTuongTaiNut(idNut).forEach(function (o) { if (o.id !== w.id) m = Math.max(m, o.t / 2); });
    return m;
  }
  function khungTuong(w) {
    var g = hinh(w), ea = dauNoi(w, w.a), eb = dauNoi(w, w.b), t = w.t / 2;
    var a = { x: g.A.x - g.ux * ea, y: g.A.y - g.uy * ea }, b = { x: g.B.x + g.ux * eb, y: g.B.y + g.uy * eb };
    return [[a.x + g.nx * t, a.y + g.ny * t], [b.x + g.nx * t, b.y + g.ny * t], [b.x - g.nx * t, b.y - g.ny * t], [a.x - g.nx * t, a.y - g.ny * t]];
  }
  function hinhCua(op) {
    var w = tuong(op.w); if (!w) return null;
    var g = hinh(w), s0 = op.s - op.rong / 2, s1 = op.s + op.rong / 2;
    return {
      g: g, w: w,
      P0: { x: g.A.x + g.ux * s0, y: g.A.y + g.uy * s0 }, P1: { x: g.A.x + g.ux * s1, y: g.A.y + g.uy * s1 },
      C: { x: g.A.x + g.ux * op.s, y: g.A.y + g.uy * op.s }
    };
  }
  function kichDo(it) { var r = ((it.rot % 360) + 360) % 360; return (r % 180 === 0) ? { w: it.w, h: it.h } : { w: it.h, h: it.w }; }
  function hopDo(it) { var k = kichDo(it); return { x0: it.cx - k.w / 2, y0: it.cy - k.h / 2, x1: it.cx + k.w / 2, y1: it.cy + k.h / 2 }; }
  function doiDiem(it) { // toạ độ riêng → toạ độ bản vẽ
    var r = ((it.rot % 360) + 360) % 360 * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return function (x, y) {
      var dx = x - it.w / 2, dy = y - it.h / 2;
      if (it.lat) dx = -dx;
      return { x: it.cx + dx * c - dy * s, y: it.cy + dx * s + dy * c };
    };
  }
  function netDo(it) {
    var s = LIB[it.ma]; if (!s) return [];
    return s.ve({ w: it.w, h: it.h, n: it.n, kieu: it.kieu, dao: it.dao });
  }

  /* ================= phân tích: tô loang tính diện tích, kiểm tra ================= */
  function phanTich() {
    if (phanTichCache) return phanTichCache;
    var xs = [], ys = [];
    Object.keys(plan.nodes).forEach(function (k) { xs.push(plan.nodes[k].x); ys.push(plan.nodes[k].y); });
    (plan.ranh || []).forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
    plan.items.forEach(function (it) { var b = hopDo(it); xs.push(b.x0, b.x1); ys.push(b.y0, b.y1); });
    plan.phong.forEach(function (r) { xs.push(r.x); ys.push(r.y); });
    if (!xs.length) { xs = [0, 10]; ys = [0, 10]; }
    var x0 = Math.floor(Math.min.apply(null, xs) / O) * O - 0.6, y0 = Math.floor(Math.min.apply(null, ys) / O) * O - 0.6;
    var nx = Math.ceil((Math.max.apply(null, xs) - x0 + 0.6) / O) + 1, ny = Math.ceil((Math.max.apply(null, ys) - y0 + 0.6) / O) + 1;
    if (nx * ny > 4e6) { nx = Math.min(nx, 2000); ny = Math.min(ny, 2000); }
    var N = nx * ny, ran = new Uint8Array(N), ranT = new Uint8Array(N);   // ran: tường + ranh lô; ranT: chỉ tường
    var vi = function (ix, iy) { return iy * nx + ix; };
    var tamX = function (ix) { return x0 + (ix + 0.5) * O; }, tamY = function (iy) { return y0 + (iy + 0.5) * O; };
    var veDaGiac = function (pts, mang, mang2) {
      var bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      pts.forEach(function (q) { bx0 = Math.min(bx0, q[0]); by0 = Math.min(by0, q[1]); bx1 = Math.max(bx1, q[0]); by1 = Math.max(by1, q[1]); });
      var i0 = Math.max(0, Math.floor((bx0 - x0) / O)), i1 = Math.min(nx - 1, Math.ceil((bx1 - x0) / O)), j0 = Math.max(0, Math.floor((by0 - y0) / O)), j1 = Math.min(ny - 1, Math.ceil((by1 - y0) / O));
      for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
        var px = tamX(i), py = tamY(j), trong = false;
        for (var a = 0, b = pts.length - 1; a < pts.length; b = a++) {
          if (((pts[a][1] > py) !== (pts[b][1] > py)) && (px < (pts[b][0] - pts[a][0]) * (py - pts[a][1]) / (pts[b][1] - pts[a][1]) + pts[a][0])) trong = !trong;
        }
        if (trong) { mang[vi(i, j)] = 1; if (mang2) mang2[vi(i, j)] = 1; }
      }
    };
    plan.walls.forEach(function (w) { veDaGiac(khungTuong(w), ran, ranT); });
    if (plan.ranh && plan.ranh.length > 2) {
      for (var r = 0; r < plan.ranh.length; r++) {
        var p1 = plan.ranh[r], p2 = plan.ranh[(r + 1) % plan.ranh.length], len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        var ux = (p2[0] - p1[0]) / len, uy = (p2[1] - p1[1]) / len, t = 0.03;
        veDaGiac([[p1[0] - uy * t, p1[1] + ux * t], [p2[0] - uy * t, p2[1] + ux * t], [p2[0] + uy * t, p2[1] - ux * t], [p1[0] + uy * t, p1[1] - ux * t]], ran);
      }
    }
    var loang = function (chan, vung, bat, ma) {
      var q = [bat], n = 0; vung[bat] = ma;
      while (q.length) {
        var c = q.pop(); n++;
        var ix = c % nx, iy = (c - ix) / nx;
        if (ix > 0 && !chan[c - 1] && !vung[c - 1]) { vung[c - 1] = ma; q.push(c - 1); }
        if (ix < nx - 1 && !chan[c + 1] && !vung[c + 1]) { vung[c + 1] = ma; q.push(c + 1); }
        if (iy > 0 && !chan[c - nx] && !vung[c - nx]) { vung[c - nx] = ma; q.push(c - nx); }
        if (iy < ny - 1 && !chan[c + nx] && !vung[c + nx]) { vung[c + nx] = ma; q.push(c + nx); }
      }
      return n;
    };
    // ngoài nhà (chỉ tường) → diện tích xây dựng
    var ngoaiT = new Int32Array(N); loang(ranT, ngoaiT, 0, 1);
    var ngoaiDem = 0; for (var c0 = 0; c0 < N; c0++) if (ngoaiT[c0]) ngoaiDem++;
    var dtXayDung = (N - ngoaiDem) * O * O;
    // vùng (tường + ranh)
    var vung = new Int32Array(N); loang(ran, vung, 0, -1);
    var o = function (x, y) {
      var ix = Math.floor((x - x0) / O), iy = Math.floor((y - y0) / O);
      if (ix < 0 || iy < 0 || ix >= nx || iy >= ny) return -1;
      return vi(ix, iy);
    };
    var oTrong = function (x, y) { // ô không phải tường gần (x,y) nhất
      var c = o(x, y); if (c < 0) return -1; if (!ran[c]) return c;
      for (var rr = 1; rr < 8; rr++) for (var dy = -rr; dy <= rr; dy++) for (var dx = -rr; dx <= rr; dx++) {
        var cc = o(x + dx * O, y + dy * O); if (cc >= 0 && !ran[cc]) return cc;
      }
      return -1;
    };
    var vungs = [], soMa = 0, theoMa = {};
    plan.phong.forEach(function (r) {
      var c = oTrong(r.x, r.y); if (c < 0) return;
      if (vung[c] === -1) { r._ngoai = true; return; }
      r._ngoai = false;
      if (!vung[c]) { soMa++; var n = loang(ran, vung, c, soMa + 1); theoMa[soMa + 1] = { ma: soMa + 1, ten: [], phong: [], o: n }; }
      var v = theoMa[vung[c]]; if (v) { v.ten.push(r.ten); v.phong.push(r); }
      r._vung = vung[c];
    });
    // khoảng trống chưa đặt tên (trong ranh, không phải ngoài)
    var trong = [];
    for (var c1 = 0; c1 < N; c1++) {
      if (ran[c1] || vung[c1]) continue;
      soMa++; var ma = soMa + 1, n2 = loang(ran, vung, c1, ma), sx = 0, sy = 0, k = 0;
      // tâm: lấy mẫu
      for (var c2 = c1; c2 < N && k < n2; c2++) if (vung[c2] === ma) { sx += c2 % nx; sy += Math.floor(c2 / nx); k++; }
      theoMa[ma] = { ma: ma, ten: [], phong: [], o: n2, cx: x0 + (sx / k + 0.5) * O, cy: y0 + (sy / k + 0.5) * O };
      if (n2 * O * O >= 0.6) trong.push(theoMa[ma]);
    }
    Object.keys(theoMa).forEach(function (m) {
      var v = theoMa[m];
      v.dt = v.o * O * O;
      v.trongNha = true;
      if (v.phong.length) { v.cx = v.phong[0].x; v.cy = v.phong[0].y; }
      // vùng nằm ngoài khối nhà (hiên, sân trong ranh lô)
      var cTam = oTrong(v.cx, v.cy); v.trongNha = cTam >= 0 ? !ngoaiT[cTam] : true;
      vungs.push(v);
    });
    phanTichCache = { x0: x0, y0: y0, nx: nx, ny: ny, ran: ran, vung: vung, ngoaiT: ngoaiT, o: o, oTrong: oTrong, vungs: vungs, theoMa: theoMa, trong: trong, dtXayDung: dtXayDung };
    phanTichCache.loi = kiemTra(phanTichCache);
    return phanTichCache;
  }
  function vungTai(pt, x, y) { var c = pt.oTrong(x, y); return c < 0 ? 0 : pt.vung[c]; }
  // chiều rộng lọt lòng hẹp nhất quanh điểm (x,y) trong vùng: min theo hàng/cột qua các ô gần
  function beRongQuanh(pt, ma, x, y, banKinh) {
    var nho = Infinity, nx = pt.nx, r = Math.round(banKinh / O), c0 = pt.oTrong(x, y); if (c0 < 0) return null;
    var ix0 = c0 % nx, iy0 = Math.floor(c0 / nx);
    for (var dy = -r; dy <= r; dy += 2) for (var dx = -r; dx <= r; dx += 2) {
      var ix = ix0 + dx, iy = iy0 + dy; if (ix < 0 || iy < 0 || ix >= nx || iy >= pt.ny) continue;
      var c = iy * nx + ix; if (pt.vung[c] !== ma) continue;
      var a = ix, b = ix; while (a > 0 && pt.vung[iy * nx + a - 1] === ma) a--; while (b < nx - 1 && pt.vung[iy * nx + b + 1] === ma) b++;
      var u = iy, v = iy; while (u > 0 && pt.vung[(u - 1) * nx + ix] === ma) u--; while (v < pt.ny - 1 && pt.vung[(v + 1) * nx + ix] === ma) v++;
      nho = Math.min(nho, Math.min(b - a + 1, v - u + 1) * O);
    }
    return isFinite(nho) ? nho : null;
  }

  /* ================= kiểm tra ================= */
  function kiemTra(pt) {
    var loi = [];
    var them = function (muc, nd, ref, x, y, sua) { loi.push({ muc: muc, nd: nd, ref: ref, x: x, y: y, sua: sua }); };
    var giapCua = {};   // mã vùng → {di: n, so: n}
    plan.ops.forEach(function (op) {
      var hc = hinhCua(op); if (!hc) return;
      var d = hc.w.t / 2 + 0.12, c = CUA[op.ma] || {};
      [1, -1].forEach(function (sg) {
        var m = vungTai(pt, hc.C.x + hc.g.nx * d * sg, hc.C.y + hc.g.ny * d * sg);
        if (!m) return; giapCua[m] = giapCua[m] || { di: 0, so: 0 };
        giapCua[m][c.loai === 'so' ? 'so' : 'di']++;
      });
    });
    var MIEN_CUA = /hiên|sân|ban công|giếng|bồn|thông tầng|hộp gen/i;
    pt.vungs.forEach(function (v) {
      if (!v.phong.length) return;
      var ten = v.ten.join(' + '), p0 = v.phong[0], cua = giapCua[v.ma] || { di: 0, so: 0 };
      if (v.trongNha && !cua.di && !MIEN_CUA.test(ten)) them('do', ten + ' chưa có cửa đi hay lỗ mở để vào.', { k: 'p', id: p0.id }, p0.x, p0.y);
      if (v.phong.length > 1) them('goi_y', v.ten.join(', ') + ' đang thông nhau thành một không gian (' + so(v.dt, 1) + ' m²). Muốn tách thì vẽ thêm tường.', { k: 'p', id: p0.id }, p0.x, p0.y);
      v.phong.forEach(function (r) {
        if (/hành lang|sảnh|lối đi/i.test(r.ten)) {
          var br = beRongQuanh(pt, v.ma, r.x, r.y, 1.6);
          if (br !== null && br < 0.9 - 0.02) them('do', r.ten + ' chỗ hẹp nhất chỉ còn ' + so(br) + ' m lọt lòng; cần tối thiểu 0,90 m.', { k: 'p', id: r.id }, r.x, r.y);
        }
      });
      if (v.phong.length === 1) {
        if (/^pn|phòng ngủ|master/i.test(ten) && v.dt < 9) them('vang', ten + ' rộng ' + so(v.dt, 1) + ' m², nhỏ hơn 9 m².', { k: 'p', id: p0.id }, p0.x, p0.y);
        if (/^wc|vệ sinh/i.test(ten) && !cua.so) them('goi_y', ten + ' chưa có cửa sổ: cần quạt hút hoặc ô thoáng.', { k: 'p', id: p0.id }, p0.x, p0.y);
      }
    });
    pt.trong.forEach(function (v) {
      if (v.trongNha && v.dt >= 1.5) them('goi_y', 'Có một khoảng ' + so(v.dt, 1) + ' m² chưa đặt tên phòng.', { k: 'vung', ma: v.ma }, v.cx, v.cy, { nhan: 'Đặt tên', lam: function () { taoTenPhong(v.cx, v.cy); } });
    });
    // đồ vật
    var BO_QUA = { VAO: 1, BAC: 1 }, KET_CAU = { G: 1, TM: 1, TH: 1, GT: 1, COT: 1, BC: 1 };
    plan.items.forEach(function (it) {
      if (BO_QUA[it.ma] || KET_CAU[it.ma]) return;
      var b = hopDo(it), dem = 0;
      for (var y = b.y0 + O / 2; y < b.y1; y += O) for (var x = b.x0 + O / 2; x < b.x1; x += O) {
        var c = pt.o(x, y); if (c >= 0 && pt.ran[c] && !pt.ngoaiT[c]) dem++;
      }
      if (dem * O * O > 0.03) them('vang', (LIB[it.ma] ? LIB[it.ma].ten : it.ma) + ' đang chồng lên tường.', { k: 'i', id: it.id }, it.cx, it.cy);
    });
    for (var i = 0; i < plan.items.length; i++) for (var j = i + 1; j < plan.items.length; j++) {
      var a = plan.items[i], b2 = plan.items[j];
      if (BO_QUA[a.ma] || BO_QUA[b2.ma] || a.ma === 'BC' || b2.ma === 'BC') continue;
      var A = hopDo(a), B = hopDo(b2), ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), oy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
      if (ox > 0.05 && oy > 0.05 && ox * oy > 0.04) them('vang', (LIB[a.ma] || {}).ten + ' chồng lên ' + ((LIB[b2.ma] || {}).ten || '').toLowerCase() + '.', { k: 'i', id: a.id }, (Math.max(A.x0, B.x0) + Math.min(A.x1, B.x1)) / 2, (Math.max(A.y0, B.y0) + Math.min(A.y1, B.y1)) / 2);
    }
    // cửa
    plan.ops.forEach(function (op) {
      var hc = hinhCua(op), c = CUA[op.ma]; if (!hc || !c) return;
      if (op.rong < c.min - 0.005 || op.rong > c.max + 0.005) them('goi_y', op.ma + ' rộng ' + so(op.rong) + ' m; ký hiệu ' + op.ma + ' thường ' + so(c.min) + '–' + so(c.max) + ' m.', { k: 'o', id: op.id }, hc.C.x, hc.C.y);
      if (c.canh === 1) {
        var hl = op.ban_le === 'a' ? hc.P0 : hc.P1, sx = hc.g.nx * op.phia, sy = hc.g.ny * op.phia;
        var dau = op.ban_le === 'a' ? hc.P1 : hc.P0;
        var q0x = Math.min(hl.x, dau.x, hl.x + sx * op.rong), q1x = Math.max(hl.x, dau.x, hl.x + sx * op.rong);
        var q0y = Math.min(hl.y, dau.y, hl.y + sy * op.rong), q1y = Math.max(hl.y, dau.y, hl.y + sy * op.rong);
        plan.items.forEach(function (it) {
          if (BO_QUA[it.ma] || it.ma === 'BC') return;
          var B2 = hopDo(it), ox2 = Math.min(q1x, B2.x1) - Math.max(q0x, B2.x0), oy2 = Math.min(q1y, B2.y1) - Math.max(q0y, B2.y0);
          if (ox2 > 0.08 && oy2 > 0.08) them('vang', 'Cánh cửa ' + op.ma + ' mở vướng ' + ((LIB[it.ma] || {}).ten || '').toLowerCase() + '.', { k: 'o', id: op.id }, hc.C.x, hc.C.y);
        });
        // Nam 03/10/2026: cửa đặt sát tường trái hoặc phải
        var tuGoc = Math.min(op.s - op.rong / 2, hc.g.len - op.s - op.rong / 2) - 0.15;
        if (tuGoc > 0.3) them('goi_y', 'Cửa ' + op.ma + ' cách góc ' + so(tuGoc) + ' m. Đặt sát tường trái hoặc phải sẽ đỡ tốn chỗ.', { k: 'o', id: op.id }, hc.C.x, hc.C.y, { nhan: 'Dời sát góc', lam: function () { chon({ k: 'o', id: op.id }); doiSatGoc(op); } });
      }
    });
    // cầu thang
    plan.items.forEach(function (it) {
      if (it.ma !== 'TH') return;
      var n = it.n || 21, kieu = it.kieu === 'U' && it.w >= 1.5 ? 'U' : 'I';
      if (n < 17 || n > 22) them('vang', 'Cầu thang ' + n + ' bậc; thường 17–22 bậc mỗi tầng.', { k: 'i', id: it.id }, it.cx, it.cy);
      var ve = kieu === 'U' ? (it.w - 0.1) / 2 : it.w, land = kieu === 'U' ? Math.min(Math.max(ve, 1.0), it.h * 0.5) : 0;
      var b = kieu === 'U' ? (it.h - land) / Math.max(1, Math.ceil(n / 2) - 1) : it.h / (n - 1);
      if (b < 0.25 - 0.005 || b > 0.30 + 0.005) them('vang', 'Mặt bậc thang đang ' + so(b) + ' m; nên 0,25–0,30 m. Đổi số bậc hoặc chiều dài thang.', { k: 'i', id: it.id }, it.cx, it.cy);
      if (ve < 0.9 - 0.005) them('vang', 'Vế thang rộng ' + so(ve) + ' m; cần lọt lòng 0,90 m.', { k: 'i', id: it.id }, it.cx, it.cy);
      if (kieu === 'I' && n >= 21) them('goi_y', 'Thang một vế ' + n + ' bậc khá dài, nên cân nhắc chiếu nghỉ.', { k: 'i', id: it.id }, it.cx, it.cy);
    });
    var bac = { do: 0, vang: 1, goi_y: 2 };
    loi.sort(function (p, q) { return bac[p.muc] - bac[q.muc]; });
    return loi;
  }

  /* ================= vẽ ================= */
  function nenNet(e, m, rong) {
    e.setAttribute('stroke', MAU[m] || MAU.muc);
    e.setAttribute('stroke-width', rong || 1.1);
    e.setAttribute('vector-effect', 'non-scaling-stroke');
    e.setAttribute('stroke-linecap', 'round');
    e.setAttribute('stroke-linejoin', 'round');
  }
  function veNet(g, prims, f, mauGhiDe, rong) {
    prims.forEach(function (p) {
      var m = mauGhiDe || p.m, e = null, q, i;
      if (p.k === 'l') { var a = f(p.x1, p.y1), b = f(p.x2, p.y2); e = el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, g); e.setAttribute('fill', 'none'); }
      else if (p.k === 'r' || p.k === 'p') {
        var pts = p.k === 'r' ? [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]] : p.pts, s = '';
        for (i = 0; i < pts.length; i++) { q = f(pts[i][0], pts[i][1]); s += (i ? ' ' : '') + q.x.toFixed(4) + ',' + q.y.toFixed(4); }
        e = el(p.k === 'r' || p.z ? 'polygon' : 'polyline', { points: s }, g);
        e.setAttribute('fill', p.f ? (MAU[m] || MAU.muc) : (p.k === 'r' || p.z ? 'rgba(255,255,255,0.001)' : 'none'));
      } else if (p.k === 'c') { q = f(p.cx, p.cy); e = el('circle', { cx: q.x, cy: q.y, r: p.r }, g); e.setAttribute('fill', p.f ? (MAU[m] || MAU.muc) : 'none'); }
      else if (p.k === 'e') {
        var d = '';
        for (i = 0; i <= 24; i++) { var t = i / 24 * Math.PI * 2; q = f(p.cx + p.rx * Math.cos(t), p.cy + p.ry * Math.sin(t)); d += (i ? 'L' : 'M') + q.x.toFixed(4) + ' ' + q.y.toFixed(4); }
        e = el('path', { d: d + 'Z' }, g); e.setAttribute('fill', 'none');
      } else if (p.k === 'a') {
        var d2 = '';
        for (i = 0; i <= 16; i++) { var t2 = (p.a0 + (p.a1 - p.a0) * i / 16) * Math.PI / 180; q = f(p.cx + p.r * Math.cos(t2), p.cy + p.r * Math.sin(t2)); d2 += (i ? 'L' : 'M') + q.x.toFixed(4) + ' ' + q.y.toFixed(4); }
        e = el('path', { d: d2 }, g); e.setAttribute('fill', 'none');
      } else if (p.k === 't') {
        q = f(p.x, p.y);
        e = el('text', { x: q.x, y: q.y, 'font-size': p.s, 'text-anchor': 'middle', 'font-family': FONT, 'font-weight': 600 }, g);
        e.setAttribute('fill', MAU[m] || MAU.muc); e.textContent = p.v; return;
      }
      if (e) { nenNet(e, m, rong); if (p.d) e.setAttribute('stroke-dasharray', '5 4'); }
    });
  }
  function veCua(g, op, mau) {
    var hc = hinhCua(op); if (!hc) return;
    var c = CUA[op.ma] || CUA.D1, G = hc.g, t = hc.w.t / 2 + 0.002, P0 = hc.P0, P1 = hc.P1;
    var lo = el('polygon', { points: [[P0.x + G.nx * t, P0.y + G.ny * t], [P1.x + G.nx * t, P1.y + G.ny * t], [P1.x - G.nx * t, P1.y - G.ny * t], [P0.x - G.nx * t, P0.y - G.ny * t]].map(function (q) { return q[0].toFixed(4) + ',' + q[1].toFixed(4); }).join(' ') }, g);
    lo.setAttribute('fill', '#ffffff');
    var f = function (x, y) { return { x: x, y: y }; }, nets = [], sx = G.nx * op.phia, sy = G.ny * op.phia, mm = mau || (c.loai === 'so' ? 'so' : 'cua');
    var gocDo = function (vx, vy) { return Math.atan2(vy, vx) * 180 / Math.PI; };
    if (c.loai === 'so') {
      [-0.6, 0, 0.6].forEach(function (k) { nets.push({ k: 'l', x1: P0.x + G.nx * t * k, y1: P0.y + G.ny * t * k, x2: P1.x + G.nx * t * k, y2: P1.y + G.ny * t * k }); });
      for (var i = 1; i <= (c.song || 0); i++) { var mx = P0.x + (P1.x - P0.x) * i / ((c.song || 0) + 1), my = P0.y + (P1.y - P0.y) * i / ((c.song || 0) + 1); nets.push({ k: 'l', x1: mx + G.nx * t, y1: my + G.ny * t, x2: mx - G.nx * t, y2: my - G.ny * t }); }
    } else if (c.lo) {
      nets.push({ k: 'l', x1: P0.x, y1: P0.y, x2: P1.x, y2: P1.y, d: true });
    } else if (c.xep) {
      var pts = [], k2 = 4;
      for (var j = 0; j <= k2; j++) { var q = j / k2, o = (j % 2) ? 0.3 : 0; pts.push([P0.x + (P1.x - P0.x) * q + sx * o, P0.y + (P1.y - P0.y) * q + sy * o]); }
      nets.push({ k: 'p', pts: pts });
    } else if (c.lua) {
      var nua = op.rong * 0.55;
      nets.push({ k: 'l', x1: P0.x + sx * 0.04, y1: P0.y + sy * 0.04, x2: P0.x + G.ux * nua + sx * 0.04, y2: P0.y + G.uy * nua + sy * 0.04 });
      nets.push({ k: 'l', x1: P1.x - sx * 0.04, y1: P1.y - sy * 0.04, x2: P1.x - G.ux * nua - sx * 0.04, y2: P1.y - G.uy * nua - sy * 0.04 });
    } else if (c.canh === 2) {
      var r = op.rong / 2;
      [[P0, 1], [P1, -1]].forEach(function (pp) {
        var H = pp[0], tip = { x: H.x + sx * r, y: H.y + sy * r }, mid = { x: H.x + G.ux * r * pp[1], y: H.y + G.uy * r * pp[1] };
        nets.push({ k: 'l', x1: H.x, y1: H.y, x2: tip.x, y2: tip.y });
        var a0 = gocDo(tip.x - H.x, tip.y - H.y), a1 = gocDo(mid.x - H.x, mid.y - H.y), dd = ((a1 - a0 + 540) % 360) - 180;
        nets.push({ k: 'a', cx: H.x, cy: H.y, r: r, a0: a0, a1: a0 + dd });
      });
    } else {
      var Hn = op.ban_le === 'a' ? P0 : P1, Kh = op.ban_le === 'a' ? P1 : P0, tp = { x: Hn.x + sx * op.rong, y: Hn.y + sy * op.rong };
      nets.push({ k: 'l', x1: Hn.x, y1: Hn.y, x2: tp.x, y2: tp.y });
      var b0 = gocDo(tp.x - Hn.x, tp.y - Hn.y), b1 = gocDo(Kh.x - Hn.x, Kh.y - Hn.y), d3 = ((b1 - b0 + 540) % 360) - 180;
      nets.push({ k: 'a', cx: Hn.x, cy: Hn.y, r: op.rong, a0: b0, a1: b0 + d3 });
    }
    veNet(g, nets, f, mm, 1.2);
    return hc;
  }
  function veChuNhan(g, x, y, ten, cau, phu, mau) {
    var t = el('text', { x: x, y: y, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': cau, 'font-weight': 700, 'paint-order': 'stroke', stroke: '#ffffff', 'stroke-width': cau * 0.35, 'stroke-linejoin': 'round' }, g);
    t.setAttribute('fill', mau || MAU.muc); t.textContent = ten;
    if (phu) {
      var t2 = el('text', { x: x, y: y + cau * 1.05, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': cau * 0.78, 'paint-order': 'stroke', stroke: '#ffffff', 'stroke-width': cau * 0.3, 'stroke-linejoin': 'round' }, g);
      t2.setAttribute('fill', MAU.nhan); t2.textContent = phu;
    }
    return t;
  }

  // vẽ toàn bộ mặt bằng vào nhóm g. tuyChon: {tuongTac, xuat}
  function veMatBang(g, p, tuyChon) {
    var tt = tuyChon && tuyChon.tuongTac, cu = plan; plan = p;
    try {
      if (p.ranh && p.ranh.length > 2) {
        var rn = el('polygon', { points: p.ranh.map(function (q) { return q[0] + ',' + q[1]; }).join(' ') }, g);
        rn.setAttribute('fill', 'none'); nenNet(rn, 'nhan', 1); rn.setAttribute('stroke-dasharray', '8 5');
      }
      var gDo = el('g', null, g);
      p.items.forEach(function (it) {
        if (it.ma === 'BC' || it.ma === 'GT') { var gg = el('g', null, gDo); veNet(gg, netDo(it), doiDiem(it)); }
      });
      var gTuong = el('g', null, g);
      p.walls.forEach(function (w) {
        var poly = el('polygon', { points: khungTuong(w).map(function (q) { return q[0].toFixed(4) + ',' + q[1].toFixed(4); }).join(' ') }, gTuong);
        poly.setAttribute('fill', MAU.tuong);
        if (tt) { poly.setAttribute('data-k', 'w'); poly.setAttribute('data-id', w.id); if (khoa(w)) poly.setAttribute('data-khoa', '1'); }
      });
      var gCua = el('g', null, g);
      p.ops.forEach(function (op) {
        var hc = veCua(gCua, op); if (!hc) return;
        var c = CUA[op.ma] || {};
        var nhan = el('text', { x: hc.C.x + hc.g.nx * (hc.w.t / 2 + 0.2) * (c.loai === 'so' ? 1 : -op.phia), y: hc.C.y + hc.g.ny * (hc.w.t / 2 + 0.2) * (c.loai === 'so' ? 1 : -op.phia) + 0.06, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': 0.16, 'font-weight': 600 }, gCua);
        nhan.setAttribute('fill', c.loai === 'so' ? MAU.so : MAU.cua); nhan.textContent = op.ma + (c.ghi ? '' : '');
        if (tt) {
          var vung = el('polygon', { points: [[hc.P0.x + hc.g.nx * 0.25, hc.P0.y + hc.g.ny * 0.25], [hc.P1.x + hc.g.nx * 0.25, hc.P1.y + hc.g.ny * 0.25], [hc.P1.x - hc.g.nx * 0.25, hc.P1.y - hc.g.ny * 0.25], [hc.P0.x - hc.g.nx * 0.25, hc.P0.y - hc.g.ny * 0.25]].map(function (q) { return q[0] + ',' + q[1]; }).join(' '), fill: 'rgba(0,0,0,0)', 'data-k': 'o', 'data-id': op.id }, gCua);
          vung.setAttribute('pointer-events', 'fill');
        }
      });
      p.items.forEach(function (it) {
        if (it.ma === 'BC' || it.ma === 'GT') return;
        var gg = el('g', null, gDo.parentNode); veNet(gg, netDo(it), doiDiem(it));
      });
      if (tt) p.items.forEach(function (it) {
        var b = hopDo(it), r = el('rect', { x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0, fill: 'rgba(0,0,0,0)', 'data-k': 'i', 'data-id': it.id }, g);
        r.setAttribute('pointer-events', 'fill'); if (khoa(it)) r.setAttribute('data-khoa', '1');
      });
      return true;
    } finally { plan = cu; }
  }

  function ve() {
    var pt = phanTich();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = svg.clientWidth || 800, H = svg.clientHeight || 600;
    svg.setAttribute('viewBox', [view.x, view.y, W / view.s, H / view.s].map(function (v) { return v.toFixed(4); }).join(' '));
    // lưới giấy
    var defs = el('defs', null, svg), pat = el('pattern', { id: 'luoiNho', width: 1, height: 1, patternUnits: 'userSpaceOnUse' }, defs);
    var lp = el('path', { d: 'M1 0H0V1', fill: 'none' }, pat); lp.setAttribute('stroke', '#e9eef3'); lp.setAttribute('stroke-width', 0.012);
    var lp2 = el('path', { d: 'M0.5 0V1M0 0.5H1', fill: 'none' }, pat); lp2.setAttribute('stroke', '#f2f5f8'); lp2.setAttribute('stroke-width', 0.008);
    el('rect', { x: view.x - 1, y: view.y - 1, width: W / view.s + 2, height: H / view.s + 2, fill: 'url(#luoiNho)' }, svg);
    veAnhNen();
    // tô nhẹ phòng đang chọn
    var gNen = el('g', null, svg);
    if (sel && sel.k === 'p') {
      var r0 = timTheo(plan.phong, sel.id);
      if (r0 && r0._vung) toVung(gNen, pt, r0._vung, 'rgba(31,95,168,0.08)');
    }
    var gChinh = el('g', null, svg);
    veMatBang(gChinh, plan, { tuongTac: true });
    // tên phòng + diện tích
    var gNhan = el('g', null, svg);
    plan.phong.forEach(function (r) {
      var v = pt.theoMa[r._vung], phu = r._ngoai ? 'ngoài ranh lô' : (v ? (v.phong.length > 1 ? 'chung ' : '') + so(v.dt, 1) + ' m²' : '');
      var t = veChuNhan(gNhan, r.x, r.y, r.ten, 0.22, phu);
      t.setAttribute('data-k', 'p'); t.setAttribute('data-id', r.id);
      var hit = el('rect', { x: r.x - 0.6, y: r.y - 0.25, width: 1.2, height: 0.5, fill: 'rgba(0,0,0,0)', 'data-k': 'p', 'data-id': r.id }, gNhan);
      hit.setAttribute('pointer-events', 'fill');
    });
    pt.trong.forEach(function (v) {
      if (!v.trongNha || v.dt < 1.5) return;
      var t = veChuNhan(gNhan, v.cx, v.cy, '?', 0.26, so(v.dt, 1) + ' m²', MAU.nhan);
      t.setAttribute('opacity', '0.75');
    });
    // ghim ghi chú
    plan.ghi.forEach(function (gh, i) {
      var gg = el('g', { 'data-k': 'g', 'data-id': gh.id }, svg), r = 11 / view.s;
      var c = el('circle', { cx: gh.x, cy: gh.y, r: r }, gg); c.setAttribute('fill', '#b8860b'); nenNet(c, 'muc', 1.5); c.setAttribute('stroke', '#ffffff');
      var t = el('text', { x: gh.x, y: gh.y + r * 0.38, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': r * 1.05, 'font-weight': 700 }, gg); t.setAttribute('fill', '#ffffff'); t.textContent = String(i + 1);
    });
    // điểm lỗi trên bản vẽ
    var gLoi = el('g', null, svg);
    pt.loi.forEach(function (l) {
      if (l.muc === 'goi_y') return;
      var r = 7 / view.s, c = el('circle', { cx: l.x + 0.32, cy: l.y - 0.32, r: r }, gLoi);
      c.setAttribute('fill', l.muc === 'do' ? MAU.do : MAU.vang); c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', 1.5); c.setAttribute('vector-effect', 'non-scaling-stroke');
      var t = el('text', { x: l.x + 0.32, y: l.y - 0.32 + r * 0.42, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': r * 1.3, 'font-weight': 700 }, gLoi); t.setAttribute('fill', '#fff'); t.textContent = '!';
      c.setAttribute('pointer-events', 'none'); t.setAttribute('pointer-events', 'none');
    });
    veChon(pt);
    veDangVe();
    veDoAnh();
    capNhatDau();
    $('nutAnh').hidden = !anh;
  }
  /* ================= ảnh nền để đồ lại ================= */
  function veAnhNen() {
    if (!anh || anh.an) return;
    var g = el('g', { transform: 'rotate(' + anh.rot + ' ' + anh.cx + ' ' + anh.cy + ')', 'pointer-events': 'none' }, svg);
    var im = el('image', { x: anh.cx - anh.w / 2, y: anh.cy - anh.h / 2, width: anh.w, height: anh.h, preserveAspectRatio: 'none', opacity: anh.mo }, g);
    im.setAttribute('href', alnUrl(anh.src));
    if (sel && sel.k === 'anh') {
      var r = el('rect', { x: anh.cx - anh.w / 2, y: anh.cy - anh.h / 2, width: anh.w, height: anh.h, fill: 'none' }, g);
      nenNet(r, 'chon', 1.6); r.setAttribute('stroke-dasharray', '8 5');
    }
  }
  function veDoAnh() {
    if (cong !== 'anh_do' || !doAnh || !doAnh.length) return;
    var g = el('g', { 'pointer-events': 'none' }, svg);
    if (doAnh.length === 2) { var l = el('line', { x1: doAnh[0].x, y1: doAnh[0].y, x2: doAnh[1].x, y2: doAnh[1].y }, g); nenNet(l, 'do', 2); }
    doAnh.forEach(function (q) { var c = el('circle', { cx: q.x, cy: q.y, r: 7 / view.s }, g); c.setAttribute('fill', '#fff'); nenNet(c, 'do', 2.5); });
  }
  function luuAnh() {
    try { if (anh) localStorage.setItem(KHOA_ANH, JSON.stringify(anh)); else localStorage.removeItem(KHOA_ANH); return true; }
    catch (e) { baoDong('Máy không lưu được ảnh này (ảnh lớn quá). Ảnh vẫn dùng được tới khi đóng trang.'); return false; }
  }
  function chonAnh() { $('oAnh').click(); }
  function napAnh(f) {
    if (!/^image\//.test(f.type || '')) { baoDong('Chọn file ảnh (JPG, PNG). Bản PDF thì chụp màn hình trang bản vẽ rồi tải ảnh lên.'); return; }
    if (f.size > 25 * 1024 * 1024) { baoDong('Ảnh lớn quá 25 MB. Chọn ảnh nhỏ hơn.'); return; }
    var url = URL.createObjectURL(f), img = new Image();
    img.onerror = function () { URL.revokeObjectURL(url); baoDong('Máy không đọc được ảnh này. Ảnh HEIC của iPhone: mở ảnh, chọn Chia sẻ → Lưu dạng JPG, hoặc chụp màn hình rồi tải lên.'); };
    img.onload = function () {
      var max = 2400, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      var cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      var src = cv.toDataURL('image/jpeg', 0.82);
      hopThoai('Đồ lại mặt bằng từ ảnh', function (nd) {
        var giu = false;
        nd.append(h('p', { cls: 'mo-ta', text: 'Ảnh nằm dưới bản vẽ để anh/chị đồ tường theo nét. Ảnh chỉ để đồ theo, không in và không xuất ra file.' }),
          h('div', { cls: 'truong' }, [h('label', { text: 'Bản vẽ' }), chipChon([[false, 'Bản trống, đồ lại từ đầu'], [true, 'Giữ bản vẽ đang có']], giu, function (v) {
            giu = v; nd.querySelectorAll('.chon-nhanh button').forEach(function (b, i) { b.setAttribute('aria-pressed', String((i === 1) === v)); });
          })]),
          h('div', { cls: 'buoc' }, [
            h('div', null, [h('b', { text: '1' }), h('span', { text: 'Đặt tỷ lệ: bấm vào hai đầu một kích thước đã ghi trên ảnh, rồi nhập số mét.' })]),
            h('div', null, [h('b', { text: '2' }), h('span', { text: 'Bấm "Vẽ tường" và đồ theo nét. Tường tự thẳng, tự nối, diện tích tự tính.' })]),
            h('div', null, [h('b', { text: '3' }), h('span', { text: 'Thêm cửa, thiết bị, tên phòng. Đồ xong thì ẩn ảnh để xem bản vẽ.' })])
          ]));
        return function () {
          var W = svg.clientWidth || 800, H = svg.clientHeight || 600, vw = W / view.s, vh = H / view.s, ty = cv.height / cv.width;
          var w = vw * 0.8, hh = w * ty; if (hh > vh * 0.8) { hh = vh * 0.8; w = hh / ty; }
          if (!giu) { ghiLai(); plan = { phien_ban: 1, ten: 'Bản đồ lại từ ảnh', nodes: {}, walls: [], seq: 0, ops: [], items: [], phong: [], ghi: [], ranh: null }; $('tenBan').value = plan.ten; }
          anh = { src: src, cx: view.x + vw / 2, cy: view.y + vh / 2, w: w, h: hh, rot: 0, mo: 0.55, an: false, tyLe: false };
          luuAnh(); sel = { k: 'anh' }; xong(true); moTheBang('chon'); if (laDienThoai()) moBangDienThoai(true);
          ga('aln_dmb_anh', { buoc: 'tai' });
          setTimeout(batDauDoAnh, 50);
          return true;
        };
      }, 'Bắt đầu');
    };
    img.src = alnUrl(url);
  }
  function batDauDoAnh() {
    if (!anh) return;
    if (anh.an) { anh.an = false; luuAnh(); }
    doAnh = []; datCong('anh_do');
    if (laDienThoai()) { moBangDienThoai(false); vuaKhungAnh(); }
  }
  function xongDoAnh(p) {
    if (!doAnh || doAnh.length >= 2) doAnh = [];
    doAnh.push({ x: p.x, y: p.y }); ve();
    if (doAnh.length < 2) { goiYCongCu(); return; }
    var d = kc(doAnh[0], doAnh[1]);
    if (d < 1e-3) { doAnh = [doAnh[0]]; baoDong('Hai điểm trùng nhau. Bấm điểm thứ hai ở đầu kia kích thước.'); return; }
    hopThoai('Kích thước thật giữa hai điểm', function (nd) {
      var inp = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'Ví dụ: 12', 'aria-label': 'Khoảng cách thật (m)' });
      nd.append(h('p', { cls: 'mo-ta', text: 'Nhập số mét ghi trên ảnh giữa hai điểm vừa bấm. Ảnh sẽ phóng to hoặc thu nhỏ cho đúng.' }), h('div', { cls: 'truong' }, [h('label', { text: 'Khoảng cách (m)' }), inp]));
      setTimeout(function () { inp.focus(); }, 30);
      return function () {
        var m = docSo(inp.value); if (!m || m <= 0 || m > 200) { baoDong('Nhập số mét từ 0,1 tới 200.'); return false; }
        var k = m / d, P = doAnh[0];
        anh.cx = P.x + (anh.cx - P.x) * k; anh.cy = P.y + (anh.cy - P.y) * k; anh.w *= k; anh.h *= k; anh.tyLe = true;
        doAnh = null; luuAnh(); datCong('chon'); sel = { k: 'anh' };
        // đưa điểm đầu về gần gốc lưới 5 cm cho dễ bắt điểm
        vuaKhungAnh(); veBang();
        ga('aln_dmb_anh', { buoc: 'ty_le' });
        baoDong('Đã đặt tỷ lệ. Bấm "Vẽ tường" và đồ theo nét trên ảnh.');
        return true;
      };
    }, 'Đặt tỷ lệ');
    var huy = $('htNut').querySelector('button'); if (huy) huy.addEventListener('click', function () { doAnh = []; ve(); goiYCongCu(); });
  }
  function vuaKhungAnh() {
    if (!anh) return;
    var W = svg.clientWidth || 800, H = svg.clientHeight || 600, le = laDienThoai() ? 24 : 56, bot = laDienThoai() ? 64 : 0;
    view.s = Math.min(400, Math.max(8, Math.min((W - le * 2) / anh.w, (H - le * 2 - bot) / anh.h)));
    view.x = anh.cx - W / view.s / 2; view.y = anh.cy - (H - bot) / view.s / 2; ve();
  }
  function bangAnh(nd) {
    nd.append(h('div', { cls: 'tieu' }, [h('h3', { text: 'Ảnh nền để đồ lại' }), h('span', { cls: 'ma', text: anh.tyLe ? 'Đã đặt tỷ lệ' : 'Chưa đặt tỷ lệ' })]),
      h('p', { cls: 'mo-ta', text: 'Ảnh chỉ để đồ theo, không in và không xuất ra file. Đặt tỷ lệ trước, rồi dùng "Vẽ tường" đồ theo nét.' }));
    nd.append(h('div', { cls: 'nhom-nut' }, [
      nut2(anh.tyLe ? 'Đặt lại tỷ lệ' : 'Đặt tỷ lệ: bấm 2 điểm', 'thuoc', batDauDoAnh, anh.tyLe ? 'rong' : 'chinh rong'),
      nut2('Vẽ tường theo ảnh', 'tuong', function () { datCong('tuong'); }, anh.tyLe ? 'chinh rong' : 'rong')
    ]));
    var thanh = h('input', { type: 'range', min: '10', max: '100', step: '5', value: String(Math.round(anh.mo * 100)), 'aria-label': 'Độ đậm của ảnh' });
    var chu = h('span', { cls: 'dv', text: Math.round(anh.mo * 100) + '%' });
    thanh.addEventListener('input', function () { anh.mo = +thanh.value / 100; chu.textContent = thanh.value + '%'; ve(); });
    thanh.addEventListener('change', luuAnh);
    nd.append(h('div', { cls: 'truong' }, [h('label', { text: 'Độ đậm của ảnh' }), h('div', { cls: 'hang-thanh' }, [thanh, chu])]));
    var xoay = function (d) { anh.rot = ((anh.rot + d) % 360 + 360) % 360; luuAnh(); ve(); veBang(); };
    nd.append(h('div', { cls: 'truong' }, [h('label', { text: 'Xoay ảnh cho tường thẳng với lưới' + (anh.rot ? ' (đang ' + so(anh.rot, 1) + '°)' : '') }), h('div', { cls: 'nhom-nut' }, [
      nut2('−1°', null, function () { xoay(-1); }), nut2('+1°', null, function () { xoay(1); }), nut2('−0,2°', null, function () { xoay(-0.2); }), nut2('+0,2°', null, function () { xoay(0.2); }), nut2('Xoay 90°', 'xoay', function () { xoay(90); })
    ])]));
    nd.append(h('div', { cls: 'nhom-nut' }, [
      nut2(cong === 'anh_keo' ? 'Xong dời ảnh' : 'Dời ảnh', 'keo', function () { datCong(cong === 'anh_keo' ? 'chon' : 'anh_keo'); sel = { k: 'anh' }; veBang(); }, cong === 'anh_keo' ? 'chinh' : null),
      nut2(anh.an ? 'Hiện ảnh' : 'Ẩn ảnh', 'mat', function () { anh.an = !anh.an; luuAnh(); ve(); veBang(); }),
      nut2('Đổi ảnh khác', 'anh', chonAnh),
      nut2('Bỏ ảnh', 'xoa', function () { anh = null; luuAnh(); sel = null; if (/^anh_/.test(cong)) datCong('chon'); ve(); veBang(); baoDong('Đã bỏ ảnh nền. Bản vẽ giữ nguyên.'); }, 'xoa rong')
    ]));
    nd.append(h('p', { cls: 'chu-thich', text: 'Mẹo: chụp thẳng từ trên xuống, giấy phẳng, đủ sáng. Ảnh chụp nghiêng làm tường bị lệch, đồ theo nét thẳng của lưới thay vì theo ảnh.' }));
  }
  function toVung(g, pt, ma, mau) {
    // tô theo hàng (gộp các ô liền nhau) — đủ nhẹ cho vài chục nghìn ô
    var d = '';
    for (var iy = 0; iy < pt.ny; iy++) {
      var ix = 0;
      while (ix < pt.nx) {
        if (pt.vung[iy * pt.nx + ix] !== ma) { ix++; continue; }
        var a = ix; while (ix < pt.nx && pt.vung[iy * pt.nx + ix] === ma) ix++;
        d += 'M' + (pt.x0 + a * O).toFixed(3) + ' ' + (pt.y0 + iy * O).toFixed(3) + 'h' + ((ix - a) * O).toFixed(3) + 'v' + O + 'h' + (-(ix - a) * O).toFixed(3) + 'z';
      }
    }
    if (d) { var p = el('path', { d: d }, g); p.setAttribute('fill', mau); }
  }

  function vachKichThuoc(g, a, b, lech2, chu, mau) {
    var len = kc(a, b); if (len < 1e-6) return;
    var ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, nx = -uy, ny = ux, k = lech2;
    var A = { x: a.x + nx * k, y: a.y + ny * k }, B = { x: b.x + nx * k, y: b.y + ny * k }, tk = 5 / view.s;
    var l = el('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y }, g); nenNet(l, mau || 'chon', 1.2);
    [A, B].forEach(function (P) { var t = el('line', { x1: P.x - (ux + nx) * tk, y1: P.y - (uy + ny) * tk, x2: P.x + (ux + nx) * tk, y2: P.y + (uy + ny) * tk }, g); nenNet(t, mau || 'chon', 1.6); });
    var cau = 13 / view.s, tx = (A.x + B.x) / 2 + nx * cau * 0.7, ty = (A.y + B.y) / 2 + ny * cau * 0.7 + cau * 0.35;
    var t2 = el('text', { x: tx, y: ty, 'text-anchor': 'middle', 'font-family': "'IBM Plex Mono',monospace", 'font-size': cau, 'font-weight': 600, 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': cau * 0.4 }, g);
    t2.setAttribute('fill', MAU[mau || 'chon']); t2.textContent = chu;
  }
  // khoảng lọt lòng tới tường song song gần nhất hai bên (đo từ giữa tường)
  function lotLongHaiBen(w) {
    var g = hinh(w), mid = { x: (g.A.x + g.B.x) / 2, y: (g.A.y + g.B.y) / 2 }, kq = { '1': null, '-1': null };
    plan.walls.forEach(function (o) {
      if (o.id === w.id) return;
      var h2 = hinh(o); if (Math.abs(h2.ux * g.nx + h2.uy * g.ny) > 1e-3) return;
      var t = chieu(mid, h2); if (t < -0.01 || t > h2.len + 0.01) return;
      var d = (h2.A.x - mid.x) * g.nx + (h2.A.y - mid.y) * g.ny;
      if (Math.abs(d) < 0.05) return;
      var ben = d > 0 ? '1' : '-1', ll = Math.abs(d) - w.t / 2 - o.t / 2;
      if (kq[ben] === null || ll < kq[ben].ll) kq[ben] = { ll: ll, d: d, o: o };
    });
    return { g: g, mid: mid, kq: kq };
  }
  function veChon(pt) {
    if (!sel) return;
    var g = el('g', { 'pointer-events': 'none' }, svg);
    if (sel.k === 'w') {
      var w = tuong(sel.id); if (!w) return;
      var poly = el('polygon', { points: khungTuong(w).map(function (q) { return q[0] + ',' + q[1]; }).join(' ') }, g);
      poly.setAttribute('fill', khoa(w) ? 'rgba(184,134,11,0.35)' : 'rgba(31,95,168,0.45)'); nenNet(poly, khoa(w) ? 'khoa' : 'chon', 2);
      var hh = hinh(w);
      vachKichThuoc(g, hh.A, hh.B, w.t / 2 + 22 / view.s, so(hh.len) + ' m');
      var ll = lotLongHaiBen(w);
      ['1', '-1'].forEach(function (b) {
        var k = ll.kq[b]; if (!k) return;
        var sg = +b, a = { x: ll.mid.x + ll.g.nx * sg * w.t / 2, y: ll.mid.y + ll.g.ny * sg * w.t / 2 }, c = { x: ll.mid.x + ll.g.nx * (k.d - sg * k.o.t / 2), y: ll.mid.y + ll.g.ny * (k.d - sg * k.o.t / 2) };
        vachKichThuoc(g, a, c, 0, 'lọt lòng ' + so(k.ll), 'nhan');
      });
      if (!khoa(w)) [w.a, w.b].forEach(function (id) {
        var n = nut(id), c = el('circle', { cx: n.x, cy: n.y, r: 9 / view.s, 'data-k': 'h', 'data-id': id, 'pointer-events': 'fill' }, svg);
        c.setAttribute('fill', '#ffffff'); nenNet(c, 'chon', 2.5);
      });
    } else if (sel.k === 'o') {
      var op = timTheo(plan.ops, sel.id); if (!op) return;
      var hc = veCua(g, op, 'chon'); if (!hc) return;
      vachKichThuoc(g, hc.P0, hc.P1, hc.w.t / 2 + 26 / view.s * op.phia * -1, so(op.rong) + ' m');
      var tu0 = op.s - op.rong / 2, tu1 = hc.g.len - op.s - op.rong / 2;
      if (tu0 > 0.02) vachKichThuoc(g, hc.g.A, hc.P0, -(hc.w.t / 2 + 26 / view.s) * op.phia, so(tu0), 'nhan');
      if (tu1 > 0.02) vachKichThuoc(g, hc.P1, hc.g.B, -(hc.w.t / 2 + 26 / view.s) * op.phia, so(tu1), 'nhan');
    } else if (sel.k === 'i') {
      var it = timTheo(plan.items, sel.id); if (!it) return;
      var b = hopDo(it), r = el('rect', { x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 }, g);
      r.setAttribute('fill', khoa(it) ? 'rgba(184,134,11,0.10)' : 'rgba(31,95,168,0.08)'); nenNet(r, khoa(it) ? 'khoa' : 'chon', 1.6); r.setAttribute('stroke-dasharray', '6 4');
      vachKichThuoc(g, { x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, -18 / view.s, so(b.x1 - b.x0));
      vachKichThuoc(g, { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, -18 / view.s, so(b.y1 - b.y0));
    } else if (sel.k === 'g') {
      var gh = timTheo(plan.ghi, sel.id); if (!gh) return;
      var c2 = el('circle', { cx: gh.x, cy: gh.y, r: 17 / view.s, fill: 'none' }, g); nenNet(c2, 'chon', 2);
    } else if (sel.k === 'p') {
      var pr = timTheo(plan.phong, sel.id); if (!pr) return;
      var rr = el('rect', { x: pr.x - 0.7, y: pr.y - 0.32, width: 1.4, height: 0.62, rx: 0.08, fill: 'none' }, g); nenNet(rr, 'chon', 1.6); rr.setAttribute('stroke-dasharray', '6 4');
    }
  }
  function veDangVe() {
    if (cong !== 'tuong' || !veTuong || !veTuong.a) return;
    var g = el('g', { 'pointer-events': 'none' }, svg), a = veTuong.a, b = veTuong.b || a;
    if (veTuong.b) {
      var len = kc(a, b);
      if (len > 0.01) {
        var ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, t = dayTuongMoi / 2;
        var p = el('polygon', { points: [[a.x - uy * t, a.y + ux * t], [b.x - uy * t, b.y + ux * t], [b.x + uy * t, b.y - ux * t], [a.x + uy * t, a.y - ux * t]].map(function (q) { return q[0] + ',' + q[1]; }).join(' ') }, g);
        p.setAttribute('fill', 'rgba(31,95,168,0.55)');
        vachKichThuoc(g, a, b, dayTuongMoi / 2 + 20 / view.s, so(len) + ' m');
      }
    }
    [a, b].forEach(function (q) { var c = el('circle', { cx: q.x, cy: q.y, r: 6 / view.s }, g); c.setAttribute('fill', q.nut || q.tuong ? MAU.chon : '#fff'); nenNet(c, 'chon', 2); });
  }

  /* ================= bắt điểm ================= */
  function diemChuot(e) {
    var r = svg.getBoundingClientRect();
    return { x: view.x + (e.clientX - r.left) / view.s, y: view.y + (e.clientY - r.top) / view.s };
  }
  function batDiem(p, boQuaNut) {
    var rNut = 16 / view.s, rTuong = 12 / view.s, tot = null, d0 = rNut;
    Object.keys(plan.nodes).forEach(function (id) {
      if (boQuaNut && boQuaNut[id]) return;
      var n = plan.nodes[id], d = kc(p, n); if (d < d0) { d0 = d; tot = { x: n.x, y: n.y, nut: id }; }
    });
    if (tot) return tot;
    d0 = rTuong;
    plan.walls.forEach(function (w) {
      if (boQuaNut && (boQuaNut[w.a] || boQuaNut[w.b])) return;
      var g = hinh(w), t = chieu(p, g), l = Math.abs(lech(p, g));
      if (t > 0.05 && t < g.len - 0.05 && l < d0) { d0 = l; var tt = tron(t); tot = { x: g.A.x + g.ux * tt, y: g.A.y + g.uy * tt, tuong: w.id }; }
    });
    if (tot) return tot;
    return { x: tron(p.x), y: tron(p.y) };
  }
  function tachTuong(wId, p) { // trả id nút mới nằm trên tường
    var w = tuong(wId); if (!w) return null;
    var g = hinh(w), t = chieu(p, g);
    if (t < 0.01) return w.a; if (t > g.len - 0.01) return w.b;
    var id = idMoi('n'); plan.nodes[id] = { x: g.A.x + g.ux * t, y: g.A.y + g.uy * t };
    var w2 = { id: idMoi('w'), a: id, b: w.b, t: w.t, khoa: w.khoa };
    w.b = id; plan.walls.push(w2);
    plan.ops.forEach(function (op) { if (op.w === w.id && op.s > t) { op.w = w2.id; op.s -= t; } });
    return id;
  }
  function nutTu(d) {
    if (d.nut) return d.nut;
    if (d.tuong) return tachTuong(d.tuong, d);
    var id = idMoi('n'); plan.nodes[id] = { x: d.x, y: d.y }; return id;
  }
  function donNut() {
    var dung = {};
    plan.walls.forEach(function (w) { dung[w.a] = 1; dung[w.b] = 1; });
    Object.keys(plan.nodes).forEach(function (id) { if (!dung[id]) delete plan.nodes[id]; });
  }
  function gopThangHang() { // gộp hai tường thẳng hàng cùng loại tại nút chỉ có 2 tường
    var doi = true;
    while (doi) {
      doi = false;
      var ids = Object.keys(plan.nodes);
      for (var i = 0; i < ids.length && !doi; i++) {
        var ds = dsTuongTaiNut(ids[i]); if (ds.length !== 2) continue;
        var p = ds[0], q = ds[1]; if (p.t !== q.t || !!p.khoa !== !!q.khoa) continue;
        var gp = hinh(p), gq = hinh(q); if (Math.abs(gp.ux * gq.uy - gp.uy * gq.ux) > 1e-6) continue;
        // hướng về: p kết thúc tại nút, q bắt đầu tại nút
        if (p.a === ids[i]) { var t1 = p.a; p.a = p.b; p.b = t1; plan.ops.forEach(function (op) { if (op.w === p.id) { op.s = gp.len - op.s; op.ban_le = op.ban_le === 'a' ? 'b' : 'a'; op.phia = -op.phia; } }); }
        if (q.b === ids[i]) { var t2 = q.a; q.a = q.b; q.b = t2; plan.ops.forEach(function (op) { if (op.w === q.id) { op.s = gq.len - op.s; op.ban_le = op.ban_le === 'a' ? 'b' : 'a'; op.phia = -op.phia; } }); }
        var lp = hinh(p).len;
        plan.ops.forEach(function (op) { if (op.w === q.id) { op.w = p.id; op.s += lp; } });
        p.b = q.b; plan.walls = plan.walls.filter(function (w) { return w.id !== q.id; });
        delete plan.nodes[ids[i]]; doi = true;
      }
    }
  }
  function chuoiThang(w) { // các tường thẳng hàng nối tiếp, cùng bề dày
    var g = hinh(w), kq = [w], da = {}, hang = [w.a, w.b]; da[w.id] = 1;
    while (hang.length) {
      var id = hang.pop();
      dsTuongTaiNut(id).forEach(function (o) {
        if (da[o.id] || o.t !== w.t) return;
        var h2 = hinh(o); if (Math.abs(h2.ux * g.uy - h2.uy * g.ux) > 1e-6) return;
        if (Math.abs(lech(h2.A, g)) > 1e-4) return;
        da[o.id] = 1; kq.push(o); hang.push(o.a, o.b);
      });
    }
    return kq;
  }
  function cungPhuong(g1, g2) { return Math.abs(g1.ux * g2.uy - g1.uy * g2.ux) < 1e-6; }
  /* Kéo một dãy tường: đầu dãy tựa vào tường khác thì chỉ được trượt dọc tường đó.
     Nút đầu dãy dính với tường không vuông góc (sẽ bị kéo xiên), hoặc là góc của tường đã khoá
     (sẽ làm đổi tường ngoài) → tách đầu tường ra nút riêng, thả tay thì nối lại vào tường nó chạm. */
  function xetDauDay(ch) {
    var trong = {}, dem = {}, g = hinh(ch[0]), tach = [], chan = false;
    ch.forEach(function (w) { trong[w.id] = 1; dem[w.a] = (dem[w.a] || 0) + 1; dem[w.b] = (dem[w.b] || 0) + 1; });
    Object.keys(dem).forEach(function (id) {
      var hong = dsTuongTaiNut(id).some(function (o) {
        if (trong[o.id]) return false;
        var go = hinh(o);
        if (Math.abs(go.ux * g.ux + go.uy * g.uy) > 1e-6) return true;          // không vuông góc: sẽ bị kéo xiên
        return khoa(o) && !dsTuongTaiNut(id).some(function (q) { return q.id !== o.id && !trong[q.id] && cungPhuong(hinh(q), go); });
      });
      if (!hong) return;
      if (dem[id] > 1) chan = true; else tach.push(id);
    });
    return { tach: tach, chan: chan };
  }
  function tachNut(id, dsTuong) { // tạo nút mới cùng chỗ cho các tường trong dsTuong
    var moi = idMoi('n'); plan.nodes[moi] = { x: plan.nodes[id].x, y: plan.nodes[id].y };
    dsTuong.forEach(function (w) { if (w.a === id) w.a = moi; if (w.b === id) w.b = moi; });
    return moi;
  }
  function donTuongTrung() {
    var da = {}, bo = {};
    plan.walls = plan.walls.filter(function (w) {
      if (w.a === w.b) { bo[w.id] = 1; return false; }
      var k = w.a < w.b ? w.a + '|' + w.b : w.b + '|' + w.a;
      if (da[k]) { bo[w.id] = 1; return false; }
      da[k] = 1; return true;
    });
    plan.ops = plan.ops.filter(function (op) { return !bo[op.w]; });
  }
  function thayNut(cu, moi) {
    plan.walls.forEach(function (w) { if (w.a === cu) w.a = moi; if (w.b === cu) w.b = moi; });
    delete plan.nodes[cu]; donTuongTrung();
  }
  function noiNut(id) { // nối nút đầu tường vào nút hoặc tường nó đang chạm; trả false nếu còn hở
    var n = plan.nodes[id]; if (!n) return true;
    var cua = {}; dsTuongTaiNut(id).forEach(function (w) { cua[w.id] = 1; });
    var tot = null, d0 = 0.031;
    Object.keys(plan.nodes).forEach(function (k) { if (k === id) return; var d = kc(n, plan.nodes[k]); if (d < d0) { d0 = d; tot = k; } });
    if (tot) { thayNut(id, tot); return true; }
    var wt = null; d0 = 0.031;
    plan.walls.forEach(function (w) { if (cua[w.id]) return; var g = hinh(w), t = chieu(n, g), l = Math.abs(lech(n, g)); if (t > 0.02 && t < g.len - 0.02 && l < d0) { d0 = l; wt = w; } });
    if (wt) { thayNut(id, tachTuong(wt.id, n)); return true; }
    return false;
  }
  function donSauKeo(dsNut, dsTuongCu) { // nối lại đầu tường, gộp tường thẳng hàng, giữ tường đang chọn
    var ho = 0;
    dsNut.forEach(function (id) { if (plan.nodes[id] && dsTuongTaiNut(id).length === 1 && !noiNut(id)) ho++; });
    donTuongTrung(); donNut(); gopThangHang();
    if (sel && sel.k === 'w' && !tuong(sel.id)) {
      var con = (dsTuongCu || []).filter(function (id) { return tuong(id); });
      sel = con.length ? { k: 'w', id: con[0] } : null;
    }
    return ho;
  }

  /* ================= lịch sử ================= */
  function ghiLai() { lichSu.push(JSON.stringify(plan)); if (lichSu.length > 80) lichSu.shift(); tienLai = []; }
  function luuTuDong() { try { localStorage.setItem(KHOA_LUU, JSON.stringify(plan)); } catch (e) { /* hết chỗ hoặc chặn lưu */ } }
  var henLuu = null;
  function xong(giuChon) {
    if (!giuChon && sel && !conTonTai(sel)) sel = null;
    phanTichCache = null; ve(); veBang();
    clearTimeout(henLuu); henLuu = setTimeout(luuTuDong, 400);
  }
  function conTonTai(s) {
    if (s.k === 'w') return !!tuong(s.id); if (s.k === 'o') return !!timTheo(plan.ops, s.id); if (s.k === 'i') return !!timTheo(plan.items, s.id);
    if (s.k === 'p') return !!timTheo(plan.phong, s.id); if (s.k === 'g') return !!timTheo(plan.ghi, s.id); if (s.k === 'anh') return !!anh; return false;
  }
  function hoanTac() { if (!lichSu.length) return; tienLai.push(JSON.stringify(plan)); plan = JSON.parse(lichSu.pop()); xong(); baoDong('Đã quay lại bước trước.'); }
  function lamLai() { if (!tienLai.length) return; lichSu.push(JSON.stringify(plan)); plan = JSON.parse(tienLai.pop()); xong(); }

  /* ================= gợi ý dòng ================= */
  var henGoiY = null;
  function baoDong(chu, giu) {
    var b = $('goiYDong'); b.textContent = chu || '';
    clearTimeout(henGoiY); if (chu && !giu) henGoiY = setTimeout(function () { b.textContent = ''; goiYCongCu(); }, 4200);
  }
  function goiYCongCu() {
    var m = {
      chon: '',
      tuong: veTuong && veTuong.a ? 'Bấm điểm tiếp theo. Bấm lại điểm cuối, nhấn Esc hoặc nút "Xong nét" để dừng.' : 'Bấm điểm bắt đầu tường. Điểm tự bắt vào góc tường và lưới 5 cm.',
      cua: 'Bấm lên tường để đặt cửa ' + maCua + '.',
      so: 'Bấm lên tường để đặt cửa sổ ' + maSo + '.',
      dat: datMa ? 'Bấm lên bản vẽ để đặt ' + (LIB[datMa] || {}).ten.toLowerCase() + '. Đồ sát tường tự quay lưng vào tường.' : '',
      phong: 'Bấm vào giữa phòng để đặt tên. Diện tích tự tính.',
      ghi_chu: 'Bấm vào chỗ muốn ghi chú cho KTS.',
      anh_do: !doAnh || !doAnh.length ? 'Đặt tỷ lệ ảnh: bấm vào đầu thứ nhất của một kích thước đã ghi trên ảnh (ví dụ cạnh lô 12 m).' : 'Bấm vào đầu thứ hai của kích thước đó.',
      anh_keo: 'Kéo để dời ảnh cho khớp. Xong bấm "Xong dời ảnh".'
    };
    baoDong(m[cong] || '', true);
  }

  /* ================= chọn & bảng chỉnh ================= */
  function chon(s) { sel = s; ve(); veBang(); if (s) moTheBang('chon'); }
  function moTheBang(ten) {
    theDangMo = ten;
    document.querySelectorAll('.the-bang button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-the') === ten)); });
    ['ndChon', 'ndThuVien', 'ndDienTich', 'ndKiem'].forEach(function (id) { $(id).hidden = true; });
    $({ chon: 'ndChon', thu_vien: 'ndThuVien', dien_tich: 'ndDienTich', kiem: 'ndKiem' }[ten]).hidden = false;
    veBang();
  }
  function moBangDienThoai(mo) {
    $('bang').classList.toggle('mo', !!mo);
    if (mo && sel && laDienThoai()) { // đưa phần đang chọn lên khoảng trống phía trên tấm chỉnh
      var t = tamChon(); if (!t) return;
      var cao = svg.clientHeight - Math.min(window.innerHeight * 0.46, 440) + 72, W = svg.clientWidth;
      view.x = t.x - W / view.s / 2; view.y = t.y - Math.max(80, cao / 2) / view.s; ve();
    }
  }
  function tamChon() {
    if (!sel) return null;
    if (sel.k === 'w') { var w = tuong(sel.id); if (!w) return null; var g = hinh(w); return { x: (g.A.x + g.B.x) / 2, y: (g.A.y + g.B.y) / 2 }; }
    if (sel.k === 'o') { var op = timTheo(plan.ops, sel.id), hc = op && hinhCua(op); return hc ? hc.C : null; }
    if (sel.k === 'i') { var it = timTheo(plan.items, sel.id); return it ? { x: it.cx, y: it.cy } : null; }
    if (sel.k === 'anh') return null;
    var r = timTheo(sel.k === 'p' ? plan.phong : plan.ghi, sel.id); return r ? { x: r.x, y: r.y } : null;
  }
  function laDienThoai() { return window.matchMedia('(max-width: 899px)').matches; }

  function oSo(nhan, gt, buoc, min, max, khiDoi, goiY, khoaO) {
    var inp = h('input', { type: 'text', inputmode: 'decimal', value: so(gt), 'aria-label': nhan });
    if (khoaO) inp.disabled = true;
    var dat = function (v) { if (v === null) { inp.value = so(gt); return; } v = Math.min(max, Math.max(min, v)); khiDoi(v); };
    inp.addEventListener('change', function () { dat(docSo(inp.value)); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { inp.blur(); } });
    var bTru = h('button', { type: 'button', 'aria-label': 'Giảm ' + buoc.toString().replace('.', ','), text: '−', onclick: function () { dat(gt - buoc); } });
    var bCong = h('button', { type: 'button', 'aria-label': 'Tăng', text: '+', onclick: function () { dat(gt + buoc); } });
    if (khoaO) { bTru.disabled = true; bCong.disabled = true; }
    return h('div', { cls: 'truong' }, [h('label', { text: nhan }), h('div', { cls: 'hang-so' }, [bTru, inp, h('span', { cls: 'dv', text: 'm' }), bCong]), goiY ? h('div', { cls: 'goi-y-truong', text: goiY }) : null]);
  }
  function nut2(nhan, ic, khiBam, lop, tat) {
    var b = h('button', { type: 'button', cls: 'nut' + (lop ? ' ' + lop : ''), onclick: khiBam }, [ic ? icon(IC[ic]) : null, nhan]);
    if (tat) b.disabled = true; return b;
  }
  function baoKhoa(chu) {
    return h('div', { cls: 'khoa-bao' }, [icon(IC.khoa), h('span', { text: chu })]);
  }
  function chipChon(ds, dangChon, khiChon) {
    return h('div', { cls: 'chon-nhanh' }, ds.map(function (d) {
      return h('button', { type: 'button', 'aria-pressed': String(d[0] === dangChon), text: d[1], onclick: function () { khiChon(d[0]); } });
    }));
  }
  function xoaCon(e) { while (e.firstChild) e.removeChild(e.firstChild); }

  function veBang() {
    var pt = phanTich();
    // đếm lỗi trên thẻ
    var nDo = pt.loi.filter(function (l) { return l.muc === 'do'; }).length, nVang = pt.loi.filter(function (l) { return l.muc === 'vang'; }).length, dem = $('demLoi');
    dem.hidden = !(nDo + nVang); dem.textContent = String(nDo + nVang); dem.classList.toggle('vang', !nDo);
    if (theDangMo === 'chon') veBangChon();
    else if (theDangMo === 'thu_vien') veThuVien();
    else if (theDangMo === 'dien_tich') veDienTich(pt);
    else veKiem(pt);
  }

  function veBangChon() {
    var nd = $('ndChon'); xoaCon(nd);
    if (cong === 'tuong') {
      nd.append(h('div', { cls: 'tieu' }, [h('h3', { text: 'Vẽ tường mới' }), h('span', { cls: 'ma', text: dayTuongMoi >= 0.2 ? 'T20' : 'T10' })]),
        h('p', { cls: 'mo-ta', text: 'Bấm điểm đầu, rồi bấm điểm cuối. Tường tự thẳng theo phương ngang hoặc dọc, tự nối vào tường có sẵn và chia lại phòng.' }),
        h('div', { cls: 'truong' }, [h('label', { text: 'Bề dày' }), chipChon([[0.1, 'Tường trong 100'], [0.2, 'Tường ngoài 200']], dayTuongMoi, function (v) {
          if (v >= 0.2 && cheDo !== 'kts') { baoDong('Tường ngoài 200 chỉ KTS vẽ được. Bật chế độ KTS ở góc trên nếu anh/chị là KTS.'); return; }
          dayTuongMoi = v; veBangChon(); goiYCongCu();
        })]),
        h('div', { cls: 'nhom-nut' }, [nut2('Xong nét', null, function () { veTuong = null; ve(); goiYCongCu(); }, 'chinh'), nut2('Về Chọn & kéo', null, function () { datCong('chon'); })]));
      return;
    }
    if (cong === 'cua' || cong === 'so') {
      var laCua = cong === 'cua', ds = Object.keys(CUA).filter(function (k) { return (CUA[k].loai === 'so') !== laCua; });
      nd.append(h('div', { cls: 'tieu' }, [h('h3', { text: laCua ? 'Thêm cửa đi' : 'Thêm cửa sổ' })]),
        h('p', { cls: 'mo-ta', text: 'Chọn loại rồi bấm lên tường. Sau khi đặt, kéo cửa dọc tường hoặc sửa bề rộng ở đây.' }),
        chipChon(ds.map(function (k) { return [k, k + ' · ' + CUA[k].ten]; }), laCua ? maCua : maSo, function (v) { if (laCua) maCua = v; else maSo = v; veBangChon(); goiYCongCu(); }),
        h('p', { cls: 'chu-thich', text: 'Kích thước phủ bì theo ký hiệu ALN: D1 910 × 2200, Dw 810 × 2000, Dob lọt lòng 900.' }));
      return;
    }
    if (sel && sel.k === 'anh' && anh) { bangAnh(nd); return; }
    if (cong === 'anh_do' && anh) { bangAnh(nd); return; }
    if (!sel) {
      nd.append(h('div', { cls: 'nut-anh-to' }, [nut2(anh ? 'Ảnh nền đang dùng — mở để chỉnh' : 'Có ảnh bản phác? Tải lên để đồ lại', 'anh', function () { if (anh) chon({ k: 'anh' }); else chonAnh(); }, 'rong')]));
      nd.append(h('div', { cls: 'trong' }, [
        icon('M4 4h16v16H4z|M4 12h9v8|M13 4v4'),
        h('b', { text: 'Bấm vào tường, cửa hoặc đồ vật để chỉnh' }),
        h('div', { cls: 'buoc' }, [
          h('div', null, [h('b', { text: '1' }), h('span', { text: 'Kéo tường để dời. Phòng hai bên tự co giãn, diện tích tự tính lại.' })]),
          h('div', null, [h('b', { text: '2' }), h('span', { text: 'Thêm cửa, cửa sổ, thiết bị bằng các nút bên trái (điện thoại: thanh dưới cùng).' })]),
          h('div', null, [h('b', { text: '3' }), h('span', { text: 'Xem thẻ Kiểm tra: máy nhắc chỗ hẹp, phòng thiếu cửa, đồ vướng cánh cửa.' })])
        ]),
        h('p', { cls: 'chu-thich', text: 'Tường ngoài, cầu thang, thang máy, hộp gen đã khoá để giữ an toàn kết cấu. Chỉ KTS mở khoá.' })
      ]));
      return;
    }
    if (sel.k === 'w') bangTuong(nd, tuong(sel.id));
    else if (sel.k === 'o') bangCua(nd, timTheo(plan.ops, sel.id));
    else if (sel.k === 'i') bangDo(nd, timTheo(plan.items, sel.id));
    else if (sel.k === 'p') bangPhong(nd, timTheo(plan.phong, sel.id));
    else if (sel.k === 'g') bangGhi(nd, timTheo(plan.ghi, sel.id));
  }

  function bangTuong(nd, w) {
    if (!w) return;
    var g = hinh(w), k = khoa(w), ll = lotLongHaiBen(w);
    nd.append(h('div', { cls: 'tieu' }, [h('h3', { text: w.t >= 0.2 ? 'Tường ngoài' : 'Tường trong' }), h('span', { cls: 'ma', text: w.t >= 0.2 ? 'T20' : 'T10' })]));
    if (k) nd.append(baoKhoa('Tường ngoài đã khoá để giữ kết cấu và ranh lô. Chỉ KTS chỉnh được.'));
    else nd.append(h('p', { cls: 'mo-ta', text: 'Kéo tường để dời song song. Kéo chấm tròn ở hai đầu để dài hoặc ngắn lại.' }));
    var benChu = ['1', '-1'].map(function (b) { var x = ll.kq[b]; return x ? so(x.ll) + ' m' : '—'; });
    nd.append(h('div', { cls: 'o-tong' }, [h('div', null, [h('span', { text: 'Lọt lòng một bên' }), h('b', { text: benChu[0] })]), h('div', null, [h('span', { text: 'Lọt lòng bên kia' }), h('b', { text: benChu[1] })])]));
    nd.append(oSo('Chiều dài tim tường', g.len, 0.05, 0.3, 60, function (v) {
      ghiLai(); var B = nut(w.b); B.x = g.A.x + g.ux * v; B.y = g.A.y + g.uy * v; xong(true);
    }, null, k));
    nd.append(h('div', { cls: 'truong' }, [h('label', { text: 'Bề dày' }), chipChon([[0.1, 'Tường trong 100'], [0.2, 'Tường ngoài 200']], w.t, function (v) {
      if (cheDo !== 'kts') { baoDong('Đổi bề dày tường chỉ KTS làm được.'); return; }
      ghiLai(); chuoiThang(w).forEach(function (o) { o.t = v; }); xong(true);
    })]));
    nd.append(h('div', { cls: 'nhom-nut' }, [
      nut2('Thêm cửa đi', 'cua', function () { ghiLai(); themCuaVaoTuong(w, g.len / 2, maCua); }),
      nut2('Thêm cửa sổ', 'so', function () { ghiLai(); themCuaVaoTuong(w, g.len / 2, maSo); }),
      cheDo === 'kts' ? nut2(w.khoa ? 'Mở khoá tường' : 'Khoá tường', 'khoa', function () { ghiLai(); var kh = !w.khoa; chuoiThang(w).forEach(function (o) { o.khoa = kh; }); xong(true); }, 'rong') : null,
      nut2('Xoá tường', 'xoa', function () { xoaChon(); }, 'xoa rong', k)
    ]));
  }
  function themCuaVaoTuong(w, s, ma) {
    var c = CUA[ma], g = hinh(w), r = Math.min(c.w, g.len - 0.2);
    if (r < 0.4) { baoDong('Đoạn tường này ngắn quá, không đặt cửa được.'); lichSu.pop(); return; }
    var op = { id: idMoi('o'), w: w.id, s: Math.min(Math.max(s, r / 2 + 0.1), g.len - r / 2 - 0.1), rong: r, ma: ma, ban_le: 'a', phia: 1 };
    plan.ops.push(op); sel = { k: 'o', id: op.id }; xong(true);
    ga('aln_dmb_them', { loai: ma });
  }
  function bangCua(nd, op) {
    if (!op) return;
    var c = CUA[op.ma] || {}, hc = hinhCua(op), laSo = c.loai === 'so';
    nd.append(h('div', { cls: 'tieu' }, [h('h3', { text: c.ten || op.ma }), h('span', { cls: 'ma', text: op.ma })]),
      h('p', { cls: 'mo-ta', text: 'Kéo cửa dọc theo tường để dời. Kích thước phủ bì.' }));
    var ds = Object.keys(CUA).filter(function (k) { return (CUA[k].loai === 'so') === laSo; });
    nd.append(h('div', { cls: 'truong' }, [h('label', { text: 'Loại' }), chipChon(ds.map(function (k) { return [k, k]; }), op.ma, function (v) {
      ghiLai(); op.ma = v; op.rong = Math.min(CUA[v].w, hc.g.len - 0.2); op.s = Math.min(Math.max(op.s, op.rong / 2 + 0.05), hc.g.len - op.rong / 2 - 0.05); xong(true);
    })]));
    nd.append(oSo('Bề rộng', op.rong, 0.05, 0.4, Math.max(0.5, hc.g.len - 0.1), function (v) {
      ghiLai(); op.rong = v; op.s = Math.min(Math.max(op.s, v / 2 + 0.05), hc.g.len - v / 2 - 0.05); xong(true);
    }, 'Ký hiệu ' + op.ma + ' thường ' + so(c.min) + '–' + so(c.max) + ' m'));
    var nutCua = [];
    if (!laSo && !c.lo) {
      if (c.canh === 1) nutCua.push(nut2('Đổi bên bản lề', 'lat', function () { ghiLai(); op.ban_le = op.ban_le === 'a' ? 'b' : 'a'; xong(true); }));
      nutCua.push(nut2('Đổi phía mở', 'xoay', function () { ghiLai(); op.phia = -op.phia; xong(true); }));
      if (c.canh === 1) nutCua.push(nut2('Dời sát góc', 'goc', function () { doiSatGoc(op); }, 'rong'));
    }
    nutCua.push(nut2('Xoá cửa', 'xoa', function () { xoaChon(); }, 'xoa rong'));
    nd.append(h('div', { cls: 'nhom-nut' }, nutCua));
  }
  function doiSatGoc(op) {
    var hc = hinhCua(op); if (!hc) return;
    var le = 0.15, s0 = op.rong / 2 + le, s1 = hc.g.len - op.rong / 2 - le;
    ghiLai();
    if (Math.abs(op.s - s0) <= Math.abs(op.s - s1)) { op.s = s0; op.ban_le = 'a'; } else { op.s = s1; op.ban_le = 'b'; }
    xong(true); baoDong('Đã dời cửa sát góc, bản lề phía góc để cánh mở nép vào tường.');
  }
  function bangDo(nd, it) {
    if (!it) return;
    var s = LIB[it.ma] || {}, k = khoa(it);
    nd.append(h('div', { cls: 'tieu' }, [h('h3', { text: s.ten || it.ma }), h('span', { cls: 'ma', text: it.ma })]));
    if (k) nd.append(baoKhoa((s.ten || 'Mục này') + ' đã khoá vì liên quan kết cấu và kỹ thuật. Chỉ KTS chỉnh được.'));
    else if (s.mo) nd.append(h('p', { cls: 'mo-ta', text: s.mo }));
    else nd.append(h('p', { cls: 'mo-ta', text: 'Kéo để dời. Thả gần tường thì tự áp sát tường.' }));
    nd.append(oSo('Rộng', it.w, 0.05, 0.1, 30, function (v) { ghiLai(); it.w = v; xong(true); }, null, k));
    nd.append(oSo(it.ma === 'TH' ? 'Dài' : 'Sâu', it.h, 0.05, 0.1, 30, function (v) { ghiLai(); it.h = v; xong(true); }, null, k));
    if (it.ma === 'TH') {
      var n = it.n || 21;
      nd.append(h('div', { cls: 'truong' }, [h('label', { text: 'Số bậc mỗi tầng' }), h('div', { cls: 'hang-so' }, [
        h('button', { type: 'button', text: '−', 'aria-label': 'Bớt một bậc', onclick: function () { if (k) return; ghiLai(); it.n = Math.max(15, n - 1); xong(true); } }),
        h('input', { type: 'text', value: String(n), readonly: 'readonly', 'aria-label': 'Số bậc' }),
        h('span', { cls: 'dv', text: 'bậc' }),
        h('button', { type: 'button', text: '+', 'aria-label': 'Thêm một bậc', onclick: function () { if (k) return; ghiLai(); it.n = Math.min(24, n + 1); xong(true); } })
      ]), h('div', { cls: 'goi-y-truong', text: 'Thường 17–22 bậc, mặc định 21. Mặt bậc 25–30 cm.' })]));
      nd.append(h('div', { cls: 'truong' }, [h('label', { text: 'Kiểu thang' }), chipChon([['I', 'Một vế'], ['U', 'Hai vế']], it.kieu === 'U' ? 'U' : 'I', function (v) {
        if (k) { baoDong('Cầu thang đã khoá. Chỉ KTS đổi được.'); return; }
        ghiLai(); it.kieu = v; if (v === 'U' && it.w < 1.9) it.w = 1.9; xong(true);
      })]));
    }
    var ds = [nut2('Xoay 90°', 'xoay', function () { ghiLai(); it.rot = (it.rot + 90) % 360; xong(true); }, null, k),
      nut2('Lật', 'lat', function () { ghiLai(); if (it.ma === 'TH') it.dao = !it.dao; else it.lat = !it.lat; xong(true); }, null, k),
      nut2('Nhân bản', 'nhan', function () { ghiLai(); var m = JSON.parse(JSON.stringify(it)); m.id = idMoi('i'); m.cx += 0.3; m.cy += 0.3; plan.items.push(m); sel = { k: 'i', id: m.id }; xong(true); }, null, k && cheDo !== 'kts')];
    if (cheDo === 'kts') ds.push(nut2(it.khoa ? 'Mở khoá' : 'Khoá', 'khoa', function () { ghiLai(); it.khoa = !it.khoa; xong(true); }));
    ds.push(nut2('Xoá', 'xoa', function () { xoaChon(); }, 'xoa' + (cheDo === 'kts' ? '' : ' rong'), k));
    nd.append(h('div', { cls: 'nhom-nut' }, ds));
  }
  function bangPhong(nd, r) {
    if (!r) return;
    var pt = phanTich(), v = pt.theoMa[r._vung];
    nd.append(h('div', { cls: 'tieu' }, [h('h3', { text: 'Tên phòng' })]));
    var inp = h('input', { type: 'text', value: r.ten, maxlength: '30', 'aria-label': 'Tên phòng' });
    inp.addEventListener('change', function () { var t = inp.value.trim(); if (!t) { inp.value = r.ten; return; } ghiLai(); r.ten = t; xong(true); });
    nd.append(h('div', { cls: 'truong' }, [h('label', { text: 'Tên' }), inp]),
      chipChon(TEN_NHANH.map(function (t) { return [t, t]; }), r.ten, function (t) { ghiLai(); r.ten = t; xong(true); }));
    nd.append(h('div', { cls: 'o-tong' }, [
      h('div', null, [h('span', { text: 'Diện tích lọt lòng' }), h('b', { text: r._ngoai ? '—' : (v ? so(v.dt, 1) + ' m²' : '—') })]),
      h('div', null, [h('span', { text: 'Thông với' }), h('b', { text: v && v.phong.length > 1 ? String(v.phong.length - 1) + ' phòng' : 'Không' })])
    ]));
    if (v && v.phong.length > 1) nd.append(h('p', { cls: 'chu-thich', text: 'Không gian chung: ' + v.ten.join(', ') + '. Muốn tách diện tích từng phòng thì vẽ thêm tường hoặc vách.' }));
    nd.append(h('div', { cls: 'nhom-nut' }, [nut2('Xoá tên phòng', 'xoa', function () { xoaChon(); }, 'xoa rong')]));
  }
  function bangGhi(nd, gh) {
    if (!gh) return;
    var ta = h('textarea', { maxlength: '400', 'aria-label': 'Nội dung ghi chú' }); ta.value = gh.nd;
    ta.addEventListener('change', function () { ghiLai(); gh.nd = ta.value.slice(0, 400); xong(true); });
    nd.append(h('div', { cls: 'tieu' }, [h('h3', { text: 'Ghi chú số ' + (plan.ghi.indexOf(gh) + 1) })]),
      h('div', { cls: 'truong' }, [h('label', { text: 'Nội dung gửi KTS' }), ta]),
      h('div', { cls: 'nhom-nut' }, [nut2('Xoá ghi chú', 'xoa', function () { xoaChon(); }, 'xoa rong')]));
  }

  /* ---------- thư viện ---------- */
  function hinhMau(ma) {
    var s = LIB[ma], o = { w: s.w, h: s.h, n: 13 }, sv = document.createElementNS(NS, 'svg');
    var m = 0.15, cw = s.w, ch = s.h;
    if (ma === 'TH') { o.h = 2.6; ch = 2.6; }
    var k = Math.max(cw, ch) + m * 2;
    sv.setAttribute('viewBox', [(cw - k) / 2, (ch - k) / 2 - 0.05, k, k].join(' ')); sv.setAttribute('aria-hidden', 'true');
    veNet(sv, s.ve(o), function (x, y) { return { x: x, y: y }; }, null, 1.2);
    return sv;
  }
  function veThuVien() {
    var nd = $('ndThuVien'); xoaCon(nd);
    nd.append(h('p', { cls: 'mo-ta', text: 'Chọn một món rồi bấm lên bản vẽ để đặt. Đồ sát tường tự quay lưng vào tường gần nhất.' }));
    KH.NHOM.forEach(function (nh) {
      var ma = Object.keys(LIB).filter(function (k) { return LIB[k].nhom === nh; }); if (!ma.length) return;
      nd.append(h('div', { cls: 'tv-nhom' }, [h('h4', { text: nh + (nh === 'Lên xuống & kỹ thuật' ? ' · KTS' : '') }), h('div', { cls: 'tv-luoi' }, ma.map(function (k) {
        return h('button', { type: 'button', cls: 'tv-the', 'aria-pressed': String(cong === 'dat' && datMa === k), title: LIB[k].ten, onclick: function () {
          if (LIB[k].khoa && cheDo !== 'kts') { baoDong(LIB[k].ten + ' liên quan kết cấu, chỉ KTS thêm được. Bật chế độ KTS ở góc trên nếu anh/chị là KTS.'); return; }
          datMa = k; datCong('dat'); if (laDienThoai()) moBangDienThoai(false);
        } }, [hinhMau(k), h('span', { text: LIB[k].ten }), h('span', { cls: 'ma', text: k })]);
      }))]));
    });
  }

  /* ---------- diện tích ---------- */
  function veDienTich(pt) {
    var nd = $('ndDienTich'); xoaCon(nd);
    var dsV = pt.vungs.filter(function (v) { return v.phong.length && v.trongNha; }), dsN = pt.vungs.filter(function (v) { return v.phong.length && !v.trongNha; });
    var tong = 0; dsV.forEach(function (v) { tong += v.dt; });
    var conTrong = 0; pt.trong.forEach(function (v) { if (v.trongNha) conTrong += v.dt; });
    nd.append(h('div', { cls: 'o-tong' }, [
      h('div', null, [h('span', { text: 'Sàn sử dụng (lọt lòng)' }), h('b', { text: so(tong + conTrong, 1) + ' m²' })]),
      h('div', null, [h('span', { text: 'Xây dựng (gồm tường)' }), h('b', { text: so(pt.dtXayDung, 1) + ' m²' })])
    ]));
    var bang = h('table', { cls: 'bang-dt' }), tb = h('tbody');
    bang.append(h('thead', null, [h('tr', null, [h('th', { text: 'Phòng' }), h('th', { text: 'm²', style: 'text-align:right' })])]), tb);
    var dong = function (ten, dt, khiBam, lop) {
      var tr = h('tr', lop ? { cls: lop } : null, [h('td', { text: ten }), h('td', { cls: 'so', text: dt })]);
      if (khiBam) { tr.setAttribute('data-chon', '1'); tr.addEventListener('click', khiBam); }
      tb.append(tr);
    };
    dsV.sort(function (a, b) { return b.dt - a.dt; }).forEach(function (v) { dong(v.ten.join(' + '), so(v.dt, 1), function () { chon({ k: 'p', id: v.phong[0].id }); keoToi(v.cx, v.cy); }); });
    pt.trong.forEach(function (v) { if (v.trongNha && v.dt >= 0.6) dong('Chưa đặt tên', so(v.dt, 1), function () { keoToi(v.cx, v.cy); }); });
    dong('Tổng', so(tong + conTrong, 1), null, 'tong');
    nd.append(bang);
    if (dsN.length) nd.append(h('p', { cls: 'chu-thich', text: 'Ngoài khối nhà (không cộng vào tổng): ' + dsN.map(function (v) { return v.ten.join(' + ') + ' ' + so(v.dt, 1) + ' m²'; }).join('; ') + '.' }));
    nd.append(h('p', { cls: 'chu-thich', text: 'Diện tích tính theo lưới 5 cm, đo lọt lòng (đã trừ tường). Số liệu để tham khảo khi trao đổi với KTS, chưa phải diện tích quy đổi tính phí hay dự toán.' }));
    nd.append(nut2('Tải bảng diện tích (CSV)', null, function () {
      var dongCsv = [['Phong', 'Dien tich (m2)']];
      dsV.forEach(function (v) { dongCsv.push([v.ten.join(' + '), v.dt.toFixed(2)]); });
      dongCsv.push(['Tong san su dung', (tong + conTrong).toFixed(2)], ['Dien tich xay dung', pt.dtXayDung.toFixed(2)]);
      taiFile(tenTep('csv'), '﻿' + dongCsv.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n'), 'text/csv');
    }, 'rong'));
  }
  /* ---------- kiểm tra ---------- */
  function veKiem(pt) {
    var nd = $('ndKiem'); xoaCon(nd);
    if (!pt.loi.length) { nd.append(h('div', { cls: 'ok', text: 'Chưa thấy chỗ nào cần sửa.' })); }
    pt.loi.forEach(function (l) {
      var hd = h('div', { cls: 'hanh-dong' }, [h('button', { type: 'button', text: 'Xem', onclick: function () {
        if (l.ref && l.ref.k !== 'vung') chon(l.ref); keoToi(l.x, l.y);
        if (laDienThoai()) moBangDienThoai(false);
      } })]);
      if (l.sua) hd.append(h('button', { type: 'button', text: l.sua.nhan, onclick: l.sua.lam }));
      nd.append(h('div', { cls: 'loi ' + l.muc }, [h('span', { cls: 'cham' }), h('div', { cls: 'nd' }, [h('span', { text: l.nd }), hd])]));
    });
    nd.append(h('p', { cls: 'chu-thich', text: 'Đỏ: cần sửa. Vàng: nên xem lại. Xanh: gợi ý. Máy chỉ nhắc, không chặn — KTS xem lại toàn bộ trước khi chốt phương án.' }));
  }

  /* ================= thao tác ================= */
  function xoaChon() {
    if (sel && sel.k === 'anh') return;
    if (!sel) return;
    if (sel.k === 'w') {
      var w = tuong(sel.id); if (!w) return;
      if (khoa(w)) { baoDong('Tường ngoài đã khoá, chỉ KTS xoá được.'); return; }
      ghiLai();
      plan.walls = plan.walls.filter(function (o) { return o.id !== w.id; });
      plan.ops = plan.ops.filter(function (o) { return o.w !== w.id; });
      donNut(); gopThangHang();
      baoDong('Đã xoá tường. Hai phòng hai bên giờ thông nhau.');
    } else if (sel.k === 'o') { ghiLai(); plan.ops = plan.ops.filter(function (o) { return o.id !== sel.id; }); }
    else if (sel.k === 'i') {
      var it = timTheo(plan.items, sel.id); if (khoa(it)) { baoDong((LIB[it.ma] || {}).ten + ' đã khoá, chỉ KTS xoá được.'); return; }
      ghiLai(); plan.items = plan.items.filter(function (o) { return o.id !== sel.id; });
    } else if (sel.k === 'p') { ghiLai(); plan.phong = plan.phong.filter(function (o) { return o.id !== sel.id; }); }
    else if (sel.k === 'g') { ghiLai(); plan.ghi = plan.ghi.filter(function (o) { return o.id !== sel.id; }); }
    sel = null; xong();
  }
  function bamTuong(it, xoayTheo) { // áp lưng đồ vào tường gần nhất
    var s = LIB[it.ma]; if (!s || !s.bam) return;
    var tot = null, d0 = xoayTheo ? 0.6 : 0.25;
    plan.walls.forEach(function (w) {
      var g = hinh(w); if (Math.abs(g.ux) > 1e-6 && Math.abs(g.uy) > 1e-6) return;
      var t = chieu({ x: it.cx, y: it.cy }, g); if (t < 0 || t > g.len) return;
      var l = lech({ x: it.cx, y: it.cy }, g), sg = l >= 0 ? 1 : -1;
      var k = kichDo(it), sau = (Math.abs(g.ny) > 0.5 ? k.h : k.w) / 2;
      if (xoayTheo) sau = it.h / 2;
      var cach = Math.abs(l) - w.t / 2 - sau;
      if (Math.abs(cach) < d0) { d0 = Math.abs(cach); tot = { g: g, w: w, sg: sg }; }
    });
    if (!tot) return;
    var g2 = tot.g, nx = g2.nx * tot.sg, ny = g2.ny * tot.sg;
    if (xoayTheo) { // lưng (cạnh y=0 của đồ) quay về phía tường: hướng "lưng → mặt" = (nx,ny)
      var goc = Math.round(Math.atan2(-nx, ny) * 180 / Math.PI);
      it.rot = ((Math.round(goc / 90) * 90) % 360 + 360) % 360;
    }
    var kk = kichDo(it), nua = Math.abs(ny) > 0.5 ? kk.h / 2 : kk.w / 2;
    var l2 = lech({ x: it.cx, y: it.cy }, g2), muc = tot.sg * (tot.w.t / 2 + nua);
    it.cx += g2.nx * (muc - l2); it.cy += g2.ny * (muc - l2);
  }

  function datCong(ten) {
    if (ten !== 'tuong') veTuong = null;
    if (ten !== 'anh_do') doAnh = null;
    cong = ten;
    document.querySelectorAll('#congCu .cc').forEach(function (b) {
      var c = b.getAttribute('data-cc');
      b.setAttribute('aria-pressed', String(c === ten || (ten === 'dat' && c === 'thu_vien')));
    });
    svg.setAttribute('class', 'ban-ve cc-' + ten);
    if (ten === 'thu_vien') { moTheBang('thu_vien'); if (laDienThoai()) moBangDienThoai(true); cong = 'chon'; }
    else if (ten === 'tuong' || ten === 'cua' || ten === 'so') { sel = null; moTheBang('chon'); }
    goiYCongCu(); ve(); veBang();
  }

  function taoTenPhong(x, y) {
    hopThoai('Đặt tên phòng', function (khung) {
      var inp = h('input', { type: 'text', maxlength: '30', placeholder: 'Ví dụ: Phòng ngủ con', 'aria-label': 'Tên phòng' });
      khung.append(h('div', { cls: 'truong' }, [h('label', { text: 'Tên phòng' }), inp]), chipChon(TEN_NHANH.map(function (t) { return [t, t]; }), null, function (t) { inp.value = t; }));
      setTimeout(function () { inp.focus(); }, 30);
      return function () { var t = inp.value.trim(); if (!t) return false; ghiLai(); var r = { id: idMoi('p'), ten: t, x: x, y: y }; plan.phong.push(r); sel = { k: 'p', id: r.id }; xong(true); return true; };
    }, 'Đặt tên');
  }
  function taoGhiChu(x, y) {
    hopThoai('Ghi chú cho KTS', function (khung) {
      var ta = h('textarea', { maxlength: '400', placeholder: 'Ví dụ: muốn cửa sổ phòng này to hơn', 'aria-label': 'Nội dung ghi chú' });
      khung.append(h('div', { cls: 'truong' }, [h('label', { text: 'Nội dung' }), ta]));
      setTimeout(function () { ta.focus(); }, 30);
      return function () { var t = ta.value.trim(); if (!t) return false; ghiLai(); var gh = { id: idMoi('g'), x: x, y: y, nd: t.slice(0, 400) }; plan.ghi.push(gh); sel = { k: 'g', id: gh.id }; datCong('chon'); xong(true); return true; };
    }, 'Ghim');
  }

  /* ---------- con trỏ ---------- */
  function mucTieu(e) {
    var t = e.target; while (t && t !== svg) { if (t.getAttribute && t.getAttribute('data-k')) return { k: t.getAttribute('data-k'), id: t.getAttribute('data-id') }; t = t.parentNode; }
    return null;
  }
  svg.addEventListener('pointerdown', function (e) {
    if (e.button === 2) return;
    svg.setPointerCapture(e.pointerId);
    conTro.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (conTro.size === 2) { // bắt đầu chụm hai ngón
      var ds = Array.from(conTro.values());
      keo = { loai: 'chum', d0: Math.hypot(ds[0].x - ds[1].x, ds[0].y - ds[1].y), s0: view.s, c0: { x: (ds[0].x + ds[1].x) / 2, y: (ds[0].y + ds[1].y) / 2 }, v0: { x: view.x, y: view.y } };
      return;
    }
    var p = diemChuot(e), mt = mucTieu(e);
    keo = { loai: 'cho', p0: p, sx: e.clientX, sy: e.clientY, mt: mt, daDi: false, daGhi: false };
    if (cong === 'anh_keo' && anh) { keo.loai = 'anh'; keo.o0 = { x: anh.cx, y: anh.cy }; return; }
    if (cong === 'anh_do') { keo.loai = 'pan'; keo.v0 = { x: view.x, y: view.y }; return; }
    if (cong === 'chon' && mt) {
      if (mt.k === 'h') {
        keo.loai = 'nut'; keo.id = mt.id; keo.n0 = { x: nut(mt.id).x, y: nut(mt.id).y };
        // chủ nhà kéo đầu tường đang dính tường khác: tách đầu tường ra, không kéo theo tường kia
        var wh = sel && sel.k === 'w' ? tuong(sel.id) : null;
        keo.tachNut = !!(wh && cheDo !== 'kts' && dsTuongTaiNut(mt.id).length > 1);
      }
      else if (mt.k === 'w') {
        var w = tuong(mt.id); sel = mt;
        if (!khoa(w)) {
          var ch = chuoiThang(w), xd = xetDauDay(ch);
          if (xd.chan) { keo.loai = 'khoa'; keo.lyDo = 'Giữa dãy tường này có chỗ nối vào tường ngoài đã khoá. Kéo từng đoạn tường, hoặc kéo nút tròn ở đầu tường.'; }
          else { keo.loai = 'tuong'; keo.g = hinh(w); keo.ch = ch.map(function (o) { return o.id; }); keo.tach = xd.tach; keo.c0 = keo.g.A.x * keo.g.nx + keo.g.A.y * keo.g.ny; }
        } else keo.loai = 'khoa';
      } else if (mt.k === 'o') { sel = mt; keo.loai = 'cua'; }
      else if (mt.k === 'i') {
        var it = timTheo(plan.items, mt.id); sel = mt;
        if (!khoa(it)) { keo.loai = 'do'; keo.o0 = { x: it.cx, y: it.cy }; } else keo.loai = 'khoa';
      } else if (mt.k === 'p') { sel = mt; var r = timTheo(plan.phong, mt.id); keo.loai = 'nhan'; keo.o0 = { x: r.x, y: r.y }; }
      else if (mt.k === 'g') { sel = mt; var gh = timTheo(plan.ghi, mt.id); keo.loai = 'ghim'; keo.o0 = { x: gh.x, y: gh.y }; }
      ve();
    } else if (cong === 'chon') {
      keo.loai = 'pan'; keo.v0 = { x: view.x, y: view.y };
    }
  });
  function mocCua(keoC) { // trước khi kéo: nhớ vị trí thật các cửa trên tường bị ảnh hưởng
    var ids = {}; keoC.nuts.forEach(function (n) { ids[n.id] = 1; });
    keoC.cuas = plan.ops.filter(function (op) { var w = tuong(op.w); return w && (ids[w.a] || ids[w.b]); }).map(function (op) { var hc = hinhCua(op); return { op: op, C: hc.C }; });
  }
  function datLaiCua(keoC) {
    var ok = true;
    keoC.cuas.forEach(function (c) {
      var w = tuong(c.op.w), g = hinh(w), s = chieu(c.C, g), lo = c.op.rong / 2 + 0.05, hi = g.len - c.op.rong / 2 - 0.05;
      if (hi < lo) { ok = false; return; }
      c.op.s = Math.min(Math.max(s, lo), hi);
    });
    return ok;
  }
  svg.addEventListener('pointermove', function (e) {
    if (conTro.has(e.pointerId)) conTro.set(e.pointerId, { x: e.clientX, y: e.clientY });
    var p = diemChuot(e);
    if (cong === 'tuong' && veTuong && veTuong.a && (!keo || keo.loai === 'cho')) {
      var a = veTuong.a, raw = { x: p.x, y: p.y };
      if (!e.shiftKey) { if (Math.abs(raw.x - a.x) > Math.abs(raw.y - a.y)) raw.y = a.y; else raw.x = a.x; }
      var b = batDiem(raw);
      if (!b.nut && !b.tuong && !e.shiftKey) { if (Math.abs(raw.x - a.x) > Math.abs(raw.y - a.y)) b.y = a.y; else b.x = a.x; }
      veTuong.b = b; ve();
    }
    if (!keo) return;
    if (keo.loai === 'chum') {
      var ds = Array.from(conTro.values()); if (ds.length < 2) return;
      var d = Math.hypot(ds[0].x - ds[1].x, ds[0].y - ds[1].y), s = Math.min(400, Math.max(8, keo.s0 * d / keo.d0));
      var r = svg.getBoundingClientRect(), c = { x: (ds[0].x + ds[1].x) / 2, y: (ds[0].y + ds[1].y) / 2 };
      var wx = keo.v0.x + (keo.c0.x - r.left) / keo.s0, wy = keo.v0.y + (keo.c0.y - r.top) / keo.s0;
      view.s = s; view.x = wx - (c.x - r.left) / s; view.y = wy - (c.y - r.top) / s; ve(); return;
    }
    var di = Math.hypot(e.clientX - keo.sx, e.clientY - keo.sy);
    if (!keo.daDi && di < 5) return;
    keo.daDi = true;
    var dx = p.x - keo.p0.x, dy = p.y - keo.p0.y;
    if (keo.loai === 'pan') { view.x = keo.v0.x - (e.clientX - keo.sx) / view.s; view.y = keo.v0.y - (e.clientY - keo.sy) / view.s; ve(); return; }
    if (keo.loai === 'khoa') { baoDong(keo.lyDo || (keo.mt.k === 'w' ? 'Tường ngoài đã khoá — chỉ KTS chỉnh được. Bật chế độ KTS ở góc trên nếu anh/chị là KTS.' : 'Mục này đã khoá vì liên quan kết cấu và kỹ thuật. Chỉ KTS chỉnh được.')); keo.loai = 'xong'; return; }
    if (keo.loai === 'anh') { anh.cx = keo.o0.x + dx; anh.cy = keo.o0.y + dy; ve(); return; }
    if (!keo.daGhi && /tuong|nut|cua|do|nhan|ghim/.test(keo.loai)) {
      ghiLai(); keo.daGhi = true;
      if (keo.loai === 'tuong') {
        var dsCh = keo.ch.map(tuong);
        keo.tachMoi = keo.tach.map(function (id) { return tachNut(id, dsCh); });
        var idsN = {}; dsCh.forEach(function (o) { idsN[o.a] = 1; idsN[o.b] = 1; });
        keo.nuts = Object.keys(idsN).map(function (id) { return { id: id, x: plan.nodes[id].x, y: plan.nodes[id].y }; });
        mocCua(keo);
      }
      if (keo.loai === 'nut') {
        if (keo.tachNut) keo.id = tachNut(keo.id, [tuong(sel.id)]);
        keo.nuts = [{ id: keo.id }]; mocCua(keo);
      }
      svg.classList.add('dang-keo');
    }
    if (keo.loai === 'tuong') {
      var d0 = dx * keo.g.nx + dy * keo.g.ny, moi = tron(keo.c0 + d0) - keo.c0, cu = keo.nuts.map(function (n) { return { x: plan.nodes[n.id].x, y: plan.nodes[n.id].y }; });
      keo.nuts.forEach(function (n) { plan.nodes[n.id].x = n.x + keo.g.nx * moi; plan.nodes[n.id].y = n.y + keo.g.ny * moi; });
      var ngan = plan.walls.some(function (w) { return hinh(w).len < 0.2; });
      if (ngan || !datLaiCua(keo)) { keo.nuts.forEach(function (n, i) { plan.nodes[n.id].x = cu[i].x; plan.nodes[n.id].y = cu[i].y; }); datLaiCua(keo); }
      phanTichCache = null; ve(); veBangChonNhe(); return;
    }
    if (keo.loai === 'nut') {
      var n0 = keo.n0, np = { x: n0.x + dx, y: n0.y + dy }, w2 = sel && sel.k === 'w' ? tuong(sel.id) : null;
      if (w2 && cheDo !== 'kts') { var g2 = hinh(w2), t = (np.x - n0.x) * g2.ux + (np.y - n0.y) * g2.uy; np = { x: n0.x + g2.ux * t, y: n0.y + g2.uy * t }; }
      np = { x: tron(np.x), y: tron(np.y) };
      if (dsTuongTaiNut(keo.id).length === 1) { // đầu tường hở: bắt vào nút hoặc tường gần
        var bo = {}; bo[keo.id] = 1;
        var bd = batDiem({ x: n0.x + dx, y: n0.y + dy }, bo);
        if ((bd.nut || bd.tuong) && (!w2 || cheDo === 'kts' || Math.abs((bd.x - n0.x) * hinh(w2).nx + (bd.y - n0.y) * hinh(w2).ny) < 0.02)) np = { x: bd.x, y: bd.y };
      }
      var nn = plan.nodes[keo.id], cu2 = { x: nn.x, y: nn.y }; nn.x = np.x; nn.y = np.y;
      if (plan.walls.some(function (w) { return hinh(w).len < 0.2; }) || !datLaiCua(keo)) { nn.x = cu2.x; nn.y = cu2.y; datLaiCua(keo); }
      phanTichCache = null; ve(); veBangChonNhe(); return;
    }
    if (keo.loai === 'cua') {
      var op = timTheo(plan.ops, sel.id), hc = hinhCua(op), g3 = hc.g, nhan = null;
      // thả sang tường khác nếu kéo xa
      var l = Math.abs(lech(p, g3));
      if (l > 0.5) {
        var tot = null, dd = 0.35;
        plan.walls.forEach(function (w) { var gg = hinh(w), tt = chieu(p, gg), ll = Math.abs(lech(p, gg)); if (tt > op.rong / 2 && tt < gg.len - op.rong / 2 && ll < dd) { dd = ll; tot = w; } });
        if (tot) { op.w = tot.id; g3 = hinh(tot); nhan = true; }
      }
      var s2 = tron(chieu(p, g3)), lo = op.rong / 2 + 0.05, hi = g3.len - op.rong / 2 - 0.05;
      op.s = Math.min(Math.max(s2, lo), Math.max(lo, hi));
      phanTichCache = null; ve(); if (nhan) veBang(); return;
    }
    if (keo.loai === 'do') { var it = timTheo(plan.items, sel.id); it.cx = tron(keo.o0.x + dx); it.cy = tron(keo.o0.y + dy); phanTichCache = null; ve(); return; }
    if (keo.loai === 'nhan') { var r2 = timTheo(plan.phong, sel.id); r2.x = tron(keo.o0.x + dx); r2.y = tron(keo.o0.y + dy); phanTichCache = null; ve(); return; }
    if (keo.loai === 'ghim') { var gh = timTheo(plan.ghi, sel.id); gh.x = tron(keo.o0.x + dx); gh.y = tron(keo.o0.y + dy); ve(); return; }
  });
  function veBangChonNhe() { // cập nhật số trên bảng khi đang kéo, không vẽ lại cả bảng
    if (theDangMo !== 'chon' || !sel || sel.k !== 'w') return;
    var w = tuong(sel.id); if (!w) return;
    var ll = lotLongHaiBen(w), b = $('ndChon').querySelectorAll('.o-tong b');
    if (b.length >= 2) { b[0].textContent = ll.kq['1'] ? so(ll.kq['1'].ll) + ' m' : '—'; b[1].textContent = ll.kq['-1'] ? so(ll.kq['-1'].ll) + ' m' : '—'; }
  }
  function ketThucKeo(e) {
    conTro.delete(e.pointerId);
    if (!keo) return;
    var k = keo; keo = null; svg.classList.remove('dang-keo');
    if (k.loai === 'chum') { return; }
    var p = diemChuot(e);
    if (k.daDi) {
      if (k.loai === 'anh') { luuAnh(); return; }
      if (k.loai === 'do') { var it = timTheo(plan.items, sel.id); bamTuong(it, false); }
      if (k.daGhi && (k.loai === 'tuong' || k.loai === 'nut')) {
        var ho = donSauKeo(k.loai === 'tuong' ? k.tachMoi : [k.id], k.loai === 'tuong' ? k.ch : (sel && sel.k === 'w' ? [sel.id] : []));
        if (ho) baoDong('Đầu tường chưa chạm tường nào. Kéo nút tròn ở đầu tường tới tường gần nhất để khép phòng lại.');
      }
      if (k.daGhi) xong(true); else ve();
      return;
    }
    // bấm (không kéo)
    if (cong === 'anh_do') { xongDoAnh(p); return; }
    if (cong === 'anh_keo') return;
    if (cong === 'chon') {
      if (!k.mt) { sel = null; ve(); veBang(); if (laDienThoai()) moBangDienThoai(false); return; }
      veBang(); moTheBang('chon'); if (laDienThoai()) moBangDienThoai(true);
      if (k.loai === 'khoa') baoDong(k.mt.k === 'w' ? 'Tường ngoài đã khoá — chỉ KTS chỉnh được.' : 'Mục này đã khoá — chỉ KTS chỉnh được.');
      return;
    }
    if (cong === 'tuong') {
      var d = veTuong && veTuong.b ? veTuong.b : batDiem(p);
      if (!veTuong || !veTuong.a) { veTuong = { a: d }; goiYCongCu(); ve(); return; }
      if (kc(veTuong.a, d) < 0.15) { veTuong = null; goiYCongCu(); ve(); return; }
      ghiLai();
      var ia = nutTu(veTuong.a), ib = nutTu(d);
      if (ia === ib) { lichSu.pop(); return; }
      var w = { id: idMoi('w'), a: ia, b: ib, t: dayTuongMoi, khoa: dayTuongMoi >= 0.2 };
      plan.walls.push(w);
      veTuong = { a: { x: plan.nodes[ib].x, y: plan.nodes[ib].y, nut: ib } };
      ga('aln_dmb_them', { loai: 'tuong' });
      xong(true); goiYCongCu(); return;
    }
    if (cong === 'cua' || cong === 'so') {
      var mt = k.mt, w2 = null;
      if (mt && mt.k === 'w') w2 = tuong(mt.id);
      else { var d0 = 18 / view.s; plan.walls.forEach(function (o) { var g = hinh(o), t = chieu(p, g), l = Math.abs(lech(p, g)); if (t > 0 && t < g.len && l < d0) { d0 = l; w2 = o; } }); }
      if (!w2) { baoDong('Bấm đúng lên tường để đặt cửa.'); return; }
      ghiLai(); themCuaVaoTuong(w2, tron(chieu(p, hinh(w2))), cong === 'cua' ? maCua : maSo);
      datCong('chon'); moTheBang('chon'); if (laDienThoai()) moBangDienThoai(true);
      baoDong('Đã đặt cửa. Kéo dọc tường để dời, sửa bề rộng ở bảng bên.');
      return;
    }
    if (cong === 'dat' && datMa) {
      var s = LIB[datMa]; ghiLai();
      var it2 = { id: idMoi('i'), ma: datMa, cx: tron(p.x), cy: tron(p.y), w: s.w, h: s.h, rot: 0, lat: false, khoa: !!s.khoa };
      if (datMa === 'TH') { it2.n = 21; it2.kieu = 'I'; }
      bamTuong(it2, true);
      plan.items.push(it2); sel = { k: 'i', id: it2.id };
      ga('aln_dmb_them', { loai: datMa });
      datMa = null; datCong('chon'); xong(true); moTheBang('chon'); if (laDienThoai()) moBangDienThoai(true);
      return;
    }
    if (cong === 'phong') { taoTenPhong(tron(p.x), tron(p.y)); return; }
    if (cong === 'ghi_chu') { taoGhiChu(tron(p.x), tron(p.y)); return; }
  }
  svg.addEventListener('pointerup', ketThucKeo);
  svg.addEventListener('pointercancel', function (e) { conTro.delete(e.pointerId); keo = null; svg.classList.remove('dang-keo'); });
  svg.addEventListener('dblclick', function () { if (cong === 'tuong') { veTuong = null; goiYCongCu(); ve(); } });
  svg.addEventListener('contextmenu', function (e) { if (cong === 'tuong') { e.preventDefault(); veTuong = null; goiYCongCu(); ve(); } });
  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = svg.getBoundingClientRect(), wx = view.x + (e.clientX - r.left) / view.s, wy = view.y + (e.clientY - r.top) / view.s;
    var s = Math.min(400, Math.max(8, view.s * Math.pow(1.0015, -e.deltaY)));
    view.s = s; view.x = wx - (e.clientX - r.left) / s; view.y = wy - (e.clientY - r.top) / s; ve();
  }, { passive: false });

  function thuPhong(k) {
    var W = svg.clientWidth, H = svg.clientHeight, cx = view.x + W / view.s / 2, cy = view.y + H / view.s / 2;
    view.s = Math.min(400, Math.max(8, view.s * k)); view.x = cx - W / view.s / 2; view.y = cy - H / view.s / 2; ve();
  }
  function vuaKhung() {
    var xs = [], ys = [];
    Object.keys(plan.nodes).forEach(function (k) { xs.push(plan.nodes[k].x); ys.push(plan.nodes[k].y); });
    (plan.ranh || []).forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
    plan.items.forEach(function (it) { var b = hopDo(it); xs.push(b.x0, b.x1); ys.push(b.y0, b.y1); });
    if (!xs.length) { xs = [0, 10]; ys = [0, 10]; }
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var W = svg.clientWidth || 800, H = svg.clientHeight || 600, le = laDienThoai() ? 24 : 56;
    var botDuoi = laDienThoai() ? 64 : 0;
    view.s = Math.min((W - le * 2) / Math.max(1, x1 - x0), (H - le * 2 - botDuoi) / Math.max(1, y1 - y0));
    view.x = (x0 + x1) / 2 - W / view.s / 2; view.y = (y0 + y1) / 2 - (H - botDuoi) / view.s / 2; ve();
  }
  function keoToi(x, y) {
    var W = svg.clientWidth, H = svg.clientHeight;
    view.x = x - W / view.s / 2; view.y = y - H / view.s / 2 - (laDienThoai() ? H * 0.2 / view.s : 0); ve();
  }

  /* ================= phím tắt ================= */
  document.addEventListener('keydown', function (e) {
    var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) lamLai(); else hoanTac(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); lamLai(); return; }
    if (e.key === 'Escape') { if (!$('hopThoai').hidden) { dongHop(); return; } if (cong === 'tuong' && veTuong) { veTuong = null; goiYCongCu(); ve(); return; } if (/^anh_/.test(cong)) { datCong('chon'); sel = anh ? { k: 'anh' } : null; ve(); veBang(); return; } datCong('chon'); sel = null; ve(); veBang(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); xoaChon(); return; }
    var map = { v: 'chon', w: 'tuong', d: 'cua', s: 'so', t: 'thu_vien', p: 'phong', n: 'ghi_chu' };
    if (!e.ctrlKey && !e.metaKey && map[e.key.toLowerCase()]) { datCong(map[e.key.toLowerCase()]); return; }
    if (e.key.toLowerCase() === 'r' && sel && sel.k === 'i') { var it = timTheo(plan.items, sel.id); if (!khoa(it)) { ghiLai(); it.rot = (it.rot + 90) % 360; xong(true); } return; }
    var mui = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (mui && sel && sel.k === 'i') {
      var it2 = timTheo(plan.items, sel.id); if (khoa(it2)) return; e.preventDefault();
      ghiLai(); var b = e.shiftKey ? 0.5 : LUOI; it2.cx = tron(it2.cx + mui[0] * b); it2.cy = tron(it2.cy + mui[1] * b); xong(true);
    }
  });

  /* ================= hộp thoại ================= */
  var hopXong = null;
  function hopThoai(tieuDe, dung, nhanOk, nhanHuy) {
    $('htTieuDe').textContent = tieuDe;
    var nd = $('htNoiDung'), nut = $('htNut'); xoaCon(nd); xoaCon(nut);
    var ok = dung(nd);
    hopXong = ok;
    nut.append(h('button', { type: 'button', cls: 'nut', text: nhanHuy || 'Huỷ', onclick: dongHop }));
    if (ok) nut.append(h('button', { type: 'button', cls: 'nut chinh', text: nhanOk || 'Đồng ý', onclick: function () { if (ok() !== false) dongHop(); } }));
    $('hopThoai').hidden = false;
  }
  $('htNoiDung').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && hopXong) { e.preventDefault(); if (hopXong() !== false) dongHop(); }
  });
  function dongHop() { $('hopThoai').hidden = true; hopXong = null; }
  $('hopThoai').addEventListener('click', function (e) { if (e.target === $('hopThoai')) dongHop(); });

  function huongDan() {
    hopThoai('Cách dùng trong 1 phút', function (nd) {
      nd.append(h('div', { cls: 'buoc' }, [
        h('div', null, [h('b', { text: '1' }), h('span', { text: 'Kéo một bức tường trong nhà sang trái phải: phòng hai bên co giãn, diện tích tự tính lại. Số "lọt lòng" hiện ngay khi kéo.' })]),
        h('div', null, [h('b', { text: '2' }), h('span', { text: 'Bấm "Vẽ tường" để chia thêm phòng, "Cửa đi", "Cửa sổ" để mở thêm lối, "Thiết bị" để đặt bồn cầu, bếp, giường, tủ.' })]),
        h('div', null, [h('b', { text: '3' }), h('span', { text: 'Bấm vào cửa để đổi chiều mở, dời sát góc. Bấm vào đồ để xoay, lật, đổi kích thước.' })]),
        h('div', null, [h('b', { text: '4' }), h('span', { text: 'Xem thẻ "Kiểm tra": máy nhắc chỗ hẹp, phòng thiếu cửa, cánh cửa vướng đồ. Chỉ nhắc, không chặn.' })]),
        h('div', null, [h('b', { text: '5' }), h('span', { text: 'Sai thì bấm "Quay lại". Bản vẽ tự lưu trong máy này. "Lưu & xuất" để lưu phiên bản, xuất ảnh gửi KTS.' })])
      ]), h('p', { cls: 'chu-thich', text: 'Tường ngoài, cầu thang, thang máy và hộp gen đã khoá để giữ an toàn kết cấu. Mọi phương án cần KTS xem lại trước khi chốt.' }));
      return null;
    }, null, 'Bắt đầu');
  }

  /* ================= lưu, phiên bản, xuất ================= */
  function tenTep(duoi) {
    var t = (plan.ten || 'mat-bang').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'mat-bang';
    return t + '.' + duoi;
  }
  function taiFile(ten, noiDung, kieu) {
    var blob = noiDung instanceof Blob ? noiDung : new Blob([noiDung], { type: kieu });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = alnUrl(url); a.download = ten; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  function dsPhienBan() { try { return JSON.parse(localStorage.getItem(KHOA_PB) || '[]'); } catch (e) { return []; } }
  function luuPhienBan() {
    hopThoai('Lưu phiên bản', function (nd) {
      var ds = dsPhienBan(), inp = h('input', { type: 'text', maxlength: '40', value: 'Phương án ' + String.fromCharCode(65 + (ds.length % 26)), 'aria-label': 'Tên phiên bản' });
      nd.append(h('p', { cls: 'mo-ta', text: 'Phiên bản lưu trong máy này. Muốn gửi KTS hoặc mở trên máy khác thì dùng "Tải file mặt bằng".' }), h('div', { cls: 'truong' }, [h('label', { text: 'Tên phiên bản' }), inp]));
      setTimeout(function () { inp.select(); }, 30);
      return function () {
        var ten = inp.value.trim() || 'Phương án'; ds.unshift({ ten: ten.slice(0, 40), luc: Date.now(), plan: plan });
        try { localStorage.setItem(KHOA_PB, JSON.stringify(ds.slice(0, 20))); baoDong('Đã lưu "' + ten + '".'); ga('aln_dmb_luu_pb'); }
        catch (e) { baoDong('Máy không cho lưu thêm. Hãy dùng "Tải file mặt bằng".'); }
        return true;
      };
    }, 'Lưu');
  }
  function moDsPhienBan() {
    hopThoai('Các phiên bản đã lưu', function (nd) {
      var ds = dsPhienBan();
      if (!ds.length) { nd.append(h('p', { cls: 'mo-ta', text: 'Chưa có phiên bản nào. Bấm "Lưu phiên bản" để giữ lại phương án đang làm.' })); return null; }
      var khung = h('div', { cls: 'ds-pb' });
      ds.forEach(function (pb, i) {
        var mini = document.createElementNS(NS, 'svg'), gg = el('g', null, mini);
        try { veMatBang(gg, pb.plan, {}); var bb = khungBao(pb.plan); mini.setAttribute('viewBox', [bb.x0 - 0.5, bb.y0 - 0.5, bb.x1 - bb.x0 + 1, bb.y1 - bb.y0 + 1].join(' ')); } catch (e) { /* bản hỏng */ }
        var d = new Date(pb.luc);
        khung.append(h('div', { cls: 'pb' }, [mini, h('div', null, [h('b', { text: pb.ten }), h('span', { text: d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }),
          h('div', { cls: 'hanh-dong' }, [
            h('button', { type: 'button', text: 'Mở', onclick: function () { ghiLai(); plan = JSON.parse(JSON.stringify(pb.plan)); sel = null; dongHop(); xong(); vuaKhung(); $('tenBan').value = plan.ten || ''; baoDong('Đã mở "' + pb.ten + '". Bấm "Quay lại" nếu muốn về bản trước.'); } }),
            h('button', { type: 'button', text: 'Xoá', onclick: function () { var ds2 = dsPhienBan(); ds2.splice(i, 1); try { localStorage.setItem(KHOA_PB, JSON.stringify(ds2)); } catch (e) { /* bỏ qua */ } dongHop(); moDsPhienBan(); } })
          ])])]));
      });
      nd.append(khung);
      return null;
    }, null, 'Đóng');
  }
  function khungBao(p) {
    var cu = plan; plan = p;
    try {
      var xs = [], ys = [];
      Object.keys(p.nodes).forEach(function (k) { xs.push(p.nodes[k].x); ys.push(p.nodes[k].y); });
      (p.ranh || []).forEach(function (q) { xs.push(q[0]); ys.push(q[1]); });
      p.items.forEach(function (it) { var b = hopDo(it); xs.push(b.x0, b.x1); ys.push(b.y0, b.y1); });
      if (!xs.length) return { x0: 0, y0: 0, x1: 10, y1: 10 };
      return { x0: Math.min.apply(null, xs), y0: Math.min.apply(null, ys), x1: Math.max.apply(null, xs), y1: Math.max.apply(null, ys) };
    } finally { plan = cu; }
  }
  function svgXuat(rongPx) {
    var bb = khungBao(plan), le = 1.2, w = bb.x1 - bb.x0 + le * 2, hh = bb.y1 - bb.y0 + le * 2 + 0.8;
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('xmlns', NS); s.setAttribute('viewBox', [bb.x0 - le, bb.y0 - le, w, hh].join(' '));
    if (rongPx) { s.setAttribute('width', rongPx); s.setAttribute('height', Math.round(rongPx * hh / w)); }
    el('rect', { x: bb.x0 - le, y: bb.y0 - le, width: w, height: hh, fill: '#ffffff' }, s);
    var g = el('g', null, s); veMatBang(g, plan, {});
    var pt = phanTich();
    plan.phong.forEach(function (r) { var v = pt.theoMa[r._vung]; veChuNhan(s, r.x, r.y, r.ten, 0.22, r._ngoai ? '' : (v ? so(v.dt, 1) + ' m²' : '')); });
    // kích thước tổng theo tim tường ngoài (không tính mũi tên, hướng Bắc, bồn cây)
    var nx = [], ny = []; Object.keys(plan.nodes).forEach(function (k) { nx.push(plan.nodes[k].x); ny.push(plan.nodes[k].y); });
    if (nx.length) {
      var tx0 = Math.min.apply(null, nx), tx1 = Math.max.apply(null, nx), ty0 = Math.min.apply(null, ny), ty1 = Math.max.apply(null, ny);
      vachKichThuocTinh(s, { x: tx0, y: bb.y0 - 0.6 }, { x: tx1, y: bb.y0 - 0.6 }, so(tx1 - tx0) + ' m');
      vachKichThuocTinh(s, { x: bb.x0 - 0.6, y: ty0 }, { x: bb.x0 - 0.6, y: ty1 }, so(ty1 - ty0) + ' m');
    }
    var t = el('text', { x: bb.x0 - le + 0.2, y: bb.y1 + le + 0.5, 'font-family': FONT, 'font-size': 0.28, 'font-weight': 700 }, s); t.setAttribute('fill', MAU.muc);
    t.textContent = (plan.ten || 'Mặt bằng') + ' — ALN · applamnha.vn — bản dựng thử, KTS cần xem lại trước khi dùng';
    return s;
  }
  function vachKichThuocTinh(g, a, b, chu) {
    var l = el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }, g); l.setAttribute('stroke', MAU.muc); l.setAttribute('stroke-width', 0.02);
    [a, b].forEach(function (p) { var t = el('line', { x1: p.x - 0.1, y1: p.y + 0.1, x2: p.x + 0.1, y2: p.y - 0.1 }, g); t.setAttribute('stroke', MAU.muc); t.setAttribute('stroke-width', 0.03); });
    var dung = Math.abs(a.x - b.x) < 1e-6, tx = (a.x + b.x) / 2, ty = (a.y + b.y) / 2;
    var t2 = el('text', { x: tx, y: ty - 0.1, 'text-anchor': 'middle', 'font-family': "'IBM Plex Mono',monospace", 'font-size': 0.24, transform: dung ? 'rotate(-90 ' + tx + ' ' + ty + ')' : null }, g);
    t2.setAttribute('fill', MAU.muc); t2.textContent = chu;
  }
  function xuatAnh() {
    var s = svgXuat(2400), chuoi = new XMLSerializer().serializeToString(s);
    var url = URL.createObjectURL(new Blob([chuoi], { type: 'image/svg+xml;charset=utf-8' }));
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = +s.getAttribute('width'); c.height = +s.getAttribute('height');
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { if (b) taiFile(tenTep('png'), b); }, 'image/png');
    };
    img.onerror = function () { URL.revokeObjectURL(url); baoDong('Trình duyệt chưa xuất được ảnh. Hãy dùng "In hoặc lưu PDF".'); };
    img.src = alnUrl(url);
    ga('aln_dmb_xuat', { dang: 'png' });
  }
  function inBan() {
    var b = $('banIn'); xoaCon(b);
    b.append(svgXuat(0), h('div', { cls: 'khung-ten' }, [h('div', null, [h('b', { text: plan.ten || 'Mặt bằng' }), document.createElement('br'), h('span', { text: 'Bản dựng thử — KTS cần xem lại trước khi dùng' })]), h('div', { text: 'ALN · App Làm Nhà · applamnha.vn · ' + new Date().toLocaleDateString('vi-VN') })]));
    ga('aln_dmb_xuat', { dang: 'in' });
    window.print();
  }
  function xuatDxf() {
    var dong = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '0', 'ENDSEC', '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '6'];
    var LOP = { 'ALN-TUONG': 7, 'ALN-CUA': 30, 'ALN-CUASO': 5, 'ALN-NOITHAT': 6, 'ALN-THANG': 1, 'ALN-TEXT': 7 };
    Object.keys(LOP).forEach(function (l) { dong.push('0', 'LAYER', '2', l, '70', '0', '62', String(LOP[l]), '6', 'CONTINUOUS'); });
    dong.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
    var bb = khungBao(plan), X = function (x) { return ((x - bb.x0) * 1000).toFixed(1); }, Y = function (y) { return ((bb.y1 - y) * 1000).toFixed(1); };
    var line = function (a, b, lop) { dong.push('0', 'LINE', '8', lop, '10', X(a.x), '20', Y(a.y), '30', '0', '11', X(b.x), '21', Y(b.y), '31', '0'); };
    var maHoa = function (c) { return String(c).replace(/[^\x20-\x7e]/g, function (k) { return '\\U+' + ('0000' + k.charCodeAt(0).toString(16).toUpperCase()).slice(-4); }); }; // AutoCAD đọc \\U+XXXX cho chữ có dấu
    var text = function (x, y, cao, chu, lop) { dong.push('0', 'TEXT', '8', lop, '10', X(x), '20', Y(y), '30', '0', '40', (cao * 1000).toFixed(0), '1', maHoa(chu)); };
    // tường: viền trừ lỗ cửa
    plan.walls.forEach(function (w) {
      var g = hinh(w), ea = dauNoi(w, w.a), eb = dauNoi(w, w.b), t = w.t / 2, lo = plan.ops.filter(function (o) { return o.w === w.id; }).map(function (o) { return [o.s - o.rong / 2, o.s + o.rong / 2]; }).sort(function (a, b) { return a[0] - b[0]; });
      var doan = [], dau = -ea;
      lo.forEach(function (l) { if (l[0] > dau) doan.push([dau, l[0]]); dau = Math.max(dau, l[1]); });
      if (g.len + eb > dau) doan.push([dau, g.len + eb]);
      var P = function (s, k) { return { x: g.A.x + g.ux * s + g.nx * k, y: g.A.y + g.uy * s + g.ny * k }; };
      doan.forEach(function (d) { line(P(d[0], t), P(d[1], t), 'ALN-TUONG'); line(P(d[0], -t), P(d[1], -t), 'ALN-TUONG'); line(P(d[0], t), P(d[0], -t), 'ALN-TUONG'); line(P(d[1], t), P(d[1], -t), 'ALN-TUONG'); });
    });
    // cửa, đồ vật: dựng lại bằng chính hàm vẽ rồi đọc nét
    var tam = document.createElementNS(NS, 'g');
    plan.ops.forEach(function (op) { var g2 = document.createElementNS(NS, 'g'); g2.setAttribute('data-lop', (CUA[op.ma] || {}).loai === 'so' ? 'ALN-CUASO' : 'ALN-CUA'); veCua(g2, op); tam.appendChild(g2); });
    plan.items.forEach(function (it) { var g3 = document.createElementNS(NS, 'g'); g3.setAttribute('data-lop', it.ma === 'TH' || it.ma === 'TM' ? 'ALN-THANG' : 'ALN-NOITHAT'); veNet(g3, netDo(it), doiDiem(it)); tam.appendChild(g3); });
    Array.prototype.forEach.call(tam.childNodes, function (g4) {
      var lop = g4.getAttribute('data-lop');
      Array.prototype.forEach.call(g4.childNodes, function (e) {
        var tn = e.tagName;
        if (tn === 'line') line({ x: +e.getAttribute('x1'), y: +e.getAttribute('y1') }, { x: +e.getAttribute('x2'), y: +e.getAttribute('y2') }, lop);
        else if (tn === 'polygon' || tn === 'polyline') {
          if (tn === 'polygon' && e.getAttribute('fill') === '#ffffff') return; // nền lỗ cửa
          var pts = e.getAttribute('points').trim().split(/\s+/).map(function (q) { var a = q.split(','); return { x: +a[0], y: +a[1] }; });
          for (var i = 0; i < pts.length - 1; i++) line(pts[i], pts[i + 1], lop);
          if (tn === 'polygon') line(pts[pts.length - 1], pts[0], lop);
        } else if (tn === 'path') {
          var m = e.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number);
          for (var j = 0; j + 3 < m.length; j += 2) line({ x: m[j], y: m[j + 1] }, { x: m[j + 2], y: m[j + 3] }, lop);
        } else if (tn === 'circle') {
          dong.push('0', 'CIRCLE', '8', lop, '10', X(+e.getAttribute('cx')), '20', Y(+e.getAttribute('cy')), '30', '0', '40', (+e.getAttribute('r') * 1000).toFixed(1));
        } else if (tn === 'text') text(+e.getAttribute('x'), +e.getAttribute('y'), +e.getAttribute('font-size'), e.textContent, 'ALN-TEXT');
      });
    });
    var pt = phanTich();
    plan.phong.forEach(function (r) { var v = pt.theoMa[r._vung]; text(r.x - 0.4, r.y, 0.22, r.ten, 'ALN-TEXT'); if (v && !r._ngoai) text(r.x - 0.4, r.y + 0.3, 0.16, so(v.dt, 1) + ' m2', 'ALN-TEXT'); });
    dong.push('0', 'ENDSEC', '0', 'EOF');
    taiFile(tenTep('dxf'), dong.join('\r\n'), 'application/dxf');
    ga('aln_dmb_xuat', { dang: 'dxf' });
  }
  function hopLe(p) {
    return p && typeof p === 'object' && p.nodes && typeof p.nodes === 'object' && Array.isArray(p.walls) && Array.isArray(p.ops) && Array.isArray(p.items)
      && p.walls.every(function (w) { return w && p.nodes[w.a] && p.nodes[w.b] && typeof w.t === 'number'; });
  }
  function chuanHoa(p) {
    p.phong = Array.isArray(p.phong) ? p.phong : []; p.ghi = Array.isArray(p.ghi) ? p.ghi : [];
    p.items = p.items.filter(function (it) { return LIB[it.ma]; });
    p.ops = p.ops.filter(function (o) { return CUA[o.ma]; });
    p.phong.forEach(function (r) { r.ten = String(r.ten || '').slice(0, 30); });
    p.ghi.forEach(function (g) { g.nd = String(g.nd || '').slice(0, 400); });
    p.ten = String(p.ten || 'Bản vẽ').slice(0, 60);
    return p;
  }
  function moFile(f) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var p = JSON.parse(String(r.result));
        if (!hopLe(p)) throw new Error('sai');
        ghiLai(); plan = chuanHoa(p); sel = null; $('tenBan').value = plan.ten; xong(); vuaKhung(); baoDong('Đã mở file "' + f.name + '".');
      } catch (e) { baoDong('File này không phải mặt bằng tải từ trang này.'); }
    };
    r.readAsText(f);
  }

  /* ================= nối nút giao diện ================= */
  function capNhatDau() {
    $('nutHoanTac').disabled = !lichSu.length; $('nutLamLai').disabled = !tienLai.length;
  }
  $('nutHoanTac').addEventListener('click', hoanTac);
  $('nutLamLai').addEventListener('click', lamLai);
  $('nutHuongDan').addEventListener('click', huongDan);
  $('zoomCong').addEventListener('click', function () { thuPhong(1.25); });
  $('zoomTru').addEventListener('click', function () { thuPhong(0.8); });
  $('zoomVua').addEventListener('click', vuaKhung);
  $('tenBan').addEventListener('change', function () { ghiLai(); plan.ten = $('tenBan').value.trim().slice(0, 60) || 'Bản vẽ'; xong(true); });
  document.querySelectorAll('#congCu .cc').forEach(function (b) { b.addEventListener('click', function () { datCong(b.getAttribute('data-cc')); }); });
  document.querySelectorAll('.the-bang button').forEach(function (b) { b.addEventListener('click', function () { moTheBang(b.getAttribute('data-the')); if (laDienThoai()) moBangDienThoai(true); }); });
  $('keoBang').addEventListener('click', function () { moBangDienThoai(!$('bang').classList.contains('mo')); });
  $('nutCheDo').addEventListener('click', function () {
    if (cheDo === 'kts') { cheDo = 'chu'; capCheDo(); return; }
    hopThoai('Chuyển sang chế độ KTS?', function (nd) {
      nd.append(h('p', { cls: 'mo-ta', text: 'Chế độ KTS mở khoá tường ngoài, cầu thang, thang máy và hộp gen. Phần này liên quan kết cấu và trách nhiệm ký hồ sơ, chủ nhà nên giữ chế độ Chủ nhà.' }));
      return function () { cheDo = 'kts'; capCheDo(); return true; };
    }, 'Chuyển sang KTS');
  });
  function capCheDo() {
    $('nutCheDo').setAttribute('aria-pressed', String(cheDo === 'kts')); $('chuCheDo').textContent = cheDo === 'kts' ? 'KTS' : 'Chủ nhà';
    $('nutCheDo').setAttribute('aria-label', cheDo === 'kts' ? 'Đang ở chế độ KTS, bấm để về chế độ Chủ nhà' : 'Đang ở chế độ Chủ nhà, bấm để chuyển sang chế độ KTS');
    baoDong(cheDo === 'kts' ? 'Chế độ KTS: đã mở khoá tường ngoài, cầu thang, thang máy, hộp gen.' : 'Chế độ Chủ nhà: phần kết cấu đã khoá lại.');
    ve(); veBang();
  }
  var menu = $('menuTep'), nutTep = $('nutTep');
  nutTep.addEventListener('click', function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; nutTep.setAttribute('aria-expanded', String(!menu.hidden)); });
  document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target)) { menu.hidden = true; nutTep.setAttribute('aria-expanded', 'false'); } });
  menu.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    menu.hidden = true; nutTep.setAttribute('aria-expanded', 'false');
    var l = b.getAttribute('data-lenh');
    if (l === 'luu_pb') luuPhienBan();
    else if (l === 'ds_pb') moDsPhienBan();
    else if (l === 'tai_file') { taiFile(tenTep('aln.json'), JSON.stringify(plan, function (k, v) { return k.charAt(0) === '_' ? undefined : v; }, 1), 'application/json'); ga('aln_dmb_xuat', { dang: 'json' }); }
    else if (l === 'mo_file') $('oMoFile').click();
    else if (l === 'anh') { if (anh) chon({ k: 'anh' }); else chonAnh(); if (laDienThoai()) moBangDienThoai(true); }
    else if (l === 'xuat_anh') xuatAnh();
    else if (l === 'in') inBan();
    else if (l === 'xuat_dxf') xuatDxf();
    else if (l === 'mau') { ghiLai(); plan = matBangMau(); sel = null; $('tenBan').value = plan.ten; xong(); vuaKhung(); baoDong('Đã nạp mặt bằng mẫu. Bấm "Quay lại" nếu muốn về bản trước.'); }
    else if (l === 'moi') {
      hopThoai('Bắt đầu lô mới', function (nd) {
        var iw = h('input', { type: 'text', inputmode: 'decimal', value: '5', 'aria-label': 'Bề ngang lô (m)' }), id = h('input', { type: 'text', inputmode: 'decimal', value: '20', 'aria-label': 'Chiều sâu lô (m)' });
        nd.append(h('p', { cls: 'mo-ta', text: 'Trang dựng tường bao theo kích thước lô. Bản đang làm vẫn lấy lại được bằng "Quay lại".' }),
          h('div', { cls: 'nhom-nut' }, [h('div', { cls: 'truong' }, [h('label', { text: 'Bề ngang (m)' }), iw]), h('div', { cls: 'truong' }, [h('label', { text: 'Chiều sâu (m)' }), id])]));
        return function () {
          var W = docSo(iw.value), D = docSo(id.value);
          if (!W || !D || W < 2 || D < 2 || W > 60 || D > 80) { baoDong('Nhập bề ngang 2–60 m, chiều sâu 2–80 m.'); return false; }
          ghiLai(); plan = matBangTrong(tron(W), tron(D)); sel = null; $('tenBan').value = plan.ten; xong(); vuaKhung(); return true;
        };
      }, 'Tạo');
    }
  });
  $('oAnh').addEventListener('change', function () { var f = this.files && this.files[0]; if (f) napAnh(f); this.value = ''; });
  $('nutAnh').addEventListener('click', function () { chon({ k: 'anh' }); if (laDienThoai()) moBangDienThoai(true); });
  $('oMoFile').addEventListener('change', function () { var f = this.files && this.files[0]; if (f) moFile(f); this.value = ''; });
  window.addEventListener('resize', function () { ve(); });

  /* ================= khởi động ================= */
  (function batDau() {
    var cu = null;
    try { cu = JSON.parse(localStorage.getItem(KHOA_LUU) || 'null'); } catch (e) { cu = null; }
    plan = hopLe(cu) ? chuanHoa(cu) : matBangMau();
    try { var a = JSON.parse(localStorage.getItem(KHOA_ANH) || 'null'); if (a && typeof a.src === 'string' && alnUrl(a.src) !== '#' && isFinite(a.cx) && a.w > 0 && a.h > 0) anh = a; } catch (e) { anh = null; }
    $('tenBan').value = plan.ten || '';
    datCong('chon');
    requestAnimationFrame(function () { vuaKhung(); veBang(); });
    var daXem = false; try { daXem = !!localStorage.getItem(KHOA_HD); localStorage.setItem(KHOA_HD, '1'); } catch (e) { daXem = true; }
    if (!daXem) huongDan();
    window.ALNDungMB = { lay: function () { return plan; }, phanTich: function () { phanTichCache = null; return phanTich(); }, matBangMau: matBangMau };
  })();
})();
