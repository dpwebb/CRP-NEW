"""Explicit, per-region applicability records for the all-82 program.

Never executes legacy code. Never opens, reads or writes a consumer report. Never makes a network call.
Reads only: the canonical jurisdiction surface, the PHASE5-001O coverage ledger and the committed adapter
configs.

OWNER-ALL82-001 / B3, plan section 2: "National checks may serve multiple regions only through an explicit
supported applicability relation." A pattern such as `US-*` is NOT such a relation: it resolves a region
token by arithmetic on a string and confirms nothing. This builder replaces it with ONE NAMED ROW PER
REGION, each carrying:

  * the relation that reaches it and the basis for that reach;
  * what is recorded for that region in its own right (its own instrument, or the recorded absence of one);
  * the applicability state, so a region with no relation is visibly unresolved rather than silently covered;
  * what this region may execute, so applicability is never confused with execution.

The builder asserts, and fails loudly on:
  * a wildcard or pattern token in any relation, class or region row;
  * a canonical region with no row in a relation that claims to reach its whole country;
  * a row for a region that is not in the canonical enumeration;
  * a bound adapter that does not exist in `adapter-configs.json`;
  * a limb HELD for an anchor reason (`limbs_held_because_the_anchored_value_is_not_printed`) that is not a
    recorded, owner-accepted, statute-class ledger row carrying the period its hold reason quotes.

A limb is held rather than excluded when the rule is available and the admitted family prints both its
section and its anchor LABEL, but the captured evidence carries no value for that label. Holding it keeps the
advertised check count honest and names the exact work that would close it.

Run: python accelerated-launch/build_applicability_records.py
"""
from pathlib import Path
import json, hashlib

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).parent
ADAPTERS_DIR = OUT / 'adapters'

DATA_PATH = ROOT / 'consumer-wizard/dist/jurisdiction-data.js'
LEDGER_PATH = ROOT / 'SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json'
ADAPTER_CONFIG_PATH = ADAPTERS_DIR / 'adapter-configs.json'
RECORDS_PATH = ADAPTERS_DIR / 'applicability-records.json'

# --------------------------------------------------------------------------------------------------------
# The recorded basis for each relation.
#
# Every string below is either QUOTED FROM a recorded artifact, derived from a recorded field, or a NAMED
# DEPENDENCY. Nothing here decides a legal question, admits a rule or overrides the ledger's own posture.
# --------------------------------------------------------------------------------------------------------

FCRA_BASIS = ('the recorded prohibition is addressed to "any consumer reporting agency" with no geographic '
              'limitation, and the recorded enforcement provision empowers enforcement against "consumer '
              'reporting agencies and all other persons subject thereto ... irrespective of whether that person '
              'is engaged in commerce or meets any other jurisdictional tests under the Federal Trade '
              'Commission Act"')

FCRA_STATE_DEFINITION_FINDING = (
    '15 U.S.C. 1681a was retrieved and searched on 2026-10-01: NO definition of the term "State" was located in '
    'it, so no territorial listing may be borrowed from a definition this order did not see. The relation below '
    'rests on the recorded operative prohibition and its recorded enforcement provision, not on a definition.')

AU_BASIS = ('the recorded instrument is a COMMONWEALTH Act (Privacy Act 1988 (Cth)); the official register '
            'prints its Part I as "Saving of certain State and Territory laws", "Act to bind the Crown", '
            '"Extension to external Territories" and "Extra-territorial operation of Act", and the recorded '
            'retention limbs sit in that Act\'s Part IIIA credit-reporting tables')

CRAIN_BASIS = ('the recorded material is the Credit Reference Agency Information Notice retention table, which '
               'the ledger itself records as ACCEPTED_AS_RECORDED_MATERIAL_NOT_AS_A_STATUTE with the instrument-'
               'class screen GUIDANCE_OR_POLICY_SUMMARY. It is an industry notice, not a statute.')

PIPEDA_BASIS = ('the recorded row\'s own instrument-class screen is SCREEN_INCONCLUSIVE with '
                'instrument_class_confirmation_required true, its provision_or_citation is NOT RECORDED and its '
                'recorded legacy mapping carries verified=false. The relation to any specific region is '
                'therefore not established by the recorded corpus and is NOT inferred here.')

AU_REGIONS = ['AU-ACT', 'AU-NSW', 'AU-NT', 'AU-QLD', 'AU-SA', 'AU-TAS', 'AU-VIC', 'AU-WA']
GB_REGIONS = ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS']
US_STATE_CLASS = ['US-AK', 'US-AL', 'US-AR', 'US-AZ', 'US-CA', 'US-CO', 'US-CT', 'US-DC', 'US-DE', 'US-FL',
                  'US-GA', 'US-HI', 'US-IA', 'US-ID', 'US-IL', 'US-IN', 'US-KS', 'US-KY', 'US-LA', 'US-MA',
                  'US-MD', 'US-ME', 'US-MI', 'US-MN', 'US-MO', 'US-MS', 'US-MT', 'US-NC', 'US-ND', 'US-NE',
                  'US-NH', 'US-NJ', 'US-NM', 'US-NV', 'US-NY', 'US-OH', 'US-OK', 'US-OR', 'US-PA', 'US-RI',
                  'US-SC', 'US-SD', 'US-TN', 'US-TX', 'US-UT', 'US-VA', 'US-VT', 'US-WA', 'US-WI', 'US-WV',
                  'US-WY']
