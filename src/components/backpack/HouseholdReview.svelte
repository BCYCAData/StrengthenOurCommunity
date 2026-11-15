<script>
	import { createEventDispatcher } from 'svelte';
	import { personName, addressText } from '../../lib/backpackCoordinator.js';
	export let members = [];
	export let api;
	export let mode = 'baseline';
	export let busyPage = false;
	export let enabled = true;
	const dispatch = createEventDispatcher();
	let selected = [];
	let target = '';
	let contact = '';
	let property = '';
	let note = '';
	let preview = null;
	let busy = false;
	let error = '';
	let message = '';
	$: ids = selected.map((m) => m.user_id);
	$: candidates = [...new Map(selected.map((m) => [m.household_id, m])).values()];
	$: missingTargetMembers = (
		preview?.related_households?.find((r) => r.household.id === target)?.members || []
	).filter((m) => !ids.includes(m.user_id));
	$: canSave =
		preview &&
		target &&
		ids.includes(contact) &&
		note.trim() &&
		!busy &&
		!busyPage &&
		enabled &&
		!missingTargetMembers.length;
	function invalidate() {
		preview = null;
		message = '';
		error = '';
	}
	function selectMember(member, checked) {
		invalidate();
		selected = checked
			? [...selected.filter((m) => m.user_id !== member.user_id), member]
			: selected.filter((m) => m.user_id !== member.user_id);
		if (!selected.some((m) => m.household_id === target)) target = selected[0]?.household_id || '';
		if (!selected.some((m) => m.user_id === contact)) contact = '';
	}
	async function openHousehold(member) {
		busy = true;
		invalidate();
		try {
			const result = await api('household_details', { household_id: member.household_id });
			selected = result.members;
			target = member.household_id;
			contact = result.household.contact_user_id || '';
			property = result.household.property_id || '';
			note = '';
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
	async function getPreview() {
		busy = true;
		invalidate();
		try {
			preview = await api('preview_household', { household_id: target, member_ids: ids });
			selected = preview.members.map((m) => ({
				...m,
				user_id: m.user_id,
				household_id: m.membership.household_id
			}));
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
	async function includeExisting() {
		busy = true;
		invalidate();
		try {
			const result = await api('household_details', { household_id: target });
			selected = [...new Map([...selected, ...result.members].map((m) => [m.user_id, m])).values()];
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}

	async function save() {
		if (!canSave) return;
		busy = true;
		error = '';
		message = '';
		try {
			await api('confirm_household', {
				household_id: target,
				member_ids: ids,
				contact_user_id: contact,
				property_id: property.trim() || null,
				revision: preview.revision,
				note: note.trim(),
				mode
			});
			preview = null;
			note = '';
			message =
				mode === 'baseline'
					? 'Household saved. No new emails were queued.'
					: 'Household saved. New qualification notifications follow the live programme rules.';
			dispatch('saved');
		} catch (e) {
			error = e.message;
			if (e.status === 409) preview = null;
		} finally {
			busy = false;
		}
	}
</script>

<h2>Review households</h2>
<p class="muted">
	Start with a household, then add or remove participants. A shared property identifier is evidence
	to review, not proof that people share a household.
</p>
<div class="table-scroll">
	<table aria-label="Participants and households">
		<thead>
			<tr>
				<th>Select</th>
				<th>Participant</th>
				<th>Property</th>
				<th>Review status</th>
				<th>Household</th>
			</tr>
		</thead>
		<tbody>
			{#each members as member (member.user_id)}
				<tr>
					<td>
						<input
							type="checkbox"
							aria-label={`Select ${personName(member)}`}
							checked={ids.includes(member.user_id)}
							disabled={busy || busyPage}
							on:change={(e) => selectMember(member, e.currentTarget.checked)}
						/>
					</td>
					<td>
						<span class="person">{personName(member)}</span>
						<small>{member.email}</small>
					</td>
					<td>
						{addressText(member)}
						<br />
						<small>
							Property: {member.current_property_id || member.property_id || 'Not recorded'}
						</small>
					</td>
					<td>
						<span
							class:positive={member.membership_status === 'confirmed'}
							class:waiting={member.membership_status !== 'confirmed'}
							class="badge"
						>
							{member.membership_status === 'confirmed' ? 'Reviewed' : 'Needs review'}
						</span>
						{#if member.award_recorded}<br />
							<small>Backpack already recorded</small>{/if}
					</td>
					<td>
						<button
							type="button"
							disabled={busy || busyPage}
							on:click={() => openHousehold(member)}
						>
							Review household
							<span class="sr-only">for {personName(member)}</span>
						</button>
					</td>
				</tr>
			{:else}<tr>
					<td colspan="5" class="empty">
						No participants match this search. If no candidates have been created, run a preparation
						assessment in Baseline.
					</td>
				</tr>{/each}
		</tbody>
	</table>
</div>
{#if error}<p class="notice error" role="alert">{error}</p>{/if}
{#if message}<p class="notice success" role="status">{message}</p>{/if}
{#if selected.length}
	<form class="panel" on:submit|preventDefault={save}>
		<h3>Selected household members ({selected.length})</h3>
		<ul class="selected-list">
			{#each selected as member (member.user_id)}
				<li>
					<span class="person">{personName(member)}</span>
					<small>{member.email}</small>
					<p>{addressText(member)}</p>
					<div class="actions">
						<label class="inline-choice">
							<input
								type="radio"
								name="household-contact"
								value={member.user_id}
								bind:group={contact}
								disabled={busy}
							/>
							Nominated contact
						</label>
						<button type="button" disabled={busy} on:click={() => selectMember(member, false)}>
							Remove
							<span class="sr-only">{personName(member)}</span>
						</button>
					</div>
				</li>
			{/each}
		</ul>
		<div class="fields">
			<div>
				<label for="target-household">Keep this household record</label>
				<select id="target-household" bind:value={target} disabled={busy} on:change={invalidate}>
					{#each candidates as member}<option value={member.household_id}>
							{personName(member)} — {member.current_property_id ||
								member.property_id ||
								'Manual property review'}
						</option>{/each}
				</select>
			</div>
			<div>
				<label for="household-property">Reviewed property identifier (if known)</label>
				<input id="household-property" bind:value={property} maxlength="200" disabled={busy} />
				<small>Leave blank if manual evidence establishes the household.</small>
			</div>
		</div>
		<div class="actions" style="margin-top:1rem">
			<button type="button" disabled={busy || !target || !ids.length} on:click={getPreview}>
				{busy ? 'Working…' : 'Preview household'}
			</button>
			<button
				type="button"
				disabled={busy}
				on:click={() => {
					selected = [];
					target = '';
					contact = '';
					invalidate();
				}}
			>
				Clear selection
			</button>
		</div>
		{#if preview}
			{#if missingTargetMembers.length}
				<p class="notice">
					This household already has additional members. Include them and preview the full group
					before saving.
				</p>
				<button type="button" disabled={busy} on:click={includeExisting}>
					Include existing household members
				</button>
			{/if}

			<div class="notice" role="status">
				<strong>Preview ready.</strong>
				Review every selected member and the nominated contact before saving. The server will reject
				this preview if the evidence changes.
			</div>
			{#each preview.related_households || [] as related}
				{#if related.awards?.length || related.notifications?.length || related.status?.some((s) => s.ever_qualified)}
					<p class="notice">
						A related household has qualification, award or notification history. Moving its members
						may require a separate reconciliation. Existing history will be preserved.
					</p>
				{/if}
			{/each}
			<label for="household-note">Review notes</label>
			<textarea
				id="household-note"
				bind:value={note}
				maxlength="2000"
				required
				disabled={busy}
				placeholder="Record the evidence used to establish this household."
			/>
			<button class="primary" type="submit" disabled={!canSave}>
				Confirm household and contact
			</button>
		{/if}
	</form>
{:else}<p class="empty">
		Choose “Review household” to load all its members, or select participants to prepare a group.
	</p>{/if}
