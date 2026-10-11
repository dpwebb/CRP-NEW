'use strict';
const list = document.querySelector('#cases');
const detail = document.querySelector('#detail');
const chosen = document.querySelector('#chosen');
const pdf = document.querySelector('#pdf');
const surveyView = document.querySelector('#bureau-survey');
let selected = null;
function el(tag, className, value) { const node = document.createElement(tag); if (className) node.className = className; if (value != null) node.textContent = String(value); return node; }
async function request(url, options) { const response = await fetch(url, options); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed'); return data; }
function line(parent, label, value) { const p = el('p'); p.append(el('strong', '', `${label}: `), document.createTextNode(String(value ?? '—'))); parent.append(p); }
async function refresh() {
  const { cases } = await request('/api/cases'); list.replaceChildren();
  for (const item of cases) {
    const button = el('button', `case ${item.id === selected ? 'active' : ''}`);
    const top = el('div', 'case-top'); top.append(el('strong', '', item.report_name), el('span', `badge ${item.status}`, item.status.replace('_', ' ')));
    button.append(top, el('small', '', `${item.country} · ${item.region} · ${item.last_run ? new Date(item.last_run).toLocaleString() : 'Not run'}`));
    button.addEventListener('click', () => select(item.id)); list.append(button);
  }
  if (!cases.length) list.append(el('p', 'hint', 'No synthetic reports are registered yet.'));
  if (selected && cases.some(item => item.id === selected)) await select(selected, false);
  const { survey } = await request('/api/bureau-survey'); surveyView.replaceChildren();
  if (!survey) surveyView.append(el('p', 'hint', 'No supplemental survey has run.'));
  else {
    line(surveyView, 'Surveyed', new Date(survey.created_at).toLocaleString());
    for (const row of survey.results.filter(item => item.name.endsWith('_B0.pdf'))) {
      const name = row.name.replace('_B0.pdf', '').replaceAll('_', ' · ');
      surveyView.append(el('p', '', `${name}: ${row.error || `${row.presentation || 'not admitted'} · ${row.records_read} records read`}`));
    }
  }
}
async function select(id, redraw = true) {
  selected = id; const { log } = await request(`/api/cases/${encodeURIComponent(id)}/log`);
  chosen.textContent = id; pdf.src = `/api/cases/${encodeURIComponent(id)}/pdf`;
  document.querySelector('#pdf-link').href = pdf.src;
  detail.replaceChildren(); const run = el('button', '', log ? 'Rerun this report' : 'Run CRP assessment');
  run.addEventListener('click', async () => { run.disabled = true; try { await request(`/api/cases/${encodeURIComponent(id)}/run`, { method: 'POST' }); await refresh(); }
    catch (error) { detail.prepend(el('p', 'error', error.message)); run.disabled = false; } }); detail.append(run);
  if (!log) detail.append(el('p', 'hint', 'The Creator answer key remains closed until the report has been assessed.'));
  else {
    const summary = el('div', 'result'); line(summary, 'CRP presentation', log.presentation);
    line(summary, 'Records read', log.records_read); line(summary, 'Detections', log.detected_count);
    line(summary, 'Additional detections', log.additional_detections.length); line(summary, 'Report SHA-256', log.report_sha256);
    detail.append(summary);
    for (const seed of log.seeds) { const block = el('div', 'result'); block.append(el('h3', '', `${seed.seed_id} · ${seed.outcome}`));
      line(block, 'Expected check', seed.check_id); line(block, 'Expected result', seed.expectation);
      line(block, 'Matched detections', seed.matched_count); if (seed.adjudication) line(block, 'Seed review', seed.adjudication);
      for (const match of seed.matched_detections || []) {
        line(block, 'CRP result', `${match.classification || 'ISSUE'} · record ${match.record_index}`);
        line(block, 'Report evidence', match.source_fields.join(', '));
        line(block, 'Evidence location', match.source_locations.map(x => `page ${x.page}, line ${x.line}`).join('; '));
      }
      if (seed.first_blocking_layer) line(block, 'First blocking layer', seed.first_blocking_layer);
      if (seed.fix) line(block, 'Fix', seed.fix);
      if (seed.repair_history) for (const step of seed.repair_history) line(block, 'Repair history', `${step.at}: ${step.outcome} — ${step.note}`);
      detail.append(block); }
    for (const finding of log.additional_detections) { const block = el('div', 'result'); block.append(el('h3', '', 'Additional detection'));
      line(block, 'Check', finding.check_id); line(block, 'Record', finding.record_index); line(block, 'Source fields', finding.source_fields.join(', '));
      line(block, 'Source locations', finding.source_locations.map(x => `page ${x.page}, line ${x.line}`).join('; ')); detail.append(block); }
  }
  if (redraw) for (const button of list.querySelectorAll('.case')) button.classList.toggle('active', button.textContent.includes(id));
}
document.querySelector('#refresh').addEventListener('click', () => refresh().catch(error => detail.replaceChildren(el('p', 'error', error.message))));
document.querySelector('#register').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form)); try { await request('/api/cases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    form.reset(); selected = data.id; await refresh(); } catch (error) { detail.prepend(el('p', 'error', error.message)); } });
document.querySelector('#generate').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form)); try { await request('/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    selected = data.id; await refresh(); } catch (error) { detail.prepend(el('p', 'error', error.message)); } });
document.querySelector('#creator-generate').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form)); try { await request('/api/creator-generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    selected = data.id; await refresh(); } catch (error) { detail.prepend(el('p', 'error', error.message)); } });
refresh().catch(error => detail.replaceChildren(el('p', 'error', error.message)));
