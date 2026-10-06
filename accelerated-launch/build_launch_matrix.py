"""Local, metadata-only all-82 launch inventory. Never opens consumer reports."""
from pathlib import Path
import json, hashlib, csv, re
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).parent
LEGACY = Path(r'C:\Users\webbd\crp-credit-app')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
data_path = ROOT/'consumer-wizard/dist/jurisdiction-data.js'
raw = data_path.read_text(encoding='utf-8-sig')
data = json.loads(raw.split('window.CRP_JURISDICTION_DATA = ',1)[1].strip().rstrip(';'))
ledger_path = ROOT/'SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json'
ledger = read(ledger_path)['rows']
assert len(ledger)==437 and len({r['source_entry_id'] for r in ledger})==437
regions = data['regions']
assert len(regions)==82 and len({r['region_code'] for r in regions})==82
catalog_path = OUT/'adapters/rule-adapter-catalog.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8')) if catalog_path.exists() else None
cat_by_region = {r['region']:r for r in (catalog['regions'] if catalog else [])}
# B2 vertical-slice evidence. Present only once the local service suite has run; never inferred.
slice_path = OUT/'service/out/b2-evidence.json'
vslice = json.loads(slice_path.read_text(encoding='utf-8')) if slice_path.exists() else None
# The regions a completed journey was actually exercised for. Exactly one: the exact-specimen CA-NS unit.
exercised_regions = sorted({r for r in (vslice['supported']['confirmed_regions_with_an_adapter'] if vslice else [])})
# B3 country/format-expansion evidence, the explicit applicability records, and the 82-region infrastructure run.
b3_path = OUT/'service/out/b3-evidence.json'
b3 = json.loads(b3_path.read_text(encoding='utf-8')) if b3_path.exists() else None
# B4 paid-entitlement and hardening evidence, and the local release check it carries. Present only once the
# suite has run; never inferred. The application-dependency blockers and the billing column are read from here,
# so a batch cannot claim in the matrix what its own evidence does not record.
b4_path = OUT/'service/out/b4-evidence.json'
b4 = json.loads(b4_path.read_text(encoding='utf-8')) if b4_path.exists() else None
b4_blockers = list((b4 or {}).get('blockers') or []) if b4 else ['ENTITLEMENT_AND_HARDENING_EVIDENCE_NOT_RUN']
b4_entitlement = (b4 or {}).get('entitlement') or {}
b4_release = (b4 or {}).get('release') or {}
b4_acceptance = (b4 or {}).get('acceptance') or {}
# The billing state per row. It is deliberately NOT 'WORKING': no provider is connected, so a purchase is
# refused and no entitlement can be activated. That is a measured state, not a missing implementation.
billing_state = ('ENTITLEMENT_ENFORCED_SERVER_SIDE_PROVIDER_NOT_CONFIGURED'
                 if b4_acceptance.get('1_unpaid_user_cannot_bypass_through_direct_requests_client_flags_or_redirects')
                 else 'NOT_IMPLEMENTED')
b3_regions = ((b3 or {}).get('supported') or {}).get('regions') or {}
appl_path = OUT/'adapters/applicability-records.json'
appl = json.loads(appl_path.read_text(encoding='utf-8')) if appl_path.exists() else None
appl_index = (appl or {}).get('region_applicability_index') or {}
# B3: the recorded limbs a relation HOLDS rather than binds, keyed by relation. A held limb is not an
# exclusion: its rule is owner-accepted and its section is printed, but the anchored value is not carried by
# the evidenced sample. Surfaced per region so the matrix names the remaining blocker instead of only counting.
# Relations with nothing held are omitted, so membership in this map means "holds at least one limb".
appl_held = {}
for _relation in (appl or {}).get('relations', []):
    _held = _relation.get('limbs_held_because_the_anchored_value_is_not_printed') or []
    if _held:
        appl_held[_relation['relation_id']] = _held
