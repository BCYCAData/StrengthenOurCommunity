import { createSupabaseClient } from '@supabase/auth-helpers-sveltekit';

export const supabaseRedirectBase = import.meta.env.VITE_SUPABASE_REDIRECT_URL_BASE.toString();

const { supabaseClient } = createSupabaseClient(
	import.meta.env.VITE_SUPABASE_URL.toString(),
	import.meta.env.VITE_SUPABASE_ANON_KEY.toString()
);

export { supabaseClient };
