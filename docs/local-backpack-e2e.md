# Local backpack end-to-end test

With Docker running and project dependencies installed, run:

```bash
npm run test:backpack:e2e
```

The test creates its own disposable CLI-managed Supabase stack on ports **54921**
and **54922**, plus an application server and capture server on free loopback
ports. It does not use or modify the normal local stack on port 54821, your
`.env.local`, hosted settings, production users or the approved programme rules.

The test applies the local profile bootstrap and all backpack migrations. It
creates synthetic accounts and a catalogue explicitly named `LOCAL-E2E-TEST-ONLY`.
The artificial rules require **Q1 and Q6**, allow neither to be unanswered and use
**2000-01-01 UTC** as the cutoff. These rules are for the disposable test only.

It then exercises the real HTTP routes, Auth service and database:

1. Coordinator sign-in, reviewed household membership/contact nomination, a
   silent baseline and readiness approval without queued emails.
2. Participant sign-in and background profile changes without incomplete reminders;
   a household qualified at baseline remains silent on subsequent sign-in.
3. An explicit incomplete About Me save that queues one notification.
4. Worker authorization, a simulated quota response, retry with the same payload
   and idempotency key, coordinator BCC and persisted simulated acknowledgement.
5. One member completing a shared household, with one congratulations notification
   addressed to the nominated household contact rather than the completing member.
6. A historical kit recipient qualifying through an actual Auth sign-in, followed
   by a token refresh that creates no new review or duplicate notification.

The test deliberately removes private settings from the app child's inherited
environment and supplies them through that child's `.env.local`. This checks that
the worker and form-submission hooks use SvelteKit's private environment loader.

## Simulated email transport

No Resend credential is used. A Vite plugin inside the test harness injects a
loopback capture transport into the real dispatch handler. Production routes have
no environment switch or API argument for selecting this transport. The capture
server accepts only the dummy test credential and `@backpack-e2e.test` recipients.

The worker still performs its actual database claim, revalidation and finish RPCs.
Provider IDs begin with `LOCAL-SIMULATED-`; accepted timestamps exist only in the
disposable test database and represent simulated acknowledgements. They do not
prove any real email was sent or delivered. Real Resend credentials, domain
configuration, deliverability and bounce handling require separate staging checks.

Successful results and payload captures are written to the ignored file
`.supabase-local/e2e-artifacts/last-run.json`. Every capture is marked simulated.
The test stops its app/capture servers and removes its own Docker containers,
volumes and workdir on success or assertion failure. Downloaded shared Docker
images remain cached. The regular local development stack stays running.

If the process is forcibly interrupted, the CLI project name starts with
`soc-backpack-e2e-` and its workdir is under `.supabase-local/e2e-*`. Clean up only
that test workdir using `npx supabase stop --no-backup --workdir <test-workdir>`;
leave the normal `strengthen-community-test` stack alone.

## Server environment configuration

All survey/profile submission routes and `/api/backpack/dispatch` now use
`$env/dynamic/private`. The pure submission helper receives its environment
explicitly and stays disabled when none is supplied. Coordinator routes already
use the same loader. Server credentials stay out of browser configuration.

The usual local setup continues to leave `BACKPACK_ASSESSMENT_ENABLED` and
`BACKPACK_EMAIL_WORKER_ENABLED` false. Running this test does not enable them in
your normal dev app or configure a production scheduler.