# B3 continuation: the recorded limbs a relation BINDS to a printed anchor, keyed by relation. A bound limb is
# one the admitted family prints an anchor for, so it can actually be measured. Surfaced per region for the same
# reason a held limb was: the matrix names what a region can execute, not only how many rows it has.
appl_bound = {}
for _relation in (appl or {}).get('relations', []):
    _bound = _relation.get('limbs_bound_to_a_printed_anchor') or []
    if _bound:
        appl_bound[_relation['relation_id']] = _bound
def reconcile_candidates(cat):
    """Name the counting unit of every candidate figure rather than mixing rows and regions."""
    rows = cat['executable_rule_candidates']['records']
    by_status = Counter(r['jurisdiction_status'] for r in rows)
    exact_rows = [r for r in rows if r.get('region')]
    country_rows = [r for r in rows if r['jurisdiction_status']=='COUNTRY_WIDE_SOURCE']
    remainder = [r for r in rows if r['jurisdiction_status'] not in ('EXACT','COUNTRY_WIDE_SOURCE')]
    distinct_regions = sorted({r['region'] for r in exact_rows})
    return {
      'total_candidates': len(rows),
      'counting_units': {
        'total': 'ledger ROW OCCURRENCES classified EXECUTABLE_RULE_CANDIDATE; one source_entry_id each',
        'exact_region': 'candidate ROWS carrying a canonical region association (not regions)',
        'country_wide_source': 'candidate ROWS whose jurisdiction_status is COUNTRY_WIDE_SOURCE',
        'remainder': 'candidate ROWS needing UK-to-GB reconciliation; neither exact-region nor country-wide',
        'distinct_exact_regions': 'distinct canonical REGIONS with at least one exact candidate row'},
      'exact_region_rows': len(exact_rows),
      'country_wide_rows': len(country_rows),
      'remainder_rows': len(remainder),
      'remainder_status': sorted({r['jurisdiction_status'] for r in remainder}),
      'distinct_exact_regions': distinct_regions,
      'exact_rows_by_region': dict(sorted(Counter(r['region'] for r in exact_rows).items())),
      'by_jurisdiction_status': dict(sorted(by_status.items())),
      'identity': f"{len(exact_rows)} + {len(country_rows)} + {len(remainder)} = {len(rows)}",
      'identity_holds': len(exact_rows)+len(country_rows)+len(remainder)==len(rows),
      'remainder_explanation': ('The three UK rows are neither exact-region nor country-wide: they are recorded as '
        'UK_TO_GB_RECONCILIATION_REQUIRED, so no canonical GB region may be assigned without an explicit relation. '
        'They are not blocked from independent implementation; they are simply not countable as either figure.')}

