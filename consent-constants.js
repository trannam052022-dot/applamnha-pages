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
  mat_bang: "2026-10-07",
  bat_trach: "2026-10-12",
  du_lieu_nha: "2026-10-15-2",
  thong_ke_an_danh: "2026-10-15-2",
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
  /* Form "Nhờ KTS chỉnh phương án này" ở /thiet-ke-mat-bang/ — PHẢI giống hệt
     functions/consent_constants.js CONSENT_TEXTS.mat_bang (functions/_test_matBang.js kiểm). */
  mat_bang: "Tôi đồng ý để ALN dùng họ tên, SĐT và phương án mặt bằng này để KTS gọi/nhắn tư vấn thiết kế, theo Chính sách quyền riêng tư.",
  /* Form "Lưu phiếu và tải PDF" trên bat-trach.html — PHẢI giống hệt
     functions/consent_constants.js CONSENT_TEXTS.bat_trach (functions/_test_batTrach.js kiểm). */
  bat_trach: "Tôi đồng ý để ALN lưu họ tên, SĐT của tôi cùng họ tên, ngày sinh các thành viên và hướng nhà đã nhập để KTS của ALN liên hệ tư vấn, theo Chính sách quyền riêng tư.",
  /* Đồng ý dữ liệu Gói Quản lý Thi công (PR-4) — Nam duyệt câu chữ 15/10/2026, phiên bản
     "2026-10-15-2" (bản nháp "2026-10-15" chưa từng lên production). Đổi câu = tăng phiên bản.
     du_lieu_nha bắt buộc trước khi bật gói; thong_ke_an_danh tuỳ chọn (mục đích riêng,
     tách ô theo Luật 91/2025/QH15). Ghi ở houses/{id}.dong_y_du_lieu qua khDongYDuLieu;
     aln-dong-y-du-lieu.js hiện GIỐNG HỆT (functions/_test_dongYDuLieu.js kiểm hai bản). */
  du_lieu_nha: "Tôi đồng ý để ALN lưu và xử lý dữ liệu công trình của tôi trong Không gian Nhà, để cung cấp gói dịch vụ tôi chọn cho chính nhà tôi, theo Chính sách quyền riêng tư.",
  thong_ke_an_danh: "Cho phép ALN dùng số liệu kích thước và chi phí của công trình này, đã bỏ họ tên, số điện thoại và địa chỉ chi tiết, để thống kê giá xây dựng theo khu vực.",
};

export const CONSENT_PURPOSES = {
  ncc: "lien_he_bao_gia",
  du_toan: "lien_he_tu_van_du_toan",
  quang_cao: "do_hieu_qua_quang_cao_meta",
  mymy_chat: "lien_he_tu_van_mymy",
  mat_bang: "lien_he_tu_van_mat_bang",
  bat_trach: "lien_he_tu_van_bat_trach",
  du_lieu_nha: "van_hanh_goi_dich_vu_khong_gian_nha",
  thong_ke_an_danh: "thong_ke_gia_an_danh",
};
