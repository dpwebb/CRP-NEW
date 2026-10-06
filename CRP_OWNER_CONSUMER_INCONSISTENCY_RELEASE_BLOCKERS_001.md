# Owner consumer inconsistencies — release blockers

Authority: explicit owner instruction, October 3, 2026. These requirements supersede historical acceptance language that required the conflicting consumer behavior.

Current status: all three are IMPLEMENTED_AND_TESTED under OWNER-CLOSURE-001 after the final 5,524-assertion regression. Staging verification remains PENDING and each is still a registered production release blocker. See CRP_CONSUMER_IMPERATIVES_AND_PRIVACY_COMPLETION.md. Implementation closure, staging verification and production readiness remain separate.

| Blocker | Inconsistency | Required correction and behavioral proof |
| --- | --- | --- |
| BLOCKER-CONSUMER-LANGUAGE-001 | Legal-advice disclaimers and blanket non-finding labels undermine the promised findings. | Remove those disclaimers from consumer surfaces and downloads; correctly label completed VIOLATION and PROBABLE_VIOLATION outputs. Test both classifications and affirmative scope. |
| BLOCKER-CONSUMER-INCOMPLETE-001 | Consumer results expose qualifications explaining why checks or findings could not be completed. | Keep diagnostics internally; hide incomplete-check explanations and unresolved cards in results and downloads. Test internal retention, presentation suppression and absence of false compliance claims. |
| BLOCKER-CLARIFY-MATERIALITY-002 | Missing responsibility automatically triggers individual/joint/authorized-user questions that do not affect findings. | Remove context-only prompts. Ask at most two proactively selected questions only where a governed rule establishes a material effect on a violation/probable assessment. Test that missing responsibility alone does not trigger a question and that answers cannot cure a mandatory report-content omission. |

Where an applicable admitted rule requires the report to contain a fact, evaluate the report's omission against that rule; do not ask the consumer to repair it. A missing extracted value is not automatically proof of a printed omission. No universal omission-to-violation rule is introduced: the applicable reporting duty, addressee and evidence must support the classification.

Defect demonstrated before correction: `clarification.cjs::eligibleQuestions` requests responsibility solely because an account identity exists and responsibility is missing. Its declared outcome is context-only and does not change report findings. The context-only trigger and saved prompts are now suppressed; historical answers remain separate from report facts.

Presentation corrections are implemented locally. The two earlier audit-payload failures were fixed by a safe assessment_completed presentation field; the UI still never reads the audit payload. No staging deployment or production readiness is asserted.

The release checker registers all three IDs as launch-blocking and uses the existing shared closure-policy validator. Their evidence files and exact criterion keys are declared in `release-check.cjs`; missing evidence leaves them open. Historical blocker counts are snapshots, not current totals.