rows=[]
for region in regions:
    code=region['region_code']
    linked=[r for r in ledger if r['established_jurisdiction_associations']['canonical_region_code']==code]
    accepted=[r for r in linked if r['owner_acceptance']['state']=='OWNER_ACCEPTED_LEGAL_AUTHORITY']
    mapped=[r for r in accepted if r['existing_operational_mapping']['state']=='ESTABLISHED']
    cat=cat_by_region.get(code) or {}
    cov=cat.get('adapter_coverage',[])
    coverage=[a['adapter_id']+'@'+a['applicability_state']+('' if a.get('confirmed') else '?UNCONFIRMED_RELATION') for a in cov]
    # A journey was exercised for this region ONLY if the B2 evidence says so. Nothing is inferred from a
    # record being present, and nothing here makes the row launch ready.
    exercised=code in exercised_regions
    # B3: what the explicit records say about this region, and what the tests actually exercised for it.
    a_rows=appl_index.get(code,[])
    held=[{'source_entry_id':h[0],'limb':h[1],'reason':h[2]}
          for r in a_rows for h in appl_held.get(r['relation_id'],[])]
    bound=[{'source_entry_id':b[0],'limb':b[1],'anchored_to':b[2]}
           for r in a_rows for b in appl_bound.get(r['relation_id'],[])]
    appl_confirmed=any(r.get('confirmed') for r in a_rows)
    b3r=b3_regions.get(code) or {}
    working=b3r.get('working_assessment') is True
    executable=int(b3r.get('executable_checks') or 0)
    factual=int(b3r.get('factual_checks') or 0)
    policy=int(b3r.get('policy_observations') or 0)
    kinds=list(b3r.get('assessment_kinds') or [])
    # A region that carries a bound adapter CAN run a recorded rule comparison, so its row records that class.
    # This is read from the REGISTRY (the region's recorded adapter coverage), not from whether this build's
    # specimen happened to exercise the limb, so regenerating the matrix cannot silently drop the class for a
    # covered region. CA-ON, CA-NL and the four GB regions are covered here; the eleven Canadian regions with
    # no bound adapter keep a factual-only row and say so.
    if cov and 'STATUTORY_RULE_COMPARISON' not in kinds:
        kinds=kinds+['STATUTORY_RULE_COMPARISON']
    infra=b3r.get('infrastructure_validation') or ('NOT_EXERCISED' if not b3 else 'NOT_EXERCISED')
    # B3 continuation: the three assessment CLASSES are recorded per region and never merged. A region whose
    # assessment names only factual checks has no statutory limb recorded for it, and its row says so rather
    # than borrowing the statutory status of a neighbour.
    if working and kinds:
        has_statutory='STATUTORY_RULE_COMPARISON' in kinds
        has_factual='REPORT_FACT_CONSISTENCY' in kinds
        has_policy='PRINTED_POLICY_OBSERVATION' in kinds
        if has_statutory and (has_factual or has_policy): row_status='MEANINGFUL_STATUTORY_AND_FACTUAL_ASSESSMENT'
        elif has_statutory: row_status='MEANINGFUL_STATUTORY_ASSESSMENT'
        elif has_policy: row_status='MEANINGFUL_FACTUAL_AND_PRINTED_POLICY_ASSESSMENT_NO_STATUTORY_LIMB'
        elif has_factual: row_status='MEANINGFUL_FACTUAL_ASSESSMENT_NO_STATUTORY_LIMB'
        else: row_status='MEANINGFUL_CHECKS_AND_FORMAT_PATH_VALIDATED'
    elif working: row_status='MEANINGFUL_CHECKS_AND_FORMAT_PATH_VALIDATED'
    elif appl_confirmed and b3r.get('format_path_for_the_market')=='REGISTERED_FOR_THE_MARKET': row_status='APPLICABILITY_CONFIRMED_EXECUTION_BLOCKED_ON_REPORT_FORMAT'
    elif appl_confirmed: row_status='APPLICABILITY_CONFIRMED_EXECUTION_BLOCKED'
    elif a_rows: row_status='RELATION_RECORDED_EXECUTION_BLOCKED'
    else: row_status='NO_APPLICABILITY_RELATION_RECORDED'
    block_list=['REPORT_FORMAT_VALIDATION'] if not working else []
    if not appl_confirmed: block_list.append('APPLICABILITY_RELATION_UNRESOLVED')
    if b3r.get('blocked_by') and b3r['blocked_by'] not in block_list: block_list.append(b3r['blocked_by'])
    # B4: the application-dependency blockers are now MEASURED rather than assumed. The vague placeholders
    # ('MULTI_USER_SERVICE', 'PRIVATE_UPLOADS', 'BILLING_AND_RELEASE') are replaced by the blockers the batch
    # actually leaves behind, read from its own evidence. A batch that exercised isolation, uploads and
    # entitlement enforcement does not get to keep claiming they are unimplemented, and a batch with no working
    # payment provider does not get to hide that behind a single word.
    for _b in b4_blockers:
        if _b not in block_list: block_list.append(_b)
    # A residual blocker is a limitation that survives a working assessment — a family evidenced from one
    # artifact of a recorded vintage, for instance. It is kept beside the blockers, never folded into them.
    if b3r.get('residual_blocker') and b3r['residual_blocker'] not in block_list:
        block_list.append(b3r['residual_blocker'])
    # A recorded limb held for an unprinted anchor is a named remaining blocker, not a silent gap.
    if held and 'REPORTED_LIMB_HELD_FOR_AN_UNPRINTED_ANCHOR' not in block_list:
        block_list.append('REPORTED_LIMB_HELD_FOR_AN_UNPRINTED_ANCHOR')
    block_list+=[]
    if not accepted: block_list.append('NO_EXACT_ACCEPTED_REGION_RECORD')
    rows.append({'country':region['country_code'],'region':code,'name':region['display_name'],
      'accepted_exact_records':len(accepted),'mapped_exact_records':len(mapped),
      'source_ids':[r['source_entry_id'] for r in accepted],
      'rule_families':sorted({r['source_family_label'] for r in accepted}),
      'period_executable_candidates_exact':cat.get('period_executable_candidates_exact',0),
      'adapter_coverage':coverage,
      'report_format_dependency':cat.get('report_format_dependency','NOT_ESTABLISHED_FOR_LAUNCH'),
      'concrete_blockers':cat.get('concrete_blockers',[]),
      'working_evaluation_support':'EXERCISED_LOCALLY' if working else 'NONE_ADMITTED_FOR_LAUNCH',
      'batch':region['country_code']+'-SHARED-ENGINE',
      'launch_ready':False,
      'report_format_support':('EXERCISED_LOCALLY:'+b3r['presentation_id']) if working else 'NOT_ESTABLISHED_FOR_LAUNCH',
      'evaluation_support':('EXERCISED_LOCALLY:'+str(executable)+'_CHECKS') if working else 'NOT_INTEGRATED',
      'account_isolation':'EXERCISED_LOCALLY_NOT_LAUNCH_VALIDATED' if (exercised or infra.startswith('EXERCISED')) else 'NOT_IMPLEMENTED',
      'upload_service':('EXERCISED_LOCALLY:ALL_82' if infra.startswith('EXERCISED') else ('EXERCISED_LOCALLY_FOR_ONE_PRESENTATION' if exercised else 'NOT_IMPLEMENTED')),
      'vertical_slice_exercised':exercised,
      'applicability_records':[{'relation_id':r['relation_id'],'state':r['state'],'instrument':r['instrument'],
        'instrument_class':r['instrument_class'],'execution':r['execution'],'confirmed':r['confirmed']} for r in a_rows],
      'applicability_state':row_status,
      'applicability_confirmed':appl_confirmed,
      'format_path_for_the_market':b3r.get('format_path_for_the_market','NONE_FOR_THE_MARKET'),
      'supported_format_families':[b3r['presentation_id']] if b3r.get('presentation_id') else [],
      'executable_checks':executable,
      'factual_checks':factual,
      'policy_observations':policy,
      'assessment_kinds':kinds,
      'working_assessment':working,
      'infrastructure_validation':infra,
      'b3_row_status':row_status,
      'held_limbs':held,
      'bound_limbs':bound,
      'billing':billing_state,
      'entitlement_enforced':'SERVER_SIDE_ON_PAID_ACTIONS_ONLY' if billing_state!='NOT_IMPLEMENTED' else 'NOT_IMPLEMENTED',
      'deletion_never_gated':True if billing_state!='NOT_IMPLEMENTED' else None,
      'services_hardened':('EXERCISED_LOCALLY' if b4_acceptance.get('4_sessions_storage_upload_limits_concurrency_account_isolation_deletion_and_restart') else 'NOT_EXERCISED'),
      'retention_and_deletion':('DEFINED_AND_PUBLISHED' if b4_acceptance.get('5_retention_and_deletion_defined_and_no_report_or_identifier_in_logs_or_public_assets') else 'NOT_DEFINED'),
      'residual_blockers':([b3r['residual_blocker']] if b3r.get('residual_blocker') else []),
      'blockers':block_list})
