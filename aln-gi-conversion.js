/* ALN-GI First-Party Website Conversion Adapter V1
 * Canonical contract: growth-intelligence/operations/conversion/ALN_GI_FIRST_PARTY_CONVERSION_INSTRUMENTATION_V1.md
 * ES5-compatible. Disabled by default. No cookies/localStorage/sessionStorage. No PII.
 */
(function (root) {
  'use strict';

  var CHANNEL = 'ALN_WEBSITE';
  var TRANSPORT_EVENT = 'aln_gi_conversion';
  var ALLOWED_EVENTS = {
    asset_view: true,
    cta_click: true,
    inquiry_started: true,
    inquiry_submitted: true,
    consultation_requested: true
  };
  var ALLOWED_FIELDS = {
    event_id: true,
    event_name: true,
    event_timestamp: true,
    asset_id: true,
    source_cluster: true,
    channel: true,
    cta_id: true,
    page_path_or_asset_reference: true,
    session_reference: true,
    inquiry_flow_id: true,
    submission_reference: true,
    consultation_type: true,
    consent_state: true,
    provenance: true
  };
  var ASSET_CLUSTER = {
    'W01-A01': 'DC-02',
    'W01-A02': 'DC-02',
    'W01-A03': 'DC-01',
    'W01-A04': 'DC-01',
    'W01-A05': 'DC-03',
    'W01-A06': 'DC-05'
  };
  var seen = {};

  function fail(reason) { return { ok: false, reason: reason }; }
  function isNonEmptyString(v) { return typeof v === 'string' && v.replace(/^\s+|\s+$/g, '') !== ''; }
  function nowIso() { return new Date().toISOString(); }
  function eventId() {
    try {
      if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    } catch (e) {}
    return 'alngi-' + String(new Date().getTime()) + '-' + Math.random().toString(36).slice(2, 12);
  }
  function enabled() { return root.ALN_GI_CONVERSION_ENABLED === true && root.ALN_INTERNAL !== true; }

  function validateInputKeys(attrs) {
    var k;
    if (!attrs || typeof attrs !== 'object' || Object.prototype.toString.call(attrs) !== '[object Object]') return fail('INVALID_ATTRIBUTES');
    for (k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k) && !ALLOWED_FIELDS[k]) return fail('UNSUPPORTED_FIELD:' + k);
    }
    return { ok: true };
  }

  function requireString(payload, key) {
    if (!isNonEmptyString(payload[key])) return fail('MISSING_OR_INVALID:' + key);
    return { ok: true };
  }

  function validateEvent(payload) {
    var r;
    r = requireString(payload, 'event_id'); if (!r.ok) return r;
    r = requireString(payload, 'event_name'); if (!r.ok) return r;
    r = requireString(payload, 'event_timestamp'); if (!r.ok) return r;
    if (payload.channel !== CHANNEL) return fail('INVALID_CHANNEL');
    if (!ALLOWED_EVENTS[payload.event_name]) return fail('INVALID_EVENT_NAME');

    if (payload.asset_id !== undefined) {
      if (!ASSET_CLUSTER[payload.asset_id]) return fail('UNKNOWN_ASSET_ID');
      if (payload.source_cluster !== ASSET_CLUSTER[payload.asset_id]) return fail('ASSET_CLUSTER_MISMATCH');
    } else if (payload.source_cluster !== undefined) {
      return fail('SOURCE_CLUSTER_WITHOUT_ASSET');
    }

    if (payload.event_name === 'asset_view') {
      r = requireString(payload, 'asset_id'); if (!r.ok) return r;
    } else if (payload.event_name === 'cta_click') {
      r = requireString(payload, 'asset_id'); if (!r.ok) return r;
      r = requireString(payload, 'cta_id'); if (!r.ok) return r;
    } else if (payload.event_name === 'inquiry_started') {
      r = requireString(payload, 'inquiry_flow_id'); if (!r.ok) return r;
    } else if (payload.event_name === 'inquiry_submitted') {
      r = requireString(payload, 'inquiry_flow_id'); if (!r.ok) return r;
      r = requireString(payload, 'submission_reference'); if (!r.ok) return r;
      if (payload.provenance !== 'FIRST_PARTY_VOLUNTARY_SUBMISSION') return fail('INVALID_PROVENANCE');
    } else if (payload.event_name === 'consultation_requested') {
      r = requireString(payload, 'submission_reference'); if (!r.ok) return r;
      if (payload.provenance !== 'FIRST_PARTY_VOLUNTARY_REQUEST') return fail('INVALID_PROVENANCE');
    }
    return { ok: true };
  }

  function mirrorToGa4(payload) {
    var params = {}, k;
    if (typeof root.gtag !== 'function') return;
    for (k in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, k)) params['aln_gi_' + k] = payload[k];
    }
    try {
      root.gtag('event', TRANSPORT_EVENT, params);
    } catch (e) {}
  }

  function emit(name, attrs) {
    var keyCheck, payload, k, valid;
    if (!enabled()) return fail(root.ALN_INTERNAL === true ? 'INTERNAL_TRAFFIC_BLOCKED' : 'ADAPTER_DISABLED');
    if (!ALLOWED_EVENTS[name]) return fail('INVALID_EVENT_NAME');
    keyCheck = validateInputKeys(attrs || {}); if (!keyCheck.ok) return keyCheck;

    payload = {
      event_id: isNonEmptyString(attrs.event_id) ? attrs.event_id : eventId(),
      event_name: name,
      event_timestamp: isNonEmptyString(attrs.event_timestamp) ? attrs.event_timestamp : nowIso(),
      channel: CHANNEL
    };

    for (k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k) && k !== 'event_id' && k !== 'event_name' && k !== 'event_timestamp' && k !== 'channel') {
        if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== '') payload[k] = attrs[k];
      }
    }

    if (payload.asset_id) payload.source_cluster = ASSET_CLUSTER[payload.asset_id];
    valid = validateEvent(payload); if (!valid.ok) return valid;
    if (seen[payload.event_id]) return fail('DUPLICATE_EVENT_ID');
    seen[payload.event_id] = true;

    root.dataLayer = root.dataLayer || [];
    root.dataLayer.push({ event: TRANSPORT_EVENT, aln_gi_event: payload });
    mirrorToGa4(payload);
    return { ok: true, event: payload };
  }

  root.ALNGIConversion = {
    version: '1.0.2',
    channel: CHANNEL,
    enabled: enabled,
    emit: emit,
    assetView: function (assetId, pageRef) { return emit('asset_view', { asset_id: assetId, page_path_or_asset_reference: pageRef }); },
    ctaClick: function (assetId, ctaId) { return emit('cta_click', { asset_id: assetId, cta_id: ctaId }); },
    inquiryStarted: function (flowId, attrs) { attrs = attrs || {}; attrs.inquiry_flow_id = flowId; return emit('inquiry_started', attrs); },
    inquirySubmitted: function (flowId, submissionRef, attrs) { attrs = attrs || {}; attrs.inquiry_flow_id = flowId; attrs.submission_reference = submissionRef; attrs.provenance = 'FIRST_PARTY_VOLUNTARY_SUBMISSION'; return emit('inquiry_submitted', attrs); },
    consultationRequested: function (submissionRef, attrs) { attrs = attrs || {}; attrs.submission_reference = submissionRef; attrs.provenance = 'FIRST_PARTY_VOLUNTARY_REQUEST'; return emit('consultation_requested', attrs); }
  };
})(typeof window !== 'undefined' ? window : this);
