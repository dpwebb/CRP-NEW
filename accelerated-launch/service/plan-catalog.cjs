'use strict';
/** Owner-approved pricing, 2026-10-01: CAD 5.95 one-time, 7.95 monthly, 79.50 annual.
 * Supersedes legacy USD reference pricing. Payment never expands legal output permissions.
 */

const crypto = require('node:crypto');

const PLAN_CODES = Object.freeze(['report_once', 'monthly', 'annual']);

/** Base price in CAD cents. THE single source of truth for what a plan costs. */
const BASE_PRICE_CAD_CENTS = Object.freeze({ report_once: 595, monthly: 795, annual: 7950 });

/** Configured minimum CAD charge is $0.50; every amount above clears it. Asserted in `plan()`. */
const MINIMUM_CHARGE_CAD_CENTS = 50;

const BILLING_CURRENCY = 'cad';

const PLAN_INTERVAL = Object.freeze({ report_once: 'one_time', monthly: 'month', annual: 'year' });

/**
 * WHAT EACH PLAN GRANTS IN THIS BUILD — not in the legacy product.
 *
 * The grant is a scope, not an outcome: it buys the right to have a report read and the performed checks
 * reported. It buys nothing else, and every sentence below is true of the code in this directory.
 */
const GRANTS = Object.freeze({
  report_once: Object.freeze({
    headline: 'Unlock this report',
    grants: Object.freeze([
      'the complete assessment of the report already uploaded for this case, including every reporting issue that was found',
      'the report facts and the plain-English explanations behind those issues, and the next steps that apply to them',
      'the complete assessment download for that report',
      'this unlock covers that one report only: it does not include dispute packets or the subscriber features'
    ]),
    period_days: 30,
    access_via: 'ONE_TIME_CREDIT'
  }),
  monthly: Object.freeze({
    headline: 'Monthly access',
    grants: Object.freeze([
      'complete assessments and assessment downloads for your reports',
      'consumer-selected dispute packets, through selection, review, approval and download',
      'report history and subsequent-report comparison',
      'the other subscriber features this build records, for the monthly period'
    ]),
    period_days: 31,
    access_via: 'SUBSCRIPTION'
  }),
  annual: Object.freeze({
    headline: 'Annual access',
    grants: Object.freeze([
      'complete assessments and assessment downloads for your reports',
      'consumer-selected dispute packets, through selection, review, approval and download',
      'report history and subsequent-report comparison',
      'the other subscriber features this build records, for the annual period'
    ]),
    period_days: 366,
    access_via: 'SUBSCRIPTION'
  })
});

/**
 * The limits this catalog must never be described as exceeding. Rendered to the consumer verbatim beside the
 * plans, and asserted by the suite. These are the product boundaries, not marketing caveats.
 */
const NOT_GRANTED = Object.freeze([
  'no legal conclusion and no legal advice',
  'no letter, no dispute filing and no contact with any bureau (you send your own packet)',
  'no removal, no correction and no score change',
  'no check of every possible legal issue',
  'a one-time unlock is limited to the one report it was bought for'
]);

const PLAN_LABEL = Object.freeze({
  report_once: 'CRP One-Time Credit Report',
  monthly: 'CRP Monthly',
  annual: 'CRP Annual'
});

function isPlanCode(value) {
  return PLAN_CODES.includes(value);
}

/** One plan as the consumer surface may render it. It carries no provider id, price id or secret. */
function plan(planCode) {
  if (!isPlanCode(planCode)) return null;
  const amount = BASE_PRICE_CAD_CENTS[planCode];
  if (!Number.isInteger(amount) || amount < MINIMUM_CHARGE_CAD_CENTS) {
    throw new Error(`PLAN_PRICE_BELOW_THE_PROVIDER_MINIMUM: ${planCode}`);
  }
  const grant = GRANTS[planCode];
  return {
    plan_code: planCode,
    label: PLAN_LABEL[planCode],
    currency: BILLING_CURRENCY,
    amount_cents: amount,
    amount_display: `$${(amount / 100).toFixed(2)} ${BILLING_CURRENCY.toUpperCase()}`,
    interval: PLAN_INTERVAL[planCode],
    headline: grant.headline,
    grants: grant.grants.slice(),
    period_days: grant.period_days
  };
}

/** The whole catalog. `catalog_digest` is a content digest of the prices, for the release check to pin. */
function catalog() {
  const plans = PLAN_CODES.map(plan);
  const digest = crypto.createHash('sha256').update(JSON.stringify(plans.map((p) => [p.plan_code, p.currency, p.amount_cents, p.interval]))).digest('hex');
  return {
    plans,
    currency: BILLING_CURRENCY,
    not_granted: NOT_GRANTED.slice(),
    note: 'One currency, priced once. Uploading a report and having it assessed are free. A purchase unlocks the reading of the report that was assessed — nothing more, and nothing that is not in this list.',
    upgrade_offer: { credit_cents: 595, currency: 'cad', valid_days: 90, applies_to: ['monthly', 'annual'], first_invoice_only: true },
    catalog_digest: digest
  };
}

module.exports = {
  PLAN_CODES,
  BASE_PRICE_CAD_CENTS,
  MINIMUM_CHARGE_CAD_CENTS,
  BILLING_CURRENCY,
  PLAN_INTERVAL,
  GRANTS,
  NOT_GRANTED,
  isPlanCode,
  plan,
  catalog
};
