import { createSupabaseClient } from '@supabase/auth-helpers-sveltekit';

const settings = {
	VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
	VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
	VITE_SUPABASE_REDIRECT_URL_BASE: import.meta.env.VITE_SUPABASE_REDIRECT_URL_BASE
};
const missingSettings = Object.keys(settings).filter((name) => !settings[name]?.trim());
if (missingSettings.length) {
	throw new Error(
		`Missing Supabase configuration: ${missingSettings.join(
			', '
		)}. Copy .env.example to .env.local, fill in the project settings, and restart the dev server.`
	);
}

export const supabaseRedirectBase = import.meta.env.VITE_SUPABASE_REDIRECT_URL_BASE;

const { supabaseClient } = createSupabaseClient(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_ANON_KEY
);

export { supabaseClient };
