# Internal validation — CA-NS last-payment fact extractor and six-year evaluator

**Internal only. Not an admitted evaluator, not a product surface, not a finding engine.**

| Field | Value |
| --- | --- |
| Unit | `CA-NS-CRA-S10-3-C-LIMB-1` — first limb only (six years from the last payment made on the debt) |
| Jurisdiction | `CA` / `CA-NS`, selected explicitly by the consumer; never inferred |
| Presentation | `PR-01` only — the evidenced Equifax Canada consumer-channel credit report specimen |
| Authority | the owner-authorized internal-validation carve-out of `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` section 3 |
| Completion record | `..\..\CRP_PHASE5_001I_A_LAST_PAYMENT_EXTRACTOR_AND_SIX_YEAR_EVALUATOR.md` |
| Evidence | `..\..\SOURCE_CAPTURES\PHASE5-001I-A\` |
| Classification | the recorded legacy `D3` / `observation` determination, preserved and not overridden |

## What it does

Reads two printed facts from one supported presentation and runs one deterministic comparison on them:

1. the `Request Date` printed in the page header, which must appear on every page with one identical value;
2. the `Last Payment Date` printed inside a `Collections` collection record, bound to **its own** record.

It then compares the elapsed days against the six-year span computed from those two dates, and returns
`PERIOD_NOT_EXCEEDED`, `PERIOD_EXCEEDED` or `UNRESOLVED`. It emits no finding, produces nothing
consumer-visible and carries the recorded timing and classification qualifications on every result.

## What it refuses

- any jurisdiction selection other than explicit `CA` / `CA-NS`, and any absent selection;
- any presentation other than `PR-01`, including a `PR-01`-shaped document that is not the evidenced
  specimen, another bureau, a subscriber or screening document, a page with no native text, a wrong
  geometry, a non-PDF container and an encrypted or unreadable file;
- any synthetic or generated fixture — the unit's own test fixtures included;
- a synthetic document model entering the evaluation path, in either direction.

## Run it

```text
node run-internal-validation.cjs --country CA --region CA-NS --presentation PR-01 --pinned-specimen [--out <file>]
node run-internal-validation.cjs --country CA --region CA-NS --presentation PR-01 --report <path> [--out <file>]
node tests/run-tests.cjs
```

The specimen is reached through the path recorded by PROD-003's register, so no path and no file name is
stored in this directory. Report contents are processed locally; no report content and no identifier is
written to any artifact, and `SOURCE_CAPTURES\PHASE5-001I-A\identifier_scan.json` proves it.

## Boundaries

- The comparison outcomes are arithmetic results on two printed dates. `PERIOD_EXCEEDED` alone is not a legal
  finding, and this unit may emit neither `VIOLATION` nor `PROBABLE_VIOLATION`.
- Support is evidenced for one specimen, under a documented structural contract. One specimen does not
  establish support for every report from that bureau.
- Nothing here is gate evidence. The artifact must be re-created and re-validated under Gates 5.5 and 5.6
  before any admission, and the rule record (Gate 5.4) does not exist yet.
