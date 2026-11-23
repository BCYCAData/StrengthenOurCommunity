<script>
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	let status = null;
	let mounted = false;
	let previousPath = '';
	let error = '';
	let busy = false;
	let controller;
	onMount(() => {
		mounted = true;
	});
	onDestroy(() => controller?.abort());
	$: if (mounted && previousPath !== $page.url.pathname) {
		previousPath = $page.url.pathname;
		load();
	}
	async function load() {
		controller?.abort();
		const current = new AbortController();
		controller = current;
		try {
			const response = await fetch('/api/backpack/status', {
				credentials: 'same-origin',
				signal: current.signal
			});
			if (!response.ok) throw new Error('Unavailable');
			const result = await response.json();
			if (!current.signal.aborted) {
				status = result;
				error = '';
			}
		} catch {
			if (!current.signal.aborted) status = null;
		}
	}
	async function dismiss() {
		if (busy) return;
		busy = true;
		error = '';
		try {
			const response = await fetch('/api/backpack/status', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ dismiss: true })
			});
			if (!response.ok) throw new Error('Could not dismiss this message. Please try again.');
			status = { ...status, notice_dismissed: true };
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
	function sectionURL(section) {
		if (section === 'About Me') return '/profile/aboutme';
		if (section?.includes('Assets')) return '/profile/myplace/assets';
		if (section?.includes('Resources')) return '/profile/myplace/resources';
		if (section?.includes('Hazards')) return '/profile/myplace/hazards';
		return '/profile/myplace';
	}
</script>

<section class="participant-status" aria-labelledby="backpack-status-title">
	<h2 id="backpack-status-title">Your backpack status</h2>
	{#if !status}<p>Your status is temporarily unavailable. Your saved answers are unaffected.</p>
	{:else if status.state === 'unconfigured'}<p>
			The backpack programme is being prepared. You can save and review your answers now.
		</p>
	{:else if status.state === 'excluded'}<p>
			Please contact the programme coordinator about your participation.
		</p>
	{:else if status.state === 'awarded'}<p>
			A backpack has already been recorded for your household.
		</p>
		{#if status.delivered_at}<p>Delivery has been recorded. Thank you for taking part.</p>{:else}<p>
				The coordinator can confirm delivery arrangements.
			</p>{/if}
	{:else if status.state === 'qualified'}
		{#if !status.notice_dismissed}<div role="status">
				<h3>Congratulations!</h3>
				<p>Your household has qualified for a backpack. We will be in touch to arrange delivery.</p>
			</div>
			<button type="button" disabled={busy} on:click={dismiss}>Dismiss congratulations</button>
		{:else}<p>Your household is qualified. The coordinator will arrange delivery.</p>{/if}
	{:else if status.state === 'incomplete'}<p>
			To qualify, one household member needs to complete the key questions and meet the programme
			requirements. Your unanswered key questions are:
		</p>
		<ul>
			{#each status.missing_questions || [] as question}<li>
					<a href={sectionURL(question.section)}>{question.id}: {question.label}</a>
				</li>{/each}
		</ul>
	{:else if status.state === 'review_required'}<p>
			Your key answers are complete. Sign in again so your post-cutoff review can be recorded.
		</p>
	{:else if status.state === 'special_case'}<p>
			Your key answers may be complete, but your earlier kit history needs coordinator review before
			a backpack can be confirmed.
		</p>
	{:else}<p>
			Your key answers are complete. Household confirmation or programme approval is still needed
			before delivery can be promised.
		</p>{/if}
	{#if error}<p role="alert">{error}</p>{/if}
</section>

<style>
	.participant-status {
		margin: 1rem;
		padding: 1rem;
		border: 1px solid #ba9a70;
		background: #fff8ed;
		border-radius: 0.5rem;
		line-height: 1.5;
	}
	h2 {
		font-size: 1.15rem;
		font-weight: 700;
	}
	h3 {
		font-weight: 700;
		margin-top: 0.5rem;
	}
	p,
	ul {
		margin-block: 0.75rem;
	}
	ul {
		padding-inline-start: 1.1rem;
		list-style: disc;
	}
	a {
		text-decoration: underline;
	}
	button {
		padding: 0.6rem;
		min-height: 48px;
		border: 1px solid #914b12;
		border-radius: 0.25rem;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 3px solid #16534a;
		outline-offset: 3px;
	}
</style>
