/* aln-dt-su-kien.js — 7 sự kiện lớp A trang dự toán (spec "Đo hành vi ẩn danh
 * trang dự toán", 03/10/2026). Nạp SAU aln-bucket.js.
 *
 * Mỗi sự kiện bắn song song 2 nơi, cùng tên, cùng tham số:
 *   dataLayer.push({event, ...}) → GA4 qua GTM-MB7VRGR5 (thẻ wildcard aln_*)
 *   fbq('trackCustom', tên, {...}) → Pixel gọi cứng trong <head>. KHÔNG có tag
 *   Pixel nào trong GTM (kiến trúc đã khoá) nên không bị bắn trùng.
 * Không đụng Lead / aln_lead_submit / event_id.
 *
 * Quy tắc:
 *  - Không tham số nào chứa số thật hay PII — chỉ nhãn từ alnBucket().
 *  - ?internal=1 (scripts/aln-optout.js đặt window.ALN_INTERNAL): không bắn gì.
 *  - ?dn=1 (bản doanh nghiệp): không bắn gì — spec chỉ đo bản chủ nhà.
 *  - Mỗi sự kiện một lần mỗi lần tải trang; aln_dt_step một lần mỗi bước.
 *
 * API: window.alnDtSuKien.{batDau(trang), buoc(n, thamSo), ketQua(thamSo,
 *      phanCuoi), formStart(), b2b(), gioiHan()}. ES5.
 */
(function () {
  'use strict';
  var w = window;
  var daBan = {};
  var trang = '';
  var nguonVao = 'khac';
  var tatDo = false;

  try {
    tatDo = !!w.ALN_INTERNAL || /(^|[?&])dn=1(&|$)/.test(location.search.substring(1));
  } catch (e) { tatDo = true; }

  try {
    nguonVao = w.alnBucket ? w.alnBucket('nguon', { search: location.search, referrer: document.referrer }) : 'khac';
  } catch (e) { nguonVao = 'khac'; }

  function gui(ten, thamSo) {
    if (tatDo) return;
    var p = {};
    for (var k in thamSo) if (thamSo.hasOwnProperty(k) && thamSo[k] !== null && thamSo[k] !== undefined && thamSo[k] !== '') p[k] = thamSo[k];
    try {
      w.dataLayer = w.dataLayer || [];
      var d = { event: ten };
      for (var k2 in p) if (p.hasOwnProperty(k2)) d[k2] = p[k2];
      w.dataLayer.push(d);
    } catch (e) {}
    try { if (typeof w.fbq === 'function') w.fbq('trackCustom', ten, p); } catch (e) {}
  }

  function motLan(khoa, ten, thamSo) {
    if (daBan[khoa]) return false;
    daBan[khoa] = true;
    gui(ten, thamSo);
    return true;
  }

  // aln_dt_result_engaged: sau result_view, cuộn tới cuối bảng HOẶC ở lại ≥60 giây.
  function theoDoiEngaged(phanCuoi) {
    var xong = false;
    function ban(cach) {
      if (xong) return;
      xong = true;
      motLan('engaged', 'aln_dt_result_engaged', { cach: cach });
    }
    setTimeout(function () { ban('thoi_gian'); }, 60000);
    if (!phanCuoi) return;
    if ('IntersectionObserver' in w) {
      try {
        var io = new IntersectionObserver(function (ds) {
          for (var i = 0; i < ds.length; i++) {
            if (ds[i].isIntersecting) { io.disconnect(); ban('cuon'); return; }
          }
        }, { threshold: 0.6 });
        io.observe(phanCuoi);
        return;
      } catch (e) {}
    }
    w.addEventListener('scroll', function nghe() {
      var r = phanCuoi.getBoundingClientRect();
      if (r.top < (w.innerHeight || 0)) { w.removeEventListener('scroll', nghe); ban('cuon'); }
    }, { passive: true });
  }

  w.alnDtSuKien = {
    nguon: function () { return nguonVao; },
    tat: function () { return tatDo; },
    batDau: function (tenTrang) {
      trang = tenTrang;
      motLan('view', 'aln_dt_view', { nguon: nguonVao, trang: trang });
    },
    buoc: function (n, thamSo) {
      var p = { buoc: n };
      thamSo = thamSo || {};
      p.loai_lo = w.alnBucket('loai_lo', thamSo.loai_lo);
      if (thamSo.so_tang !== undefined) p.so_tang_khoang = w.alnBucket('so_tang', thamSo.so_tang);
      motLan('step_' + n, 'aln_dt_step', p);
    },
    // thamSo: số THẬT (dien_tich, so_tang, tong_tien) + slug tinh + loai_lo — quy
    // về khoảng ngay tại đây, không giá trị thật nào được gửi đi.
    ketQua: function (thamSo, phanCuoi) {
      thamSo = thamSo || {};
      var ok = motLan('result', 'aln_dt_result_view', {
        dien_tich_khoang: w.alnBucket('dien_tich', thamSo.dien_tich),
        so_tang_khoang: w.alnBucket('so_tang', thamSo.so_tang),
        tong_tien_khoang: w.alnBucket('tong_tien', thamSo.tong_tien),
        tinh: w.alnBucket('tinh', thamSo.tinh),
        loai_lo: w.alnBucket('loai_lo', thamSo.loai_lo)
      });
      if (ok) theoDoiEngaged(phanCuoi);
      return ok;
    },
    daCoKetQua: function () { return !!daBan.result; },
    formStart: function () { motLan('form_start', 'aln_form_start', { vi_tri: 'duoi_ket_qua' }); },
    b2b: function () { motLan('b2b', 'aln_dt_b2b_click', {}); },
    gioiHan: function () { motLan('limit', 'aln_dt_limit_hit', {}); }
  };
})();
