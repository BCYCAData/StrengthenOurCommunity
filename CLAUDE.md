# StrengthenOurCommunity

SvelteKit app deployed on Vercel, backed by a free-plan Supabase project (`ap-southeast-2`).

## MCP servers

This repo is pinned to its own backends via **local-scoped** MCP servers — stored in `~/.claude.json` under this project's path, not in the repo (the values are account-specific and not needed for deployment; `.mcp.json` is gitignored to keep it that way). Use **only** these servers here:

- **`supabase`** — this project's Supabase (`project_ref=oiwbamoupmoudqwautha`). The `project_ref` pin disables account-level tools and confines all queries/migrations to this one project.
- **`vercel`** — this project's Vercel team/project (`bcycadatas-projects/strengthenourcommunity`).

Do **not** use the global `plugin:supabase:supabase` or `plugin:vercel:vercel` servers in this repo — they are account-wide and may target the wrong Supabase project or Vercel account. Other repos on this machine use different Supabase/Vercel backends. [.claude/settings.json](.claude/settings.json) denies their tools here as a backstop.

### One-time setup (per machine)

Run from this project's root; then authorize each server once via `/mcp`, signing in with the account that owns this project's backend:

```bash
claude mcp add --transport http --scope local supabase "https://mcp.supabase.com/mcp?project_ref=oiwbamoupmoudqwautha"
claude mcp add --transport http --scope local vercel "https://mcp.vercel.com/bcycadatas-projects/strengthenourcommunity"
```

The same pattern works for any other repo on this machine — run it from that repo's root with its own `project_ref` and Vercel team/project. Local scope is keyed by project directory, so every repo can use the plain names `supabase` and `vercel` without colliding.

### Gotcha: `supabase` OAuth fails in the VSCode extension

The VSCode extension double-encodes the `?` in the `supabase` server URL when building the OAuth `resource` parameter (`...mcp%253Fproject_ref=...` instead of `%3F`), so Supabase rejects it with `{"message":"resource: Resource must be a valid MCP endpoint"}`. This only affects servers whose URL has a query string, which is why `vercel` authorizes fine. Known bug: [anthropics/claude-code#34880](https://github.com/anthropics/claude-code/issues/34880).

Workaround — **authenticate from the terminal `claude` CLI instead of the extension panel**: run `claude` in a terminal, then `/mcp` → select `supabase` → Authenticate. The CLI encodes the flow correctly; the token is cached in `~/.claude/` and the VSCode extension then reads it. (Alternatively, when the browser opens, hand-edit `%253F` → `%3F` before authorizing.) Redo once per token expiry.
