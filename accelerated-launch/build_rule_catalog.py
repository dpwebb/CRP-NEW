"""Local, metadata-only legacy rule-adapter catalog for the all-82 program.

Never executes legacy code. Never opens, reads or writes a consumer report. Never makes a network call.
Reads only: the PHASE5-001O coverage ledger, the jurisdiction catalog, the committed adapter configs and
(read-only, digest-only) the legacy TypeScript inventory.

OWNER-ALL82-001 / B1. The catalog separates, and keeps separate:
  * EXECUTABLE_RULE_CANDIDATE   — a recorded content rule whose recorded row carries a PERIOD and a
                                  recorded legacy mapping. A candidate, never a working function.
  * CONTENT_RULE_NOT_PERIOD_EXECUTABLE — a recorded content/duty rule with no period to compare against.
  * LIMITATION_RECORD / AUTHORITY_RECORD / CITATION_RECORD / GAP / REFUSAL — catalogued separately, never
                                  counted as executable rules.

Run: python accelerated-launch/build_rule_catalog.py
"""
from pathlib import Path
import json, hashlib, csv
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).parent
ADAPTERS_DIR = OUT / 'adapters'
LEGACY = Path(r'C:\Users\webbd\crp-credit-app')

LEDGER_PATH = ROOT / 'SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json'
DATA_PATH = ROOT / 'consumer-wizard/dist/jurisdiction-data.js'
ADAPTER_CONFIG_PATH = ADAPTERS_DIR / 'adapter-configs.json'
APPLICABILITY_RECORDS_PATH = ADAPTERS_DIR / 'applicability-records.json'
CATALOG_PATH = ADAPTERS_DIR / 'rule-adapter-catalog.json'
CATALOG_CSV_PATH = ADAPTERS_DIR / 'rule-adapter-catalog.csv'

# Populated by build() from `applicability-records.json`. The per-region applicability report below reads it,
# so this builder resolves a country-wide relation exactly the way the runtime does: by looking the region up.
RELATION_BY_ID = {}

EXECUTABLE = 'EXECUTABLE_RULE_CANDIDATE'
CONTENT_NOT_PERIOD = 'CONTENT_RULE_NOT_PERIOD_EXECUTABLE'
PASSTHROUGH = ('LIMITATION_RECORD', 'AUTHORITY_RECORD', 'CITATION_RECORD', 'GAP', 'REFUSAL')

MAPPED_STATES = ('ESTABLISHED', 'ESTABLISHED_MULTIPLE_RECORDED_ROWS')


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def read_json(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))


def numeric_years(row):
    """The period the recorded legacy row carries, or None. Never inferred from prose."""
    for ref in row['existing_operational_mapping'].get('legacy_rule_references') or []:
        value = ref.get('years')
        if value in (None, '', 'null'):
            continue
        try:
            return int(str(value).strip())
        except (TypeError, ValueError):
            continue
    return None


def num_years(refs):
    for ref in refs:
        value = ref.get('years')
        if value in (None, '', 'null'):
            continue
        try:
            return int(str(value).strip())
        except (TypeError, ValueError):
            continue
    return None


def period_start(refs):
    for ref in refs:
        value = ref.get('starts')
        if value:
            return value
    return None


def rule_kinds(refs):
    out = set()
    for ref in refs:
        for k in (ref.get('kinds') or []):
            out.add(str(k))
        if ref.get('kind'):
            out.add(str(ref['kind']))
    return out


def rule_ids(refs):
    out = set()
    for ref in refs:
        for field in ('id', 'ruleId', 'rule_id'):
            if ref.get(field):
                out.add(str(ref[field]))
    return out


def classify(row):
    rt = row['record_type']
    if rt == 'CONTENT_RULE':
        if row['existing_operational_mapping']['state'] in MAPPED_STATES and numeric_years(row) is not None:
            return EXECUTABLE
        return CONTENT_NOT_PERIOD
    assert rt in PASSTHROUGH, 'unrecognised record_type ' + str(rt)
    return rt


