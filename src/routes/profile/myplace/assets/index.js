import { assetAnswers } from '$lib/committeeAnswers';
import { env } from '$env/dynamic/private';
import { recordBackpackSubmission } from '$lib/server/backpack/submission';
import { optionalCount } from '$lib/surveyAnswerValues';
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
					'has_other_critical_assets,number_dogs,number_cats,number_birds,number_other_pets,live_stock_present,live_stock_safe_area,share_livestock_safe_area,other_essential_assets'
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
			let committeeAnswers;
			try {
				committeeAnswers = assetAnswers(body);
			} catch (error) {
				return { status: 400, body: { error: error.message } };
			}
			const { data: profileData, error } = await supabaseServerClient(request)
				.from('profile')
				.update({
					...committeeAnswers,
					number_dogs: optionalCount(body.get('number_dogs')),
					number_cats: optionalCount(body.get('number_cats')),
					number_birds: optionalCount(body.get('number_birds')),
					number_other_pets: optionalCount(body.get('number_other_pets')),
					live_stock_present: body.get('live_stock_present'),
					live_stock_safe_area: body.get('live_stock_safe_area'),
					share_livestock_safe_area: body.get('share_livestock_safe_area')
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
				await recordBackpackSubmission(supabaseServerClient(request), env);
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
