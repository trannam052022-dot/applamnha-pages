/* ═══════════════════════════════════════════════════════════════
   MyMy nhắc theo ngữ cảnh — noi-that-khoang-gia.html (04/10/2026)

   Nam chốt 04/10/2026: MyMy KHÔNG tự mở khung chat. Chỉ hiện 1 bóng nhắc
   nhỏ cạnh nút MyMy, câu soạn sẵn (không gọi AI), ở 6 lúc:
     kich_thuoc  dừng lâu ở ô kích thước/diện tích phòng
     phong_cach  đã xem khoảng giá, một lúc sau chưa xuống mục phong cách
     bo_qua      bỏ qua từ 2 phòng trở lên ở lượt chọn phong cách
     otp         nhập sai mã OTP 2 lần, hoặc gửi mã xong một lúc chưa nhập
     roi_trang   sắp rời trang khi chưa để lại SĐT (máy tính: chuột ra khỏi
                 mép trên cửa sổ; điện thoại: vuốt kéo ngược lên thật nhanh) —
                 1 lần mỗi phiên
     quay_lai    khách quay lại trang (phiên mới): nhắc bước làm dở lần trước
   Mỗi lần nhắc cách nhau ≥ 60 giây, tối đa 3 lần mỗi phiên (sessionStorage);
   nút "Không cần" tắt nhắc tới hết phiên. Mỗi lý do nhắc tối đa 1 lần/phiên.
   Thời gian: bảng CAU_HINH ngay dưới (04/10/2026 (2): a 20 giây, b 15, d 45, tự ẩn 45).
   Bóng không che nút chính (KHONG_CHE) và thanh cookie. Bóng tự ẩn mà khách bấm nút
   MyMy → mở bằng câu mở đầu của lời nhắc đó (GA4 mymy_nhac_bam qua_nut=1).
   Bấm bóng nhắc → mở MyMy, câu mở đầu đúng chỗ khách vướng; các câu hỏi sau
   đó gửi kèm ngữ cảnh (lý do, bước, phòng, khoảng giá, mức, phong cách —
   KHÔNG có SĐT/họ tên/mã OTP) cho alnChat (functions/lib/mymyPrompt.js
   khoiNoiThat). GA4: mymy_nhac_hien / mymy_nhac_bam {ly_do}.

   Quy tắc lưu số của MyMy giữ nguyên (widget: chưa bấm đồng ý thì chưa lưu).
   Bóng chat mời chung (mymy-moi.js) tắt trên trang này: khongMoiChung.
   Trang cung cấp window.alnNoiThatTrangThai() + sự kiện 'aln:nt'.
   Phải nạp TRƯỚC mymy-widget.js. Chữ vào trang chỉ qua textContent.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Cấu hình thời gian — sửa số ở đây (Nam chốt 04/10/2026: rút ngắn chờ) ──
     ?thu_nhac=1 (Founder/KTS thử): mọi thời gian chờ còn 5 giây, bỏ giới hạn số lần nhắc,
     một lý do nhắc lại được nhiều lần, không gửi GA4. Chạy được cả ở chế độ xem Founder. */
  var CAU_HINH = {
    giay_kich_thuoc: 20,        // (a) dừng ở ô diện tích/kích thước phòng
    giay_phong_cach: 15,        // (b) đã có khoảng giá mà chưa xuống mục phong cách
    giay_otp: 45,               // (d) gửi mã xong chưa nhập (SMS đôi khi tới chậm)
    cach_nhau_ms: 60000,        // khoảng cách tối thiểu giữa 2 lần nhắc
    tu_an_ms: 45000,            // bóng nhắc tự ẩn (người lớn tuổi đọc chậm)
    toi_da_phien: 3,            // số lần nhắc tối đa mỗi phiên
    tre_quay_lai_ms: 4000,      // (f) chờ sau khi vào trang
    o_trang_toi_thieu_ms: 10000 // (e) chưa ở trang đủ lâu thì không coi là "sắp rời"
  };
  var THU_NHAC = false;
  try { THU_NHAC = new URLSearchParams(location.search).get('thu_nhac') === '1'; } catch (e) { /* bỏ qua */ }
  if (THU_NHAC) {
    CAU_HINH.giay_kich_thuoc = 5; CAU_HINH.giay_phong_cach = 5; CAU_HINH.giay_otp = 5;
    CAU_HINH.cach_nhau_ms = 5000; CAU_HINH.toi_da_phien = 999;
    CAU_HINH.tre_quay_lai_ms = 5000; CAU_HINH.o_trang_toi_thieu_ms = 0;
  }
  var CACH_NHAU_MS = CAU_HINH.cach_nhau_ms;
  var TOI_DA_PHIEN = CAU_HINH.toi_da_phien;
  var GIAY_KICH_THUOC = CAU_HINH.giay_kich_thuoc;
  var GIAY_PHONG_CACH = CAU_HINH.giay_phong_cach;
  var GIAY_OTP = CAU_HINH.giay_otp;
  var TRE_QUAY_LAI_MS = CAU_HINH.tre_quay_lai_ms;
  var TU_AN_MS = CAU_HINH.tu_an_ms;
  var O_TRANG_TOI_THIEU_MS = CAU_HINH.o_trang_toi_thieu_ms;
  // Nút chính bóng nhắc không được che (đè thì dời lên/xuống). Thanh cookie cũng vậy.
  var KHONG_CHE = ['#btn-tinh', '#g-btn', '#g-xn', '#g-gui-lai', '#g-doi', '#nut-luu', '#alnCk'];
  var KEY_NHAC = 'aln_nt_nhac';     // sessionStorage {dem, cuoi, tat, da:[ly_do]}
  var KEY_PHIEN = 'aln_nt_phien';   // sessionStorage — có rồi = không phải lượt quay lại
  var KEY_BUOC = 'aln_nt_buoc';     // localStorage {buoc, luc} — bước làm dở lần trước
  var HAN_BUOC_MS = 30 * 86400000;

  var CAU = {
    kich_thuoc: 'Chưa rõ diện tích phòng? Em chỉ anh/chị cách ước nhanh ạ.',
    phong_cach: 'Có khoảng giá rồi ạ. Anh/chị chọn thử phong cách bên dưới, hoặc hỏi em khoản nào chưa rõ nhé.',
    bo_qua: 'Chưa ưng phong cách nào cũng không sao ạ. Anh/chị kể em nghe gu nhà mình nhé?',
    otp: 'Chưa nhận được mã xác nhận? Em chỉ anh/chị cách lấy lại mã ạ.',
    otp_sai: 'Mã chưa khớp ạ? Em chỉ anh/chị cách kiểm tra và lấy mã mới nhé.',
    roi_trang: 'Anh/chị còn băn khoăn gì về khoảng giá này không ạ? Em giải thích ngay.',
    roi_trang_chua_tinh: 'Anh/chị cần em hướng dẫn ước chi phí nội thất không ạ?',
    quay_lai: 'Mừng anh/chị ghé lại ạ! Lần trước anh/chị đang {buoc}, mình làm tiếp nhé?',
  };
  var MO_DAU = {
    kich_thuoc: 'Dạ, diện tích phòng = chiều ngang × chiều dài (mét). Chưa đo được thì anh/chị cứ giữ số có sẵn, đó là cỡ phòng thường gặp của nhà phố. Anh/chị có bản vẽ thì để dành, sau khi mở bảng từng món sẽ có nút tải bản vẽ lên để trang đọc kích thước giúp. Anh/chị đang vướng ở phòng nào ạ?',
    phong_cach: 'Dạ, khoảng giá ở trên là tham khảo theo 3 mức Cơ bản, Khá, Cao cấp. Ngay dưới có mục chọn phong cách: anh/chị bấm ảnh ưng nhất cho từng phòng để KTS hiểu gu nhà mình. Anh/chị muốn em giải thích khoản nào ạ?',
    bo_qua: 'Dạ, bỏ qua vài phòng không sao ạ. Anh/chị thích nhà sáng hay ấm, gỗ hay đá, đơn giản hay cầu kỳ? Em gợi ý phong cách gần nhất cho anh/chị nhé.',
    otp: 'Dạ, mã xác nhận gồm 6 số, gửi bằng tin nhắn SMS tới số anh/chị vừa nhập, đôi khi tới chậm 1–2 phút. Anh/chị kiểm tra lại số (nút "Đổi số điện thoại"), chờ hết đếm ngược rồi bấm "Gửi lại mã". Anh/chị đừng gửi mã này cho ai, kể cả em ạ.',
    roi_trang: 'Dạ, em là MyMy của ALN. Anh/chị còn băn khoăn gì về khoảng giá nội thất, em giải thích ngay ạ.',
    quay_lai: 'Dạ, mừng anh/chị ghé lại. Lần trước anh/chị đang {buoc}. Nếu trang không còn lựa chọn cũ, anh/chị nhập lại phòng rồi bấm "Xem khoảng chi phí" nhé. Anh/chị cần em giúp gì ạ?',
  };
  var TEN_BUOC = {
    nhap_phong: 'nhập phòng',
    xem_khoang_gia: 'xem khoảng giá',
    chon_phong_cach: 'chọn phong cách',
    de_lai_so: 'chuẩn bị mở bảng từng món',
    otp: 'nhập mã xác nhận',
  };

  var $ = function (id) { return document.getElementById(id); };
  function ssDoc(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function ssGhi(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
  function ga(ten, lyDo, them) {
    if (THU_NHAC) return; // chế độ thử không làm bẩn số GA4
    try {
      var tham = { ly_do: lyDo };
      if (them) Object.keys(them).forEach(function (k) { tham[k] = them[k]; });
      if (typeof window.gtag === 'function') window.gtag('event', ten, tham);
    } catch (e) { /* bỏ qua */ }
  }
  function trangThai() {
    try { return (window.alnNoiThatTrangThai && window.alnNoiThatTrangThai()) || {}; } catch (e) { return {}; }
  }
  function chatDangMo() { var w = $('mymy-win'); return !!(w && w.classList.contains('open')); }

  // Trạng thái nhắc trong phiên — đọc lại sessionStorage mỗi lần (nhiều tab cùng phiên vẫn đúng).
  var nhoTrongBoNho = { dem: 0, cuoi: 0, tat: false, da: [] }; // dự phòng khi sessionStorage hỏng
  function docNhac() {
    var v = ssDoc(KEY_NHAC);
    if (!v || typeof v !== 'object') v = nhoTrongBoNho;
    return { dem: Number(v.dem) || 0, cuoi: Number(v.cuoi) || 0, tat: v.tat === true, da: Array.isArray(v.da) ? v.da : [] };
  }
  function ghiNhac(v) { nhoTrongBoNho = v; ssGhi(KEY_NHAC, v); }

  /* ── Bóng nhắc ── */
  var MM = null;        // API widget (có sau lần mở chat đầu)
  var choMo = null;     // việc chạy trong moDau khi mở chat lần đầu từ bóng nhắc
  var bong = null, bongLyDo = '', bongCau = '', henAn = null, henViTri = null;
  var lyDoBam = '';     // lý do của bóng nhắc khách đã bấm gần nhất (ngữ cảnh gửi AI)
  var henLai = {};      // hẹn thử lại khi đang trong thời gian chờ giữa 2 lần nhắc
  var nhacCho = null;   // bóng nhắc đã tự ẩn mà khách chưa bấm {lyDo, cau} — bấm nút MyMy thì mở đúng lời nhắc này

  // Lý do bị chặn: 'tat' | 'du' | 'da' | 'cho' (còn trong thời gian chờ) | 'ban' (đang bận) | '' (được nhắc)
  function chan(lyDo) {
    var n = docNhac();
    if (n.tat) return 'tat';
    if (n.dem >= TOI_DA_PHIEN) return 'du';
    if (!THU_NHAC && n.da.indexOf(lyDo) >= 0) return 'da';
    if (bong || chatDangMo() || !$('mymy-btn')) return 'ban';
    if (n.cuoi && Date.now() - n.cuoi < CACH_NHAU_MS) return 'cho';
    return '';
  }
  // kiem(): điều kiện còn đúng không (kiểm lại lúc hiện, kể cả khi thử lại sau thời gian chờ).
  function thuNhac(lyDo, cau, kiem, khongThuLai) {
    if (kiem && !kiem()) return;
    var c = chan(lyDo);
    if (c === 'cho' || c === 'ban') {
      if (khongThuLai || henLai[lyDo]) return;
      var n = docNhac();
      var doi = c === 'cho' ? Math.max(1000, CACH_NHAU_MS - (Date.now() - n.cuoi) + 500) : 5000;
      henLai[lyDo] = setTimeout(function () { henLai[lyDo] = null; thuNhac(lyDo, cau, kiem, khongThuLai); }, doi);
      return;
    }
    if (c) return;
    hien(lyDo, typeof cau === 'function' ? cau() : cau);
  }

  function hien(lyDo, cau) {
    var n = docNhac();
    n.dem += 1; n.cuoi = Date.now(); n.da.push(lyDo);
    ghiNhac(n);
    bongLyDo = lyDo; bongCau = cau;
    bong = document.createElement('div');
    bong.className = 'mm-nhac';
    bong.setAttribute('role', 'dialog');
    bong.setAttribute('aria-label', 'MyMy nhắc');
    bong.setAttribute('data-ly-do', lyDo);
    var chu = document.createElement('button');
    chu.type = 'button';
    chu.className = 'mm-nhac-chu';
    chu.textContent = cau;
    chu.addEventListener('click', function () { bam(lyDo, cau); });
    var tat = document.createElement('button');
    tat.type = 'button';
    tat.className = 'mm-nhac-tat';
    tat.textContent = 'Không cần';
    tat.addEventListener('click', function (e) {
      e.stopPropagation();
      var v = docNhac(); v.tat = true; ghiNhac(v);
      nhacCho = null;
      Object.keys(henLai).forEach(function (k) { clearTimeout(henLai[k]); henLai[k] = null; });
      bo();
    });
    bong.appendChild(chu);
    bong.appendChild(tat);
    document.body.appendChild(bong);
    datViTri();
    window.addEventListener('scroll', datViTri, { passive: true });
    window.addEventListener('resize', datViTri);
    henViTri = setInterval(datViTri, 1000);
    nhacCho = null;
    henAn = setTimeout(function () { nhacCho = { lyDo: lyDo, cau: cau }; bo(); }, TU_AN_MS);
    ga('mymy_nhac_hien', lyDo);
  }
  function bo() {
    if (bong) { bong.remove(); bong = null; }
    clearTimeout(henAn); clearInterval(henViTri);
    window.removeEventListener('scroll', datViTri);
    window.removeEventListener('resize', datViTri);
  }
  function datViTri() {
    if (!bong) return;
    var nut = $('mymy-btn');
    if (!nut || chatDangMo()) { bo(); return; }
    var n = nut.getBoundingClientRect();
    var hep = window.innerWidth < 600;
    bong.style.top = 'auto';
    if (hep) {
      // Điện thoại: đứng ngay trên nút MyMy, rộng gần hết màn hình — chữ không bị bóp hẹp.
      bong.style.right = '16px';
      bong.style.left = 'auto';
      bong.style.maxWidth = (window.innerWidth - 32) + 'px';
      bong.style.bottom = Math.max(8, window.innerHeight - n.top + 10) + 'px';
    } else {
      bong.style.right = Math.max(8, window.innerWidth - n.left + 12) + 'px';
      bong.style.left = 'auto';
      bong.style.maxWidth = '320px';
      bong.style.bottom = Math.max(8, window.innerHeight - n.bottom) + 'px';
    }
    // Không che chỗ khách đang làm (ô đang gõ, khung nhập mã OTP), nút chính, thanh cookie:
    // đè thì dời lên trên phần tử đó; không đủ chỗ thì xuống dưới; vẫn không được thì lên đầu màn hình.
    neTranh();
  }
  function canTranh() {
    var ds = [oDangGo()];
    if (bongLyDo === 'otp') ds.push($('g-otp'));
    KHONG_CHE.forEach(function (sel) { ds.push(document.querySelector(sel)); });
    return ds;
  }
  function deBatKy(q, ds) {
    for (var i = 0; i < ds.length; i++) if (deLen(q, ds[i])) return ds[i];
    return null;
  }
  function neTranh() {
    var ds = canTranh();
    for (var lan = 0; lan < 8; lan++) {
      var q = bong.getBoundingClientRect();
      var el = deBatKy(q, ds);
      if (!el) return;
      var r = el.getBoundingClientRect();
      var cao = q.height;
      if (r.top - 8 - cao >= 8) {
        // Đủ chỗ phía trên phần tử bị đè.
        bong.style.top = 'auto';
        bong.style.bottom = (window.innerHeight - r.top + 8) + 'px';
      } else if (r.bottom + 8 + cao <= window.innerHeight - 8) {
        bong.style.bottom = 'auto';
        bong.style.top = (r.bottom + 8) + 'px';
      } else {
        bong.style.bottom = 'auto';
        bong.style.top = '64px'; // dưới thanh tiêu đề dính đầu trang
        return;
      }
    }
  }
  function oDangGo() {
    var a = document.activeElement;
    return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) ? a : null;
  }
  function deLen(q, el) {
    if (!el || el.hidden) return false;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    return q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top;
  }

  function moChat(fn) {
    if (MM) { MM.mo(); fn(MM); return; }
    choMo = fn;
    var nut = $('mymy-btn');
    if (nut) nut.click();
  }
  function viecMoDau(lyDo, cau) {
    var moDau = MO_DAU[lyDo].replace('{buoc}', TEN_BUOC[buocLanTruoc] || 'tính chi phí nội thất');
    return function (api) {
      api.boCho();
      api.ghiLichSu('assistant', cau);
      api.bot(moDau);
      api.ghiLichSu('assistant', moDau);
      api.hienTuDau();
    };
  }
  function bam(lyDo, cau) {
    ga('mymy_nhac_bam', lyDo);
    lyDoBam = lyDo;
    nhacCho = null;
    bo();
    moChat(viecMoDau(lyDo, cau));
  }
  // Bóng nhắc đã tự ẩn (hoặc đang hiện) mà khách bấm nút MyMy (thường gặp với người đọc chậm): mở chat bằng
  // câu mở đầu của lời nhắc gần nhất kèm ngữ cảnh, thay cho lời chào chung. Chạy ở pha capture,
  // TRƯỚC khi widget mở khung chat.
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest('#mymy-btn')) return;
    if (chatDangMo()) return;
    // Bóng đang hiện mà khách bấm nút tròn thay vì bấm bóng: coi như bấm bóng.
    var x = bong ? { lyDo: bongLyDo, cau: bongCau } : nhacCho;
    if (!x) return;
    nhacCho = null;
    bo();
    ga('mymy_nhac_bam', x.lyDo, { qua_nut: 1 });
    lyDoBam = x.lyDo;
    var fn = viecMoDau(x.lyDo, x.cau);
    if (MM) setTimeout(function () { fn(MM); }, 0); // widget mở lại khung chat cũ, rồi mình thêm câu mở đầu
    else choMo = fn;                                  // lần mở đầu: moDau của widget sẽ gọi
  }, true);

  window.ALN_MYMY_TRANG = {
    khongMoiChung: true, // chỉ nhắc theo ngữ cảnh ở trên, tắt bóng chat mời chung (mymy-moi.js)
    xinSdtCoDinh: true,  // giữ câu xin SĐT cố định sau 3 lượt của widget như trước
    moDau: function (api) {
      MM = api;
      if (choMo) { var f = choMo; choMo = null; f(api); return; }
      return false; // khách tự mở chat: chào như mặc định (hỏi xưng hô)
    },
    xuLyTin: function (text, api) { MM = api; return false; },
    // Chỉ gửi ngữ cảnh khi khách đã bấm một bóng nhắc trong lượt xem này.
    nguCanh: function () {
      if (!lyDoBam) return null;
      var t = trangThai();
      return {
        trang: 'noi-that', ly_do: lyDoBam, buoc: t.buoc || '',
        phong: Array.isArray(t.phong) ? t.phong.slice(0, 10) : [],
        khoang: t.khoang || '', muc: t.muc || '', phong_cach: t.phong_cach || '',
      };
    },
  };

  (function () {
    var st = document.createElement('style');
    st.textContent = '.mm-nhac{position:fixed;z-index:79;box-sizing:border-box;background:#fff;color:#1a2634;' +
      'border:1.5px solid rgba(152,105,10,.45);border-radius:14px;padding:10px 12px;' +
      'box-shadow:0 10px 28px rgba(10,18,36,.16);font:500 16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}' +
      '.mm-nhac-chu{display:block;width:100%;text-align:left;background:none;border:none;padding:2px 0 8px;margin:0;color:inherit;font:inherit;cursor:pointer}' +
      '.mm-nhac-chu:hover{color:#98690a}' +
      '.mm-nhac-tat{display:inline-block;min-height:44px;padding:6px 14px;border:1px solid #cfd8e3;border-radius:10px;background:#f6f8fb;color:#3d4b5c;font-weight:600;font-size:14px;line-height:1.2;font-family:inherit;cursor:pointer}' +
      '.mm-nhac-tat:hover{background:#eef2f6}' +
      '@media(prefers-reduced-motion:no-preference){.mm-nhac{animation:mmNhacVao .25s ease-out}}' +
      '@keyframes mmNhacVao{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}';
    document.head.appendChild(st);
  })();

  /* ── Bước làm dở (cho lần quay lại) ── */
  var daTuongTac = false;
  var buocLanTruoc = '';
  function ghiBuoc() {
    var t = trangThai();
    try {
      if (!t.buoc || t.buoc === 'bang_tung_mon' || t.da_de_lai_so) { localStorage.removeItem(KEY_BUOC); return; }
      if (t.buoc === 'nhap_phong' && !daTuongTac) return;
      localStorage.setItem(KEY_BUOC, JSON.stringify({ buoc: t.buoc, luc: Date.now() }));
    } catch (e) { /* bỏ qua */ }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) ghiBuoc(); });
  window.addEventListener('pagehide', ghiBuoc);

  /* (a) Dừng lâu ở ô kích thước/diện tích phòng */
  var henKichThuoc = null;
  function laOKichThuoc(el) {
    return !!(el && el.matches && el.matches('#rooms input, .kt input[data-kt]'));
  }
  function henLaiKichThuoc(el) {
    clearTimeout(henKichThuoc);
    henKichThuoc = setTimeout(function () {
      thuNhac('kich_thuoc', CAU.kich_thuoc, function () { return document.activeElement === el; }, true);
    }, GIAY_KICH_THUOC * 1000);
  }
  document.addEventListener('focusin', function (e) {
    if (!laOKichThuoc(e.target)) return;
    daTuongTac = true;
    henLaiKichThuoc(e.target);
  });
  document.addEventListener('input', function (e) { if (laOKichThuoc(e.target)) { daTuongTac = true; henLaiKichThuoc(e.target); } });
  document.addEventListener('focusout', function (e) { if (laOKichThuoc(e.target)) clearTimeout(henKichThuoc); });

  /* (b) Đã xem khoảng giá, một lúc sau chưa xuống mục phong cách */
  var daThayPhongCach = false;
  var henPhongCach = null;
  function kiemThayPhongCach() {
    var el = $('phong-cach');
    if (!el || el.hidden) return;
    var r = el.getBoundingClientRect();
    if (r.height && r.top < window.innerHeight * 0.85) daThayPhongCach = true;
  }
  window.addEventListener('scroll', kiemThayPhongCach, { passive: true });

  /* (d) OTP */
  var soLanSaiOtp = 0, henOtp = null;
  function dangChoOtp() { return trangThai().buoc === 'otp'; }

  document.addEventListener('aln:nt', function (e) {
    var d = (e && e.detail) || {};
    if (d.loai === 'ket_qua') {
      daTuongTac = true;
      clearTimeout(henPhongCach);
      setTimeout(kiemThayPhongCach, 1500); // sau khi trang tự cuộn tới kết quả
      henPhongCach = setTimeout(function () {
        kiemThayPhongCach();
        thuNhac('phong_cach', CAU.phong_cach, function () {
          var t = trangThai();
          return !daThayPhongCach && t.co_phong_cach && (t.buoc === 'xem_khoang_gia');
        });
      }, GIAY_PHONG_CACH * 1000);
    } else if (d.loai === 'bo_qua') {
      if (Number(d.so) >= 2) setTimeout(function () { thuNhac('bo_qua', CAU.bo_qua); }, 800);
    } else if (d.loai === 'otp_gui') {
      clearTimeout(henOtp);
      henOtp = setTimeout(function () {
        thuNhac('otp', CAU.otp, function () { var o = $('g-ma'); return dangChoOtp() && !!o && !o.value; });
      }, GIAY_OTP * 1000);
    } else if (d.loai === 'otp_sai') {
      soLanSaiOtp += 1;
      if (soLanSaiOtp >= 2) thuNhac('otp', CAU.otp_sai, dangChoOtp);
    } else if (d.loai === 'otp_xong' || d.loai === 'lead') {
      clearTimeout(henOtp);
    }
    ghiBuoc();
  });

  /* (e) Sắp rời trang khi chưa để lại SĐT — 1 lần/phiên */
  var vaoTrangLuc = Date.now();
  function nhacRoiTrang() {
    if (Date.now() - vaoTrangLuc < O_TRANG_TOI_THIEU_MS) return;
    var t = trangThai();
    if (t.da_de_lai_so) return;
    thuNhac('roi_trang', t.buoc && t.buoc !== 'nhap_phong' ? CAU.roi_trang : CAU.roi_trang_chua_tinh, null, true);
  }
  // Máy tính: chuột ra khỏi mép trên cửa sổ (về phía thanh tab / nút đóng).
  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget && !e.toElement && e.clientY <= 0) nhacRoiTrang();
  });
  // Điện thoại: vuốt kéo ngược lên thật nhanh (thường để bấm thanh địa chỉ/quay lại).
  // Chỉ tính cuộn có ngón tay vừa vuốt — trang tự cuộn (scrollIntoView sau khi bấm) không tính.
  var vuotLuc = 0, mauCuon = [];
  document.addEventListener('touchmove', function () { vuotLuc = Date.now(); }, { passive: true });
  window.addEventListener('scroll', function () {
    var bay = Date.now();
    mauCuon.push({ y: window.scrollY, t: bay });
    while (mauCuon.length && bay - mauCuon[0].t > 500) mauCuon.shift();
    if (bay - vuotLuc > 1500) return;
    var cao = 0;
    for (var i = 0; i < mauCuon.length; i++) cao = Math.max(cao, mauCuon[i].y);
    if (cao - window.scrollY >= Math.max(500, window.innerHeight * 0.8)) { mauCuon = []; nhacRoiTrang(); }
  }, { passive: true });

  /* (f) Khách quay lại trang (phiên mới): nhắc bước làm dở lần trước */
  (function () {
    var phienCu = false;
    try { phienCu = !!sessionStorage.getItem(KEY_PHIEN); sessionStorage.setItem(KEY_PHIEN, '1'); } catch (e) { phienCu = true; }
    if (phienCu) return;
    var cu = null;
    try { cu = JSON.parse(localStorage.getItem(KEY_BUOC) || 'null'); } catch (e) { /* bỏ qua */ }
    if (!cu || !TEN_BUOC[cu.buoc] || !(Date.now() - Number(cu.luc) < HAN_BUOC_MS)) return;
    buocLanTruoc = cu.buoc;
    setTimeout(function () {
      thuNhac('quay_lai', CAU.quay_lai.replace('{buoc}', TEN_BUOC[cu.buoc]), function () {
        return !trangThai().da_de_lai_so;
      });
    }, TRE_QUAY_LAI_MS);
  })();
})();
