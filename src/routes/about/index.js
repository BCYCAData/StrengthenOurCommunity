import { supabaseClient } from '$lib/dbClient';

let mapData = { jsonLayers: [] };

export const GET = async ({ request }) => {
	const { data, error } = await supabaseClient
		.from('address_point_extract_wgs84')
		.select('geom,addresspointtype');
	if (error) {
		console.log('error get Addresspoints:', error);
		return {
			status: 400,
			body: { error }
		};
	}
	if (data.length > 0) {
		mapData.jsonLayers[0] = data;

		return {
			status: 200,
			body: { mapData }
		};
	}
	return {
		status: 400,
		body: {}
	};
};
