// @ts-nocheck
import { supabaseClient } from '$lib/dbClient';

export const POST = async ({ locals, request }) => {
	const body = await request.formData();
	supabaseClient.auth.setAuth(locals.accessToken);
	const { error } = await supabaseClient.auth.update({
		password: body.get('password')
	});
	if (error) {
		console.log('update user error:', error);
		return {
			status: 400,
			body: { error }
		};
	}
	return {
		headers: { Location: '/profile' },
		status: 302
	};
};