US_TERRITORY_CLASS = ['US-AS', 'US-GU', 'US-MP', 'US-PR', 'US-VI']
US_TERRITORY_NO_SOURCE_CLASS = ['US-UM']
CA_REGIONS = ['CA-AB', 'CA-BC', 'CA-MB', 'CA-NB', 'CA-NL', 'CA-NS', 'CA-NT', 'CA-NU', 'CA-ON', 'CA-PE',
              'CA-QC', 'CA-SK', 'CA-YT']

AU_RELATION = {
    'relation_id': 'AU-PRIVACY-ACT-1988-CTH-CREDIT-REPORTING',
    'adapter_ids': ['AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y',
                    'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y',
                    'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y'],
    'mode': 'EXPLICIT_REGION_LIST',
    'country': 'AU',
    'instrument': 'Privacy Act 1988 (Cth) — Part IIIA credit reporting (the recorded s. 20W and s. 20X tables)',
    'instrument_class': 'COMMONWEALTH_STATUTE',
    'instrument_class_source': 'ledger owner_acceptance.instrument_class_screen = STATUTE_OR_REGULATION for every recorded row in this relation',
    'source_entry_ids': ['CRP-LSRC-0422', 'CRP-LSRC-0423', 'CRP-LSRC-0424', 'CRP-LSRC-0425', 'CRP-LSRC-0426',
                         'CRP-LSRC-0427', 'CRP-LSRC-0428', 'CRP-LSRC-0429', 'CRP-LSRC-0430', 'CRP-LSRC-0431',
                         'CRP-LSRC-0432'],
    'territorial_reach_basis': AU_BASIS,
    'not_a_code_conversion': ('the relation is not the substitution of one region token for another. It is the '
                              'recorded fact that the instrument the rows cite is a Commonwealth statute, read '
                              'with that Act\'s own territorial provisions.'),
    'evidence': [
        {'evidence_id': 'AU-OFFICIAL-REGISTER',
         'kind': 'OFFICIAL_SOURCE_HEADING',
         'locator': 'https://www.legislation.gov.au/C2004A03712/latest/text',
         'retrieved': '2026-10-01',
         'what_it_establishes': 'the official Federal Register of Legislation prints the Act Part I as: 3 Saving of certain State and Territory laws; 4 Act to bind the Crown; 5A Extension to external Territories; 5B Extra-territorial operation of Act',
         'recorded_in_ledger_as': 'the source_locator every recorded row in this relation carries'},
        {'evidence_id': 'AU-PUB-012',
         'kind': 'CAPTURED_PUBLIC_REPORT_SAMPLE',
         'locator': 'SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-012.pdf',
         'sha256': '3f6d5b3787cd15ecc8bc4a1a231d16b27968b195fe49d9ee667e25ec6648b00a',
         'what_it_establishes': 'the exact report representation the ledger records as missing for these rows: a Consumer Credit Enquiries record printing "Enquiry Date", and an Overdue Accounts record printing the bureau\'s listing date and its own "Date will be Deleted"',
         'limits': 'a bureau-published sample linked from the official consumer route; it evidences ITS OWN structure, and the baseline records that its cover date and its URL date are not a proven current version date'},
    ],
    'region_state': 'CONFIRMED',
    'region_basis': AU_BASIS,
    'regions': AU_REGIONS,
    'execution': 'EXECUTABLE_ON_THE_ADMITTED_AU_CONSUMER_FAMILY',
    'execution_note': ('the three bound adapters run only on the admitted AU consumer format family and only on '
                       'records of their own kind. Every other limb recorded in this relation is listed below as '
                       'one the family does not print at all. The one limb that was HELD in the earlier B3 pass '
                       '(s. 20W item 1, consumer credit liability) is now BOUND: the family prints the section and '
                       'the record\'s own `Closed Date`, and the shared evaluation contract now carries a '
                       'per-record APPLICABLE / NOT_APPLICABLE / APPLICABILITY_UNRESOLVED expression, so a blank '
                       'Closed Date no longer has to be read as either open or closed.'),
    'limbs_bound_to_a_printed_anchor': [
        ('CRP-LSRC-0428', 's. 20W item 1 (consumer credit liability information)',
         "the record's own printed `Closed Date` (PUB-012 pages 6-7), with the record's own `Current Repayment "
         "Status` used where the closure label carries no value"),
    ],
    'limbs_not_executable_because_not_report_evidenced': [
        ('CRP-LSRC-0424', 's. 20W item 5 (payment information)', 'the family prints repayment history as a graphical grid; an unread cell is not evidence'),
        ('CRP-LSRC-0425', 's. 20W new arrangement information', 'not printed by the admitted family'),
        ('CRP-LSRC-0426', 's. 20X court proceedings', 'the admitted family prints no court-proceedings section'),
        ('CRP-LSRC-0427', 's. 20W item 7 (serious credit infringement)', 'not printed by the admitted family'),
        ('CRP-LSRC-0429', 's. 20W repayment history', 'the monthly-cell grid is graphical and is not read'),
        ('CRP-LSRC-0430', 's. 20X item 1 (personal insolvency — bankruptcy)', 'the admitted family prints no insolvency section'),
        ('CRP-LSRC-0431', 's. 20X items 2 and 3 (personal insolvency agreement)', 'not printed by the admitted family'),
        ('CRP-LSRC-0432', 'debt agreement', 'not printed by the admitted family'),
    ],
    # The one recorded limb that WAS held for an unprinted anchor. It is no longer held: the shared evaluation
    # contract now carries a per-record APPLICABLE / NOT_APPLICABLE / APPLICABILITY_UNRESOLVED expression, so a
    # blank `Closed Date` is resolved rather than assumed. It is listed as bound above, and the ledger row is
    # still validated against the corpus by the same check that validates a held limb.
    'limbs_held_because_the_anchored_value_is_not_printed': [],
}

