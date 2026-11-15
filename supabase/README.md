# Backpack programme backend

This is an additive, locally tested implementation. **No hosted migrations have
been applied and no production baseline or email sends have run.** The private
`backpack` schema holds programme configuration, households, assessments and
notification history. Account/profile answers remain in their existing tables.

## Defaults and prerequisites

- The initial policy has no cutoff, question scope or exclusion list. It is not
  approved; assessment and email switches are false. Unset exclusions differ from
  an explicitly empty list. Unconfigured assessments return no qualification verdict.
- [config/survey-questions.json](../config/survey-questions.json) is the
  machine-readable catalogue. Numbering, scope, exclusions and draft conditional
  rules require coordinator approval before policy activation. The SQL seed is
  generated from this file, checked by `npm run test:backpack`.
- Existing property IDs are candidate evidence, not authoritative household IDs.
  Each candidate starts separately and pending review, even when another account
  has the same property identifier. No automatic matching threshold is invented.
- Award uniqueness is `(programme, household_id)`. One confirmed member must
  independently meet the answer and historical/review requirements. A nominated
  confirmed contact receives the household message. Partial answers and sign-in
  evidence are never combined between members.
- Draft cutoff semantics are registered **at or after** the configured instant for
  new entrants; older kit recipients need their own sign-in at or after that
  instant. Confirm this boundary and timezone with the coordinator before activation.
- `raw_app_meta_data.kit_date` remains historical kit evidence. Its raw value is
  preserved in reports; no backpack award is inferred from it. Confirm historical
  date quality and import known backpack awards before any sending.
- SQL uses `public.profile` and the hosted project's existing `auth.users` fields.
  The synthetic local fixture is intentionally minimal; it does not recreate all
  Supabase Auth infrastructure. Validate on a staging copy before production.

## Local verification

No extra npm packages are required. Run from the repository root:

```bash
npm run test:backpack
bash scripts/test-backpack-db.sh
```

The database script creates and stops only its own disposable `soc-backpack-tests-*`
Docker container, with no network, host ports, project volumes or real user data.
It uses the locally available `postgis/postgis:17-3.5` image. Its Auth and profile
fixtures are derived from the catalogue and are used only for tests.

The tests cover blank/zero/No/None answers, conditional exclusions, baseline
idempotence and email suppression, shared-property candidates, special cases,
post-cutoff sign-ins, multi-member qualification, historical review attribution,
private access, stale reminders, provider acknowledgement, lease tokens, uncertain
retries, address changes and duplicate household awards.

