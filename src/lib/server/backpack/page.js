export function createCoordinatorPageLoader({ env, getClient }) {
	return async function GET({ locals, request }) {
		const headers = { 'Cache-Control': 'private, no-store' };
		if (!locals?.user?.id)
			return { status: 303, headers: { ...headers, Location: '/auth/signin' } };
		const unavailable = (accessState) => ({
			status: 200,
			headers,
			body: { accessState, initialSnapshot: null, workerEnabled: false }
		});
		if (env.BACKPACK_ADMIN_ENABLED !== 'true') return unavailable('disabled');
		try {
			const { data, error } = await getClient(request).rpc('backpack_admin', {
				p_action: 'snapshot',
				p_arguments: { limit: 25, offset: 0 }
			});
			if (error) return unavailable(error.code === '42501' ? 'forbidden' : 'unavailable');
			if (!data || !Array.isArray(data.members) || !data.readiness || !data.policy)
				return unavailable('unavailable');
			return {
				status: 200,
				headers,
				body: {
					accessState: 'ready',
					initialSnapshot: data,
					workerEnabled: env.BACKPACK_EMAIL_WORKER_ENABLED === 'true'
				}
			};
		} catch {
			return unavailable('unavailable');
		}
	};
}
