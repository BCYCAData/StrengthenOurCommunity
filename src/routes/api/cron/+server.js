import { json } from '@sveltejs/kit';

import { createSupabaseClient } from '@supabase/auth-helpers-sveltekit';

const { supabaseClient } = createSupabaseClient(
    import.meta.env.VITE_SUPABASE_URL.toString(),
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY.toString()
);

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('auth failed');
        return new Response('Unauthorized', { status: 401 });
    }

    const { data, error } = await supabaseClient.rpc('health_check');

    if (error) {
        console.error('Health check failed:', error);
        return json({ success: false, error }, { status: 500 });
    }

    return json({ success: true, data });
};