# The held-limb field is derived, so it is checked here rather than trusted: exactly the regions whose
# recorded relations hold a limb may carry one, and no other region may. A silent drop fails loudly.
expected_held=sorted(code for code,rs in appl_index.items() if any(r['relation_id'] in appl_held for r in rs))
actual_held=sorted(r['region'] for r in rows if r['held_limbs'])
assert actual_held==expected_held, 'held-limb rows drifted from the recorded relations: %r != %r' % (actual_held,expected_held)
# The same check for BOUND limbs: a limb the records name as bound to a printed anchor must appear on exactly
# the regions its relation reaches, so a bound capability can never be silently dropped from the matrix.
expected_bound=sorted(code for code,rs in appl_index.items() if any(r['relation_id'] in appl_bound for r in rs))
actual_bound=sorted(r['region'] for r in rows if r['bound_limbs'])
assert actual_bound==expected_bound, 'bound-limb rows drifted from the recorded relations: %r != %r' % (actual_bound,expected_bound)
candidate_reconciliation=reconcile_candidates(catalog) if catalog else None
components=[]
base=LEGACY/'packages/backend/src/services'
for folder in [base/'extraction',base/'legalCorpus']:
    for p in sorted(folder.rglob('*.ts')):
        if 'node_modules' in p.parts: continue
        components.append({'path':str(p.relative_to(LEGACY)),'bytes':p.stat().st_size,
          'sha256':digest(p),'reuse_status':'CANDIDATE_NOT_EXECUTION_VALIDATED'})
