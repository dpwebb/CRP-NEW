'use strict';
/**
 * formats.cjs — the SHARED EXTRACTION-ADAPTER INTERFACE, and the supported-format boundary.
 *
 * OWNER-ALL82-001 / B2, plan section 6: "Use jurisdiction rule data and country/bureau format adapters
 * around shared extraction and evaluation interfaces." This module is that seam for presentation reading.
 * It ADDS NO PARSER: it registers the presentation the repository already evidences, and routes every
 * document through the CA-NS unit's own admission gate (`admitDocument`) and extraction (`extractFacts`),
 * required directly rather than copied.
 *
 * Boundaries this module is responsible for keeping:
 *   • ONE SPECIMEN IS ONE SPECIMEN. A structurally identical PDF that is not the evidenced artifact is
 *     refused as NOT_THE_EVIDENCED_SPECIMEN. It is never admitted to make a consumer journey look complete.
 *   • EXTRACTION FAILURE IS NOT FIELD ABSENCE. A refused document reports NO records at all and carries its
 *     refusal separately; a demonstration model reports its records but is stamped as carrying no report
 *     evidence. The two cannot be read as each other because `document_read` and `support` move together.
 *   • NO REPORT TEXT IS RETAINED. The page model is built in memory and discarded; only the normalized
 *     extraction record below is returned, and it contains labels, dates and page/line locations — never
 *     page text, never an account number.
 */

