# Backpack coordinator operations

Implemented locally on 16 November 2026. No hosted migrations, coordinator grants,
production baselines, awards or emails have been performed by this change.

This phase replaces direct private-table editing for household review, special
cases, backpack records and baseline approval. The interface is at
`/admin/backpacks`, linked from the admin navigation. See [backend setup](README.md)
for prerequisites and the still-outstanding cutoff/question policy.

## Authorization and activation

For an isolated CLI-managed Docker test instance, see
[local Supabase testing](../docs/local-supabase.md). It applies these migrations
locally, creates synthetic accounts and configures the local coordinator page.

The migration `20261116000000_backpack_coordinator.sql` adds a private coordinator
allowlist, audit history, baseline-run records and a single public RPC,
`backpack_admin(text,jsonb)`. Only authenticated, confirmed users explicitly listed
as active coordinators can use it. Editable Auth user metadata and browser-supplied
roles/reviewer IDs are not authorization sources. Coordinator permissions do not
waive a participant's questionnaire, historical-path or household requirements.

A database owner must bootstrap approved coordinators in the target environment.
For example, after replacing the email placeholder with an approved confirmed user:

```sql
insert into backpack.coordinators(user_id, note)
select id, 'Approved backpack programme coordinator'
from auth.users
where email = '<confirmed coordinator email>' and email_confirmed_at is not null;
```

Revoke access by setting that user's `active` to false. No API action can promote
users, edit this registry, enable qualification/email or obtain worker permissions.
The service role is not granted the coordinator RPC; the worker retains its own
separate service-role RPCs. Database-owner SQL access remains privileged.

After the reviewed migrations are applied to staging, enable the HTTP bridge with
`BACKPACK_ADMIN_ENABLED=true`. It defaults to false in `.env.example`. This switch
is independent of the assessment and email-worker switches. No new secret or
service-role key is needed for the coordinator endpoint; it uses the signed-in
user's Supabase JWT.

## Coordinator interface

Apply `20261116010000_backpack_coordinator_ui.sql` after the coordinator migration.
The page and its API share `BACKPACK_ADMIN_ENABLED`; the database allowlist remains
mandatory even for users who can access other admin pages. Participant data is
loaded using the signed-in JWT and responses are private and uncached. Disabled,
unauthenticated or unauthorized users receive no participant snapshot. Revoked
access clears displayed participant data on the next request.

The page provides four work areas:

- **Households:** search names, email, address or property ID; filter and paginate
  participants; select the complete proposed membership and nominate a contact.
  Opening a household loads every existing member regardless of search/pagination.
  Preview the evidence, record a reason and confirm. Stale evidence requires a new
  preview. Existing award/notification history can prevent a move.
- **Special cases:** review pre-cutoff/no-kit accounts and record a decision with
  a reason. Approval does not waive questionnaire requirements.
- **Backpacks:** record historical awards or qualified new allocations, search
  existing records, record known delivery and preview/import historical CSV data.
- **Baseline:** inspect configured rules and blockers, run a silent baseline,
  select its recorded summary and approve readiness with a review note. Changed
  evidence requires another run. Approval does not turn on sending.

The default operation mode is historical reconciliation. The explicit live option
is available only for an already activated programme with approved readiness.
The page displays policy/worker state but cannot enable the programme or email.

### Historical CSV format

Choose a file or paste CSV, preview the matches, enter a provenance note and then
explicitly import. Required headers are `reference,email`; optional headers are
`awarded_at,delivered_at,note`. References must be stable source-register IDs.
For example:

```csv
reference,email,awarded_at,delivered_at,note
register-001,person@example.org,,,Historical register; dates unknown
register-002,other@example.org,2026-10-01T10:00:00+10:00,,Allocation recorded
```

The preview resolves exact email matches to confirmed households and blocks
ambiguous/unresolved matches, repeated references and multiple rows for one
household. Batches are limited to 50 rows and 128 KiB. Files are parsed locally;
only individual reviewed award requests are submitted. Imports are sequential,
not a single transaction: completed rows stay recorded if a later row fails.
The page retains row results and stops at the first failure. Reusing the same
references/facts allows safe retry; conflicting history requires reconciliation.

Blank historical dates stay unknown. CSV timestamps require an explicit timezone
(`Z` or offset). Manual date inputs offer Australia/Sydney or UTC and reject
nonexistent/ambiguous daylight-saving times. Readable dates display Sydney time.

## Request format

Send same-origin JSON POST requests to `/api/backpack/admin`, while signed in:

```js
async function backpack(action, args = {}) {
	const response = await fetch('/api/backpack/admin', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action, arguments: args })
	});
	const body = await response.json();
	if (!response.ok) throw new Error(body.error);
	return body.result;
}

const snapshot = await backpack('snapshot', { limit: 50, offset: 0 });
const readiness = await backpack('baseline_preview');
```

