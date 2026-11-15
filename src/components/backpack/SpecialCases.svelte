<script>
	import { createEventDispatcher } from 'svelte';
	import { personName, addressText } from '../../lib/backpackCoordinator.js';
	export let members = [];
	export let api;
	export let programme = 'backpack';
	export let mode = 'baseline';
	export let enabled = true;
	const dispatch = createEventDispatcher();
	let selected = null;
	let decision = 'pending';
	let note = '';
	let busy = false;
	let error = '';
	let message = '';
	function choose(member) {
		selected = member;
		decision = member.special_case_decision || 'pending';
		note = '';
		error = '';
		message = '';
	}
	async function save() {
		if (!selected || !note.trim() || busy || !enabled) return;
		busy = true;
		error = '';
		message = '';
		try {
			await api('decide_special_case', {
				user_id: selected.user_id,
				programme,
				decision,
				note: note.trim(),
				mode
			});
			message = `Decision recorded for ${personName(selected)}.`;
			selected = null;
			note = '';
			dispatch('saved');
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
</script>

<h2>Special-case decisions</h2>
<p class="muted">
	Review participants who registered before the cutoff without a recorded kit. Approval resolves the
	historical exception; required answers and household checks still apply.
</p>
<div class="table-scroll">
	<table aria-label="Special cases">
		<thead>
			<tr>
				<th>Participant</th>
				<th>Property</th>
				<th>Decision</th>
				<th>Review</th>
			</tr>
		</thead>
		<tbody>
			{#each members as member (member.user_id)}<tr>
					<td>
						<span class="person">{personName(member)}</span>
						<small>{member.email}</small>
					</td>
					<td>{addressText(member)}</td>
					<td>
						<span class="badge">{member.special_case_decision || 'Not decided'}</span>
						{#if member.special_case_reason}<p><small>{member.special_case_reason}</small></p>{/if}
					</td>
					<td>
						<button type="button" disabled={busy} on:click={() => choose(member)}>
							Review case
							<span class="sr-only">for {personName(member)}</span>
						</button>
					</td>
				</tr>
			{:else}<tr>
					<td colspan="4" class="empty">
						No special cases match this search. The cutoff and assessment rules must be configured
						before historical cases can be classified.
					</td>
				</tr>{/each}
		</tbody>
	</table>
</div>
{#if error}<p class="notice error" role="alert">{error}</p>{/if}{#if message}<p
		class="notice success"
		role="status"
	>
		{message}
	</p>{/if}
{#if selected}<form class="panel" on:submit|preventDefault={save}>
		<h3>Review {personName(selected)}</h3>
		<p>{selected.email}</p>
		{#if selected.missing_required?.length}<p class="notice">
				Unanswered required questions: {selected.missing_required.join(', ')}. A special-case
				approval will not fill these answers.
			</p>{/if}
		<label for="case-decision">Decision</label>
		<select id="case-decision" bind:value={decision} disabled={busy}>
			<option value="pending">Keep pending</option>
			<option value="approved">Approve historical exception</option>
			<option value="declined">Decline historical exception</option>
		</select>
		<label for="case-note">Decision notes</label>
		<textarea id="case-note" bind:value={note} required maxlength="2000" disabled={busy} />
		<div class="actions">
			<button class="primary" type="submit" disabled={busy || !note.trim() || !enabled}>
				Record decision
			</button>
			<button type="button" disabled={busy} on:click={() => (selected = null)}>Cancel</button>
		</div>
	</form>{/if}