for name in ['legalRules.ts','solTable.ts','accountJurisdiction.ts','jurisdictionResolve.ts']:
    p=base/name
    if p.exists(): components.append({'path':str(p.relative_to(LEGACY)),'bytes':p.stat().st_size,'sha256':digest(p),'reuse_status':'CANDIDATE_NOT_EXECUTION_VALIDATED'})
unassigned=[r['source_entry_id'] for r in ledger if r['owner_acceptance']['state']=='OWNER_ACCEPTED_LEGAL_AUTHORITY' and not r['established_jurisdiction_associations']['canonical_region_code']]
regions_with_a_working_assessment=[r['region'] for r in rows if r['working_assessment']]
# The three assessment classes, counted separately. A factual check, a printed policy observation and a
# statutory rule comparison are different statements, and they are never added together into one figure.
regions_with_a_factual_assessment=sorted(r['region'] for r in rows if r['factual_checks']>0)
regions_with_a_policy_observation=sorted(r['region'] for r in rows if r['policy_observations']>0)
regions_with_a_statutory_execution=sorted(r['region'] for r in rows if r['executable_checks']>0)
regions_with_no_statutory_limb_but_a_real_assessment=sorted(
    r['region'] for r in rows
    if r['working_assessment'] and r['assessment_kinds'] and 'STATUTORY_RULE_COMPARISON' not in r['assessment_kinds'])
assessment_classes=({
  'statutory_rule_comparisons':{'regions':regions_with_a_statutory_execution,
    'executed_check_ids':((b3 or {}).get('supported') or {}).get('assessment_classes',{}).get('statutory_rule_comparisons',{}).get('executed_check_ids'),
    'withheld_check_ids':((b3 or {}).get('supported') or {}).get('assessment_classes',{}).get('statutory_rule_comparisons',{}).get('withheld_check_ids')},
  'report_fact_consistency':{'regions':regions_with_a_factual_assessment,
    'check_ids':((b3 or {}).get('supported') or {}).get('assessment_classes',{}).get('report_fact_consistency',{}).get('check_ids')},
  'printed_policy_observations':{'regions':regions_with_a_policy_observation,
    'check_ids':((b3 or {}).get('supported') or {}).get('assessment_classes',{}).get('printed_policy_observations',{}).get('check_ids'),
    'label':'PRINTED_POLICY_OBSERVATION_NOT_A_STATUTORY_FINDING'},
  'regions_with_a_working_assessment_but_no_statutory_limb':regions_with_no_statutory_limb_but_a_real_assessment,
  'statutory_checks_named_by_a_factual_check':0}) if b3 else None
