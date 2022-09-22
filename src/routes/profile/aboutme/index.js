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
				.select(
					'first_name,family_name,mobile,phone,mobile_reception,rfs_survival_plan,send_rfs_survival_plan,fire_fighting_experience,fire_trauma,plan_to_leave_before_fire,plan_to_leave_before_flood'
				)
				.eq('id', locals.user.id);
			if (error) {
				console.log('error profileAboutMe:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileAboutMe = profileData[0];

				return {
					status: 200,
					body: { profileAboutMe }
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
			user: locals.user
		},
		async () => {
			const body = await request.formData();
			const { data: profileData, error } = await supabaseServerClient(request)
				.from('profile')
				.update({
					first_name: body.get('first_name'),
					family_name: body.get('family_name'),
					phone: body.get('phone'),
					mobile: body.get('mobile'),
					mobile_reception: parseInt(body.get('mobile_reception')),
					rfs_survival_plan: body.get('rfs_survival_plan'),
					fire_fighting_experience: body.get('fire_fighting_experience'),
					fire_trauma: body.get('fire_trauma'),
					plan_to_leave_before_fire: body.get('plan_to_leave_before_fire'),
					plan_to_leave_before_flood: body.get('plan_to_leave_before_flood')
				})
				.eq('id', locals.user.id);
			if (error) {
				console.log('update error profileAboutMe:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileAboutMe = profileData[0];
				return {
					status: 200,
					body: { profileAboutMe }
				};
			}
			return {
				status: 400,
				body: {}
			};
		}
	);
