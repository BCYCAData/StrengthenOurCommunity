import { pathToFileURL } from 'node:url';

export async function dispatchBatch({ url, secret, limit = 5, fetcher = fetch }) {
	const target = new URL(url);
	if (
		target.username ||
		target.password ||
		target.search ||
		target.hash ||
		target.pathname !== '/api/backpack/dispatch' ||
		(target.protocol !== 'https:' &&
			!(
				target.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
			))
	)
		throw new Error('Use an HTTPS dispatch endpoint or an explicit local loopback endpoint.');
	if (!secret || !Number.isInteger(limit) || limit < 1 || limit > 20)
		throw new Error('Worker secret and batch limit 1–20 are required.');
	const counts = {};
	for (let i = 0; i < limit; i++) {
		const response = await fetcher(target.href, {
			method: 'POST',
			redirect: 'error',
			headers: { Authorization: `Bearer ${secret}` },
			signal: AbortSignal.timeout(30000)
		});
		if (!response.ok) throw new Error(`Dispatch endpoint returned HTTP ${response.status}.`);
		const result = await response.json();
		if (
			!['accepted', 'idle', 'disabled', 'retry_safe', 'retry_uncertain', 'failed'].includes(
				result.status
			)
		)
			throw new Error('Unexpected dispatch response.');
		counts[result.status] = (counts[result.status] || 0) + 1;
		if (result.status !== 'accepted') break;
	}
	return counts;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
	dispatchBatch({
		url: process.env.BACKPACK_DISPATCH_URL,
		secret: process.env.BACKPACK_WORKER_SECRET,
		limit: Number(process.env.BACKPACK_BATCH_SIZE || 5)
	})
		.then((counts) => {
			console.log(JSON.stringify(counts));
			if (counts.failed || counts.retry_uncertain) process.exitCode = 1;
		})
		.catch(() => {
			console.error(
				'Backpack dispatch failed; inspect the coordinator email history and scheduler configuration.'
			);
			process.exitCode = 1;
		});
}
