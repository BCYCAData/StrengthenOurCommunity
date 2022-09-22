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
					'property_address_street,property_address_suburb,property_address_postcode,residency_profile,property_rented,agent_name,agent_mobile,agent_phone,sign_posted,truck_access,truck_access_other_information,residents0_18,residents19_50,residents51_70,residents71_,vulnerable_residents'
				)
				.eq('id', locals.user.id);
			if (error) {
				console.log('error profileMyPlace:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileMyPlace = profileData[0];
				return {
					status: 200,
					body: { profileMyPlace }
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
					property_address_street: body.get('property_address_street'),
					property_address_suburb: body.get('property_address_suburb'),
					property_address_postcode: body.get('property_address_postcode'),
					residency_profile: body.get('residency_profile'),
					property_rented: body.get('property_rented'),
					agent_name: body.get('agent_name'),
					agent_mobile: body.get('agent_mobile'),
					agent_phone: body.get('agent_phone'),
					sign_posted: body.get('sign_posted'),
					truck_access: parseInt(body.get('truck_access')),
					truck_access_other_information: body.get('truck_access_other_information'),
					residents0_18: parseInt(body.get('residents0_18') || 0),
					residents19_50: parseInt(body.get('residents19_50') || 0),
					residents51_70: parseInt(body.get('residents51_70') || 0),
					residents71_: parseInt(body.get('residents71_') || 0),
					vulnerable_residents: body.get('vulnerable_residents')
				})
				.eq('id', locals.user.id);
			if (error) {
				console.log('update error profileMyPlace:', error);
				return {
					status: 400,
					body: { error }
				};
			}
			if (profileData.length === 1) {
				let profileMyPlace = profileData[0];
				return {
					status: 200,
					body: { profileMyPlace }
				};
			}
			return {
				status: 400,
				body: {}
			};
		}
	);
