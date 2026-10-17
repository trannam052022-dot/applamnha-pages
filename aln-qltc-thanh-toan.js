/**
 * aln-qltc-thanh-toan.js — khối "Chuyển khoản để bật gói" của Gói Quản lý Thi công (PR-10).
 * Dùng ở quan-ly-thi-cong.html (màn đã tạo hồ sơ) và khong-gian-nha.html (thẻ việc của hồ sơ gói).
 *
 *   window.alnQltcThanhToan.gan(el, { goi: (data) => httpsCallable('qltcThanhToan')(data), houseId, boCauChung?, luaChon? })
 *     → { lamMoi(), chon(luaChon) }   // lamMoi: gọi lại sau khi khách sửa danh sách sàn (đơn cũ huỷ, đơn mới theo phí mới)
 *
 * Trả theo sàn (17/10/2026): "Đã mở {k}/{n} sàn" + hai lựa chọn — trả 1 sàn (sàn kế tiếp) hoặc trả hết
 * phần còn lại; chọn lựa chọn khác → máy chủ tạo đơn mới. Mã QR (VietQR) do máy chủ dựng khi nhận ra ngân hàng.
 *
 * "Chưa trả" (18/10/2026): hồ sơ chưa trả lần nào nhưng đã đồng ý dữ liệu — Móng đã mở, khối ghi "Đã mở 0/{n} sàn".
 * Nút "Tôi đã chuyển khoản" (qltcThanhToan 'bao_ck') báo Founder đối chiếu; sau đó khối ghi "ALN đang đối chiếu…".
 *
 * Máy chủ (functions/qltcThanhToan.js) quyết định số tiền, STK (chỉ tài khoản CÔNG TY TNHH ALN) và
 * nội dung chuyển khoản; trang chỉ hiển thị. Chữ lấy từ qltc-chu.vi.js (window.ALN_CHU_QLTC),
 * thuế suất lấy từ đơn (cấu hình quốc gia) — không viết cứng. Chỉ textContent, không innerHTML.
 */
