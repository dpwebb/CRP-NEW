'use strict';
const { ServiceError } = require('./errors.cjs');
const profiles = require('./account-profile.cjs');
const documents = require('./account-documents.cjs');
const bureaus = require('./bureau-dispute-requirements.cjs');
const forms = require('./bureau-forms.cjs');
const FIELDS = new Set(['bureau', 'channel', 'purpose', 'document_ids', 'use_account_profile', 'identity_reference', 'no_ssn_issued', 'identity_shows_address', 'verification_requested', 'copies_confirmed', 'document_dates', 'other_identity_details']);
function normalize(input, country) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !FIELDS.has(key))) throw new ServiceError('INVALID_REQUEST');
  if (input.channel !== 'POSTAL') throw new ServiceError('PACKET_SUBMISSION_METHOD_REQUIRED');
  if (!['ACCOUNT', 'PUBLIC_RECORD', 'PERSONAL', 'NEW_ADDRESS'].includes(input.purpose)) throw new ServiceError('INVALID_REQUEST');
  const bureau = bureaus.normalizeBureau(input.bureau, country);
  if (input.channel === 'POSTAL' && bureaus.requirements(country, bureau, input)?.postal === null) throw new ServiceError('PACKET_SUBMISSION_METHOD_REQUIRED');
  if (!bureaus.requirements(country, bureau, input) || !Array.isArray(input.document_ids) || input.document_ids.length > 8 || new Set(input.document_ids).size !== input.document_ids.length || input.document_ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id))) throw new ServiceError('INVALID_REQUEST');
  for (const key of ['use_account_profile', 'no_ssn_issued', 'identity_shows_address', 'verification_requested', 'copies_confirmed']) if (typeof input[key] !== 'boolean') throw new ServiceError('INVALID_REQUEST');
  for (const key of ['identity_reference', 'other_identity_details']) if (input[key] != null && (typeof input[key] !== 'string' || input[key].length > 500 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(input[key]))) throw new ServiceError('INVALID_REQUEST');
  const dates = input.document_dates || {};
  if (typeof dates !== 'object' || Array.isArray(dates) || Object.keys(dates).some(id => !input.document_ids.includes(id) || typeof dates[id] !== 'string' || (dates[id] && (!/^\d{4}-\d{2}-\d{2}$/.test(dates[id]) || !Number.isFinite(Date.parse(dates[id])) || new Date(dates[id]).toISOString().slice(0, 10) !== dates[id])))) throw new ServiceError('INVALID_REQUEST');
  if (input.no_ssn_issued && String(input.identity_reference || '').trim()) throw new ServiceError('INVALID_REQUEST');
  return { ...input, bureau, document_ids: [...input.document_ids].sort(), identity_reference: (input.identity_reference || '').trim(), other_identity_details: (input.other_identity_details || '').trim(), document_dates: Object.fromEntries(Object.entries(dates).sort()) };
}
function snapshot(store, actor, country, settings, mixed) {
  if (!settings) return null;
  const profile = settings.use_account_profile ? profiles.getProfile(store, actor) : {};
  const requirements = bureaus.requirements(country, settings.bureau, settings);
  let selected, unavailable = false;
  try { selected = documents.materialDocuments(store, actor, settings.document_ids); }
  catch { selected = []; unavailable = true; }
  const missing = settings.use_account_profile ? bureaus.missing(requirements, profile, selected, settings) : ['Choose your saved account details for this bureau packet.'];
  if (settings.channel !== 'POSTAL') missing.push('Save the mail checklist before you approve this packet.');
  if (unavailable) missing.push('A selected document was changed or removed. Choose its current copy.');
  const form_assets = forms.materialForms(country, settings.bureau, settings.purpose);
  if (mixed && country === 'CA' && settings.bureau === 'EQUIFAX' && settings.purpose === 'ACCOUNT') {
    form_assets.push(...forms.materialForms(country, settings.bureau, 'PUBLIC_RECORD'));
  }
  return { settings, profile, documents: selected, requirements, form_assets, unavailable, missing };
}
function address(profile) {
  return ['address_line1', 'address_line2', 'city', 'region', 'postal_code', 'country'].map(field => profile[field]).filter(Boolean).join(', ');
}
function enrich(store, actor, country, packet, mixed) {
  if (!packet || !packet.support) return packet;
  const support = snapshot(store, actor, country, packet.support, mixed);
  const correspondence = { ...packet.correspondence };
  if (packet.support.use_account_profile) {
    correspondence.consumer_name = support.profile.full_name || '';
    correspondence.contact = [address(support.profile), support.profile.contact_email, support.profile.phone].filter(Boolean).join('\n');
  }
  return { ...packet, correspondence, support_snapshot: support };
}
function publicView(store, actor, country, bureau, packet) {
  const current = packet?.support_snapshot || null;
  return { settings: packet?.support || null, requirements: current?.requirements || bureaus.requirements(country, bureau),
    missing: current?.missing || [], catalog: bureaus.catalog(country), documents: documents.listDocuments(store, actor),
    account_profile: profiles.getProfile(store, actor), selected_document_ids: packet?.support?.document_ids || [] };
}
function lines(packet) {
  const support = packet?.support_snapshot;
  if (!support) return [];
  const { profile, requirements, settings, documents: selected } = support;
  const out = ['MAIL YOUR DISPUTE TO', requirements.label, requirements.postal];
  if (settings.use_account_profile) {
    if (profile.date_of_birth) out.push('Date of birth: ' + profile.date_of_birth);
    if (profile.previous_address) out.push('Previous address(es): ' + profile.previous_address);
  }
  if (settings.identity_reference) out.push((requirements.country === 'US' ? 'Social Security number: ' : 'Identification reference: ') + settings.identity_reference);
  if (settings.no_ssn_issued && requirements.country === 'US') out.push('I have never been issued a Social Security number.');
  if (settings.other_identity_details) out.push(settings.other_identity_details);
  out.push('', 'DOCUMENTS INCLUDED');
  selected.forEach(doc => out.push(doc.original_filename + ' — ' + doc.document_type.replace(/_/g, ' ') + (settings.document_dates?.[doc.file_id] ? ' (dated ' + settings.document_dates[doc.file_id] + ')' : '')));
  if (!selected.length) out.push('No additional documents selected.');
  if (support.form_assets?.length) out.push('', 'FORMS TO PRINT AND FILL IN', ...support.form_assets.map(form => `${form.label}: ${form.instructions}`));
  out.push('', 'BEFORE YOU MAIL', ...requirements.items.map(item => '- ' + item));
  if (settings.channel === 'POSTAL') out.push('', 'Signature: ________________________', 'Date: ________________________');
  return out.filter(value => value != null);
}
function requiredForms(packet) { return (packet?.support_snapshot?.form_assets || []).map(forms.bytesFor); }
function requirePostalPacket(view) {
  if (view?.support?.settings?.channel !== 'POSTAL' || !view?.support?.requirements?.postal) {
    throw new ServiceError('PACKET_SUPPORT_REQUIRED');
  }
}
module.exports = { normalize, snapshot, address, enrich, publicView, lines, requiredForms, requirePostalPacket };
