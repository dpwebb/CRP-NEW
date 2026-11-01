// Reviewed operational evidence, never a provider switch or a deployment approval.
// Source: accepted November 1 recovery, access, alert and operating-policy receipts.
// Keep unresolved gates conservative; historical receipts do not certify a new runtime.
const records = [
  {app:'consumer',name:'Consumer',accepted:['Owner administration access verified through Family in staging and production.', 'Production point 20261101T083624Z-287df62d captures repaired administration state; the specific obsolete writer claim is absent. Authenticated retrieval and 112 report blobs were verified.', 'The isolated Linux first-start and cold-boot checks preserved Consumer state, authority and anonymous access denial.'],blockers:['Independent substantive review of more source-labelled reports and measured detection accuracy remains open.']},
  {app:'family',name:'Family / Admin',accepted:['Owner native sign-in, separate unlock and linked-app reads accepted in both environments for the deployed readiness release.', 'Independent cloud download and authenticated decryption passed. Company access to existing recovery-vault records on another device was confirmed by the owner; this is not a second-device decryption demonstration.', 'Primary and backup operation is designated under the owner-approved single-person model. Separate people, coverage hours and response/escalation commitments are optional; actual account access remains separate.'],blockers:['The accepted cold-boot VM used the earlier Family package. Independent recovery acceptance of the newer readiness package is not yet recorded.']},
  {app:'affiliate',name:'Partner',accepted:['Administrative partner records loaded through the assigned Family session.', 'Current recorded image has scheduled backup and isolated 26-table database recovery evidence; the local cold boot preserved tables and sequences.', 'A local cohort-query candidate passed output-preservation comparisons. It is not hosted capacity acceptance or the live security candidate.'],blockers:['Genuine customer attribution remains unverified.', 'Independent settled-transaction evidence and a trusted read-only verifier remain unconfigured. BMO settlement evidence is not independently accepted; payments remain human-only.', 'The original short-tier latency failure remains unresolved by hosted acceptance. COO retains the separate live-image security release and shared-host resource custody.']},
  {app:'mail',name:'Mail / Staff',accepted:['Owner-authorized order-list access and native isolated backup recovery passed; the production list was empty.', 'The two October29 incident messages were verified in the administration inbox and expressly acknowledged by the owner. No new alert was sent to obtain this evidence.', 'The isolated Linux cold boot preserved Mail business rows.'],blockers:['Genuine consenting-customer fulfillment, postal handoff and independent delivery evidence remain unverified.']}
];
const sharedAccepted = [
  'November1 staging scheduled run 20261101T081549Z is accepted after the exporter repair; it is a genuine calendar witness, not a relabelled manual export.',
  'Production recovery point 20261101T083624Z-287df62d passed independent archive authentication: 5,449 file hashes and one symlink verified.',
  'A bootable isolated Linux VM passed first-start and genuine cold-boot checks for all four backed-up apps with blocked egress. Original database roles, provider controls and public DNS/TLS were outside this rehearsal.'
];
const shared = [
  'Remaining customer, publisher and other staff MFA/SSO acceptance is open. Owner Family access in both environments is already accepted.',
  'The morning recovery points predate the newer Family readiness package and the later staging Consumer administration repair. Applicable later-generation capture/recovery evidence remains needed.',
  'Original database role/grant restoration, provider-console/full Hostinger-image recovery and public DNS/TLS recovery remain unverified. The local VM does not certify those controls.',
  'Realistic shared-host Consumer/report/OCR capacity acceptance remains open. Local query improvements and paced soaks do not erase the retained Partner latency failure; no hosted load is admitted by this panel.'
];
export function readinessSummary(environment) {
  const matching = environment === 'production';
  return {
    version:2,environment,reviewedEnvironment:'production',reviewedAt:'2026-11-01',
    scope:'Recorded operational review. Current app access and monitor checks are shown separately. No new recovery, delivery or payment test was run.',
    status:'NOT_FULLY_VERIFIED',
    evidenceNote:matching?'Historical accepted evidence; review again after relevant source, data, configuration or custody changes.':'These records describe production. They do not accept this environment or its data generation.',
    applications:records.map(r=>({...r,status:matching?'BLOCKERS_REMAIN':'ENVIRONMENT_NOT_ACCEPTED',accepted:matching?[...r.accepted]:[],blockers:[...(!matching?['No matching environment acceptance is recorded here.']:[]),...r.blockers]})),
    sharedAccepted:matching?[...sharedAccepted]:[],
    sharedBlockers:[...shared],
    references:[{label:'Accepted recovery point and repaired-state capture',reference:'CURRENT-RECOVERY-AUTHENTICATION.json / POSTREPAIR-CAPTURE-REVIEW.json'},{label:'Independent retrieval and qualified vault access',reference:'INDEPENDENT-DRIVE-VAULT-RECOVERY.json'},{label:'Local isolated cold boot; earlier Family package',reference:'COLD-BOOT-ACCEPTANCE.json'},{label:'Two historical alerts: inbox arrival and owner acknowledgement',reference:'ALERT-ARRIVAL-AND-ACKNOWLEDGEMENT.json'},{label:'Owner-approved optional coverage policy',reference:'OPERATING-COVERAGE-DESIGNATION.json'},{label:'Current Family release access acceptance',reference:'FAMILY-ACCEPTANCE-REUSE.json'},{label:'Remaining gates and custodian restrictions',reference:'GO-NO-GO.md'}],
    limitations:'Read access is not launch readiness. These records do not authorize mailing, payments, provider changes or deployment.'
  };
}
