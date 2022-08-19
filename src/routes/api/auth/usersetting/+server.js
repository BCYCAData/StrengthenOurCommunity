import { json } from '@sveltejs/kit';
import { supabaseClient } from '$lib/dbClient';

export const POST = async ({ locals, request }) => {
	const body = await request.formData();
	supabaseClient.auth.setAuth(locals.accessToken);
	let password = body.get('password');
	let email = body.get('email');
	if (password) {
		const { error } = await supabaseClient.auth.update({
			password: password
		});
		if (error) {
			console.log('update password settings error:', error.message);
			return json({ errorMessage: error.message }, {
				status: 400
			});
		}
		return json({ successMessage: 'Your password has been changed.' }, {
			headers: { Location: '/profile/settings/password' }
		});
	} else if (email) {
		const { user, error } = await supabaseClient.auth.update({
			email: email
		});
		if (error) {
			console.log('update email settings error:', error);
			return json({ error }, {
				status: 400
			});
		}
	}

	return new Response(undefined, { status: 302, headers: { Location: '/profile/settings' } });
};