# Legacy evaluator primitives, MEASURED (not assumed) by scanning the read-only checkout for the symbol.
# (relative path under packages/backend/src/services, symbol, role). The role is what the adapter design
# needs to know about the symbol; the `present`/`found_as` fields are measured at build time.
PRIMITIVE_ALLOWLIST = [
    ('extraction/rules/agingPrimitives.ts', 'parsePrintedDate', 'DATE_PARSE'),
    ('extraction/rules/agingPrimitives.ts', 'DateConvention', 'DATE_CONVENTION'),
    ('extraction/rules/agingPrimitives.ts', 'dateConventionFor', 'DATE_CONVENTION'),
    ('extraction/rules/agingPrimitives.ts', 'yearsSince', 'ELAPSED_YEARS'),
    ('extraction/rules/agingPrimitives.ts', 'MS_PER_YEAR', 'ELAPSED_YEARS_CONSTANT'),
    ('extraction/rules/agingPrimitives.ts', 'resolveAnchorFrom', 'ANCHOR_SELECTION'),
    ('extraction/rules/agingPrimitives.ts', 'ResolvedAnchor', 'ANCHOR_SELECTION'),
    ('extraction/rules/agingPrimitives.ts', 'clean', 'VALUE_NORMALISATION'),
    ('extraction/rules/agingPrimitives.ts', 'posInt', 'VALUE_NORMALISATION'),
    ('extraction/rules/agingPrimitives.ts', 'posYearOrNull', 'VALUE_NORMALISATION'),
    ('extraction/rules/agingPrimitives.ts', 'sourcePagesOf', 'PROVENANCE'),
    ('extraction/rules/reportingAnchor.ts', 'reportingAnchorDecision', 'ANCHOR_SELECTION'),
    ('extraction/rules/reportingAnchor.ts', 'ReportingAnchorDecision', 'ANCHOR_SELECTION'),
    ('extraction/rules/reportingAnchor.ts', 'resolvePrintedAnchor', 'ANCHOR_SELECTION'),
    ('extraction/rules/reportingAnchor.ts', 'printedFieldValue', 'ANCHOR_SELECTION'),
    ('extraction/rules/reportingAnchor.ts', 'permittedPrintedField', 'ANCHOR_SELECTION'),
    ('extraction/rules/reportingAnchor.ts', 'fieldFamily', 'FIELD_BINDING'),
    ('extraction/rules/reportingAnchor.ts', 'localFieldName', 'FIELD_BINDING'),
    ('extraction/rules/reportingAnchor.ts', 'ItemFamily', 'FIELD_BINDING'),
    ('extraction/rules/staleTradeline.ts', 'resolveAnchor', 'ANCHOR_SELECTION'),
    ('extraction/rules/staleTradeline.ts', 'resolveStatedAnchor', 'ANCHOR_SELECTION'),
    ('extraction/rules/staleTradeline.ts', 'detectStaleTradelines', 'DETECTOR'),
    ('extraction/rules/staleTradeline.ts', 'detectStaleTradelinesFromRules', 'DETECTOR'),
    ('extraction/rules/staleTradeline.ts', 'fcra605cYearsElapsed', 'CLOCK_START_ADJUSTMENT'),
    ('extraction/rules/staleTradeline.ts', 'FCRA_605C_DAYS', 'CLOCK_START_ADJUSTMENT'),
    ('extraction/rules/staleTradeline.ts', 'FCRA_605C_CLOCK_START', 'CLOCK_START_ADJUSTMENT'),
    ('extraction/rules/staleTradeline.ts', 'isCollectionOrChargeOffItem', 'ITEM_CLASS'),
    ('extraction/rules/staleTradeline.ts', 'isCollectionItem', 'ITEM_CLASS'),
    ('extraction/rules/staleTradeline.ts', 'extractMop', 'VALUE_NORMALISATION'),
    ('extraction/rules/staleTradeline.ts', 'solFindingCopy', 'OUTPUT_COPY'),
    ('extraction/rules/staleTradeline.ts', 'naturalKeyOf', 'ITEM_IDENTITY'),
    ('extraction/rules/staleTradeline.ts', 'REQUIRED_DATE_FIELDS', 'FIELD_BINDING'),
    ('extraction/rules/staleTradeline.ts', 'TradelineForRule', 'RULE_RECORD_INTERFACE'),
    ('extraction/rules/staleTradeline.ts', 'StaleKind', 'RULE_RECORD_INTERFACE'),
    ('extraction/rules/staleTradeline.ts', 'StaleFinding', 'RULE_RECORD_INTERFACE'),
    ('extraction/rules/staleTradeline.ts', 'RuleOptions', 'RULE_RECORD_INTERFACE'),
    ('extraction/rules/collectionRules.ts', 'detectStaleCollections', 'DETECTOR'),
    ('extraction/rules/publicRecordRules.ts', 'detectStalePublicRecords', 'DETECTOR'),
    ('extraction/rules/publicRecordRules.ts', 'detectJudgmentContentFindings', 'DETECTOR'),
    ('extraction/rules/publicRecordRules.ts', 'publicRecordClass', 'ITEM_CLASS'),
    ('extraction/rules/duplicateReporting.ts', 'detectDuplicateReportings', 'DETECTOR'),
    ('extraction/rules/holderName.ts', 'holderNameMismatch', 'DETECTOR'),
    ('solTable.ts', 'SolRow', 'LIMITATION_TABLE'),
    ('solTable.ts', 'SOL_ROWS', 'LIMITATION_TABLE'),
    ('solTable.ts', 'FEDERAL_DEFAULT_UNITS', 'LIMITATION_TABLE'),
    ('solTable.ts', 'SOL_GAPS', 'LIMITATION_TABLE'),
    ('solTable.ts', 'SOL_REFUSED_UNITS', 'LIMITATION_TABLE'),
    ('solTable.ts', 'JUDGMENT_ENFORCEMENT', 'LIMITATION_TABLE'),
    ('solTable.ts', 'DebtClass', 'RULE_RECORD_INTERFACE'),
    ('solTable.ts', 'SolClock', 'RULE_RECORD_INTERFACE'),
    ('solTable.ts', 'solFor', 'LIMITATION_RESOLUTION'),
    ('solTable.ts', 'solYearsFor', 'LIMITATION_RESOLUTION'),
    ('solTable.ts', 'solGapFor', 'LIMITATION_RESOLUTION'),
    ('solTable.ts', 'solRowKey', 'LIMITATION_RESOLUTION'),
    ('solTable.ts', 'solClockFor', 'LIMITATION_RESOLUTION'),
    ('solTable.ts', 'solResolutionKey', 'LIMITATION_RESOLUTION'),
    ('solTable.ts', 'solRefusalFor', 'LIMITATION_RESOLUTION'),
    ('solTable.ts', 'classifyDebt', 'ITEM_CLASS'),
    ('solTable.ts', 'judgmentPeriodFor', 'LIMITATION_RESOLUTION'),
    ('legalRules.ts', 'LegalRule', 'RULE_RECORD_INTERFACE'),
    ('legalRules.ts', 'LegalRuleKind', 'RULE_RECORD_INTERFACE'),
    ('legalRules.ts', 'ReportingAnchor', 'ANCHOR_SELECTION'),
    ('legalRules.ts', 'LEGAL_RULES', 'RULE_TABLE'),
    ('legalRules.ts', 'PROVINCE_CONTENT_RULES', 'RULE_TABLE'),
    ('legalRules.ts', 'US_STATE_RULES', 'RULE_TABLE'),
    ('legalRules.ts', 'US_STATE_OVERLAY_GAPS', 'RULE_TABLE'),
    ('legalRules.ts', 'PROVINCE_INSTRUMENTS', 'RULE_TABLE'),
    ('legalRules.ts', 'legalRulesFor', 'RULE_TABLE_RESOLUTION'),
    ('legalRules.ts', 'usStateOverlayFor', 'RULE_TABLE_RESOLUTION'),
    ('legalRules.ts', 'contentRuleFor', 'RULE_TABLE_RESOLUTION'),
    ('legalRules.ts', 'US_RULES', 'RULE_TABLE'),
    ('legalRules.ts', 'CA_RULES', 'RULE_TABLE'),
    ('legalRules.ts', 'AU_RULES', 'RULE_TABLE'),
    ('legalRules.ts', 'UK_RULES', 'RULE_TABLE'),
    ('legalCorpus/index.ts', 'CORPUS_RULES', 'RULE_TABLE'),
    ('legalCorpus/index.ts', 'federalRulesForEngineRegion', 'RULE_TABLE_RESOLUTION'),
]


