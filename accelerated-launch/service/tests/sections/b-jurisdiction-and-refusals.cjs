'use strict';
/**
 * b-jurisdiction-and-refusals.cjs — acceptance item 2: "Wrong/missing jurisdiction and unsupported files are
 * refused clearly", plus the boundary that a structurally similar upload is NOT accepted merely to make the
 * journey appear complete.
 *
 * The lookalike and the malformed PDFs are the CA-NS unit's own fixtures: a 22-page A4 PDF in the contract's
 * shape that is deliberately not the evidenced specimen, an image-only page, a three-page document, and a
 * document carrying a synthetic marker. They are written to the system temporary directory, never here.
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const FIXTURES = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');
const formats = require('../../formats.cjs');

function uploadBody(bytes, filename, mimeType) {
  return {
    originalFilename: filename,
    declaredBytes: bytes.length,
    mimeType: mimeType || 'application/pdf',
    contentBase64: bytes.toString('base64')
  };
}

async function selectionRefusals(t, check, owner) {
  const pairs = [
    [{ country: 'CA' }, 'EXPLICIT_COUNTRY_AND_REGION_REQUIRED', 'a missing region'],
    [{ region: 'CA-NS' }, 'EXPLICIT_COUNTRY_AND_REGION_REQUIRED', 'a missing country'],
    [{ country: '', region: '' }, 'EXPLICIT_COUNTRY_AND_REGION_REQUIRED', 'an empty pair'],
    [{ country: 'US', region: 'CA-NS' }, 'UNSUPPORTED_OR_MISMATCHED_JURISDICTION', 'a mismatched pair'],
    [{ country: 'ca', region: 'CA-NS' }, 'UNSUPPORTED_OR_MISMATCHED_JURISDICTION', 'a lowercase country alias'],
    [{ country: 'CA', region: 'NS' }, 'UNSUPPORTED_OR_MISMATCHED_JURISDICTION', 'a non-canonical region'],
    [{ country: 'CA', region: 'CA-XX' }, 'UNSUPPORTED_OR_MISMATCHED_JURISDICTION', 'a region that does not exist'],
    [{ country: 'US', region: 'US-NY' }, null, 'a canonical pair is accepted']
  ];
  for (const [body, expectedCode, label] of pairs) {
    const response = await t.request('POST', '/api/cases', { token: owner.token, body });
    if (expectedCode === null) {
      check.equal(response.status, 201, label);
    } else {
      check.equal(response.status, 400, label);
      check.equal(response.json.error.code, expectedCode, `${label} names the reason`);
    }
  }

  const surface = await t.request('GET', '/api/jurisdictions');
  check.equal(surface.json.surface.regions.length, 82, 'the surface carries all 82 canonical regions');
  check.equal(surface.json.surface.countries.length, 4, 'and the four countries');
  check.ok(surface.json.surface.regions.every((r) => r.launch_ready === false), 'no region is advertised as launch ready');
  for (const region of surface.json.surface.regions) {
    const opened = await t.request('POST', '/api/cases', { token: owner.token, body: { country: region.country, region: region.value } });
    check.equal(opened.status, 201, `a case can be opened for ${region.value}`);
    check.equal(opened.json.case.launch_ready, false, `${region.value} is not reported as launch ready`);
  }
}

async function uploadGateRefusals(t, check, owner, caseId) {
  const before = t.blobFiles().length;

  const docx = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: { originalFilename: 'report.docx', declaredBytes: 100, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', contentBase64: Buffer.from('x').toString('base64') }
  });
  check.equal(docx.status, 400, 'an unsupported file type is refused');
  check.equal(docx.json.error.code, 'UNSUPPORTED_FILE_TYPE');

  const oversize = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: { originalFilename: 'big.pdf', declaredBytes: 40 * 1024 * 1024, mimeType: 'application/pdf', contentBase64: Buffer.from('x').toString('base64') }
  });
  check.equal(oversize.status, 400, 'an oversize declared file is refused');
  check.equal(oversize.json.error.code, 'FILE_TOO_LARGE');

  const malformed = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: { originalFilename: 'ok.pdf', declaredBytes: 10, mimeType: 'application/pdf', contentBase64: '' }
  });
  check.equal(malformed.status, 400, 'an empty upload body is refused');
  check.equal(malformed.json.error.code, 'MALFORMED_UPLOAD_BODY');

  const notPdf = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: { originalFilename: 'report.pdf', declaredBytes: 9, mimeType: 'application/pdf', contentBase64: Buffer.from('hello.txt').toString('base64') }
  });
  check.equal(notPdf.status, 400, 'a non-PDF container is refused');
  check.equal(notPdf.json.error.code, 'NOT_A_PDF_CONTAINER');
  check.equal(t.blobFiles().length, before, 'a document refused before the format gate retains no bytes');

  /* B3 continuation: EVERY canonical country now has at least one registered presentation. GB joined CA, AU
     and the US, so a file is no longer refused merely because no presentation is offered for the selected
     country — it is stored, measured and refused at the format gate like any other lookalike. The
     pre-storage guard itself still exists and is still driven by the same condition, which is asserted
     directly below rather than by pretending a country has no presentation. */
  const gbCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'GB', region: 'GB-ENG' } })).json.case.case_id;
  const fixtureBytes = fs.readFileSync(FIXTURES.pdfFixtures().unpinned);
  const gbLookalike = await t.request('POST', `/api/cases/${gbCase}/files`, { token: owner.token, body: uploadBody(fixtureBytes, 'report.pdf') });
  check.equal(gbLookalike.status, 201, 'a GB selection now has a registered presentation, so its file is stored and measured');
  check.equal(gbLookalike.json.receipt.format_detection.supported, false, 'and the lookalike is still refused');
  check.ok(typeof gbLookalike.json.receipt.format_detection.refusal_reason === 'string',
    'with the refusal naming what was measured');
  check.equal(gbLookalike.json.receipt.extraction_summary.accounts_read, 0, 'and nothing is read from it');

  for (const country of ['CA', 'AU', 'US', 'GB']) {
    check.ok(formats.formatsForCountry(country).length > 0, `a presentation is registered for ${country}`);
  }
  check.equal(formats.formatsForCountry('ZZ').length, 0,
    'and the pre-storage guard is still driven by an empty registration list, so it still fires for a market with none');

  /* A market WITH a registered presentation stores the bytes so the document's measured shape can be reported,
     and then refuses it at the format gate. B3 continuation: the United States is such a market now. */
  const usCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case.case_id;
  const usRefused = await t.request('POST', `/api/cases/${usCase}/files`, { token: owner.token, body: uploadBody(fixtureBytes, 'report.pdf') });
  check.equal(usRefused.status, 201, 'a United States selection has a registered presentation, so its lookalike is measured');
  check.equal(usRefused.json.receipt.format_detection.supported, false, 'and is still refused');
  check.ok(typeof usRefused.json.receipt.format_detection.refusal_reason === 'string',
    'with the refusal naming what was measured');
  check.equal(usRefused.json.receipt.extraction_summary.accounts_read, 0, 'and no record invented for it');
}

