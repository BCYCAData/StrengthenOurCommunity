import { json } from '@sveltejs/kit';
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
		return json({ error }, {
			status: 400
		});
	}
	return new Response(undefined, { status: 302, headers: { Location: '/profile' } });
};
