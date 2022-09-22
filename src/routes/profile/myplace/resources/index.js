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
					'static_water_available,have_stortz,stortz_size,fire_fighting_resources,fire_hazard_reduction'
				)
				.eq('id', locals.user.id);

			if (error) {
				console.log('error profileResources:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileResources = profileData[0];
				if (null == profileResources.static_water_available) {
					profileResources.static_water_available = [];
				}
				if (null == profileResources.fire_fighting_resources) {
					profileResources.fire_fighting_resources = [];
				}
				if (null == profileResources.fire_hazard_reduction) {
					profileResources.fire_hazard_reduction = [];
				}
				return {
					status: 200,
					body: { profileResources }
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
					static_water_available: body.getAll('static_water_available'),
					have_stortz: body.get('have_stortz'),
					stortz_size: parseInt(body.get('stortz_size')) || 0,
					fire_fighting_resources: body.getAll('fire_fighting_resources'),
					fire_hazard_reduction: body.getAll('fire_hazard_reduction')
				})
				.eq('id', locals.user.id);
			if (error) {
				console.log('update error profileResources:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileResources = profileData[0];
				return {
					status: 200,
					body: { profileResources }
				};
			}
			return {
				status: 400,
				body: {}
			};
		}
	);
