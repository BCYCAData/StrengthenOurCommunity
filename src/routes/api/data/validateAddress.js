import { supabaseClient } from '$lib/dbClient';

export async function POST({ request }) {
	const body = await request.json();
	const { data: addressData, error: addressError } = await supabaseClient.rpc(
		'get_addresspoint_from_address',
		{
			address_text: body.streetAddress.toUpperCase(),
			given_suburb: body.suburb.toUpperCase(),
			in_srid_value: 3857,
			out_srid_value: 4326
		}
	);
	if (addressError) {
		console.log('addressError', addressError);
		return {
			status: 400,
			body: { message: 'Not part of an eligible community.' }
		};
	} else {
		let resultData = addressData[0];
		return {
			status: resultData.return_status,
			body: {
				community_name: resultData.community,
				principaladdresssiteoid: resultData.principaladdresssiteoid,
				address: resultData.valid_address,
				addressPoint: resultData.addresspoint_geom,
				gurasid: resultData.gurasid,
				message: resultData.message
			}
		};
	}
}
