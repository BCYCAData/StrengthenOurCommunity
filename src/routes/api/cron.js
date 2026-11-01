import { supabaseClient } from '$lib/dbClient';

// Dead-man's switch. This cron's real job is to keep the free-tier Supabase project from
// pausing after 7 days of DB inactivity. Pinging healthchecks.io on every successful run
// means that if the cron ever stops doing that — deployment removed, CRON_SECRET drift,
// Vercel issue, or the DB call failing — healthchecks.io alerts us with days of margin
// before the pause window is reached. No-op if HEALTHCHECK_KEEPALIVE_URL isn't set.
async function pingHealthcheck(path = '') {
	const url = process.env.HEALTHCHECK_KEEPALIVE_URL;
	if (!url) return;
	try {
		await fetch(url + path, { signal: AbortSignal.timeout(10000) });
	} catch (err) {
		console.error('healthcheck ping failed:', err);
	}
}

// health_check is granted to anon, so the shared anon client is enough here.
export async function GET({ request }) {
	const authHeader = request.headers.get('authorization');
	if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		console.log('auth failed');
		return {
			status: 401,
			body: 'Unauthorized'
		};
	}

	const { data, error } = await supabaseClient.rpc('health_check');

	if (error) {
		console.error('Health check failed:', error);
		await pingHealthcheck('/fail');
		return {
			status: 500,
			body: { success: false, error }
		};
	}

	await pingHealthcheck();
	return {
		status: 200,
		body: { success: true, data }
	};
}
