import { withApiAuth } from '@supabase/auth-helpers-sveltekit';
import { supabaseClient } from '$lib/dbClient';

export const GET = async ({ locals, request }) =>
	withApiAuth(
		{
			redirectTo: '/auth/signin',
			user: locals.user
		},
		async () => {
			const { data: dataStreets, error: errorStreets } = await supabaseClient.rpc(
				'get_street_list'
			);
			console.log('get_street_list');
			if (errorStreets) {
				const message = errorStreets.message;
				console.log('error dataStreets:', errorStreets);
				return {
					status: 400,
					body: { message }
				};
			}
			if (dataStreets.length > 0) {
				let streetList = dataStreets.map(({ streets }) => streets);
				return {
					status: 200,
					body: { streetList }
				};
			}
			return {
				status: 400,
				body: { message: 'Something went wrong retrieving the Street List data' }
			};
		}
	);

export const POST = async ({ locals }) =>
	withApiAuth(
		{
			user: locals.user
		},
		async () => {
			const { data: dataStreets, error: errorStreets } = await supabaseClient.rpc(
				'get_rfs_data_for_street',
				{
					street_input: street
				}
			);
			if (errorStreets) {
				const message = errorStreets.message;
				console.log('get error dataStreets:', errorStreets);
				return {
					status: 400,
					body: { message }
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
