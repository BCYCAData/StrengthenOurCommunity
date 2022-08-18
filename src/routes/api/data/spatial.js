import { supabaseClient } from '$lib/dbClient';

export async function POST({ request }) {
	console.log('1');
	const { data, error } = await supabaseClient
		.from('address_point_extract')
		.select('gurasid,principaladdresssiteoid,addressstringoid,addresspointtype,geom');
	console.log('data', data);
	if (error) {
		console.log('error addressData:', error);
		return {
			status: 400,
			body: { error }
		};
	}
	if (data.length === 1) {
		let addressData = data[0];

		return {
			status: 200,
			body: { addressData }
		};
	}
	return {
		status: 400,
		body: {}
	};
}
