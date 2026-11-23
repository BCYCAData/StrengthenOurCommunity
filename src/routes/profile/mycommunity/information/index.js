export const GET = ({ locals }) =>
	locals.user ? { status: 200 } : { status: 303, headers: { Location: '/auth/signin' } };
// Historical answers are retained; these sections now provide information only.
export const POST = () => ({
	status: 410,
	body: { error: 'This questionnaire section has been retired.' }
});
