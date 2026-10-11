# Credit score simulator research prototype

Standalone, fictional-data prototype of the interaction process observed in BMO's TransUnion-powered simulator on October 8, 2026: choose scenarios, enter scenario-specific values, simulate, compare, and reset.

Open `index.html` in a browser. No build, account, network connection, or application integration is required. All data stays in the browser. The starting profile and its 690-point baseline are fictional.

## Important boundary

The displayed number is a **research proxy score**, not a FICO, VantageScore, TransUnion, Equifax, lender, or consumer credit score. Scenario adjustments in `app.js` are illustrative and must not be used to predict an actual score change, market a score increase, rank consumer disputes, or decide whether an error is worth correcting. A dispute is never treated as a successful correction.

The prototype deliberately mirrors BMO's *process*, not its proprietary scoring calculation or visual branding. It is outside the CRP consumer application and does not read reports, findings, or packets.

Authorized live scenario probes showed that score responses can be nonlinear and can stay unchanged across different input values. Those private, profile-specific outputs are not stored in this repository and are not used as proxy coefficients. A handful of scenario responses cannot identify the underlying TransUnion model.

## Validation

The form requires scenario-specific values and refuses contradictory scenarios. Reset clears the selected scenarios and result. The scoring function is pure and deterministic for the fictional inputs, so it can be replaced by a licensed, named model in a separate future decision.
