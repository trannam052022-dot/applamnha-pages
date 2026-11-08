/* ═══════════════════════════════════════════════════════════════
   Mặt bằng Văn phòng ALN — NGUỒN DUY NHẤT cho bản 2D (van-phong.js), bản 3D (van-phong-3d.js)
   và bài kiểm functions/_test_matBangVanPhong.js (Nam duyệt 07/11/2026).

   Khối nhà 25,2 × 36 m trên lưới 3,6 m (nửa ô 1,8 m; vách kính chia 0,9 m). Hệ toạ độ:
   x chạy dọc tường sau (trái → phải), y từ tường sau (y = 0) ra mặt tiền (y = 36, cửa chính).
   Bố cục theo hành trình chủ nhà — một trục thẳng: cửa chính → Sảnh MyMy → Sân trong → Phòng họp
   KTS Trần Long ở cuối trục. Hai cánh dịch vụ nhìn ra sân trong: trái Dự toán, Phong thủy;
   phải Quản lý thi công (Không gian Nhà), Nội thất. Dãy sau: Xưởng thiết kế, Phòng họp, Vận hành.
   Dãy trước: Hồ sơ mẫu, Sảnh, Khu chờ & cà phê (góc X2 để dành cho thang lên tầng 2, chưa dựng).

   Không phải đập đi xây lại khi lớn lên:
   - Phòng là Ô (slot) có mã cố định; đổi công năng chỉ đổi chữ ở van-phong.js, không đổi hình.
   - Dải dự phòng X1 phía sau tường sau (y âm, 25,2 × 10,8 m) và góc X2 để dành đặt thang khi mở tầng 2 (chưa dựng khối).
   - Đồ đạc chỉ khai ở đây; 2D và 3D cùng đọc một danh sách. Thêm món mới: thêm hàm cùng tên
     ở van-phong.js (vẽ 2D + rec) và ở DO trong van-phong-3d.js, rồi thêm vùng chặn ở chan() dưới đây.
   ═══════════════════════════════════════════════════════════════ */
