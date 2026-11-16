# Local Supabase testing

With Docker running and dependencies installed, start the CLI-managed test stack:

```bash
npm run supabase:start
npm run dev
```

First startup downloads Docker images. The stack's project ID is
`strengthen-community-test`; its ports are separate from the other local projects.
Restart any running dev server after setup, and use app port 5173 because sign-in
callbacks use `http://localhost:5173`.

| Service              | Address                                                   |
| -------------------- | --------------------------------------------------------- |
| App                  | http://localhost:5173                                     |
| Backpack coordinator | http://localhost:5173/admin/backpacks                     |
| Supabase API         | http://127.0.0.1:54821                                    |
| Studio               | http://127.0.0.1:54823                                    |
| Database             | `postgresql://postgres:postgres@127.0.0.1:54822/postgres` |

## Accounts

Auth emails are captured by the local Mailpit container. The configured inbox web
port is `54824`, but Docker on this host currently does not publish that port even
though the binding appears in the container configuration. Its web UI is therefore
not yet usable here. This does not affect confirmed test-account sign-in or the
backpack coordinator workflows. The inbox service itself is healthy; no external
SMTP or Resend credentials are configured.

The seeded password for all four accounts is `LocalBackpack2026!`:

- `coordinator@example.test`: confirmed and included in the coordinator allowlist.
- `alice@example.test` and `bob@example.test`: separate pending candidates sharing
  a synthetic property ID, ready for household review.
- `charlie@example.test`: another pending household candidate.

Accounts are created through the local Auth admin API. The profile-creation trigger
also supports new local registrations. Ordinary participants can read and update
their own profiles; they cannot use coordinator operations.

Startup leaves existing account passwords, profile edits and review decisions
alone. When it creates sample accounts, it runs a silent preparation baseline to
create candidates. Existing accounts do not trigger another baseline on restart.
The real programme cutoff and question exclusions remain unconfigured; no sample
rules are presented as approved. Household review and historical award recording
are available, while final qualification/readiness needs a configured local policy.

## Files and configuration

The checked-in configuration is `supabase/local/config.toml`. The start script
stages it in the ignored `.supabase-local` workdir, alongside a local-only profile
bootstrap and copies of the six backpack migrations. It uses explicit local CLI
commands and does not link to or modify a hosted project.

`supabase/local/profile-bootstrap.sql` supplies the existing profile columns with
owner-only row security and a minimal empty legacy-survey import table/RPC. It is
kept outside production migrations because hosted databases already have those
objects. No production user data, tokens or answers are imported. This setup
supports Auth, profile/survey editing and backpack operations; spatial datasets,
address lookup services, legacy reports and old survey imports are not included.

On successful startup `.env.local` points at the local API with its public anon
key. Coordinator tools are enabled. Assessment submission hooks and the email
worker remain disabled; service-role, worker and Resend secrets are blank in the
app configuration. The local service key is used internally for account creation
and is never added to browser configuration. Auth emails go to the local inbox.
Database triggers still record local sign-in/profile assessments; policy and
worker gates prevent external backpack emails.

The first earlier hosted `.env.local` is preserved as `.env.hosted.local`, which
is also ignored and is not automatically loaded by Vite. Restore that file to
`.env.local` and restart Vite when intentionally returning to the hosted project.
The Supabase MCP connection still targets the hosted project; use local Studio
for the test instance.

## Management

For a repeatable save → qualification → queue → simulated email test that leaves
this database untouched, see [local backpack end-to-end testing](local-backpack-e2e.md).

```bash
npm run supabase:status
npm run supabase:seed
npm run supabase:stop
```

Stop retains the database volume. Start reuses it and applies any newly staged
migrations. Seed adds missing sample accounts without replacing existing data.

To deliberately discard local test data and rebuild it, target only this workdir:

```bash
npx supabase db reset --local --workdir .supabase-local
npm run supabase:seed
```

The setup follows the official [Supabase CLI local development workflow](https://supabase.com/docs/guides/local-development/cli/getting-started).
