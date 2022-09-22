import { supabaseClient } from '$lib/dbClient';

export const POST = async ({ request }) => {
	const body = await request.formData();
	const { error } = await supabaseClient.auth.api.updateUser(body.get('token'), {
		password: body.get('password')
	});
	if (error) {
		console.log('reset user error:', error);
		return {
			status: 400,
			body: { error }
		};
	}
	return {
		headers: { Location: '/about' },
		status: 302
	};
};
