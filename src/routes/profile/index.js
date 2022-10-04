import { supabaseServerClient, withApiAuth } from '@supabase/auth-helpers-sveltekit';
import { resetProfile } from '$lib/utils';

export const GET = async ({ locals, request }) =>
	withApiAuth(
		{
			redirectTo: '/auth/signin',
			user: locals.user
		},
		async () => {
			const { data: survey, error: errorSurvey } = await supabaseServerClient(request)
				.from('survey_responses')
				.select('*')
				.eq('email_address', locals.user.email)
				.is('invited', null);
			if (errorSurvey) {
				console.log('error Get Survey:', errorSurvey.message);
				let message = errorSurvey.message;
				return {
					status: 400,
					body: { message }
				};
			}
			if (survey[0]) {
				await resetProfile(survey[0], locals, request);
			}
			const { data: profileComments, error: errorComments } = await supabaseServerClient(request)
				.from('profile')
				.select('other_comments')
				.eq('id', locals.user.id);
			if (errorComments) {
				console.log('error Get Other Comments:', errorComments);
				return {
					status: 400,
					body: { errorComments }
				};
			}
			console.log(locals.user.user_metadata.gurasid);
			return {
				body: { profileComments }
			};
		}
	);
