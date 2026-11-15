import { timingSafeEqual } from 'node:crypto';
import { dispatchBackpackEmail } from './dispatch.js';

export function createDispatchHandler({ env, createClient }) {
	return async function POST({ request }) {
		const secret = env.BACKPACK_WORKER_SECRET;
		const received = request.headers.get('authorization') || '';
		const expected = `Bearer ${secret}`;
		if (
			!secret ||
			Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
			!timingSafeEqual(Buffer.from(received), Buffer.from(expected))
		) {
			return { status: 401, body: { error: 'Unauthorized' } };
		}
		if (env.BACKPACK_EMAIL_WORKER_ENABLED !== 'true') {
			return { status: 200, body: { status: 'disabled' } };
		}
		const url = env.SUPABASE_URL;
		const key = env.SUPABASE_SERVICE_ROLE_KEY;
		const resendKey = env.RESEND_API_KEY;
		if (!url || !key || !resendKey)
			return { status: 503, body: { error: 'Email worker is not configured' } };
		try {
			const client = createClient(url, key, {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false
			});
			const result = await dispatchBackpackEmail(client, resendKey);
			return { status: 200, body: result };
		} catch {
			// Avoid logging credentials, addresses, provider response bodies or survey answers.
			return { status: 503, body: { error: 'Email worker temporarily unavailable' } };
		}
	};
}
