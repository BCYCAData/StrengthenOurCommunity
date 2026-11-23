export const GET = () => ({
	status: 303,
	headers: { Location: '/profile/mycommunity/information' }
});
export const POST = () => ({
	status: 410,
	body: { error: 'Event questions have been retired; historical answers are retained.' }
});
