// @ts-nocheck
import { supabaseClient } from '$lib/dbClient';

export const POST = async ({ locals, request }) => {
	const body = await request.formData();
	supabaseClient.auth.setAuth(locals.accessToken);
	const { data, error } = await supabaseClient.auth.signIn({
		email: body.get('email'),
		password: body.get('password')
	});
	if (error) {
		console.log('sign in error:', error);
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