Browsers supply the Origin header automatically. The endpoint requires the exact
same origin, bounds request bodies to 16 KiB, rejects unknown actions/arguments
and sets `Cache-Control: private, no-store`. It never forwards an
actor/reviewer ID.
Database authorization is also enforced on direct RPC calls. Raw SQL/provider
error text is not returned to clients.

## Operations

- `snapshot`
  - Arguments: Optional `limit` (1–100), `offset` (0–100000), `search` (up to
    120 characters), `filter`.
  - Behaviour: Paginated coordinator member report, matching addresses/property
    evidence, safe policy settings, readiness, notification counts and recent
    baseline runs. Filters: all, pending, special_case, incomplete, qualified,
    awarded.
- `household_details`
  - Arguments: `household_id`.
  - Behaviour: Complete household membership and review evidence, independent of
    directory pagination.
- `list_awards`
  - Arguments: Optional `limit`, `offset`, `search`.
  - Behaviour: Paginated award records with contact/member information and
    delivery history.
- `baseline_preview`
  - Arguments: None.
  - Behaviour: Read-only readiness counts. Does not assess users or create
    candidates. `assessable_accounts` means confirmed non-test accounts, not
    households entitled to an award.
- `preview_household`
  - Arguments: `household_id`, `member_ids`.
  - Behaviour: Read-only preview of proposed members and related
    household/history evidence, with a revision token. A property ID never
    automatically merges accounts.
- `confirm_household`
  - Arguments: `household_id`, `member_ids`, `contact_user_id`, `revision`,
    optional `property_id`, `note`, optional `mode`.
  - Behaviour: Confirm a reviewed household and nominate its contact. Requires a
    current preview and every existing target member. Default mode reassesses
    without emails and invalidates baseline approval.
- `decide_special_case`
  - Arguments: `user_id`, `programme`, `decision`, `note`, optional `mode`.
  - Behaviour: Record pending/approved/declined with the authenticated reviewer
    and timestamp. Does not waive required answers. Default mode reassesses
    without emails and invalidates baseline approval.
- `record_award`
  - Arguments: `household_id`, `programme`, `reference`, `historical`, `note`;
    optional `original_user_id`, `awarded_at`, `delivered_at`, `mode`.
  - Behaviour: Record/import one award for the resolved household. Reference
    provides replay protection. Historical unknown dates stay NULL. A current
    award requires enabled policy and current qualification.
- `record_delivery`
  - Arguments: `award_id`, `delivered_at`, `note`, optional `mode`.
  - Behaviour: Record a known delivery once. Repeating the same fact is harmless;
    a conflicting date requires reconciliation rather than overwriting history.
- `run_baseline`
  - Arguments: `policy_id`, `note`.
  - Behaviour: Run the no-email baseline for the current policy and retain its
    evidence fingerprint, summary and reviewer. Unconfigured preparation runs
    are allowed but cannot be approved as ready.
- `review_baseline`
  - Arguments: `run_id`, `note`.
  - Behaviour: Approve a still-current, blocker-free baseline. Records
    reviewer/time and sets the policy's baseline-completed timestamp. Never
    enables email.

Use UUIDs for identifiers and ISO 8601 timestamps with explicit `Z` or UTC
offset.
Notes must contain 1–2000 characters. A reference must contain 1–200 characters.
The historical flag is an explicit boolean, not a string. One household review
accepts at most 50 distinct member IDs. Unknown/malformed values are rejected by
the API and revalidated in the database where the relevant invariants are enforced.

### Historical and live operation modes

The four household/case/award/delivery actions accept `mode`:

- Omit it, or use `baseline`, for historical reconciliation. Email dispatch must
  be paused (`email_enabled=false`) with no processing jobs. These actions assess
  quietly, invalidate old baseline approval and never queue new email jobs.
- Use `live` explicitly for ongoing reviews after launch. This requires an already
  enabled, email-enabled programme with reviewed baseline readiness; it cannot
  activate any of those settings. It refuses changes to a household with an
  in-flight notification. Confirming a genuinely new household or approving its
  special case can then queue exactly one qualification event through the existing
  assessment logic. Live changes preserve the programme's initial readiness,
  like normal post-launch profile saves.

Historical award imports are never permitted in live mode. New allocations and
known deliveries can use live mode, with current qualification required for a new
award. Existing award/notification history guards still apply in both modes.
Claims and coordinator operations share a transaction lock; no database lock is
held during the external email HTTP request. A claimed send must finish or be
reconciled before a conflicting household change.

The default remains the quiet historical path. Do not label historical work live
to avoid baseline review, or label a new post-launch household baseline if you
intend its first qualification to notify the contact. Neither mode fabricates a
sent/accepted timestamp. Only the delivery worker records provider acceptance.

## Household review workflow

1. Run a preparation baseline if member candidates do not exist yet. Each user gets
   a separate pending candidate even when several users share a property ID.
2. Use the snapshot to identify related accounts. Inspect the real property and
   household evidence; multiple households at one address remain legitimate.
