import { supabaseClient } from '$lib/dbClient';

let mapData = { jsonLayers: [] };

export const GET = async () => {
	const { data: allPoints, error: errorAll } = await supabaseClient
		.from('address_point_extract_wgs84')
		.select('geom,addresspointtype');
	if (errorAll) {
		console.log('error get Addresspoints:', errorAll);
		return {
			status: 400,
			body: { errorAll }
		};
	}
	if (allPoints.length > 0) {
		mapData.jsonLayers[0] = allPoints;
	}
	const { data: registeredPoints, error: errorRegistered } = await supabaseClient.rpc(
		'get_registered_addresspoints'
	);
	if (errorRegistered) {
		console.log('error get registetred Addresspoints:', errorRegistered);
		return {
			status: 400,
			body: { errorRegistered }
		};
	}
	if (registeredPoints.length > 0) {
		mapData.jsonLayers[1] = registeredPoints;
	}
	if (mapData.jsonLayers.length > 0) {
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
