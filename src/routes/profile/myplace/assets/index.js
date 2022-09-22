import { supabaseServerClient, withApiAuth } from '@supabase/auth-helpers-sveltekit';

export const GET = async ({ locals, request }) =>
	withApiAuth(
		{
			user: locals.user
		},
		async () => {
			const { data: profileData, error } = await supabaseServerClient(request)
				.from('profile')
				.select(
					'number_dogs,number_cats,number_birds,number_other_pets,live_stock_present,live_stock_safe_area,share_livestock_safe_area,other_essential_assets'
				)
				.eq('id', locals.user.id);
			if (error) {
				console.log('error profileAssets:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileAssets = profileData[0];
				return {
					status: 200,
					body: { profileAssets }
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
					number_dogs: parseInt(body.get('number_dogs')) || 0,
					number_cats: parseInt(body.get('number_cats')) || 0,
					number_birds: parseInt(body.get('number_birds')) || 0,
					number_other_pets: parseInt(body.get('number_other_pets')) || 0,
					live_stock_present: body.get('live_stock_present'),
					live_stock_safe_area: body.get('live_stock_safe_area'),
					share_livestock_safe_area: body.get('share_livestock_safe_area'),
					other_essential_assets: body.get('other_essential_assets')
				})
				.eq('id', locals.user.id);
			if (error) {
				console.log('update error profileAssets:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileAssets = profileData[0];
				return {
					status: 200,
					body: { profileAssets }
				};
			}
			return {
				status: 400,
				body: {}
			};
		}
	);
