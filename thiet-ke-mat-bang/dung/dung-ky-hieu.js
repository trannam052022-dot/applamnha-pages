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

  /* Cầu thang: n bậc (17–22, mặc định 21), kiểu I (một vế) hoặc U (hai vế).
     Nam 23/10/2026: đuôi mũi tên chạm mép bậc đầu, mũi chạm mép bậc cuối. */
  function cauThang(o) {
    var w = o.w, h = o.h, n = Math.max(2, o.n || 21), out = [R(0, 0, w, h, 'muc')], dao = !!o.dao;
    var Y = function (y) { return dao ? h - y : y; };
    var kieu = o.kieu === 'U' && w >= 1.5 ? 'U' : 'I';
    if (kieu === 'I') {
      var b = h / (n - 1);
      for (var i = 1; i <= n - 2; i++) out.push(L(0, i * b, w, i * b, 'muc'));
      out.push(P([[w / 2, Y(h)], [w / 2, Y(0)]], false, 'mui_ten'));
      out.push(C(w / 2, Y(h), 0.045, 'mui_ten', true));
      out.push(P([[w / 2 - 0.12, Y(0.2)], [w / 2, Y(0)], [w / 2 + 0.12, Y(0.2)]], false, 'mui_ten'));
      out.push(T(w / 2 + 0.05, Y(h / 2), 0.16, 'LÊN', 'mui_ten'));
      return out;
    }
    var gap = 0.1, ve = (w - gap) / 2, n1 = Math.ceil(n / 2), n2 = n - n1;
    var land = Math.min(Math.max(ve, 1.0), h * 0.5), b2 = (h - land) / Math.max(1, n1 - 1);
    out.push(L(0, Y(land), w, Y(land), 'muc'));
    out.push(L(ve, Y(land), ve, Y(h), 'muc'), L(ve + gap, Y(land), ve + gap, Y(h), 'muc'));
    for (var j = 1; j <= n1 - 1; j++) out.push(L(0, Y(land + j * b2), ve, Y(land + j * b2), 'muc'));
    for (var k = 1; k <= n2 - 1; k++) out.push(L(ve + gap, Y(land + k * b2), w, Y(land + k * b2), 'muc'));
    var ym = land / 2;
    out.push(P([[ve / 2, Y(h)], [ve / 2, Y(ym)], [w - ve / 2, Y(ym)], [w - ve / 2, Y(h)]], false, 'mui_ten'));
    out.push(C(ve / 2, Y(h), 0.045, 'mui_ten', true));
    out.push(P([[w - ve / 2 - 0.12, Y(h - 0.2)], [w - ve / 2, Y(h)], [w - ve / 2 + 0.12, Y(h - 0.2)]], false, 'mui_ten'));
    out.push(T(ve / 2 + 0.05, Y(h - (h - land) / 2), 0.16, 'LÊN', 'mui_ten'));
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

  var LIB = {
    /* ---- lên xuống, kết cấu, kỹ thuật (khoá với chủ nhà) ---- */
    TH: { ten: 'Cầu thang', nhom: 'Lên xuống & kỹ thuật', w: 1.0, h: 5.0, khoa: true, thang: true, ve: cauThang,
      mo: 'Mũi tên chạy suốt vế: đuôi chạm mép bậc đầu, mũi chạm mép bậc cuối. Bậc 17–22, mặc định 21.' },
    TM: { ten: 'Thang máy', nhom: 'Lên xuống & kỹ thuật', w: 1.6, h: 1.6, khoa: true, ve: thangMay,
      mo: 'Hố thang, cabin bên trong, cửa lùa hai cánh ở cạnh vào.' },
    G: { ten: 'Hộp gen kỹ thuật', nhom: 'Lên xuống & kỹ thuật', w: 0.4, h: 0.6, khoa: true, ve: hopGen,
      mo: 'Ô hẹp sát tường, gạch chéo, chữ G. Đi ống thoát và đường kỹ thuật.' },
    GT: { ten: 'Giếng trời', nhom: 'Lên xuống & kỹ thuật', w: 1.5, h: 1.5, khoa: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'muc', false, true), L(0, 0, o.w, o.h, 'muc', true), L(o.w, 0, 0, o.h, 'muc', true)];
    }, mo: 'Viền nét đứt, dấu X nét đứt.' },
    COT: { ten: 'Cột', nhom: 'Lên xuống & kỹ thuật', w: 0.22, h: 0.22, khoa: true, ve: function (o) { return [R(0, 0, o.w, o.h, 'muc', true)]; } },

    /* ---- vệ sinh ---- */
    BX: { ten: 'Bồn cầu', nhom: 'Vệ sinh', w: 0.45, h: 0.7, bam: true, ve: function (o) {
      return [R(0.02, 0, o.w - 0.04, 0.2, 'nuoc'), E(o.w / 2, 0.2 + (o.h - 0.2) / 2, o.w / 2 - 0.04, (o.h - 0.2) / 2, 'nuoc')];
    } },
    LV: { ten: 'Lavabo', nhom: 'Vệ sinh', w: 0.6, h: 0.45, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'nuoc'), E(o.w / 2, o.h * 0.55, o.w * 0.32, o.h * 0.28, 'nuoc'), C(o.w / 2, o.h * 0.25, 0.02, 'nuoc', true)];
    } },
    TD: { ten: 'Tắm đứng', nhom: 'Vệ sinh', w: 0.9, h: 0.9, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'nuoc'), L(0, 0, o.w, o.h, 'nuoc'), L(o.w, 0, 0, o.h, 'nuoc'), C(o.w / 2, o.h / 2, 0.04, 'nuoc', true)];
    } },
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
    TA: { ten: 'Tủ áo', nhom: 'Nội thất', w: 1.8, h: 0.6, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'go'), L(0, o.h, o.w, 0, 'go')];
    } },
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
    TV: { ten: 'Kệ tivi', nhom: 'Nội thất', w: 1.8, h: 0.4, bam: true, ve: function (o) {
      return [R(0, 0, o.w, o.h, 'go'), L(o.w * 0.15, o.h + 0.06, o.w * 0.85, o.h + 0.06, 'muc')];
    } },
    BC: { ten: 'Bồn cây', nhom: 'Nội thất', w: 1.2, h: 0.5, ve: function (o) {
      var out = [R(0, 0, o.w, o.h, 'cay')], r = Math.min(o.h, 0.6) * 0.32;
      for (var x = r + 0.08; x < o.w - r; x += r * 2.6) out.push(C(x, o.h / 2, r, 'cay'));
      return out;
    } },

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

  window.ALNKyHieu = { LIB: LIB, CUA: CUA, NHOM: NHOM, ve: function (ma, o) { var s = LIB[ma]; return s ? s.ve(o) : []; } };
})();
