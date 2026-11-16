import { supabaseServerClient } from '@supabase/auth-helpers-sveltekit';
import { env } from '$env/dynamic/private';
import { createCoordinatorHandler } from '$lib/server/backpack/coordinator';

export const POST = createCoordinatorHandler({
	env,
	getClient: (request) => supabaseServerClient(request)
});
