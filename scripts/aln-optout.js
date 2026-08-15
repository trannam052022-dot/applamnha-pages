/* ALN — guard opt-out chặn tracking nội bộ (Founder/team tự test trang không
 * lẫn vào số liệu Ads/GA4/Meta thật). Nạp ĐỒNG BỘ trong <head>, đặt TRƯỚC
 * snippet Meta Pixel và TRƯỚC gtag/GTM — phải chạy sớm nhất để window.fbq /
 * window['ga-disable-...'] có tác dụng trước khi các script tracking khác
 * đọc/dùng chúng. KHÔNG thêm async/defer khi nhúng file này.
 *
 * KHÔNG sửa flow bắn sự kiện hiện có ở bất kỳ trang nào — file này chỉ THÊM
 * điều kiện chặn ở tầng trên cùng, mọi thứ khác giữ nguyên.
 *
 * Bật:  mở trang với ?internal=1 một lần → ghi localStorage, giữ qua các
 *       lần vào lại sau (không cần lặp lại query param mỗi lần).
 * Tắt:  mở trang với ?internal=0 → xoá cờ, tracking chạy lại bình thường.
 *
 * ES5 thuần, không optional chaining/object shorthand — có thể chạy ở
 * <script> thường (không cần type="module"), theo đúng quy ước 2 scope của
 * repo (xem CLAUDE.md mục "Quy ước làm việc" #3).
 */
(function () {
  try {
    var parts = location.search.substring(1).split('&');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      if (kv[0] === 'internal') {
        if (kv[1] === '1') localStorage.setItem('aln_internal', '1');
        else if (kv[1] === '0') localStorage.removeItem('aln_internal');
        break;
      }
    }
  } catch (e) {}

  var isInternal = false;
  try { isInternal = localStorage.getItem('aln_internal') === '1'; } catch (e) {}
  if (!isInternal) return; // không internal: không làm gì, tracking chạy nguyên như hiện tại

  window.ALN_INTERNAL = true;

  // Cờ chính thức của Google (gtag.js đọc window['ga-disable-<MEASUREMENT_ID>']
  // trước khi gửi bất kỳ hit nào) — chặn được CẢ thẻ gtag.js trực tiếp LẪN
  // thẻ GA4 cấu hình bên trong container GTM-MB7VRGR5. Chỉ ghi đè hàm gtag()
  // là KHÔNG đủ vì GTM tự nạp gtag.js riêng bên trong container, không dùng
  // lại biến gtag() ở scope ngoài.
  window['ga-disable-G-5CSL1TF0RC'] = true;

  // No-op Pixel TRƯỚC khi snippet fbevents.js thật chạy — snippet Pixel chỉ
  // gán window.fbq nếu window.fbq CHƯA tồn tại (if(f.fbq)return;), nên đặt
  // sẵn 1 hàm rỗng ở đây làm nó tự bỏ qua toàn bộ phần init/queue thật.
  window.fbq = function () {};
  window._fbq = window.fbq;
})();
