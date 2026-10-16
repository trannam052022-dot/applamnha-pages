/**
 * aln-qltc-bang-chung.js — bằng chứng theo mốc của Gói Quản lý Thi công (PR-7), dùng ở khong-gian-nha.html.
 *
 *   window.alnQltcBangChung.khoiMoc(moc, ctx, mucIds) → phần tử: "Ảnh khác của mốc", "Bản vẽ tầng này",
 *                                                 "Tải biên bản PDF" (gắn cuối chi tiết mốc)
 *   window.alnQltcBangChung.khoiAnhViec(moc, muc, ctx) → ảnh của MỘT việc trong checklist + nút
 *                                                 "Chụp ảnh" (mở camera sau) / "Chọn ảnh" (16/10/2026)
 *   window.alnQltcBangChung.khoiTaiAnh(ctx)    → phần tử: chọn mốc + chụp/chọn ảnh (đầu khối Nhật ký)
 *
 *   ctx = { goi: (data) => httpsCallable('qltcBangChung')(data), houseId, xemFounder, laChuNha,
 *           goiDaBat, dsMoc: () => [{id, ten, trang_thai}], mocMacDinh: () => id }
 *
 * Máy chủ (functions/qltcBangChung.js) quyết định quyền: ai tải ảnh, ai xem bản vẽ, ai lập biên bản.
 * Ảnh thu về 1600 px trên trình duyệt trước khi gửi; máy chủ thu lại + bỏ metadata (GPS).
 * Chữ lấy từ qltc-chu.vi.js (khoá bc.*). Chỉ textContent, không innerHTML.
 */
