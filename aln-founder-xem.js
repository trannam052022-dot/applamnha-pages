/* Chế độ "Founder xem như khách" (Nam yêu cầu 30/09/2026).
 * Founder đăng nhập tài khoản founder (không OTP) vẫn mở được các trang của
 * chủ nhà để kiểm tra đúng như khách thấy. Đây CHỈ là phần giao diện: máy chủ
 * (functions/lib/founderXem.js, firestore.rules isFounder()) mới là nơi cho
 * hay không cho xem. Chế độ này chỉ xem, không lưu gì vào hồ sơ khách.
 */
(function () {
  var UID = 'h4kEguPEyMcwJwl89stc0Q6j2si2';
  function la(user) {
    return !!(user && !user.isAnonymous && user.uid === UID);
  }
  function hienThanh(ghiChu) {
    if (document.getElementById('aln-founder-xem')) return;
    var d = document.createElement('div');
    d.id = 'aln-founder-xem';
    d.setAttribute('role', 'status');
    d.style.cssText = 'position:sticky;top:0;z-index:9999;background:#7a4a00;color:#fff;font:600 13px/1.4 system-ui,sans-serif;padding:7px 14px;text-align:center';
    d.textContent = 'Chế độ xem của Founder — chỉ xem, không lưu vào hồ sơ khách' + (ghiChu ? ' · ' + ghiChu : '');
    var chen = function () {
      document.body.insertBefore(d, document.body.firstChild);
      // Không in thanh này ra PDF
      var st = document.createElement('style');
      // Thanh công cụ dính đầu trang (.bar ở trang in) nằm ngay dưới thanh này, không bị che
      st.textContent = '@media print{#aln-founder-xem{display:none!important}}'
        + '@media screen{body>.bar{top:' + (d.offsetHeight || 34) + 'px}}';
      document.head.appendChild(st);
    };
    if (document.body) chen(); else document.addEventListener('DOMContentLoaded', chen);
  }
  window.alnFounderXem = { UID: UID, la: la, hienThanh: hienThanh };
})();
