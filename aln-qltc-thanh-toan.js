/**
 * aln-qltc-thanh-toan.js — khối "Chuyển khoản để bật gói" của Gói Quản lý Thi công (PR-10).
 * Dùng ở quan-ly-thi-cong.html (màn đã tạo hồ sơ) và khong-gian-nha.html (thẻ việc của hồ sơ gói).
 *
 *   window.alnQltcThanhToan.gan(el, { goi: (data) => httpsCallable('qltcThanhToan')(data), houseId, boCauChung? })
 *     → { lamMoi() }   // gọi lại sau khi khách sửa danh sách sàn (đơn cũ huỷ, đơn mới theo phí mới)
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

  function ve(el, kq, opts) {
    el.textContent = "";
    if (kq.da_bat) { el.appendChild(the("p", "qtt-ghi", T("tt.da_bat"))); el.appendChild(the("p", "qtt-ghi", T("tt.hoa_don"))); return; }
    if (kq.can_dong_y || !kq.don) { el.appendChild(the("p", "qtt-ghi", T("tt.can_dong_y"))); return; }
    var d = kq.don;
    var hop = the("div", "qtt");
    hop.appendChild(the("p", "qtt-tieu-de", T("tt.tieu_de")));
    hop.appendChild(dong(T("tt.chua_thue"), tien(d.chua_thue, d.tien_te)));
    hop.appendChild(dong(T("tt.thue", { thue: so(d.thue.ty_le_phan_tram) + "%" }), tien(d.thue.tien, d.tien_te)));
    hop.appendChild(dong(T("tt.tong"), tien(d.tong, d.tien_te), "qtt-tong"));
    if (kq.ck) {
      hop.appendChild(the("p", "qtt-muc", T("tt.tk")));
      hop.appendChild(dong(T("tt.ngan_hang"), kq.ck.ngan_hang));
      hop.appendChild(dongChep(T("tt.so_tk"), kq.ck.so_tk));
      hop.appendChild(dong(T("tt.chu_tk"), kq.ck.chu_tk));
      hop.appendChild(dongChep(T("tt.noi_dung"), d.noi_dung_ck));
      hop.appendChild(the("p", "qtt-ghi", T("tt.noi_dung_ghi_chu")));
    } else {
      hop.appendChild(dongChep(T("tt.noi_dung"), d.noi_dung_ck));
      hop.appendChild(the("p", "qtt-ghi qtt-zalo", T("tt.chua_co_tk")));
    }
    // boCauChung: trang đã có câu "Sau khi nhận chuyển khoản…" riêng (quan-ly-thi-cong.html, câu PR-9b).
    if (!(opts && opts.boCauChung)) hop.appendChild(the("p", "qtt-ghi", T("tt.sau_khi")));
    hop.appendChild(the("p", "qtt-ghi", T("tt.hoa_don")));
    if (!(opts && opts.boCauChung)) hop.appendChild(the("p", "qtt-ghi", T("tt.sua_truoc")));
    el.appendChild(hop);
  }

  function gan(el, opts) {
    var luot = 0;
    function lamMoi() {
      var my = ++luot;
      el.textContent = "";
      el.appendChild(the("p", "qtt-ghi", T("tt.dang_tai")));
      return Promise.resolve(opts.goi({ hanh_dong: "mo", houseId: opts.houseId })).then(function (r) {
        if (my !== luot) return;
        ve(el, (r && r.data) || {}, opts);
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
    lamMoi();
    return { lamMoi: lamMoi };
  }

  /* CSS tối thiểu, dùng biến màu của trang nếu có. */
  var css = ".qtt{border:1px solid var(--border-soft,#d9dee5);border-radius:10px;padding:.8rem .9rem;margin:.6rem 0;background:var(--surface,#fff)}"
    + ".qtt-tieu-de{font-weight:600;margin:0 0 .5rem}"
    + ".qtt-dong{display:flex;justify-content:space-between;align-items:center;gap:.6rem;padding:.3rem 0;border-bottom:1px dashed var(--border-soft,#e3e7ec);flex-wrap:wrap}"
    + ".qtt-nhan{color:var(--text-2,#475569)}.qtt-so{text-align:right;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;justify-content:flex-end;word-break:break-all}"
    + ".qtt-tong .qtt-nhan,.qtt-tong .qtt-so{font-weight:700;color:var(--text-1,#0f172a)}"
    + ".qtt-muc{font-weight:600;margin:.8rem 0 .2rem}"
    + ".qtt-ghi{font-size:.92em;color:var(--text-2,#475569);margin:.45rem 0 0}.qtt-loi{color:#b91c1c}.qtt-zalo{font-weight:600;color:var(--text-1,#0f172a)}"
    + ".qtt-chep{font:inherit;font-size:.85em;padding:.2rem .6rem;border-radius:6px;border:1px solid var(--border-soft,#cbd5e1);background:transparent;cursor:pointer;min-height:32px}";
  try {
    var st = document.createElement("style");
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  } catch (e) { /* bỏ qua */ }

  window.alnQltcThanhToan = { gan: gan };
})();
