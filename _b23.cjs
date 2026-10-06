const path = require('path');
const ROOT = 'C:/CRP-NEW';
const formats = require(ROOT + '/accelerated-launch/service/formats.cjs');
const B = ROOT + '/SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/';
function look(label, file, country) {
  console.log('=== ' + label + ' ===');
  let model, ext;
  try { model = formats.buildPdfDocumentModel(file); }
  catch (e) { console.log('  MODEL THREW: ' + e.message); return null; }
  const pages = model.pages || [];
  const text = pages.map((p) => (p.lines || []).join('\n')).join('\n');
  console.log('  pages: ' + pages.length + ' | native text chars: ' + text.length);
  console.log('  first 260: ' + JSON.stringify(text.slice(0, 260)));
  try { ext = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country }); }
  catch (e) { console.log('  EXTRACT THREW: ' + e.message); return null; }
  console.log('  presentation: ' + ext.presentation_id + ' | admission: ' + JSON.stringify(ext.admission && ext.admission.state));
  const kinds = {};
  for (const r of ext.records || []) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  console.log('  records: ' + JSON.stringify(kinds));
  const withFacts = (ext.records || []).filter((r) => r.facts && Object.keys(r.facts).length);
  console.log('  records carrying facts: ' + withFacts.length);
  if (withFacts[0]) console.log('  sample: ' + JSON.stringify(withFacts[0].facts).slice(0, 300));
  return ext;
}
look('AU PUB-012', B + 'PUB-012.pdf', 'AU');
look('US PUB-001 (recorded consumer sample)', B + 'PUB-001.pdf', 'US');
/* the AU specimen's printed overdue + liability sections, as the model sees them */
const au = formats.buildPdfDocumentModel(B + 'PUB-012.pdf');
const lines = [];
(au.pages || []).forEach((p) => (p.lines || []).forEach((t) => lines.push(String(t))));
const start = lines.findIndex((t) => /Overdue Accounts\s*$/i.test(t.trim()) || /Overdue Accounts/i.test(t));
console.log('=== AU printed Overdue Accounts section (model lines) ===');
console.log(lines.slice(Math.max(0, start), start + 14).map((t, i) => i + ': ' + t.trim()).join('\n'));