US_RELATION = {
    'relation_id': 'US-FCRA-15-USC-1681C-COUNTRY-WIDE',
    'adapter_ids': ['FCRA-605A-5-US-NATIONAL-7Y', 'FCRA-605A-1-US-NATIONAL-10Y',
                    'FCRA-605A-2-US-NATIONAL-7Y', 'FCRA-605A-3-US-NATIONAL-7Y', 'FCRA-605A-4-US-NATIONAL-7Y'],
    'mode': 'EXPLICIT_REGION_LIST',
    'country': 'US',
    'instrument': 'Fair Credit Reporting Act, 15 U.S.C. 1681 et seq. (the recorded ss. 605(a)(1)-(a)(5) rows)',
    'instrument_class': 'FEDERAL_STATUTE',
    'instrument_class_source': 'ledger owner_acceptance.state = OWNER_ACCEPTED_LEGAL_AUTHORITY for every recorded row in this relation',
    'source_entry_ids': ['CRP-LSRC-0003', 'CRP-LSRC-0004', 'CRP-LSRC-0005', 'CRP-LSRC-0006', 'CRP-LSRC-0007'],
    'territorial_reach_basis': FCRA_BASIS,
    'recorded_finding_on_a_state_definition': FCRA_STATE_DEFINITION_FINDING,
    'not_a_code_conversion': ('a pattern such as US-* is replaced by ONE NAMED ROW PER REGION. Each row records '
                              'what is recorded for THAT region; the class it falls in decides what may be said '
                              'about it, and where a region has no recorded source the row says so instead of '
                              'inheriting one.'),
    'evidence': [
        {'evidence_id': 'US-OFFICIAL-605',
         'kind': 'OFFICIAL_SOURCE_TEXT',
         'locator': 'https://www.law.cornell.edu/uscode/text/15/1681c',
         'retrieved': '2026-10-01',
         'what_it_establishes': 'section 605(a) is addressed to "no consumer reporting agency" and contains no geographic limitation'},
        {'evidence_id': 'US-OFFICIAL-621',
         'kind': 'OFFICIAL_SOURCE_TEXT',
         'locator': 'https://www.law.cornell.edu/uscode/text/15/1681s',
         'retrieved': '2026-10-01',
         'what_it_establishes': 'section 621(a) empowers enforcement against "consumer reporting agencies and all other persons subject thereto" and states a violation is enforceable "irrespective of whether that person is engaged in commerce or meets any other jurisdictional tests under the Federal Trade Commission Act"'},
        {'evidence_id': 'US-OFFICIAL-603',
         'kind': 'OFFICIAL_SOURCE_SEARCH_RESULT',
         'locator': 'https://www.law.cornell.edu/uscode/text/15/1681a',
         'retrieved': '2026-10-01',
         'what_it_establishes': FCRA_STATE_DEFINITION_FINDING},
    ],
    'region_classes': [
        {'class': 'STATE_OR_FEDERAL_DISTRICT',
         'state': 'CONFIRMED_FEDERAL_PROHIBITION_APPLIES',
         'basis': FCRA_BASIS,
         'region_specific_report_retention_rule_recorded': 'NOT_REVIEWED_HERE — this relation records the federal reach only; a region-specific instrument is a separate record, never a sub-clause of this one',
         'regions': US_STATE_CLASS},
        {'class': 'TERRITORY_OR_POSSESSION_WITH_A_RECORDED_SOURCE',
         'state': 'CONFIRMED_FEDERAL_PROHIBITION_APPLIES',
         'basis': FCRA_BASIS,
         'region_specific_report_retention_rule_recorded': 'NONE — the ledger records an instrument for this region, and it is a limitation record, so no region-specific REPORT RETENTION rule is recorded',
         'no_region_specific_report_retention_rule_recorded': True,
         'regions': US_TERRITORY_CLASS},
        {'class': 'TERRITORY_WITH_NO_RECORDED_SOURCE',
         'state': 'CONFIRMED_FEDERAL_PROHIBITION_APPLIES_NO_REGIONAL_SOURCE_RECORDED',
         'basis': FCRA_BASIS,
         'region_specific_report_retention_rule_recorded': 'NONE — an exhaustive scan of the 437-row coverage ledger finds no row whose canonical_region_code is US-UM',
         'no_region_specific_report_retention_rule_recorded': True,
         'no_recorded_source_row': True,
         'explicit_resolution': ('the region is reached by the same recorded federal prohibition as every other '
                                 'United States region, and its absence of a recorded source row is RECORDED HERE '
                                 'RATHER THAN HIDDEN. No regional instrument is invented for it, and no regional '
                                 'instrument is propagated to it from another region.'),
         'regions': US_TERRITORY_NO_SOURCE_CLASS},
    ],
    'regions': [],
    'execution': 'EXECUTABLE_ON_THE_ADMITTED_US_CONSUMER_DISCLOSURE_FAMILY',
    'execution_note': ('applicability is resolved AND one limb now executes. The recorded research disposition that '
                       'no United States consumer disclosure had been admitted was superseded in this batch: the '
                       'captured official consumer-channel artifact PUB-001 is admitted as an evidenced STRUCTURAL '
                       'contract, its raster text is recovered by the authorized LOCAL OCR reader, and the shared '
                       'evaluation contract resolves each limb per record. The five federal limbs therefore report: '
                       'three public-record limbs NOT_APPLICABLE from the report\'s own printed statement; the '
                       'collection limb APPLICABILITY_UNRESOLVED, because this build evidences no presentation of an '
                       'account placed for collection; and the adverse-item limb APPLICABLE and MEASURED on the one '
                       'record that prints its own adverse payment rating.'),
    'limbs_bound_to_a_printed_anchor': [
        ('CRP-LSRC-0003', 's. 605(a)(5) (any other adverse item of information)',
         "the record's own printed adverse payment rating and its month (PUB-001, `Payment history guide` -> "
         '"30 days past due as of Jun 2015"), measured over seven years'),
    ],
    'limbs_resolved_for_applicability_without_an_anchor': [
        ('CRP-LSRC-0004', 's. 605(a)(1) (bankruptcy)', 'NOT_APPLICABLE from the report\'s own printed public-record absence statement'),
        ('CRP-LSRC-0005', 's. 605(a)(2) (civil suits, judgments and arrest records)', 'NOT_APPLICABLE from the same statement'),
        ('CRP-LSRC-0006', 's. 605(a)(3) (paid tax liens)', 'NOT_APPLICABLE from the same statement'),
        ('CRP-LSRC-0007', 's. 605(a)(4) (accounts placed for collection or charged off)', 'APPLICABILITY_UNRESOLVED: this build evidences no presentation of such an account'),
    ],
    'limbs_not_executable_because_not_report_evidenced': [
        ('the four limbs above', 'every started limb without a successor row', 'the report prints no value to age them from'),
    ],
}

