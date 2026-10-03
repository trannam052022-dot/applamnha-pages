/* aln-bucket.js — quy số thật về KHOẢNG cho đo hành vi ẩn danh trang dự toán
 * (spec "Đo hành vi ẩn danh trang dự toán", Nam chốt 03/10/2026).
 *
 * MỘT hàm dùng chung cho:
 *  - client (lớp A): du-toan-nha.html, du-toan/index.html — gửi GA4 + Pixel;
 *  - máy chủ (lớp B): functions/du-toan-nha-shared/aln-bucket.js (bản sao,
 *    scripts/sync-dutoan-nha-calc.js copy, CI check-dutoan-nha-calc-sync.js
 *    chặn lệch) — nhật ký du_toan_an_danh.
 * Hai nơi luôn ra cùng nhãn. Số thật không bao giờ rời khỏi hàm tính: chỉ nhãn
 * khoảng được gửi đi.
 *
 * QUY TẮC BIÊN (ghi rõ để không lẫn số cũ/mới): mốc thuộc khoảng TRÊN.
 *   100 m² → '100-200', 500 m² → '>500', 1 tỷ → '1-2ty', 5 tỷ → '>5ty'.
 *   Tầng: 1 → '1', 2–3 → '2-3', 4–5 → '4-5', từ 6 → '6+'.
 * ĐỔI NGƯỠNG: chỉ sửa ở file này, ghi ngày đổi vào NGUONG.phien_ban, chạy lại
 * scripts/sync-dutoan-nha-calc.js. Test: functions/_test_alnBucket.js.
 *
 * ES5 thuần (chạy ở <script> thường). Không có PII: hàm chỉ nhận số/slug.
 */
(function (goc) {
  'use strict';

  var NGUONG = {
    phien_ban: '2026-10-03',
    dien_tich: [[100, '<100'], [200, '100-200'], [300, '200-300'], [500, '300-500']], // ≥500 → '>500'
    tong_tien: [[1e9, '<1ty'], [2e9, '1-2ty'], [3e9, '2-3ty'], [5e9, '3-5ty']]        // ≥5 tỷ → '>5ty'
  };

  // 26 slug trang tỉnh cũ (data/tinh.json) → mã tỉnh sau sáp nhập 01/07/2025
  // (34 tỉnh/thành, xem CLAUDE.md mục ĐƠN VỊ HÀNH CHÍNH MỚI). Không gửi phường/xã.
  var TINH_MOI = {
    'tp-hcm': 'tp-hcm', 'binh-duong': 'tp-hcm', 'vung-tau': 'tp-hcm', 'ba-ria': 'tp-hcm',
    'dong-nai': 'dong-nai', 'bien-hoa': 'dong-nai', 'binh-phuoc': 'dong-nai',
    'tay-ninh': 'tay-ninh', 'long-an': 'tay-ninh',
    'can-tho': 'can-tho', 'soc-trang': 'can-tho', 'hau-giang': 'can-tho',
    'vinh-long': 'vinh-long', 'ben-tre': 'vinh-long', 'tra-vinh': 'vinh-long',
    'dong-thap': 'dong-thap', 'tien-giang': 'dong-thap',
    'ca-mau': 'ca-mau', 'bac-lieu': 'ca-mau',
    'an-giang': 'an-giang', 'kien-giang': 'an-giang',
    'lam-dong': 'lam-dong', 'dak-nong': 'lam-dong',
    'quang-ngai': 'quang-ngai', 'kon-tum': 'quang-ngai',
    'dak-lak': 'dak-lak', 'gia-lai': 'gia-lai'
  };

  var LOAI_LO = { kep_giua: 1, lo_goc: 1, chua_chon: 1 };
  var CHIEN_DICH_META = 'du-toan-t9-2026'; // utm_campaign của DT-T9-2026

  function soDuong(v) {
    var n = typeof v === 'number' ? v : Number(v);
    return (isFinite(n) && n > 0) ? n : null;
  }

  function theoNguong(v, bang, nhanTren) {
    var n = soDuong(v);
    if (n === null) return null;
    for (var i = 0; i < bang.length; i++) if (n < bang[i][0]) return bang[i][1];
    return nhanTren;
  }

  function soTang(v) {
    var n = soDuong(v);
    if (n === null) return null;
    n = Math.floor(n);
    if (n < 1) return null;
    if (n === 1) return '1';
    if (n <= 3) return '2-3';
    if (n <= 5) return '4-5';
    return '6+';
  }

  function tinh(slug) {
    if (typeof slug !== 'string' || !slug) return 'chua_chon';
    var s = slug.toLowerCase();
    return TINH_MOI.hasOwnProperty(s) ? TINH_MOI[s] : 'khac';
  }

  function loaiLo(v) {
    return (typeof v === 'string' && LOAI_LO.hasOwnProperty(v)) ? v : 'chua_chon';
  }

  function thamSo(search, ten) {
    var q = String(search || '').replace(/^\?/, '').split('&');
    for (var i = 0; i < q.length; i++) {
      var kv = q[i].split('=');
      if (kv[0] === ten) {
        try { return decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')).toLowerCase(); } catch (e) { return (kv[1] || '').toLowerCase(); }
      }
    }
    return '';
  }

  function hostCua(url) {
    var m = /^[a-z][a-z0-9+.-]*:\/\/([^\/?#:]+)/i.exec(String(url || ''));
    return m ? m[1].toLowerCase() : '';
  }

  // nguon: URL (search) + referrer lúc vào trang. Chỉ ra 5 nhãn cố định.
  // Referrer cùng site (applamnha.vn) → 'khac' (không biết nguồn gốc ban đầu).
  function nguon(vao) {
    vao = vao || {};
    var s = vao.search || '';
    var host = hostCua(vao.referrer);
    var src = thamSo(s, 'utm_source');
    if (thamSo(s, 'fbclid') || thamSo(s, 'utm_campaign') === CHIEN_DICH_META) return 'meta_ads';
    if (thamSo(s, 'gclid') || src === 'google' || /(^|\.)google\./.test(host)) return 'google';
    if (src === 'zalo' || /(^|\.)zalo\.(me|vn)$/.test(host) || /(^|\.)zaloapp\.com$/.test(host)) return 'zalo';
    if (!host && !src && !thamSo(s, 'utm_medium') && !thamSo(s, 'utm_campaign')) return 'truc_tiep';
    return 'khac';
  }

  function alnBucket(loai, giaTri) {
    switch (loai) {
      case 'dien_tich': return theoNguong(giaTri, NGUONG.dien_tich, '>500');
      case 'tong_tien': return theoNguong(giaTri, NGUONG.tong_tien, '>5ty');
      case 'so_tang': return soTang(giaTri);
      case 'tinh': return tinh(giaTri);
      case 'loai_lo': return loaiLo(giaTri);
      case 'nguon': return nguon(giaTri);
      default: return null;
    }
  }
  alnBucket.NGUONG = NGUONG;
  alnBucket.TINH_MOI = TINH_MOI;

  if (typeof module === 'object' && module.exports) module.exports = alnBucket;
  else goc.alnBucket = alnBucket;
})(typeof window !== 'undefined' ? window : this);
