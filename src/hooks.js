// The legacy Auth helper caches its public project settings. Initialise them for
// cold API requests too, before session handling (without relying on layout SSR).
import '$lib/dbClient';
import { handleAuth } from '@supabase/auth-helpers-sveltekit';
import { sequence } from '@sveltejs/kit/hooks';

export const handle = sequence(
	...handleAuth({
		logout: { returnTo: '/auth/signin' }
	})
);

export const getSession = async (event) => {
	const { user, accessToken, error } = event.locals;
	return {
		user,
		accessToken,
		error
	};
};
