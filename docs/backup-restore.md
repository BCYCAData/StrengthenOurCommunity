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
