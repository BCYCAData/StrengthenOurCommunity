import { supabaseClient } from '$lib/dbClient';

export async function POST({ request }) {
	const body = await request.json();
	const aliases = await aliasSuburbs(body.streetAddress.toUpperCase(), body.suburb.toUpperCase());
	let q = '(';
	for (let alias of aliases) {
		q += `'${alias}',`;
	}
	q = q.slice(0, -1);
	q += ')';
	const addressURL =
		'https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Geocoded_Addressing_Theme/FeatureServer/1/query?where=';
	let addressQuery = `address IN ${q}`;
	let safeQueryString = addressQuery.replace(/\s+/g, '+');
	const addressQueryParams =
		'&outFields=principaladdresssiteoid,address&outSR=3857&featureEncoding=esriDefault&f=pjson';
	let geocodingFetchUrl = `${addressURL}${safeQueryString}${addressQueryParams}`;
	try {
		let response = await fetch(geocodingFetchUrl);
		let data = await response.json();
		let features = data.features;
		if (data.error) {
			return {
				status: data.error.code
			};
		} else if (features) {
			if (features.length === 1) {
				let communityData = await getCommunity(features[0].geometry, 3857);
				if (communityData) {
					if (communityData.is_open) {
						// Is part of an eligible community
						return {
							status: 200,
							body: {
								community_name: communityData.community_name,
								is_open: communityData.is_open,
								principaladdresssiteoid: features[0].attributes.principaladdresssiteoid,
								address: features[0].attributes.address,
								address_point: communityData.address_point.coordinates
							}
						};
					} else {
						// Is part of an eligible community not yet receiving registrations
						return {
							status: 401,
							body: {
								community_name: communityData.community_name,
								is_open: communityData.is_open,
								principaladdresssiteoid: features[0].attributes.principaladdresssiteoid,
								address: features[0].attributes.address,
								address_point: communityData.address_point.coordinates
							}
						};
					}
				} else {
					// Is not part of an eligible community
					return {
						status: 403,
						body: { message: 'Not part of an eligible community.' }
					};
				}
			} else {
				return {
					status: 404,
					body: { message: 'Addresss not found.' }
				};
			}
		} else {
			return {
				status: 418,
				body: {
					message: 'Something went wrong.',
					info: `Response status is ${response.status}`
				}
			};
		}
	} catch (error) {
		console.log('error:  ', error);
		let messageString;
		if (error.details) {
			messageString = error.details.join('\r\n');
			return {
				status: error.code,
				body: {
					message: messageString
				}
			};
		}
		messageString =
			error.message.length > 0
				? error.message
				: 'There was an error getting data back from Spatial Services NSW.';
		return {
			status: error.code,
			body: {
				message: messageString
			}
		};
	}
}

async function getCommunity(point, srid) {
	const { data: communityData, error } = await supabaseClient.rpc('is_targeted_community', {
		address_x: point.x,
		address_y: point.y,
		srid: srid
	});
	if (error) {
		console.log('error communityData:', error);
		return {
			status: 400,
			body: { error }
		};
	}
	return communityData[0];
}

async function aliasSuburbs(streetAddress, suburb) {
	const { data: suburbAliasData, error } = await supabaseClient
		.from('suburb_aliases')
		.select('aliases')
		.eq('suburb_name', suburb);
	if (error) {
		console.log('error suburbAliasData:', error);
		return {
			status: 400,
			body: { error }
		};
	}
	let result = [`${streetAddress} ${suburb}`];
	if (suburbAliasData.length === 1) {
		for (let alias of suburbAliasData[0].aliases) {
			result = [...result, `${streetAddress} ${alias}`];
		}
	}
	return result;
}
