// An explicit form submission is different from a database import or background
// update. Never accept a user ID from the browser; the RPC uses auth.uid().
export async function recordBackpackSubmission(client, env = {}) {
	if (env.BACKPACK_ASSESSMENT_ENABLED !== 'true') return;
	try {
		const { error } = await client.rpc('backpack_record_submission');
		if (error) console.warn('Backpack submission assessment needs attention');
	} catch {
		// Answers have already been saved; delivery must not break their response.
		console.warn('Backpack submission assessment temporarily unavailable');
	}
}
