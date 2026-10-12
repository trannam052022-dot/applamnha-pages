/* ALN · /thiet-ke-mat-bang/ — gọi máy chủ (ES module). Bốn việc, đều qua callable (Admin SDK, không
 * ghi Firestore trực tiếp từ trình duyệt):
 *   sinh     → sinhMatBang      bộ máy sinh phương án chạy trên máy chủ (12/10/2026): 'tao' 3 phương án, 'dung' dựng lại sau khi chỉnh
 *   ghiBuoc  → ghiBuocMatBang   bước dùng ẩn danh (mở trang, vẽ, xem phương án, đảo bên, mở form)
 *   gopY     → ghiGopYMatBang   góp ý hợp / chưa hợp + lý do cho từng phương án
 *   lead     → guiLeadMatBang   "Nhờ KTS chỉnh phương án này" (họ tên + SĐT + đồng ý liên hệ)
 * ?internal=1 (scripts/aln-optout.js): không ghi bước, không ghi góp ý — Founder/team thử không làm lệch số.
 */
import { app } from '../firebase-config.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js';

const fns = getFunctions(app, 'asia-southeast1');
const callBuoc = httpsCallable(fns, 'ghiBuocMatBang', { timeout: 10000 });
const callGopY = httpsCallable(fns, 'ghiGopYMatBang', { timeout: 15000 });
const callLead = httpsCallable(fns, 'guiLeadMatBang', { timeout: 20000 });
const callSinh = httpsCallable(fns, 'sinhMatBang', { timeout: 45000 });
const noiBo = () => window.ALN_INTERNAL === true;

const api = {
  sinh(d) {
    return callSinh({ hanh_dong: d.hanh_dong, form: d.form, v: d.v }).then((r) => r.data);
  },
  ghiBuoc(d) {
    if (noiBo()) return Promise.resolve({ ok: true, noi_bo: true });
    return callBuoc(d).then((r) => r.data, () => null);
  },
  gopY(d) {
    if (noiBo()) return Promise.resolve({ ok: true, noi_bo: true });
    return callGopY(d).then((r) => r.data);
  },
  lead(d) {
    return callLead(Object.assign({}, d, { optout: noiBo() })).then((r) => r.data);
  },
};
window.alnMbMay = api;

/* Lệnh gọi xếp hàng trước khi module này nạp xong (mb-trang.js) */
const hang = window.alnMbHang || [];
window.alnMbHang = [];
hang.forEach((m) => {
  const f = api[m.ten];
  if (!f) { m.rej(new Error('khong_co_ham')); return; }
  f(m.d).then(m.res, m.rej);
});
