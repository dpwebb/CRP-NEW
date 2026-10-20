# Country credit-reporting rights guides — local implementation

Status: IMPLEMENTED_AND_FOCUSED_TESTED_LOCALLY; NOT_DEPLOYED.

Owner authorized separate country information pages while keeping relevant homepages unchanged except the renamed guide links and their destinations. This local change does not inherit the completed analytics release's deployment authority. No staging/production operation, source push, provider/configuration change or consumer data action was performed.

## Delivered

- `/ca/credit-reporting-rights/`
- `/us/credit-reporting-rights/`
- `/uk/credit-reporting-rights/`
- `/au/credit-reporting-rights/`

Each regional homepage and its IP-selected root equivalent links to “Your credit reporting rights in [country]”. The existing `/ca/`, `/us/`, `/uk/` and `/au/` homepages retain their layouts, illustrations, free-report links, news and existing copy. Separate guides explain access/accuracy, reporting periods, correction requests, response periods and escalation, with adjacent official source links and an October 20, 2026 review date. Each guide returns to its regional homepage.

Canada includes all 13 province/territory disclosures. Ontario, Nova Scotia, British Columbia and Québec have directly sourced local summaries. The other nine disclosures direct readers to the official federal directory for their local authority; they do not claim individually verified local numerical deadlines. National Canadian content does not impose a universal six-year rule or a US dispute deadline. The US guide describes federal baseline protections and acknowledges state rules. The UK guide distinguishes record types and regional procedures and preserves the ICO's current guidance-under-review notice. Australia distinguishes correction requests from complaints and links current OAIC guidance.

Source URLs and section mappings are maintained in `accelerated-launch/service/credit-rights-guides.cjs`. Sources were checked through official FCAC/Canadian government, provincial government/regulator, CFPB, ICO, GOV.UK and OAIC pages. This is a bounded public guide, not an exhaustive codification of every jurisdiction or a new assessment rule. The guide states the actual distinction between educational rights and CRP's supported checks. No finding predicate, packet eligibility or report jurisdiction changed.

## Implementation boundaries

Only four exact GET/HEAD guide routes are admitted. Unknown routes, nested private filenames and mutation methods remain refused. Guides are public and indexable in production, noindex in staging, and added to the sitemap. Their fixed canonical URLs do not reflect request Host, country parameters or other query data. Their content works without JavaScript; province sections use native details/summary controls.

Guides retain the Google-free CSP and include no analytics script. `public-analytics.js`, its allowed paths, Google settings and all consent defaults remain byte-identical to the released source. Existing homepage template/CSS/JavaScript, homepage content model and private UI were not edited. Prior analytics release documentation changes, the historical unapproved draft and unrelated output remain untouched by this task.

## Validation

- Four changed/new JavaScript files passed syntax checks; `git diff --check` passed.
- `gp-public-seo` and `gq-public-analytics`: **574 assertions passed, zero failed/skipped**, final focused receipt `accelerated-launch/service/out/country-rights-guides-20261020/focused-r2.json`. The earlier passing r1 remains preserved; r2 follows removal of an unintended guide disclaimer to comply with the existing main-homepage-footer-only language instruction.
- Real isolated HTTP tests cover each guide's GET/HEAD/body/mutation behavior, source links, canonical/Host/query safety, sitemap, production/staging indexing and no Google script/CSP expansion. Existing private-state preservation and actual-worker SEO checks remain passing.
- Eight rendered homepage comparisons (four countries, adaptive-root and explicit regional rendering) against committed released source are byte-identical after removing only the old/new guide anchor. Six homepage/analytics assets and models remain exactly equal to HEAD. Receipt: `out/country-rights-guides-20261020/local-preservation.json`.
- Actual CUA navigation from all four regional homepages passed. All four guide pages were visually inspected at CSS 1440×1000 and 390×844, without horizontal overflow or Google scripts. Native NS and AB disclosures opened correctly. Nine screenshots/observations are retained in `out/country-rights-guides-20261020/browser-views.json`. A semantic Playwright button lookup did not match native summary; the fresh accessibility control succeeded without modifying the page or application.
- Focused verification only. No new full regression, release freeze/package, hosted acceptance or deployment is claimed. All prior full/package evidence remains immutable.

An isolated fictional local preview remains at `http://127.0.0.1:12436/ca/credit-reporting-rights/` (owned Node PID33360, exec session5345; metadata in `out/country-rights-guides-20261020/preview.json`). It uses a disposable harness store and no hosted data. The owned browser tab was closed and viewport override cleared. Any future release needs a new governed freeze/package and the applicable acceptance; no old release intent should be replayed.
