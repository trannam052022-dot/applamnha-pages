/* Shared only by Dự toán / OTP / Không gian Nhà. No contact data in URLs. */
(function () {
  'use strict';
  var KEY = 'aln_estimate_attribution_v1';
  var TTL = 7 * 864e5;
  var memory = {};
  function allowed(key) { return /^(fbclid|test_event_code)$/.test(key) || /^utm_[a-z0-9_]+$/i.test(key); }
  function read() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && Date.now() - saved.ts < TTL) return saved.params;
    } catch (e) {}
    return memory;
  }
  function params() {
    var result = Object.assign({}, read());
    try {
      var old = JSON.parse(localStorage.getItem('aln_utm') || 'null');
      if (old && Date.now() - old.ts < TTL) Object.keys(old).forEach(function (key) {
        var name = key === 'fbclid' ? key : 'utm_' + key;
        if (key !== 'ts' && allowed(name) && result[name] === undefined) result[name] = old[key];
      });
    } catch (e) {}
    new URLSearchParams(location.search).forEach(function (value, key) {
      if (allowed(key)) result[key] = value;
    });
    memory = result;
    return result;
  }
  function preserve(target) {
    var url = new URL(target, location.href);
    if (url.origin !== location.origin) throw new Error('Funnel URL must be same-origin');
    var values = params();
    Object.keys(values).forEach(function (key) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, values[key]);
    });
    return url.pathname + url.search + url.hash;
  }
  function cookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    try { return m ? decodeURIComponent(m[1]) : ''; } catch (e) { return ''; }
  }
  function signals() {
    var p = params(), utm = {};
    Object.keys(p).forEach(function (key) { if (/^utm_/i.test(key)) utm[key.slice(4)] = p[key]; });
    // Current click wins over stale cookies/storage. Retain its original timestamp.
    var fbc = '', saved;
    try { saved = JSON.parse(localStorage.getItem('aln_fbc') || 'null'); } catch (e) {}
    if (p.fbclid) {
      var prior = cookie('_fbc') || (saved && saved.v) || '';
      fbc = prior.split('.').slice(3).join('.') === p.fbclid ? prior : 'fb.1.' + Date.now() + '.' + p.fbclid;
      try { localStorage.setItem('aln_fbc', JSON.stringify({ v: fbc, ts: Date.now() })); } catch (e) {}
    } else {
      fbc = cookie('_fbc') || (saved && Date.now() - saved.ts < 90 * 864e5 ? saved.v : '') || '';
    }
    // Compatibility fallback for campaign capture on other ALN landing pages.
    if (!Object.keys(utm).length) {
      try {
        var old = JSON.parse(localStorage.getItem('aln_utm') || 'null');
        if (old && Date.now() - old.ts < TTL) Object.keys(old).forEach(function (k) {
          if (k !== 'ts' && k !== 'fbclid') utm[k] = old[k];
        });
      } catch (e) {}
    }
    return { utm: utm, fbp: cookie('_fbp'), fbc: fbc, testEventCode: p.test_event_code || '' };
  }
  var captured = params();
  try { localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), params: captured })); } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href]').forEach(function (link) {
      var url = new URL(link.href, location.href);
      if (url.origin === location.origin && /^\/(du-toan-nha|dang-nhap-chu-nha|khong-gian-nha)\.html$/.test(url.pathname)) {
        link.href = preserve(link.href);
      }
    });
  });
  window.alnEstimateFunnel = { preserve: preserve, params: params, signals: signals };
})();
