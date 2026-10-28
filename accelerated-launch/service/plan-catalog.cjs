'use strict';
/** Owner-approved fixed native prices, October 17. No exchange-rate pricing.
 * Payment currency never expands product permissions.
 */

const crypto = require('node:crypto');

const PLAN_CODES = Object.freeze(['report_once', 'monthly', 'annual']);

/** Historical CAD prices in cents, retained for existing CAD contracts. */
const BASE_PRICE_CAD_CENTS = Object.freeze({ report_once: 595, monthly: 795, annual: 7950 });
const NATIVE_PRICES = Object.freeze({
  cad: Object.freeze({ report_once: 1595, monthly: 2795, annual: 27950 }),
  usd: Object.freeze({ report_once: 1495, monthly: 2595, annual: 25950 }),
  aud: Object.freeze({ report_once: 1595, monthly: 2795, annual: 27950 }),
  gbp: Object.freeze({ report_once: 1315, monthly: 2425, annual: 24250 })
});
const CURRENCIES = Object.freeze(Object.keys(NATIVE_PRICES));
const COUNTRY_CURRENCY = Object.freeze({ CA: 'cad', US: 'usd', AU: 'aud', GB: 'gbp' });
const MINIMUM_CHARGE = Object.freeze({ cad: 50, usd: 50, aud: 50, gbp: 30 });
const isCurrency = currency => CURRENCIES.includes(currency);
const currencyForCountry = country => COUNTRY_CURRENCY[country] || 'usd';

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
  'no legal representation or automatic dispute filing; subscribers can prepare an approved packet and download it, or separately authorize available paid mailing',
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
function plan(planCode, currency = 'cad') {
  if (!isPlanCode(planCode)) return null;
  if (!isCurrency(currency)) throw new Error('UNSUPPORTED_PAYMENT_CURRENCY');
  const amount = NATIVE_PRICES[currency][planCode];
  if (!Number.isInteger(amount) || amount < MINIMUM_CHARGE[currency]) {
    throw new Error(`PLAN_PRICE_BELOW_THE_PROVIDER_MINIMUM: ${planCode}`);
  }
  const grant = GRANTS[planCode];
  return {
    plan_code: planCode,
    label: PLAN_LABEL[planCode],
    currency,
    amount_cents: amount,
    amount_display: `${currency === 'gbp' ? '£' : '$'}${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`,
    interval: PLAN_INTERVAL[planCode],
    headline: grant.headline,
    grants: grant.grants.slice(),
    period_days: grant.period_days
  };
}

/** The whole catalog. `catalog_digest` is a content digest of the prices, for the release check to pin. */
function catalog(currency = 'cad') {
  const plans = PLAN_CODES.map(code => plan(code, currency));
  const digest = crypto.createHash('sha256').update(JSON.stringify(plans.map((p) => [p.plan_code, p.currency, p.amount_cents, p.interval]))).digest('hex');
  return {
    plans,
    currency,
    not_granted: NOT_GRANTED.slice(),
    checkout_pricing: { method: 'FIXED_NATIVE_PRICES', location_source: 'VISITOR_IP_GEOLOCATION',
      supported_currencies: CURRENCIES.slice(), fallback_currency: 'usd', consumer_currency_choice: true },
    note: 'Prices use your IP location. You can change currency before paying. Other or unknown locations use US prices. Uploading and assessing your report are free.',
    upgrade_offer: { currency, applies_to: ['monthly', 'annual'], first_invoice_only: true,
      cumulative: true, expires: false, lower_priced_plans_only: true,
      plain: 'Your unused payments for lower-priced plans count toward an upgrade. Any credit left over stays in your account.' },
    catalog_digest: digest
  };
}

/** Preserve unused cents when applying them all would create an unchargeable nonzero invoice. */
function applicableCredit(availableCents, priceCents, currency = 'cad') {
  const credit = Math.min(availableCents, priceCents);
  const due = priceCents - credit;
  return due > 0 && due < MINIMUM_CHARGE[currency] ? priceCents - MINIMUM_CHARGE[currency] : credit;
}

module.exports = {
  PLAN_CODES,
  NATIVE_PRICES, CURRENCIES, COUNTRY_CURRENCY, MINIMUM_CHARGE, isCurrency, currencyForCountry,
  BASE_PRICE_CAD_CENTS,
  MINIMUM_CHARGE_CAD_CENTS,
  applicableCredit,
  BILLING_CURRENCY,
  PLAN_INTERVAL,
  GRANTS,
  NOT_GRANTED,
  isPlanCode,
  plan,
  catalog
};
