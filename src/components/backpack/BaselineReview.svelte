<script>
	import { createEventDispatcher } from 'svelte';
	import { dateText, readinessBlockers } from '../../lib/backpackCoordinator.js';
	export let snapshot;
	export let api;
	const dispatch = createEventDispatcher();
	let runNote = '';
	let reviewNote = '';
	let selectedRun = null;
	let busy = false;
	let error = '';
	let message = '';
	$: readiness = snapshot?.readiness;
	$: policy = snapshot?.policy;
	$: blockers = readinessBlockers(readiness);
	$: maintenanceAllowed = !policy?.email_enabled && !readiness?.processing_jobs;
	$: canReview =
		selectedRun &&
		selectedRun.policy_id === policy?.id &&
		!selectedRun.reviewed_at &&
		!blockers.length &&
		maintenanceAllowed &&
		reviewNote.trim() &&
		!busy;
	async function run() {
		if (busy || !runNote.trim() || !policy?.id || !maintenanceAllowed) return;
		busy = true;
		error = '';
		message = '';
		try {
			selectedRun = await api('run_baseline', { policy_id: policy.id, note: runNote.trim() });
			runNote = '';
			reviewNote = '';
			message = 'Assessment recorded. No emails were queued.';
			dispatch('saved');
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
	async function review() {
		if (!canReview) return;
		busy = true;
		error = '';
		message = '';
		try {
			selectedRun = await api('review_baseline', {
				run_id: selectedRun.id,
				note: reviewNote.trim()
			});
			reviewNote = '';
			message = 'Baseline readiness approved. Email sending has not been enabled.';
			dispatch('saved');
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
</script>

<h2>Baseline readiness</h2>
<p class="muted">
	Assess existing participants, review household and award classifications, then approve readiness.
	Running or approving a baseline does not send emails.
</p>
{#if error}<p class="notice error" role="alert">{error}</p>{/if}{#if message}<p
		class="notice success"
		role="status"
	>
		{message}
	</p>{/if}
<section class="panel">
	<h3>Programme rules</h3>
	<dl>
		<dt>Cutoff</dt>
		<dd>{policy?.cutoff_at ? dateText(policy.cutoff_at) : 'Not provided'}</dd>
		<dt>Rule version</dt>
		<dd>{policy?.version || 'Not configured'}</dd>
		<dt>Questions allowed unanswered</dt>
		<dd>
			{policy?.excluded_question_ids === null || !policy?.excluded_question_ids
				? 'Not provided'
				: policy.excluded_question_ids.length
				? policy.excluded_question_ids.join(', ')
				: 'None — all in-scope questions are required'}
		</dd>
		<dt>Baseline approval</dt>
		<dd>{dateText(policy?.baseline_completed_at)}</dd>
	</dl>
	{#if blockers.length}<h3>Outstanding items</h3>
		<ul>
			{#each blockers as blocker}<li>{blocker}</li>{/each}
		</ul>{:else}<p class="notice success">
			No readiness blockers are currently reported. Review the recorded run before approving.
		</p>{/if}
	{#if !maintenanceAllowed}<p class="notice">
			Pause email dispatch and resolve in-flight sends before historical assessment or approval.
		</p>{/if}
</section>
<form class="panel" on:submit|preventDefault={run}>
	<h3>Run a historical assessment</h3>
	<p>
		You can run a preparation assessment before the programme rules are final. It creates candidates
		and explicit unconfigured results, not award eligibility.
	</p>
	<label for="baseline-run-note">Assessment notes</label>
	<textarea id="baseline-run-note" bind:value={runNote} required maxlength="2000" disabled={busy} />
	<button
		class="primary"
		type="submit"
		disabled={busy || !runNote.trim() || !policy?.id || !maintenanceAllowed}
	>
		Run baseline assessment
	</button>
</form>
<section class="panel">
	<h3>Recorded runs</h3>
	{#if snapshot?.recent_baselines?.length}<ul class="selected-list">
			{#each snapshot.recent_baselines as run (run.id)}<li>
					<span class="person">{dateText(run.completed_at)}</span>
					<p>{run.note}</p>
					<span class="badge">{run.reviewed_at ? 'Reviewed' : 'Awaiting review'}</span>
					<button
						type="button"
						disabled={busy}
						on:click={() => {
							selectedRun = run;
							reviewNote = '';
							error = '';
							message = '';
						}}
					>
						Review run
						<span class="sr-only">from {dateText(run.completed_at)}</span>
					</button>
				</li>{/each}
		</ul>{:else}<p class="empty">No coordinator baseline runs have been recorded.</p>{/if}
	{#if selectedRun}<form on:submit|preventDefault={review}>
			<h3>Review assessment from {dateText(selectedRun.completed_at)}</h3>
			<p>{selectedRun.note}</p>
			<p class="muted">
				Recorded summary: {selectedRun.summary?.assessable_accounts ?? '—'} accounts; {selectedRun
					.summary?.unresolved_memberships ?? '—'} unresolved memberships; {selectedRun.summary
					?.missing_contacts ?? '—'} missing contacts.
			</p>
			{#if selectedRun.reviewed_at}<p class="notice success">
					Reviewed {dateText(selectedRun.reviewed_at)}.
				</p>{:else}
				<p>
					The server checks that the evidence and policy still match this run. If anything has
					changed, rerun the assessment before approving.
				</p>
				<label for="baseline-review-note">Review conclusions</label>
				<textarea
					id="baseline-review-note"
					bind:value={reviewNote}
					required
					maxlength="2000"
					disabled={busy}
				/>
				<button class="primary" type="submit" disabled={!canReview}>
					Approve baseline readiness
				</button>
			{/if}
		</form>{/if}
</section>
