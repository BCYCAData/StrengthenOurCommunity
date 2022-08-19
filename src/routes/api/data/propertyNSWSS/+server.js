import { json as json$1 } from '@sveltejs/kit';

// @ts-nocheck
export async function POST({ request }) {
	const body = await request.json();
	const addressURL =
		'https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Geocoded_Addressing_Theme/FeatureServer/1/query?where=';
	let safeAddressString = body.address.replace(/\s+/g, '+');
	let addressQuery = `address='${safeAddressString}'`;
	const addressQueryParams = '&outFields=*&featureEncoding=esriDefault&f=pjson';
	let geocodingFetchUrl = `${addressURL}${addressQuery}${addressQueryParams}`;
	console.log(geocodingFetchUrl);
	try {
		let response = await fetch(geocodingFetchUrl);
		let data = await response.json();
		if (data.error) {
			return json$1({
				message: data.error.message
			}, {
				status: data.error.code
			});
		} else {
			if (data.features.length > 0) {
				return json$1({
					point: [data.features[0].geometry.x, data.features[0].geometry.y],
					address: body.address
				});
			} else if (data.features) {
				return json$1({}, {
					status: 404
				});
			}
		}
	} catch (error) {
		console.log('error:  ', error);
		return json$1({
			error: error
		}, {
			status: 400
		});
	}
}
