import { supabaseClient } from '$lib/dbClient';

export const POST = async ({ locals, request }) => {
	const body = await request.formData();
	let email = body.get('email');
	supabaseClient.auth.setAuth(locals.accessToken);
	let message = `Your email change request has been received. Check for the confirmation email at ${locals.user.email}. `;
	message += '\r\n';
	message += `You will then need to check for a second confirmation email at ${email}`;

	const { error } = await supabaseClient.auth.update({
		email: email
	});
	if (error) {
		console.log('update email settings error:', error);
		return {
			status: 400,
			body: { errorMessage: error.message }
		};
	}

	return {
		status: 200,
		body: { successMessage: message }
	};
};