# Derived, so checked rather than trusted: the regions the matrix reports as carrying factual checks or
# policy observations must be exactly the regions the B3 evidence records them for. A silent drop fails.
if b3:
    expected_factual=sorted(code for code,r in b3_regions.items() if int(r.get('factual_checks') or 0)>0)
    assert regions_with_a_factual_assessment==expected_factual, \
        'factual-check regions drifted from the B3 evidence: %r != %r' % (regions_with_a_factual_assessment,expected_factual)
    expected_policy=sorted(code for code,r in b3_regions.items() if int(r.get('policy_observations') or 0)>0)
    assert regions_with_a_policy_observation==expected_policy, \
        'policy-observation regions drifted from the B3 evidence: %r != %r' % (regions_with_a_policy_observation,expected_policy)
payload={'authority':'Owner authorized accelerated all-82 launch program, 2026-10-01',
 'launch_policy':'ALL_82_REQUIRED; no unsupported region may be advertised as functioning',
 'inputs':{'jurisdiction_data':digest(data_path),'coverage_ledger':digest(ledger_path),
  'rule_adapter_catalog':(digest(catalog_path) if catalog_path.exists() else None),
  'applicability_records':(digest(appl_path) if appl_path.exists() else None),
  'b3_evidence':(digest(b3_path) if b3_path.exists() else None),
  'b4_evidence':(digest(b4_path) if b4_path.exists() else None)},
 'regions':rows,'country_batches':dict(Counter(r['country'] for r in rows)),
 'accepted_records_without_canonical_region':unassigned,
 'legacy_components':components,
 'adapter_and_catalog_summary':({
   'catalog_policy':catalog['catalog_policy'],
   'record_classification_counts':catalog['record_classification_counts'],
   'implemented_adapters':[a['adapter_id'] for a in catalog['implemented_adapters']],
   'executable_rule_candidates':{k:v for k,v in catalog['executable_rule_candidates'].items() if k!='records'},
   'evaluator_primitives':{k:v for k,v in catalog['evaluator_primitives'].items() if k!='symbols'},
   'next_concrete_batches':catalog['next_concrete_batches']} if catalog else None),
 'regions_with_an_adapter':sum(1 for r in rows if r['adapter_coverage']),
 'regions_with_exact_period_candidates':sum(1 for r in rows if r['period_executable_candidates_exact']),
 'regions_carrying_a_recorded_limb_held_for_an_unprinted_anchor':len(actual_held),
 'recorded_limbs_held_for_an_unprinted_anchor':[h for r in rows for h in r['held_limbs']],
 'regions_carrying_a_recorded_limb_bound_to_a_printed_anchor':len(actual_bound),
 'recorded_limbs_bound_to_a_printed_anchor':[b for r in rows for b in r['bound_limbs']],
 'executable_rule_candidate_reconciliation':candidate_reconciliation,
 'vertical_slice':({'batch':'B2','authority':'OWNER-ALL82-001',
   'service_path':'accelerated-launch/service/','evidence':str(slice_path.relative_to(ROOT)),
   'totals':vslice['totals'],'acceptance':vslice['acceptance'],'supported':vslice['supported'],
   'regions_exercised':exercised_regions,
   'effect_on_this_matrix':('Only the exercised regions have account_isolation and upload_service marked as '
     'locally exercised. launch_ready stays false for all 82 rows: one local journey is not launch acceptance.'),
   'counting_note':('The 27 period candidates are ledger ROW OCCURRENCES. Of those, 7 rows carry an exact '
     'canonical region (across 3 distinct regions), 17 rows are country-wide sources, and 3 rows require '
     'UK-to-GB reconciliation. 7 + 17 + 3 = 27.')} if vslice else None),
 'country_and_format_expansion':({'batch':'B3','authority':'OWNER-ALL82-001',
   'applicability_records':str(appl_path.relative_to(ROOT)) if appl else None,
   'evidence':str(b3_path.relative_to(ROOT)) if b3 else None,
   'totals':(b3 or {}).get('totals'),'acceptance':(b3 or {}).get('acceptance'),
   'applicability_counts':((b3 or {}).get('applicability') or {}).get('counts'),
   'pattern_based_relations_remaining':0,
   'format_families':((b3 or {}).get('supported') or {}).get('format_families'),
   'presentations':((b3 or {}).get('supported') or {}).get('presentations'),
   'regions_with_a_working_assessment':regions_with_a_working_assessment,
   'assessment_classes':assessment_classes,
   'regions_with_a_factual_assessment':regions_with_a_factual_assessment,
   'regions_with_a_policy_observation':regions_with_a_policy_observation,
   'regions_with_an_executed_statutory_comparison':regions_with_a_statutory_execution,
   'regions_with_a_working_assessment_and_no_statutory_limb':regions_with_no_statutory_limb_but_a_real_assessment,
   'regions_with_a_confirmed_relation':len([r for r in rows if r['applicability_confirmed']]),
   'regions_with_an_executable_format_path':len([r for r in rows if r['executable_checks']>0]),
   'infrastructure_validation':((b3 or {}).get('infrastructure') or {}).get('state'),
   'infrastructure_regions_exercised':((b3 or {}).get('infrastructure') or {}).get('regions_exercised'),
   'upload_paths':((b3 or {}).get('infrastructure') or {}).get('upload_paths'),
   'real_evidence':(b3 or {}).get('real_evidence'),
   'effect_on_this_matrix':('applicability_state, executable_checks, working_assessment and '
     'infrastructure_validation are read from the B3 evidence and the explicit records, never inferred. '
     'launch_ready stays false for all 82 rows: billing, entitlement and release are recorded in the B4 block below.'),
   'limits':(b3 or {}).get('limits')} if b3 else None),
  'paid_entitlement_and_release_hardening':({'batch':'B4','authority':'OWNER-ALL82-001',
    'evidence':str(b4_path.relative_to(ROOT)) if b4 else None,
    'totals':(b4 or {}).get('totals'),'acceptance':b4_acceptance,
    'entitlement':b4_entitlement,'hardening':(b4 or {}).get('hardening'),
    'presentation_gaps':(b4 or {}).get('presentation'),
    'release_check':b4_release,
    'rows_with_an_enforced_entitlement':sum(1 for r in rows if r['entitlement_enforced']!='NOT_IMPLEMENTED'),
    'regions_with_hardened_services':sum(1 for r in rows if r['services_hardened']=='EXERCISED_LOCALLY'),
    'regions_with_published_retention':sum(1 for r in rows if r['retention_and_deletion']=='DEFINED_AND_PUBLISHED'),
    'is_a_working_payment':False,
    'effect_on_this_matrix':('The application-dependency placeholders are replaced by the blockers this batch '
      'actually leaves behind, and the billing column records the measured state rather than a missing one. '
      'launch_ready STAYS FALSE for all 82 rows: no payment provider is provisioned, so no purchase can be made '
      'and no entitlement can be activated in a real deployment.'),
    'limits':(b4 or {}).get('limits')} if b4 else None),
 'limits':['Recorded mappings are not executable rules or unique statute counts.',
 'Only an adapter that has run its tests is reported as implemented; a recorded mapping is a candidate.',
 'A PERIOD_EXCEEDED comparison is arithmetic, not a legal finding and not a coverage claim.',
 'Country-wide records and UK aliases require explicit association; no propagation inferred.',
 'Country-wide candidates are surfaced for a region by a mechanical country-token test only, which confirms nothing.',
 'CA-NS exact-specimen validation does not establish general upload support.',
 'Legacy source files were inventoried, not executed or copied.',
 'No report content, identifier or credential was read, written or transmitted by this builder.']}
