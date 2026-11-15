/** Delivers one already-authorised household job. Dependencies are injectable for tests. */
export async function dispatchBackpackEmail(client, apiKey, fetchEmail = fetch) {
	const { data: job, error } = await client.rpc('backpack_claim_email');
	if (error) throw new Error('Could not claim backpack notification');
	if (!job) return { status: 'idle' };
	const retry = Math.min(3600, 60 * 2 ** Math.min(job.attempt, 6));
	let outcome,
		providerId = null,
		problem = null,
		retrySeconds = retry;
	try {
		const response = await fetchEmail('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'Idempotency-Key': `backpack/${job.id}`
			},
			body: JSON.stringify(job.payload),
			signal: AbortSignal.timeout(15000)
		});
		if (response.ok) {
			const body = await response.json();
			if (!body.id) throw new Error('Missing provider acknowledgement');
			outcome = 'accepted';
			providerId = body.id;
		} else if (response.status === 429) {
			outcome = 'retry_safe';
			problem = 'Resend quota or rate limit';
			const seconds = Number(response.headers.get('retry-after'));
			retrySeconds = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 86400) : 3600;
		} else if (response.status >= 500) {
			outcome = 'retry_uncertain';
			problem = 'Resend temporarily unavailable';
		} else {
			outcome = 'failed';
			problem = `Resend rejected request (${response.status})`;
		}
	} catch {
		outcome = 'retry_uncertain';
		problem = 'Delivery outcome unknown';
	}
	const { data: finished, error: finishError } = await client.rpc('backpack_finish_email', {
		p_id: job.id,
		p_token: job.claim_token,
		p_outcome: outcome,
		p_provider_id: providerId,
		p_error: problem,
		p_retry_seconds: retrySeconds
	});
	if (finishError || !finished) throw new Error('Could not record backpack notification outcome');
	return { status: outcome };
}
