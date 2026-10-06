# B5-PREFLIGHT — Release preparation and proposed work order

Order: B5-PREFLIGHT. Date: 2026-10-01. This is a read-only preparation record. Nothing has been deployed, no
server was changed, no DNS was altered, no live Stripe resource was created, and no SSH session was opened.

## 1. Intended target (from existing non-secret configuration)

| Item | Value | Source |
| --- | --- | --- |
| Host | Hostinger VPS `srv1616603`, IP `187.127.252.51` | legacy `deploy/runbook.md` (read-only) |
| SSH alias | `hostinger-vps` | legacy `deploy/runbook.md` |
| Domain | `creditregulatorpro.com` | legacy `deploy/env/.env.staging.example` (`FRONTEND_URL`) |
| Staging hostname | `staging.creditregulatorpro.com` | legacy `deploy/env/.env.staging.example` |
| New app directory | `/opt/crp-node-staging` | legacy `deploy/runbook.md` |
| Existing (dead) staging stack | `/opt/creditregulatorpro-staging/app/docker-compose.yml` | legacy `deploy/runbook.md` |
| Root app to protect | `creditregulatorpro-app` (Traefik root container/cert/route) | legacy `deploy/runbook.md` |

The owner has confirmed the credentials belong to the intended Stripe account and this Hostinger VPS
(`CRP_OWNER_CAD_PRICING_AND_UPGRADE_CREDIT.md`). No VPS password, key or `.env` value is in this repository.

## 2. Build manifest (reproducible, no build step)

The service is plain CommonJS started with `node server.cjs`. There is **no bundler, no `npm install`, no
build step and no dependency tree** — Node built-ins only. A require-trace from `server.cjs` resolves exactly
**44 runtime files** across three subtrees, plus the served UI tree:

- `accelerated-launch/service/*.cjs` (server, app, entitlement, stripe, billing-credits, upgrade-credit,
  payment-provider, plan-catalog, private-store, formats, journey, results, evaluation, factual-checks,
  ca-consumer-file-facts, applicability, accounts, cases, uploads, drafts, demo, errors, logger, retention,
  case-status) and `format-families/*.cjs` (5), `ocr/local-ocr.cjs`.
- `accelerated-launch/adapters/{rule-adapters,evaluation-primitives}.cjs` + `adapter-configs.json` +
  `applicability-records.json`.
- `accelerated-launch/jurisdiction-router.cjs` + `accelerated-launch/launch-matrix.json`.
- `internal-validation/ca-ns-last-payment-six-year/{constants,document-model,extraction,locators,presentation-contract,six-year-evaluator}.cjs`.
- `consumer-wizard/dist/jurisdiction-data.js`.
- Served UI: `accelerated-launch/service/ui/{index.html,app.js,style.css,favicon.svg}`.
- Configuration template: `accelerated-launch/service/deploy/production.env.example`.

**Reproducibility:** the release transfers these paths and records a SHA-256 content digest of the transferred
tree in the deployment provenance record (`deployment-provenance.json`), which the release check already
requires before a launch.

## 3. Runtime prerequisites

- Node 22.13 or newer (the legacy box uses an isolated `/opt/crp-node/bin/node`; any supported Node ≥ 22 works).
- Bind **loopback only** (`CRP_LOCAL_SERVICE_HOST=127.0.0.1`, default). The box has no host firewall, so a
  public bind would expose report data.
- A TLS terminator in front (the existing Traefik) forwarding the public hostname to `127.0.0.1:8787`.
- `CRP_LOCAL_SERVICE_DATA` set to a durable path **outside the repository** (e.g. `/opt/crp-node-staging/data`);
  the service refuses to start if it resolves inside the checkout.

## 4. Private storage, backup and restore

The service writes only inside `CRP_LOCAL_SERVICE_DATA`: `state.json`, `state.json.bak`, `store.lock` and
`blobs/` (opaque files keyed by internal id, never a consumer filename). Writes are atomic (temp + rename);
passwords are scrypt-hashed; session tokens are stored only as SHA-256.

