// Local-only fictional data for exercising every shared View entry point.
// Run: node family-admin/test/readable-views-demo.mjs
import { fixtures } from './fixtures.mjs';
import { reads } from '../src/catalog.mjs';
const f = await fixtures({ port: Number(process.env.PORT || 4498), singleSignIn: true });
const record = {
  id: 'fictional-record', question: 'Where is the associated applicant contact record?',
  answer: 'Open this fictional application and inspect its associated contact record. No outbound contact was sent.',
  state: 'RESOLVED', created_at: '2026-10-23T00:52:42.642Z', revision: 6,
  assigned_to: 'Fictional QA reviewer', manual_review: true, updated_at: '2026-10-23T00:52:43.414Z',
  resolution_evidence: 'Fictional review evidence', optional_note: null,
  notes: [{ author: 'Fictional reviewer', text: 'First line\nSecond line' }],
  checks: [true, false, 0, null], currency: 'CAD', amount_minor: 990,
};
for (const [app, resources] of Object.entries(reads)) {
  for (const resource of Object.keys(resources)) {
    if (!(resource in f.state.data[app])) f.state.data[app][resource] = [structuredClone(record)];
  }
}
f.state.data.affiliate.tickets = [structuredClone(record)];
f.state.data.crp.settings = { enabled: false, counts: { active: 0 }, records: [structuredClone(record)], empty: [] };
f.state.data.affiliate.report = { currency: 'USD', amount_minor: 12345, sections: [{ title: 'Fictional report', published: false }] };
f.state.data.affiliate.resources = { currency: 'AUD', prices: { report_minor: 990 }, claims: ['Fictional approved wording'] };
console.log('FICTIONAL LOCAL PREVIEW: ' + f.base);
console.log('owner@example.test / fictional-password / 123456; admin unlock: 654321.');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => f.close().then(() => process.exit(0)));
