/* Văn phòng ALN — đối tác tự bật "Hiện tôi trong Văn phòng ALN" (Nam chốt 02/11/2026).
   Gắn vào trang làm việc của đối tác (kts_dashboard, designer_dashboard, ktv_dashboard, ks_dashboard):
     <script type="module" src="aln-van-phong-diem-danh.js?v=1"></script>
   - Hỏi máy chủ (vanPhongDiemDanh 'doc'): tài khoản không thuộc nhóm đối tác đã duyệt → không hiện gì.
   - Nút nhỏ góc dưới trái: "Văn phòng ALN · Đang hiện / Đang tắt". Bấm mở khung bật/tắt, chọn nghề
     (kỹ sư chọn kết cấu / điện nước / xây dựng), tick câu đồng ý (câu do máy chủ trả, mức B — Nam duyệt).
   - Đang bật: báo "đang làm việc" mỗi 60 giây khi trang đang mở (vanPhongDiemDanh 'nhip').
   Mọi chữ vào trang qua textContent. */
import { app, auth, onAuthStateChanged } from "./firebase-config.js";

const F = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js");
const goi = F.httpsCallable(F.getFunctions(app, "asia-southeast1"), "vanPhongDiemDanh");

const CSS = `
#alnVpDd{position:fixed;left:14px;bottom:14px;z-index:9000;font:500 13px "Be Vietnam Pro",system-ui,sans-serif}
#alnVpDd button{font:inherit}
#alnVpDd .vp-nut{display:inline-flex;align-items:center;gap:8px;background:#16171b;color:#f3eee5;border:1px solid rgba(214,179,112,.4);border-radius:999px;padding:8px 14px;cursor:pointer;box-shadow:0 10px 30px -10px rgba(0,0,0,.6)}
#alnVpDd .vp-cham{width:8px;height:8px;border-radius:50%;background:#7c818a}
#alnVpDd.bat .vp-cham{background:#5fcca2;box-shadow:0 0 0 3px rgba(95,204,162,.2)}
#alnVpDd .vp-khung{position:absolute;left:0;bottom:48px;width:min(340px,calc(100vw - 28px));background:#16171b;color:#f3eee5;border:1px solid rgba(214,179,112,.35);border-radius:14px;padding:14px 16px;box-shadow:0 24px 60px -20px rgba(0,0,0,.7)}
#alnVpDd h4{margin:0 0 6px;font:700 15px "Playfair Display",Georgia,serif;color:#e7cc93}
#alnVpDd p{margin:0 0 10px;font-size:12.5px;line-height:1.5;color:#cfc8bb}
#alnVpDd label{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:#f3eee5;margin:8px 0}
#alnVpDd select{width:100%;margin:2px 0 6px;background:#0f1013;color:#f3eee5;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:7px 8px;font:inherit}
#alnVpDd .vp-hd{display:flex;gap:8px;margin-top:10px}
#alnVpDd .vp-hd button{flex:1;border-radius:10px;padding:9px 10px;cursor:pointer;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#f3eee5;font-weight:600}
#alnVpDd .vp-hd .chinh{background:linear-gradient(180deg,#e2c084,#bf9549);border-color:#d6b072;color:#1b150a}
#alnVpDd .vp-hd button:disabled{opacity:.45;cursor:not-allowed}
#alnVpDd .vp-loi{color:#f0a074}
#alnVpDd a{color:#e7cc93}
@media print{#alnVpDd{display:none}}`;

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }

let S = null, nhipT = null, goc = null;

async function nhip() {
  // Báo cả khi tab đang ẩn: đối tác thường mở trang làm việc ở một tab rồi làm ở tab khác
  // (trình duyệt giãn hẹn giờ của tab ẩn xuống ~1 lần/phút, vẫn trong ngưỡng 3 phút).
  if (!S || !S.bat) return;
  try { await goi({ hanh_dong: "nhip" }); } catch (e) { /* mạng chập chờn: lần sau báo lại */ }
}
function chayNhip() { clearInterval(nhipT); if (S && S.bat) { nhip(); nhipT = setInterval(nhip, 60000); } }
document.addEventListener("visibilitychange", () => { if (!document.hidden) nhip(); });

function veNut() {
  goc.classList.toggle("bat", !!(S && S.bat));
  const n = goc.querySelector(".vp-nut"); n.replaceChildren(el("span", "vp-cham"), document.createTextNode("Văn phòng ALN · " + (S.bat ? "Đang hiện" : "Đang tắt")));
  n.setAttribute("aria-expanded", String(!!goc.querySelector(".vp-khung")));
}

