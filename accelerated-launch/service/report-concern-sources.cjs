'use strict';

/* Bounded mappings for completed report concerns. These records supply context,
 * never an automatic finding that a privacy statute was breached. The locality
 * finder was verified on the date below; it is not a historical report snapshot. */
const VERSION = '2026-10-11.1';
const SOURCES = Object.freeze({
  AU_MELBOURNE: Object.freeze({ publisher: 'Australia Post', title: 'Melbourne postcode finder',
    url: 'https://auspost.com.au/postcode/melbourne', version: 'verified 2026-10-11',
    scope: 'AU locality and state', verified_on: '2026-10-11' }),
  AU_CANBERRA: Object.freeze({ publisher: 'Australia Post', title: 'Canberra postcode finder',
    url: 'https://auspost.com.au/postcode/canberra', version: 'verified 2026-10-11',
    scope: 'AU locality and state', verified_on: '2026-10-11' }),
  CA_TORONTO: Object.freeze({ publisher: 'City of Toronto', title: 'Access city information or records',
    url: 'https://www.toronto.ca/city-government/accountability-operations-customer-service/access-city-information-or-records/',
    version: 'verified 2026-10-11', scope: 'Toronto M5H 2N2 in Ontario', verified_on: '2026-10-11' }),
  CA_HALIFAX: Object.freeze({ publisher: 'Halifax Regional Municipality', title: 'Public hearings',
    url: 'https://www.halifax.ca/city-hall/regional-council/public-hearings', version: 'verified 2026-10-11',
    scope: 'Halifax B3J 3A5 in Nova Scotia', verified_on: '2026-10-11' }),
  US_WASHINGTON: Object.freeze({ publisher: 'United States Postal Service', title: 'Address Information API',
    section: 'Section 4.3.1, CityStateLookup example',
    url: 'https://www.usps.com/business/web-tools-apis/address-information-api.htm', version: 'verified 2026-10-11',
    scope: 'Washington 20024 in the District of Columbia', verified_on: '2026-10-11' }),
  US_BEVERLY_HILLS: Object.freeze({ publisher: 'United States Postal Service', title: 'Eagle magazine, January 2026',
    section: 'Page 18', url: 'https://about.usps.com/resources/eaglemag/em20260129.pdf', version: 'January 2026',
    scope: 'Beverly Hills 90210 in California', verified_on: '2026-10-11' }),
  AU_CREDIT_CATEGORIES: Object.freeze({ publisher: 'Australian Government',
    title: 'Privacy Regulations 2025', section: 'Section 6', version: 'F2025L01377',
    url: 'https://www.legislation.gov.au/F2025L01377/asmade/2025-11-14/text/original/pdf',
    effective_from: '2026-04-01', scope: 'Australian consumer credit liability information' }),
  AU_TFN: Object.freeze({ publisher: 'Australian Government', title: 'Privacy (Tax File Number) Rule 2015',
    section: 'Sections 8 and 10', version: 'F2015L00249',
    url: 'https://www.legislation.gov.au/F2015L00249/asmade/2015-03-04/text/original/pdf',
    scope: 'Australian tax file number handling; returning a TFN to its owner is permitted' }),
  AU_ACCESS: Object.freeze({ publisher: 'Australian Government', title: 'Privacy (Credit Reporting) Code 2025',
    section: 'Sections 19(6) and 19(16)', version: 'F2025L00385',
    url: 'https://www.oaic.gov.au/__data/assets/pdf_file/0014/250160/24-March-2025-Privacy-Credit-Reporting-Code-2025.PDF',
    scope: 'Australian credit reporting access and clear explanations' })
});
const AU_LOCALITIES = Object.freeze({
  MELBOURNE: Object.freeze({ state: 'VIC', source: SOURCES.AU_MELBOURNE }),
  CANBERRA: Object.freeze({ state: 'ACT', source: SOURCES.AU_CANBERRA })
});

/* City names and postal prefixes can cross borders. Outside the two verified
 * AU locality mappings, require the exact printed locality/code pair. Unknown
 * pairs establish neither an error nor accuracy. No universal prefix rule. */
const LOCALITY_MAPPINGS = Object.freeze({
  AU: Object.freeze(Object.entries(AU_LOCALITIES).map(([locality, mapping]) => Object.freeze({ locality, ...mapping }))),
  CA: Object.freeze([
    Object.freeze({ locality: 'TORONTO', postcode: 'M5H2N2', state: 'ON', source: SOURCES.CA_TORONTO }),
    Object.freeze({ locality: 'HALIFAX', postcode: 'B3J3A5', state: 'NS', source: SOURCES.CA_HALIFAX })
  ]),
  US: Object.freeze([
    Object.freeze({ locality: 'WASHINGTON', postcode: '20024', state: 'DC', source: SOURCES.US_WASHINGTON }),
    Object.freeze({ locality: 'BEVERLY HILLS', postcode: '90210', state: 'CA', source: SOURCES.US_BEVERLY_HILLS })
  ])
});

module.exports = { VERSION, SOURCES, AU_LOCALITIES, LOCALITY_MAPPINGS };
