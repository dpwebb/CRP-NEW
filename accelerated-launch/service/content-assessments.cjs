'use strict';
/**
 * content-assessments.cjs — OWNER-ACCEPT-008. Detected report information, kept separate from legal predicate
 * evaluation. Keyword detection is EXTRACTION: it records what the report prints (with source evidence and
 * context), never whether a statute was or was not followed. Each marker's ACTUAL accepted provisions are
 * carried as a list of separate `legal_dependencies` — not conflated, not paraphrased as a universal rule.
 *
 * NOT_DETECTED states "we did not detect", never "the report does not print". A word found only in
 * boilerplate/rights-notice/guide is BOILERPLATE_ONLY, not an account/record marker. UNRESOLVED means the
 * information could not be read, which is distinct from absence.
 */

const CHECK_CLASS = 'DETECTED_REPORT_INFORMATION';
const OUTPUT_CEILING = 'observation';

const DETECTED = Object.freeze([
  {
    marker: 'medical_information',
    label: 'medical information',
    legal_dependencies: [
      {
        citation: '15 U.S.C. § 1681c(a)(6)',
        proposition: 'information excluded from consumer reports: the recorded restrictions on medical information and their exceptions, including the furnisher-identity/recipient restrictions',
        condition: 'the report\'s furnishing purpose and recipient',
        off_report: true,
        note: 'the furnishing purpose and recipient are not printed on the report'
      },
      {
        citation: '15 U.S.C. § 1681b(g)',
        proposition: 'a consumer reporting agency shall not furnish a report containing medical information to a third party for credit, insurance or employment except as the provision permits (including consent)',
        condition: 'the report\'s furnishing purpose and consent',
        off_report: true,
        note: 'whether the report is furnished to a third party for those purposes, and whether consent exists, is not printed on the report'
      }
    ]
  },
  {
    marker: 'fraud_alert',
    label: 'a fraud alert',
    legal_dependencies: [
      {
        citation: '15 U.S.C. § 1681c-1',
        proposition: 'a fraud alert a consumer placed must be included in the consumer report',
        condition: 'whether the consumer actually placed a fraud alert',
        off_report: true,
        note: 'whether the consumer placed a fraud alert is not printed on the report'
      }
    ]
  },
  {
    marker: 'security_freeze',
    label: 'a security freeze',
    legal_dependencies: [
      {
        citation: '15 U.S.C. § 1681c-1',
        proposition: 'a security freeze is a disclosure restriction the consumer places on the file',
        condition: 'whether the consumer actually placed a security freeze',
        off_report: true,
        note: 'a security freeze is a disclosure restriction, not automatically a mandatory printed notation; whether the consumer placed one is not printed on the report'
      }
    ]
  },
  {
    marker: 'dispute',
    label: 'a consumer dispute notation',
    legal_dependencies: [
      {
        citation: '15 U.S.C. § 1681c(f)',
        proposition: 'a consumer reporting agency shall note in a subsequent report that a consumer notified the agency that information is disputed',
        condition: 'the consumer\'s actual notification of a dispute to the agency',
        off_report: true,
        note: 'a dispute keyword on the report does not itself prove the notification required by § 1681c(f); whether the notification was made is not printed on the report'
      }
    ]
  }
]);


function entry(markerDef, markers) {
  const raw = (markers && markers[markerDef.marker]) || { detected: false, matches: [] };
  const matches = raw.matches || [];
  const recordMatches = matches.filter((m) => m.context === 'record');
  const boilerplateMatches = matches.filter((m) => m.context !== 'record');
  let state;
  let plain;
  if (markers === null || markers === undefined) {
    state = 'UNRESOLVED';
    plain = `We could not read the report information, so we cannot say whether ${markerDef.label} is present or absent.`;
  } else if (recordMatches.length) {
    state = 'DETECTED';
    plain = `We detected ${markerDef.label} in ${recordMatches.length} account/record line(s) (and ${boilerplateMatches.length} notice/guide line(s)). This is detected report information, not a legal conclusion.`;
  } else if (boilerplateMatches.length) {
    state = 'BOILERPLATE_ONLY';
    plain = `We found the words for ${markerDef.label} only in ${boilerplateMatches.length} notice/guide line(s), not in account/record content, so it is not an account marker.`;
  } else {
    state = 'NOT_DETECTED';
    plain = `We did not detect ${markerDef.label} in the information we could read. Absence of a keyword does not prove the feature is absent or that any obligation was breached.`;
  }
  return {
    check_id: `DETECTED-${markerDef.marker.toUpperCase()}`,
    check_class: CHECK_CLASS,
    output_level: OUTPUT_CEILING,
    marker: markerDef.marker,
    label: markerDef.label,
    state,
    is_a_finding: false,
    classification: null,
    legal_dependencies: markerDef.legal_dependencies,
    source_evidence: matches,
    record_matches: recordMatches,
    boilerplate_matches: boilerplateMatches,
    plain
  };
}

/** Report detected report information. The actual statutory requirements are carried, not evaluated here. */
function runDetectedReportInformation(context) {
  const extraction = context.extraction || null;
  const performed = [];
  if (!extraction || extraction.admitted !== true) {
    return { performed, summary: { total: 0, detected: 0, boilerplate_only: 0, not_detected: 0, unresolved: 0 } };
  }
  const markers = extraction.content_markers || null;
  for (const def of DETECTED) performed.push(entry(def, markers));
  return {
    performed,
    summary: {
      total: performed.length,
      detected: performed.filter((c) => c.state === 'DETECTED').length,
      boilerplate_only: performed.filter((c) => c.state === 'BOILERPLATE_ONLY').length,
      not_detected: performed.filter((c) => c.state === 'NOT_DETECTED').length,
      unresolved: performed.filter((c) => c.state === 'UNRESOLVED').length
    }
  };
}

module.exports = {
  CHECK_CLASS,
  DETECTED,
  runDetectedReportInformation,
  entry
};