function moKhung() {
  const cu = goc.querySelector(".vp-khung"); if (cu) { cu.remove(); veNut(); return; }
  const k = el("div", "vp-khung"); k.setAttribute("role", "dialog"); k.setAttribute("aria-label", "Hiện tôi trong Văn phòng ALN");
  k.appendChild(el("h4", "", "Hiện tôi trong Văn phòng ALN"));
  k.appendChild(el("p", "", "Chủ nhà vào applamnha.vn/van-phong sẽ thấy nghề, họ tên và ảnh đại diện của anh/chị tại bàn làm việc: còn mở trang này (kể cả ở tab khác) thì hiện nhân vật kèm thẻ tên có ảnh, đóng trang thì hiện bảng tên. Không hiện số điện thoại hay email; khách liên hệ qua ALN."));
  const a = el("a", "", "Xem văn phòng"); a.href = "/van-phong/"; a.target = "_blank"; a.rel = "noopener"; k.appendChild(a);
  let chonNghe = null;
  if (S.bat) {
    k.appendChild(el("p", "", "Đang hiện: " + (S.nhan || "") + " · " + (S.ten || "")));
    if (S.can_dong_y_lai) k.appendChild(el("p", "", "Câu đồng ý mới có thêm ảnh đại diện. Chưa đồng ý câu mới thì văn phòng chỉ hiện nghề và họ tên, không hiện ảnh."));
  } else {
    if (S.nghe_chon.length > 1) {
      k.appendChild(el("p", "", "Chuyên môn hiện cho khách:"));
      chonNghe = document.createElement("select");
      S.nghe_chon.forEach((x) => { const o = document.createElement("option"); o.value = x.ma; o.textContent = x.nhan; if (x.ma === S.nghe) o.selected = true; chonNghe.appendChild(o); });
      k.appendChild(chonNghe);
    }
    if (!S.ten) k.appendChild(el("p", "vp-loi", "Hồ sơ chưa có họ tên. Cập nhật họ tên trước khi bật."));
  }
  if (!S.co_anh && (!S.bat || S.can_dong_y_lai)) k.appendChild(el("p", "", "Hồ sơ chưa có ảnh đại diện: văn phòng sẽ hiện chữ cái đầu tên thay cho ảnh. Tải ảnh ở mục hồ sơ cá nhân."));
  const lb = el("label"); const cb = document.createElement("input"); cb.type = "checkbox"; lb.appendChild(cb); lb.appendChild(el("span", "", S.cau_dong_y));
  if (!S.bat || S.can_dong_y_lai) k.appendChild(lb);
  const loi = el("p", "vp-loi"); loi.hidden = true;
  const hd = el("div", "vp-hd");
  if (S.bat && S.can_dong_y_lai) {
    const them = el("button", "", "Đồng ý câu mới"); them.type = "button"; them.disabled = true;
    cb.addEventListener("change", () => { them.disabled = !cb.checked; });
    them.addEventListener("click", async () => {
      them.disabled = true; loi.hidden = true;
      try { await goi({ hanh_dong: "bat", dong_y: true, phien_ban: S.phien_ban, nghe: S.nghe }); S.can_dong_y_lai = false; k.remove(); veNut(); }
      catch (e) { loi.textContent = "Chưa lưu được: " + ((e && e.message) || "lỗi mạng") + ". Thử lại."; loi.hidden = false; them.disabled = false; }
    });
    hd.appendChild(them);
  }
  const dong = el("button", "", "Đóng"); dong.type = "button"; dong.addEventListener("click", () => { k.remove(); veNut(); });
  const chinh = el("button", "chinh", S.bat ? "Tắt hiển thị" : "Bật hiển thị"); chinh.type = "button";
  if (!S.bat) { chinh.disabled = true; cb.addEventListener("change", () => { chinh.disabled = !cb.checked || !S.ten; }); }
  chinh.addEventListener("click", async () => {
    chinh.disabled = true; loi.hidden = true;
    try {
      const r = S.bat ? await goi({ hanh_dong: "tat" }) : await goi({ hanh_dong: "bat", dong_y: cb.checked, phien_ban: S.phien_ban, nghe: chonNghe ? chonNghe.value : S.nghe });
      S.bat = !!r.data.bat; if (r.data.nghe) S.nghe = r.data.nghe; if (r.data.ten) S.ten = r.data.ten;
      S.nhan = (S.nghe_chon.find((x) => x.ma === S.nghe) || {}).nhan || "";
      k.remove(); veNut(); chayNhip();
    } catch (e) { loi.textContent = "Chưa lưu được: " + ((e && e.message) || "lỗi mạng") + ". Thử lại."; loi.hidden = false; chinh.disabled = false; }
  });
  hd.appendChild(dong); hd.appendChild(chinh); k.appendChild(loi); k.appendChild(hd);
  goc.appendChild(k); veNut();
}

onAuthStateChanged(auth, async (u) => {
  if (!u || u.isAnonymous) { if (goc) goc.remove(); goc = null; S = null; clearInterval(nhipT); return; }
  let r; try { r = await goi({ hanh_dong: "doc" }); } catch (e) { return; }
  S = r.data || {}; if (!S.duoc) return;
  S.nhan = (S.nghe_chon.find((x) => x.ma === S.nghe) || {}).nhan || "";
  if (!document.getElementById("alnVpDdCss")) { const st = document.createElement("style"); st.id = "alnVpDdCss"; st.textContent = CSS; document.head.appendChild(st); }
  goc = document.getElementById("alnVpDd") || el("div"); goc.id = "alnVpDd";
  goc.replaceChildren(); const nut = el("button", "vp-nut"); nut.type = "button"; nut.addEventListener("click", moKhung); goc.appendChild(nut);
  document.body.appendChild(goc); veNut(); chayNhip();
});
