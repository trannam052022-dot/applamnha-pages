/* Giám sát lỗi JS — bắt window.onerror + unhandledrejection, gửi Cloud
   Function logClientError (không ghi thẳng Firestore, không cần đăng nhập/
   App Check). Không thu thập tên/SĐT/uid — chỉ message/stack/url.
   Tối đa 10 lỗi/phiên để tránh spam khi 1 trang lỗi lặp liên tục. */
(function () {
  // Bỏ qua khi mở file cục bộ (file://) — đây là môi trường dev/xem trước lúc
  // sửa code, không phải người dùng thật trên site, không cần báo lỗi.
  if (location.protocol === "file:") return;

  var ENDPOINT = "https://asia-southeast1-aln-platform.cloudfunctions.net/logClientError";
  var MAX_PER_SESSION = 10;
  var sent = 0;

  function report(message, stack, xuLy) {
    if (sent >= MAX_PER_SESSION) return;
    sent++;
    var payload = JSON.stringify({
      message: String(message || "").slice(0, 500),
      stack: String(stack || "").slice(0, 1000),
      url: location.href.slice(0, 300),
      xu_ly: xuLy === true
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
      } else {
        fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
      }
    } catch (e) { /* im lặng — công cụ giám sát không được tự gây lỗi thêm */ }
  }

  // Lớp 1b (27/09/2026): trang gọi khi TỰ BẮT được lỗi mà khách vẫn thấy (gửi
  // OTP thất bại, lưu bị mất mạng...) — những lỗi này không nổ ra window.onerror
  // nên trước đây không ai biết. Máy chủ push Founder (tối đa 1 lần/trang/15 phút).
  // Không gửi tên/SĐT: chỉ ngữ cảnh + mã lỗi + câu lỗi đã che số.
  window.alnBaoLoi = function (nguCanh, err) {
    var ma = (err && err.code) || "";
    var cau = String((err && err.message) || err || "").replace(/\+?\d[\d\s.]{5,}\d/g, "***");
    report("[" + nguCanh + "] " + ma + (cau ? ": " + cau : ""), err && err.stack, true);
  };
  // Chỉ báo lỗi hệ thống — lỗi do khách (nhập sai mã, sai số, mạng nhà khách
  // chập chờn, thử quá nhiều lần) không báo. Lỗi máy chủ trả về (functions/…)
  // đã được máy chủ tự báo (lớp 1), ở đây chỉ báo khi request không tới được.
  var MA_KHACH = /^(auth\/(invalid-phone-number|missing-phone-number|invalid-verification-code|code-expired|too-many-requests|network-request-failed|missing-verification-code|user-disabled)|functions\/(invalid-argument|permission-denied|unauthenticated|resource-exhausted|failed-precondition|not-found|internal|already-exists|cancelled|aborted|out-of-range|data-loss|unimplemented|unknown))$/;
  window.alnBaoLoiNeuCan = function (nguCanh, err) {
    var ma = String((err && err.code) || "");
    if (MA_KHACH.test(ma)) return;
    window.alnBaoLoi(nguCanh, err);
  };

  window.addEventListener("error", function (e) {
    report(e.message, e.error && e.error.stack);
  });
  window.addEventListener("unhandledrejection", function (e) {
    var reason = e.reason;
    report((reason && reason.message) || String(reason), reason && reason.stack);
  });
})();