def measure_primitives():
    """Presence AND access, measured from the read-only checkout. Nothing is executed and nothing is copied."""
    base = LEGACY / 'packages/backend/src/services'
    out = []
    for rel, symbol, role in PRIMITIVE_ALLOWLIST:
        path = base / rel
        access, found = 'FILE_ABSENT', None
        if path.exists():
            access, found = 'ABSENT_FROM_THIS_FILE', None
            text = path.read_text(encoding='utf-8', errors='replace')
            for kind in ('function', 'const', 'interface', 'type'):
                if 'export ' + kind + ' ' + symbol in text:
                    access, found = 'EXPORTED', kind
                    break
                if (kind + ' ' + symbol) in text:
                    access, found = 'MODULE_LOCAL_NOT_IMPORTABLE', kind
                    break
        out.append({'path': rel, 'symbol': symbol, 'role': role, 'access': access, 'found_as': found,
                    'present': access in ('EXPORTED', 'MODULE_LOCAL_NOT_IMPORTABLE')})
    return out


def region_country(region):
    return region.split('-')[0]


def country_token(legacy_ref):
    """FIRST token of a legacy jurisdiction reference, before '_', '*', '-' or space, upper-cased.

    This is a MECHANICAL STRING TEST only. It is not a legal relation and it never confirms one; it exists so
    a country-wide candidate can be surfaced for the regions whose code carries the same leading token.
    """
    if not legacy_ref:
        return None
    token = legacy_ref
    for sep in ('_', '*', '-', ' '):
        token = token.split(sep)[0]
    return token.strip().upper() or None