(function (goc) {
  'use strict';
  const MB = {
    phien_ban: '2026-11-08',
    rong: 25.2, sau: 36, module: 3.6, buoc_kinh: 0.9,
    cua_chinh: { x0: 10.8, x1: 14.4 },
    /* Cửa phụ ở hai đầu mỗi hành lang ngang, mở ra vườn quanh nhà (Nam yêu cầu 08/11/2026).
       canh 'trai' = tường trái (x = 0), 'phai' = mép phải (x = rong). Rộng đúng bằng hành lang. */
    cua_phu: [
      { canh: 'trai', y0: 10.8, y1: 12.6 }, { canh: 'phai', y0: 10.8, y1: 12.6 },
      { canh: 'trai', y0: 27, y1: 28.8 }, { canh: 'phai', y0: 27, y1: 28.8 }
    ],

    /* Ô phòng (mã cố định). Chữ, trang mở, người trực: van-phong.js. */
    phong: {
      tk:   { x0: 0,    y0: 0,    x1: 9,    y1: 10.8, c: '#d6c27a', o: 'B1' },
      gd:   { x0: 9,    y0: 0,    x1: 16.2, y1: 10.8, c: '#c9a35b', o: 'B2' },
      kd:   { x0: 16.2, y0: 0,    x1: 25.2, y1: 10.8, c: '#52c49a', o: 'B3' },
      pt:   { x0: 0,    y0: 12.6, x1: 7.2,  y1: 19.8, c: '#d9a066', o: 'W2' },
      dt:   { x0: 0,    y0: 19.8, x1: 7.2,  y1: 27,   c: '#5fb7d4', o: 'W1' },
      nt:   { x0: 18,   y0: 12.6, x1: 25.2, y1: 19.8, c: '#c99bea', o: 'E2' },
      kgn:  { x0: 18,   y0: 19.8, x1: 25.2, y1: 27,   c: '#7fd18b', o: 'E1' },
      kho:  { x0: 0,    y0: 28.8, x1: 9,    y1: 36,   c: '#b07cc6', o: 'F1' },
      sanh: { x0: 9,    y0: 28.8, x1: 16.2, y1: 36,   c: '#e2a3b8', o: 'F2' },
      tt:   { x0: 16.2, y0: 28.8, x1: 25.2, y1: 36,   c: '#f07a5a', o: 'F3' }
    },
    /* Ô dùng chung chỗ của phòng khác (khách vào từ nút "Tư vấn", "Quy trình 4 bước"). */
    phong_ao: { tiep: 'gd', ceo: 'gd' },
    hanh_lang: [
      { x0: 0, y0: 10.8, x1: 25.2, y1: 12.6 }, { x0: 7.2, y0: 12.6, x1: 9, y1: 27 },
      { x0: 16.2, y0: 12.6, x1: 18, y1: 27 }, { x0: 0, y0: 27, x1: 25.2, y1: 28.8 }
    ],
    san_trong: { x0: 9, y0: 12.6, x1: 16.2, y1: 27, o: 'C1' },
    /* Sân trong là MỘT khu vườn liền (Nam 08/11/2026: không chia ô): nền cỏ, lối sỏi uốn cong từ hành lang sau
       tới hành lang trước, 2 sàn gỗ tròn có ghế cong chạm lối, cây và tiểu cảnh đá rải theo mép lối. */
    vuon: {
      loi: { diem: [[12.6, 12.6], [11.4, 14.6], [10.6, 16.8], [11.2, 19.0], [13.0, 20.6], [14.6, 22.6], [14.2, 24.9], [12.6, 27]], rong: 1.3 },
      san_go: [[13.2, 15.9, 1.5], [12.2, 23.6, 1.65]]
    },
    du_phong: [
      { o: 'X1', ten: 'Dải mở rộng phía sau', x0: 0, y0: -10.8, x1: 25.2, y1: 0 },
      { o: 'X2', ten: 'Lõi thang lên tầng 2', x0: 22.5, y0: 32.4, x1: 25.2, y1: 36 }
    ],

    /* Sàn: go = gỗ xương cá, da = đá, co = cỏ. Vẽ theo thứ tự. */
    san: [
      { x0: 0, y0: 10.8, x1: 25.2, y1: 12.6, loai: 'da', c1: '#e8e3da', c2: '#a59c8f', seed: 4, slab: 0.9 },
      { x0: 7.2, y0: 12.6, x1: 9, y1: 27, loai: 'da', c1: '#e8e3da', c2: '#a59c8f', seed: 41, slab: 0.9 },
      { x0: 16.2, y0: 12.6, x1: 18, y1: 27, loai: 'da', c1: '#e8e3da', c2: '#a59c8f', seed: 42, slab: 0.9 },
      { x0: 0, y0: 27, x1: 25.2, y1: 28.8, loai: 'da', c1: '#e8e3da', c2: '#a59c8f', seed: 6, slab: 0.9 },
      { x0: 0, y0: 0, x1: 9, y1: 10.8, loai: 'go', c1: '#b98c5e', c2: '#a87d52', seed: 14 },
      { x0: 9, y0: 0, x1: 16.2, y1: 10.8, loai: 'da', c1: '#f1ede6', c2: '#a39888', seed: 13 },
      { x0: 16.2, y0: 0, x1: 25.2, y1: 10.8, loai: 'go', c1: '#6a4126', c2: '#5c3820', seed: 11 },
      { x0: 0, y0: 12.6, x1: 7.2, y1: 19.8, loai: 'go', c1: '#5d3a22', c2: '#4f311c', seed: 3 },
      { x0: 0, y0: 19.8, x1: 7.2, y1: 27, loai: 'go', c1: '#b98c5e', c2: '#a87d52', seed: 5 },
      { x0: 9, y0: 12.6, x1: 16.2, y1: 27, loai: 'co', c1: '#5f8a4a', c2: '#4d7a3c', seed: 21 },
      { x0: 18, y0: 12.6, x1: 25.2, y1: 19.8, loai: 'da', c1: '#efebe4', c2: '#9d9488', seed: 2 },
      { x0: 18, y0: 19.8, x1: 25.2, y1: 27, loai: 'go', c1: '#6a4126', c2: '#5c3820', seed: 12 },
      { x0: 0, y0: 28.8, x1: 9, y1: 36, loai: 'go', c1: '#5d3a22', c2: '#4f311c', seed: 9 },
      { x0: 9, y0: 28.8, x1: 16.2, y1: 36, loai: 'da', c1: '#f1ede6', c2: '#a39888', seed: 7, kim_cuong: 1 },
      { x0: 16.2, y0: 28.8, x1: 25.2, y1: 36, loai: 'go', c1: '#b98c5e', c2: '#a87d52', seed: 8 }
    ],
    tham: [
      [10.6, 3.6, 14.6, 8.8, '#1f5c4a', '#c9a35b'],   // dưới bàn họp
      [2.2, 16.2, 5.8, 18.9, '#6b2d2d', '#c9a35b'],    // bàn trà phong thủy
      [18.9, 15.4, 22.0, 17.4, '#d9cfc0', '#8a5232'],  // bàn mẫu vật liệu
      [0.8, 33.2, 3.6, 35.6, '#6b2d2d', '#c9a35b'],    // góc đọc hồ sơ mẫu
      [11.0, 35.1, 14.2, 36, '#2b2723', '#c9a35b'],    // thảm cửa chính
      [18.0, 29.8, 21.0, 33.3, '#d9cfc0', '#8a5232']   // khu chờ
    ],
    vien: [[10.9, 0, 25.2], [12.5, 0, 25.2], [27.1, 0, 25.2], [28.7, 0, 25.2]],

    /* Vách kính: truc 'x' = vách dọc ở x = toa (chạy theo y); 'y' = vách ngang ở y = toa. gaps = cửa. */
    vach: [
      ['y', 10.8, 0, 25.2, [[6.3, 8.1], [11.7, 13.5], [17.1, 18.9]]],
      ['x', 9, 0, 10.8], ['x', 16.2, 0, 10.8],
      ['y', 12.6, 0, 7.2], ['y', 19.8, 0, 7.2], ['y', 27, 0, 7.2],
      ['x', 7.2, 12.6, 27, [[15.3, 17.1], [22.5, 24.3]]],
      ['y', 12.6, 18, 25.2], ['y', 19.8, 18, 25.2], ['y', 27, 18, 25.2],
      ['x', 18, 12.6, 27, [[15.3, 17.1], [22.5, 24.3]]],
      ['y', 28.8, 0, 25.2, [[6.3, 8.1], [9.9, 15.3], [17.1, 18.9]]],
      ['x', 9, 28.8, 36, [[31.5, 33.3]]], ['x', 16.2, 28.8, 36, [[31.5, 33.3]]]
    ],

    /* Tường sau (A: y = 0, dọc x) và tường trái (B: x = 0, dọc y). */
    tuong_a: [
      { k: 'cua_so', a0: 0.9, a1: 2.4, seed: 11 }, { k: 'cua_so', a0: 3.8, a1: 5.3, seed: 13 }, { k: 'cua_so', a0: 6.7, a1: 8.2, seed: 15 },
      { k: 'bang', a0: 10.0, a1: 15.2, key: 'a' },
      { k: 'cua_so', a0: 17.0, a1: 18.8, seed: 22 }, { k: 'cua_so', a0: 20.4, a1: 22.2, seed: 24 },
      { k: 'bang', a0: 22.8, a1: 25.0, key: 'b' }
    ],
    tuong_b: [
      { k: 'ke', a0: 2.4, a1: 6.0, seed: 12 }, { k: 'cua_so', a0: 6.8, a1: 9.6, seed: 32 },
      { k: 'tranh', a0: 14.2, a1: 15.7, seed: 31 }, { k: 'cua_so', a0: 16.6, a1: 18.2, seed: 33 },
      { k: 'cua_so', a0: 22.2, a1: 24.6, seed: 34 },
      { k: 'ke', a0: 29.2, a1: 35.6, seed: 23 }
    ],

    /* Đồ đạc. Mỗi dòng: [tên hàm, ...tham số] — cùng tên ở 2D và 3D. */
    do: [
      // B1 Xưởng thiết kế: 3 bàn vẽ dưới cửa sổ (đối tác chuyên môn), bàn trải bản vẽ, mô hình, 2 bàn đối tác, tủ bản vẽ
      ['drafting', 0.6, 1.0, 1.9, 0.95], ['drafting', 3.5, 1.0, 1.9, 0.95], ['drafting', 6.4, 1.0, 1.9, 0.95],
      ['table', 1.0, 4.4, 3.4, 1.6, 14, '#efe9dd'], ['maquette', 5.4, 4.5],
      ['desk', 0.8, 7.4, 3.0, 0.9, { mons: [0.5, 1.7], tint: '#d6c27a' }], ['chair', 1.3, 8.45], ['chair', 2.5, 8.45],
      ['sheet', 5.6, 9.0, 2.2, 0.8, 14], ['plant', 8.3, 3.0, 0.8], ['lamp', 0.5, 6.6],
      // B2 Phòng họp · KTS Trần Long: bàn làm việc nhìn ra sân trong, bàn họp 7 chỗ dọc trục, góc tiếp khách
      ['chair', 12.24, 0.75, '#3b2a20'], ['desk', 11.3, 1.6, 2.6, 1.0, { lamp: 1, paper: 1, top: '#5a3720' }],
      ['table', 11.7, 4.2, 1.8, 4.0, 14, '#f1ece4'],
      ['chair', 12.24, 3.4, '#1f3a5c'],
      ['chair', 10.95, 4.5, '#1f3a5c'], ['chair', 10.95, 5.7, '#1f3a5c'], ['chair', 10.95, 6.9, '#1f3a5c'],
      ['chair', 13.55, 4.5, '#1f3a5c'], ['chair', 13.55, 5.7, '#1f3a5c'], ['chair', 13.55, 6.9, '#1f3a5c'],
      ['sofa', 9.4, 7.6, 0.9, 2.4, '#1f5c4a', 'x'], ['table', 10.5, 8.4, 0.8, 0.8, 8, '#ece6dc'],
      ['plant', 9.4, 0.5, 0.9], ['olive', 15.1, 9.5], ['lamp', 15.6, 3.4],
      // B3 Vận hành (nội bộ): 4 bàn — Trưởng phòng, CSKH, hành chính · kế toán, quảng cáo; tủ hồ sơ, máy chủ
      ['desk', 17.0, 1.2, 2.4, 0.9, { mons: [0.4, 1.4], tint: '#5fcf9a' }], ['chair', 17.84, 2.25],
      ['desk', 20.4, 1.2, 2.4, 0.9, { mons: [0.7], paper: 1 }], ['chair', 21.24, 2.25],
      ['desk', 17.0, 4.6, 2.4, 0.9, { mons: [0.7], paper: 1, lamp: 1 }], ['chair', 17.84, 5.65],
      ['desk', 20.4, 4.6, 2.4, 0.9, { mons: [0.4, 1.4], tint: '#f0a074' }], ['chair', 21.24, 5.65],
      ['cabinet', 24.4, 3.0, 0.6, 1.4, 32, '#4a2e1b'], ['plant', 24.4, 4.8, 0.8],
      ['table', 17.2, 8.2, 1.6, 1.0, 12, '#e9e2d6'], ['chair', 16.95, 9.35], ['chair', 18.0, 9.35],
      ['server', 22.9, 9.0], ['server', 23.9, 9.0],
      // W2 Phong thủy: bàn tra cứu, la bàn trên bệ, bàn trà, tủ
      ['desk', 0.6, 13.3, 2.4, 0.9, { mons: [0.8], tint: '#e6c27a', lamp: 1, top: '#4a2e1b' }], ['chair', 1.44, 14.35, '#7a4a2a'],
      ['laBan', 4.4, 13.4],
      ['table', 3.2, 16.8, 1.4, 1.4, 10, '#5a3720'], ['chair', 2.4, 17.15, '#7a4a2a'], ['chair', 4.75, 17.15, '#7a4a2a'],
      ['cabinet', 0.4, 18.4, 2.2, 0.6, 22, '#4a2e1b'], ['plant', 6.2, 13.0, 0.8], ['lamp', 0.6, 16.4],
      // W1 Dự toán: bàn hai màn hình, bàn trao đổi, tủ hồ sơ
      ['desk', 0.6, 20.5, 2.8, 0.9, { mons: [0.4, 1.4], tint: '#6fb8e0' }], ['chair', 1.64, 21.55],
      ['table', 3.6, 23.4, 1.6, 1.0, 12, '#e9e2d6'], ['chair', 3.7, 24.55], ['chair', 4.5, 24.55], ['chair', 4.04, 22.55],
      ['cabinet', 0.4, 25.9, 2.2, 0.6, 18, '#d9d5cc'], ['plant', 6.2, 20.2, 0.8], ['lamp', 6.6, 26.4],
      // C1 Sân trong — một vườn liền: ghế cong trên 2 sàn gỗ tròn, tiểu cảnh đá, cây xanh, bụi cây, đèn vườn
      ['gheCong', 13.2, 15.9, 1.5, -80, 80], ['gheCong', 12.2, 23.6, 1.65, 100, 260],
      ['da', 15.3, 13.5, 0.55], ['da', 15.75, 14.45, 0.35], ['da', 9.8, 13.3, 0.45], ['da', 15.3, 18.7, 0.6], ['da', 15.7, 19.7, 0.35],
      ['da', 9.7, 20.6, 0.5], ['da', 10.15, 21.35, 0.3], ['da', 15.4, 25.9, 0.5], ['da', 10.0, 26.1, 0.45],
      ['cayVuon', 9.7, 18.4, 1.2], ['cayVuon', 15.5, 21.6, 1.1], ['cayVuon', 15.4, 17.0, 0.9], ['cayVuon', 9.8, 24.6, 1.0], ['cayVuon', 14.0, 13.3, 0.9],
      ['bui', 9.75, 15.1, 1], ['bui', 9.6, 16.6, 1], ['bui', 15.6, 15.8, 1], ['bui', 13.9, 18.4, 1], ['bui', 15.7, 23.6, 1],
      ['bui', 11.4, 26.4, 1], ['bui', 9.6, 22.6, 1], ['bui', 9.6, 19.5, 1], ['bui', 15.8, 24.6, 1],
      ['denVuon', 10.87, 13.58], ['denVuon', 9.83, 18.9], ['denVuon', 14.13, 20.39], ['denVuon', 14.61, 26.3],
      // E2 Nội thất: bàn designer, kệ mẫu vật liệu, bàn mẫu, góc sofa
      ['desk', 22.4, 13.3, 2.4, 0.9, { mons: [0.6], tint: '#c99bea' }], ['chair', 23.24, 14.35, '#5d3f78'],
      ['mauVL', 18.6, 13.2, 2.8], ['table', 19.2, 15.8, 2.2, 1.2, 13, '#ece6dc'],
      ['sofa', 22.6, 17.6, 2.2, 0.9, '#8a5232', 'y'], ['lamp', 24.7, 16.4], ['plant', 18.4, 18.9, 0.8],
      // E1 Không gian Nhà · Quản lý thi công: mô hình nhà, bàn theo dõi mốc, bàn trao đổi, sofa
      ['maquette', 18.8, 20.4],
      ['desk', 22.2, 20.5, 2.6, 0.9, { mons: [0.4, 1.5], tint: '#7fd18b' }], ['chair', 23.14, 21.55],
      ['table', 21.4, 23.8, 1.8, 1.1, 12, '#ece6dc'], ['chair', 21.5, 25.05], ['chair', 22.4, 25.05],
      ['sofa', 24.3, 23.2, 0.9, 2.4, '#1f5c4a', 'x2'], ['plant', 18.4, 26.0, 0.8], ['lamp', 18.6, 24.9],
      // F1 Hồ sơ mẫu: kệ tường, bàn trưng bày, mô hình, bàn thủ thư, góc đọc
      ['table', 1.4, 30.0, 2.4, 1.2, 13, '#5a3720'], ['maquette', 4.6, 30.0],
      ['desk', 5.6, 33.6, 2.4, 0.9, { mons: [0.6], top: '#4a2e1b' }], ['chair', 6.44, 34.65],
      ['sofa', 1.0, 33.4, 2.2, 0.9, '#8a5232', 'y'], ['table', 1.4, 34.6, 1.4, 0.6, 8, '#ece6dc'], ['lamp', 3.8, 35.4],
      // F2 Sảnh: quầy lễ tân MyMy có logo, hai cây ô liu ở cửa, đèn
      ['quay', 10.9, 30.4, 3.4, 0.9], ['olive', 9.4, 34.8], ['olive', 15.0, 34.8], ['lamp', 9.6, 30.2], ['lamp', 15.7, 30.2],
      // F3 Khu chờ · cà phê · Cộng tác viên: quầy cà phê, 2 góc sofa chờ, bàn CTV (bỏ khối lõi thang theo Nam 08/11/2026 — chỗ X2 vẫn để dành)
      ['khoi', 17.0, 34.8, 2.4, 0.85, 15, '#4a2e1b'], ['espresso', 17.3, 34.95], ['espresso', 18.2, 34.95],
      ['sofa', 18.2, 30.0, 2.6, 0.9, '#1f5c4a', 'y'], ['table', 18.6, 31.3, 1.8, 0.7, 8, '#ece6dc'],
      ['chair', 18.7, 32.4, '#8a5232'], ['chair', 19.7, 32.4, '#8a5232'],
      ['desk', 22.6, 29.4, 2.4, 0.9, { mons: [0.6], tint: '#f0a074' }], ['chair', 23.44, 30.45],
      ['plant', 21.4, 29.1, 0.8], ['plant', 21.6, 35.2, 0.8],
      ['sofa', 24.2, 32.6, 0.9, 2.4, '#1f5c4a', 'x2'], ['table', 22.9, 33.3, 0.9, 0.8, 8, '#ece6dc'], ['plant', 22.7, 35.2, 0.8]
    ],

    /* Người (chỗ ngồi/đứng mặc định) — x, y, phòng. */
    nguoi: {
      N: [12.6, 1.1, 'gd'], CEO: [15.4, 1.3, 'gd'],
      TP: [18.2, 2.6, 'kd'], L: [21.6, 2.6, 'kd'], ML: [18.2, 6.0, 'kd'], ADS: [21.6, 6.0, 'kd'],
      KTV: [1.55, 2.45, 'tk'], KS: [4.45, 2.45, 'tk'], DN: [7.35, 2.45, 'tk'],
      PT: [1.8, 14.7, 'pt'], DT: [2.0, 21.9, 'dt'],
      DS: [23.6, 14.7, 'nt'], NTA: [20.3, 17.5, 'nt'], QL: [23.5, 21.9, 'kgn'],
      DB: [6.8, 35.0, 'kho'], MM: [12.6, 29.85, 'sanh'],
      BAN: [12.6, 34.4, 'sanh'], KH: [12.6, 37.6, 'sanh']
    },
    /* Chỗ "Bạn" đứng khi vào phòng. */
    cua: {
      gd: [12.6, 9.4], tiep: [12.6, 9.4], ceo: [12.6, 9.4], tk: [7.2, 10.2], kd: [18.0, 10.2],
      pt: [6.4, 16.2], dt: [6.4, 23.4], nt: [18.8, 16.2], kgn: [18.8, 23.4],
      kho: [7.4, 31.6], sanh: [12.6, 32.4], tt: [17.6, 32.6]
    },
    diem: {
      vao: [12.6, 37.6], ra: [12.6, 37.8], tu_van: [14.4, 8.8], tp_ghe: [14.6, 9.6],
      ca_phe: [18.2, 34.3], cho_khach: [21.1, 32.6], khach_dung: [12.6, 32.4], ghe_vuon: [12.6, 23.6]
    },
    /* Bàn của đối tác chuyên môn thật (nhanSuVanPhong): 3 bàn vẽ Xưởng + 1 bàn designer. */
    ghe: [
      { id: 'KTV', ban: [1.55, 1.45] }, { id: 'KS', ban: [4.45, 1.45] }, { id: 'DN', ban: [7.35, 1.45] },
      { id: 'DS', ban: [23.6, 13.75], designer: 1 }
    ]
  };

  /* Vùng chặn lối đi của từng món (m): [x, y, rộng, sâu] hoặc null (đi qua được, như ghế, đèn). */
  MB.chan = function (t, a) {
    switch (t) {
      case 'desk': case 'sofa': case 'table': case 'counter': case 'cabinet': case 'drafting':
      case 'sheet': case 'khoi': case 'quay': case 'loi': return [a[0], a[1], a[2], a[3]];
      case 'plant': { const s = a[2] || 1; return [a[0], a[1], 0.6 * s, 0.6 * s]; }
      case 'olive': return [a[0], a[1], 0.8, 0.8];
      case 'server': return [a[0], a[1], 0.9, 0.7];
      case 'maquette': return [a[0], a[1], 2.2, 1.4];
      case 'laBan': return [a[0], a[1], 0.9, 0.9];
      case 'mauVL': return [a[0], a[1], a[2], 0.45];
      case 'ho': return [a[0], a[1], a[2] - a[0], a[3] - a[1]];
      case 'da': return [a[0] - a[2], a[1] - a[2], 2 * a[2], 2 * a[2]];
      case 'cayVuon': return [a[0] - 0.25, a[1] - 0.25, 0.5, 0.5];
      case 'bui': { const r = 0.3 * (a[2] || 1); return [a[0] - r, a[1] - r, 2 * r, 2 * r]; }
      default: return null;
    }
  };
  /* Vùng chiếm chỗ (để kiểm chồng lên nhau, kể cả ghế). */
  MB.cho = function (t, a) {
    if (t === 'chair') return [a[0], a[1], 0.72, 0.72];
    return MB.chan(t, a);
  };
  /* Đường cong Catmull-Rom qua các điểm (lối sỏi sân trong) — dùng chung 2D, 3D, bài kiểm. */
  MB.duongCong = function (P, n) {
    const o = [], p = i => P[Math.max(0, Math.min(P.length - 1, i))];
    for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < n; k++) {
      const t = k / n, a = p(i - 1), b = p(i), c = p(i + 1), d = p(i + 2), t2 = t * t, t3 = t2 * t;
      o.push([0, 1].map(j => 0.5 * (2 * b[j] + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t3)));
    }
    o.push(P[P.length - 1].slice()); return o;
  };
  /* Các đoạn kính 0,9 m của một vách (bỏ đoạn rơi vào cửa). */
  MB.doanKinh = function (v) {
    const [, , a0, a1, gaps] = v, S = MB.buoc_kinh, out = [];
    for (let a = a0; a < a1 - 1e-6; a = Math.round((a + S) * 100) / 100) {
      const b = Math.min(a1, Math.round((a + S) * 100) / 100), m = (a + b) / 2;
      if (gaps && gaps.some(([g0, g1]) => m > g0 && m < g1)) continue;
      out.push([a, b]);
    }
    return out;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MB;
  if (goc) goc.ALN_MB = MB;
})(typeof window !== 'undefined' ? window : null);
