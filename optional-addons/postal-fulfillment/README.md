# Postal fulfillment add-on (isolated candidate)

## Visual preview

Open [preview.html](preview.html) in a browser to review a standalone concept of the optional mailing step. It is a local HTML/CSS/JS mockup, not part of the CRP application. Country, service and packet length controls change **illustrative, invented** prices; no supplier quote, checkout or mail dispatch is connected. The reviewer disclosure shows the provider-cost example and 50% markup, while the consumer panel shows the estimated subtotal and notes that tax would be calculated at checkout.

The staging UI carries a copy of this design in `accelerated-launch/service/ui/mailing-preview.*`. The CRP packet page links to it only on staging after packet approval. The staging screen uses sample details and prices; it does not read the consumer's packet, create a quote, collect payment or send mail. Production does not serve those three preview assets.

This folder is **not imported by the CRP service or UI**. It has no route, checkout, credential, network client, or live postal-provider connection. Running `node test.cjs` uses a synthetic PDF and fake verifier/adapter functions; it does not send mail or move money.

## Purpose and scope

The module models an optional, consumer-approved service to print and post a completed dispute packet. It accepts a provider's **all-in, current** quote, adds 50% to the provider cost, and prepares a handoff only for the exact PDF, destination, service and price the consumer approved and paid for. It supports service labels for the US, Canada, UK and Australia. Postal proof products are intentionally country-specific: USPS Certified Mail, Canada Post Registered Mail, Royal Mail 1st Class Signed For and Australia Post Registered Post are not interchangeable.

`consumer_subtotal_minor = ceil(provider_total_minor * 1.5)` uses the smallest currency unit. The provider total must already include printing, envelope, postage, provider taxes and surcharges. Any tax owed on CRP's sale is **not calculated here** (`consumer_tax_minor: null`); checkout must calculate and show it before approval/payment. No fallback price or currency conversion is permitted.

`chooseLowestQuote` compares only verified, unexpired quotes for the same packet, page count, country, currency and postal service. This keeps the 50% markup tied to the cheapest comparable supplier without silently switching service or destination country.

## Integration contract

1. The server obtains a quote from a contracted, locally suitable supplier and verifies it with `priceQuote(input, verifyProviderQuote)`. The verifier must be server-owned; never trust a quote, price or provider ID from the browser. Expiry and exact packet hash/page count bind the quote.
2. A consumer reviews the finished PDF, destination, service and final price, then explicitly approves mailing. Record that approval in the existing authenticated case store. Payment confirmation must come from a verified provider event, not a checkout redirect or client flag.
3. `prepareOrder(input, {packet, quote, approval, payment})` requires server-owned verifiers to recheck account ownership, the stored provider quote, case/packet association, current approval and verified payment. Approval binds the provider quote and full consumer total (including any checkout-calculated tax). Payment must equal that approved total. It rejects changed PDFs, addresses, services, expired quotes and price changes. Persist the returned idempotency key and state before dispatch.
4. `handoff(order, pdf, adapter, verifyCurrentOrder)` performs the final state and hash checks and calls one injected provider adapter. The adapter must use the idempotency key to prevent duplicate physical letters on retries and return an actual provider job ID. The later integration must persist status, provider quote/job IDs, mailing receipt, tracking and delivery evidence without logging packet contents.

The handoff function is deliberately inert without a configured adapter. No supplier is endorsed or wired here. Candidate suppliers require signed commercial terms, actual per-packet pricing, service availability for each destination, proof semantics, API credentials, privacy/retention review, cancellation behavior and production testing before any live use. A packet ZIP is **not** assumed printable; integration must select the reviewed printable PDF and all required enclosures.

## Current boundary

This is a standalone library candidate, not an implementation-closure claim for the CRP core packet flow or a production-ready mailing service. It does not change the 82-jurisdiction promise, packet download, billing entitlements or release manifest. It does not create an order unless a future integration explicitly invokes it with trusted server verifiers and a supplier adapter.
