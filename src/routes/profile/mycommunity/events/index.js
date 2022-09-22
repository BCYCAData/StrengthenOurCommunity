import { supabaseServerClient, withApiAuth } from '@supabase/auth-helpers-sveltekit';

export const GET = async ({ locals, request }) =>
	withApiAuth(
		{
			redirectTo: '/auth/signin',
			user: locals.user
		},
		async () => {
			const { data: profileData, error } = await supabaseServerClient(request)
				.from('profile')
				.select('community_meeting_choices,other_community_meeting')
				.eq('id', locals.user.id);
			if (error) {
				console.log('error profileEvents:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileEvents = profileData[0];
				if (null == profileEvents.community_meeting_choices) {
					profileEvents.community_meeting_choices = [];
				}
				return {
					status: 200,
					body: { profileEvents }
				};
			}
			return {
				status: 400,
				body: {}
			};
		}
	);
export const POST = async ({ locals, request }) =>
	withApiAuth(
		{
			redirectTo: '/auth/signin',
			user: locals.user
		},
		async () => {
			const body = await request.formData();
			const { data: profileData, error } = await supabaseServerClient(request)
				.from('profile')
				.update({
					community_meeting_choices: body.getAll('community_meeting_choices'),
					other_community_meeting: body.get('other_community_meeting')
				})
				.eq('id', locals.user.id);
			if (error) {
				console.log('update error profileEvents:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileEvents = profileData[0];
				return {
					status: 200,
					body: { profileEvents }
				};
			}
			return {
				status: 400,
				body: {}
			};
		}
	);
