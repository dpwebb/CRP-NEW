# Complete Family workflow reference

[Knowledge base](../../KNOWLEDGE_BASE.md) · [Family user guide](family-admin.md)

Source-bound reference for Family commit `74f1e8ada06ad960def80ad116983e5eb16ad22f`, release `crp-family-adae364ba65a91df162e`. Generated from the exact committed catalog and its matching view inventory. These are supported interfaces, not authorization to call them or evidence that every native business transition was freshly performed. Native roles, record scope, current state, and explicit confirmation still apply.

## Views

| View key | Display name | Native area |
|---|---|---|
| `overview` | Family overview | Shared Family |
| `accounts` | Consumer accounts | crp |
| `cases` | Cases & packets | crp |
| `billing` | Consumer billing | crp |
| `organizations` | Organizations | crp |
| `campaigns` | Campaigns | affiliate |
| `holds` | Commission holds | affiliate |
| `partners` | Partners | affiliate |
| `commissions` | Commissions | affiliate |
| `proposals` | Payout review | affiliate |
| `orders` | Mailing orders | mail |
| `pricing` | Mailing prices | mail |
| `routes` | Mailing routes | mail |
| `team` | Team & access | Shared Family |
| `activity` | Activity log | Shared Family |
| `referrals` | Consumer referral ledger | crp |
| `fulfillment` | Consumer sharing tasks | crp |
| `grants` | Consumer sharing grants | crp |
| `settings` | CRP settings | crp |
| `report` | Affiliate program report | affiliate |
| `contacts` | Affiliate contacts | affiliate |
| `communications` | Affiliate communications | affiliate |
| `assets` | Campaign assets | affiliate |
| `tickets` | Partner support | affiliate |
| `onboarding` | Partner onboarding | affiliate |
| `evidence` | Commission concern evidence | affiliate |
| `resources` | Approved affiliate resources | affiliate |

## Reads and documents

Ordinary Family reads use `/api/apps/{application}/{resource}`. Allowlisted PDF/SVG documents use `/api/documents/{application}/{resource}`. Query fields, IDs, content type, native authorization, and response withholding remain enforced by the server. The native paths below are references, not a way to bypass Family or native access controls.

### Consumer

| Resource | Method | Native path | Capability | Allowed query / format |
|---|---|---|---|---|
| `overview` | GET | `/api/admin/overview` | `overview.read` | — |
| `accounts` | GET | `/api/admin/accounts` | `accounts.read` | q, status, page, page_size, limit, offset |
| `cases` | GET | `/api/admin/cases` | `cases.read` | q, status, page, page_size, limit, offset |
| `billing` | GET | `/api/admin/billing` | `billing.read` | q, status, page, page_size, limit, offset |
| `team` | GET | `/api/admin/team` | `team.manage` | q, status, page, page_size, limit, offset |
| `organizations` | GET | `/api/admin/organizations` | `organizations.manage` | q, status, page, page_size, limit, offset |
| `audit` | GET | `/api/admin/audit` | `audit.read` | q, status, page, page_size, limit, offset |
| `referrals` | GET | `/api/admin/affiliates` | `affiliate.read` | — |
| `fulfillment` | GET | `/api/admin/fulfillment` | `fulfillment.read` | q, status, page, page_size, limit, offset |
| `grants` | GET | `/api/admin/fulfillment-grants` | `fulfillment.grants` | q, status, page, page_size, limit, offset, org_id |
| `settings` | GET | `/api/admin/settings` | `overview.read` | — |
| `packet` | GET | `/api/admin/fulfillment/:id/packet` | `fulfillment.read` | pdf |

### Affiliate

| Resource | Method | Native path | Capability | Allowed query / format |
|---|---|---|---|---|
| `overview` | GET | `/api/status` | `affiliate.read` | — |
| `partners` | GET | `/api/partners` | `affiliate.read` | — |
| `campaigns` | GET | `/api/campaigns` | `affiliate.read` | — |
| `commissions` | GET | `/api/journal` | `affiliate.read` | — |
| `proposals` | GET | `/api/proposals` | `affiliate.read` | — |
| `holds` | GET | `/api/holds` | `affiliate.read` | — |
| `team` | GET | `/api/members` | `affiliate.read` | — |
| `audit` | GET | `/api/audit` | `affiliate.read` | — |
| `proposal` | GET | `/api/proposals/:id/export` | `affiliate.read` | — |
| `report` | GET | `/api/report` | `affiliate.read` | — |
| `contacts` | GET | `/api/contacts` | `affiliate.read` | — |
| `communications` | GET | `/api/communications` | `affiliate.read` | — |
| `assets` | GET | `/api/assets` | `affiliate.read` | — |
| `tickets` | GET | `/api/tickets` | `affiliate.read` | — |
| `onboarding` | GET | `/api/onboarding` | `affiliate.read` | — |
| `journey` | GET | `/api/onboarding/:id` | `affiliate.read` | — |
| `evidence` | GET | `/api/holds/evidence` | `affiliate.read` | — |
| `resources` | GET | `/api/resources` | `affiliate.read` | country |
| `creative` | GET | `/api/campaigns/:id/creative` | `affiliate.read` | — |
| `agreement` | GET | `/api/partners/:id/agreement` | `affiliate.read` | — |
| `program` | GET | `/api/program` | `affiliate.read` | — |
| `qr` | GET | `/api/campaigns/:id/qr` | `affiliate.read` | svg |

