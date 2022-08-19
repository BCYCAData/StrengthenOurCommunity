import { supabaseClient } from '$lib/dbClient';
import { error } from '@sveltejs/kit';

let mapData = { jsonLayers: [] };

export const load = async ({ request }) => {
	const { data, error: dbError } = await supabaseClient
		.from('address_point_extract_wgs84')
		.select('geom,addresspointtype');
	console.log(data);
	if (dbError) {
		// console.log('error get Addresspoints:', error);
		// throw new Error(
		// 	'@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292699)'
		// );
		// return {
		// 	status: 400,
		// 	body: { error }
		// };
		throw error(400, 'not found');
	}
	if (data.length > 0) {
		mapData.jsonLayers[0] = data;

		return { mapData };
	}
	// throw new Error(
	// 	'@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292699)'
	// );
	// return {
	// 	status: 400,
	// 	body: {}
	// };
	throw error(400, 'something went wrong');
};
