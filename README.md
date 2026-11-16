# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm init svelte

# create a new project in my-app
npm init svelte my-app
```

## Developing

For an isolated Supabase database with synthetic test accounts, see
[local Supabase testing](docs/local-supabase.md). Run `npm run supabase:start`
before starting the app to use that local instance.

Install dependencies with `npm install`, then copy `.env.example` to `.env.local`.
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the intended Supabase
project's URL and public anon key. Set `VITE_SUPABASE_REDIRECT_URL_BASE` to the
local app URL (normally `http://localhost:5173`); use the same URL in the Supabase
Auth redirect allowlist when testing sign-in or password reset links.

`.env.local` is Git-ignored. Keep service-role and Resend keys out of all `VITE_`
variables, which are public browser configuration. Leave the backpack switches
disabled until the programme is ready. A local frontend still uses the Supabase
project specified in this file. Restart the dev server after changing settings.

Start the development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
