import { supabaseClient } from '$lib/dbClient';

export const POST = async ({ locals, request }) => {
	const body = await request.formData();
	supabaseClient.auth.setAuth(locals.accessToken);
	let password = body.get('password');
	const { error } = await supabaseClient.auth.update({
		password: password
	});
	if (error) {
		console.log('update password settings error:', error.message);
		return {
			status: 400,
			body: { errorMessage: error.message }
		};
	}
	return {
		status: 200,
		body: { successMessage: 'Your password has been changed.' }
	};
};