def applicability_for_region(adapters, region):
    """Mirror of the runtime `adaptersForRegion`: what an explicit region selection WOULD carry.

    OWNER-ALL82-001 / B3. A country-wide relation is resolved by LOOKING THE REGION UP in
    `applicability-records.json`. There is no pattern here either, so this builder can never report a region
    as covered that the records file does not name.
    """
    country = region_country(region)
    out = []
    for a in adapters:
        app = a['applicability']
        if app['mode'] == 'EXACT':
            if app.get('region') == region:
                out.append({'adapter_id': a['adapter_id'], 'applicability_state': 'EXACT_MATCH',
                            'confirmed': True, 'unconfirmed_dependency': None})
            continue
        if app['mode'] != 'EXPLICIT_REGION_RELATION':
            raise SystemExit('UNSUPPORTED_APPLICABILITY_MODE: %s' % app['mode'])
        relation = RELATION_BY_ID.get(app['relation_id'])
        if relation is None or relation['country'] != country:
            continue
        row = next((r for r in relation['region_rows'] if r['region'] == region), None)
        if row is None:
            continue
        confirmed = str(row['state']).startswith('CONFIRMED')
        out.append({
            'adapter_id': a['adapter_id'],
            'applicability_state': row['state'],
            'applicability_basis': row['basis'],
            'relation_id': relation['relation_id'],
            'execution': relation['execution'],
            'confirmed': confirmed,
            'unconfirmed_dependency': None if confirmed else 'COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED'})
    return out


