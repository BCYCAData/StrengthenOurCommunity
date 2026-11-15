# Supabase backup & restore

This app's backend is a **free-plan Supabase project** (`ap-southeast-2` / Sydney). The free plan
has **no automated backups and no point-in-time recovery**, so we run our own weekly logical backup.

- **What runs it:** [`.github/workflows/supabase-backup.yml`](../.github/workflows/supabase-backup.yml)
  — a GitHub Actions cron, Sundays 03:00 UTC (plus a manual `workflow_dispatch` trigger).
- **What it captures:** a full logical dump — `roles.sql`, `schema.sql`, `data.sql` (public data),
  `auth.sql` (auth schema incl. `auth.users`), and a `manifest.txt`, all gzipped into
  `supabase-backup-<date>.tar.gz` with a matching `.sha256`.
- **Where it lands:** an off-site S3-compatible bucket at `s3://<bucket>/strengthen/<date>/`.
- **Retention:** the **last 4 weeks**, enforced by a bucket lifecycle rule (expire after 31 days).
- **Scope note:** database only. There is no Storage-object download step — add one later if the
  app starts storing files in Supabase Storage.

---

## One-time setup

You must do these once; they can't be automated from the repo.

### 1. Get the Session-pooler connection string

Supabase Dashboard → this project → **Project Settings → Database → Connection string → Session pooler**.

It looks like:

```
postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
```

> ⚠️ It **must** be the **Session pooler (port 5432)**. The **Transaction pooler (port 6543)** cannot
> be dumped by `pg_dump` / `supabase db dump`. The free-plan direct connection
> (`db.<ref>.supabase.co:5432`) is IPv6-only, which GitHub runners can't reach — so the IPv4 Session
> pooler is the right choice here.

### 2. Create the off-site bucket

Use **Cloudflare R2** (recommended — no egress fees) or **Backblaze B2**; both are free to ~10 GB and
speak the S3 API. Create a bucket and an access key/secret scoped to it. Note the **S3 endpoint URL**,
**bucket name**, and **region** (R2 uses `auto`).

### 3. Add a lifecycle rule

On the bucket, add a rule to **expire objects after 31 days**. This is what enforces the "last 4
weeks" retention.

### 4. Add the GitHub repo secrets

This repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
| --- | --- |
| `SUPABASE_DB_URL` | The Session-pooler connection string from step 1 (includes the DB password) |
| `BACKUP_S3_ENDPOINT` | S3 endpoint URL of the bucket (e.g. `https://<account>.r2.cloudflarestorage.com`) |
| `BACKUP_S3_BUCKET` | Bucket name |
| `BACKUP_S3_REGION` | Bucket region (`auto` for R2) |
| `BACKUP_S3_ACCESS_KEY_ID` | Bucket access key ID |
| `BACKUP_S3_SECRET_ACCESS_KEY` | Bucket secret access key |

---

## Test it now (don't wait for Sunday)

1. GitHub → **Actions → Supabase Weekly Backup → Run workflow** (`workflow_dispatch`).
2. Confirm the run is green and that
   `strengthen/<date>/supabase-backup-<date>.tar.gz` (+ `.sha256`) appears in the bucket.

---

## Restore

Restores go into a **fresh** Supabase project (or a local `supabase start` instance) — never replay
over a live database without understanding what you're overwriting.

```bash
# 1. Download the latest backup from the bucket and verify integrity.
aws s3 cp "s3://<bucket>/strengthen/<date>/supabase-backup-<date>.tar.gz" . --endpoint-url "<endpoint>"
aws s3 cp "s3://<bucket>/strengthen/<date>/supabase-backup-<date>.tar.gz.sha256" . --endpoint-url "<endpoint>"
sha256sum -c "supabase-backup-<date>.tar.gz.sha256"

# 2. Unpack.
mkdir restore && tar xzf "supabase-backup-<date>.tar.gz" -C restore && cd restore

# 3. Restore schema then data into the target DB.
#    TARGET_DB_URL = Session-pooler (5432) string of the *target* project.
psql "$TARGET_DB_URL" -f schema.sql
psql "$TARGET_DB_URL" -f data.sql

# 4. (Optional) Restore auth data — review first; see caveat below.
psql "$TARGET_DB_URL" -f auth.sql
```

**Caveats**

- `roles.sql` is generally **not** restored on Supabase — roles are managed by the platform. Keep it
  for reference; only apply it if you understand the target's role setup.
- Restoring `auth.users` (and its password hashes) into a different project is **best-effort**: GoTrue
  config, encryption keys, and the project's `auth` schema version can differ between projects. Verify
  logins work after restore; expect to re-trigger password resets if hashes don't carry over cleanly.
- **Restore `auth.sql` into a _fresh_ project, before anyone signs in.** The Auth (GoTrue) service
  seeds a few rows of its own on first run (a session, `schema_migrations`, one-time tokens, etc.). If
  you load `auth.sql` into a project whose Auth service has already been used, those rows collide and
  you'll see harmless `duplicate key value violates unique constraint` errors on `auth.*` tables
  (`users_pkey`, `sessions_pkey`, `refresh_tokens_pkey`, …). They're collisions with pre-existing
  transient rows, **not** data loss — but to avoid the noise, restore auth first, into a brand-new
  target, before the app or dashboard triggers any login.
- Always restore into a throwaway/staging project first and confirm the app works before pointing
  production at it.

## Verifying a backup is actually restorable

A backup you've never restored is a guess. Periodically (at least after any schema change), prove it by
loading a real downloaded tarball into a throwaway **local** Supabase stack. This was last validated
**2026-06-10** with the steps below.