GB_RELATION = {
    'relation_id': 'GB-UNITED-KINGDOM-NAMING-AND-REGION-RELATION',
    'adapter_ids': [],
    'mode': 'EXPLICIT_REGION_LIST',
    'country': 'GB',
    'instrument': 'Credit Reference Agency Information Notice (CRAIN) retention table',
    'instrument_class': 'GUIDANCE_OR_POLICY_SUMMARY',
    'instrument_class_source': 'ledger owner_acceptance.instrument_class_screen = GUIDANCE_OR_POLICY_SUMMARY for the recorded UK-wide rows',
    'source_entry_ids': ['CRP-LSRC-0405', 'CRP-LSRC-0406', 'CRP-LSRC-0410'],
    'territorial_reach_basis': CRAIN_BASIS,
    'not_a_code_conversion': ('the United Kingdom is not a canonical region. The four canonical regions are '
                              'resolved from instruments the ledger records against them in their own right, and '
                              'the residual UK-wide token is resolved by that recorded mapping rather than by '
                              'renaming a token.'),
    'residual_token_resolution': {
        'token': 'UK',
        'resolved_to_canonical_country': 'GB',
        'resolved_by': 'the ledger records canonical_region_code GB-ENG / GB-WLS / GB-SCT / GB-NIR against its own regional United Kingdom rows, so the country those regions belong to is GB',
        'does_not_establish': 'statutory applicability of any UK-wide content rule to any region',
    },
    'evidence': [
        {'evidence_id': 'GB-RECORDED-REGIONAL-INSTRUMENTS',
         'kind': 'LEDGER_RECORDED_REGION_CODES',
         'locator': 'SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json rows carrying canonical_region_code GB-*',
         'what_it_establishes': 'each canonical GB region carries its own recorded instrument and its own recorded canonical_region_code'},
        {'evidence_id': 'GB-CRAIN',
         'kind': 'LEDGER_ACCEPTANCE_POSTURE',
         'locator': 'https://www.experian.co.uk/legal/crain/data-retention-periods (the source_locator the recorded rows carry)',
         'what_it_establishes': CRAIN_BASIS},
    ],
    'region_state': 'RELATION_RECORDED_EXECUTION_BLOCKED',
    'region_basis': ('the region is a canonical region of the recorded country and its own recorded instrument is '
                     'listed. The UK-wide candidate rows are recorded as material, not as a statute, so no bound '
                     'adapter is created for them and no statutory applicability is asserted.'),
    'regions': GB_REGIONS,
    'execution': 'NOT_EXECUTED_INSTRUMENT_RECORDED_AS_GUIDANCE_NOT_A_STATUTE',
    'execution_note': ('a code conversion from "UK" to "GB" is not proof of statutory applicability, and the '
                       'recorded instrument is an industry notice. The blocker is named rather than papered over: '
                       'an owner decision admitting guidance material as a retention basis, or a recorded '
                       'statutory instrument, would be required before a bound adapter could exist.'),
    'limbs_not_executable_because_not_a_statute': [
        ('CRP-LSRC-0405', 'uk.judgment.6y'),
        ('CRP-LSRC-0406', 'uk.insolvency.6y'),
        ('CRP-LSRC-0410', 'uk.search.12m'),
    ],
}