(function () {
  "use strict";
  var C = function () { return window.ALN_CHU_QLTC; };
  var T = function (k, b) { return C() ? C().chu(k, b) : k; };
  var tien = function (n, tt) { return C() ? C().tien(n, tt) : String(n); };
  var so = function (n) { return C() ? C().so(n) : String(n); };

  /** aln-esc.js nếu trang có nạp; không thì chỉ nhận https:// (link QR đã kiểm tiền tố img.vietqr.io). */
  function alnUrl(u) { return window.alnUrl ? window.alnUrl(u) : (/^https:\/\//.test(String(u)) ? String(u) : "#"); }
  function the(tag, cls, chu) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (chu != null) e.textContent = chu;
    return e;
  }
  function dong(nhan, giaTri, cls) {
    var r = the("div", "qtt-dong" + (cls ? " " + cls : ""));
    r.appendChild(the("span", "qtt-nhan", nhan));
    r.appendChild(the("span", "qtt-so", giaTri));
    return r;
  }
  function nutChep(giaTri) {
    var b = the("button", "qtt-chep", T("tt.sao_chep"));
    b.type = "button";
    b.addEventListener("click", function () {
      var xong = function () { b.textContent = T("tt.da_chep"); setTimeout(function () { b.textContent = T("tt.sao_chep"); }, 1800); };
      try { navigator.clipboard.writeText(giaTri).then(xong, function () {}); } catch (e) { /* trình duyệt cũ: khách tự chép */ }
    });
    return b;
  }
  function dongChep(nhan, giaTri) {
    var r = the("div", "qtt-dong");
    r.appendChild(the("span", "qtt-nhan", nhan));
    var p = the("span", "qtt-so");
    p.appendChild(the("b", null, giaTri));
    p.appendChild(nutChep(giaTri));
    r.appendChild(p);
    return r;
  }

  /** Nút lựa chọn trả: "Trả 1 sàn (Trệt) — 432.000 đ" / "Trả hết 3 sàn còn lại — …". */
  function nutLuaChon(lc, x, dangChon, onChon) {
    var b = the("button", "qtt-lc" + (dangChon ? " qtt-lc-chon" : ""));
    b.type = "button";
    b.setAttribute("aria-pressed", String(!!dangChon));
    var nbsp = function (n) { return tien(n, x.tien_te).replace(/ đ$/, "\u00a0đ"); };
    var gia = nbsp(x.tong);
    var giam = lc === "het" && x.giam && x.tong_goc > x.tong;
    var chu = lc === "mot_san"
      ? T("tt.lc_mot_san", { ten: (x.ten || []).join(", "), tien: gia })
      : giam ? T("tt.lc_het_giam", { n: x.so_san, goc: nbsp(x.tong_goc), tien: gia }) : T("tt.lc_het", { n: x.so_san, tien: gia });
    // Số trên nút = số chuyển khoản (đã gồm thuế) — ghi rõ thuế suất (Nam chốt 17/10/2026);
    // trả hết có giảm (18/10/2026): "{gốc} → {giảm} (đã giảm 10%, đã gồm GTGT 8%)".
    var t = x.thue;
    if (t && isFinite(Number(t.ty_le_phan_tram))) {
      chu += " " + (giam ? T("tt.giam_gom_thue", { giam: so(x.giam.pct), thue: t.ten || "GTGT", pct: so(t.ty_le_phan_tram) })
        : T("tt.gom_thue", { thue: t.ten || "GTGT", pct: so(t.ty_le_phan_tram) })).replace(/ /g, "\u00a0");
    }
    b.textContent = chu;
    if (!dangChon) b.addEventListener("click", function () { onChon(lc); });
    return b;
  }

  /** Nút "Tôi đã chuyển khoản" — hoặc dòng "ALN đang đối chiếu" khi đã báo. */
  function khoiBao(kq, opts, veLai) {
    var d = kq.don;
    if (d.khach_bao) return the("p", "qtt-doi-chieu", T("tt.dang_doi_chieu"));
    if (kq.xem_founder || !d.id) return null;
    var hop = the("div", "qtt-bao");
    var b = the("button", "qtt-bao-nut", T("tt.da_chuyen"));
    b.type = "button";
    var msg = the("p", "qtt-ghi");
    b.addEventListener("click", function () {
      b.disabled = true; msg.textContent = T("tt.dang_bao"); msg.className = "qtt-ghi";
      Promise.resolve(opts.goi({ hanh_dong: "bao_ck", houseId: opts.houseId, don_id: d.id })).then(function () {
        d.khach_bao = true;
        veLai();
        if (opts.daBao) opts.daBao();
      }, function (e) {
        b.disabled = false;
        msg.className = "qtt-ghi qtt-loi";
        msg.textContent = (e && e.message) || T("tt.loi_bao");
      });
    });
    hop.appendChild(b);
    hop.appendChild(the("p", "qtt-ghi", T("tt.da_chuyen_ghi_chu")));
    hop.appendChild(msg);
    return hop;
  }

  function ve(el, kq, opts, onChon) {
    el.textContent = "";
    var tienDo = kq.tien_do;
    if (kq.du) {
      el.appendChild(the("p", "qtt-ghi", tienDo && tienDo.n ? T("tt.da_du", { n: tienDo.n }) : T("tt.da_bat")));
      el.appendChild(the("p", "qtt-ghi", T("tt.hoa_don")));
      return;
    }
    if (kq.can_dong_y || !kq.don) { el.appendChild(the("p", "qtt-ghi", T("tt.can_dong_y"))); return; }
    var d = kq.don;
    var them = !!kq.da_bat;
    // "Chưa trả": máy chủ trả tien_do {k:0, n} khi đã đồng ý dữ liệu và có danh sách sàn — Móng đã mở.
    var chuaTra = !them && !!(tienDo && tienDo.n);
    var hop = the("div", "qtt");
    hop.appendChild(the("p", "qtt-tieu-de", T(them ? "tt.tieu_de_them" : chuaTra ? "tt.tieu_de_mo_san" : "tt.tieu_de")));
    // Trang đã ghi "Đã mở k/n sàn" ngay trên khối (Không gian Nhà, hồ sơ đã trả) → boTienDo.
    if ((them || chuaTra) && tienDo && tienDo.n && !(opts && opts.boTienDo && them)) {
      hop.appendChild(the("p", "qtt-tien-do", T("tt.da_mo", { k: tienDo.k, n: tienDo.n })));
      if (chuaTra) hop.appendChild(the("p", "qtt-ghi", T("tt.mong_da_mo")));
      // Ưu đãi tặng sàn đầu (17/10/2026): sàn được tặng đã mở cùng móng.
      var km = kq.khuyen_mai;
      if (km && km.san_tang > 0 && km.ten_san && km.ten_san.length) hop.appendChild(the("p", "qtt-ghi", T("km.tt_da_mo", { ten: km.ten_san.join(", ") })));
    }
    if (kq.lua_chon_co && kq.lua_chon_co.length) {
      var lcBox = the("div", "qtt-lc-box");
      kq.lua_chon_co.forEach(function (lc) {
        var x = kq[lc];
        if (x) lcBox.appendChild(nutLuaChon(lc, x, kq.lua_chon === lc, onChon));
        // Dưới "Trả 1 sàn": trả hết một lần tiết kiệm bao nhiêu (đã gồm thuế).
        if (lc === "mot_san" && kq.het && kq.het.tiet_kiem > 0 && kq.lua_chon_co.indexOf("het") >= 0) {
          lcBox.appendChild(the("p", "qtt-tk", T("tt.tiet_kiem", { tien: tien(kq.het.tiet_kiem, kq.het.tien_te) })));
        }
      });
      hop.appendChild(lcBox);
      if (kq.lua_chon_co.length > 1) hop.appendChild(the("p", "qtt-ghi", T("tt.cach_tra")));
    }
    if (d.giam && d.chua_thue_goc > d.chua_thue) {
      hop.appendChild(dong(T("tt.chua_thue"), tien(d.chua_thue_goc, d.tien_te)));
      hop.appendChild(dong(T("tt.giam", { pct: so(d.giam.pct) }), "−" + tien(d.giam.tien, d.tien_te), "qtt-giam"));
    } else hop.appendChild(dong(T("tt.chua_thue"), tien(d.chua_thue, d.tien_te)));
    hop.appendChild(dong(T("tt.thue", { thue: so(d.thue.ty_le_phan_tram) + "%" }), tien(d.thue.tien, d.tien_te)));
    hop.appendChild(dong(T("tt.tong"), tien(d.tong, d.tien_te), "qtt-tong"));
    if (kq.ck) {
      hop.appendChild(the("p", "qtt-muc", T("tt.tk")));
      // QR: chỉ nhận link img.vietqr.io do máy chủ dựng.
      if (typeof kq.qr === "string" && kq.qr.indexOf("https://img.vietqr.io/image/") === 0) {
        var qr = the("img", "qtt-qr");
        qr.alt = T("tt.qr");
        qr.width = 220; qr.height = 220; qr.loading = "lazy";
        qr.src = alnUrl(kq.qr);
        hop.appendChild(qr);
        hop.appendChild(the("p", "qtt-ghi", T("tt.qr")));
      }
      hop.appendChild(dong(T("tt.ngan_hang"), kq.ck.ngan_hang));
      hop.appendChild(dongChep(T("tt.so_tk"), kq.ck.so_tk));
      hop.appendChild(dong(T("tt.chu_tk"), kq.ck.chu_tk));
      hop.appendChild(dongChep(T("tt.noi_dung"), d.noi_dung_ck));
      hop.appendChild(the("p", "qtt-ghi", T("tt.noi_dung_ghi_chu")));
    } else {
      hop.appendChild(dongChep(T("tt.noi_dung"), d.noi_dung_ck));
      hop.appendChild(the("p", "qtt-ghi qtt-zalo", T("tt.chua_co_tk")));
    }
    var bao = khoiBao(kq, opts, function () { ve(el, kq, opts, onChon); });
    if (bao) hop.appendChild(bao);
    // boCauChung: trang đã có câu "Sau khi nhận chuyển khoản…" riêng (quan-ly-thi-cong.html, câu PR-9b).
    if (them || chuaTra) hop.appendChild(the("p", "qtt-ghi", T("tt.sau_khi_them")));
    else if (!(opts && opts.boCauChung)) hop.appendChild(the("p", "qtt-ghi", T("tt.sau_khi")));
    hop.appendChild(the("p", "qtt-ghi", T("tt.hoa_don")));
    if (!them && !(opts && opts.boCauChung)) hop.appendChild(the("p", "qtt-ghi", T("tt.sua_truoc")));
    el.appendChild(hop);
  }

  function gan(el, opts) {
    var luot = 0;
    var luaChon = opts.luaChon || null;
    function lamMoi() {
      var my = ++luot;
      el.textContent = "";
      el.appendChild(the("p", "qtt-ghi", T("tt.dang_tai")));
      var data = { hanh_dong: "mo", houseId: opts.houseId };
      if (luaChon) data.lua_chon = luaChon;
      return Promise.resolve(opts.goi(data)).then(function (r) {
        if (my !== luot) return;
        var kq = (r && r.data) || {};
        if (kq.lua_chon) luaChon = kq.lua_chon;
        ve(el, kq, opts, chon);
      }, function () {
        if (my !== luot) return;
        el.textContent = "";
        el.appendChild(the("p", "qtt-ghi qtt-loi", T("tt.loi")));
        var b = the("button", "qtt-chep", T("tt.thu_lai"));
        b.type = "button";
        b.addEventListener("click", lamMoi);
        el.appendChild(b);
      });
    }
    function chon(lc) { luaChon = lc; return lamMoi(); }
    lamMoi();
    return { lamMoi: lamMoi, chon: chon };
  }

  /* CSS tối thiểu, dùng biến màu của trang nếu có. */
  var css = ".qtt{border:1px solid var(--border-soft,#d9dee5);border-radius:10px;padding:.8rem .9rem;margin:.6rem 0;background:var(--surface,#fff)}"
    + ".qtt-tieu-de{font-weight:600;margin:0 0 .5rem}"
    + ".qtt-dong{display:flex;justify-content:space-between;align-items:center;gap:.6rem;padding:.3rem 0;border-bottom:1px dashed var(--border-soft,#e3e7ec);flex-wrap:wrap}"
    + ".qtt-nhan{color:var(--text-2,#475569)}.qtt-so{text-align:right;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;justify-content:flex-end;overflow-wrap:anywhere}"
    + ".qtt-tong .qtt-nhan,.qtt-tong .qtt-so{font-weight:700;color:var(--text-1,#0f172a)}"
    + ".qtt-muc{font-weight:600;margin:.8rem 0 .2rem}"
    + ".qtt-ghi{font-size:.92em;color:var(--text-2,#475569);margin:.45rem 0 0}.qtt-loi{color:#b91c1c}.qtt-zalo{font-weight:600;color:var(--text-1,#0f172a)}"
    + ".qtt-tien-do{font-weight:600;margin:0 0 .5rem;color:var(--text-1,#0f172a)}"
    + ".qtt-lc-box{display:grid;gap:.45rem;margin:.2rem 0 .3rem}"
    + ".qtt-lc{font:inherit;text-align:left;padding:.6rem .75rem;border-radius:8px;border:1px solid var(--border-soft,#cbd5e1);background:transparent;cursor:pointer;min-height:44px;color:inherit}"
    + ".qtt-lc-chon{border:2px solid var(--gold,#b8892b);font-weight:600;cursor:default}"
    + ".qtt-tk{font-size:.9em;margin:-.15rem 0 .15rem .2rem;color:var(--text-2,#475569)}"
    + ".qtt-giam .qtt-so{color:var(--green,#15803d);font-weight:600}"
    + ".qtt-qr{display:block;width:220px;max-width:100%;height:auto;margin:.4rem auto .1rem;border-radius:8px;background:#fff}"
    + ".qtt-bao{margin:.8rem 0 .2rem}.qtt-bao-nut{font:inherit;font-weight:700;width:100%;min-height:48px;border-radius:10px;border:0;background:#8a5f07;color:#fff;cursor:pointer}"
    + ".qtt-bao-nut:disabled{background:#e5e7eb;color:#374151;cursor:default}"
    + ".qtt-doi-chieu{font-weight:600;margin:.8rem 0 .2rem;padding:.6rem .75rem;border-radius:8px;background:var(--gold-bg,rgba(152,105,10,.09));color:var(--text-1,#0f172a)}"
    + ".qtt-chep{font:inherit;font-size:.85em;padding:.2rem .6rem;border-radius:6px;border:1px solid var(--border-soft,#cbd5e1);background:transparent;cursor:pointer;min-height:32px}";
  try {
    var st = document.createElement("style");
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  } catch (e) { /* bỏ qua */ }

  window.alnQltcThanhToan = { gan: gan };
})();
