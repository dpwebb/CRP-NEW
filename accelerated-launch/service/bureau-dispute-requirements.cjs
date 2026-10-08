'use strict';
// Official ordinary-consumer dispute instructions, reviewed 2026-10-08.
// Access/delegation verification is deliberately not an ordinary-dispute requirement.
const SOURCES = {
  CA_EQ_ACCOUNT: 'https://assets.equifax.com/assets/canada/english/Accounts_Dispute_Form_EN.pdf',
  CA_EQ_PUBLIC: 'https://assets.equifax.com/assets/canada/english/Public_Records_Dispute_Form_EN.pdf',
  CA_EQ_PERSONAL: 'https://assets.equifax.com/assets/canada/english/Personal_Info_Dispute_Form_EN.pdf',
  CA_EQ_ROUTE: 'https://www.equifax.ca/personal/dispute-credit-report/',
  CA_TU: 'https://www.transunion.ca/assistance/credit-report-disputes',
  CA_TU_FORM: 'https://www.transunion.ca/content/dam/transunion/ca/consumer/documents/Credit-Investigation-Request-Form-en.pdf',
  US_EQ: 'https://assets.equifax.com/assets/personal/Dispute.pdf',
  US_EX: 'https://www.experian.com/blogs/ask-experian/credit-education/faqs/instructions-for-disputing-by-mail/',
  US_TU: 'https://www.transunion.com/credit-disputes/dispute-your-credit/mail-or-phone',
  US_TU_PERSONAL: 'https://www.transunion.com/customer-support/editing-personal-information',
  US_TU_FAQ: 'https://www.transunion.com/credit-disputes/credit-disputes-faq',
  GB_EQ: 'https://www.equifax.co.uk/contact-us',
  GB_EX: 'https://ins.experian.co.uk/statement-of-rights',
  GB_TU: 'https://www.transunionstatreport.co.uk/DisputesFAQs',
  GB_TU_ROUTE: 'https://www.transunion.co.uk/consumer/support/contact',
  AU_EQ: 'https://www.equifax.com.au/personal/what-information-do-i-need-submit-correction',
  AU_EQ_ROUTE: 'https://www.equifax.com.au/personal/corrections-portal',
  AU_EQ_ID: 'https://www.equifax.com.au/personal/identity-verification-100-point-check',
  AU_EX: 'https://www.experian.com.au/consumer/correction-process',
  AU_EX_MERGER: 'https://www.experian.com.au/consumer/order-credit-report'
};
const ROUTES = {
  CA: {
    EQUIFAX: { label: 'Equifax Canada', postal: 'Equifax Canada Co., National Consumer Relations, Box 190, Montreal QC H1S 2Z2', online: SOURCES.CA_EQ_ROUTE, sources: [SOURCES.CA_EQ_ROUTE, SOURCES.CA_EQ_ACCOUNT] },
    TRANSUNION: { label: 'TransUnion Canada', postal: 'Consumer Relations Department, P.O. Box 338, LCD1, Hamilton ON L8L 7W2', online: SOURCES.CA_TU, sources: [SOURCES.CA_TU] }
  },
  US: {
    EQUIFAX: { label: 'Equifax', postal: 'Equifax Information Services LLC, P.O. Box 740256, Atlanta GA 30374', online: 'https://www.equifax.com/personal/credit-report-services/credit-dispute/', sources: [SOURCES.US_EQ] },
    EXPERIAN: { label: 'Experian', postal: 'Experian, P.O. Box 4500, Allen TX 75013', online: 'https://www.experian.com/disputes/main.html', sources: [SOURCES.US_EX] },
    TRANSUNION: { label: 'TransUnion', postal: 'TransUnion Consumer Solutions, P.O. Box 2000, Chester PA 19016-2000', online: 'https://www.transunion.com/credit-disputes/dispute-your-credit', sources: [SOURCES.US_TU, SOURCES.US_TU_FAQ] }
  },
  GB: {
    EQUIFAX: { label: 'Equifax', postal: 'Equifax Ltd, Customer Service Centre, PO Box 10036, Leicester LE3 4FS', online: SOURCES.GB_EQ, sources: [SOURCES.GB_EQ] },
    EXPERIAN: { label: 'Experian', postal: 'Experian, PO Box 9000, Nottingham NG80 7WP', online: 'https://ins.experian.co.uk/contact', sources: [SOURCES.GB_EX] },
    TRANSUNION: { label: 'TransUnion', postal: 'TransUnion Consumer Services Team, PO Box 647, Unit 4, Hull HU9 9QZ', online: SOURCES.GB_TU, sources: [SOURCES.GB_TU, SOURCES.GB_TU_ROUTE] }
  },
  AU: {
    EQUIFAX: { label: 'Equifax', postal: 'Equifax – Public Access, Equifax Australia Information Services and Solutions Pty Limited, GPO Box 964, North Sydney NSW 2059', online: 'https://equifax.australiancreditdata.com.au/', sources: [SOURCES.AU_EQ, SOURCES.AU_EQ_ROUTE] },
    EXPERIAN: { label: 'Experian (including former illion)', postal: 'Experian Consumer Operations, PO Box 7405, St Kilda Road, Melbourne VIC 3004', online: 'https://consumer-services.experian.com.au/login.html', sources: [SOURCES.AU_EX, SOURCES.AU_EX_MERGER, 'https://www.experian.com.au/contact-us', 'https://www.experian.com.au/privacy-policy-terms-conditions/experian-australia-credit-reporting-policy', 'https://www.experian.com.au/content/dam/noindex/apac/australia/FY25-Experian-Independent-Compliance-Review-Audit-Report-2024.pdf'] }
  }
};
const GOVERNMENT = ['DRIVING_LICENCE', 'PASSPORT', 'GOVERNMENT_ID', 'BIRTH_CERTIFICATE'];
function normalizeBureau(value, country) {
  const text = String(value || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (country === 'AU' && text.includes('ILLION')) return 'EXPERIAN';
  return ['EQUIFAX', 'EXPERIAN', 'TRANSUNION'].find(name => text.includes(name)) || '';
}
function catalog(country) { return Object.entries(ROUTES[country] || {}).map(([id, value]) => ({ id, ...value })); }
function requirements(country, bureau, settings = {}) {
  const id = normalizeBureau(bureau, country), route = ROUTES[country]?.[id];
  if (!route) return null;
  const channel = 'POSTAL', purpose = settings.purpose || 'ACCOUNT';
  const req = { version: '2026-10-08-postal-v2', country, bureau: id, channel, purpose, ...route,
    sources: [...route.sources], items: ['List the entries you dispute. Say what is wrong and what you want changed.', 'Include copies of papers that support your dispute.'],
    identity_count: 0, address_count: 0, identity_kinds: GOVERNMENT, address_kinds: null, fields: [], ssn_required: false };
  if (channel === 'POSTAL') req.items.push('Print and sign the correspondence before sending.');
  if (country === 'CA') {
    req.items.push('Include your full name, date of birth and current address. Add your previous address if needed. SIN is optional.');
    req.fields = ['full_name', 'date_of_birth', 'address_line1', 'city', 'region', 'postal_code'];
    if (id === 'EQUIFAX') {
      req.identity_count = purpose === 'PUBLIC_RECORD' ? 1 : 2;
      req.address_count = purpose === 'PUBLIC_RECORD' || !settings.identity_shows_address ? 1 : 0;
      req.address_age_days = purpose === 'PUBLIC_RECORD' ? null : 90;
      req.address_kinds = ['UTILITY_BILL', 'BANK_STATEMENT', 'FINANCIAL_STATEMENT'];
      req.sources.push(purpose === 'PUBLIC_RECORD' ? SOURCES.CA_EQ_PUBLIC : purpose === 'PERSONAL' ? SOURCES.CA_EQ_PERSONAL : SOURCES.CA_EQ_ACCOUNT);
      req.items.push(purpose === 'PUBLIC_RECORD' ? 'Include one government ID and one document confirming your name and current address.' : 'Include two valid government IDs. Upload each complete ID, including front and back where applicable, as one file. If neither shows your current address, add a utility bill or financial statement less than 90 days old.');
      req.items.push('Black out card security codes and unnecessary transaction details.');
      req.fields.push('phone'); if (purpose === 'ACCOUNT') req.fields.push('contact_email');
      if (purpose === 'ACCOUNT') req.items.push('For account updates, include the creditor’s confirmation where requested by the form.');
      if (purpose === 'PERSONAL') req.items.push('For a SIN correction, include the requested SIN evidence.');
      if (channel === 'ONLINE') { req.max_documents = 3; req.items.push('Use Equifax’s electronic submission instructions and form. Submit at most three files; combine copies in a PDF where needed.'); }
    }
  }
  if (country === 'US') {
    req.items.push('Include your full name, date of birth and current address.');
    req.fields = ['full_name', 'date_of_birth', 'address_line1', 'city', 'region', 'postal_code'];
    if (channel === 'POSTAL' && ['EQUIFAX', 'EXPERIAN'].includes(id)) {
      req.identity_count = 1; req.address_count = 1; req.ssn_required = true;
      if (id === 'EQUIFAX') {
        req.identity_kinds = ['SOCIAL_SECURITY', 'SSN_PAY_STUB', 'W2', '1099'];
        req.address_kinds = ['DRIVING_LICENCE', 'GOVERNMENT_ID', 'LEASE', 'DEED', 'ADDRESS_PAY_STUB', 'UTILITY_BILL', 'PHONE_BILL'];
        req.items.push('Include your SSN, one SSN-bearing identity document and one document showing your current address.');
      } else {
        req.identity_kinds = ['DRIVING_LICENCE', 'PASSPORT', 'GOVERNMENT_ID'];
        req.address_kinds = ['UTILITY_BILL', 'BANK_STATEMENT', 'INSURANCE_STATEMENT'];
        req.items.push('Include your SSN (or state that you have never been issued one), addresses from the last two years, one government identification card and one current-address utility, bank or insurance statement.');
      }
    }
    if (id === 'TRANSUNION') {
      req.items.push('Add your file number, SSN and supporting documents if available.');
      if (purpose === 'NEW_ADDRESS' && channel === 'POSTAL') { req.address_count = 2; req.sources.push(SOURCES.US_TU_PERSONAL); req.items.push('To add a new address, include two documents showing that address.'); }
      if (purpose === 'PERSONAL') { req.support_count = 1; req.sources.push(SOURCES.US_TU_PERSONAL); req.items.push('For a name, date-of-birth or SSN correction, include a valid document supporting the change.'); }
      if (channel === 'ONLINE') { req.max_documents = 5; req.max_document_bytes = 5 * 1024 * 1024; req.items.push('Online uploads: at most five documents, 5 MB in total.'); }
    }
  }
  if (country === 'GB') {
    req.items.push('Include your name, current address and report reference if available.');
    req.fields = ['full_name', 'address_line1', 'city', 'postal_code'];
    if (id === 'TRANSUNION') req.items.push('Add evidence for electoral-register corrections or recognised court/insolvency entries when requested. Ordinary account disputes do not normally need extra evidence.');
    if (id === 'EQUIFAX' && channel === 'ONLINE') req.items.push('Use your current Equifax report to open the dispute in the Online Helpline.');
  }
  if (country === 'AU') {
    req.items.push('Include your name, date of birth, current and previous addresses, report/account reference and the correction requested. Add licence/employment information where requested.');
    req.fields = ['full_name', 'date_of_birth', 'address_line1', 'city', 'region', 'postal_code'];
    if (settings.verification_requested) {
      req.points_required = 100; req.sources.push(id === 'EQUIFAX' ? SOURCES.AU_EQ_ID : SOURCES.AU_EX);
      req.items.push(id === 'EQUIFAX' ? 'When Equifax asks for verification: provide 100 points of ID, including a primary document. Count at most two bank statements from different accounts and two paid utility bills from different providers. Bank statements must be less than 12 months old; utility bills less than six months old.' : 'When Experian asks for verification: provide 100 points, including Group A and Group B or C, plus proof of address.');
      if (id === 'EQUIFAX') req.items.push('A foreign birth certificate needs its official translation. If you cannot supply 100 points, use Equifax’s statutory-declaration form from its official instructions. Add a selfie holding photo ID if requested.');
      if (id === 'EXPERIAN') { req.address_count = 1; req.address_kinds = ['DRIVING_LICENCE', 'GOVERNMENT_ID', 'UTILITY_BILL', 'BANK_STATEMENT', 'MORTGAGE_STATEMENT', 'LEASE', 'RATES_NOTICE']; }
    } else req.items.push('You can add identity verification documents if the bureau requests them.');
  }
  return req;
}
function missing(req, profile, documents, settings) {
  if (!req) return ['Choose the bureau that issued your report.'];
  const result = req.fields.filter(field => !String(profile[field] || '').trim()).map(field => 'Add ' + field.replace(/_/g, ' ') + ' in your account details.');
  const identity = documents.filter(doc => doc.document_type === 'IDENTITY' && req.identity_kinds.includes(doc.document_kind));
  const distinctIdentity = new Set(identity.map(doc => doc.sha256));
  if (distinctIdentity.size < req.identity_count) result.push('Select ' + req.identity_count + ' qualifying identification document(s).');
  const address = documents.filter(doc => doc.document_type === 'ADDRESS' && (!req.address_kinds || req.address_kinds.includes(doc.document_kind)));
  if (new Set(address.map(doc => doc.sha256)).size < req.address_count) result.push('Select ' + req.address_count + ' proof-of-address document(s).');
  if (req.address_count && req.address_age_days) {
    const dates = settings.document_dates || {}, now = Date.now();
    if (!address.some(doc => { const date = Date.parse(dates[doc.file_id] || ''); return Number.isFinite(date) && date <= now && now - date < req.address_age_days * 86400000; })) result.push('Add the date of an address document less than ' + req.address_age_days + ' days old.');
  }
  if (req.ssn_required && !(req.bureau === 'EXPERIAN' && settings.no_ssn_issued) && !/^\d{9}$/.test(String(settings.identity_reference || '').replace(/[ -]/g, ''))) result.push('Add the SSN required by this bureau’s mail instructions.');
  if (req.support_count && !documents.length) result.push('Select a valid document supporting the personal-information change.');
  if (req.max_documents && documents.length > req.max_documents) result.push('This bureau accepts at most ' + req.max_documents + ' uploaded documents.');
  if (req.max_document_bytes && documents.reduce((n, doc) => n + doc.stored_bytes, 0) > req.max_document_bytes) result.push('Reduce these documents to the bureau’s upload size limit.');
  if (req.points_required) {
    const eq = { PASSPORT: [60, 'A'], DRIVING_LICENCE: [40, 'A'], MEDICARE: [25, 'A'], AU_FULL_BIRTH_CERTIFICATE: [40, 'B'], FOREIGN_BIRTH_CERTIFICATE_TRANSLATED: [15, 'B'], PROOF_OF_AGE: [40, 'B'], BANK_STATEMENT: [20, 'C'], UTILITY_BILL: [20, 'C'], LEASE: [20, 'C'], RATES_NOTICE: [25, 'C'] };
    const ex = { PASSPORT: [70, 'A'], DRIVING_LICENCE: [40, 'A'], PROOF_OF_AGE: [40, 'A'], EMPLOYEE_ID: [40, 'A'], BIRTH_CERTIFICATE: [70, 'B'], AU_FULL_BIRTH_CERTIFICATE: [70, 'B'], MEDICARE: [25, 'B'], TAX_ASSESSMENT: [25, 'B'], MARRIAGE_CERTIFICATE: [25, 'B'], BANK_STATEMENT: [25, 'C'], UTILITY_BILL: [20, 'C'], LEASE: [25, 'C'], MORTGAGE_STATEMENT: [25, 'C'], RATES_NOTICE: [25, 'C'] };
    const table = req.bureau === 'EQUIFAX' ? eq : ex, unique = [...new Map(documents.map(doc => [doc.sha256, doc])).values()];
    const counts = {}, dates = settings.document_dates || {};
    const scored = unique.map(doc => {
      if (req.bureau === 'EQUIFAX' && ['BANK_STATEMENT', 'UTILITY_BILL'].includes(doc.document_kind)) {
        counts[doc.document_kind] = (counts[doc.document_kind] || 0) + 1;
        const date = new Date(dates[doc.file_id] || ''), cutoff = new Date();
        cutoff.setUTCMonth(cutoff.getUTCMonth() - (doc.document_kind === 'UTILITY_BILL' ? 6 : 12));
        if (counts[doc.document_kind] > 2 || !Number.isFinite(date.getTime()) || date > new Date() || date <= cutoff) return [0, ''];
      }
      return table[doc.document_kind] || [0, ''];
    });
    const declaration = req.bureau === 'EQUIFAX' && unique.some(doc => doc.document_kind === 'STATUTORY_DECLARATION');
    if (!declaration && (scored.reduce((n, row) => n + row[0], 0) < 100 || !scored.some(row => row[1] === 'A') || (req.bureau === 'EXPERIAN' && !scored.some(row => ['B', 'C'].includes(row[1]))))) result.push('Select the required 100 points and document groups.');
    for (const kind of ['BANK_STATEMENT', 'UTILITY_BILL']) if (req.bureau === 'EQUIFAX' && counts[kind] > 2) result.push('Select at most two ' + (kind === 'BANK_STATEMENT' ? 'bank statements from different accounts.' : 'paid utility bills from different providers.'));
  }
  if ((req.identity_count || req.address_count || req.points_required || req.support_count) && !settings.copies_confirmed) result.push('Confirm that your selected copies meet the bureau’s instructions, including any required document groups, dates, different accounts/providers and paid bills.');
  return result;
}
module.exports = { SOURCES, catalog, normalizeBureau, requirements, missing };
