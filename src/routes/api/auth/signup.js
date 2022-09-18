import { supabaseClient, supabaseRedirectBase } from '$lib/dbClient';

export const POST = async ({ request }) => {
	const body = await request.formData();
	let password = body.get('password');
	let email = body.get('email');
	let gurasid = body.get('gurasid');
	let principaladdresssiteoid = body.get('principaladdresssiteoid');
	const { error } = await supabaseClient.auth.signUp(
		{
			email: email,
			password: password
		},
		{
			data: {
				gurasid: parseInt(gurasid),
				principaladdresssiteoid: parseInt(principaladdresssiteoid)
			}
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
