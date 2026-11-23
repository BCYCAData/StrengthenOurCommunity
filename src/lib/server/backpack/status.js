import { readLimitedJSON } from './coordinator.js';

export function createParticipantStatusHandlers({ env, getClient }) {
	const headers = { 'Cache-Control': 'private, no-store' };
	return {
		async GET({ locals, request }) {
			if (!locals?.user?.id) return { status: 401, headers, body: { error: 'Sign in required' } };
			if (env.BACKPACK_PARTICIPANT_STATUS_ENABLED !== 'true')
				return { status: 200, headers, body: { state: 'unconfigured', qualified: false } };
			try {
				const { data, error } = await getClient(request).rpc('backpack_my_status');
				if (error || !data) throw new Error('Unavailable');
				return { status: 200, headers, body: data };
			} catch {
				return {
					status: 503,
					headers,
					body: { error: 'Backpack status is temporarily unavailable' }
				};
			}
		},
		async POST({ locals, request, url }) {
			if (!locals?.user?.id) return { status: 401, headers, body: { error: 'Sign in required' } };
			if (env.BACKPACK_PARTICIPANT_STATUS_ENABLED !== 'true')
				return { status: 503, headers, body: { error: 'Programme status is not enabled' } };
			if (request.headers.get('origin') !== (url?.origin || new URL(request.url).origin))
				return { status: 403, headers, body: { error: 'Same-origin request required' } };
			try {
				if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
					throw new Error('JSON required');
				const body = await readLimitedJSON(request);
				if (!body || body.dismiss !== true || Object.keys(body).length !== 1)
					throw new Error('Invalid action');
			} catch {
				return { status: 400, headers, body: { error: 'Invalid notice dismissal' } };
			}
			try {
				const { data, error } = await getClient(request).rpc('backpack_dismiss_notice');
				if (error || data !== true)
					return { status: 409, headers, body: { error: 'Refresh your programme status' } };
				return { status: 200, headers, body: { dismissed: true } };
			} catch {
				return { status: 503, headers, body: { error: 'Please try again later' } };
			}
		}
	};
}
