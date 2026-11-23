<script>
	import { createEventDispatcher } from 'svelte';
	import { reviewedCommitteeAction } from '../../lib/committeeImport.js';
	export let api;
	export let enabled = false;
	export let mode = 'baseline';
	const dispatch = createEventDispatcher();
	let report = null,
		selected = '',
		decision = 'pending',
		note = '',
		correction = '',
		correctedDate = '';
	let identityConfirmed = false;
	let member = null,
		preview = null,
		busy = false,
		error = '',
		message = '';
	$: row = report?.rows.find((item) => String(item.source_row) === selected);
	function reset() {
		identityConfirmed = false;
		member = null;
		preview = null;
		decision = 'pending';
		note = '';
		correction = '';
		correctedDate = '';
		error = '';
		message = '';
	}
	async function openFile(event) {
		reset();
		report = null;
		selected = '';
		try {
			const file = event.currentTarget.files?.[0];
			if (!file) return;
			if (file.size > 4 * 1024 * 1024) throw new Error('Choose a report smaller than 4 MiB.');
			const data = JSON.parse(await file.text());
			if (
				!/^[a-f0-9]{64}$/.test(data.source_sha256) ||
				!Array.isArray(data.rows) ||
				data.rows.length > 5000
			)
				throw new Error('Choose a generated committee reconciliation report.');
			report = data;
		} catch (e) {
			error = e.message;
		}
	}
	async function prepare() {
		identityConfirmed = false;
		preview = null;
		error = '';
		message = '';
		busy = true;
		try {
			if (!row) throw new Error('Choose a source row.');
			const found = await api('snapshot', { search: row.email, limit: 100, offset: 0 });
			const matches = found.members.filter(
				(person) => person.email?.toLowerCase() === row.email.toLowerCase()
			);
			if (matches.length !== 1)
				throw new Error(
					'No unique current account matches this email. Resolve the account mapping first.'
				);
			member = matches[0];
			if (row.user_id && row.user_id !== member.user_id)
				throw new Error(
					'The matched account has changed since the report was prepared. Reconcile its identity first.'
				);
			let errors = row.errors || [];
			let date = row.awarded_on;
			if (correctedDate) {
				if (!correction.trim()) throw new Error('Explain and confirm the source-date correction.');
				if (
					!/^\d{4}-\d{2}-\d{2}$/.test(correctedDate) ||
					new Date(correctedDate).toISOString().slice(0, 10) !== correctedDate
				)
					throw new Error('Enter a valid corrected date.');
				errors = errors.filter(
					(item) => !item.startsWith('Date must') && item !== 'Invalid calendar date.'
				);
				date = correctedDate;
			}
			const provenance = `${note.trim()}\nCommittee CSV row ${row.source_row}; original date: ${
				row.source_date || 'unknown'
			}.${correctedDate ? ` Corrected to ${correctedDate}: ${correction.trim()}` : ''}`;
			if (!note.trim())
				throw new Error('Enter a review note explaining the award type or exclusion decision.');
			preview = reviewedCommitteeAction(
				{ ...row, errors, awarded_on: date, user_id: member.user_id, decision },
				report.source_sha256,
				provenance
			);
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
	async function apply() {
		if (!preview || !enabled || mode !== 'baseline' || busy) return;
		if (!identityConfirmed) {
			error = 'Confirm the account identity against the source before recording.';
			return;
		}
		busy = true;
		error = '';
		message = '';
		try {
			const result = await api(preview.action, preview.arguments);
			message = result.already_recorded
				? 'This decision was already recorded; no duplicate was created.'
				: 'Reviewed decision recorded. No emails were queued and no account was deleted.';
			preview = null;
			dispatch('saved');
		} catch (e) {
			error = e.message;
			preview = null;
		} finally {
			busy = false;
		}
	}
</script>

<h2>Committee reconciliation</h2>
<p>
	Load the private JSON report generated from the committee spreadsheet. Each row needs an explicit
	account match and reviewed decision. A deletion request can exclude an account from this
	programme; this screen never deletes an account.
</p>
<label for="committee-report">Private reconciliation report</label>
<input
	id="committee-report"
	type="file"
	accept=".json,application/json"
	on:change={openFile}
	disabled={busy}
/>
{#if report}
	<p>
		{report.summary?.total || report.rows.length} rows. Marked awards: {report.summary
			?.marked_awards ?? '—'}; deletion requests: {report.summary?.deletion_requests ?? '—'}. All
		decisions start pending.
	</p>
	<form
		class="panel"
		on:submit|preventDefault={prepare}
		on:change={() => {
			preview = null;
		}}
	>
		<label for="committee-row">Source row</label>
		<select id="committee-row" bind:value={selected} on:change={reset} disabled={busy} required>
			<option value="">Choose a row</option>
			{#each report.rows as item}<option value={String(item.source_row)}>
					Row {item.source_row}: {item.email} — {item.classification}
				</option>{/each}
		</select>
		{#if row}
			<p>
				<strong>{row.email}</strong>
				· Source date: {row.source_date || 'unknown'} · {row.classification.replaceAll('_', ' ')}
			</p>
			{#if row.errors?.length}<p class="notice">Source issues: {row.errors.join(' ')}</p>{/if}
			<label for="committee-decision">Reviewed decision</label>
			<select id="committee-decision" bind:value={decision} disabled={busy}>
				<option value="pending">Keep pending — do not apply</option>
				<option value="starter_kit">Confirmed Emergency Starter Kit</option>
				<option value="backpack">Confirmed historical backpack</option>
				<option value="exclude">Exclude from programme pending account-removal review</option>
			</select>
			<label for="committee-date">Corrected award date (only if verified)</label>
			<input id="committee-date" type="date" bind:value={correctedDate} disabled={busy} />
			<label for="committee-correction">Evidence for date correction</label>
			<textarea id="committee-correction" bind:value={correction} maxlength="500" disabled={busy} />
			<label for="committee-note">Review and provenance note</label>
			<textarea id="committee-note" bind:value={note} maxlength="1000" required disabled={busy} />
			<button type="submit" disabled={busy}>Resolve account and preview decision</button>
		{/if}
	</form>
	{#if preview}<div class="panel">
			<h3>Review before recording</h3>
			<p>{member.email} · {preview.action.replaceAll('_', ' ')}</p>
			{#if member.has_historical_kit}<p class="notice">
					Earlier kit evidence exists. Compare the source before recording another fact. Legacy
					kit_date: {member.kit_date || 'not recorded'}; kitdate: {member.kitdate ||
						'not recorded'}; reviewed date: {member.recorded_kit_date || 'unknown'}.
				</p>{/if}
			<p>
				Source registration: {row.registered_at_snapshot || 'not provided'} · Current account registration:
				{member.registered_at || 'not provided'}.
			</p>
			<label class="inline-choice" for="committee-identity">
				<input id="committee-identity" type="checkbox" bind:checked={identityConfirmed} />
				 I checked that this is the same participant, not a reused email address.
			</label>
			<p>Source reference: {preview.arguments.reference}</p>
			<p>{preview.arguments.note}</p>
			{#if decision === 'backpack'}<p>
					A source date is retained as a calendar date. Unknown award time and delivery date stay
					unknown.
				</p>{/if}
			<button type="button" disabled={busy || !enabled || mode !== 'baseline'} on:click={apply}>
				Record reviewed decision
			</button>
		</div>{/if}
{/if}
{#if mode !== 'baseline' || !enabled}<p class="notice">
		Recording historical decisions requires historical mode, paused email sending and no in-flight
		jobs.
	</p>{/if}
{#if error}<p class="notice error" role="alert">{error}</p>{/if}
{#if message}<p class="notice success" role="status">{message}</p>{/if}