### Mail

| Resource | Method | Native path | Capability | Allowed query / format |
|---|---|---|---|---|
| `overview` | GET | `/staff/api/overview` | `fulfillment.read` | — |
| `orders` | GET | `/staff/api/orders` | `fulfillment.read` | search, state, payment, exception, page |
| `order` | GET | `/staff/api/orders/:id` | `fulfillment.read` | — |
| `pricing` | GET | `/staff/api/pricing` | `fulfillment.read` | — |
| `routes` | GET | `/staff/api/routes` | `fulfillment.read` | — |
| `team` | GET | `/staff/api/team` | `fulfillment.read` | — |
| `provider` | GET | `/staff/api/orders/:id/postgrid` | `fulfillment.read` | — |
| `packet` | GET | `/staff/api/orders/:id/packet` | `fulfillment.read` | pdf |
| `preview` | GET | `/staff/api/orders/:id/print-preview` | `fulfillment.read` | pdf |

## Administrative actions

Family actions use `POST /api/actions/{application}/{operation}` with a server-validated named operation, current CSRF protection, explicit environment/action confirmation, and durable request identity. The gateway uses the native method shown below. Reusing an unresolved operation under a new request key is unsafe. Fresh-factor requirements supplement the listed capability.

### Consumer

| Operation | Display name | Native method/path | Capability | Extra global factor | Native body fields |
|---|---|---|---|---|---|
| `team.add` | Add team member | `POST /api/admin/team` | `team.manage` | Normal current authorization | account_id*, role*, permissions*, org_id |
| `team.update` | Update team access | `PATCH /api/admin/team/:id` | `team.manage` | Normal current authorization | role*, status*, permissions*, org_id |
| `organization.add` | Add organization | `POST /api/admin/organizations` | `organizations.manage` | Normal current authorization | name* |
| `organization.update` | Update organization | `PATCH /api/admin/organizations/:id` | `organizations.manage` | Normal current authorization | name*, status* |
| `referral.sync` | Synchronize verified referral ledger | `POST /api/admin/affiliates/sync` | `affiliate.manage` | Fresh factor required | — |
| `referral.enroll` | Enroll existing consumer referral account | `POST /api/admin/affiliates/enroll` | `affiliate.manage` | Normal current authorization | account_id*, introducer_code, org_id |
| `referral.hold` | Hold consumer referral account | `POST /api/admin/affiliates/:id/hold` | `affiliate.manage` | Normal current authorization | reason* |
| `referral.release` | Release consumer referral hold | `DELETE /api/admin/affiliates/:id/hold` | `affiliate.manage` | Normal current authorization | — |
| `fulfillment.add` | Create task from consumer sharing grant | `POST /api/admin/fulfillment` | `fulfillment.grants` | Normal current authorization | grant_id* |
| `fulfillment.update` | Update fulfillment task | `PATCH /api/admin/fulfillment/:id` | `fulfillment.prepare` | Normal current authorization | status* |

### Affiliate

| Operation | Display name | Native method/path | Capability | Extra global factor | Native body fields |
|---|---|---|---|---|---|
| `team.add` | Add Affiliate member | `POST /api/members` | `team.manage` | Fresh factor required | subject*, partnerId*, role* |
| `team.update` | Change Affiliate member role | `PUT /api/members` | `team.manage` | Fresh factor required | subject*, partnerId*, expectedRole*, role* |
| `team.remove` | Remove Affiliate member | `DELETE /api/members` | `team.manage` | Fresh factor required | subject*, partnerId*, expectedRole* |
| `partner.add` | Add partner application | `POST /api/partners` | `affiliate.manage` | Normal current authorization | name*, code*, country*, trafficSource*, introducerId |
| `partner.activate` | Activate accepted partner | `POST /api/partners/:id/activate` | `affiliate.manage` | Fresh factor required | termsVersion* |
| `campaign.add` | Create campaign | `POST /api/campaigns` | `affiliate.manage` | Normal current authorization | partnerId*, name*, country* |
| `proposal.prepare` | Prepare payout for human review | `POST /api/proposals` | `affiliate.manage` | Normal current authorization | partnerId*, currency* |
| `hold.release` | Release commission hold | `POST /api/holds/:id/release` | `affiliate.manage` | Fresh factor required | resolutionRef* |
| `contact.add` | Record contact | `POST /api/contacts` | `affiliate.manage` | Normal current authorization | name*, email*, sourceUrl*, purpose*, partnerId |
| `contact.suppress` | Suppress contact | `DELETE /api/contacts/:id` | `affiliate.manage` | Fresh factor required | — |
| `communication.queue` | Queue authorized communication | `POST /api/communications` | `affiliate.manage` | Fresh factor required | contactId*, template* |
| `asset.publish` | Publish approved campaign asset | `POST /api/assets` | `affiliate.manage` | Fresh factor required | campaignId*, template* |
| `ticket.add` | Create partner support ticket | `POST /api/tickets` | `affiliate.manage` | Normal current authorization | partnerId*, question* |
| `onboarding.start` | Start partner onboarding | `POST /api/onboarding` | `affiliate.manage` | Fresh factor required | contactId* |
| `onboarding.advance` | Advance onboarding checklist | `POST /api/onboarding/:id/advance` | `affiliate.manage` | Fresh factor required | expectedVersion* |
| `onboarding.review` | Record owner qualification review | `POST /api/onboarding/:id/review` | `affiliate.manage` | Fresh factor required | expectedVersion*, decision*, evidenceRef* |
| `onboarding.pause` | Pause or resume onboarding | `POST /api/onboarding/:id/pause` | `affiliate.manage` | Fresh factor required | paused* |
| `agent.run` | Request AI operations task | `POST /api/agent/run` | `affiliate.manage` | Fresh factor required | task* |
| `hold.add` | Record evidenced commission concern | `POST /api/holds` | `affiliate.manage` | Fresh factor required | id*, partnerId*, reason*, evidenceAuditId*, expiresAt* |
| `partner.destination` | Update independently verified payee destination | `POST /api/partners/:id/destination` | `affiliate.manage` | Fresh factor required | destinationRef*, verified* |

