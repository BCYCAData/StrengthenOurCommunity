import { supabaseClient } from '$lib/dbClient';

// export const POST = async ({ request }) => {
export const POST = async ({ locals, request }) => {
	const body = await request.formData();
	const { error } = await supabaseClient.auth.api.updateUser(body.get('token'), {
		password: body.get('password')
	});
	if (error) {
		console.log('update user error:', error);
		return {
			status: 400,
			body: { error }
		};
	}
	if (body.get('mode') === 'invite') {
		const { data: addressData, error: addressError } = await supabaseClient.rpc(
			'get_address_from_survey_email',
			{
				email_input: locals.user.email
			}
		);
		if (addressError) {
			console.log('addressError', addressError);
			return {
				status: 400,
				body: { message: 'Could not get metadata' }
			};
		} else {
			let resultData = addressData[0];
			const { error: updateMetadataError } = await supabaseClient.auth.api.updateUser(
				body.get('token'),
				{
					data: {
						gurasid: resultData.gurasid,
						principaladdresssiteoid: resultData.principaladdresssiteoid
					}
				}
			);
			if (updateMetadataError) {
				console.log('updateMetadataError', updateMetadataError);
				return {
					status: 400,
					body: { message: 'Could not update metadata' }
				};
			}
		}
	}
	return {
		headers: { Location: '/profile' },
		status: 302
	};
};
