# Country rights guide indexing correction — October 20, 2026

Owner's new “deploy” instruction authorizes correcting the remaining documented guide indexing limitation and deploying a new candidate to staging and production. Root alone operates. Preserve completed 7c6a54cc/8c2d/188 release, every previous full/package/attempt/worktree/backup and all current operational data, security, signed authority and configuration. No source push, live charge, real-consumer sign-in/MFA/recovery, provider/grant/configuration change, mailing, shared reboot or old-operation replay.

Current checkpoint: LOCAL_CORRECTION_IN_PROGRESS; NOT_DEPLOYED.

The real HTTP server previously sent public guides through its generic static HTML branch, adding `X-Robots-Tag: noindex` and omitting public compression. `app.cjs` handled the same guide correctly, which concealed the transport difference in direct-handler tests. The correction forwards `public_guide` through the existing worker alongside `public_homepage`. Guide text, links, analytics, private routes, account/report jurisdictions, assessment and packet logic are unchanged.

New `gp-public-seo.cjs` realServer tests cover all four guide GET/HEAD responses, exact content, indexability, session-free behavior, Google-free CSP, gzip bytes/headers and explicit gzip refusal. Before the correction they reproduced 16 failures (467 passed, zero skipped). That failed receipt is retained under `accelerated-launch/service/out/country-rights-indexing-release-20261020/red-real-server.json`.

Freeze new committed source and manifest, use an isolated managed verification checkout and existing reviewed prerequisites, then execute the governed verification/package and required current staged acceptance. Each deployment requires fresh custody, expected-current guard, verified whole stopped snapshot and data-preserving rollback. Production additionally requires strict current acceptance, unchanged verifier/Linux proof, current provider/configuration preservation and authenticated installed pre/post encrypted backups. No completed operation is replayed.
