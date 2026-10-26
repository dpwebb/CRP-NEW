# Operations and troubleshooting

[Knowledge base](../../KNOWLEDGE_BASE.md)

## Common problems

| Symptom | Next step |
|---|---|
| Sign-in fails | Confirm the environment, account, password, and current authenticator. Do not repeatedly guess or use another identity. |
| Sign-in code is refused at admin unlock | Use a new current code; sign-in codes are replay-protected. |
| Workspace locks while a draft is open | Complete fresh admin unlock. If prompted, first confirm the same person's underlying sign-in. Review the retained draft before submitting. |
| An application is not linked | Review that person's actual native membership and protected binding. Consumer ownership alone is insufficient. |
| An action is missing or returns 401/403 | Check current role, permissions, organization, assignment, fresh-factor age, and revocation. Preserve the refusal. |
| A write times out or says unknown | Inspect the native record and durable intent. Do not automatically retry or change the request key. |
| A record changed but its response was withheld | Access may have changed after dispatch. Reconcile the owning application's record under current authority before taking another action. |
| Packet or final printing copy changed | Recheck the exact current version and required approval. Never substitute an unapproved PDF. |
| Payment and order status disagree | Reconcile genuine provider references and the order's native state. Do not create a second charge as a diagnostic. |
| Service health is green but a workflow fails | Check readiness, provenance, permissions, and the workflow's acceptance evidence. Liveness alone is insufficient. |
| Audit integrity or writer lock fails | Preserve the store, key, lock, and failure. Verify custody and the actual writer. Do not delete a lock or reset the journal to force startup. |

## Release checklist

1. Confirm the repository, working tree, release owner, current predecessor, affected application, and authorized environment. Preserve unrelated work.
2. Freeze committed source and verify the exact package. Reuse only evidence whose source and relevant inputs still match.
3. Complete local and Linux checks appropriate to the change. Document any reused proof, skips, failed attempts, and limits.
4. Back up the whole stopped target component and authenticate its critical backup. Recover independently into a new private location before activation. Preserve signing and integrity keys together with the journal.
5. Use owned fictional staging records and Sandbox/Test payments where needed. Send no real mail during a no-mail QA campaign. Test normal MFA, native access, required roles, browser behavior, and cleanup.
6. Confirm data/configuration preservation and expected predecessor guards. Promote the identical accepted package under production authority, with scoped rollback.
7. Verify production provenance, served assets, anonymous protection, required native evidence, customer data, and configuration. Qualify normal heartbeat or lifecycle changes precisely.
8. Retire temporary privileges, close owned test sessions, and save a sanitized report. Commit/push and deployment are separate operations.

Use the [Family deployment procedure](../../family-admin/deploy/README.md) and [locking/recovery contract](../../family-admin/LOCK_RECOVERY.md). Consumer releases use their separate [change-aware workflow](../../accelerated-launch/service/deploy/CHANGE_AWARE_RELEASE.md). A documentation update does not require a new runtime package or a repeat product regression.

## Evidence handling

Keep source-backed, local-tested, staging-verified, and production-verified claims distinct. A fictional adapter response is not a genuine provider receipt. Preserve unknown outcomes and failed/refused attempts rather than relabelling them as successful.

Git may contain reviewed documentation, exact source identities, sanitized results, and evidence hashes. Keep customer reports, identification, raw screenshots/logs, credentials, session tokens, MFA seeds, recovery keys, protected configuration, and QA payloads in approved private storage.

## Updating this guide

When a behavior changes, update the user explanation and the source reference. When a release is verified, update the [release register](releases.md) and link its final report. Preserve historical reports. Do not copy an older README's local-only status over a newer verified release, or promote newer local help content to a live claim without its own evidence.
