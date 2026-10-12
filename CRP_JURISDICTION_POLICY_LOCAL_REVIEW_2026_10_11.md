# Jurisdiction policy source candidate — October 11, 2026

## Implemented locally

Eight variants: US, CA, UK and AU Privacy Policy and Terms & Conditions. Metadata uses **Credit Regulator Pro a division of COMPND SYSTEMS LTD**, **support@creditregulatorpro.com**, and **December 13, 2026**. Country.is resolves the country; GeoJS provides a matching province/state when needed. The current actual provider preflight returned CA / CA-NS / adult age 19, without recording the IP or sending report/account information.

The source uses the existing application routes, static allowlist, local fonts and shared trusted-proxy IP parser. New public route: `/api/legal-documents/:kind`. New pages: `/privacy-policy.html`, `/terms-and-conditions.html`. Navigation links are in the homepage and workspace footers. The original privacy dashboard, deletion, assessment jurisdiction, reporting rules, packets, billing and signup fields are unchanged.

## Publication boundary

**No real local mailing addresses were found, supplied or activated.** `legal-documents/owner-config.json` keeps all four address entries null. The actual API returns 503 rather than publishing an invented address. A country requires an ACTIVE_VERIFIED address and a verification reference before its document can be returned. Local fixtures are explicitly labelled FICTIONAL PREVIEW ONLY and exist only in injected local preview configuration.

The addresses cannot be created by adding street text to a document. They require owner-controlled existing premises/mailboxes or an activated receiving/forwarding service. A Directory search did not identify a suitable virtual-address provisioning tool. Regus offers a potential manual setup path; no exact location, final quote, identity verification, contract, payment or mail receipt test has been completed. No provider was contacted.

The material document content is a source candidate, not a claim that every privacy/consumer-law duty is fulfilled. The pre-existing draft's unresolved actual-provider processing countries, backup retention/deletion timing and complete jurisdiction-specific notice obligations remain publication review items; this work does not invent those facts or waive mandatory rights. UK cooling-off rights are not automatically waived by using the service. Australian guarantees and applicable Canadian/US nonwaivable rights remain preserved.

## Local verification

```text
node accelerated-launch/service/tests/run-tests.cjs fh-jurisdiction-policies ax-consumer-privacy k-ui-smoke u-hardening --receipt=accelerated-launch/service/out/jurisdiction-policies-2026-10-11/focused-final-02.json
384 passed / 0 failed / 0 skipped
```

155 policy assertions cover real HTTP routing, eight country/document combinations, exact metadata, adult age differences, proxy-observed IP, conflicting geolocation responses, provider failure, country/currency query spoofing, unknown location, invalid document kinds, valid UTF-8, damaged characters and verified-address publication guards. Existing privacy/deletion (25), UI (96) and security (108) checks passed.

Actual local Chrome renders passed for all eight variants at **1440, 390, 768 and 320px**: 32 page captures, no horizontal overflow, visible keyboard focus. The browser's unpublished-document error state uses an explicitly mocked 503 response; the runtime guard is tested separately through the real API. Representative refreshed desktop/mobile pages were visually inspected; an initial encoding defect was corrected, retested and recaptured.

Preview URLs (fictional only; local process must remain running):

- CA: http://127.0.0.1:43807/privacy-policy.html
- US: http://127.0.0.1:43808/privacy-policy.html
- UK: http://127.0.0.1:43809/privacy-policy.html
- AU: http://127.0.0.1:43810/privacy-policy.html

Replace the filename with `terms-and-conditions.html` for Terms. Evidence: `accelerated-launch/service/out/jurisdiction-policies-2026-10-11/`; screenshots: `output/playwright/jurisdiction-policies-2026-10-11/`.

| Status | Actual outcome |
|---|---|
| Source implementation | Local candidate, focused and browser checks passed |
| Full product regression / implementation closure | Pending final address/document configuration and required full run |
| Staging verification | Pending; no staging activation |
| Production readiness | Pending; no production change |

Candidate manifest contains **158 files**, including all nine policy JSON assets. The manifest inclusion change was verified. This is not a package or deployed-build receipt. Live production remains `crp-v1-378b2463903ad652` from the separate native-currency release.

## Source references

Checked October 11, 2026. These references support specific text and age mappings; they do not certify the complete documents or resolve operational facts.

- [Canadian province/territory age-of-majority table](https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/minor-children.html): six provinces use 18; the remaining Canadian provinces/territories use 19.
- [Nebraska Revised Statutes 43-2101](https://nebraskalegislature.gov/laws/statutes.php?statute=43-2101): general majority at 19; the statute also contains specific capacity exceptions.
- [Alabama Code 26-1-1](https://alison.legislature.state.al.us/code-of-alabama?section=26-1-1) and [NCSL majority/support source table](https://www.ncsl.org/human-services/termination-of-child-support/1000): Alabama 19 and Mississippi 21. Child-support extension ages are not substituted for general adult age; US general-state mapping remains 18 outside the three majority exceptions. Specific emancipation/capacity exceptions are not an automated signup gate.
- [Family Law Reform Act 1969](https://www.legislation.gov.uk/ukpga/1969/46/part/I): England/Wales majority 18. [Scotland Act](https://www.legislation.gov.uk/ukpga/1969/39/contents) and [Northern Ireland Act section 1](https://www.legislation.gov.uk/apni/1969/28/section/1) likewise provide 18; the latter was read from the official XHTML using direct retrieval after the browser search reader rejected its content type. [ALRC discussion](https://www.alrc.gov.au/publication/seen-and-heard-priority-for-children-in-the-legal-process-alrc-report-84/18-childrens-involvement-in-criminal-justice-processes/age-thresholds-in-criminal-justice-processes/) supports general Australian adult age 18.
- [Canadian privacy-law scope](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada) and [access/correction guidance](https://www.priv.gc.ca/en/privacy-topics/accessing-personal-information/api_bus/): federal/provincial distinctions and consumer requests.
- [FTC consumer privacy guidance](https://www.ftc.gov/business-guidance/privacy-security/consumer-privacy) and [California CCPA guidance](https://www.oag.ca.gov/privacy/ccpa): accurate practices and applicable state rights; no unsupported assertion that CRP satisfies applicability thresholds.
- [ICO privacy-notice guidance](https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/cookies-and-privacy-notices-in-detail/) and [UK distance-contract cancellation rules](https://www.legislation.gov.uk/uksi/2013/3134/part/3/made).
- [Australian Privacy Principles](https://www.oaic.gov.au/privacy/australian-privacy-principles/read-the-australian-privacy-principles) and [ACCC consumer guarantees](https://www.accc.gov.au/consumers/buying-products-and-services/consumer-rights-and-guarantees).
- [GeoJS endpoint documentation](https://www.geojs.io/docs/v1/endpoints/geo/), [privacy policy](https://www.geojs.io/privacy/) and [terms](https://www.geojs.io/tos/): country/region fields and service boundary. Actual only-IP preflight was recorded separately.
- Potential mailing-address setup: [Regus Canada](https://www.regus.com/en/ca/virtual-offices), [UK](https://www.regus.com/en-gb/united-kingdom/virtual-offices), [Australia](https://www.regus.com/en/au/virtual-offices). US page retrieval was unsuccessful, so current US availability/pricing is not certified. No provider address is published as CRP's address.
