/* ═══ ALN — Service Worker nhận push khi trình duyệt đóng/nền ═══ */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCPv-KbyK8ajRba1b2wy5qSwc--m_vbRUc",
  authDomain: "auth.applamnha.vn",
  projectId: "aln-platform",
  storageBucket: "aln-platform.firebasestorage.app",
  messagingSenderId: "1073827504988",
  appId: "1:1073827504988:web:8895fd6b68dff00a67d799"
});

const messaging = firebase.messaging();

/* Trình duyệt/browser thường tự hiện thông báo nền từ payload "notification"
   trước khi handler này chạy tới — chỉ khi KHÔNG có "notification" (hoặc trình
   duyệt không tự xử lý) thì hàm này mới thật sự dựng thông báo. notifyUser()
   (functions/index.js) đặt title/body trong "notification"/"webpush.notification",
   KHÔNG có trong "data" — đọc nhầm payload.data.title trước đây khiến các
   trường hợp rơi vào nhánh này hiện thông báo rỗng ("ALN — Tin nhắn mới",
   không có nội dung thật). */
messaging.onBackgroundMessage(function(payload) {
  const n = (payload && payload.notification) || {};
  const d = (payload && payload.data) || {};
  return self.registration.showNotification(n.title || d.title || 'ALN — Tin nhắn mới', {
    body: n.body || d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: 'aln-push',
    data: d
  });
});

/* Fetch passthrough — bắt buộc để Chrome nhận diện PWA installable */
self.addEventListener('fetch', function(e) {
  e.respondWith(fetch(e.request).catch(function() {
    return new Response('', { status: 503 });
  }));
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return clients.openWindow('./login.html');
    })
  );
});
