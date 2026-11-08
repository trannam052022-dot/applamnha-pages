# Mô hình 3D dùng trên applamnha.vn

## cay.glb — cây, cau, bụi, cây chậu, đá (08/11/2026)

- **Nguồn:** bộ "Ultimate Stylized Nature" của Quaternius (https://quaternius.com).
  Bản lấy về: kho GitHub `walterpalladino/godot-quaternius-ultimate-stylized-nature`
  (thư mục `ultimate-stylized-nature/sources/FBX` + `Textures`).
- **Giấy phép:** CC0 1.0 (Creative Commons Zero) — tác giả ghi "Free for everyone to use
  in any project, even commercially". Không bắt buộc ghi tên; vẫn ghi ở đây để truy nguồn.
- **Đã sửa so với bản gốc:** đổi đơn vị sang mét, dựng đứng cau và cây tán (bản gốc trục Z lên),
  lá cây phong đổi từ đỏ mùa thu sang xanh, ảnh vân thu về 256 px, nén hình học
  (KHR_mesh_quantization) và ảnh WebP (EXT_texture_webp).

| Tên trong file | Mẫu gốc | Dùng cho |
|---|---|---|
| `cay_tan` | MapleTree_1 | cây tán lớn sân trong |
| `cay_tan2` | NormalTree_5 | cây tán thấp, cây trong bồn (olive) |
| `cau`, `cau2` | PalmTree_1, PalmTree_2 | cau quanh nhà |
| `bui`, `bui_hoa` | Bush, Bush_Flowers | bụi cây sân trong |
| `chau`, `chau2` | Plant_Flowers, Plant_1 | lá cây trong chậu |
| `da`, `da2` | Rock_2, Rock_5 | đá cảnh |

Mỗi mẫu là một node gốc mang tên ở cột 1; con của nó là phần thân (`*_than`) và lá (`*_la`),
gốc toạ độ ở chân cây.

**Dựng lại file:** xem `scripts/mo-hinh-3d/README.md`.

## nguoi/ — nhân vật văn phòng (08/11/2026, đợt 0: MyMy)

- **`nguoi/<ma>.glb`** — nhân vật hình minh hoạ / trợ lý AI, không đội tên người thật. Ảnh 2D Nam
  làm bằng ChatGPT (chính diện + lưng, tư thế chữ T), dựng 3D + gắn xương (Người hình người, bộ xương
  Mixamo) bằng Tripo3D Pro — gói trả phí, mô hình riêng tư, được dùng thương mại. Lưới làm lại
  bằng Retopo của Tripo (tứ giác), rồi nén: ảnh bề mặt 1024 px WebP, KHR_mesh_quantization.
  | Mã | Nhân vật | Tam giác | Dung lượng |
  |---|---|---|---|
  | `mymy` | MyMy, lễ tân sảnh | 18.511 | 1,1 MB |
  | `cn_tre_nam` | Chủ nhà trẻ (nam) | 18.490 | 1,1 MB |
  | `cn_tre_nu` | Chủ nhà trẻ (nữ) | 19.151 | 1,1 MB |
  | `cn_lon_nam` | Chủ nhà lớn tuổi (nam) | 18.185 | 1,0 MB |
  | `cn_lon_nu` | Chủ nhà lớn tuổi (nữ) | 18.625 | 1,1 MB |
- **`nguoi/<ma>/`** — ảnh tĩnh `anh.webp` (cắt từ ảnh 2D gốc) và clip biểu cảm Kling `<bieu_cam>.mp4`.
- **`nguoi/dong-tac.glb`** — 9 động tác tải từ Mixamo (Adobe; được dùng trong sản phẩm thương mại,
  không được phân phối lại riêng lẻ dưới dạng thư viện động tác): dung_nu (Female Idle), dung_nam
  (Breathing Idle), di_nu (Female Normal Walk), di_nam (Male Standard Walk), ngoi_go_phim (Typing),
  noi (Having A Chat At The Watercooler, lấy 12 giây đầu), chao (Waving), chi_tay (Aj Pointing Gesture),
  gat_dau (Nodding Head Yes). Bỏ xương ngón tay.

**Dựng lại / thêm nhân vật:** xem `scripts/mo-hinh-3d/nguoi/README.md`.