CA_RELATION = {
    'relation_id': 'CA-PIPEDA-FEDERAL-RECORDED-COUNTRY-WIDE',
    'adapter_ids': [],
    'mode': 'EXPLICIT_REGION_LIST',
    'country': 'CA',
    'instrument': 'PIPEDA (S.C. 2000, c. 5) — as the recorded row names it',
    'instrument_class': 'UNRESOLVED',
    'instrument_class_source': 'ledger owner_acceptance.instrument_class_screen = SCREEN_INCONCLUSIVE, instrument_class_confirmation_required = true',
    'source_entry_ids': ['CRP-LSRC-0314'],
    'territorial_reach_basis': PIPEDA_BASIS,
    'not_a_code_conversion': ('the recorded row is a country-wide source, but the relation from it to a named '
                              'region is not established. Every region is listed and its state says so; nothing '
                              'is propagated and no provincial instrument is invented.'),
    'evidence': [
        {'evidence_id': 'CA-RECORDED-ROW-POSTURE',
         'kind': 'LEDGER_ACCEPTANCE_POSTURE',
         'locator': 'SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json row CRP-LSRC-0314',
         'what_it_establishes': PIPEDA_BASIS},
    ],
    'region_state': 'UNRESOLVED_RELATION_NOT_ESTABLISHED',
    'region_basis': PIPEDA_BASIS,
    'regions': CA_REGIONS,
    'execution': 'NOT_EXECUTED_RELATION_UNRESOLVED',
    'execution_note': ('the two CA-NS adapters are EXACT-region and are not reached through this relation. They '
                       'keep their own record, their own presentation and their own restrictions, unchanged.'),
    'region_exceptions': [
        {'region': 'CA-NS',
         'state': 'EXACT_REGION_ASSOCIATION_RECORDED_SEPARATELY',
         'note': 'CA-NS carries its own exact-region accepted records and its own two bound adapters; this country-wide relation neither reaches it nor alters it.'},
    ],
}

