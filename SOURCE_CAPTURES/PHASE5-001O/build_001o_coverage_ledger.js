/**
 * build_001o_coverage_ledger.js — PHASE5-001O source-ID coverage ledger builder.
 *
 * Reads the workspace's catalogue of record and the located legacy legal corpus and writes, inside
 * SOURCE_CAPTURES\PHASE5-001O only:
 *   source_id_coverage_ledger.json / .csv, coverage_summary.json, legacy_corpus_inventory.json
 *
 * A legacy operational mapping is asserted ONLY where an exact recorded string basis exists, and every
 * row names the basis it used. An absent or ambiguous mapping is recorded as an implementation
 * dependency and never inferred.
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib_001o.js");

const CATALOGUE = path.join(L.ROOT, "CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md");
const REGISTER = path.join(L.ROOT, "SOURCE_CAPTURES", "PHASE5-001K", "rescreen_register.csv");
const DET = path.join(L.ROOT, "SOURCE_CAPTURES", "PHASE5-001N", "relation_determinations.json");

const FAMILY_LABELS = {
  F1: "LIMITATION_OR_RETENTION",
  F2: "CONSUMER_CREDIT_REGISTRY",
  F3: "PRIVACY_OR_DATA_HANDLING",
  F4: "REPORT_ACCURACY_OR_COMPLETENESS",
  F5: "DISCLOSURE_OR_FILE_ACCESS",
  F6: "DISPUTE_OR_CORRECTION",
  F7: "PUBLIC_RECORD_OR_JUDGMENT",
  F8: "PERMISSIBLE_PURPOSE_OR_CONSENT",
  F9: "IDENTITY_THEFT_OR_MIXED_FILE",
  F10: "UNCLASSIFIED_SOURCE_FAMILY",
};

const RECORD_TYPE_PURPOSE = {
  CONTENT_RULE: "A report-content rule: the recorded provision regulates what may be included in, omitted from, labelled in, or stated in a consumer report.",
  LIMITATION_RECORD: "A limitation or retention record: the recorded provision sets a period or retention limit that a reporting fact can be measured against.",
  AUTHORITY_RECORD: "A source-registry record: it identifies the legal instrument, its publisher and its locator prefix for the provisions that cite it.",
  CITATION_RECORD: "A citation-and-jurisdiction reference record: it records the instrument and citation form used for a jurisdiction.",
  GAP: "A recorded gap: no legal source is recorded for this scope.",
  REFUSAL: "A recorded refusal: the legacy corpus declined to record a source for this scope.",
};

// ---------------------------------------------------------------- inputs
const catalogueText = L.read(CATALOGUE);
const entries = JSON.parse(L.fencedJsonAfter(catalogueText, "## 4. Global Source Entries"));

const regRows = L.parseCsv(L.read(REGISTER));
const regHeader = regRows[0];
const register = {};
for (const r of regRows.slice(1)) {
  if (r.length !== regHeader.length) continue;
  const o = {};
  regHeader.forEach((h, i) => {
    o[h] = r[i];
  });
  register[o.source_entry_id] = o;
}

const determinations = JSON.parse(L.read(DET));
const admittedDoc = JSON.parse(L.read(path.join(L.OUT, "admitted_artifacts.json")));
const ADMITTED = admittedDoc.artifacts;

const artifacts = Array.from(new Set([...entries.map((e) => e.source_artifact), ...ADMITTED.map((a) => a.relative_path)]));
const legacyFiles = {};
for (const a of artifacts) legacyFiles[a] = L.read(path.join(L.LEG, a));
const legacy = L.extractLegacy(legacyFiles);

// ---------------------------------------------------------------- indexes
function refOf(kind, row, basis) {
  return { kind, basis, ...row };
}

/** The catalogue note itself quotes the legacy locator prefix; that quoted value is an exact basis. */
function noteLocatorPrefix(recorded) {
  const m = /locatorPrefix\s+`([^`]+)`/.exec(String(recorded || ""));
  return m ? m[1] : null;
}

/** Section tokens the catalogue's own note names, for example `§ 337` or `ch. 260, § 2`. */
function noteSectionTokens(...texts) {
  const tokens = new Set();
  for (const t of texts) {
    for (const m of String(t || "").matchAll(/(?:§{1,2}|s{1,2}\.|ch\.)\s*[0-9][0-9A-Za-z.\-]*(?:\([0-9a-z]+\))*/g)) {
      tokens.add(m[0].replace(/\s+/g, " "));
    }
  }
  return Array.from(tokens);
}

const joinCache = {};
function legacyJoin(entry) {
  const key = entry.source_artifact + "|" + entry.provision_or_citation;
  if (joinCache[key]) return joinCache[key];
  const artifact = entry.source_artifact;
  const recorded = entry.provision_or_citation;
  const result = { refs: [], basis: "NOT_ESTABLISHED", candidate_count: 0, ambiguity: null, coverage: null, coverage_basis: null, authority: null };

  const ruleRows = legacy.ruleRows[artifact] || [];
  const composite = ruleRows.filter((r) => r.provision && r.citation && `${r.provision} — ${r.citation}` === recorded);
  if (composite.length > 0) {
    result.refs = composite.map((r) => refOf("LEGACY_ATOMIC_RULE", r, "LEGACY_RULE_PROVISION_AND_CITATION_EXACT"));
    result.basis = "LEGACY_RULE_PROVISION_AND_CITATION_EXACT";
    result.candidate_count = composite.length;
  }
  if (result.refs.length === 0) {
    const byCitation = ruleRows.filter((r) => r.citation === recorded);
    if (byCitation.length > 0) {
      result.refs = byCitation.map((r) => refOf("LEGACY_ATOMIC_RULE", r, "LEGACY_RULE_CITATION_EXACT"));
      result.basis = "LEGACY_RULE_CITATION_EXACT";
      result.candidate_count = byCitation.length;
    }
  }
  if (result.refs.length === 0) {
    const byProvision = ruleRows.filter((r) => r.provision === recorded);
    if (byProvision.length > 0) {
      result.refs = byProvision.map((r) => refOf("LEGACY_ATOMIC_RULE", r, "LEGACY_RULE_PROVISION_EXACT"));
      result.basis = "LEGACY_RULE_PROVISION_EXACT";
      result.candidate_count = byProvision.length;
    }
  }
  if (result.refs.length === 0 && legacy.citationRegistry) {
    const rows = legacy.citationRegistry.rows.filter((r) => r[4] === recorded);
    if (rows.length > 0) {
      result.refs = rows.map((r) =>
        refOf(
          "LEGACY_CITATION_REGISTRY_ROW",
          { rule_id: r[1], jurisdiction: r[2], instrument: r[3], citation_as_recorded: r[4], verified: r[7], note: r[9] },
          "LEGACY_CITATION_REGISTRY_CITATION_EXACT",
        ),
      );
      result.basis = "LEGACY_CITATION_REGISTRY_CITATION_EXACT";
      result.candidate_count = rows.length;
    }
  }
  if (result.refs.length === 0) {
    const prefix = noteLocatorPrefix(recorded);
    if (prefix) {
      const all = Object.values(legacy.authorityRows).flat().filter((a) => a.locatorPrefix === prefix);
      if (all.length === 1) {
        result.authority = all[0];
        result.refs = [refOf("LEGACY_AUTHORITY_RECORD", all[0], "LEGACY_AUTHORITY_LOCATOR_PREFIX_QUOTED_IN_RECORD")];
        result.basis = "LEGACY_AUTHORITY_LOCATOR_PREFIX_QUOTED_IN_RECORD";
        result.candidate_count = 1;
      }
    }
  }
  if (result.refs.length === 0) {
    // Section tokens the catalogue's own note names, matched inside the artifact that note belongs to.
    const tokens = noteSectionTokens(entry.provision_or_citation, entry.verification_state_as_recorded);
    const pool = (legacy.solRows[artifact] || []).concat(legacy.ruleRows[artifact] || []).concat(legacy.legalRuleRows[artifact] || []);
    const hits = [];
    for (const t of tokens) {
      const needle = t.replace(/^s{1,2}\.\s*/, "").replace(/^§{1,2}\s*/, "");
      const matches = pool.filter((r) => r.section && r.section.includes(needle));
      if (matches.length === 1 && !hits.includes(matches[0])) hits.push(matches[0]);
    }
    if (hits.length > 0) {
      result.refs = hits.map((r) => refOf(r.years !== undefined ? "LEGACY_SOL_ROW" : "LEGACY_ATOMIC_RULE", r, "LEGACY_SECTION_TOKEN_NAMED_BY_CATALOGUE_NOTE"));
      result.basis = "LEGACY_SECTION_TOKEN_NAMED_BY_CATALOGUE_NOTE";
      result.candidate_count = hits.length;
      if (hits.length > 1) result.ambiguity = "MULTIPLE_TOKEN_MATCHES";
    }
  }
  if (result.refs.length === 0) {
    // Rule-table or limitation row whose recorded section carries the numeric core of the recorded
    // provision and whose own jurisdiction token agrees. A row whose LEADING segment names the section
    // is preferred over a row that only cross-refers to it in a note.
    const cores = (String(recorded).match(/[0-9][0-9A-Za-z.\-]*(?::[0-9A-Za-z.\-]+)?(?:\([0-9a-z]+\))*/g) || [])
      .filter((t) => t.length >= 3)
      .sort((a, b) => b.length - a.length);
    const jrToken = String(entry.legacy_jurisdiction_reference || "");
    const region = entry.canonical_region_code;
    const pool = (legacy.solRows[artifact] || []).concat(legacy.legalRuleRows[artifact] || []);
    const agree = (r) => {
      const jt = String(r.jurisdiction || r.key || "");
      if (!jt) return false;
      if (region && jt.toUpperCase() === region.toUpperCase()) return true;
      if (jrToken && jrToken.includes(jt)) return true;
      return false;
    };
    let hits = [];
    let shared = false;
    for (const t of cores) {
      const agreeing = pool.filter((r) => r.section && agree(r) && r.section.includes(t));
      const leading = agreeing.filter((r) => String(r.section).split(/—|;|:|\n/)[0].includes(t));
      const chosen = leading.length > 0 ? leading : agreeing;
      if (chosen.length === 1) {
        hits = [chosen[0]];
        break;
      }
      if (chosen.length > 1) {
        hits = chosen;
        shared = true;
        break;
      }
    }
    if (hits.length > 0) {
      result.refs = hits.map((r) => refOf(r.years !== undefined ? "LEGACY_LIMITATION_ROW" : "LEGACY_RULE_TABLE_ROW", r, "LEGACY_SECTION_NUMERIC_CORE_WITH_JURISDICTION_AGREEMENT"));
      result.basis = "LEGACY_SECTION_NUMERIC_CORE_WITH_JURISDICTION_AGREEMENT";
      result.candidate_count = hits.length;
      if (shared) result.ambiguity = "MULTIPLE_LEGACY_ROWS_CARRY_THE_RECORDED_PROVISION";
    }
  }
  if (result.refs.length === 0) {
    // Rule-table row whose recorded section contains the catalogue's recorded provision, where the
    // match is unique and the row's own jurisdiction key agrees with the recorded jurisdiction reference.
    const jr = String(entry.legacy_jurisdiction_reference || "");
    const keyTokens = [entry.canonical_region_code, jr.replace(/\s*\(.*$/, "").replace(/^`|`$/g, "")].filter(Boolean);
    const candidates = (legacy.legalRuleRows[artifact] || []).filter((r) => r.section && (r.section.includes(recorded) || recorded.includes(r.section)));
    let usable = candidates;
    if (candidates.length > 1 && keyTokens.length > 0) {
      const narrowed = candidates.filter((r) => r.key && keyTokens.some((t) => t === r.key || t.endsWith("-" + r.key) || t === "`" + r.key + "`"));
      if (narrowed.length > 0) usable = narrowed;
    }
    if (usable.length > 0) {
      result.refs = usable.map((r) => refOf("LEGACY_RULE_TABLE_ROW", r, "LEGACY_RULE_TABLE_SECTION_CONTAINS_RECORDED_PROVISION"));
      result.basis = "LEGACY_RULE_TABLE_SECTION_CONTAINS_RECORDED_PROVISION";
      result.candidate_count = usable.length;
      if (usable.length > 1) result.ambiguity = "MULTIPLE_RECORDED_MATCHES";
    }
  }
  if (result.refs.length === 0) {
    // Authority record named by the entry's own recorded instrument title or source locator.
    const all = Object.values(legacy.authorityRows).flat();
    let hits = all.filter((a) => a.sourceUrl && a.sourceUrl === entry.source_locator);
    let basis = "LEGACY_AUTHORITY_SOURCE_URL_EXACT";
    if (hits.length === 0) {
      hits = all.filter((a) => a.instrument && a.instrument === entry.instrument_title);
      basis = "LEGACY_AUTHORITY_INSTRUMENT_TITLE_EXACT";
    }
    if (hits.length > 0) {
      result.refs = hits.map((r) => refOf("LEGACY_AUTHORITY_RECORD", r, basis));
      result.basis = basis;
      result.candidate_count = hits.length;
      if (hits.length > 1) result.ambiguity = "MULTIPLE_RECORDED_MATCHES";
    }
  }
  if (result.refs.length === 0 && legacy.solRefused.length > 0) {
    const cut = String(recorded).slice(0, 24);
    const hits = legacy.solRefused.filter((r) => r.refusal_text.startsWith(cut) || r.refusal_text.includes(String(provision).slice(0, 40)));
    if (hits.length === 1) {
      result.refs = [refOf("LEGACY_REFUSAL_UNIT", hits[0], "LEGACY_REFUSAL_TEXT_MATCH")];
      result.basis = "LEGACY_REFUSAL_TEXT_MATCH";
      result.candidate_count = 1;
    }
  }
  if (result.refs.length === 0 && legacy.provinceInstruments.length > 0) {
    const region = entry.canonical_region_code;
    if (region && region.startsWith("CA-")) {
      const token = region.slice(3);
      const hits = legacy.provinceInstruments.filter((r) => r.province_token === token);
      if (hits.length === 1) {
        result.refs = [refOf("LEGACY_PROVINCE_INSTRUMENT", hits[0], "LEGACY_PROVINCE_INSTRUMENT_KEY_EQUALS_REGION_CODE")];
        result.basis = "LEGACY_PROVINCE_INSTRUMENT_KEY_EQUALS_REGION_CODE";
        result.candidate_count = 1;
      }
    }
  }
  if (result.refs.length === 0) {
    const cov = (legacy.coverage[artifact] || []).filter((c) => c.provision === recorded);
    if (cov.length > 0) {
      result.refs = cov.map((c) => refOf("LEGACY_COVERAGE_ENTRY", { provision: c.provision, label: c.label, outcome: c.outcome, ruleIds: c.ruleIds }, "LEGACY_COVERAGE_PROVISION_EXACT"));
      result.basis = "LEGACY_COVERAGE_PROVISION_EXACT";
      result.candidate_count = cov.length;
    }
  }
  if (result.refs.length === 0) {
    const sol = (legacy.solRows[artifact] || []).filter((r) => r.section === recorded);
    if (sol.length > 0) {
      result.refs = sol.map((r) => refOf("LEGACY_SOL_ROW", r, "LEGACY_SOL_SECTION_EXACT"));
      result.basis = "LEGACY_SOL_SECTION_EXACT";
      result.candidate_count = sol.length;
    }
  }
  const ruleIds = new Set(result.refs.filter((r) => r.ruleId).map((r) => r.ruleId));
  for (const [covFile, covEntries] of Object.entries(legacy.coverage)) {
    const hit = covEntries.find((c) => c.ruleIds && c.ruleIds.length > 0 && c.ruleIds.some((id) => ruleIds.has(id)));
    if (hit) {
      result.coverage = { source_artifact: covFile, provision: hit.provision, label: hit.label, outcome: hit.outcome, rule_ids: hit.ruleIds };
      result.coverage_basis = "LEGACY_COVERAGE_ENTRY_NAMES_THIS_RULE_ID";
      break;
    }
  }
  if (!result.coverage) {
    const citations = new Set(result.refs.map((r) => r.citation).filter(Boolean));
    for (const [covFile, covEntries] of Object.entries(legacy.coverage)) {
      const hit = covEntries.find((c) => citations.has(c.provision));
      if (hit) {
        result.coverage = { source_artifact: covFile, provision: hit.provision, label: hit.label, outcome: hit.outcome, rule_ids: hit.ruleIds };
        result.coverage_basis = "LEGACY_COVERAGE_PROVISION_EQUALS_RULE_CITATION";
        break;
      }
    }
  }
  joinCache[key] = result;
  return result;
}

module.exports = { entries, register, determinations, legacy, legacyJoin, FAMILY_LABELS, RECORD_TYPE_PURPOSE, legArtifacts: artifacts };


// ---------------------------------------------------------------- row assembly
const ADMITTED_SET = new Set(ADMITTED.map((a) => a.relative_path));
const DET_BY_ROW = {};
for (const p of determinations.pair_determinations || []) {
  for (const m of p.members) (DET_BY_ROW[m] = DET_BY_ROW[m] || []).push({ pair_id: p.pair_id, determination: p.determination });
}

function instrumentScreen(title) {
  const t = String(title || "");
  if (/guidance|guideline|guide\b|policy|summar|principles?\b|standard|advisory|bulletin|notice|commentary|FAQ/i.test(t)) {
    return { cls: "GUIDANCE_OR_POLICY_SUMMARY", needs_confirmation: false };
  }
  if (/\bcode\b|code of practice|rules of practice|practice direction/i.test(t)) {
    return { cls: "SUBORDINATE_CODE_OR_RULE", needs_confirmation: true };
  }
  if (/act\b|statute|law\b|regulation|r\.s\.|s\.c\.|s\.b\.|c\.c\.s\.m\.|r\.s\.o\.|r\.s\.n\.s\.|r\.s\.a\.|rcw|o\.c\.g\.a|ilcs|mcl/i.test(t)) {
    return { cls: "STATUTE_OR_REGULATION", needs_confirmation: false };
  }
  return { cls: "SCREEN_INCONCLUSIVE", needs_confirmation: true };
}

function dependencyAndLimitLists(entry, reg, join, screen, isInstrumentRecord) {
  const deps = [];
  const limits = [];
  if (!isInstrumentRecord) deps.push(entry.record_type === "GAP" ? "GAP_REMAINS_OPEN" : "REFUSAL_RETAINED");
  if (join.refs.length === 0) deps.push("LEGACY_OPERATIONAL_MAPPING_NOT_ESTABLISHED");
  if (join.ambiguity) deps.push("LEGACY_OPERATIONAL_MAPPING_AMBIGUOUS:" + join.ambiguity);
  if (!ADMITTED_SET.has(entry.source_artifact)) deps.push("ARTIFACT_NOT_IN_THE_ADMITTED_SET");
  if (screen.needs_confirmation) deps.push("INSTRUMENT_CLASS_CONFIRMATION");
  if (entry.canonical_jurisdiction_status === "COUNTRY_WIDE_SOURCE") deps.push("COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED");
  if (entry.canonical_jurisdiction_status === "NO_LEGACY_SOURCE_ENTRY") deps.push("NO_SOURCE_RECORDED_FOR_THIS_REGION");
  if (/\[VERIFY\]/i.test(String(entry.provision_or_citation))) deps.push("SECTION_NOT_VERIFIED_IN_THE_LEGACY_REGISTRY");
  if (reg.disposition === "UNRESOLVED") deps.push("REGISTER_DISPOSITION_UNRESOLVED");
  if (DET_BY_ROW[entry.source_entry_id]) deps.push("DUPLICATE_IDENTITY_BOOKKEEPING");
  if (/NOT RECORDED/i.test(String(entry.source_locator)) || /NOT RECORDED/i.test(String(entry.effective_information_as_recorded))) {
    limits.push("LOCATOR_OR_EFFECTIVE_INFORMATION_NOT_RECORDED");
  }
  if (/not retrieved|no pinpoint locator|MISSING_EVIDENCE|not read|not verified/i.test(String(entry.verification_state_as_recorded))) {
    limits.push("SOURCE_DISCOVERY_PROVENANCE_INCOMPLETE");
  }
  if (!isInstrumentRecord) limits.push("NO_LEGAL_INSTRUMENT_RECORDED_FOR_THIS_SCOPE");
  limits.push("PRIOR_REVIEW_RECORD_NOT_HELD_IN_THIS_WORKSPACE");
  limits.push("FORMAL_EDITION_OR_HISTORICAL_VERSION_NOT_RECORDED");
  return { deps: Array.from(new Set(deps)), limits: Array.from(new Set(limits)) };
}

function buildRow(entry) {
  const reg = register[entry.source_entry_id] || {};
  const join = legacyJoin(entry);
  const screen = instrumentScreen(entry.instrument_title);
  const isInstrumentRecord = entry.record_type !== "GAP" && entry.record_type !== "REFUSAL";
  const acceptedState = !isInstrumentRecord
    ? "NOT_ACCEPTED_NO_STATUTE_RECORDED"
    : screen.cls === "GUIDANCE_OR_POLICY_SUMMARY"
      ? "ACCEPTED_AS_RECORDED_MATERIAL_NOT_AS_A_STATUTE"
      : "OWNER_ACCEPTED_LEGAL_AUTHORITY";
  const lists = dependencyAndLimitLists(entry, reg, join, screen, isInstrumentRecord);

  const layers = [];
  if (lists.deps.some((d) => /INSTRUMENT_CLASS_CONFIRMATION|COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED|LEGACY_OPERATIONAL_MAPPING|SECTION_NOT_VERIFIED/.test(d))) {
    layers.push("ADMINISTRATIVE_RECONCILIATION");
  }
  if (isInstrumentRecord) {
    layers.push("REPORT_FORMAT_AND_APPLICATION_DEPENDENCIES");
    layers.push("READINESS_FOR_DETERMINISTIC_EVALUATION");
  }

  return {
    source_entry_id: entry.source_entry_id,
    legacy_statute_or_provision: {
      instrument_title: entry.instrument_title,
      provision_or_citation: entry.provision_or_citation,
      source_locator: entry.source_locator,
      source_artifact: entry.source_artifact,
      source_artifact_sha256: entry.source_artifact_sha256,
      source_artifact_is_admitted: ADMITTED_SET.has(entry.source_artifact),
      effective_information_as_recorded: entry.effective_information_as_recorded,
      verification_state_as_recorded: entry.verification_state_as_recorded,
    },
    record_type: entry.record_type,
    legal_family: entry.legal_family,
    source_family_label: FAMILY_LABELS[entry.legal_family] || "UNRECOGNISED_FAMILY_CODE",
    broadly_relevant_reporting_issue_or_purpose: {
      statement: RECORD_TYPE_PURPOSE[entry.record_type] || "Recorded source entry.",
      recorded_legacy_subject: join.refs.length > 0 && join.refs[0].subject ? join.refs[0].subject : null,
      basis: "RATIFIED_SOURCE_FAMILY_LABEL + RECORD_TYPE + RECORDED_INSTRUMENT_TITLE + RECORDED_LEGACY_SUBJECT",
    },
    owner_acceptance: {
      state: acceptedState,
      acceptance_basis: "OWNER_DIRECTIVE_PHASE5-001O",
      acceptance_is_independent_verification_by_this_order: false,
      instrument_class_screen: screen.cls,
      instrument_class_confirmation_required: isInstrumentRecord && screen.needs_confirmation,
      screen_basis: "MECHANICAL_TITLE_SCREEN — a screening flag, not a legal classification",
    },
    existing_source_ids: {
      source_entry_id: entry.source_entry_id,
      legal_provision_key: reg.legal_provision_key || null,
      canonical_entry_id: reg.canonical_entry_id || null,
      duplicate_group_id: reg.duplicate_group_id || null,
      duplicate_link_basis: reg.duplicate_link_basis || null,
      duplicate_evidence: reg.duplicate_evidence || null,
      relation_determinations: DET_BY_ROW[entry.source_entry_id] || [],
    },
    established_jurisdiction_associations: {
      legacy_jurisdiction_reference: entry.legacy_jurisdiction_reference,
      canonical_jurisdiction_status: entry.canonical_jurisdiction_status,
      canonical_country_code: entry.canonical_country_code,
      canonical_region_code: entry.canonical_region_code,
      legacy_rule_table_key: join.refs.length > 0 && join.refs[0].key ? join.refs[0].key : null,
    },
    existing_operational_mapping: {
      state: join.refs.length > 1 ? "ESTABLISHED_MULTIPLE_RECORDED_ROWS" : join.refs.length === 1 ? "ESTABLISHED" : "NOT_ESTABLISHED",
      basis: join.basis,
      ambiguity: join.ambiguity,
      legacy_rule_references: join.refs,
      legacy_coverage_review: join.coverage,
      legacy_coverage_basis: join.coverage_basis,
    },
    remaining_implementation_dependencies: lists.deps,
    administrative_limitations: lists.limits,
    register_state: {
      disposition: reg.disposition || null,
      disposition_state: reg.disposition_state || null,
      blocker_type: reg.blocker_type || null,
      missing_artifact: reg.missing_artifact || null,
      clearing_authority: reg.clearing_authority || null,
    },
    gate_layer_open: layers,
    removal_permitted: "NO",
  };
}

const LEDGER = entries.map(buildRow);


// ---------------------------------------------------------------- summary
function tally(list, keyFn) {
  const out = {};
  for (const x of list) {
    const k = keyFn(x);
    out[k] = (out[k] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

const acceptedRows = LEDGER.filter((r) => r.owner_acceptance.state === "OWNER_ACCEPTED_LEGAL_AUTHORITY");
const byRegion = {};
for (const r of LEDGER) {
  const j = r.established_jurisdiction_associations;
  const key = j.canonical_region_code || (r.legacy_jurisdiction_reference ? "SOURCE:" + String(r.legacy_jurisdiction_reference).slice(0, 40) : "NO_JURISDICTION_RECORDED");
  byRegion[key] = byRegion[key] || { total: 0, accepted: 0, content_rule: 0, limitation_record: 0, mapped: 0, country_wide_source: 0 };
  byRegion[key].total += 1;
  if (r.owner_acceptance.state === "OWNER_ACCEPTED_LEGAL_AUTHORITY") byRegion[key].accepted += 1;
  if (r.record_type === "CONTENT_RULE") byRegion[key].content_rule += 1;
  if (r.record_type === "LIMITATION_RECORD") byRegion[key].limitation_record += 1;
  if (r.existing_operational_mapping.state !== "NOT_ESTABLISHED") byRegion[key].mapped += 1;
  if (r.established_jurisdiction_associations.canonical_jurisdiction_status === "COUNTRY_WIDE_SOURCE") byRegion[key].country_wide_source += 1;
}

// Application alignment: the consumer wizard's hard-coded selector list against the enumeration of record.
const enumeration = {};
for (const line of L.read(path.join(L.ROOT, "CRP_JURISDICTION_ENUMERATION.md")).split(/\r?\n/)) {
  const m = /^\| `(CA|US|GB|AU)` \| `([A-Z]{2}-[A-Z]{2,3})` \| `[A-Z-]+` \| (.+) \|$/.exec(line);
  if (m) enumeration[m[2]] = { country: m[1], name: m[3].trim() };
}
const wizardSrc = L.read(path.join(L.ROOT, "consumer-wizard", "dist", "app.js"));
const wizardLiteral = wizardSrc.slice(wizardSrc.indexOf("const regions=") + "const regions=".length, wizardSrc.indexOf(";\nlet state="));
const wizardRegions = {};
const wizardCountryKeys = Array.from(wizardLiteral.matchAll(/(?:^|\{|,)\s*'?([A-Za-z][\w ]*)'?\s*:\s*\[/g)).map((m) => m[1]);
for (const name of wizardLiteral.matchAll(/'([^']+)'/g)) wizardRegions[name[1]] = true;
const canonicalNames = new Set(Object.values(enumeration).map((e) => e.name.replace(/ \[.*\]$/, "")));
const wizardNames = new Set(Object.keys(wizardRegions).filter((n) => !wizardCountryKeys.includes(n)));
const wizardNotCanonical = Array.from(wizardNames).filter((n) => !canonicalNames.has(n));
const canonicalNotInWizard = Array.from(canonicalNames).filter((n) => !wizardNames.has(n));

const summary = {
  artifact: "coverage_summary.json",
  work_order: "PHASE5-001O",
  created_utc: "2026-09-30",
  authority: "owner directive recorded by PHASE5-001O: relevant legacy statutes are OWNER_ACCEPTED_LEGAL_AUTHORITY",
  ledger_rows: LEDGER.length,
  enumeration_coverage: (() => {
    const regionCodes = new Set(LEDGER.map((r) => r.established_jurisdiction_associations.canonical_region_code).filter(Boolean));
    const withAccepted = new Set(
      LEDGER.filter((r) => r.owner_acceptance.state === "OWNER_ACCEPTED_LEGAL_AUTHORITY" && r.established_jurisdiction_associations.canonical_region_code).map(
        (r) => r.established_jurisdiction_associations.canonical_region_code,
      ),
    );
    const enumerated = Object.keys(enumeration);
    const withoutAnyRow = enumerated.filter((c) => !regionCodes.has(c));
    const withRowButNoAcceptedEntry = enumerated.filter((c) => regionCodes.has(c) && !withAccepted.has(c));
    return {
      canonical_regions_in_the_enumeration: enumerated.length,
      canonical_regions_appearing_in_the_ledger: regionCodes.size,
      canonical_regions_with_at_least_one_accepted_entry: withAccepted.size,
      canonical_regions_with_no_ledger_row: withoutAnyRow,
      canonical_regions_with_a_ledger_row_but_no_accepted_entry: withRowButNoAcceptedEntry,
      statement:
        "Every canonical region except those listed here appears in the ledger. A region with no ledger row has no recorded source entry; no entry may be invented for it.",
    };
  })(),
  owner_acceptance: tally(LEDGER, (r) => r.owner_acceptance.state),
  instrument_class_screen: tally(LEDGER, (r) => r.owner_acceptance.instrument_class_screen),
  record_type: tally(LEDGER, (r) => r.record_type),
  legal_family: tally(LEDGER, (r) => r.source_family_label),
  existing_operational_mapping_state: tally(LEDGER, (r) => r.existing_operational_mapping.state),
  existing_operational_mapping_basis: tally(LEDGER, (r) => r.existing_operational_mapping.basis),
  legacy_coverage_review_linked: LEDGER.filter((r) => r.existing_operational_mapping.legacy_coverage_review).length,
  legacy_rule_reference_count: LEDGER.reduce((a, r) => a + r.existing_operational_mapping.legacy_rule_references.length, 0),
  canonical_jurisdiction_status: tally(LEDGER, (r) => r.established_jurisdiction_associations.canonical_jurisdiction_status),
  canonical_country_code: tally(LEDGER, (r) => String(r.established_jurisdiction_associations.canonical_country_code)),
  dependency_frequency: tally(
    LEDGER.flatMap((r) => r.remaining_implementation_dependencies),
    (d) => d,
  ),
  administrative_limitation_frequency: tally(
    LEDGER.flatMap((r) => r.administrative_limitations),
    (d) => d,
  ),
  register_disposition: tally(LEDGER, (r) => String(r.register_state.disposition)),
  coverage_available_for_implementation: {
    accepted_entries: acceptedRows.length,
    accepted_content_rules: acceptedRows.filter((r) => r.record_type === "CONTENT_RULE").length,
    accepted_limitation_records: acceptedRows.filter((r) => r.record_type === "LIMITATION_RECORD").length,
    accepted_authority_records: acceptedRows.filter((r) => r.record_type === "AUTHORITY_RECORD").length,
    accepted_citation_records: acceptedRows.filter((r) => r.record_type === "CITATION_RECORD").length,
  },
  per_jurisdiction: byRegion,
  application_alignment: {
    source: "consumer-wizard/dist/app.js (the consumer application's hard-coded selector list) against CRP_JURISDICTION_ENUMERATION.md",
    wizard_country_keys: wizardCountryKeys,
    wizard_region_count: wizardNames.size,
    canonical_region_count: Object.keys(enumeration).length,
    wizard_values_not_in_the_enumeration: wizardNotCanonical,
    canonical_regions_absent_from_the_wizard: canonicalNotInWizard.sort(),
    finding: "The consumer application's selectable jurisdictions are hard-coded and are not derived from the approved enumeration: canonical regions are missing and the selector carries display-name values only. Driving the selector from the accepted enumeration and coverage ledger is an application dependency, not a legal one.",
  },
  what_this_summary_does_not_do: [
    "It does not certify a unique legal-provision count; the duplicate bookkeeping and count limits stay recorded as administrative limitations.",
    "It does not admit a governed rule, create legal coverage, or authorise a finding.",
    "It does not assert a legal classification: the instrument-class screen is a mechanical title screen only.",
  ],
  created_by: "PHASE5-001O",
};


// ---------------------------------------------------------------- writers
const inputDigests = {
  "CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md": L.sha256(CATALOGUE),
  "SOURCE_CAPTURES/PHASE5-001K/rescreen_register.csv": L.sha256(REGISTER),
  "SOURCE_CAPTURES/PHASE5-001N/relation_determinations.json": L.sha256(DET),
  "SOURCE_CAPTURES/PHASE5-001O/admitted_artifacts.json": L.sha256(path.join(L.OUT, "admitted_artifacts.json")),
  "CRP_JURISDICTION_ENUMERATION.md": L.sha256(path.join(L.ROOT, "CRP_JURISDICTION_ENUMERATION.md")),
  "consumer-wizard/dist/app.js": L.sha256(path.join(L.ROOT, "consumer-wizard", "dist", "app.js")),
  "CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md": L.sha256(path.join(L.ROOT, "CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md")),
};

const ledgerDoc = {
  artifact: "source_id_coverage_ledger.json",
  work_order: "PHASE5-001O",
  created_utc: "2026-09-30",
  purpose:
    "one row per catalogue source entry, recording the legacy statute or provision, the existing source IDs and legacy rule references, the established jurisdiction associations, the broadly relevant reporting issue or rule purpose, the existing operational mapping and the remaining implementation dependencies",
  authority_basis:
    "owner directive recorded by PHASE5-001O: the relevant statutes in the legacy system are OWNER_ACCEPTED_LEGAL_AUTHORITY; missing provenance, historical versions and prior-review records are not prerequisites for accepting them; broadly relevant statutory provisions are included, and a provision may support more than one rule, jurisdiction or report condition where the legacy corpus establishes that relationship",
  acceptance_statement:
    "Acceptance recorded here is owner-directed. This order performed no independent legal verification, no re-review of the statutes and no provenance investigation. The digest check reported in admitted_artifacts.json is a custody fact about which bytes are on disk, not a legal conclusion.",
  inputs_and_their_digests: inputDigests,
  legacy_corpus: {
    legacy_source_root: L.LEG,
    admitted_artifacts_read: artifacts.length,
    admitted_artifacts_verified_by_digest: admittedDoc.admitted_artifacts_verified,
  },
  duplicate_bookkeeping_and_count_status: {
    status: "ADMINISTRATIVE_LIMITATION_RECORDED_NOT_BLOCKING",
    relations_recorded_by_phase5_001l: 2358,
    relation_determinations_carried_from_phase5_001n: determinations.outcome_tally || null,
    unresolved_duplicate_identity: ["CRP-LSRC-0409", "CRP-LSRC-0411"],
    unique_legal_provision_count: "NOT_CERTIFIED",
    statement:
      "An exact corpus-wide unique-legal-provision count is not asserted here. Under the recorded owner directive the count is bookkeeping: it is carried as an administrative limitation and does not block acceptance of the statutes or coverage planning.",
  },
  field_notes: {
    legacy_rule_references:
      "A reference is recorded only where an exact recorded string basis exists between the catalogue entry and a legacy record, and each row names the basis it used. A row with no basis records NOT_ESTABLISHED and carries LEGACY_OPERATIONAL_MAPPING_NOT_ESTABLISHED as an implementation dependency. Nothing was inferred, normalised or broadened.",
    broadly_relevant_reporting_issue_or_purpose:
      "Composed from the ratified source-family label, the catalogue record type, the recorded instrument title and, where available, the recorded legacy subject. No legal meaning was invented.",
    remaining_implementation_dependencies: "Work items; each is a task to perform against the accepted corpus, not a reason to reject it.",
    administrative_limitations:
      "Recorded limitations of the legacy recordkeeping. Under the owner directive they are limitations only and are not acceptance prerequisites.",
  },
  rows: LEDGER,
};

const csvColumns = [
  "source_entry_id",
  "record_type",
  "legal_family",
  "source_family_label",
  "instrument_title",
  "provision_or_citation",
  "legacy_jurisdiction_reference",
  "canonical_jurisdiction_status",
  "canonical_country_code",
  "canonical_region_code",
  "owner_acceptance_state",
  "instrument_class_screen",
  "existing_operational_mapping_state",
  "existing_operational_mapping_basis",
  "legacy_rule_reference_ids",
  "legacy_coverage_outcome",
  "remaining_implementation_dependencies",
  "administrative_limitations",
  "register_disposition",
  "register_disposition_state",
  "missing_artifact",
  "gate_layer_open",
  "removal_permitted",
];

const csvCell = (v) => '"' + String(v === null || v === undefined ? "" : v).replace(/"/g, '""') + '"';
const refId = (x) => x.ruleId || x.id || x.rule_id || (x.unit ? "REFUSAL_UNIT:" + x.unit : "") || (x.province_token ? "PROVINCE_INSTRUMENT:" + x.province_token : "") || "";
const csvLines = [csvColumns.map(csvCell).join(",")];
for (const r of LEDGER) {
  const m = r.existing_operational_mapping;
  csvLines.push(
    [
      r.source_entry_id,
      r.record_type,
      r.legal_family,
      r.source_family_label,
      r.legacy_statute_or_provision.instrument_title,
      r.legacy_statute_or_provision.provision_or_citation,
      r.established_jurisdiction_associations.legacy_jurisdiction_reference,
      r.established_jurisdiction_associations.canonical_jurisdiction_status,
      r.established_jurisdiction_associations.canonical_country_code,
      r.established_jurisdiction_associations.canonical_region_code,
      r.owner_acceptance.state,
      r.owner_acceptance.instrument_class_screen,
      m.state,
      m.basis,
      m.legacy_rule_references.map(refId).filter(Boolean).join("; "),
      m.legacy_coverage_review ? m.legacy_coverage_review.outcome : "",
      r.remaining_implementation_dependencies.join("; "),
      r.administrative_limitations.join("; "),
      r.register_state.disposition,
      r.register_state.disposition_state,
      r.register_state.missing_artifact,
      r.gate_layer_open.join("; "),
      r.removal_permitted,
    ]
      .map(csvCell)
      .join(","),
  );
}

fs.writeFileSync(path.join(L.OUT, "source_id_coverage_ledger.json"), JSON.stringify(ledgerDoc, null, 2), "utf8");
fs.writeFileSync(path.join(L.OUT, "source_id_coverage_ledger.csv"), csvLines.join("\n") + "\n", "utf8");
fs.writeFileSync(path.join(L.OUT, "coverage_summary.json"), JSON.stringify(summary, null, 2), "utf8");

console.log("ledger rows:", LEDGER.length);
console.log("accepted:", acceptedRows.length, "| mapping established:", LEDGER.filter((r) => r.existing_operational_mapping.state !== "NOT_ESTABLISHED").length);
console.log("by basis:", JSON.stringify(summary.existing_operational_mapping_basis));
console.log("wizard values not in enumeration:", JSON.stringify(wizardNotCanonical));
console.log("canonical regions absent from wizard:", canonicalNotInWizard.length);

