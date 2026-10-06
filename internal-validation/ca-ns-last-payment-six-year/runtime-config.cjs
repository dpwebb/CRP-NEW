'use strict';
/**
 * runtime-config.cjs — the single application-root / configuration mechanism for the portable runtime.
 *
 * The runtime does NOT hardcode a Windows checkout path and does NOT read the historical PROD-003 register.
 * The pinned presentation digests are recorded here as constants, and a specimen's on-disk path (needed only
 * for re-measurement/validation, never for admission) is supplied through the environment. On a host that does
 * not hold a specimen, the pointer reports `available: false` and the exact-specimen check stays unavailable,
 * while the structural factual adapters continue to work from their own embedded contracts.
 */

const path = require('node:path');

/** The application root, from the environment or derived from this module's location. No checkout path is baked in. */
function appRoot() {
  return process.env.CRP_APP_ROOT || path.resolve(__dirname, '..', '..');
}

/** A configured specimen path, or null when the host does not hold it. */
function specimenPath(envName) {
  const value = process.env[envName];
  return typeof value === 'string' && value ? value : null;
}

/** Pinned PR-01 (Equifax Canada consumer) evidence. */
const PR_01_SPECIMEN = Object.freeze({
  presentation_id: 'PR-01',
  artifact_id: 'LEG-CONSUMER-EQ-CA',
  publisher: 'Equifax (Canada, consumer channel)',
  audience: 'CONSUMER',
  market: 'CA',
  sha256: 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F',
  bytes: 96393,
  pages: 22,
  page_size: '594.96 x 841.92 pts (A4)'
});

/** Pinned PR-02 (TransUnion Canada consumer disclosure) evidence. */
const PR_02_SPECIMEN = Object.freeze({
  presentation_id: 'PR-02',
  artifact_id: 'LEG-CONSUMER-TU-CA',
  publisher: 'TransUnion (Canada, consumer disclosure channel)',
  audience: 'CONSUMER',
  market: 'CA',
  sha256: '244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4',
  bytes: 362891,
  pages: 12,
  page_size: '612 x 792 pts (letter)'
});

/** Assemble a runtime pointer from the pinned constants plus the configured specimen path. */
function pointerFor(specimen, envName) {
  const absolute_path = specimenPath(envName);
  return Object.freeze(Object.assign({}, specimen, {
    absolute_path,
    available: Boolean(absolute_path),
    reason: absolute_path ? null : 'THE_SPECIMEN_IS_NOT_CONFIGURED_ON_THIS_HOST',
    pointer_source: `runtime configuration (pinned digest + ${envName}); the historical PROD-003 register is not read at runtime`
  }));
}

module.exports = {
  appRoot,
  specimenPath,
  PR_01_SPECIMEN,
  PR_02_SPECIMEN,
  pointerFor
};
