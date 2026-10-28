# Measured local capacity envelope — October28,2026

Receipt: output/implementation/continuation/soak-1793189081391-535a44/result.json. Passed the proposed **local** envelope and every integrity check. Main loop1802494ms (30minutes2.5seconds). The receipt contains19843 measured requests:19836 in the timed loop plus7 measured setup/isolation requests. Additional setup, case-creation, backup, replay and restart controls are not represented as ordinary request throughput.

## Declared fixture mix

- Four fictional Consumer identities with local signed test-adapter subscriptions; no genuine provider payment or commercial acceptance.
- Six native, six image-only and six40-page/40-account-line workflows across setup and repeated load. Bytes per fixture: native900, image-only57921, large17943. Complete workflow measurement includes case creation, upload/physical reading and evaluation. This is a40-page text-heavy report, not a10MiB scan or every admissible layout.
- Two native Mail administrator sessions;1782order-list reads. One local simulated paid/queued order, no worker/provider dispatch. Existing writer-lock/refund/assignment invariants retain separate unchanged native tests; this run does not claim all staff mutations were load-tested.
- Affiliate native reporting594times against5000 mature synthetic journal entries. The dataset has one synthetic payment and the three seed partner organizations, not5000real customers. No external money action or independent settlement occurred.
- Family process-health requests; native four-app authenticated SSO/roles/revocation are verified by separate joined acceptance, not inferred from these health probes.
- Thirty authenticated encrypted Mail backup/isolated-restore checks under a generated fixture key. These are same-machine isolated restores, not independently held production keys or recurring four-app offsite acceptance.

## Measured timings

| Request class | Count | p95 | Maximum |
|---|---:|---:|---:|
| Ordinary Consumer/staff/Affiliate reads |16266|9.81ms|2660.21ms|
| Consumer/Family health |3540|2.84ms|245.84ms|
| Upload/physical reading |18|2419.92ms|2419.92ms|
| Evaluation |18|248.70ms|248.70ms|

Maximum complete report workflow:2782.93ms. Unexpected failures:0. No intentional503 occurred in this mix; it does not establish an overload boundary. A single ordinary read took2.66seconds; passing a p95 target is not a promise that every read finishes within2seconds. Proposed thresholds remain reads p95<=2seconds, health p95<=1second and accepted complete report workflows<=150seconds. None was loosened.

## Integrity and failure evidence

Original fixture rows, source blobs, approved packet bytes and journal/order values stayed exact under their recorded controls. Same-key replay created once. Restart retained the approved packet. All isolated restore comparisons and cleanup/source checks passed. Before/after runtime-source fingerprints cover Consumer452, Family14, Mail45 and Affiliate41text source files; binary assets and independent hosted releases are outside this measurement. The runner's hash/mtime witness is separately retained in harness-identity.json. Its source predates the run and was not edited during execution.

Earlier failures remain failed. A runner path error stopped the first smoke before load. The dense40-page/1200-line fixture then exposed a real V8 serialization failure. It is now a separate native negative-control tier: the16MiB per-result gate returns422 before persistence and retains source/previous results/packet state. The accepted40-account workload must not be relabelled as support for1200accounts. The smoke's original expected-case counter was corrected to count created cases rather than falsely interpret an unassessed case as row loss.

## Limits and next decisions

All native applications share one QA coordinator Node process on a Windows machine reporting16logical CPUs and68628615168bytes RAM. The PostgreSQL child is real; this is not the deployed process/resource model. Source-hash/protected-data checks and backup activity add local I/O. This is a measured proposed workload, not maximum throughput, a separate-process staging equivalent, an SLA, ad spend authority or a claim about production capacity.

Approve actual demand, data maturity/diversity, file-size distribution and thresholds before a separate hosted capacity test. Keep store growth, support backlog, missing operational coverage, unresolved bank evidence and unknown provider actions as expansion stop conditions. No infrastructure purchase, production load, route/staff activation was performed.
