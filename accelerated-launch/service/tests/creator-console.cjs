'use strict';

/* Local-only administration console for synthetic Creator cases. Never expose on a public host. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const formats = require('../formats.cjs');
const creatorRenderer = require('./creator-render-fixture.cjs');

const root = process.env.CRP_CREATOR_TEST_ROOT || 'C:\\Users\\webbd\\CREDIT REPORTS\\CRP_CREATOR_VIOLATION_TESTS';
const corpus = path.resolve(root, '..');
const manifestPath = path.join(root, 'cases.json');
const logDir = path.join(root, 'activity-logs');
const htmlPath = path.join(__dirname, 'creator-console.html');
const port = Number(process.env.CRP_CREATOR_CONSOLE_PORT || 4317);

function inside(base, value) {
  const relative = path.relative(path.resolve(base), path.resolve(value));
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}
function readManifest() {
  if (!fs.existsSync(manifestPath)) return { version: 1, cases: [] };
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(data.cases)) throw new Error('Invalid Creator manifest');
  return data;
}
function writeManifest(data) {
  fs.mkdirSync(root, { recursive: true });
  const tmp = `${manifestPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, manifestPath);
}
function logFor(item) {
  const file = path.join(logDir, `${path.basename(item.report).replace(/[^a-z0-9_.-]/gi, '_')}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}
function markedSynthetic(file) {
  const model = formats.buildPdfDocumentModel(file);
  return (model.pages || []).some((page) => /SYNTHETIC TEST FIXTURE|SYNTHETIC TRAINING DATA\s*-\s*NOT A CREDIT REPORT|SPECIMEN\s*[—-]\s*NOT A VALID CREDIT REPORT/i.test(String(page.text || page)));
}
function json(res, code, value) {
  const body = JSON.stringify(value);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'content-security-policy': "default-src 'none'", 'x-content-type-options': 'nosniff' });
  res.end(body);
}
async function bodyOf(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100000) throw new Error('Request too large');
  }
  return JSON.parse(body || '{}');
}
function summary(item) {
  const log = logFor(item);
  return { id: item.id, report_name: path.basename(item.report), country: item.country,
    region: item.region, status: log ? log.seeds.some((seed) => seed.outcome.startsWith('FAIL')) ? 'FIX_REQUIRED'
      : log.seeds.some((seed) => seed.outcome === 'SEED_REVIEW_REQUIRED') ? 'SEED_REVIEW' : 'PASS' : 'NOT_RUN',
    detected_count: log?.detected_count ?? null, additional_count: log?.additional_detections?.length ?? null,
    last_run: log?.created_at || null };
}
function handler(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const manifest = readManifest();
  const id = decodeURIComponent(url.pathname.split('/')[3] || '');
  const item = manifest.cases.find((entry) => entry.id === id);
  if (req.method === 'GET' && url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  if (req.method === 'GET' && url.pathname === '/') {
    const html = fs.readFileSync(htmlPath);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store',
      'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-src 'self'" });
    return res.end(html);
  }
  if (req.method === 'GET' && url.pathname === '/api/cases') return json(res, 200, { cases: manifest.cases.map(summary) });
  if (req.method === 'GET' && url.pathname === '/api/bureau-survey') {
    const survey = path.join(logDir, 'supplemental-bureau-survey.json');
    return json(res, 200, { survey: fs.existsSync(survey) ? JSON.parse(fs.readFileSync(survey, 'utf8')) : null });
  }
  if (req.method === 'GET' && url.pathname === '/api/creator-fixtures') return json(res, 200, {
    fixtures: creatorRenderer.FIXTURES, recipes: creatorRenderer.RECIPES });
  if (req.method === 'GET' && url.pathname === '/creator-console.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(fs.readFileSync(path.join(__dirname, 'creator-console.js')));
  }
  if (req.method === 'GET' && url.pathname === '/creator-console.css') {
    res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(fs.readFileSync(path.join(__dirname, 'creator-console.css')));
  }
  if (req.method === 'GET' && item && url.pathname.endsWith('/log')) return json(res, 200, { log: logFor(item) });
  if (req.method === 'GET' && item && url.pathname.endsWith('/pdf')) {
    const file = path.resolve(item.report);
    if (!inside(corpus, file) || !fs.existsSync(file)) return json(res, 404, { error: 'Report unavailable' });
    res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': 'inline',
      'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    return fs.createReadStream(file).pipe(res);
  }
  if (req.method === 'POST' && url.pathname === '/api/cases') return bodyOf(req).then((data) => {
    const id = String(data.id || '').trim();
    const report = path.resolve(String(data.report || ''));
    const oracle = path.resolve(String(data.oracle || ''));
    const country = String(data.country || '').toUpperCase();
    const region = String(data.region || '').toUpperCase();
    if (!/^[a-z0-9_-]{3,80}$/i.test(id) || manifest.cases.some((entry) => entry.id === id)) throw new Error('Choose a unique case ID');
    if (!['US', 'CA', 'GB', 'AU'].includes(country) || !region.startsWith(`${country}-`)) throw new Error('Country and region do not match');
    if (!inside(corpus, report) || path.extname(report).toLowerCase() !== '.pdf' || !fs.existsSync(report)) throw new Error('Select a PDF under CREDIT REPORTS');
    if (!markedSynthetic(report)) throw new Error('Only marked synthetic test reports can be registered');
    if (!inside(root, oracle) || path.extname(oracle).toLowerCase() !== '.json' || !fs.existsSync(oracle)) throw new Error('Select an oracle under the private test directory');
    const expected = JSON.parse(fs.readFileSync(oracle, 'utf8'));
    if (!Array.isArray(expected.seeds)) throw new Error('Oracle needs a seeds array');
    manifest.cases.push({ id, report, oracle, country, region });
    writeManifest(manifest);
    json(res, 201, { case: summary(manifest.cases.at(-1)) });
  }).catch((error) => json(res, 400, { error: error.message }));
  if (req.method === 'POST' && url.pathname === '/api/generate') return bodyOf(req).then((data) => {
    const id = String(data.id || '').trim();
    const country = String(data.country || '').toUpperCase();
    const region = String(data.region || '').toUpperCase();
    const template = path.resolve(String(data.template || ''));
    const page = Number(data.page);
    const occurrence = Number(data.occurrence || 1);
    const old = String(data.old || '');
    const replacement = String(data.replacement || '');
    const checkId = String(data.check_id || '').trim();
    if (!/^[a-z0-9_-]{3,80}$/i.test(id) || manifest.cases.some((entry) => entry.id === id)) throw new Error('Choose a unique case ID');
    if (!['US', 'CA', 'GB', 'AU'].includes(country) || !region.startsWith(`${country}-`)) throw new Error('Country and region do not match');
    if (!inside(corpus, template) || path.extname(template).toLowerCase() !== '.pdf' || !fs.existsSync(template)) throw new Error('Select a synthetic PDF under CREDIT REPORTS');
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(occurrence) || occurrence < 1) throw new Error('Choose a page and occurrence');
    if (!old || old.length > 90 || replacement.length > 90 || !/^[A-Z0-9-]{8,120}$/.test(checkId)) throw new Error('Provide a printed value, replacement and check ID');
    const output = path.join(root, 'reports', country === 'GB' ? 'UK' : country, `${id}.pdf`);
    const oracle = path.join(root, 'oracles', `${id}.json`);
    if (fs.existsSync(output) || fs.existsSync(oracle)) throw new Error('This case already has files');
    const generated = spawnSync('python', [path.join(__dirname, 'creator-seed-report.py')], {
      input: JSON.stringify({ template, output, page, occurrence, old, new: replacement }), encoding: 'utf8', timeout: 30000 });
    if (generated.status !== 0) throw new Error((generated.stderr || 'PDF generation failed').trim().slice(-500));
    const answer = { seeds: [{ seed_id: id, check_id: checkId, expectation: 'DETECT',
      adjudication: `Creator changed page ${page}, occurrence ${occurrence} of ${JSON.stringify(old)} to ${JSON.stringify(replacement)}. Verify the printed report supports this check before scoring.` }] };
    fs.mkdirSync(path.dirname(oracle), { recursive: true });
    fs.writeFileSync(oracle, JSON.stringify(answer, null, 2) + '\n', { flag: 'wx' });
    manifest.cases.push({ id, report: output, oracle, country, region });
    writeManifest(manifest);
    json(res, 201, { case: summary(manifest.cases.at(-1)), generation: JSON.parse(generated.stdout) });
  }).catch((error) => json(res, 400, { error: error.message }));
  if (req.method === 'POST' && url.pathname === '/api/creator-generate') return bodyOf(req).then((data) => {
    const id = String(data.id || '').trim();
    if (manifest.cases.some((entry) => entry.id === id)) throw new Error('Choose a unique case ID');
    const item = creatorRenderer.create({ fixtureId: String(data.fixture_id || ''), recipe: String(data.recipe || ''), id, root });
    manifest.cases.push(item);
    writeManifest(manifest);
    json(res, 201, { case: summary(item) });
  }).catch((error) => json(res, 400, { error: error.message }));
  if (req.method === 'POST' && item && url.pathname.endsWith('/run')) {
    const blocked = manifest.cases.find((entry) => entry.id !== id && logFor(entry)?.seeds.some((seed) => seed.outcome.startsWith('FAIL')));
    if (blocked) return json(res, 409, { error: `Fix the failed ${blocked.id} case before the next test.` });
    try {
      // Start a fresh engine process for every run, so a just-fixed detector is actually tested.
      const run = spawnSync(process.execPath, [path.join(__dirname, 'creator-violation-audit.cjs'),
        item.report, item.country, item.region, item.oracle, logDir], { encoding: 'utf8', timeout: 60000 });
      if (run.status !== 0) throw new Error((run.stderr || 'Assessment failed').trim().slice(-500));
      return json(res, 200, { log: logFor(item) });
    }
    catch (error) { return json(res, 500, { error: error.message }); }
  }
  return json(res, 404, { error: 'Not found' });
}

if (require.main === module) {
  http.createServer((req, res) => {
    try { handler(req, res); } catch (error) { json(res, 500, { error: error.message }); }
  }).listen(port, '127.0.0.1', () => process.stdout.write(`Creator console: http://127.0.0.1:${port}/\n`));
}
module.exports = { handler, readManifest, summary };
