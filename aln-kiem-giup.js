/**
 * aln-kiem-giup.js — khối "Người cùng theo dõi" của chủ nhà trong khong-gian-nha.html (16/10/2026).
 *
 *   window.alnKiemGiup.khoiChuNha(ctx) → phần tử: danh sách người kiểm giúp, form mời bằng SĐT,
 *                                        bật/tắt quyền bắt đầu & khép mốc, gỡ.
 *   ctx = { goi: (data) => httpsCallable('kiemGiup')(data), houseId }
 *
 * Máy chủ (functions/kiemGiup.js) quyết định quyền. Chữ ở qltc-chu.vi.js (khoá kg.chu.*).
 * Chỉ textContent / DOM, không innerHTML. Người được mời đăng nhập ở kiem-giup.html.
 */
(function () {
  "use strict";
  var T = function (k, b) { return window.ALN_CHU_QLTC ? window.ALN_CHU_QLTC.chu(k, b) : k; };
  function the(tag, cls, chu) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (chu != null) e.textContent = chu;
    return e;
  }
  function nut(chu, cls) { var b = the("button", cls || "btn btn-ghost", chu); b.type = "button"; return b; }
  function loiCua(e) { return (e && e.message) || T("kg.chu.loi"); }

  function khoiChuNha(ctx) {
    var box = the("div", "kg-chu");
    var st = { ds: null, link: "", loi: null, dang: false, moi: null, chep: false };

    function nap() {
      ctx.goi({ hanh_dong: "ds", houseId: ctx.houseId }).then(function (r) {
        st.ds = (r.data && r.data.nguoi) || []; st.toi_da = (r.data && r.data.toi_da) || 5; st.link = (r.data && r.data.link) || st.link; st.loi = null;
      }, function (e) { st.ds = st.ds || []; st.loi = loiCua(e); }).then(ve);
    }
    function lam(data) {
      if (st.dang) return Promise.resolve(false);
      st.dang = true; st.loi = null; ve();
      return ctx.goi(Object.assign({ houseId: ctx.houseId }, data)).then(function (r) { st.dang = false; return r.data || {}; },
        function (e) { st.dang = false; st.loi = loiCua(e); ve(); return null; });
    }

    function ve() {
      box.textContent = "";
      box.appendChild(the("p", "kg-mo-ta", T("kg.chu.mo_ta")));
      if (!st.ds) { box.appendChild(the("p", "kg-ghi", "…")); return; }
      if (!st.ds.length) box.appendChild(the("p", "kg-ghi", T("kg.chu.trong")));
      st.ds.forEach(function (n) {
        var dong = the("div", "kg-dong");
        var dau = the("div", "kg-dau");
        dau.appendChild(the("span", "kg-ten", n.ten + " · " + n.sdt));
        dau.appendChild(the("span", "kg-tt " + n.trang_thai, T(n.trang_thai === "da_nhan" ? "kg.chu.tt_da_nhan" : "kg.chu.tt_cho")));
        dong.appendChild(dau);
        var lb = the("label", "kg-khep");
        var cb = the("input"); cb.type = "checkbox"; cb.checked = !!n.duoc_khep_moc; cb.disabled = st.dang;
        cb.addEventListener("change", function () {
          var bat = cb.checked;
          lam({ hanh_dong: "khep", khoa: n.khoa, bat: bat }).then(function (r) { if (r) n.duoc_khep_moc = bat; ve(); });
        });
        lb.appendChild(cb); lb.appendChild(the("span", null, T("kg.chu.khep")));
        dong.appendChild(lb);
        var go = nut(T("kg.chu.go"), "btn btn-ghost kg-go"); go.disabled = st.dang;
        go.addEventListener("click", function () {
          if (!window.confirm(T("kg.chu.xn_go", { ten: n.ten }))) return;
          lam({ hanh_dong: "go", khoa: n.khoa }).then(function (r) { if (r) { st.moi = null; nap(); } });
        });
        dong.appendChild(go);
        box.appendChild(dong);
      });

      if (st.moi) {
        var ok = the("div", "kg-da-moi");
        ok.setAttribute("role", "status");
        ok.appendChild(the("p", null, T("kg.chu.da_moi", { ten: st.moi.ten, sdt4: st.moi.sdt4 })));
        var o = the("input", "kg-link"); o.type = "text"; o.readOnly = true; o.value = st.link;
        o.addEventListener("focus", function () { o.select(); });
        ok.appendChild(o);
        var chep = nut(T(st.chep ? "kg.chu.da_chep" : "kg.chu.chep_link"), "btn btn-ghost");
        chep.addEventListener("click", function () {
          var xong = function () { st.chep = true; ve(); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(st.link).then(xong, function () { o.focus(); });
          else o.focus();
        });
        ok.appendChild(chep);
        box.appendChild(ok);
      }

      if (st.ds.length < (st.toi_da || 5)) {
        var f = the("form", "kg-form"); f.noValidate = true;
        var ten = the("input", "kg-o"); ten.type = "text"; ten.maxLength = 60; ten.autocomplete = "off";
        ten.placeholder = T("kg.chu.ten_goi_y"); ten.setAttribute("aria-label", T("kg.chu.ten"));
        var sdt = the("input", "kg-o"); sdt.type = "tel"; sdt.inputMode = "numeric"; sdt.maxLength = 16; sdt.autocomplete = "off";
        sdt.placeholder = T("kg.chu.sdt"); sdt.setAttribute("aria-label", T("kg.chu.sdt"));
        sdt.setAttribute("data-aln-quyen", "");
        var gui = the("button", "btn btn-gold", T(st.dang ? "kg.chu.dang_moi" : "kg.chu.nut_moi")); gui.type = "submit"; gui.disabled = st.dang;
        f.appendChild(the("label", "kg-nhan", T("kg.chu.ten"))); f.appendChild(ten);
        f.appendChild(the("label", "kg-nhan", T("kg.chu.sdt"))); f.appendChild(sdt);
        f.appendChild(gui);
        f.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var tenV = ten.value.trim(), sdtV = sdt.value.replace(/[^\d+]/g, "");
          if (tenV.length < 2) { ten.focus(); return; }
          if (sdtV.length < 9) { sdt.focus(); return; }
          lam({ hanh_dong: "moi", ten: tenV, sdt: sdtV }).then(function (r) {
            if (!r) return;
            st.link = r.link || st.link; st.chep = false;
            st.moi = { ten: tenV, sdt4: sdtV.slice(-4) };
            nap();
          });
        });
        box.appendChild(f);
      } else {
        box.appendChild(the("p", "kg-ghi", T("kg.chu.toi_da", { n: st.toi_da || 5 })));
      }
      if (st.loi) { var e = the("p", "kg-loi", st.loi); e.setAttribute("role", "alert"); box.appendChild(e); }
    }

    ve();
    nap();
    return box;
  }

  var css = ".kg-chu{display:flex;flex-direction:column;gap:.55rem}"
    + ".kg-mo-ta{margin:0;font-size:var(--text-sm);color:var(--text-2);line-height:1.6}"
    + ".kg-ghi{margin:0;font-size:var(--text-sm);color:var(--text-3)}"
    + ".kg-dong{border:1px solid var(--border-soft,#ddd);border-radius:10px;padding:.6rem .7rem;display:flex;flex-direction:column;gap:.4rem}"
    + ".kg-dau{display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start}"
    + ".kg-ten{font-weight:600;color:var(--text-1);word-break:break-word}"
    + ".kg-tt{flex:none;font-size:var(--text-xs);font-weight:700;border-radius:999px;padding:.15rem .55rem}"
    + ".kg-tt.cho{background:var(--surface-2,#eef1f5);color:var(--text-2)}"
    + ".kg-tt.da_nhan{background:#e3f4ea;color:#17704a}"
    + ".kg-khep{display:flex;gap:.5rem;align-items:flex-start;font-size:var(--text-sm);color:var(--text-1);line-height:1.5}"
    + ".kg-khep input{width:1.2rem;height:1.2rem;margin-top:.15rem;flex:none}"
    + ".kg-go{align-self:flex-start;min-height:2.4rem}"
    + ".kg-form{display:flex;flex-direction:column;gap:.35rem;margin-top:.3rem}"
    + ".kg-nhan{font-size:var(--text-sm);color:var(--text-2);font-weight:600}"
    + ".kg-o,.kg-link{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:.6rem .7rem;border:1.5px solid var(--border-soft,#ccc);border-radius:8px;background:var(--surface,#fff);color:inherit}"
    + ".kg-form .btn{min-height:2.8rem;margin-top:.3rem}"
    + ".kg-da-moi{background:#e3f4ea;color:#14532d;border-radius:10px;padding:.6rem .7rem;display:flex;flex-direction:column;gap:.4rem}"
    + ".kg-da-moi p{margin:0;font-size:var(--text-sm);line-height:1.55}"
    + ".kg-loi{margin:0;color:#b42318;font-size:var(--text-sm)}";
  if (typeof document !== "undefined" && !document.getElementById("kg-css")) {
    var s = document.createElement("style"); s.id = "kg-css"; s.textContent = css; document.head.appendChild(s);
  }

  window.alnKiemGiup = { khoiChuNha: khoiChuNha };
})();