GB_ACCURACY_RELATION = {
    'relation_id': 'GB-UK-GDPR-ACCURACY-COUNTRY-WIDE',
    'adapter_ids': ['GB-UK-GDPR-ART5-1-D-ART16-ACCURACY'],
    'mode': 'EXPLICIT_REGION_LIST',
    'country': 'GB',
    'instrument': 'Regulation (EU) 2016/679 (United Kingdom General Data Protection Regulation) — Articles 5(1)(d) and 16',
    'instrument_class': 'UK_WIDE_STATUTE_OR_REGULATION',
    'instrument_class_source': 'ledger owner_acceptance.instrument_class_screen = STATUTE_OR_REGULATION for CRP-LSRC-0407, with instrument_class_confirmation_required = false',
    'source_entry_ids': ['CRP-LSRC-0407'],
    'territorial_reach_basis': 'the official publisher prints the geographical-extent marker on the provisions themselves (Article 5 U.K. and Article 16 U.K., with CHAPTER II U.K. and CHAPTER III U.K.), publishes the instrument under the title "(United Kingdom General Data Protection Regulation)" and keeps it up to date with amendments made by UK legislation, so the provision applies throughout the United Kingdom and needs no nation-specific identification; the recorded limitation instruments for these regions differ between nations and are NOT used for this relation',
    'not_a_code_conversion': "This relation is not a rename of the recorded UK token: it rests on the instrument's own recorded geographical extent, which the publisher prints on the provisions themselves. The off-report token route the ledger records as NOT adopted (resolving a bare UK token from a locked session nation or an account profile) is not used.",
    'evidence': [{'evidence_id': 'GB-UK-GDPR-OFFICIAL-EXTENT', 'kind': 'OFFICIAL_PUBLISHER_RETRIEVAL', 'locator': "https://www.legislation.gov.uk/eur/2016/679/article/5 and https://www.legislation.gov.uk/eur/2016/679/article/16 (provision text via the publisher's data.xht?view=snippet pages)", 'what_it_establishes': 'the instrument is published under the title "(United Kingdom General Data Protection Regulation)", is kept up to date with amendments made by UK legislation, and its retrieved provisions carry the publisher\'s "U.K." geographical-extent marker'}, {'evidence_id': 'GB-RECORDED-REGIONAL-INSTRUMENTS', 'kind': 'LEDGER_RECORDED_REGION_CODES', 'locator': 'SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json rows carrying canonical_region_code GB-*', 'what_it_establishes': 'each canonical GB region carries its own recorded instrument and its own recorded canonical_region_code'}, {'evidence_id': 'GB-PROVISION-RETRIEVAL-RECORD', 'kind': 'SOURCE_CAPTURE', 'locator': 'SOURCE_CAPTURES/GB-UK-GDPR-ACCURACY/crp-lsrc-0407-provision-retrieval.json', 'what_it_establishes': 'the retrieved provision text, the applicable edition, the extent basis, the retrieval limitation and the attribution check'}],
    'region_state': 'CONFIRMED_UK_WIDE_STATUTE_EXTENT',
    'region_basis': 'the official publisher prints the geographical-extent marker on the provisions themselves (Article 5 U.K. and Article 16 U.K., with CHAPTER II U.K. and CHAPTER III U.K.), publishes the instrument under the title "(United Kingdom General Data Protection Regulation)" and keeps it up to date with amendments made by UK legislation, so the provision applies throughout the United Kingdom and needs no nation-specific identification; the recorded limitation instruments for these regions differ between nations and are NOT used for this relation',
    'regions': ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS'],
    'execution': 'BOUND_TO_A_RECORDED_STATUTE_ADAPTER',
    'execution_note': "the adapter reads the report's own two printed values on one ordinary account. It performs no retention arithmetic, states no period and claims no commencement date.",
    'uk_wide_source_entry_ids': ['CRP-LSRC-0407'],
}

RELATIONS = [AU_RELATION, US_RELATION, GB_RELATION, CA_RELATION, GB_ACCURACY_RELATION]

LIMITS = [
    'Applicability is not execution. A region may carry a confirmed relation and still execute no check.',
    'A relation states what the RECORDED corpus establishes about reach. It admits no rule and creates no finding.',
    'No wildcard, pattern or defaulted region exists in this file; every row names one canonical region.',
    'A region with no recorded source row is recorded as such. No instrument is invented for it and none is propagated to it.',
    'This file never opens, reads or writes a consumer report and makes no network call.',
]


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def canonical_regions():
    raw = DATA_PATH.read_text(encoding='utf-8-sig')
    data = json.loads(raw.split('window.CRP_JURISDICTION_DATA = ', 1)[1].strip().rstrip(';'))
    return {r['region_code']: r['country_code'] for r in data['regions']}


def recorded_instruments_by_region(ledger_rows):
    """What the ledger records for each region IN ITS OWN RIGHT. Nothing is inferred from a country."""
    out = {}
    for row in ledger_rows:
        code = row['established_jurisdiction_associations'].get('canonical_region_code')
        if not code:
            continue
        if row['owner_acceptance']['state'] != 'OWNER_ACCEPTED_LEGAL_AUTHORITY':
            continue
        entry = out.setdefault(code, {'instruments': [], 'source_entry_ids': []})
        entry['instruments'].append(row['legacy_statute_or_provision'].get('instrument_title') or 'NOT RECORDED')
        entry['source_entry_ids'].append(row['source_entry_id'])
    for entry in out.values():
        entry['instruments'] = sorted(set(entry['instruments']))
        entry['source_entry_ids'] = sorted(set(entry['source_entry_ids']))
    return out


