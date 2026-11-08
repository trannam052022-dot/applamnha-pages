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
