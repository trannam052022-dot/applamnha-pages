/**
 * Hằng số bằng chứng đồng ý xử lý dữ liệu cá nhân (Luật Bảo vệ dữ liệu cá
 * nhân số 91/2025/QH15 + Nghị định 356/2025/NĐ-CP) — dùng cho client ghi
 * trực tiếp Firestore (nccLeads, không qua Cloud Function callable).
 *
 * Bản sao đối ứng ở functions/consent_constants.js (CommonJS, cho server).
 * CONSENT_VERSION phải giống nhau. Sửa một nơi thì sửa cả hai.
 */
export const CONSENT_VERSION = "2026-08-04";

export const CONSENT_TEXTS = {
  ncc: "Tôi đồng ý để ALN và nhà cung cấp này xử lý thông tin trên nhằm mục đích liên hệ báo giá, theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.",
};

export const CONSENT_PURPOSES = {
  ncc: "lien_he_bao_gia",
};
