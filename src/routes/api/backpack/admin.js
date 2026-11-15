import { supabaseServerClient } from '@supabase/auth-helpers-sveltekit';
import { createCoordinatorHandler } from '$lib/server/backpack/coordinator';

export const POST = createCoordinatorHandler({
	env: process.env,
	getClient: (request) => supabaseServerClient(request)
});
