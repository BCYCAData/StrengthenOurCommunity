// Partial saves are allowed: absent radio answers remain NULL, never default No.
export function nullableBoolean(value) {
	if (value === null || value === undefined || value === '') return null;
	if (value === true || value === 'true') return true;
	if (value === false || value === 'false') return false;
	throw new Error('Choose Yes or No for the new questions.');
}

export function accessAnswers(body) {
	const restricted = nullableBoolean(body.get('property_access_restricted'));
	const restrictions =
		restricted === true
			? [...new Set(body.getAll('property_access_restrictions').map(Number))]
			: [];
	if (restrictions.some((value) => ![1, 2, 3].includes(value)))
		throw new Error('Choose one of the listed gate restrictions.');
	return { property_access_restricted: restricted, property_access_restrictions: restrictions };
}

export function assetAnswers(body) {
	return { has_other_critical_assets: nullableBoolean(body.get('has_other_critical_assets')) };
}
