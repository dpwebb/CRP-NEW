'use strict';
const fs = require('node:fs');
const Module = require('node:module');
const packets = require('../../packets.cjs');
const { pdfText } = require('../packet-pdf-assertions.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

async function run(t, check) {
  const owner = await t.account('form-free-owner@example.test');
  const stranger = await t.account('form-free-stranger@example.test');
  const auth = body => ({ token: owner.token, body });
  const cells = [
    ['CA','CA-NS','EQUIFAX'], ['CA','CA-ON','TRANSUNION'],
    ['US','US-CA','EQUIFAX'], ['US','US-NY','EXPERIAN'], ['US','US-TX','TRANSUNION'],
    ['GB','GB-ENG','EQUIFAX'], ['GB','GB-WLS','EXPERIAN'], ['GB','GB-SCT','TRANSUNION'],
    ['AU','AU-NSW','EQUIFAX'], ['AU','AU-VIC','EXPERIAN']
  ];
  for (const [country, region, bureau] of cells) {
    const label = `${country}/${bureau}`;
    const created = await t.request('POST', '/api/cases', auth({ country, region, bureau }));
    check.equal(created.status, 201, label + ': owned case');
    const id = created.json.case.case_id, base = '/api/cases/' + id;
    const source = buildPdf({ pages: [{ lines: [bureau + ' Consumer Credit Report', 'Report Date: June 12, 2026',
      'Creditor: Fictional ' + country + ' Bank', 'Account Number: ****1234', 'Opened 2020-01-01', 'Closed 2019-01-01', 'Balance $100'] }] });
    check.equal((await t.request('POST', base + '/files', auth({ originalFilename: 'fictional.pdf', declaredBytes: source.length,
      mimeType: 'application/pdf', contentBase64: source.toString('base64') }))).status, 201, label + ': native source uploaded');
    await t.request('POST', base + '/evaluate', auth());
    const initial = (await t.request('GET', base + '/packet', auth())).json.view;
    check.ok(initial.eligible_issues.length > 0, label + ': own supported issue');
    await t.request('POST', base + '/packet/select', auth({ issue_ids: [initial.eligible_issues[0].issue_id] }));
    await t.preparePostalPacket(owner, id);
    // Keep the supplied full name; remove every former form-only name/street box.
    await t.request('PUT', '/api/account/profile', auth({ profile: { given_name: '', family_name: '', middle_name: '', suffix: '', street_number: '', street_name: '' } }));
    const ready = (await t.request('GET', base + '/packet', auth())).json.view;
    check.deepEqual(ready.packet.form_previews, [], label + ': no form preview links');
    check.deepEqual(ready.packet.required_form_manifest, [], label + ': no required templates');
    check.equal(ready.support.missing.length, 0, label + ': no form-only input gate');
    const preview = await t.request('GET', ready.packet.letter_preview_url, auth());
    check.equal(preview.status, 200, label + ': complete review PDF');
    check.equal((await t.request('GET', base + '/packet/forms/ca-equifax-account.pdf', auth())).status, 404, label + ': retired route unavailable');
    check.equal((await t.request('GET', ready.packet.letter_preview_url, { token: stranger.token })).status, 403, label + ': foreign review denied');
    check.equal((await t.request('POST', base + '/packet/approve', auth({ reviewed_version: ready.packet.preview_version }))).status, 200, label + ': exact review approved');
    const downloaded = await t.request('GET', base + '/packet-download', auth());
    check.equal(downloaded.status, 200, label + ': entitled download');
    check.ok(downloaded.bytes.equals(preview.bytes), label + ': downloaded bytes equal reviewed bytes');
    const printed = packets.packetPrint(t.service.store, owner, id);
    check.equal(printed.sections.some(section => section.kind === 'form'), false, label + ': no form pages');
    check.ok(printed.sections.some(section => section.kind === 'report') && printed.sections.some(section => section.kind === 'document'), label + ': selected report and supporting copies retained');
    check.ok(pdfText(downloaded.bytes).includes('Fictional ' + country + ' Bank'), label + ': own selected account retained');
    check.equal(ready.packet.print_instructions.some(line => /bureau form/i.test(line)), false, label + ': no retired signing instruction');
    if (country === 'CA' && bureau === 'EQUIFAX') {
      // Controlled persisted prior-format approval: same current inputs, former
      // format discriminator. Current runtime must still require a fresh review.
      const filename = require.resolve('../../packets.cjs');
      const oldFormat = new Module(filename, module);
      oldFormat.filename = filename; oldFormat.paths = Module._nodeModulePaths(require('node:path').dirname(filename));
      oldFormat._compile(fs.readFileSync(filename, 'utf8').replace('packet-format:consumer-letter-evidence-pdf-2', 'packet-format:complete-editable-pdf-1'), filename);
      oldFormat.exports.approvePacket(t.service.store, owner, id, null, true);
      check.equal((await t.request('GET', base + '/packet-download', auth())).json.error.code, 'PACKET_APPROVAL_STALE', 'prior-format approval cannot authorize form-free bytes');
      const refreshed = (await t.request('GET', base + '/packet', auth())).json.view;
      check.equal(refreshed.packet.approval_stale, true, 'prior-format stored approval requests new review');
      check.equal((await t.request('POST', base + '/packet/approve', auth({ reviewed_version: refreshed.packet.preview_version }))).status, 200, 'new-format explicit review restores approval');
    }
  }
  return { forms_retired: true, form_only_inputs_not_required: true, approved_bytes_match: true,
    old_approval_refused: true, country_bureau_cells: cells.length,
    boundary: 'Fictional native uploads and actual local PDFs; controlled prior-format discriminator migration. Hosted verification is separate.' };
}
module.exports = { id: 'er-bureau-forms-retired', title: 'Form-free country/bureau packet contents, owned review and prior-format approval migration', run };