### Mail

| Operation | Display name | Native method/path | Capability | Extra global factor | Native body fields |
|---|---|---|---|---|---|
| `note.add` | Add order note | `POST /staff/api/orders/:id/notes` | `fulfillment.prepare` | Normal current authorization | body* |
| `order.cancel` | Cancel mailing order | `POST /staff/api/orders/:id/cancel` | `fulfillment.prepare` | Normal current authorization | reason*, expectedState* |
| `order.assign` | Assign designated fulfiller | `POST /staff/api/orders/:id/assignment` | `fulfillment.prepare` | Fresh factor required | memberId* |
| `order.refund` | Request eligible mailing refund | `POST /staff/api/orders/:id/refund` | `billing.read` | Fresh factor required | reason* |
| `team.add` | Designate mailing contact | `POST /staff/api/team` | `team.manage` | Fresh factor required | name*, country*, kind*, postingPostalCode |
| `team.revoke` | Revoke mailing designation | `POST /staff/api/team/:id/revoke` | `team.manage` | Fresh factor required | — |
| `pricing.update` | Set mailing price | `POST /staff/api/pricing` | `fulfillment.prepare` | Fresh factor required | country*, expectedRevision*, firstPageMinor*, additionalPageMinor*, reason* |
| `route.update` | Update evidenced mailing route | `POST /staff/api/routes` | `fulfillment.prepare` | Fresh factor required | country*, bureau*, address*, originCountry*, enabled*, service*, maxPages*, evidence*, mailer*, operatorCountry, mailingClass, paperSize, postgridRecipientId, postgridRecipientHash, expectedRevision* |
| `route.emergency` | Set explicit manual-mail emergency | `POST /staff/api/manual-emergencies` | `fulfillment.prepare` | Fresh factor required | country*, bureau*, enabled*, expiresAt*, reason* |
| `recipient.verify` | Verify or review bureau recipient | `POST /staff/api/postgrid/recipient` | `fulfillment.prepare` | Fresh factor required | country*, bureau*, address*, previousRequestId, approveNormalized, confirmBureauAddress, bureauEvidence, addressLine1, addressLine2, city, provinceOrState, postalOrZip |
| `order.fulfill` | Record checked fulfillment transition | `POST /staff/api/orders/:id/fulfill` | `fulfillment.prepare` | Fresh factor required | expectedState*, action*, packetHash*, confirm*, evidence*, service, tracking |
| `provider.prepare` | Prepare provider mailing | `POST /staff/api/orders/:id/postgrid/prepare` | `fulfillment.prepare` | Fresh factor required | confirm* |
| `provider.preview` | Refresh provider print preview | `POST /staff/api/orders/:id/postgrid/preview` | `fulfillment.prepare` | Fresh factor required | confirm* |
| `provider.send` | Submit customer-authorized provider mailing | `POST /staff/api/orders/:id/postgrid/send` | `fulfillment.prepare` | Fresh factor required | confirm* |
| `provider.reconcile` | Reconcile uncertain provider outcome | `POST /staff/api/orders/:id/postgrid/reconcile` | `fulfillment.prepare` | Fresh factor required | confirm* |
| `provider.cancel` | Cancel provider submission | `POST /staff/api/orders/:id/postgrid/cancel` | `fulfillment.prepare` | Fresh factor required | confirm* |

`*` marks required fields in the catalog. The native service may impose additional domain rules, versions, approval requirements, or object restrictions. This reference does not include credentials, private bindings, customer IDs, or arbitrary endpoint access.

Sources: [catalog](../../family-admin/src/catalog.mjs), [HTTP boundaries](../../family-admin/src/server.mjs), [gateway authorization](../../family-admin/src/gateway.mjs), and [release evidence](releases.md).
