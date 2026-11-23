import { env } from '$env/dynamic/private';
import { supabaseServerClient } from '@supabase/auth-helpers-sveltekit';
import { createParticipantStatusHandlers } from '$lib/server/backpack/status';

export const { GET, POST } = createParticipantStatusHandlers({
	env,
	getClient: (request) => supabaseServerClient(request)
});
