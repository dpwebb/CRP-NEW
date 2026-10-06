# CRP Legacy Legal Corpus Admission Contract

**Status:** Approved Corpus Contract — Rank 4  
**Effective date:** 2026-09-29  
**Legacy source root:** `C:\Users\webbd\crp-credit-app`

This contract is the exact owner-approved Legacy Legal Corpus Admission Contract required by
`CRP_CORE_CONSTITUTION.md` §2.3. It designates only the vetted legal-rule corpus, source evidence,
citations, and source-provenance artifacts listed in §2.

Every designated artifact is authoritative only for its recorded legal content and source metadata.
It is subordinate to `CRP_CORE_CONSTITUTION.md`, `CRP_LEGAL_INVARIANT.md`,
`JURISDICTION_CONTRACT.md`, and `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md`.

No designated artifact is executable authority. No legacy rule may support a legal finding until it is
re-expressed in a conforming governed legal-rule corpus in this repository.

## 1. Admission Boundary

Only the exact relative paths and SHA-256 digests listed in §2 are admitted. A digest mismatch,
missing file, additional file, altered path, or unlisted legacy artifact is outside this contract.

The admission excludes the legacy repository at large and permanently excludes violation determination,
evaluators, scoring, confidence logic, extraction, parsing, application code, tests, consumer reports,
credentials, deployment artifacts, generated output, and all other unlisted material.

The following known legacy artifacts are deliberately excluded:

| Relative path | Exclusion reason |
| --- | --- |
| `packages\backend\src\services\legalCorpus\model.ts` | Imports values from prohibited legacy violation-determination modules. |
| `packages\backend\src\services\jurisdiction.service.ts` | Mixed jurisdiction settings and prohibited detection logic. |

`legalRules.ts`, `solTable.ts`, and `subJurisdictions.ts` are admitted only to the precisely named
static declaration blocks in §2. Their functions, imports, exports other than those declaration
blocks, runtime behavior, scoring, selection, resolution, classification, detection, and all other
code remain permanently excluded.

## 2. Designated Legacy Source Artifacts

