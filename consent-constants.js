/**
 * Hằng số bằng chứng đồng ý xử lý dữ liệu cá nhân (Luật Bảo vệ dữ liệu cá
 * nhân số 91/2025/QH15 + Nghị định 356/2025/NĐ-CP) — dùng cho client ghi
 * trực tiếp Firestore (nccLeads, không qua Cloud Function callable).
 *
 * Bản sao đối ứng ở functions/consent_constants.js (CommonJS, cho server).
 * CONSENT_VERSION phải giống nhau. Sửa một nơi thì sửa cả hai.
 */
export const CONSENT_VERSION = "2026-08-04";

/* Phiên bản riêng theo từng câu — PHẢI giống functions/consent_constants.js. */
export const CONSENT_VERSIONS = {
  du_toan: "2026-10-02",
};

export const CONSENT_TEXTS = {
  ncc: "Tôi đồng ý để ALN và nhà cung cấp này xử lý thông tin trên nhằm mục đích liên hệ báo giá, theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.",
  /* Chat MyMy trên du-toan-nha.html hiện câu này phía trên nút đồng ý (02/10/2026).
     PHẢI giống hệt functions/consent_constants.js CONSENT_TEXTS.du_toan (câu máy chủ
     lưu làm bằng chứng) — functions/_test_tuVanPhanTho.js kiểm. */
  du_toan: "Tôi đồng ý để ALN lưu họ tên, số điện thoại và dự toán này để liên hệ tư vấn thiết kế theo yêu cầu của tôi, theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP. Anh/chị có thể yêu cầu ngừng liên hệ và xoá dữ liệu bất cứ lúc nào qua Zalo/hotline 0909 829 696.",
};

export const CONSENT_PURPOSES = {
  ncc: "lien_he_bao_gia",
  du_toan: "lien_he_tu_van_du_toan",
};
