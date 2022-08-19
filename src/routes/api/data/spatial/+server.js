import { json } from '@sveltejs/kit';
import { supabaseClient } from '$lib/dbClient';

export async function POST({ request }) {
	console.log('1');
	const { data, error } = await supabaseClient
		.from('address_point_extract')
		.select('gurasid,principaladdresssiteoid,addressstringoid,addresspointtype,geom');
	console.log('data', data);
	if (error) {
		console.log('error addressData:', error);
		return json({ error }, {
			status: 400
		});
	}
	if (data.length === 1) {
		let addressData = data[0];

		return json({ addressData });
	}
	return json({}, {
		status: 400
	});
}
