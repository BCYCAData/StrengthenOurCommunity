<script>
	import { createEventDispatcher } from 'svelte';
	import { parseAwardCSV, personName, dateText } from '../../lib/backpackCoordinator.js';
	export let api;
	export let programme = 'backpack';
	export let mode = 'baseline';
	export let enabled = true;
	const dispatch = createEventDispatcher();
	let csv = '';
	let note = '';
	let rows = [];
	let busy = false;
	let importing = false;
	let stop = false;
	let error = '';
	let message = '';
	function clearPreview() {
		rows = [];
		error = '';
		message = '';
	}
	async function fileChanged(event) {
		clearPreview();
		const file = event.currentTarget.files?.[0];
		if (!file) return;
		if (file.size > 131072) {
			error = 'Choose a CSV file smaller than 128 KiB.';
			return;
		}
		csv = await file.text();
	}
	async function preview() {
		clearPreview();
		busy = true;
		try {
			const parsed = parseAwardCSV(csv);
			const found = [];
			for (const entry of parsed) {
				const row = { ...entry, status: 'ready', problem: '', member: null };
				try {
					const result = await api('snapshot', { search: entry.email, limit: 100, offset: 0 });
					const matches = result.members.filter(
						(m) => m.email?.toLowerCase() === entry.email.toLowerCase()
					);
					if (matches.length !== 1)
						throw new Error(
							'No unique participant matches this email. Resolve it before importing.'
						);
					if (
						matches[0].membership_status !== 'confirmed' ||
						matches[0].household_status !== 'confirmed'
					)
						throw new Error('Household membership needs review.');
					row.member = matches[0];
				} catch (e) {
					if (e.status === 401 || e.status === 403) throw e;
					row.status = 'blocked';
					row.problem = e.message;
				}
				found.push(row);
			}
			for (const row of found) {
				if (
					row.member &&
					found.filter((other) => other.member?.household_id === row.member.household_id).length > 1
				) {
					row.status = 'blocked';
					row.problem =
						'Multiple rows refer to the same household. Reconcile them before importing.';
				}
			}
			rows = found;
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
	async function runImport() {
		if (
			busy ||
			!enabled ||
			mode !== 'baseline' ||
			!note.trim() ||
			!rows.length ||
			rows.some((r) => r.status === 'blocked')
		)
			return;
		busy = true;
		importing = true;
		stop = false;
		error = '';
		message = '';
		let changed = false;
		try {
			for (let i = 0; i < rows.length; i++) {
				if (stop) break;
				if (['recorded', 'existing'].includes(rows[i].status)) continue;
				const row = rows[i];
				rows = rows.map((r, j) => (j === i ? { ...r, status: 'recording' } : r));
				try {
					const result = await api('record_award', {
						household_id: row.member.household_id,
						programme,
						original_user_id: row.member.user_id,
						reference: row.reference,
						historical: true,
						awarded_at: row.awarded_at || null,
						delivered_at: row.delivered_at || null,
						note: row.note || note.trim(),
						mode: 'baseline'
					});
					rows = rows.map((r, j) =>
						j === i
							? { ...r, status: result.already_recorded ? 'existing' : 'recorded', problem: '' }
							: r
					);
					changed = true;
				} catch (e) {
					rows = rows.map((r, j) => (j === i ? { ...r, status: 'failed', problem: e.message } : r));
					error =
						'Import stopped at a conflict or failed request. Successful rows are retained; fix the issue before retrying.';
					break;
				}
			}
			if (!error)
				message = stop
					? 'Import paused. Successful rows remain recorded.'
					: 'Import finished. Existing references were checked without duplicating awards.';
		} finally {
			busy = false;
			importing = false;
			if (changed) dispatch('saved');
		}
	}
</script>

<details class="panel">
	<summary>Import historical records from CSV</summary>
	<p>
		Match each source email to a reviewed household. Preview first; no records are written until you
		choose Import.
	</p>
	<p class="muted">
		Required columns: <code>reference,email</code>
		. Optional:
		<code>awarded_at,delivered_at,note</code>
		. Use timestamps with a timezone, or leave unknown dates blank. Maximum 50 rows.
	</p>
	{#if mode !== 'baseline'}<p class="notice">
			Switch to historical review mode to import historical awards.
		</p>{/if}
	<label for="award-csv-file">CSV file</label>
	<input
		id="award-csv-file"
		type="file"
		accept=".csv,text/csv"
		on:change={fileChanged}
		disabled={busy}
	/>
	<label for="award-csv">Or paste CSV</label>
	<textarea
		id="award-csv"
		bind:value={csv}
		on:input={clearPreview}
		disabled={busy}
		placeholder={'reference,email,awarded_at,delivered_at\nregister-001,person@example.com,,'}
	/>
	<label for="csv-note">Import provenance / review notes</label>
	<textarea
		id="csv-note"
		bind:value={note}
		disabled={busy}
		maxlength="2000"
		placeholder="Identify the source register and explain any unknown dates."
	/>
	<div class="actions">
		<button type="button" on:click={preview} disabled={busy || !csv.trim()}>Preview CSV</button>
		<button
			type="button"
			class="primary"
			on:click={runImport}
			disabled={busy ||
				!enabled ||
				mode !== 'baseline' ||
				!note.trim() ||
				!rows.length ||
				rows.some((r) => r.status === 'blocked') ||
				rows.every((r) => ['recorded', 'existing'].includes(r.status))}
		>
			Import reviewed rows
		</button>
		{#if importing}<button type="button" on:click={() => (stop = true)} disabled={stop}>
				Stop after current row
			</button>{/if}
	</div>
	{#if error}<p class="notice error" role="alert">{error}</p>{/if}{#if message}<p
			class="notice success"
			role="status"
		>
			{message}
		</p>{/if}
	{#if rows.length}<div class="table-scroll">
			<table aria-label="CSV import preview">
				<thead>
					<tr>
						<th>Reference</th>
						<th>Participant</th>
						<th>Award (Sydney)</th>
						<th>Delivery (Sydney)</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row}<tr>
							<td>{row.reference}</td>
							<td>
								{row.member ? personName(row.member) : row.email}
								<br />
								<small>{row.email}</small>
							</td>
							<td>{dateText(row.awarded_at)}</td>
							<td>{dateText(row.delivered_at)}</td>
							<td>
								<span class="badge">{row.status}</span>
								{#if row.member?.award_recorded}<p>
										<small>Existing award; the reference will be checked.</small>
									</p>{/if}
								<details>
									<summary>Import notes</summary>
									<p>{row.note || note}</p>
								</details>
								{#if row.problem}<p>{row.problem}</p>{/if}
							</td>
						</tr>{/each}
				</tbody>
			</table>
		</div>{/if}
	{#if busy}<p role="status">
			{importing ? 'Recording reviewed rows…' : 'Checking participants and households…'}
		</p>{/if}
</details>