- **Backup:** copy the data directory (`cp -a /opt/crp-node-staging/data /opt/crp-node-staging/data.bak.<ts>`).
- **Restore:** stop the service, move the backup into place, start the service. `state.json.bak` is an in-place
  same-version rollback of the state index only; a full restore uses the directory copy.
- **Rollback:** stop the process and point `CRP_LOCAL_SERVICE_DATA` at the previous directory — nothing outside
  the data directory is ever written.

## 5. Health checks

- `curl http://127.0.0.1:8787/` → 200 (UI served).
- `curl http://127.0.0.1:8787/api/session` → 401 (no session) or 200 (with session).
- `node accelerated-launch/service/release-check.cjs` → `NOT_LAUNCH_READY` with the named blockers (the release gate).
- The read-only storage inspection (release check's `STATE_FILE_IS_READABLE` / `PRIVATE_DATA_DIRECTORY_IS_DURABLE`,
  backed by `store-diagnostic.cjs`) — never mutates state.

## 6. Protection of the existing production application

The new service is installed as its **own directory** (`/opt/crp-node-staging`), its **own port** (8787
loopback) and its **own systemd unit**. The legacy runbook's invariant is preserved: the root router / root
container / root certificate (`creditregulatorpro-app`), the dead staging stack, and every other tenant's
container, volume, DB, route or runner are **never touched**. No Traefik static argument is changed, no
container is restarted, and no credential is printed.

## 7. Paid-product wording (observation-only, verified)

The plan catalog and UI state, verbatim, that a purchase buys only the reading of a report and the performed
checks reported. `NOT_GRANTED` includes "no finding and no legal conclusion of any kind", "no letter, no
dispute filing and no contact with any bureau", "no removal, no correction and no score change". No
`VIOLATION`/`PROBABLE_VIOLATION` class is authorized, and the assessment report is labelled "NOT A LEGAL
FINDING · NOT A BUREAU-RESPONSE PACKET". The wording matches the observation-only permission; nothing is sold
as a violation finding.

## 8. Proposed release work order (ready for owner approval)

**B5-RELEASE-001 — deploy the local service to the Hostinger VPS (staging), loopback + Traefik, test-mode Stripe only.**

Preconditions the owner must supply or approve (none is a code change):

1. **Live billing or explicit test-mode acceptance.** This order authorizes only test-mode Stripe. A launch
   needs live keys (`sk_live_`), live CAD prices and a live webhook secret — or an explicit owner decision to
   run test-mode in staging only.
2. **DNS:** create the A record `staging.creditregulatorpro.com → 187.127.252.51` (currently NXDOMAIN).
3. **TLS:** re-issue the `staging.creditregulatorpro.com` certificate (expired 2026-09-22; ACME renewal was
   failing on the missing DNS).
4. **Secrets on the box only:** place `CRP_LOCAL_SERVICE_DATA`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
   `STRIPE_WEBHOOK_SECRET`, the three `STRIPE_PRICE_*`, `STRIPE_UPGRADE_CREDIT_COUPON` and
   `STRIPE_APP_ORIGINS` in `/opt/crp-node-staging/.env` (mode 600), never in the repository.

Deployment steps (each checkpointed, owner-approved before the next):

1. `install -d -m 755 /opt/crp-node-staging` and transfer the build manifest (section 2), record its digest.
2. Install the systemd unit (loopback bind, `EnvironmentFile=/opt/crp-node-staging/.env`), enable/start, verify
   `127.0.0.1:8787` only.
3. Run `release-check.cjs` on the box and record `deployment-provenance.json` (build id, host, deployed_by,
   owner_authorization, deployed_at) — the DEPLOYMENT blocker clears only when this record exists.
4. Point Traefik at `127.0.0.1:8787` (the ONE label change, with a backup of `docker-compose.yml` and a one-line
   diff proof, per the legacy runbook Phase 3).
5. Health-check (section 5) and a rollback rehearsal (restore a copied data dir + prior tree).

Rollback at any step: `systemctl disable --now` the unit, restore the Traefik label backup, and remove
`/opt/crp-node-staging`. The existing production app is untouched throughout.

**Out of scope here:** live Stripe resources, live charges, customer migration, refunds, DNS changes, and any
change to the existing production app.