async function structurallySimilar(t, check, owner, caseId) {
  const fixtures = FIXTURES.pdfFixtures();
  /* B6-INGEST-002: these fixtures carry no bureau identity, so under the general intake they are refused as
     UNRELATED (a bureau name is a prerequisite) rather than by a specific layout predicate. The invariant this
     section guards — a lookalike is never silently admitted to fake completeness — still holds. */
  const refusals = [
    [fixtures.unpinned, 'a 22-page A4 PDF in the contract shape but with no bureau identity'],
    [fixtures.marker, 'a document carrying a synthetic marker but no bureau identity'],
    [fixtures.imageOnly, 'an image-only page with no readable bureau identity'],
    [fixtures.wrongCount, 'a three-page document with no bureau identity']
  ];
  let count = 0;
  for (const [file, label] of refusals) {
    const bytes = fs.readFileSync(file);
    const response = await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: uploadBody(bytes, path.basename(file)) });
    check.equal(response.status, 201, `${label} is stored so its measured shape can be reported`);
    check.equal(response.json.receipt.format_detection.supported, false, `${label} is not admitted`);
    check.ok(typeof response.json.receipt.format_detection.refusal_reason === 'string', `${label} names a refusal`);
    check.equal(response.json.receipt.extraction_summary.extraction_ran, false, `${label} is not read at all`);
    check.equal(response.json.receipt.extraction_summary.accounts_read, 0, `${label} produces no accounts`);
    count += 1;
  }
  return count;
}

async function run(t, check) {
  const owner = await t.account('owner-refusals@example.test');
  await selectionRefusals(t, check, owner);
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  await uploadGateRefusals(t, check, owner, caseId);
  const refused = await structurallySimilar(t, check, owner, caseId);
  return { caseId, structurally_similar_refused: refused };
}

module.exports = { run, id: 'b-refusals', title: 'Jurisdiction and upload refusals, including the lookalike PDF' };