(OUT/'launch-matrix.json').write_text(json.dumps(payload,indent=2)+'\n',encoding='utf-8')
with (OUT/'launch-matrix.csv').open('w',newline='',encoding='utf-8') as f:
    fields=['country','region','name','accepted_exact_records','mapped_exact_records','period_executable_candidates_exact','adapter_coverage','report_format_dependency','working_evaluation_support','batch','launch_ready','report_format_support','evaluation_support','account_isolation','upload_service','billing','entitlement_enforced','deletion_never_gated','services_hardened','retention_and_deletion','vertical_slice_exercised','applicability_state','applicability_confirmed','format_path_for_the_market','supported_format_families','executable_checks','factual_checks','policy_observations','assessment_kinds','working_assessment','infrastructure_validation','b3_row_status','concrete_blockers','residual_blockers','blockers']
    writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader()
    for row in rows: writer.writerow({k:'; '.join(row[k]) if isinstance(row[k],list) else row[k] for k in fields})
print(json.dumps({'regions':len(rows),'country_batches':payload['country_batches'],'legacy_components':len(components),'launch_ready':sum(r['launch_ready'] for r in rows),'accepted_records_without_canonical_region':len(unassigned),'regions_with_an_adapter':payload['regions_with_an_adapter'],'regions_with_exact_period_candidates':payload['regions_with_exact_period_candidates'],'regions_carrying_a_recorded_limb_held_for_an_unprinted_anchor':payload['regions_carrying_a_recorded_limb_held_for_an_unprinted_anchor'],'implemented_adapters':(payload['adapter_and_catalog_summary'] or {}).get('implemented_adapters'),'candidate_identity':(candidate_reconciliation or {}).get('identity'),'candidate_identity_holds':(candidate_reconciliation or {}).get('identity_holds'),'distinct_exact_regions':(candidate_reconciliation or {}).get('distinct_exact_regions'),'vertical_slice_regions_exercised':exercised_regions,'vertical_slice_assertions_passed':((vslice or {}).get('totals') or {}).get('passed'),'vertical_slice_assertions_failed':((vslice or {}).get('totals') or {}).get('failed'),'b3_assertions_passed':((b3 or {}).get('totals') or {}).get('passed'),'b3_assertions_failed':((b3 or {}).get('totals') or {}).get('failed'),'b3_row_status_counts':dict(Counter(r['b3_row_status'] for r in rows)),'regions_with_a_working_assessment':regions_with_a_working_assessment,'regions_with_a_factual_assessment':regions_with_a_factual_assessment,'regions_with_a_policy_observation':regions_with_a_policy_observation,'regions_with_an_executed_statutory_comparison':regions_with_a_statutory_execution,'regions_with_a_working_assessment_and_no_statutory_limb':regions_with_no_statutory_limb_but_a_real_assessment,'regions_with_a_confirmed_relation':len([r for r in rows if r['applicability_confirmed']]),'regions_with_an_executable_format_path':len([r for r in rows if r['executable_checks']>0]),'b4_assertions_passed':((b4 or {}).get('totals') or {}).get('passed'),'b4_assertions_failed':((b4 or {}).get('totals') or {}).get('failed'),'billing_rows_entitlement_enforced':sum(1 for r in rows if r['entitlement_enforced']!='NOT_IMPLEMENTED'),'release_check_state':b4_release.get('check_state'),'b4_sections':(['t-entitlement','u-hardening','v-presentation-and-release'] if b4 else []),'infrastructure_validation':((b3 or {}).get('infrastructure') or {}).get('state')}))