3. Choose the existing candidate household that will represent the group. Preview
   the full intended membership with `preview_household`.
4. Review its members, current addresses, property identifiers and related history.
   No property ID is mandatory where manual evidence establishes a household;
   record the reason in the review note. Supply the reviewed property ID or NULL.
5. Submit `confirm_household` with the returned revision, all target members and
   one nominated confirmed member as contact. Use the default baseline mode for
   historical rollout; use explicit live mode for genuinely new post-launch reviews.
   The server records the actual actor.
6. A 409 stale-preview response means evidence changed: preview and review again.
   Do not automatically retry an old revision or remove a conflicting member.

Moves involving an award, notification or prior qualification remain blocked by
the first-phase history guards. A conflicting group needs explicit reconciliation
of its history; this API does not erase records or silently transfer entitlement.
Vacated candidate rows remain as historical records. Address edits invalidate the
affected membership as before. A contact change can be made through a fresh full
household preview/confirmation; it does not reset award or notification history.
A changed payload after an attempted send still requires delivery reconciliation.

## Historical awards and current allocations

Import one record per request using a stable source reference, for example a
register row ID. The same programme/reference and facts return the existing award;
a different household or conflicting supplied facts produces a conflict. Another
reference for an already-awarded household also produces a conflict. A reference
is an identifier, not a deduplication mechanism based on names or email addresses.

An original user, when supplied, must belong to the confirmed household. Keep
the source reference and meaningful provenance note. Set missing historical
award and delivery dates to NULL or omit them; the server does not guess dates.
Recording a later known delivery does not fill in an unknown award date. A replay
of the import after delivery preserves that delivery record.

For `historical=false`, the household must independently satisfy current policy.
An omitted award time records the actual allocation time. Replays reuse that time.
Future dates and delivery before a known award date are rejected. Historical
awards do not need to pass today's questionnaire requirements, but do need resolved
household attribution. Neither import nor allocation modifies historical `kit_date`.

Awards suppress safe pending notifications for that household. Pending jobs with
uncertain delivery move to manual review instead of being labelled sent. Accepted
emails retain their original acknowledgement/history.

## Baseline approval workflow

1. Finalise the programme's cutoff, catalogue/scope, exclusions and approval using
   the first-phase policy setup. Keep sending disabled.
2. Resolve household memberships, nominate contacts, reconcile historical awards
   and decide pre-cutoff/no-kit special cases. These edits invalidate any earlier
   baseline-completed timestamp.
3. Run `baseline_preview` to inspect readiness; it reports configuration, missing
   assessments, unresolved memberships, missing contacts and pending special cases.
4. Run `run_baseline` for the current policy. This records the real inputs used
   for the baseline without producing email jobs or artificial dates.
5. Inspect the summary and report, then submit `review_baseline` with its run ID.
   Approval rejects an unconfigured policy, outstanding blockers, an old policy
   or evidence that changed after the run. Rerun and review after such changes.
6. An approved review records readiness only. The separate email policy/environment
   switches and authenticated schedule still require deliberate later activation.

Baseline fingerprints cover relevant account/profile data, memberships,
household records, review evidence, special cases, awards and rule configuration.
They do not read password hashes, tokens, SMTP passwords or API keys. Baseline runs
and reviews take brief database maintenance locks to keep that snapshot consistent,
not locks held while an operator reads the report in their browser.

Read-only actions do not create audit entries. Successful mutations record
actor, action, mode where applicable, note, target and relevant evidence in
private `coordinator_audit`. Duplicate award imports, identical delivery updates
and repeated approval of the same baseline do not create duplicate mutation entries.
Existing assessment/email history remains
separate and no operation fabricates an accepted/sent email timestamp.

## Verification and remaining work

The `npm run test:backpack` suite includes API authorization, request bounds,
strict action validation, CSRF checks, safe errors, JWT forwarding, page access
guards, CSV parsing, Sydney/UTC conversion and component compilation/accessibility
warnings. The database test script runs coordinator SQL in a second fresh synthetic
database, independently of the first-phase qualification/concurrency suite. It
covers actual authenticated RPC execution, revocation, stale previews/baselines,
blockers, merges, idempotence,
unknown dates, special cases, duplicate/current-award protection and authorized,
bounded UI read models without sensitive questionnaire answers.

Run `npm run test:backpack:ui -- --playwright-module /absolute/path/to/playwright/index.mjs`
with an available Playwright install and Chromium browser. The harness uses a
temporary local Vite server and synthetic participants only, validates requests
against the API action validator, and blocks external requests. It exercises stale
household/baseline handling, partial membership, cases, historical/CSV imports,
delivery, revoked access and mobile layout. It does not validate real Auth cookies,
production data or email delivery.

The rollout inputs, real Auth sign-in/refresh validation and staging deployment
remain outstanding, along with provider delivery webhooks, a scheduler and final
policy configuration. No automatic email activation is included.
