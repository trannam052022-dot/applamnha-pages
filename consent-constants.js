/**
 * Hằng số bằng chứng đồng ý xử lý dữ liệu cá nhân (Luật Bảo vệ dữ liệu cá
 * nhân số 91/2025/QH15 + Nghị định 356/2025/NĐ-CP) — dùng cho client ghi
 * trực tiếp Firestore (nccLeads, không qua Cloud Function callable).
 *
 * Bản sao đối ứng ở functions/consent_constants.js (CommonJS, cho server).
 * CONSENT_VERSION phải giống nhau. Sửa một nơi thì sửa cả hai.
 */
export const CONSENT_VERSION = "2026-08-04";

/* Phiên bản riêng theo từng câu — PHẢI giống functions/consent_constants.js.
   Mã "2026-10-03" (năm-tháng-ngày) = ngày 03/10/2026; xem giải thích ở bản máy chủ. */
export const CONSENT_VERSIONS = {
  du_toan: "2026-10-03",
  quang_cao: "2026-10-03",
  mymy_chat: "2026-10-03",
};

export const CONSENT_TEXTS = {
  ncc: "Tôi đồng ý để ALN và nhà cung cấp này xử lý thông tin trên nhằm mục đích liên hệ báo giá, theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.",
  /* Chat MyMy trên du-toan-nha.html hiện câu này phía trên nút đồng ý (02/10/2026).
     PHẢI giống hệt functions/consent_constants.js CONSENT_TEXTS.du_toan (câu máy chủ
     lưu làm bằng chứng) — functions/_test_tuVanPhanTho.js kiểm. */
  du_toan: "Tôi đồng ý để ALN dùng họ tên và SĐT này để gọi/nhắn tư vấn về bảng dự toán, theo Chính sách quyền riêng tư.",
  quang_cao: "Cho phép ALN gửi SĐT đã mã hoá cho Facebook để ALN biết quảng cáo nào hiệu quả, bớt chi quảng cáo sai chỗ.",
  /* Nút đồng ý trong chat MyMy ở trang không có luồng riêng (mymy-widget.js, index.html).
     PHẢI giống hệt functions/consent_constants.js CONSENT_TEXTS.mymy_chat. */
  mymy_chat: "Tôi đồng ý để ALN dùng SĐT này để gọi/nhắn tư vấn về nội dung tôi vừa hỏi MyMy, theo Chính sách quyền riêng tư.",
};

export const CONSENT_PURPOSES = {
  ncc: "lien_he_bao_gia",
  du_toan: "lien_he_tu_van_du_toan",
  quang_cao: "do_hieu_qua_quang_cao_meta",
  mymy_chat: "lien_he_tu_van_mymy",
};
