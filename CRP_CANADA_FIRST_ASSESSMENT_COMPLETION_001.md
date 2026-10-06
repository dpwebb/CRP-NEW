# Canada-first assessment correction — October 6, 2026

Owner request: make the Canadian upload -> actual/probable/potential reporting issue -> consumer-selected packet service functional, rather than describing an obsolete observations-only build.

## Fixed

The selection surface read old launch-matrix counts and made incorrect statements that Alberta had no statutory evaluation and TransUnion had no statutory rule. Availability now derives applicable rule counts and presentation requirements from the active rule registry. These are available rules, not a claim that every rule ran on an uploaded report.

Seven already-admitted Canadian accuracy rules (Ontario, BC, Quebec, Saskatchewan, NT, NU, YT) now accept source-linked opened/closed dates supplied by the admitted TransUnion reader, using that reader's actual TU_CA_TRADELINE record kind. Jurisdiction, evidence requirements, probable ceiling and verification request remain unchanged. Alberta's existing qualified last-payment rule and adverse-information gate remain intact.

The Wizzard now states the service directly: upload -> review reporting issues, probable violations and potential errors -> select disputes -> create the consumer's packet. Obsolete 'each capped at an observation', 'No check would run' and 'no rule on TransUnion' statements were removed from the selection surface. The existing main-page-only legal-advice footer was preserved under the standing owner instruction.

## Behavioral evidence

co-canada-upload-delivery: 107 passing assertions. The authorized real TransUnion PDF was uploaded through the actual local HTTP service, persisted as four accounts, and reached Ontario's statutory accuracy comparison. Six further applicable accuracy rules evaluated the same real reader's date facts. No real/private file was sent to a remote host or added to Git.

For all 13 Canadian selections, fictional PDFs travelled through actual HTTP upload, extraction, supported selectable issues, correspondence, approval and entitled download. This is actual PDF-upload delivery of factual issues; it does not claim every provincial statute applies to that fictional account. Existing province-specific statutory controls, legal classifications and packet tests remain separately covered.

## Release packaging

The required consumer-wizard/dist/jurisdiction-data.js dependency is now included in the maintained manifest and explicitly tracked as an individual file in the parent Git baseline. The remaining consumer-wizard subtree retains its independent repository/history and local changes. This removes the previous deployment supplement requirement. Total shipped files: 81.

## Scope

Supported Canadian readers and general intake remain in use. This correction does not claim all credit-bureau layout variations or every statutory paragraph is implemented. A benign report need not produce an issue. Unknown evidence alone never produces an issue, and missing field capability is not represented as a passed check.

## October 6 Canada-first served correction — current status

Current build: crp-v1-75755118a71c9399. Manifest SHA-256: 75755118A71C93994F85EB3E9185DAD80220BD8E17FCA19E1007BD165502166A (81 files, including the required jurisdiction-data runtime dependency). Full local regression: 5397 passed, zero failed or skipped.

Deployed to the authorized Hostinger VPS at https://staging.creditregulatorpro.com. Public health confirmed this build, staging environment and test billing mode. A real-browser fictional account selected Alberta and confirmed the active requirements/upload-to-issue-to-selected-packet wording; the obsolete no-statutory/no-check/no-TransUnion-rule statements are absent. No private report or payment was sent to staging. Complete hosted upload/checkout/packet acceptance and production readiness remain separate and pending.

The prior build and private environment/data were backed up before the service switch; activation provenance and rollback location are recorded on the host in /opt/crp-wizard-staging/candidate-activation.json. Only the staging wizard service was changed. No live charge, Git push or production deployment occurred. This current entry supersedes earlier destination-pending and candidate-identity statements.