| Relative path from legacy source root | SHA-256 | Recorded role |
| --- | --- | --- |
| `packages\backend\src\services\legalCorpus\authorities.ts` | `79EC22A5F9AB6A12E86AD63606410CF5A19271786B089540EAC32038CA8E0EB5` | Source registry |
| `packages\backend\src\services\legalCorpus\authorities.ca.ts` | `DDC6FC2F92BC1F2824F499ED204941DE435B79227A5CD099DE324D7C73E01BE4` | Source registry |
| `packages\backend\src\services\legalCorpus\authorities.canada.ts` | `34DED0275F522CD579E86F22DC97A5FD46CB308924A8288A065550B02C52A0B1` | Source registry and retained-evidence pins |
| `packages\backend\src\services\legalCorpus\authorities.ny.ts` | `0D9E28FE8F34EA89C8F22F7727EDCD03CF63116D69AD8D65F8C1B5D107A6623A` | Source registry |
| `packages\backend\src\services\legalCorpus\authorities.wa.ts` | `85912639F0AAD43AB754501B56357C0F976CA52AC246C1B7F92D0B1DF0DBB03E` | Source registry |
| `packages\backend\src\services\legalCorpus\coverage.ca.ts` | `118F7C51AC20ACC41DEA8B5180CF0A974B518C9922BD4EA3C6DCF3EFFD5D76FB` | Coverage ledger |
| `packages\backend\src\services\legalCorpus\coverage.canada.ts` | `551B220C695D449652FC33ADFFE2EE5544EF95E397F25E3B420F64F92E1ED255` | Coverage ledger |
| `packages\backend\src\services\legalCorpus\coverage.fcra.ts` | `6F47F06B37FED14BE181D90864BC7E507E7DA57D21C0ECA87F0230E898C9DAD5` | Coverage ledger |
| `packages\backend\src\services\legalCorpus\coverage.ny.ts` | `612348DC5B87B90759C6151D753152E35893174428079698122FA23AFAC0F85C` | Coverage ledger |
| `packages\backend\src\services\legalCorpus\coverage.regv.ts` | `144B548F76548A9F81B65E724B73818A160AE6281C9E34E3260801FCF7C33824` | Coverage ledger |
| `packages\backend\src\services\legalCorpus\coverage.wa.ts` | `82C5D3B221D5EA0E253AC04F56691F69922D4D52FD6C7534192C8BD1355DE0AB` | Coverage ledger |
| `packages\backend\src\services\legalCorpus\index.ts` | `BC9421C499A17184AE738D695EE68B560EE9C561BEB6EFFF2343A9A4AC4D09F2` | Corpus assembly and validation reference |
| `packages\backend\src\services\legalCorpus\model.canada.ts` | `6B6CB9A7249506A386E013FF4A995B176E0A4F79E22F319B7F2FB209CEF325C2` | Corpus schema and taxonomy reference |
| `packages\backend\src\services\legalCorpus\rules.ca.ts` | `7DDBF5C4B4743367841128F7A5DD1B699617C6A4E7B567ACBAFDD8B84B681B80` | Legal-rule corpus |
| `packages\backend\src\services\legalCorpus\rules.canada.ts` | `90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF` | Legal-rule corpus |
| `packages\backend\src\services\legalCorpus\rules.fcra.ts` | `22B4331901338ED58CB380F44CF951D354459F69AA16D57DBC5690945E779405` | Legal-rule corpus |
| `packages\backend\src\services\legalCorpus\rules.ny.ts` | `201F5035084F60C92B03E0140E32702ED72E79AD2CEE31405977E05525133590` | Legal-rule corpus |
| `packages\backend\src\services\legalCorpus\rules.regv.ts` | `A725DAEF3C07B1977A869C3A8E45C342B761C08AFE0EFE5537B4F48E5280A51C` | Legal-rule corpus |
| `packages\backend\src\services\legalCorpus\rules.wa.ts` | `A4BFE8999B9AB681C582A59F403280BECC06C0EA20EAEC8F6A456FEF18121E9D` | Legal-rule corpus |
| `evidence\canada\nova-scotia\source-retrievals\historical-ns-cra-amending-act-ca28c40a.pdf` | `CA28C40A5B1F5CA4D782F0C991179562F9B2DE1342CCC82C1BC0B31D757159E5` | Retained source evidence |
| `evidence\canada\nova-scotia\source-retrievals\historical-ns-cra-source-5ad22806.pdf` | `5AD228066B3281E1702C2C63DA012C28128D444B8D528069075DC65939445500` | Retained source evidence |
| `evidence\canada\nova-scotia\source-retrievals\ns-limitation-of-actions-source-1c2253d9.pdf` | `1C2253D9EAFF51F81A2B678774D983B1756709A37AEAAA3D95FC463CA6B847FD` | Retained source evidence |
| `evidence\canada\ontario\source-retrievals\README.md` | `9280833E0D3C797C1F05A2BFF56F8A4096B1613CA561E52AD33641BE306726A1` | Source-evidence custody record |
| `evidence\canada\ontario\source-retrievals\wo05-wo14-ontario-cra-source-efa6d96d.html` | `EFA6D96D82D188FDA04B1AF154F898A93FFFB14B2A779544AB76FFC940EAA063` | Retained source evidence |
| `evidence\canada\ontario\source-retrievals\wo15-ontario-cra-source-4c760ead.html` | `4C760EAD418B84F97EEFB314865EC3509AA8E9DBDBFFFD04D582C99E7F7B1D7E` | Retained supplementary observation |
| `packages\backend\src\credit-engine\rules\citations.json` | `820407E6623E590D80CE4E0C6BB391C6DBB6E69EB77614BB6AE46B7FCDF4157B` | Citation registry |
| `packages\backend\src\credit-engine\rules\citations_registry.ts` | `749A8384B13D3F7555AADE8922DF5886BFB07BD866CE7D3936C5FFA40CFAF1CB` | Citation-registry reference |
| `packages\backend\src\credit-engine\rules\citations_gate.ts` | `53DB4E16271FFC7E5A51C1BC9706C7AC86C047866EF32407E33801E5BE8A2F01` | Citation-completeness reference |
| `docs\citation-objects.tsv` | `C5915E80234A8C17FF7D2A466F12EFFF49F02143D0FFF7FAD269128E7AA3AE33` | Citation and jurisdiction-reference registry |
| `docs\nova-scotia-source-retrievals.json` | `E39B0D8D5C07ED3B2F336B99BC728F7D051CE1B62EB43E0C4B0DD3B9969C4FAE` | Source-retrieval provenance |
| `docs\ontario-source-retrievals.json` | `BD269517BE64C8098E1B1F4FBA9288071F3807CB8386A418B7DA33611399EA13` | Source-retrieval provenance |
| `packages\backend\src\services\legalRules.ts` — only `US_RULES`, `US_STATE_RULES`, `CA_RULES`, `PROVINCE_INSTRUMENTS`, `PROVINCE_CONTENT_RULES`, `UK_RULES`, `AU_RULES`, `UNVERIFIED_GAPS`, and their static legal-source fields | `FE5C1BA63AE85923E378D4278C3D6E85461E8DF648847F43FE02FB4185BD41F6` | Declarative legal rules, instruments, source locators, and recorded gaps |
| `packages\backend\src\services\solTable.ts` — only `SOL_ROWS`, `SOL_GAPS`, `SOL_REFUSED_UNITS`, `JUDGMENT_ENFORCEMENT`, `FEDERAL_DEFAULT_UNITS`, and their static legal-source fields | `E0C04B274FD748461FE8F3D33FB4E5DF52538AB324D7682E02B6B526926896EF` | Declarative limitation, refusal, gap, and source records |
| `packages\shared\src\region-config\subJurisdictions.ts` — only static `AUTHORIZED_COUNTRIES` and `SUB_JURISDICTIONS` declarations | `1256287AE58E73FD6A0EB67F5F020BA892F8F588C417BB09A9D5AE3AEA7AC6DA` | Legacy jurisdiction-vocabulary source |

