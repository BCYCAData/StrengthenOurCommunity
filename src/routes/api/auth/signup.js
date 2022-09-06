import { supabaseClient, supabaseRedirectBase } from '$lib/dbClient';

export const POST = async ({ request }) => {
	const body = await request.formData();
	let password = body.get('password');
	let email = body.get('email');
	const { error } = await supabaseClient.auth.signUp(
		{
			email: email,
			password: password
		},
		{
			redirectTo: `${supabaseRedirectBase}/auth/redirect`
		}
	);
	if (error) {
		console.log('signup error:', error);
		return {
			status: 400,
			body: { error }
		};
	}
	return {
		headers: { Location: '/auth/redirect' },
		status: 302
	};
};
