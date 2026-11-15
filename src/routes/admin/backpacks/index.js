import { supabaseServerClient } from '@supabase/auth-helpers-sveltekit';
import { createCoordinatorPageLoader } from '$lib/server/backpack/page';

export const GET = createCoordinatorPageLoader({
	env: process.env,
	getClient: (request) => supabaseServerClient(request)
});