## 3. Certified Baseline Use and Re-expression

The designated source set is CRP's certified legal-content baseline for its recorded declarative legal
rules, source evidence, citations, coverage records, jurisdiction metadata, legal-family assignments,
and recorded gaps. Its vetted legal research must be reused and re-expressed into a new corpus that
conforms to `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md`; it must not be independently redone as a
precondition to re-expression.

The baseline is authoritative only for its recorded scope. It does not imply coverage of another
country, region, rule family, report type, time period, legal issue, or legal proposition absent from
the designated source set.

Fresh source research is required only to augment a recorded gap or missing scope, or where a specific
recorded source pin, effective period, amendment, repeal, supersession, or other concrete change
indicates that the certified baseline may no longer represent the applicable law. A targeted freshness
check does not reopen or invalidate the remainder of the certified baseline.

The governing jurisdiction code set remains exclusively `CRP-JURISDICTION-ENUM-1`. A legacy
jurisdiction reference is usable only when it maps exactly to a recognized country and region code in
that enumeration. No missing, ambiguous, non-exact, or conflicting legacy mapping is recognized.

No excluded legacy material becomes admitted through this section. In particular, violation
determination, evaluators, scoring, confidence logic, extraction, parsing, application behavior,
selection, classification, detection, tests, and generated outputs remain permanently excluded.

### 3.1 Owner acceptance of the designated legal content (PHASE5-001O)

The owner states that the relevant statutes currently in the legacy system have survived rigorous legal
review and are accepted as legal truth. The recorded legal content of the artifacts designated in §2 is
therefore **`OWNER_ACCEPTED_LEGAL_AUTHORITY`** for this build.

Acceptance under this subsection is owner-directed. It is not an independent verification performed by
any work order, and no work order may describe it as one. Missing provenance, a missing historical
version, and the absence of a prior-review record are **not** prerequisites for accepting the recorded
legal content, and their absence is recorded as an administrative limitation rather than as a bar to
acceptance or to coverage planning. The legal validity of an accepted statute is not independently
reopened by this subsection.

Broadly relevant statutory provisions are included. A single accepted provision may support more than
one rule, jurisdiction, or report condition where the legacy corpus establishes that relationship; the
relationship must be recorded as the corpus records it, and it may not be inferred, broadened, or
extended to a jurisdiction, rule family, report type, or time period the corpus does not record.

This subsection distinguishes statutes from other material. The owner's acceptance of statutes does not
by itself convert guidance, policy summaries, industry codes, notices, or extracted propositions into
statutes; such material is recorded as recorded material and needs its own classification before it is
treated as a statutory source.

Duplicate bookkeeping and an exact corpus-wide unique-provision count are administrative matters under
this subsection. An unresolved duplicate identity or an uncertified count is recorded as an
administrative limitation and must not block acceptance of a statute or coverage planning.

This subsection does not itself admit a governed rule, create legal coverage, authorise a finding, or
permit any behavior excluded by §1.

## 4. Current Legal-Coverage State

```text
ADMITTED LEGACY SOURCE ARTIFACTS: 34
LEGACY LEGAL CONTENT ACCEPTED BY THE OWNER: OWNER_ACCEPTED_LEGAL_AUTHORITY
RE-EXPRESSED GOVERNED LEGAL RULES: 0
GOVERNED JURISDICTIONS WITH LEGAL COVERAGE: 0
PERMITTED LEGAL FINDINGS: 0
```

## 5. Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-29 | PHASE2-001E | Created the digest-bound admission contract for 31 vetted legacy legal-corpus source artifacts. No legacy engine, re-expressed legal rule, legal coverage, or legal finding was admitted. |
| 2026-09-29 | PHASE2-001H | Valid owner amendment: admitted only named static legal-data declarations from three additional digest-bound legacy files, including UK, Australian, broader US-state, and jurisdiction-vocabulary source material; all executable and determination logic remains excluded. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | PHASE4-001F | Valid owner amendment: established the digest-bound legacy legal corpus as CRP's certified legal-content baseline for its recorded scope. Re-expression must reuse that work; fresh research is limited to gaps and concrete freshness issues. Excluded legacy detector behavior remains excluded. |
| 2026-09-30 | PHASE5-001O | Valid owner amendment: added §3.1, recording the owner directive that the relevant legacy statutes are `OWNER_ACCEPTED_LEGAL_AUTHORITY`, that missing provenance, historical versions and prior-review records are not acceptance prerequisites, that broadly relevant provisions are included and may support more than one rule, jurisdiction or report condition where the legacy corpus establishes that relationship, that guidance, policy summaries and extracted propositions are not converted into statutes by that acceptance, and that duplicate bookkeeping and an uncertified unique-provision count are administrative limitations that do not block acceptance or coverage planning. Added the acceptance line to §4. Acceptance is recorded as owner-directed, not as independent verification. No governed rule, legal coverage or finding was created. |
