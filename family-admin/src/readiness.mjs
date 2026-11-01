// Reviewed operational evidence, never a provider switch or a deployment approval.
// Source: accepted October 31 recovery/access reviews and readiness handoff.
// Keep unresolved gates conservative; historical receipts do not certify a new runtime.
const records = [
  {app:'consumer',name:'Consumer',accepted:['Owner administration access verified.', 'Current-version scheduled backup and signed administration journal checks passed.'],blockers:['An independent backup of the repaired administration state is not yet evidenced. The earlier backup includes the obsolete writer claim.', 'Independent review of more source-labelled reports and measured detection accuracy remains open.']},
  {app:'family',name:'Family / Admin',accepted:['Owner sign-in and administrative read access verified across the linked apps.', 'Native isolated backup recovery and journal integrity checks passed.'],blockers:['Company-controlled backup and key retrieval without the production host or this operator’s computer remains unverified.', 'Named primary and backup staff coverage and acknowledged response targets remain open.']},
  {app:'affiliate',name:'Partner',accepted:['Administrative partner records loaded through the assigned Family session.', 'Current-version scheduled backup and isolated database recovery passed.'],blockers:['Genuine customer attribution remains unverified.', 'Independent BMO settlement evidence and a trusted read-only verifier remain unconfigured. Payments stay with the authorized human release process.']},
  {app:'mail',name:'Mail / Staff',accepted:['Authorized order-list access and native isolated backup recovery passed.', 'The accepted monitoring receipt reports clear checks. This is not proof of email arrival.'],blockers:['Genuine customer fulfillment, postal handoff and independent delivery evidence remain unverified.', 'Alert inbox arrival, human acknowledgement and escalation remain unverified. The verified order list was empty.']}
];
const shared = [
  'A genuine successful staging scheduled-backup run after repair still needs its own receipt; manual repair success is separate.',
  'A current isolated full-host recovery rehearsal and cross-app consistency checks remain open.',
  'Realistic shared staging capacity acceptance and measured recovery objectives remain open.'
];
export function readinessSummary(environment) {
  const matching = environment === 'production';
  return {
    version:1,environment,reviewedEnvironment:'production',reviewedAt:'2026-10-31',
    scope:'Recorded operational review. Current app access and monitor checks are shown separately. No new recovery, delivery or payment test was run.',
    status:'NOT_FULLY_VERIFIED',
    evidenceNote:matching?'Historical accepted evidence; review again after relevant source, data, configuration or custody changes.':'These records describe production. They do not accept this environment or its data generation.',
    applications:records.map(r=>({...r,status:matching?'BLOCKERS_REMAIN':'ENVIRONMENT_NOT_ACCEPTED',accepted:matching?[...r.accepted]:[],blockers:[...(!matching?['No matching environment acceptance is recorded here.']:[]),...r.blockers]})),
    sharedBlockers:[...shared],
    references:[{label:'Current-generation recovery review',reference:'CRP-RECOVERY-REVIEW-20261031'},{label:'Post-restore owner access verification',reference:'CRP-POSTRESTORE-ADMIN-ACCESS-20261031'},{label:'Local readiness preparation; not live acceptance',reference:'CRP-OPERATIONAL-GAPS-20261031-LOCAL'}],
    limitations:'Read access is not launch readiness. These records do not authorize mailing, payments, provider changes or deployment.'
  };
}