def build():
    regions = canonical_regions()
    ledger_rows = json.loads(LEDGER_PATH.read_text(encoding='utf-8-sig'))['rows']
    assert len(ledger_rows) == 437, 'the coverage ledger changed size: %d' % len(ledger_rows)
    adapter_config = json.loads(ADAPTER_CONFIG_PATH.read_text(encoding='utf-8-sig'))
    configured_ids = {a['adapter_id'] for a in adapter_config['adapters']}
    instruments = recorded_instruments_by_region(ledger_rows)
    ledger_by_id = {row['source_entry_id']: row for row in ledger_rows}

    problems = []
    payload_relations = []
    index = {}

    for relation in RELATIONS:
        classes = relation.get('region_classes')
        uk_wide = relation.get('uk_wide_source_entry_ids')
        rows = []
        if classes:
            for cls in classes:
                for code in cls['regions']:
                    rows.append({
                        'region': code,
                        'class': cls['class'],
                        'state': cls['state'],
                        'basis': cls['basis'],
                        'region_specific_report_retention_rule_recorded': cls['region_specific_report_retention_rule_recorded'],
                        'no_region_specific_report_retention_rule_recorded': cls.get('no_region_specific_report_retention_rule_recorded', False),
                        'no_recorded_source_row': cls.get('no_recorded_source_row', False),
                        'explicit_resolution': cls.get('explicit_resolution'),
                    })
        else:
            exceptions = {e['region']: e for e in relation.get('region_exceptions', [])}
            for code in relation['regions']:
                exception = exceptions.get(code)
                rows.append({
                    'region': code,
                    'class': 'REGION',
                    'state': exception['state'] if exception else relation['region_state'],
                    'basis': exception['note'] if exception else relation['region_basis'],
                    'region_specific_report_retention_rule_recorded': None,
                    'no_region_specific_report_retention_rule_recorded': False,
                    'no_recorded_source_row': code not in instruments,
                    'explicit_resolution': None,
                })

        for row in rows:
            code = row['region']
            if '*' in code or '?' in code:
                problems.append('%s: region row "%s" is a pattern token' % (relation['relation_id'], code))
            if code not in regions:
                problems.append('%s: region row "%s" is not in the canonical enumeration' % (relation['relation_id'], code))
            elif regions[code] != relation['country']:
                problems.append('%s: region row "%s" belongs to %s, not %s'
                                % (relation['relation_id'], code, regions[code], relation['country']))
            recorded = instruments.get(code, {'instruments': [], 'source_entry_ids': []})
            if uk_wide:
                # This relation's applicable instrument is recorded UK-wide, so the row records that
                # source rather than the region's own instruments. Both admitted row shapes are
                # declared here, so no emitted shape lives outside the model.
                row['uk_wide_source_entry_ids_for_this_region'] = list(uk_wide)
                row['recorded_source_entry_ids_for_this_region'] = list(uk_wide)
            else:
                row['regional_instruments_recorded'] = recorded['instruments']
                row['recorded_source_entry_ids_for_this_region'] = recorded['source_entry_ids']

        named = {row['region'] for row in rows}
        expected = {code for code, country in regions.items() if country == relation['country']}
        if named != expected:
            problems.append('%s: %d region rows do not equal the canonical %s set (missing %s; extra %s)'
                            % (relation['relation_id'], len(named), relation['country'],
                               sorted(expected - named), sorted(named - expected)))

        for adapter_id in relation['adapter_ids']:
            if adapter_id not in configured_ids:
                problems.append('%s: bound adapter %s is not in adapter-configs.json'
                                % (relation['relation_id'], adapter_id))

        # A limb held for an ANCHOR reason must actually be a recorded, owner-accepted statute-class row with a
        # recorded period. The hold reason quotes the ledger, so the ledger is checked here rather than trusted.
        for held in relation.get('limbs_held_because_the_anchored_value_is_not_printed', []):
            ledger_row = ledger_by_id.get(held[0])
            if ledger_row is None:
                problems.append('%s: held limb %s is not a recorded source row'
                                % (relation['relation_id'], held[0]))
                continue
            recorded = ledger_row['legacy_statute_or_provision'].get('effective_information_as_recorded', '')
            if 'years=2' not in recorded:
                problems.append('%s: held limb %s does not record a two-year period (recorded: %r)'
                                % (relation['relation_id'], held[0], recorded))
            acceptance = ledger_row['owner_acceptance']
            if acceptance['state'] != 'OWNER_ACCEPTED_LEGAL_AUTHORITY' \
                    or acceptance['instrument_class_screen'] != 'STATUTE_OR_REGULATION':
                problems.append('%s: held limb %s is not an owner-accepted statute-class row'
                                % (relation['relation_id'], held[0]))

        # A limb BOUND to a printed anchor must be the same kind of row, must name the printed field it is bound
        # to, and must be bound by an adapter that exists and declares that anchor. This is the non-vacuous
        # counterpart of the held-limb check: it fails if a limb is bound to an anchor nothing prints.
        for bound in relation.get('limbs_bound_to_a_printed_anchor', []):
            ledger_row = ledger_by_id.get(bound[0])
            if ledger_row is None:
                problems.append('%s: bound limb %s is not a recorded source row'
                                % (relation['relation_id'], bound[0]))
                continue
            recorded = ledger_row['legacy_statute_or_provision'].get('effective_information_as_recorded', '')
            if 'years=' not in recorded:
                problems.append('%s: bound limb %s records no period at all (recorded: %r)'
                                % (relation['relation_id'], bound[0], recorded))
            acceptance = ledger_row['owner_acceptance']
            if acceptance['state'] != 'OWNER_ACCEPTED_LEGAL_AUTHORITY' \
                    or acceptance['instrument_class_screen'] != 'STATUTE_OR_REGULATION':
                problems.append('%s: bound limb %s is not an owner-accepted statute-class row'
                                % (relation['relation_id'], bound[0]))
            if not any(bound[0] in (a.get('ledger_row_ids') or []) for a in adapter_config['adapters']):
                problems.append('%s: bound limb %s is named as bound but no configured adapter binds it'
                                % (relation['relation_id'], bound[0]))
            if not isinstance(bound[2], str) or 'print' not in bound[2].lower():
                problems.append('%s: bound limb %s does not name the printed field it is anchored to'
                                % (relation['relation_id'], bound[0]))

        for row in rows:
            index.setdefault(row['region'], []).append({
                'relation_id': relation['relation_id'],
                'instrument': relation['instrument'],
                'instrument_class': relation['instrument_class'],
                'state': row['state'],
                'execution': relation['execution'],
                'bound_adapter_ids': relation['adapter_ids'],
                'confirmed': row['state'].startswith('CONFIRMED'),
            })

        emitted = dict(relation)
        emitted['region_rows'] = rows
        emitted['region_row_count'] = len(rows)
        emitted.pop('region_classes', None)
        emitted.pop('uk_wide_source_entry_ids', None)
        payload_relations.append(emitted)

    for code in regions:
        if code not in index:
            problems.append('canonical region %s carries no applicability row at all' % code)

    if problems:
        raise SystemExit('APPLICABILITY RECORD PROBLEMS:\n  - ' + '\n  - '.join(problems))
    return regions, index, payload_relations