const {
  buildPdfDocumentModel: buildPdfModelFromDisk,
  makeSyntheticModel,
  readPinnedPresentationPointer
} = require('../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { extractFacts } = require('../../internal-validation/ca-ns-last-payment-six-year/extraction.cjs');
const { admitDocument, PR_01_CONTRACT } = require('../../internal-validation/ca-ns-last-payment-six-year/presentation-contract.cjs');
const { FACT_STATUS } = require('../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');
const auFamily = require('./format-families/au-equifax-consumer.cjs');
const usFamily = require('./format-families/us-experian-consumer.cjs');
const gbFamily = require('./format-families/gb-experian-consumer.cjs');
const tuCaFamily = require('./format-families/tu-ca-consumer.cjs');
const caFormatScope = require('./format-families/ca-consumer-format-scope.cjs');
const caFacts = require('./ca-consumer-file-facts.cjs');
const generalIntake = require('./general-intake.cjs');
const { sourceForField } = require('./report-fact-sources.cjs');

/**
 * B4 continuation — the service's own PDF model builder.
 *
 * It is the unit's builder with ONE option switched on: when a PDF is encrypted with an owner password whose
 * own flags permit copying, its text layer IS read. That option is what makes a real TransUnion Canada
 * consumer disclosure readable at all; without it the service would refuse a genuine consumer's report for a
 * container property that does not protect it.
 *
 * It changes nothing else. A PDF whose flags WITHHOLD copying is still never read, the model still records
 * `encrypted: true`, and the PR-01 gate still refuses an encrypted document at `NOT_ENCRYPTED`. The default of
 * the unit's own builder is untouched, so every earlier measurement of it still holds.
 */
function buildPdfDocumentModel(file, options) {
  return buildPdfModelFromDisk(file, Object.assign({ readWhenEncryptionPermitsCopy: true }, options || {}));
}

/**
 * B6-INGEST-003 — a model for a raw IMAGE file (PNG/JPEG). It has no PDF pages and no native text; the
 * general intake reads it through the local OCR `readImage` path. Coordinates are image pixels.
 */
function buildImageDocumentModel(file) {
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const model = {
    kind: 'IMAGE', synthetic: false, synthetic_label: null, is_image: true, path: file,
    sha256: null, bytes: null, encrypted: false, page_count: 1,
    page_size: { width_pt: null, height_pt: null, label: 'image', raw: null },
    producer: null, creator: null,
    text_extraction_tool: 'tesseract (local, direct image)',
    structure_tool: 'image magic bytes (no PDF parser)',
    pages: [], read_errors: [], synthetic_markers_found: [],
    not_a_pdf: false, encryption: null, text_extraction_permitted: null,
    read_when_encryption_permits_copy_requested: false
  };
  if (!fs.existsSync(file)) {
    model.read_errors.push({ stage: 'open', error: 'the file does not exist' });
    return model;
  }
  model.sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
  model.bytes = fs.statSync(file).size;
  return model;
}


/**
 * The extraction-adapter registry. B4 extends this list; nothing else needs to change.
 *
 * Two KINDS of admission are registered, and they are not interchangeable:
 *   • `EXACT_SPECIMEN_DIGEST` — one artifact, pinned byte for byte. Adding a second consumer report this way
 *     is impossible, because a consumer's own report is never byte-identical to a sample.
 *   • `EVIDENCED_STRUCTURAL_CONTRACT` — a measured structure, evidenced from a captured public artifact, that
 *     a document either satisfies or does not. This is what makes a second country's format reachable.
 * A family is registered alongside the id of the artifact its contract was evidenced from, so the evidence
 * is never an unstated assumption.
 */
const EXTRACTION_ADAPTERS = Object.freeze([
  Object.freeze({
    extraction_adapter_id: 'CA-EQUIFAX-CONSUMER-PR-01',
    presentation_id: 'PR-01',
    family_id: null,
    admission_path: 'EXACT_SPECIMEN_DIGEST',
    display_name: 'Equifax Canada consumer credit report — the evidenced specimen',
    country: 'CA',
    markets: Object.freeze(['CA']),
    container: 'PDF',
    evidenced_artifact_id: PR_01_CONTRACT.evidenced_artifact_id,
    evidenced_sha256: PR_01_CONTRACT.evidenced_sha256,
    /* B4: what the evidence for this entry does and does not establish, so no message has to guess. */
    evidence_currency: 'SUPPORTED_PRESENTATION_FOR_ONE_SELECTED_UNIT',
    evidence_scope: caFormatScope.FAMILY_ADMISSION.reason,
    boundary: PR_01_CONTRACT.boundary
  }),
  Object.freeze({
    extraction_adapter_id: 'CA-TRANSUNION-CONSUMER-FAMILY',
    presentation_id: tuCaFamily.FAMILY_ID,
    family_id: tuCaFamily.FAMILY_ID,
    admission_path: 'EVIDENCED_STRUCTURAL_CONTRACT',
    display_name: 'TransUnion Canada consumer disclosure — the evidenced format family',
    country: 'CA',
    markets: Object.freeze(['CA']),
    container: 'PDF',
    evidenced_artifact_id: tuCaFamily.FAMILY_CONTRACT.evidenced_artifact_id,
    evidenced_sha256: tuCaFamily.FAMILY_CONTRACT.evidenced_sha256,
    /* B4 continuation: a REAL present-day consumer document, unlike the GB family's 2007 fictitious example. */
    evidence_currency: tuCaFamily.CURRENCY_EVIDENCE.status,
    present_day_support_claimed: tuCaFamily.CURRENCY_EVIDENCE.present_day_support_claimed,
    boundary: tuCaFamily.FAMILY_CONTRACT.boundary[0]
  }),
  Object.freeze({
    extraction_adapter_id: 'AU-EQUIFAX-CONSUMER-FAMILY',
    presentation_id: auFamily.FAMILY_ID,
    family_id: auFamily.FAMILY_ID,
    admission_path: 'EVIDENCED_STRUCTURAL_CONTRACT',
    display_name: 'Equifax Australia consumer credit file — the evidenced format family',
    country: 'AU',
    markets: Object.freeze(['AU']),
    container: 'PDF',
    evidenced_artifact_id: auFamily.FAMILY_CONTRACT.evidenced_artifact_id,
    evidenced_sha256: auFamily.FAMILY_CONTRACT.evidenced_sha256,
    evidence_currency: 'EVIDENCED_FROM_ONE_CAPTURED_PUBLIC_SAMPLE',
    boundary: auFamily.FAMILY_CONTRACT.boundary[0]
  }),
  Object.freeze({
    extraction_adapter_id: 'US-EXPERIAN-CONSUMER-FAMILY',
    presentation_id: 'US-CONSUMER-DISCLOSURE',
    family_id: usFamily.FAMILY_ID,
    admission_path: 'EVIDENCED_STRUCTURAL_CONTRACT',
    display_name: 'Experian United States consumer credit disclosure — the evidenced format family',
    country: 'US',
    markets: Object.freeze(['US']),
    container: 'PDF',
    evidenced_artifact_id: usFamily.FAMILY_CONTRACT.evidenced_artifact_id,
    evidenced_sha256: usFamily.FAMILY_CONTRACT.evidenced_sha256,
    evidence_currency: 'EVIDENCED_FROM_ONE_CAPTURED_OFFICIAL_CONSUMER_SAMPLE',
    boundary: usFamily.FAMILY_CONTRACT.boundary[0]
  }),
  Object.freeze({
    extraction_adapter_id: 'GB-EXPERIAN-CONSUMER-FAMILY',
    presentation_id: gbFamily.FAMILY_ID,
    family_id: gbFamily.FAMILY_ID,
    admission_path: 'EVIDENCED_STRUCTURAL_CONTRACT',
    display_name: 'Experian United Kingdom consumer credit report — the evidenced format family',
    country: 'GB',
    markets: Object.freeze(['GB']),
    container: 'PDF',
    evidenced_artifact_id: gbFamily.FAMILY_CONTRACT.evidenced_artifact_id,
    evidenced_sha256: gbFamily.FAMILY_CONTRACT.evidenced_sha256,
    /* B4: this is the ONLY entry whose currency is NOT established, and it says so here rather than in prose. */
    evidence_currency: gbFamily.CURRENCY_EVIDENCE.status,
    present_day_support_claimed: gbFamily.CURRENCY_EVIDENCE.present_day_support_claimed,
    boundary: gbFamily.FAMILY_CONTRACT.boundary[0]
  })
]);

const SUPPORT = Object.freeze({
  ACTUAL_REPORT_EVIDENCE: 'ACTUAL_REPORT_EVIDENCE',
  DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT: 'DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT'
});

/** The presentation the demonstration models are built to. They are NOT evidence for it — see below. */
const DEMONSTRATION_SHAPE = 'PR-01';

function listSupportedFormats() {
  return EXTRACTION_ADAPTERS.map((a) => ({
    presentation_id: a.presentation_id,
    display_name: a.display_name,
    country: a.country,
    container: a.container,
    read_support_is: a.admission_path,
    evidence_currency: a.evidence_currency,
    present_day_support_claimed: a.present_day_support_claimed === false ? false : true,
    note: a.admission_path === 'EXACT_SPECIMEN_DIGEST'
      ? 'Read support is evidenced for this ONE specimen only, by its own pinned digest. A structurally similar file is refused, and so is another real Equifax Canada report — this admission does not widen with a second document.'
      : 'Read support is evidenced for this format FAMILY, by measured structure, from the artifact named in evidenced_artifact_id. A file that does not satisfy the family structure is refused, and the refusal names the predicate it failed.',
    currency_note: a.evidence_currency === 'HISTORICAL_DEMONSTRATION_EVIDENCE_ONLY'
      ? 'This family is evidenced from a captured example dated 1 June 2007 that is marked on its own face as fictitious. It evidences STRUCTURE ONLY: present-day GB support is NOT claimed, and the vintage is a named blocker.'
      : (a.evidence_currency === tuCaFamily.CURRENCY_EVIDENCE.status
        ? 'This family is evidenced from ONE real present-day TransUnion Canada consumer disclosure. The STRUCTURE it measures is admitted; a different product, print date or language is refused by the same predicates.'
        : 'The currency of this evidence is recorded in evidence_currency; no broader claim is made than it supports.')
  }));
}

/**
 * B4: what each market's evidence supports, in one object, so the consumer surface and the release check read
 * the same statement. Canada carries the scope module's own conclusion; GB carries the currency record.
 */
function presentationScope() {
  return {
    CA: {
      admitted: [caFormatScope.ADMITTED.presentation_id],
      exact_specimen_admissions: [caFormatScope.ADMITTED.presentation_id],
      families_admitted: caFormatScope.COUNTRY_FAMILY_ADMISSION.families_admitted.map((row) => row.family_id),
      /* B4 continuation: TRUE, because a measured structural contract now admits the TransUnion Canada
         consumer disclosure. The Equifax presentation's own family admission is still false and is reported
         separately, so the two can never be read as each other. */
      family_admitted: caFormatScope.COUNTRY_FAMILY_ADMISSION.admitted,
      equifax_family_admitted: caFormatScope.FAMILY_ADMISSION.admitted,
      reason: caFormatScope.COUNTRY_FAMILY_ADMISSION.reason,
      not_admitted: caFormatScope.RECORDED_NOT_ADMITTED.map((row) => row.presentation_id),
      documentation_only: caFormatScope.DOCUMENTATION_ONLY.map((row) => row.artifact_id),
      plain: caFormatScope.coverageSentence()
    },
    GB: {
      admitted: [gbFamily.FAMILY_ID],
      family_admitted: true,
      present_day_support_claimed: gbFamily.CURRENCY_EVIDENCE.present_day_support_claimed,
      evidence_vintage: gbFamily.CURRENCY_EVIDENCE.evidence_vintage,
      currency_validated: gbFamily.CURRENCY_EVIDENCE.currency_validated,
      plain: 'The United Kingdom family is evidenced from one captured consumer report example dated 1 June 2007 and marked on its own face as fictitious. Its currency for present-day GB files is not established, and no present-day GB support is claimed.'
    }
  };
}

function adapterFor(presentationId) {
  return EXTRACTION_ADAPTERS.find((a) => a.presentation_id === presentationId) || null;
}

/** A display name for a recognised presentation, including the general intake path (B6-INGEST-002). */
function displayNameFor(presentationId, bureau) {
  if (presentationId === generalIntake.GENERAL_PRESENTATION_ID) {
    return `${bureau ? bureau + ' ' : ''}credit report (general intake — bureau and report-content plausibility)`;
  }
  const adapter = adapterFor(presentationId);
  return adapter ? adapter.display_name : null;
}

/** Which of the registered presentations may be offered for a selected country. */
function formatsForCountry(country) {
  return EXTRACTION_ADAPTERS.filter((a) => a.markets.includes(country));
}

/**
 * The family READERS. A registry entry names a presentation; a reader is the module that measures it. Both
 * are needed, and a registry entry with no reader is a configuration error, not a silent pass.
 */
const FAMILY_READERS = Object.freeze({
  [auFamily.FAMILY_ID]: auFamily,
  [usFamily.FAMILY_ID]: usFamily,
  [gbFamily.FAMILY_ID]: gbFamily,
  [tuCaFamily.FAMILY_ID]: tuCaFamily
});

/** The registered families that may admit a document for a selected country. */
function familiesForCountry(country) {
  return EXTRACTION_ADAPTERS
    .filter((a) => a.family_id && a.markets.includes(country))
    .map((a) => Object.assign({}, a, { reader: FAMILY_READERS[a.family_id] || null }))
    .filter((a) => a.reader !== null);
}

/**
 * Extract through the shared adapter interface.
 *
 * `options.mode`:
 *   'REPORT'        — a real file. Only an ADMITTED PR-01 document is read at all; anything else reports
 *                     zero records and an explicit refusal, so nothing can be mistaken for field absence.
 *   'DEMONSTRATION' — an in-memory synthetic model. Labelled, and stamped as carrying no report evidence.
 */
/**
 * Extract through the shared adapter interface.
 *
 * `options.mode`:
 *   'REPORT'        — a real file. Only an ADMITTED presentation is read at all; anything else reports zero
 *                     records and an explicit refusal, so nothing can be mistaken for field absence.
 *   'DEMONSTRATION' — an in-memory synthetic model. Labelled, and stamped as carrying no report evidence.
 *
 * `options.country` scopes which presentations may admit the document.
 */
function extractWithSharedAdapter(model, options) {
  const opts = options || {};
  const demonstration = opts.mode === 'DEMONSTRATION';
  if (demonstration && (!model || model.synthetic !== true)) throw new Error('DEMONSTRATION_MODE_REQUIRES_A_SYNTHETIC_MODEL');

  const container = detectContainer(model);
  const supported = detectSupportedFormat(model, { country: opts.country });
  if (!demonstration && !supported.supported) return refusedExtraction(supported, container);

  if (demonstration) {
    /* A demonstration model is built to the DEMONSTRATION_SHAPE. Naming the shape is what lets the checks
       that are written for it actually run, so "checks performed" means checks performed. It is NOT evidence
       for that shape: `presentation_evidence` stays false and every result is stamped as such. */
    const raw = extractFacts(model, null, { synthetic_test_input: true });
    return Object.assign({
      presentation_id: DEMONSTRATION_SHAPE,
      family_id: null,
      demonstration: true,
      extraction_ran: true,
      presentation_evidence: false,
      container,
      admission: raw.admission,
      refusal: null,
      support: SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT
    }, normalizeExtraction(raw));
  }

  if (supported.presentation_id === generalIntake.GENERAL_PRESENTATION_ID) {
    /* B6-INGEST-002 — the general reader. It may downgrade an image-only admit to UNREADABLE (OCR failed) or
       UNRELATED (no bureau / no report content after OCR), which is reported as a refusal rather than as
       report content. */
    const general = generalIntake.extract(model, { country: opts.country });
    const admitted = general.admitted === true;
    const refusalReason = admitted ? null : (general.outcome === 'UNRELATED' ? 'UNRELATED_DOCUMENT' : 'UNREADABLE_DOCUMENT');
    return Object.assign({
      presentation_id: generalIntake.GENERAL_PRESENTATION_ID,
      family_id: null,
      demonstration: false,
      extraction_ran: admitted,
      presentation_evidence: admitted,
      container,
      admission: { state: admitted ? 'ADMITTED_GENERAL' : 'REFUSED', admitted, bureau: general.bureau, reason: general.reason, refusal_reason: refusalReason },
      refusal: admitted ? null : { reason: refusalReason, fact_status: FACT_STATUS.UNSUPPORTED_PRESENTATION },
      support: SUPPORT.ACTUAL_REPORT_EVIDENCE,
      admission_path: generalIntake.GENERAL_ADMISSION_PATH
    }, general);
  }

  if (supported.family_id) {
    const reader = FAMILY_READERS[supported.family_id];
    if (!reader) throw new Error(`FAMILY_EXTRACTOR_NOT_REGISTERED: ${supported.family_id}`);
    const raw = reader.extract(model, supported.admission);
    return {
      presentation_id: supported.presentation_id,
      family_id: supported.family_id,
      demonstration: false,
      extraction_ran: true,
      presentation_evidence: supported.admission.presentation_evidence === true,
      container,
      admission: supported.admission,
      refusal: null,
      support: SUPPORT.ACTUAL_REPORT_EVIDENCE,
      reference_date: raw.reference_date,
      records: raw.records,
      summary: raw.summary,
      evidence_readings: raw.evidence_readings
    };
  }

  const raw = extractFacts(model);
  const factualView = caFacts.read(model);
  return Object.assign({
    presentation_id: DEMONSTRATION_SHAPE,
    family_id: null,
    demonstration: false,
    extraction_ran: true,
    presentation_evidence: raw.admission.presentation_evidence === true,
    container,
    admission: raw.admission,
    refusal: null,
    support: SUPPORT.ACTUAL_REPORT_EVIDENCE
  }, normalizeExtraction(raw, factualView), {
    /* B3 continuation: the Canadian presentation's own FACTUAL VIEW, read from the same page model, in
       memory. It carries no legal rule and no legal conclusion; it exists so the Canadian factual checks in
       `factual-checks.cjs` have printed facts to compare, without any statutory relation being named. */
    evidence_readings: {
      sections_printed: [],
      records_found: raw.last_payment_facts.length,
      factual_view: factualView
    }
  });
}

/** True only when the extraction record may be presented as evidence about an actual report. */
function carriesReportEvidence(record) {
  return Boolean(record)
    && record.support === SUPPORT.ACTUAL_REPORT_EVIDENCE
    && record.extraction_ran === true
    && record.admission
    && record.admission.admitted === true;
}

/** The per-record fact object a rule adapter reads. It contains ONLY this record's own values. */
function factsForRecord(record) {
  /* PR-01's new shared checklist fields do not enlarge the historical statutory
     anchor surface. That adapter continues to receive only its own resolved
     last-payment fact, even when the independent delinquency check can run. */
  if (record && record.kind === 'COLLECTION_ACCOUNT' && record.shared_facts_status === FACT_STATUS.RESOLVED) {
    if (record.fact_sources && Object.hasOwn(record.fact_sources, 'tradeline.lastPaymentDate')
      && !sourceForField(record, 'tradeline.lastPaymentDate')) return {};
    return record.status === FACT_STATUS.RESOLVED && record.normalized_value
      ? { 'tradeline.lastPaymentDate': record.normalized_value } : {};
  }
  if (record && record.facts && typeof record.facts === 'object') {
    const facts = Object.assign({}, record.facts);
    // Keep legacy readings, but an explicit rejected field source cannot supply a rule anchor.
    for (const field of Object.keys(record.fact_sources || {})) {
      if (Object.hasOwn(facts, field) && !sourceForField(record, field)) delete facts[field];
    }
    return facts;
  }
  const facts = {};
  if (record && record.status === 'RESOLVED' && record.normalized_value) {
    facts['tradeline.lastPaymentDate'] = record.normalized_value;
  }
  return facts;
}

/**
 * GAP-FINDING-004: the source-linked provenance for every fact a record carries, so an evaluation can trace the
 * exact raw printed value, its source document/page location, its normalization and its uncertainty back to the
 * report that printed it. Nothing here is invented: a value is taken only from the record's own `printed` or
 * record-level provenance, and a location only from the record's own `location`.
 */
function factSourcesForRecord(record) {
  const sources = {};
  if (!record || typeof record.facts !== 'object') return sources;
  const printedEntries = (record.printed && typeof record.printed === 'object') ? record.printed : null;
  for (const field of Object.keys(record.facts)) {
    const value = record.facts[field];
    const direct = record.fact_sources && record.fact_sources[field];
    if (record.fact_sources && Object.hasOwn(record.fact_sources, field)) {
      sources[field] = direct ? { ...direct, record_index: record.record_index,
        normalization: { from: direct.raw_value, to: direct.normalized_value } } : {
        raw_value: null, normalized_value: null, location: null, record_index: record.record_index,
        uncertainty: { status: 'EXTRACTION_UNRESOLVED', reason: 'FIELD_SOURCE_UNAVAILABLE' } };
      continue;
    }
    let printed = null;
    if (printedEntries) {
      printed = Object.values(printedEntries).find((p) => p && (
        (p.normalized != null && p.normalized === value)
        || (p.comparison_anchor != null && p.comparison_anchor === value)
      )) || null;
    }
    const rawValue = (printed && printed.raw != null) ? printed.raw
      : (record.raw_value != null ? record.raw_value : null);
    const location = (printed && printed.location) ? printed.location : (record.location || null);
    sources[field] = {
      raw_value: rawValue,
      normalized_value: value,
      /* A boolean fact's source carries the boolean itself under `value`, so a classified finding can require a
         concrete resolved source for a presence predicate (`entryComplete`, `recordIdentified`) as well as for a
         string or numeric one. */
      value: typeof value === 'boolean' ? value : undefined,
      location,
      normalization: { from: rawValue, to: value },
      uncertainty: {
        status: (printed && printed.status) ? printed.status : (record.status || null),
        reason: (printed && printed.reason) ? printed.reason : (record.reason || null),
        precision: (printed && printed.precision) ? printed.precision : (record.precision || null)
      },
      source_field: (printed && printed.label) ? printed.label : (record.source_field || null),
      section_path: record.section_path || null,
      record_index: record.record_index != null ? record.record_index : null
    };
  }
  return sources;
}

/**
 * Container detection, reported separately from admission so a refusal can say what the file actually is.
 *
 * B4 continuation: a PDF encrypted with an owner password whose own flags permit copying, AND whose text layer
 * was actually read, is reported as the PDF it is rather than as an opaque container. A PDF whose flags
 * withhold copying is still reported as `ENCRYPTED_PDF`, because nothing about it could be read. The measured
 * encryption facts travel alongside, in `detectEncryption` below, so the distinction is never lost.
 */
function detectContainer(model) {
  if (model && model.synthetic === true) return 'IN_MEMORY_MODEL_NOT_A_FILE';
  if (model && model.is_image === true) return 'IMAGE';
  if (!model || model.not_a_pdf === true) return 'NOT_A_PDF';
  if (model.encrypted === true && model.text_extraction_permitted !== true) return 'ENCRYPTED_PDF';
  return 'PDF';
}

/** The measured container facts, reported beside the container so an admitted encrypted file says so. */
function detectEncryption(model) {
  const encryption = (model && model.encryption) || null;
  return {
    encrypted: Boolean(model && model.encrypted === true),
    text_layer_read: Boolean(model && model.pages && model.pages.length > 0),
    text_extraction_permitted_by_the_document: model ? model.text_extraction_permitted : null,
    permission_flags: encryption ? {
      raw: encryption.raw,
      print_allowed: encryption.print_allowed,
      copy_allowed: encryption.copy_allowed,
      change_allowed: encryption.change_allowed,
      add_notes_allowed: encryption.add_notes_allowed,
      algorithm: encryption.algorithm
    } : null
  };
}

/**
 * The refusals recorded by the admission paths measured BEFORE the one that admitted the document. Reported on
 * an admitted document too, so the fact that another gate refused the same file is never dropped.
 */
function refusalsSoFar(exact, familyReadings, admittedPresentationId) {
  const out = [];
  if (exact && exact.admitted !== true) {
    out.push({
      admission_path: 'EXACT_SPECIMEN_DIGEST',
      presentation_id: 'PR-01',
      refusal_reason: exact.refusal_reason,
      fact_status: exact.fact_status,
      predicates_failed: exact.predicates.filter((p) => !p.passed).map((p) => p.id)
    });
  }
  for (const reading of familyReadings) {
    if (reading.presentation_id === admittedPresentationId) break;
    out.push({
      admission_path: reading.admission_path,
      presentation_id: reading.presentation_id,
      refusal_reason: reading.refusal_reason,
      fact_status: reading.fact_status,
      predicates_failed: reading.predicates.filter((p) => !p.passed).map((p) => p.id)
    });
  }
  return out;
}

/**
 * Supported-format detection: the container, then the admission gates. Runs NO extraction decision and
 * returns the whole measured predicate set so a refusal states the document's full shape.
 *
 * `options.country` scopes the gates to the presentations registered for that market. The exact-specimen
 * gate is a Canadian presentation, so it is offered to a Canadian selection and to an unscoped call only;
 * a selection in another market is measured against that market's own families and against nothing else.
 */
function detectSupportedFormat(model, options) {
  const opts = options || {};
  const container = detectContainer(model);
  const country = typeof opts.country === 'string' && opts.country ? opts.country : null;
  const exactApplies = country === null || country === PR_01_CONTRACT.market;
  const familyReadings = [];

  let exact = null;
  if (exactApplies) {
    const raw = admitDocument(model, opts.evidence || readPinnedPresentationPointer());
    exact = Object.assign({ presentation_evidence: container === 'PDF' }, raw);
    if (raw.admitted === true) {
      return {
        container,
        supported: true,
        admission_path: 'EXACT_SPECIMEN_DIGEST',
        presentation_id: 'PR-01',
        family_id: null,
        refusal_reason: null,
        fact_status: null,
        admission: exact,
        predicates: exact.predicates,
        evidenced_specimen: exact.evidenced_specimen,
        family_predicates: [],
        refusals: [],
        refusal_selection_rule: 'ADMITTED_BY_THIS_PATH: EXACT_SPECIMEN_DIGEST, so no refusal is reported for it'
      };
    }
  }

  for (const family of familiesForCountry(country)) {
    const reading = Object.assign({ presentation_evidence: container === 'PDF' }, family.reader.admit(model));
    familyReadings.push({
      presentation_id: family.presentation_id,
      admission_path: family.admission_path,
      admitted: reading.admitted === true,
      refusal_reason: reading.refusal_reason,
      fact_status: reading.fact_status,
      predicates: reading.predicates
    });
    if (reading.admitted === true) {
      return {
        container,
        supported: true,
        admission_path: family.admission_path,
        presentation_id: family.presentation_id,
        family_id: family.family_id,
        refusal_reason: null,
        fact_status: null,
        admission: reading,
        predicates: reading.predicates,
        evidenced_specimen: exact ? exact.evidenced_specimen : null,
        family_predicates: familyReadings,
        /* The paths measured BEFORE this one refused, and they are reported even though the document was
           admitted. A receipt that says "admitted by structure" while silently dropping the fact that the
           pinned-specimen gate refused the same file would be telling half the story. */
        refusals: refusalsSoFar(exact, familyReadings, family.presentation_id),
        refusal_selection_rule: `ADMITTED_BY_THIS_PATH: ${family.admission_path}, so no refusal is reported for it`
      };
    }
  }

  /* B6-INGEST-002 — the GENERAL intake path. When no registered presentation admits the document, ordinary
     ingestion still accepts a plausible bureau report: a bureau identity together with report-like content.
     A bureau name alone, or a document with no bureau, is UNRELATED; a document this build cannot read is
     UNREADABLE. Both are refused with a named reason so the receipt can give the plain consumer message. */
  const general = generalIntake.detect(model);
  if (general.outcome === 'GENERAL') {
    return {
      container,
      supported: true,
      admission_path: generalIntake.GENERAL_ADMISSION_PATH,
      presentation_id: generalIntake.GENERAL_PRESENTATION_ID,
      family_id: null,
      refusal_reason: null,
      fact_status: null,
      admission: { state: 'ADMITTED_GENERAL', admitted: true, bureau: general.bureau, reason: general.reason, needs_ocr: general.needs_ocr },
      predicates: [
        { id: 'BUREAU_IDENTITY_PRESENT', passed: true, detail: general.bureau || 'not yet read (image-only)' },
        { id: 'CREDIT_REPORT_CONTENT_PRESENT', passed: true, detail: `${general.markers.length} report-content marker(s) read` }
      ],
      evidenced_specimen: null,
      family_predicates: familyReadings,
      refusals: refusalsSoFar(exact, familyReadings, null),
      refusal_selection_rule: 'ADMITTED_BY_GENERAL_BUREAU_AND_REPORT_CONTENT_PLAUSIBILITY',
      general_detection: general
    };
  }
  if (general.outcome === 'UNRELATED' || general.outcome === 'UNREADABLE') {
    const reason = general.outcome === 'UNRELATED' ? 'UNRELATED_DOCUMENT' : 'UNREADABLE_DOCUMENT';
    return {
      container,
      supported: false,
      admission_path: 'REFUSED',
      presentation_id: null,
      family_id: null,
      refusal_reason: reason,
      fact_status: FACT_STATUS.UNSUPPORTED_PRESENTATION,
      admission: { state: 'REFUSED', admitted: false, refusal_reason: reason, fact_status: FACT_STATUS.UNSUPPORTED_PRESENTATION, presentation_evidence: false, predicates: [] },
      predicates: [],
      evidenced_specimen: null,
      family_predicates: familyReadings,
      refusals: refusalsSoFar(exact, familyReadings, null),
      refusal_selection_rule: 'GENERAL_INTAKE_CLASSIFICATION',
      general_detection: general
    };
  }

  /* Nothing admitted. WHICH refusal is reported is the CLOSEST admission path: the gate whose measured shape
     came nearest to admitting the document, that is the gate with the FEWEST failed predicates. A tie goes to
     the earlier path in registry order, which is the exact-specimen gate.

     This is why a Canadian selection still reports a Canadian gate's own reason for a file that resembles the
     admitted specimen, and why a file that resembles the SECOND Canadian layout reports that layout's own
     reason instead of a digest it was never going to match. Every path's refusal is reported in `refusals`
     either way, so no admission path can be hidden by the choice. */
  const withScores = [];
  if (exact) {
    withScores.push({
      path: 'EXACT_SPECIMEN_DIGEST', order: 0, reading: exact,
      failed: exact.predicates.filter((p) => !p.passed).length
    });
  }
  familyReadings.forEach((reading, index) => {
    withScores.push({
      path: reading.admission_path, order: index + 1, reading,
      failed: reading.predicates.filter((p) => !p.passed).length
    });
  });
  const closest = withScores.slice().sort((a, b) => (a.failed - b.failed) || (a.order - b.order))[0] || null;
  const reported = closest ? closest.reading : null;
  const selectionRule = closest
    ? `CLOSEST_ADMISSION_PATH: ${closest.path} failed ${closest.failed} predicate(s), the fewest of ${withScores.length} path(s) measured`
    : 'NO_ADMISSION_PATH_APPLIED_TO_THIS_MARKET';

  /* EVERY gate's refusal is reported, not just the one chosen above, so a refusal never hides a second
     admissions path the document was also measured against. */
  const refusals = [];
  if (exact) {
    refusals.push({
      admission_path: 'EXACT_SPECIMEN_DIGEST',
      presentation_id: 'PR-01',
      refusal_reason: exact.refusal_reason,
      fact_status: exact.fact_status,
      predicates_failed: exact.predicates.filter((p) => !p.passed).map((p) => p.id)
    });
  }
  for (const reading of familyReadings) {
    refusals.push({
      admission_path: reading.admission_path,
      presentation_id: reading.presentation_id,
      refusal_reason: reading.refusal_reason,
      fact_status: reading.fact_status,
      predicates_failed: reading.predicates.filter((p) => !p.passed).map((p) => p.id)
    });
  }
  return {
    container,
    supported: false,
    admission_path: 'REFUSED',
    presentation_id: null,
    family_id: null,
    refusal_reason: reported ? reported.refusal_reason : 'NO_PRESENTATION_IS_REGISTERED_FOR_THIS_MARKET',
    fact_status: reported ? reported.fact_status : FACT_STATUS.UNSUPPORTED_PRESENTATION,
    admission: {
      state: 'REFUSED',
      admitted: false,
      refusal_reason: reported ? reported.refusal_reason : 'NO_PRESENTATION_IS_REGISTERED_FOR_THIS_MARKET',
      fact_status: reported ? reported.fact_status : FACT_STATUS.UNSUPPORTED_PRESENTATION,
      presentation_evidence: false,
      predicates: reported ? reported.predicates : []
    },
    predicates: reported ? reported.predicates : [],
    evidenced_specimen: exact ? exact.evidenced_specimen : null,
    family_predicates: familyReadings,
    refusals,
    refusal_selection_rule: selectionRule
  };
}

/**
 * A refused document reports NO records at all and carries its refusal separately, so a refusal can never
 * be read as an empty report and an empty report can never be read as a refusal.
 */
function refusedExtraction(detection, container) {
  return {
    presentation_id: null,
    family_id: null,
    extraction_ran: false,
    presentation_evidence: false,
    container,
    admission: detection.admission,
    refusal: { reason: detection.refusal_reason, fact_status: detection.fact_status },
    reference_date: null,
    records: [],
    summary: {
      status: detection.fact_status,
      reason: `DOCUMENT_REFUSED:${detection.refusal_reason}`,
      records_read: 0,
      resolved_fact_count: 0,
      contract_debt_record_count: 0
    },
    support: SUPPORT.ACTUAL_REPORT_EVIDENCE
  };
}

/** The normalized extraction record a case stores. It carries labels, dates and locations — never text. */
function normalizeExtraction(raw, factualView) {
  const records = raw.last_payment_facts.map((fact) => ({
    record_index: fact.record_index,
    kind: 'COLLECTION_ACCOUNT',
    kind_label: 'collection account',
    status: fact.status,
    reason: fact.reason,
    normalized_value: fact.normalized_value,
    raw_value: fact.raw_value,
    location: fact.location || null,
    source_field: fact.source_field,
    section_path: fact.section_path
  }));
  /* PR-01 already reads these collection dates. Carry those readings into the
     shared checklist without changing its digest admission or the legacy
     last-payment value/status used by the statutory adapter. The factual and
     legacy readers use the same collection boundaries; verify that association
     before copying a second field onto a record. */
  if (factualView && factualView.presentation_id === 'PR-01') {
    const reference = raw.request_date;
    const referenceLocation = reference && reference.location && typeof reference.location === 'object'
      ? reference.location : reference && reference.occurrences && reference.occurrences[0];
    const sharedReference = reference && reference.status === FACT_STATUS.RESOLVED
      && reference.raw_value != null && reference.normalized_value && referenceLocation
      ? { ...reference, location: { ...referenceLocation } } : null;
    for (const record of records) {
      const fact = raw.last_payment_facts.find((entry) => entry.record_index === record.record_index);
      const boundary = (raw.debt_records || []).find((entry) => entry.record_index === record.record_index);
      const viewRecord = (factualView.records || []).find((entry) => entry.record_index === record.record_index
        && entry.kind === 'COLLECTION' && entry.debt_record === true && entry.page_read_failure !== true
        && boundary && entry.boundary && boundary.boundary
        && entry.boundary.page === boundary.boundary.page && entry.boundary.line === boundary.boundary.line);
      const facts = {}, printed = {}, sources = {};
      const retain = (field, reading) => {
        if (!reading || reading.raw == null || reading.normalized == null || !reading.location
          || reading.trusted === false || reading.location.trusted === false) return;
        facts[field] = reading.normalized;
        printed[reading.label] = { ...reading, status: FACT_STATUS.RESOLVED };
        sources[field] = { raw_value: reading.raw, normalized_value: reading.normalized,
          source_field: reading.label, location: reading.location, record_index: record.record_index };
      };
      if (fact && fact.status === FACT_STATUS.RESOLVED) retain('tradeline.lastPaymentDate', {
        label: fact.source_field, raw: fact.raw_value, normalized: fact.normalized_value,
        location: fact.location, state: 'VALUE', status: FACT_STATUS.RESOLVED
      });
      const delinquency = viewRecord && viewRecord.printed && viewRecord.printed['First Delinquency'];
      if (delinquency && delinquency.state === 'VALUE' && delinquency.printed_times_in_record === 1)
        retain('tradeline.firstDelinquencyDate', delinquency);
      for (const [label, field] of [['Status', 'account.status'], ['Balance', 'account.balance'],
        ['Amount', 'account.amount']]) {
        const reading = viewRecord && viewRecord.printed && viewRecord.printed[label];
        if (!reading || reading.state !== 'VALUE' || reading.printed_times_in_record !== 1
          || reading.raw == null || reading.reason) continue;
        const normalized = label === 'Status'
          ? String(reading.raw).trim().replace(/\s+/g, ' ').toUpperCase()
          : require('./report-amount.cjs').printedAmount(reading.raw);
        if (normalized != null && normalized !== '') retain(field, { ...reading, normalized });
      }
      if (Object.keys(facts).length) Object.assign(record, {
        facts, printed, fact_sources: sources, shared_facts_status: FACT_STATUS.RESOLVED
      });
      if (sharedReference) Object.assign(record, {
        report_reference_date: { ...sharedReference },
        source_report_reference_date: sharedReference.normalized_value
      });
    }
  }
  return { reference_date: raw.request_date, records, summary: raw.last_payment_fact_summary };
}

module.exports = {
  EXTRACTION_ADAPTERS,
  SUPPORT,
  DEMONSTRATION_SHAPE,
  listSupportedFormats,
  presentationScope,
  adapterFor,
  displayNameFor,
  formatsForCountry,
  familiesForCountry,
  FAMILY_READERS,
  detectContainer,
  detectEncryption,
  detectSupportedFormat,
  extractWithSharedAdapter,
  normalizeExtraction,
  carriesReportEvidence,
  factsForRecord,
  factSourcesForRecord,
  buildPdfDocumentModel,
  buildImageDocumentModel,
  makeSyntheticModel,
  readPinnedPresentationPointer,
  auFamily,
  usFamily,
  gbFamily,
  tuCaFamily,
  caFormatScope,
  caFacts
};