def build():
    global RELATION_BY_ID
    ledger = read_json(LEDGER_PATH)
    rows = ledger['rows']
    if not APPLICABILITY_RECORDS_PATH.exists():
        raise SystemExit('APPLICABILITY_RECORDS_MISSING: run accelerated-launch/build_applicability_records.py first')
    applicability = read_json(APPLICABILITY_RECORDS_PATH)
    RELATION_BY_ID = {r['relation_id']: r for r in applicability['relations']}
    assert len(rows) == 437 and len({r['source_entry_id'] for r in rows}) == 437

    raw = DATA_PATH.read_text(encoding='utf-8-sig')
    data = json.loads(raw.split('window.CRP_JURISDICTION_DATA = ', 1)[1].strip().rstrip(';'))
    regions = data['regions']
    assert len(regions) == 82 and len({r['region_code'] for r in regions}) == 82

    adapters = read_json(ADAPTER_CONFIG_PATH)['adapters']
    assert len({a['adapter_id'] for a in adapters}) == len(adapters)

    records = []
    for row in rows:
        refs = row['existing_operational_mapping'].get('legacy_rule_references') or []
        assoc = row['established_jurisdiction_associations']
        records.append({
            'source_entry_id': row['source_entry_id'],
            'record_type': row['record_type'],
            'catalog_class': classify(row),
            'legal_family': row['legal_family'],
            'source_family_label': row['source_family_label'],
            'country_scope': assoc.get('canonical_country_code'),
            'region': assoc.get('canonical_region_code'),
            'legacy_jurisdiction_reference': assoc.get('legacy_jurisdiction_reference'),
            'jurisdiction_status': assoc.get('canonical_jurisdiction_status'),
            'period_years': num_years(refs),
            'period_start_as_recorded': period_start(refs),
            'rule_kinds': sorted(rule_kinds(refs)),
            'legacy_rule_ids': sorted(rule_ids(refs)),
            'legacy_rule_table_keys': sorted({str(ref['key']) for ref in refs if ref.get('key')}),
            'mapping_state': row['existing_operational_mapping']['state'],
            'owner_acceptance_state': row['owner_acceptance']['state'],
            'instrument_class_screen': row['owner_acceptance'].get('instrument_class_screen'),
            'instrument_class_confirmation_required': row['owner_acceptance'].get('instrument_class_confirmation_required'),
            'dependencies': list(row.get('remaining_implementation_dependencies') or []),
            'gate_layers': list(row.get('gate_layer_open') or []),
            'register_disposition': row['register_state']['disposition'],
            'removal_permitted': row.get('removal_permitted'),
        })

    counts = Counter(r['catalog_class'] for r in records)
    buckets = {name: sorted(r['source_entry_id'] for r in records if r['catalog_class'] == name)
               for name in (EXECUTABLE, CONTENT_NOT_PERIOD) + PASSTHROUGH}

    executable = [r for r in records if r['catalog_class'] == EXECUTABLE]
    exact_candidates = [r for r in executable if r['region']]
    national_candidates = [r for r in executable if not r['region'] and r['jurisdiction_status'] == 'COUNTRY_WIDE_SOURCE']

    region_rows = []
    for region in regions:
        code = region['region_code']
        country = region['country_code']
        linked = [r for r in records if r['region'] == code]
        accepted = [r for r in linked if r['owner_acceptance_state'] == 'OWNER_ACCEPTED_LEGAL_AUTHORITY']
        exact_exec = [r for r in accepted if r['catalog_class'] == EXECUTABLE]
        national_here = [r for r in national_candidates if country_token(r['legacy_jurisdiction_reference']) == country]
        deps = []
        for r in accepted:
            for dep in r['dependencies']:
                if dep not in deps:
                    deps.append(dep)
        report_format = 'NOT_ESTABLISHED_FOR_LAUNCH'
        if any('REPORT_FORMAT_AND_APPLICATION_DEPENDENCIES' in r['gate_layers'] for r in accepted):
            report_format = 'REPORT_FORMAT_AND_APPLICATION_DEPENDENCIES'
        region_rows.append({
            'country': country,
            'region': code,
            'name': region['display_name'],
            'accepted_exact_records': len(accepted),
            'period_executable_candidates_exact': len(exact_exec),
            'period_executable_candidate_ids_exact': [r['source_entry_id'] for r in exact_exec],
            'national_period_candidates_by_mechanical_country_token': len(national_here),
            'adapter_coverage': applicability_for_region(adapters, code),
            'report_format_dependency': report_format,
            'concrete_blockers': sorted(deps),
            'launch_ready': False,
            'working_evaluation_support': 'NONE_ADMITTED_FOR_LAUNCH',
        })

    primitives = measure_primitives()
    by_role = defaultdict(list)
    for p in primitives:
        by_role[p['role']].append(p['symbol'])
    primitive_summary = {
        'measured_from': 'read-only legacy checkout (symbol presence and export access measured, not executed)',
        'total_allowlisted': len(primitives),
        'present': sum(1 for p in primitives if p['present']),
        'access_counts': dict(sorted(Counter(p['access'] for p in primitives).items())),
        'module_local_not_importable': sorted(p['path'] + '#' + p['symbol']
                                              for p in primitives if p['access'] == 'MODULE_LOCAL_NOT_IMPORTABLE'),
        'absent': sorted(p['path'] + '#' + p['symbol']
                         for p in primitives if p['access'] in ('ABSENT_FROM_THIS_FILE', 'FILE_ABSENT')),
        'by_role': {k: sorted(v) for k, v in sorted(by_role.items())},
        'symbols': primitives,
    }

    limits = [
        'A PERIOD_EXCEEDED comparison is arithmetic, not a legal finding and not a coverage claim.',
        'No adapter may emit a finding or a packet-eligible output in this batch.',
        'Recorded mappings are candidates; they are not executable rules and not unique statute counts '
        '(one row may carry several recorded rule ids, and one statute may back several rules).',
        'Country-wide candidates are surfaced by a MECHANICAL country-token test only, which confirms nothing.',
        'Legacy source files were scanned read-only; no legacy code was executed and none was copied in.',
        'No report content, identifier or credential was read, written or transmitted by this builder.',
        'Legacy symbols recorded MODULE_LOCAL_NOT_IMPORTABLE exist in the checkout but are not exported, so '
        'they cannot be reused without editing the legacy file — they are recorded, not counted as reusable.',
        'A national relation reached through the region pattern US-* covers US states and US territories '
        'alike; territory coverage is the least confirmed part of that relation and is not separately evidenced.',
    ]

    covered_exact_regions = {a['applicability']['region'] for a in adapters
                             if a['applicability']['mode'] == 'EXACT'}

    def work_items(region):
        items = ['ANCHOR_FIELD_EVIDENCE — the recorded start is a legal event; whether the region\'s admitted '
                 'presentation prints a field carrying it is not yet established']
        if region:
            items.append('PRESENTATION_COVERAGE — no admitted presentation is bound to this region for the item class')
        items.append('REGISTER_DISPOSITION_UNRESOLVED — the per-ID rescreen disposition is UNRESOLVED for every row')
        items.append('REPORT_FORMAT_AND_APPLICATION_DEPENDENCIES — upload, isolation and billing are not implemented')
        return items

    exact_uncovered = [r for r in exact_candidates if r['region'] not in covered_exact_regions]
    next_batches = {
        'B2_exact_region_candidates_without_an_adapter': {
            'regions': sorted({r['region'] for r in exact_uncovered}),
            'count': len(exact_uncovered),
            'records': [{
                'source_entry_id': r['source_entry_id'],
                'region': r['region'],
                'period_years': r['period_years'],
                'period_start_as_recorded': r['period_start_as_recorded'],
                'legacy_rule_ids': r['legacy_rule_ids'],
                'legacy_rule_table_keys': r['legacy_rule_table_keys'],
                'work_items': work_items(r['region']),
            } for r in exact_uncovered],
        },
        'B3_country_wide_candidates_requiring_an_explicit_relation': {
            'count': len(national_candidates),
            'records': [{
                'source_entry_id': r['source_entry_id'],
                'legacy_jurisdiction_reference': r['legacy_jurisdiction_reference'],
                'period_years': r['period_years'],
                'period_start_as_recorded': r['period_start_as_recorded'],
                'legacy_rule_ids': r['legacy_rule_ids'],
                'work_items': [
                    'COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED — the country-wide record must be tied to '
                    'the selected region by a recorded relation before any region selection can use it',
                ] + work_items(None),
            } for r in national_candidates],
        },
        'B4_content_rules_with_no_comparable_period': {
            'count': len(buckets[CONTENT_NOT_PERIOD]),
            'note': 'Recorded content, labelling and duty rules. They have no period to compare against, so they '
                    'need a content evaluator, not a date adapter; they are catalogued and NOT treated as '
                    'executable rules here.',
        },
    }

    payload = {
        'authority': 'OWNER-ALL82-001 / B1 — reusable legacy rule adapters + concrete implementation catalog',
        'catalog_policy': (
            'A recorded legacy mapping is a CANDIDATE, never a working function. Inventoried modules and '
            'recorded mappings are not counted as working functionality. Only an adapter that has run its '
            'tests is reported as implemented.'),
        'inputs': {
            'coverage_ledger': digest(LEDGER_PATH),
            'jurisdiction_data': digest(DATA_PATH),
            'adapter_configs': digest(ADAPTER_CONFIG_PATH),
            'applicability_records': digest(APPLICABILITY_RECORDS_PATH),
        },
        'record_classification_counts': dict(sorted(counts.items())),
        'separated_buckets': {
            'EXECUTABLE_RULE_CANDIDATES': buckets[EXECUTABLE],
            'CONTENT_RULES_NOT_PERIOD_EXECUTABLE': buckets[CONTENT_NOT_PERIOD],
            'LIMITATION_RECORDS': buckets['LIMITATION_RECORD'],
            'AUTHORITY_RECORDS': buckets['AUTHORITY_RECORD'],
            'CITATION_RECORDS': buckets['CITATION_RECORD'],
            'GAPS': buckets['GAP'],
            'REFUSALS': buckets['REFUSAL'],
        },
        'executable_rule_candidates': {
            'total': len(executable),
            'exact_region': len(exact_candidates),
            'country_wide_source': len(national_candidates),
            'by_legacy_rule_id_row_occurrences': dict(sorted(Counter(
                rid for r in executable for rid in r['legacy_rule_ids']).items())),
            'records': executable,
        },
        'national_candidates_requiring_an_explicit_relation': national_candidates,
        'evaluator_primitives': primitive_summary,
        'implemented_adapters': adapters,
        'regions': region_rows,
        'next_concrete_batches': next_batches,
        'limits': limits,
    }

    ADAPTERS_DIR.mkdir(parents=True, exist_ok=True)
    CATALOG_PATH.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')
    fields = ['country', 'region', 'name', 'accepted_exact_records', 'period_executable_candidates_exact',
              'national_period_candidates_by_mechanical_country_token', 'adapter_coverage',
              'report_format_dependency', 'concrete_blockers', 'working_evaluation_support']
    with CATALOG_CSV_PATH.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in region_rows:
            flat = {}
            for k in fields:
                value = row[k]
                if isinstance(value, list):
                    flat[k] = '; '.join(
                        (x['adapter_id'] + '@' + x['applicability_state']) if isinstance(x, dict) else str(x)
                        for x in value)
                else:
                    flat[k] = value
            writer.writerow(flat)

    return payload


if __name__ == '__main__':
    payload = build()
    print(json.dumps({
        'records': sum(payload['record_classification_counts'].values()),
        'record_classification_counts': payload['record_classification_counts'],
        'executable_rule_candidates': {k: v for k, v in payload['executable_rule_candidates'].items() if k != 'records'},
        'primitives_present': '%d/%d' % (payload['evaluator_primitives']['present'],
                                         payload['evaluator_primitives']['total_allowlisted']),
        'primitives_access': payload['evaluator_primitives']['access_counts'],
        'implemented_adapters': [a['adapter_id'] for a in payload['implemented_adapters']],
        'regions': len(payload['regions']),
        'regions_with_exact_period_candidates': sum(1 for r in payload['regions'] if r['period_executable_candidates_exact']),
        'regions_adapter_covered': sum(1 for r in payload['regions'] if r['adapter_coverage']),
        'launch_ready': sum(1 for r in payload['regions'] if r['launch_ready']),
    }))
