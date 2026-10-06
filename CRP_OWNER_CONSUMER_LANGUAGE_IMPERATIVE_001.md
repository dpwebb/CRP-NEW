# OWNER-CONSUMER-LANGUAGE-001 — imperative

## Latest owner correction — main-page footer only

October 4, 2026: the owner explicitly permits one brief public legal-advice disclaimer only in a small footer section of the main page. Approved text: "Credit Regulator Pro provides credit-report information, not legal advice." Keep it readable and unobtrusive, not hidden. Do not include or repeat it in any other consumer area: results, findings, explanations, account/billing/privacy/support views, correction/dispute packets, downloaded reports, generated templates or consumer communications. The footer must not be injected into every wizard view or copied into export templates. This is the sole exception to the earlier absolute prohibition and supersedes conflicting instructions below. Internal finding classes and evidence standards remain unchanged.

October 4 update: CRP_OWNER_SUBSCRIBER_OFFERING_001.md supersedes older requirements to display categorical VIOLATION/PROBABLE_VIOLATION badges. Present Reporting issue / Probable reporting issue with accurate evidence and supported rule basis; retain the exact internal classes. No legal-advice disclaimer is permitted. Observation-only outputs remain distinct.

Date: October 3, 2026 (America/Halifax). Authority: explicit owner instruction in this conversation.

CRP's consumer purpose is to identify compliance violations and probable violations from the consumer's report under the applicable governed rules. The product is not being offered for the consumer to obtain formal legal advice. Do not introduce disclaimers about legal advice into consumer-facing copy.

**Imperative:** no "not legal advice", "not legal advise", or equivalent legal-advice disclaimers in UI, results, explanations, reports, downloads or consumer communications. Do not restore such wording through templates, tests or generated content. Explain what the application finds and the evidence supporting it directly.

Keep the distinctions that substantiate the findings: applicable rule, source facts, VIOLATION versus PROBABLE_VIOLATION, material unknowns, unresolved readings and actual assessment coverage. Observations must not be relabelled violations. A probable finding must explain its specific uncertainty. This language directive changes presentation, not legal rules, evidence standards or finding permissions.

The application may state its actual scope affirmatively: "This assessment covers the checks listed in this report." A report that contains findings must not carry a blanket header claiming it contains no legal finding.

Applies to current and future implementation and Cline prompts. Historical source captures and prior evidence remain intact. Existing schema names, including `disclaimer`, may remain for compatibility, but their consumer-visible values must follow this imperative.

## Additional owner imperative — incomplete findings

Do not surface factual qualifications, unresolved-value cards, not-run/not-applicable check lists or explanations of why a potential VIOLATION or PROBABLE_VIOLATION could not be completed in consumer results or downloaded reports. Consumers receive completed findings and their supporting evidence. Keep incomplete assessments and their reasons internally for audit, quality control and recovery; do not convert them into completed findings or an assertion that the report has no violations.

An empty result may say "No findings available." It must not claim "no violations" or "fully compliant" when evidence or checks were incomplete. Ordinary actionable upload/account errors remain available so the consumer can use the application.

This directive concerns findings that could not be completed. A completed PROBABLE_VIOLATION retains its correct classification and the evidence explaining that completed finding; it must not be relabelled an established VIOLATION.

Owner's instruction: "Stop implementing any disclaimers of 'not legal advise'." This imperative is additional to OWNER-CLOSURE-001 and leaves its separate implementation/staging/production statuses intact.

## Material questions only

Use the report first and proactively determine whether a question has a material effect on an eligible governed finding. Ask at most two such questions. Missing responsibility alone must not trigger an individual/joint/authorized-user question, and context enrichment is not a sufficient benefit. No active rule-material question definition is currently admitted, so no new clarification questions are generated. Historical answers remain separate consumer statements; retired stored prompts must not reappear.

When a governed reporting duty requires content that the report genuinely omits, assess that omission against the duty rather than asking the consumer to supply the missing content. Do not confuse a failed extraction with a verified printed omission or introduce an automatic finding for every absent field.
