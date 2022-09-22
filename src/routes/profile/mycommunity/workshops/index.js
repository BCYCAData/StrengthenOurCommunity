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
				.select('community_workshop_choices,other_community_workshop,will_run_community_workshops')
				.eq('id', locals.user.id);
			if (error) {
				console.log('error profileWorkshops:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileWorkshops = profileData[0];
				if (null == profileWorkshops.community_workshop_choices) {
					profileWorkshops.community_workshop_choices = [];
				}
				return {
					status: 200,
					body: { profileWorkshops }
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
					community_workshop_choices: body.getAll('community_workshop_choices'),
					other_community_workshop: body.get('other_community_workshop'),
					will_run_community_workshops: body.get('will_run_community_workshops')
				})
				.eq('id', locals.user.id);
			if (error) {
				console.log('update error profileWorkshops:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileWorkshops = profileData[0];
				return {
					status: 200,
					body: { profileWorkshops }
				};
			}
			return {
				status: 400,
				body: {}
			};
		}
	);