```bash
# Unpack a downloaded backup.
mkdir restore && tar xzf supabase-backup-<date>.tar.gz -C restore

# Start an isolated local stack. If you already run another local Supabase project, avoid port
# clashes by giving this one its own ports (edit supabase/config.toml, e.g. shift 543xx -> 548xx).
supabase init && supabase start            # first run pulls images (a few minutes)

# Load via the db container's own psql (works even if psql isn't installed on the host).
DB=$(docker ps --format '{{.Names}}' | grep supabase_db_ | head -1)
docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=0 < restore/schema.sql
docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=0 < restore/data.sql
docker exec -i "$DB" psql -U postgres -d postgres -v ON_ERROR_STOP=0 < restore/auth.sql

# Sanity-check the row counts.
docker exec "$DB" psql -U postgres -d postgres -c "ANALYZE;"
docker exec "$DB" psql -U postgres -d postgres -c \
  "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables
   WHERE schemaname IN ('public','auth','storage') AND n_live_tup > 0 ORDER BY 1,3 DESC;"

supabase stop --no-backup                  # tear down; then delete the unpacked dump (it holds PII)
```

**Expected, harmless output** (not failures):

- `schema.sql` → 0 errors.
- `data.sql` → 2× `permission denied for table buckets_vectors` / `vector_indexes` — empty internal
  `storage` tables the local `postgres` role doesn't own. No app data is affected.
- `auth.sql` → a few `duplicate key` errors on `auth.*` if the local Auth service already initialized
  (see the auth caveat above). Real users still load.

A green result is: `schema` clean, all `data` `COPY`s applied, and your `public`/`auth` row counts look
right.

---

## Keeping the project awake (avoiding free-tier pause)

Free-plan Supabase **pauses a project after 7 days of database inactivity**
([pricing](https://supabase.com/pricing)). The data survives a pause, but compute is shut
down and — critically — **on the free plan a paused project does _not_ auto-resume when a
request arrives**; it must be restored manually from the dashboard (or via the Management
API). Understand that asymmetry: a keep-alive only helps _while the project is still active_.
Once it lapses long enough to let the project pause, further pings hit a dead project and do
nothing — it stays paused until a human restores it. That is the failure behind "it's often
paused."

### What keeps it awake

A **Vercel cron job** — deliberately _not_ a GitHub Action (GitHub auto-disables scheduled
workflows after 60 days of no commits). It's already wired up:

- [`vercel.json`](../vercel.json) runs `/api/cron` daily (`0 0 * * *`). Daily gives a 7× margin
  on the 7-day window and stays within the Hobby plan's once-per-day cron limit.
- [`src/routes/api/cron/+server.js`](../src/routes/api/cron/+server.js) checks the
  `Bearer ${CRON_SECRET}` header, then makes a DB call (`health_check` RPC). **That DB call is
  the activity** that resets the pause timer — nothing else in this flow does.

### Monitoring (added — so a silent failure doesn't cost you the database)

The endpoint now pings **healthchecks.io** on every successful run, and `…/fail` on a DB
error. Create a check (**period 1 day, grace 1–2 days**) and add its ping URL as the Vercel
env var `HEALTHCHECK_KEEPALIVE_URL` (Production). If the cron stops firing for any reason the
check turns red and you're alerted days before the 7-day pause — instead of discovering a dead
database a week later.

### If it's still pausing — checklist

Run these against the **real** project (`ap-southeast-2`), via the dashboard or a Supabase
MCP/CLI pointed at it — note the MCP must target this app's project, **not** the unrelated
`ap-northeast-1` "Big Map Project". Most likely cause first:

1. **`CRON_SECRET` set in Vercel (Production)?** If unset, the header check fails on every
   invocation → `401` → the RPC never runs → **zero DB activity**. This is the most common
   reason a keep-alive "exists but does nothing".
2. **Is the cron actually firing?** Vercel → Project → Cron Jobs, plus function logs for
   `/api/cron`. You want a daily `200`, not `401`/`500`/silence.
3. **Does the `health_check` RPC exist?** If missing, the call `500`s. (A failed call still
   touches the DB, but don't depend on that — see next.)
4. **Prefer a guaranteed write over a read.** A read-only RPC _should_ count as activity, but
   the unambiguous signal is a small write. One-time migration:

   ```sql
   create table if not exists public.keepalive (
     id int primary key default 1,
     last_run timestamptz not null default now(),
     constraint keepalive_singleton check (id = 1)
   );
   insert into public.keepalive (id) values (1) on conflict (id) do nothing;
   ```

   then swap the RPC in the endpoint for:

   ```js
   const { error } = await supabaseClient
       .from('keepalive')
       .update({ last_run: new Date().toISOString() })
       .eq('id', 1);
   ```

### Make it self-healing (the only way to truly "never paused")

A keep-alive cannot recover a project that has _already_ paused. To close that gap, also
**restore the project when it's found paused**, via the Supabase Management API:

- `GET  https://api.supabase.com/v1/projects/{ref}` → read `status` (`ACTIVE_HEALTHY` vs paused).
- `POST https://api.supabase.com/v1/projects/{ref}/restore` → resume it.

These calls don't touch the database, so they work even while it's paused. Put this either in
`/api/cron` (add `SUPABASE_ACCESS_TOKEN` + project `ref` as Vercel env vars) or — since it's
independent of the app runtime — in a small dedicated GitHub Action. With auto-restore in
place, a lapsed keep-alive becomes self-correcting instead of a manual rescue.
