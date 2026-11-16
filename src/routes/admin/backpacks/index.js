import { supabaseServerClient } from '@supabase/auth-helpers-sveltekit';
import { env } from '$env/dynamic/private';
import { createCoordinatorPageLoader } from '$lib/server/backpack/page';

export const GET = createCoordinatorPageLoader({
	env,
	getClient: (request) => supabaseServerClient(request)
});