def build_payload():
    regions, index, payload_relations = build()
    confirmed_regions = sorted(c for c, rows in index.items() if any(r['confirmed'] for r in rows))
    executable_regions = sorted(c for c, rows in index.items()
                                if any(r['execution'].startswith('EXECUTABLE')
                                       or r['execution'] == 'BOUND_TO_A_RECORDED_STATUTE_ADAPTER'
                                       for r in rows))
    payload = {
        'artifact': 'applicability-records.json',
        'catalog_owner': 'OWNER-ALL82-001',
        'batch': 'B3',
        'authority': 'CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md section 2 — a national check may serve a region only through an explicit supported applicability relation',
        'purpose': 'replace every pattern-based or mechanically-derived national relation with one named, evidenced applicability record per canonical region',
        'rules': [
            'One row per canonical region. No wildcard, no pattern, no defaulting.',
            'Applicability and execution are separate fields. A confirmed relation does not imply a runnable check.',
            'A region with no recorded source row says so; nothing is invented for it and nothing is propagated to it.',
            'A recorded instrument that is guidance, not a statute, does not become a statute by being named in a relation.',
        ],
        'inputs': {
            'coverage_ledger': digest(LEDGER_PATH),
            'jurisdiction_data': digest(DATA_PATH),
            'adapter_configs': digest(ADAPTER_CONFIG_PATH),
        },
        'counts': {
            'canonical_regions': len(regions),
            'relations': len(payload_relations),
            'region_rows': len({row['region']
                                for r in payload_relations for row in r['region_rows']}),
            'regions_with_a_confirmed_relation': len(confirmed_regions),
            'regions_with_an_executable_relation': len(executable_regions),
        },
        'regions_with_a_confirmed_relation': confirmed_regions,
        'regions_with_an_executable_relation': executable_regions,
        'relations': payload_relations,
        'region_applicability_index': {code: index[code] for code in sorted(index)},
        'assertions': {
            'no_pattern_token_in_any_region_row': True,
            'every_canonical_region_carries_a_row': True,
            'every_relation_region_set_equals_its_canonical_country_set': True,
            'every_bound_adapter_exists_in_adapter_configs': True,
            'every_held_limb_is_a_recorded_owner_accepted_two_year_row': True,
            'every_bound_anchor_limb_is_a_recorded_owner_accepted_row_bound_by_a_configured_adapter': True,
        },
        'limits': LIMITS,
    }
    ADAPTERS_DIR.mkdir(parents=True, exist_ok=True)
    RECORDS_PATH.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')
    return payload


if __name__ == '__main__':
    result = build_payload()
    print(json.dumps({
        'relations': [r['relation_id'] for r in result['relations']],
        'counts': result['counts'],
        'regions_with_an_executable_relation': result['regions_with_an_executable_relation'],
        'assertions': result['assertions'],
    }, indent=1))