For a build-only check without a real backend:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321 \
VITE_SUPABASE_ANON_KEY=local-build-placeholder \
VITE_SUPABASE_REDIRECT_URL_BASE=http://localhost:5173 npm run build
```

These placeholders are not suitable for interactive authentication or data access.

## Migrations and privileges

Apply migrations in filename order to a staging database with the existing app
schema, using your normal Supabase migration workflow. Review and back up the
hosted database before considering production application. Do not run the synthetic
fixture or test SQL against a real project.

The migrations create:

- `backpack.catalogues` and immutable assessed policy versions.
- Household candidates, reviewed memberships/contact nominations and history.
- Review evidence, special-case decisions and member assessments.
- Household status and coordinator-recorded awards with delivery/provenance fields.
- A persistent notification outbox and internal processing-error records.
- Auth sign-in and profile-save triggers; an address-change trigger invalidates
  membership evidence pending coordinator review.

The schema has RLS enabled and no anonymous/authenticated grants. Public RPCs
`backpack_baseline`, `backpack_reassess`, `backpack_report`, `backpack_claim_email`
and `backpack_finish_email` are executable only by the service role or database
owner. `backpack_record_submission()` is also available to authenticated users,
but accepts no user ID and assesses only `auth.uid()`. No participant can nominate themselves into another household or inspect
another member's answers through these functions. Table Editor/database-owner
access is currently the administrative interface; there is no coordinator UI yet.

Existing `get_new_users_confirmed*` and KYNG reports are deliberately preserved.
Use the new structured `backpack_report()` alongside them to compare outcomes;
replacing old report interfaces remains a subsequent migration after rules are
approved. The new logic never depends on the external KYNG/addressing service.

## Baseline and administrative workflow

1. With email disabled, run `select public.backpack_baseline();`. This creates
   pending membership candidates, imports only genuine `last_sign_in_at` evidence
   and records assessments. It creates no email jobs, fake award dates or accepted
   email timestamps. It can be rerun; draft unconfigured results are explicit.
2. Inspect `backpack.household_candidates`, `backpack.memberships` and the relevant
   property evidence. Missing IDs, shared properties and conflicting addresses
   require coordinator decisions. Review merges before confirming memberships.
3. Store reviewed household/membership status, reviewer/time and notes. Nominate
   one confirmed member as `households.contact_user_id`. Preserve the original
   user evidence when importing historical awards. A property can have multiple
   distinct household rows.
4. Set the approved cutoff, explicit `scope_question_ids`, `excluded_question_ids`
   (possibly empty), catalogue version and approval time on the draft policy.
   Configure sender/reply-to/coordinator addresses and an HTTPS authenticated
   profile URL. Enable assessment only; keep email disabled.
5. Rerun `backpack_baseline()` with these final rules and resolved households.
   Review `select * from public.backpack_report();` and reconcile historical awards.
   Mark `baseline_completed_at` only after that review. Approved policies with
   assessments are immutable except for enable switches/baseline completion:
   create a new policy version to change rules or email configuration.
6. Exercise delivery in a staging project and test inboxes, then deliberately enable
   the policy's `email_enabled` and the server worker switch. No scheduler is added
   by this implementation; configure one separately once rollout is approved.

Coordinator decisions in `backpack.special_cases` must retain decision, reviewer,
reason and time. After an approved membership/contact/special-case change, call
`select public.backpack_reassess('<member UUID>');` for affected members. This can
queue a live qualification event when sending is enabled, so perform historical
reconciliation under email-disabled/baseline mode instead.

Membership moves with award/notification or prior qualification history are
blocked. They require a reviewed reconciliation migration, preserving the
historical household/event evidence; do not delete history to bypass this guard.
Address changes mark the affected membership pending, without silently moving it.

Baseline-qualified households are not automatically emailed later just because
someone signs in again. A member completing an incomplete baseline may establish
new qualification. Household notifications are deduplicated for the programme,
including concurrent member assessments. A background database profile write can
reassess qualification but cannot request an incomplete reminder. The authenticated
form-submission hook requests that reminder only after a successful explicit save.
No award is created automatically.

`auth.users.last_sign_in_at` changes provide sign-in evidence independently of the
browser, while unrelated Auth updates do not count. Verify the deployed Auth
version's sign-in/refresh behaviour on staging before activation. Trigger failures
are captured in `backpack.processing_errors` without blocking login or profile
saving; inspect that table during rollout.

## Email worker

The route is `POST /api/backpack/dispatch`. Set server-only variables documented
in [.env.example](../.env.example):

- `BACKPACK_ASSESSMENT_ENABLED=true`: enable explicit form-submission assessment
  hooks after migration/configuration. Incomplete reminders require these hooks;
  arbitrary background profile updates do not request them.
- `BACKPACK_WORKER_SECRET`: scheduler bearer credential.
- `BACKPACK_EMAIL_WORKER_ENABLED=true`: explicit environment switch.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: server-side project access.
- `RESEND_API_KEY`: sending credential for the approved account/domain.

The policy must also be enabled, baseline-reviewed and email-enabled. A disabled
worker requires no Supabase or Resend credentials. The route creates no clients
at import time, and keeps secrets out of browser bundles. Never prefix these
secrets with `VITE_`.

An authorised request processes at most one job. Schedule repeated POST requests
at a suitable low rate after deployment approval. Each job has an exclusive lease,
fixed payload and stable Resend idempotency key. Immediately before sending it
rechecks policy, current answers, membership/contact and existing awards. Stale
incomplete reminders are suppressed. Missing confirmed contacts wait for review.

Quota/rate-limit responses are retried later; other permanent errors stop. Network
failures and expired worker leases are uncertain outcomes and retain their retry
safety history. Beyond the conservative 23-hour idempotency window they move to
`needs_review`, rather than risking a duplicate send. Changed recipients/payloads
after an attempt also require review. There are at most eight delivery attempts.
Provider acceptance is recorded as `accepted`, not proof of inbox delivery.
A signed provider delivery-webhook handler is a later extension.

Inspect `needs_review`, `failed`, `suppressed` and `processing_errors` regularly.
Reconcile uncertain jobs in Resend before any manual retry, preserve their stable
idempotency keys, and never mark an email accepted without its provider ID. The
worker respects Resend quota errors but does not reserve account-wide capacity;
choose scheduling/headroom that preserves authentication email availability.

## Remaining rollout work

- Obtain the cutoff, adopted question scope/exclusions and final template approval.
- Review household candidates/contacts, special cases and historical backpack awards.
- Confirm Resend settings and test real Auth sign-in versus token refresh on staging.
- Add coordinator operations UI and participant household/missing-question status
  display if desired. Currently emails link to the existing profile editor; they
  do not claim a new household-status screen exists.
- Compare/refactor legacy reports only after adopting and validating the new rules.
- Deploy reviewed migrations and code, run the controlled baseline and enable an
  authenticated schedule only when authorised. No deployment is part of this change.
