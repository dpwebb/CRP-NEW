# Accelerated all-82 implementation program

Owner authorization: 2026-10-01, in this conversation. All 82 jurisdictions must function at launch. Accepted legacy statutory authority remains accepted. This program does not claim legal admission, change finding classifications, or override higher-ranking contracts by recency.

## Launch acceptance

Every canonical jurisdiction must have explicit country/region routing, a validated consumer-report format, applicable executable checks, qualified explanations, account isolation, private upload handling and the paid-consumer journey. Selection-only coverage and refusal-only behavior do not satisfy launch. Unsupported inputs must still receive truthful explanations. One rule/specimen cannot establish general bureau support.

## Implemented initial batch

`accelerated-launch/build_launch_matrix.py` derives the 82-row launch matrix from the existing generated enumeration and 437-row owner-accepted ledger. It hashes 40 candidate legacy components without executing them or opening reports. The shared `jurisdiction-router.cjs` routes all canonical country/region pairs and refuses mismatches, aliases and incomplete selections. No evaluation activation is inferred from mapped records.

Country batches: CA 13, US 57, GB 4, AU 8. Ninety-six accepted records lack a canonical region in the ledger; these remain separate. Previously approved UK/GB relationships must be represented explicitly in a subsequent adapter, rather than silently included in exact-region counts. US-UM has no exact accepted entry. No jurisdiction is presently launch ready.

The matrix is a reproducible engineering baseline, not a completed audit of each legacy module's behavior. The legacy inventory marks every component CANDIDATE_NOT_EXECUTION_VALIDATED. Source hashes establish identity, not runtime correctness.

## Consolidated authorized development sequence

1. Reuse audit and rule adapter: inspect the inventoried legacy rule definitions and evaluator interfaces; produce immutable, jurisdiction-indexed executable adapters. Distinguish authority/citation/limitation records from executable rules. Exercise existing tests only in an isolated working copy, after checking script writes and external calls. Never run the legacy production service or read credentials. Legacy checkout remains read-only.
2. Presentation batches: inventory existing mapping contracts and format families by country/bureau. Build local deterministic extraction adapters and fixtures. Keep private report content local; no external model/provider transmission is authorized. Synthetic tests verify behavior but do not establish actual report-family support.
3. Shared evaluation: parameterize repeated algorithms; preserve source-owned date meanings, record isolation, applicability and output permissions. Batch validate each jurisdiction's actual rule configuration, rather than merely testing the shared algorithm once.
4. Local service and wizard integration: create a local multi-user case service with access isolation, private upload lifecycle and result explanations. Integration must advertise only supported checks. Before external infrastructure or payment integration, establish the service choice, credentials and necessary authorization; never fabricate those integrations.
5. Paid journey and release: implement authorized payment integration in test mode, then verify private storage, account isolation, deletion, upload refusals, all-82 coverage and consumer-controlled packets. Deployment requires an explicit release action and validated host provenance.

One consolidated implementation program replaces repetitive small documentation orders. At batch boundaries, record changed files, meaningful tests, rule/presentation coverage and unresolved dependencies. If a governing clause conflicts, use a minimum owner-authorized quoted-replacement amendment; preserve historical records. Do not invent statutory meanings, unsupported jurisdiction associations or legal findings.

## Next executable batch

Build a legacy rule-adapter catalog from the 40 inventoried modules, then identify repeated evaluators and existing tests. Work in a new `accelerated-launch` implementation subtree and keep legacy files read-only. Produce an executable adapter only for defined legacy behavior whose inputs, applicability and output permissions are understood. Use synthetic tests without copying private report identifiers. Record unsupported modules as concrete engineering dependencies; do not count them as working coverage.

## Verification and limits

Run `python accelerated-launch/build_launch_matrix.py` followed by `node accelerated-launch/test-router.cjs`. The initial test passes all 82 routes and exercises wrong-country, incomplete and alias refusal cases. Input ledger and jurisdiction data hashes are recorded in the matrix. Existing application, contracts, legal corpus and historical evidence are unchanged by this initial batch.

This batch does not complete the all-82 application. The next work is adapter and report-family implementation, not another legal-provenance investigation.
