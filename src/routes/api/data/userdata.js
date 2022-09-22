import { supabaseClient } from '$lib/dbClient';

export async function POST({ request }) {
	const data = await request.json();
	const { user } = await supabaseClient.auth.api.getUser(data.token);
	const { data: survey } = await supabaseClient.rpc('user_has_survey_results', {
		email_input: user.email
	});
	return {
		status: 200,
		body: {
			redirect: survey
		},
		headers: {
			'Content-Type': 'application/json'
		}
	};
}
