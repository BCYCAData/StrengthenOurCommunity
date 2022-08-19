import { supabaseClient, supabaseRedirectBase } from '$lib/dbClient';

export async function GET({ locals }) {
	if (locals.user) {
		return {
			status: 303,
			headers: {
				location: '/profile'
			}
		};
	}
	return {
		status: 200
	};
}

export async function POST({ request }) {
	const data = await request.formData();

	const email = data.get('email');
	const password = data.get('password');

	const headers = { location: '/profile' };

	const { session, error } = await supabaseClient.auth.signIn({ email, password });

	if (error) {
		return {
			status: 400,
			body: {
				errorMessage: error.message
			}
		};
	}

	if (session) {
		const response = await fetch(`${supabaseRedirectBase}/api/auth/callback`, {
			method: 'POST',
			headers: new Headers({ 'Content-Type': 'application/json' }),
			credentials: 'same-origin',
			body: JSON.stringify({ event: 'SIGNED_IN', session })
		});

		// TODO: Add helper inside of auth-helpers-sveltekit library to manage this better
		const cookies = response.headers
			.get('set-cookie')
			.split('SameSite=Lax, ')
			.map((cookie) => {
				if (!cookie.includes('SameSite=Lax')) {
					cookie += 'SameSite=Lax';
				}
				return cookie;
			});
		headers['Set-Cookie'] = cookies;
	}
	return {
		status: 303,
		headers
	};
}
