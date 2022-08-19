import { json } from '@sveltejs/kit';
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
		return json({ error }, {
			status: 400
		});
	}
	return new Response(undefined, { status: 302, headers: { Location: '/profile' } });
};