(function () {
  "use strict";
  var C = function () { return window.ALN_CHU_QLTC; };
  var T = function (k, b) { return C() ? C().chu(k, b) : k; };

  function the(tag, cls, chu) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (chu != null) e.textContent = chu;
    return e;
  }
  function nut(chu, cls) { var b = the("button", cls || "btn btn-ghost", chu); b.type = "button"; return b; }
  function gioVN(ms) {
    if (!ms) return "";
    return new Date(ms).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
  }
  /** base64 (máy chủ trả) → blob: URL — chỉ nhận ký tự base64, không ghép chuỗi vào URL. */
  function blobUrl(b64, kieu) {
    var bytes = atob(String(b64 || "").replace(/[^A-Za-z0-9+/=]/g, ""));
    var a = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) a[i] = bytes.charCodeAt(i);
    return URL.createObjectURL(new Blob([a], { type: kieu || "image/jpeg" }));
  }
  function loiCua(e) { return (e && e.message) || T("bc.loi"); }

  /* ── Bộ nhớ theo hồ sơ + mốc; khối vẽ lại khi có dữ liệu (chi tiết mốc bị dựng lại mỗi lần renderMocTc) ── */
  var cache = {};   // khoá → { anh, duoc_tai, loi, dang } | bản vẽ: { trang, loi, khong_quyen }
  var cho = {};     // khoá → [phần tử đang chờ vẽ lại] (khối ảnh mốc + khối ảnh từng việc)
  function khoa(ctx, ma, loai) { return ctx.houseId + "|" + ma + "|" + loai; }
  function napAnh(ctx, ma, ep) {
    var k = khoa(ctx, ma, "anh");
    if (cache[k] && !ep && !cache[k].loi) return;
    cache[k] = Object.assign({}, cache[k] || {}, { dang: true, loi: null });
    ctx.goi({ hanh_dong: "ds_anh", houseId: ctx.houseId, ma_moc: ma }).then(function (r) {
      cache[k] = { anh: (r.data && r.data.anh) || [], duoc_tai: !!(r.data && r.data.duoc_tai) };
    }, function (e) { cache[k] = { anh: [], loi: loiCua(e) }; }).then(function () { veLai(k); });
  }
  function napBanVe(ctx, ma) {
    var k = khoa(ctx, ma, "bv");
    if (cache[k] && !cache[k].loi) return;
    cache[k] = { dang: true };
    ctx.goi({ hanh_dong: "ban_ve", houseId: ctx.houseId, ma_moc: ma }).then(function (r) {
      cache[k] = { trang: (r.data && r.data.trang) || [] };
    }, function (e) {
      cache[k] = e && /permission-denied/.test(String(e.code)) ? { khong_quyen: true } : { trang: [], loi: loiCua(e) };
    }).then(function () { veLai(k); });
  }
  // Phần tử mới dựng chưa gắn vào trang (chi tiết mốc dựng xong mới gắn) → chỉ dọn phần tử rời trang đã > 5 giây.
  function ganCho(k, el) {
    var bay = Date.now();
    el.__luc = bay;
    cho[k] = (cho[k] || []).filter(function (x) { return x.isConnected || bay - x.__luc < 5000; });
    cho[k].push(el);
  }
  function veLai(k) {
    (cho[k] || []).forEach(function (el) { if (el.isConnected && el.__ve) el.__ve(); });
    cho[k] = (cho[k] || []).filter(function (x) { return x.isConnected; });
  }

  /* ── Xem ảnh lớn (lớp phủ) ── */
  function xemLon(tieuDe, layAnh) {
    var phu = the("div", "bc-phu");
    phu.setAttribute("role", "dialog");
    phu.setAttribute("aria-modal", "true");
    var dau = the("div", "bc-phu-dau");
    dau.appendChild(the("span", "bc-phu-ten", tieuDe));
    var dong = nut(T("bc.dong"), "bc-phu-dong");
    dau.appendChild(dong);
    var than = the("div", "bc-phu-than");
    var tt = the("p", "bc-phu-tt", T("bc.dang_tai"));
    than.appendChild(tt);
    phu.appendChild(dau); phu.appendChild(than);
    var url = null;
    function tat() { if (url) URL.revokeObjectURL(url); phu.remove(); document.removeEventListener("keydown", phim); }
    function phim(ev) { if (ev.key === "Escape") tat(); }
    dong.addEventListener("click", tat);
    document.addEventListener("keydown", phim);
    document.body.appendChild(phu);
    dong.focus();
    layAnh().then(function (b64) {
      url = blobUrl(b64);
      than.textContent = "";
      var img = the("img", "bc-phu-anh"); img.alt = tieuDe; img.src = url;
      than.appendChild(img);
      var mo = the("a", "bc-phu-mo", T("bc.mo_co_lon")); mo.href = url; mo.target = "_blank"; mo.rel = "noopener";
      dau.insertBefore(mo, dong);
    }, function (e) { tt.textContent = loiCua(e); tt.className = "bc-phu-tt loi"; });
  }

  /* ── Khối trong chi tiết mốc ── */
  /** mucIds: id các việc trong checklist của mốc — ảnh gắn các việc này hiện ở từng việc, không ở đây. */
  function khoiMoc(m, ctx, mucIds) {
    var box = the("div", "bc-khoi");
    var kA = khoa(ctx, m.id, "anh"), kB = khoa(ctx, m.id, "bv");
    var phanAnh = the("div", "bc-phan"); var phanBv = the("div", "bc-phan"); var phanBb = the("div", "bc-phan");
    box.appendChild(phanAnh); box.appendChild(phanBv);
    phanAnh.__ve = function () { veAnh(phanAnh, m, ctx, mucIds || []); };
    phanBv.__ve = function () { veBanVe(phanBv, m, ctx); };
    ganCho(kA, phanAnh); ganCho(kB, phanBv);
    phanAnh.__ve(); phanBv.__ve();
    // Biên bản: chỉ chủ nhà (Founder xem thử), mốc đã xong.
    if ((ctx.laChuNha || ctx.xemFounder) && ctx.goiDaBat && m.trang_thai === "xong") {
      veBienBan(phanBb, m, ctx);
      box.appendChild(phanBb);
    }
    napAnh(ctx, m.id); napBanVe(ctx, m.id);
    return box;
  }

  function luoiAnh(ds, m, ctx) {
    var luoi = the("div", "bc-luoi");
    ds.forEach(function (a) {
      var o = the("button", "bc-o"); o.type = "button";
      var ai = a.vai === "nguoi_kiem_giup" && a.ten ? a.ten : ""; // ảnh do người kiểm giúp chụp: ghi tên
      var tieu = (m.ten || "") + " · " + gioVN(a.luc_ms) + (ai ? " · " + T("kg.do", { ten: ai }) : "");
      o.setAttribute("aria-label", T("bc.xem_anh") + " " + tieu);
      if (a.nho) { var img = the("img"); img.alt = ""; img.onload = function () { URL.revokeObjectURL(img.src); }; img.src = blobUrl(a.nho); o.appendChild(img); }
      o.appendChild(the("span", "bc-o-gio", gioVN(a.luc_ms) + (ai ? " · " + ai : "")));
      if (a.ghi_chu) o.title = a.ghi_chu;
      o.addEventListener("click", function () {
        xemLon(tieu + (a.ghi_chu ? " · " + a.ghi_chu : ""), function () {
          return ctx.goi({ hanh_dong: "xem_anh", houseId: ctx.houseId, anh_id: a.id }).then(function (r) { return r.data.anh; });
        });
      });
      luoi.appendChild(o);
    });
    return luoi;
  }

  /** Ảnh chung của mốc: ảnh không gắn việc nào trong checklist (mốc không có checklist: mọi ảnh). */
  function veAnh(el, m, ctx, mucIds) {
    el.textContent = "";
    var c = cache[khoa(ctx, m.id, "anh")];
    var coViec = mucIds.length > 0;
    var ds = c && c.anh ? c.anh.filter(function (a) { return mucIds.indexOf(a.muc_id) < 0; }) : [];
    el.appendChild(the("p", "bc-tieu", T(coViec ? "bc.anh_khac" : "bc.anh_tieu_de") + (ds.length ? " (" + ds.length + ")" : "")));
    if (!c || c.dang) { el.appendChild(the("p", "bc-ghi", T("bc.dang_tai"))); return; }
    if (c.loi) { el.appendChild(the("p", "bc-ghi loi", c.loi)); return; }
    if (!ds.length) { if (!coViec) el.appendChild(the("p", "bc-ghi", T("bc.chua_co_anh"))); }
    else el.appendChild(luoiAnh(ds, m, ctx));
    if (c.duoc_tai && !ctx.xemFounder) {
      el.appendChild(khoiChonAnh(ctx, function () { return m.id; }, null, null));
    }
  }

  /** Ảnh của một việc trong checklist + nút chụp/chọn ảnh gắn đúng việc đó.
   *  khongCanAnh: việc "không áp dụng" — chưa có ảnh thì chỉ ghi không cần ảnh, không hiện nút. */
  function khoiAnhViec(m, muc, ctx, khongCanAnh) {
    var el = the("div", "bc-viec");
    var k = khoa(ctx, m.id, "anh");
    el.__ve = function () {
      el.textContent = "";
      var c = cache[k];
      if (!c || c.dang) { el.appendChild(the("p", "bc-ghi", T("bc.dang_tai"))); return; }
      if (c.loi) { el.appendChild(the("p", "bc-ghi loi", c.loi)); return; }
      var ds = c.anh.filter(function (a) { return a.muc_id === muc.id; });
      el.dataset.soAnh = String(ds.length);
      if (ds.length) el.appendChild(luoiAnh(ds, m, ctx));
      else if (khongCanAnh) { el.appendChild(the("p", "bc-ghi", T("bc.khong_can_anh"))); return; }
      else el.appendChild(the("p", "bc-ghi bc-thieu", T("bc.chua_co_anh_viec")));
      if (c.duoc_tai && !ctx.xemFounder && !khongCanAnh) el.appendChild(khoiChonAnh(ctx, function () { return m.id; }, null, muc.id));
    };
    ganCho(k, el);
    el.__ve();
    napAnh(ctx, m.id);
    return el;
  }

  function veBanVe(el, m, ctx) {
    el.textContent = "";
    var c = cache[khoa(ctx, m.id, "bv")];
    if (c && c.khong_quyen) return;
    el.appendChild(the("p", "bc-tieu", T("bc.ban_ve_tieu_de")));
    if (!c || c.dang) { el.appendChild(the("p", "bc-ghi", T("bc.dang_tai"))); return; }
    if (c.loi) { el.appendChild(the("p", "bc-ghi loi", c.loi)); return; }
    if (!c.trang.length) { el.appendChild(the("p", "bc-ghi", T("bc.chua_co_ban_ve"))); return; }
    var ds = the("div", "bc-bv");
    c.trang.forEach(function (t) {
      var b = nut(T("bc.trang", { file: t.ten_file, trang: t.trang }), "bc-bv-nut");
      b.addEventListener("click", function () {
        xemLon(T("bc.trang", { file: t.ten_file, trang: t.trang }), function () {
          return ctx.goi({ hanh_dong: "xem_trang", houseId: ctx.houseId, ma_moc: m.id, i: t.i }).then(function (r) { return r.data.anh; });
        });
      });
      ds.appendChild(b);
    });
    el.appendChild(ds);
  }

  function veBienBan(el, m, ctx) {
    var b = nut(T("bc.tai_bien_ban"), "btn btn-gold bc-bb-nut");
    var tt = the("p", "bc-ghi", "");
    tt.setAttribute("role", "status");
    el.appendChild(b); el.appendChild(tt);
    b.addEventListener("click", function () {
      b.disabled = true; tt.className = "bc-ghi"; tt.textContent = T("bc.dang_lap");
      ctx.goi({ hanh_dong: "bien_ban", houseId: ctx.houseId, ma_moc: m.id }).then(function (r) {
        var url = blobUrl(r.data.pdf, "application/pdf");
        var link = the("a", "bc-bb-link", T("bc.mo_bien_ban"));
        link.href = url; link.download = r.data.ten_file || "bien-ban.pdf"; link.target = "_blank"; link.rel = "noopener";
        tt.textContent = T("bc.da_lap");
        tt.appendChild(document.createTextNode(" "));
        tt.appendChild(link);
        try { link.click(); } catch (e) { /* khách bấm link */ }
        try { if (window.dataLayer) window.dataLayer.push({ event: "aln_qltc_bien_ban" }); } catch (e) { /* bỏ qua */ }
      }, function (e) { tt.className = "bc-ghi loi"; tt.textContent = loiCua(e); }).then(function () { b.disabled = false; });
    });
  }

  /* ── Chọn ảnh → thu về 1600 px JPEG → gửi ── */
  function thuNho(file) {
    return new Promise(function (ok, hong) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var cd = Math.max(img.naturalWidth, img.naturalHeight);
        var tl = cd > 1600 ? 1600 / cd : 1;
        var cv = document.createElement("canvas");
        cv.width = Math.round(img.naturalWidth * tl); cv.height = Math.round(img.naturalHeight * tl);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        ok(cv.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); hong(new Error(T("bc.anh_khong_doc"))); };
      img.src = url;
    });
  }

  /**
   * Nút "Chụp ảnh" (mở camera sau trên điện thoại) + "Chọn ảnh" (thư viện) + ghi chú.
   * chonMa() trả mã mốc lúc gửi; chon (select) tuỳ chọn; mucId: gắn ảnh vào một việc (khi đó không
   * có ô ghi chú — tên việc đã là ngữ cảnh).
   */
  function khoiChonAnh(ctx, chonMa, chon, mucId) {
    var hop = the("div", "bc-tai" + (mucId ? " bc-tai-gon" : ""));
    function oChon(chup) {
      var ip = the("input"); ip.type = "file"; ip.accept = "image/*"; ip.hidden = true;
      if (chup) ip.setAttribute("capture", "environment"); else ip.multiple = true;
      return ip;
    }
    var ipChup = oChon(true), ipChon = oChon(false);
    var gc = null;
    if (!mucId) {
      gc = the("input", "bc-gc"); gc.type = "text"; gc.maxLength = 200; gc.placeholder = T("bc.ghi_chu_goi_y");
      gc.setAttribute("aria-label", T("bc.ghi_chu"));
    }
    var hang = the("div", "bc-tai-hang");
    var bChup = nut(T("bc.chup_anh"), "btn btn-ghost bc-tai-nut");
    var bChon = nut(T("bc.chon_anh"), "btn btn-ghost bc-tai-nut");
    hang.appendChild(bChup); hang.appendChild(bChon);
    var tt = the("p", "bc-ghi", ""); tt.setAttribute("role", "status");
    if (chon) hop.appendChild(chon);
    if (gc) hop.appendChild(gc);
    hop.appendChild(hang); hop.appendChild(ipChup); hop.appendChild(ipChon); hop.appendChild(tt);
    bChup.addEventListener("click", function () { ipChup.click(); });
    bChon.addEventListener("click", function () { ipChon.click(); });
    function guiTu(ip) {
      var files = Array.prototype.slice.call(ip.files || []).slice(0, 10);
      ip.value = "";
      var ma = chonMa();
      if (!files.length || !ma) return;
      bChup.disabled = bChon.disabled = true; tt.className = "bc-ghi";
      var xong = 0, loi = null;
      var chuoi = Promise.resolve();
      files.forEach(function (f) {
        chuoi = chuoi.then(function () {
          tt.textContent = T("bc.dang_gui", { da: xong, tong: files.length });
          return thuNho(f).then(function (data) {
            var goi = { hanh_dong: "tai_anh", houseId: ctx.houseId, ma_moc: ma, anh: data, ghi_chu: gc ? (gc.value || null) : null };
            if (mucId) goi.muc_id = mucId;
            return ctx.goi(goi);
          }).then(function () { xong++; }, function (e) { loi = loiCua(e); });
        });
      });
      chuoi.then(function () {
        bChup.disabled = bChon.disabled = false;
        if (xong && gc) gc.value = "";
        tt.className = "bc-ghi" + (loi ? " loi" : " ok");
        tt.textContent = loi ? (xong ? T("bc.gui_mot_phan", { da: xong, tong: files.length }) + " " : "") + loi : T("bc.da_gui", { da: xong });
        napAnh(ctx, ma, true);
        try { if (window.dataLayer && xong) window.dataLayer.push({ event: "aln_qltc_anh_moc", so_anh: xong, theo_viec: mucId ? 1 : 0 }); } catch (e) { /* bỏ qua */ }
      });
    }
    ipChup.addEventListener("change", function () { guiTu(ipChup); });
    ipChon.addEventListener("change", function () { guiTu(ipChon); });
    return hop;
  }

  /** Đầu khối Nhật ký: chọn mốc (mặc định mốc đang làm) rồi thêm ảnh. */
  function khoiTaiAnh(ctx) {
    var box = the("div", "bc-nk");
    box.appendChild(the("p", "bc-tieu", T("bc.nk_tieu_de")));
    var ds = ctx.dsMoc();
    if (!ds.length) { box.appendChild(the("p", "bc-ghi", T("bc.nk_chua_moc"))); return box; }
    var lb = the("label", "bc-chon-moc");
    lb.appendChild(the("span", null, T("bc.nk_moc")));
    var sel = the("select");
    var mac = ctx.mocMacDinh();
    ds.forEach(function (m) {
      var o = the("option", null, m.ten || "");
      o.value = m.id;
      if (m.id === mac) o.selected = true;
      sel.appendChild(o);
    });
    lb.appendChild(sel);
    box.appendChild(khoiChonAnh(ctx, function () { return sel.value; }, lb, null));
    return box;
  }

  var css = ".bc-khoi{margin-top:.8rem;border-top:1px solid var(--border-soft,#e2e2e2);padding-top:.5rem}"
    + ".bc-phan{margin:.4rem 0}"
    + ".bc-tieu{font-weight:600;color:var(--text-1,#1e293b)!important;font-size:var(--text-base,1rem)!important;margin:.5rem 0 .35rem!important}"
    + ".bc-ghi{font-size:var(--text-sm,.875rem);color:var(--text-3,#5b6472);margin:.25rem 0;line-height:1.5}"
    + ".bc-ghi.loi{color:var(--red,#b42318)}.bc-ghi.ok{color:var(--green,#17704a)}"
    + ".bc-ghi:empty{display:none}"
    + ".bc-luoi{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:.45rem;margin:.3rem 0 .6rem}"
    + ".bc-o{position:relative;aspect-ratio:4/3;padding:0;border:1px solid var(--border-soft,#ddd);border-radius:8px;overflow:hidden;background:#eee;cursor:pointer}"
    + ".bc-o img{width:100%;height:100%;object-fit:cover;display:block}"
    + ".bc-o-gio{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);color:#fff;font-size:11px;padding:2px 4px;text-align:left}"
    + ".bc-bv{display:flex;flex-direction:column;gap:.35rem}"
    + ".bc-bv-nut{text-align:left;border:1px solid var(--border-soft,#ddd);background:var(--surface,#fff);color:var(--text-1,#1e293b);border-radius:8px;padding:.6rem .75rem;min-height:2.75rem;font:inherit;cursor:pointer}"
    + ".bc-bb-nut{width:100%;min-height:2.8rem}.bc-bb-link{font-weight:600;color:var(--gold-dark,#7a5a12)}"
    + ".bc-tai{display:flex;flex-direction:column;gap:.45rem;margin:.3rem 0}"
    + ".bc-tai-nut{min-height:2.8rem;flex:1 1 0}"
    + ".bc-tai-hang{display:flex;gap:.45rem}"
    + ".bc-tai-gon{margin:.2rem 0 .1rem}"
    + ".bc-viec .bc-luoi{grid-template-columns:repeat(auto-fill,minmax(80px,1fr));margin:.25rem 0 .35rem}"
    + ".bc-thieu{color:var(--amber-dark,#8a5a00)!important}"
    + ".bc-gc,.bc-chon-moc select{font:inherit;font-size:16px;padding:.55rem .65rem;border:1.5px solid var(--border-soft,#ccc);border-radius:8px;width:100%;box-sizing:border-box;background:var(--surface,#fff);color:inherit}"
    + ".bc-chon-moc{display:flex;flex-direction:column;gap:.25rem;font-size:var(--text-sm,.875rem);color:var(--text-3,#5b6472)}"
    + ".bc-nk{border:1px dashed var(--border-soft,#ccc);border-radius:10px;padding:.7rem .8rem;margin:0 0 .9rem}"
    + ".bc-phu{position:fixed;inset:0;z-index:2000;background:rgba(10,12,16,.92);display:flex;flex-direction:column}"
    + ".bc-phu-dau{display:flex;align-items:center;gap:.6rem;padding:.6rem .8rem;color:#fff}"
    + ".bc-phu-ten{flex:1 1 auto;min-width:0;font-size:14px;line-height:1.4;overflow-wrap:anywhere}"
    + ".bc-phu-dong,.bc-phu-mo{flex:none;white-space:nowrap;background:#fff;color:#111;border:0;border-radius:8px;padding:.5rem .8rem;min-height:2.6rem;font:inherit;font-size:14px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}"
    + ".bc-phu-than{flex:1;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:0 .5rem .8rem;touch-action:pinch-zoom pan-x pan-y}"
    + ".bc-phu-anh{max-width:100%;height:auto;display:block}"
    + ".bc-phu-tt{color:#fff;margin-top:2rem}.bc-phu-tt.loi{color:#ffb4ab}";
  if (typeof document !== "undefined" && !document.getElementById("bc-css")) {
    var st = document.createElement("style"); st.id = "bc-css"; st.textContent = css; document.head.appendChild(st);
  }

  window.alnQltcBangChung = { khoiMoc: khoiMoc, khoiAnhViec: khoiAnhViec, khoiTaiAnh: khoiTaiAnh, _xoaBoNho: function () { cache = {}; cho = {}; } };
})();
