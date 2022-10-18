import { supabaseClient } from '$lib/dbClient';

export const GET = async () => {
	const { data: dataStreets, error } = await supabaseClient.rpc('get_street_list');
	if (error) {
		console.log('error streetList:', error);
		return {
			status: 400,
			body: { error }
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
		body: {}
	};
};

export const POST = async ({ request }) => {
	const body = await request.formData();
	let street = body.get('property_address_street');
	const { data: streetData, error } = await supabaseClient.rpc('get_rfs_data_for_street', {
		street_input: street
	});
	if (error) {
		console.log('select by street error :', error);
		return {
			status: 400,
			body: { error }
		};
	}
	if (streetData.length >= 1) {
		return {
			status: 200,
			body: { reportStreet: street, streetData: streetData }
		};
	}
	return {
		status: 400,
		body: {}
	};
};
