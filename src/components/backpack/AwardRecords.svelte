<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import AwardCSVImport from './AwardCSVImport.svelte';
	import {
		personName,
		addressText,
		dateText,
		localDateTimeToISO
	} from '../../lib/backpackCoordinator.js';
	export let members = [];
	export let api;
	export let programme = 'backpack';
	export let mode = 'baseline';
	export let refreshKey = 0;
	export let policyEnabled = false;
	export let enabled = true;
	const dispatch = createEventDispatcher();
	let memberId = '';
	let historical = true;
	let reference = '';
	let awarded = '';
	let delivered = '';
	let note = '';
	let timezone = 'Australia/Sydney';
	let busy = false;
	let error = '';
	let message = '';
	let awards = [];
	let awardsTotal = 0;
	let awardsSearch = '';
	let awardOffset = 0;
	let loadingAwards = false;
	let mounted = false;
	let readVersion = 0;
	let deliveryAward = null;
	let deliveryTime = '';
	let deliveryNote = '';
	$: member = members.find((m) => m.user_id === memberId);
	$: resolved =
		member?.membership_status === 'confirmed' && member?.household_status === 'confirmed';
	$: canRecord =
		resolved &&
		reference.trim() &&
		note.trim() &&
		!busy &&
		enabled &&
		(historical
			? mode === 'baseline'
			: policyEnabled && member.household_qualified && !member.award_recorded);
	onMount(() => {
		mounted = true;
	});
	$: if (mounted && refreshKey >= 0) loadAwards();
	async function loadAwards(offset = awardOffset) {
		const version = ++readVersion;
		loadingAwards = true;
		try {
			const result = await api('list_awards', { limit: 20, offset, search: awardsSearch.trim() });
			if (version === readVersion) {
				awards = result.awards;
				awardsTotal = result.total_awards;
				awardOffset = offset;
			}
		} catch (e) {
			if (version === readVersion) error = e.message;
		} finally {
			if (version === readVersion) loadingAwards = false;
		}
	}
	async function record() {
		if (!canRecord) return;
		busy = true;
		error = '';
		message = '';
		try {
			const result = await api('record_award', {
				household_id: member.household_id,
				programme,
				original_user_id: member.user_id,
				reference: reference.trim(),
				historical,
				awarded_at: localDateTimeToISO(awarded, timezone),
				delivered_at: localDateTimeToISO(delivered, timezone),
				note: note.trim(),
				mode: historical ? 'baseline' : mode
			});
			message = result.already_recorded
				? 'The existing award was found. No duplicate was created.'
				: 'Backpack record saved.';
			reference = '';
			awarded = '';
			delivered = '';
			note = '';
			dispatch('saved');
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
	async function recordDelivery() {
		if (!deliveryAward || !deliveryTime || !deliveryNote.trim() || busy || !enabled) return;
		busy = true;
		error = '';
		message = '';
		try {
			await api('record_delivery', {
				award_id: deliveryAward.id,
				delivered_at: localDateTimeToISO(deliveryTime, timezone),
				note: deliveryNote.trim(),
				mode
			});
			message = 'Delivery recorded.';
			deliveryAward = null;
			deliveryTime = '';
			deliveryNote = '';
			dispatch('saved');
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
</script>

<h2>Backpack records</h2>
<p class="muted">
	Record known historical awards, allocate a new backpack to a qualified household, or record a
	delivery. Unknown historical dates stay unrecorded.
</p>
{#if error}<p class="notice error" role="alert">{error}</p>{/if}{#if message}<p
		class="notice success"
		role="status"
	>
		{message}
	</p>{/if}
<form class="panel" on:submit|preventDefault={record}>
	<h3>Record a backpack</h3>
	<p class="muted">Use the participant search above to find the household.</p>
	<label for="award-participant">Household via participant</label>
	<select id="award-participant" bind:value={memberId} disabled={busy}>
		<option value="">Choose a participant</option>
		{#each members as m}<option value={m.user_id}>{personName(m)} — {m.email}</option>{/each}
	</select>
	{#if member}<p>{addressText(member)}</p>
		{#if !resolved}<p class="notice">
				Review this household and its membership before recording an award.
			</p>{/if}{#if member.award_recorded}<p class="notice">
				This household already has a backpack record. The same reference can be checked again; a
				different award will be rejected.
			</p>{/if}{/if}
	<label for="award-kind">Record type</label>
	<select id="award-kind" bind:value={historical} disabled={busy}>
		<option value={true}>Historical award</option>
		<option value={false}>New allocation</option>
	</select>
	{#if historical && mode !== 'baseline'}<p class="notice">
			Historical imports require historical review mode.
		</p>{/if}
	{#if !historical}<p class="notice">
			A new allocation requires current qualification. Leaving the allocation time blank records the
			time this allocation is saved.
		</p>{/if}
	<div class="fields">
		<div class="field-wide">
			<label for="award-reference">Source reference / register row ID</label>
			<input id="award-reference" bind:value={reference} required maxlength="200" disabled={busy} />
		</div>
		<div>
			<label for="award-time">Award / allocation time (if known)</label>
			<input id="award-time" type="datetime-local" bind:value={awarded} disabled={busy} />
		</div>
		<div>
			<label for="award-delivered-time">Delivery time (if known)</label>
			<input
				id="award-delivered-time"
				type="datetime-local"
				bind:value={delivered}
				disabled={busy}
			/>
		</div>
		<div>
			<label for="record-timezone">Timezone for entered times</label>
			<select id="record-timezone" bind:value={timezone} disabled={busy}>
				<option value="Australia/Sydney">Australia/Sydney</option>
				<option value="UTC">UTC</option>
			</select>
		</div>
	</div>
	<label for="award-note">Provenance / review notes</label>
	<textarea id="award-note" bind:value={note} maxlength="2000" required disabled={busy} />
	<button type="submit" class="primary" disabled={!canRecord}>
		{historical ? 'Record historical award' : 'Record allocation'}
	</button>
</form>
<AwardCSVImport {api} {programme} {mode} {enabled} on:saved={() => dispatch('saved')} />
<section class="panel" aria-label="Recorded backpacks">
	<h3>Awards and deliveries</h3>
	<form class="search" on:submit|preventDefault={() => loadAwards(0)}>
		<div class="query">
			<label for="award-search">Find an award by reference, participant or property</label>
			<input id="award-search" bind:value={awardsSearch} maxlength="120" />
		</div>
		<button type="submit" disabled={loadingAwards}>Find awards</button>
	</form>
	{#if loadingAwards}<p role="status">Loading award records…</p>{/if}
	<div class="table-scroll">
		<table aria-label="Award records">
			<thead>
				<tr>
					<th>Household / contact</th>
					<th>Reference</th>
					<th>Award</th>
					<th>Delivery</th>
				</tr>
			</thead>
			<tbody>
				{#each awards as award (award.id)}<tr>
						<td>
							<span class="person">
								{award.contact_name || award.contact_email || 'Household contact not recorded'}
							</span>
							<small>{award.contact_email || ''}</small>
							<p><small>{award.members?.map((m) => personName(m)).join(', ') || ''}</small></p>
						</td>
						<td>
							{award.external_reference || 'Earlier record'}
							<br />
							<small>{award.historical ? 'Historical' : 'Allocation'}</small>
						</td>
						<td>
							{dateText(award.awarded_at)}{#if award.source_awarded_on}<br />
								<small>Register date: {award.source_awarded_on} (time unknown)</small>{/if}
						</td>
						<td>
							{#if award.delivered_at}{dateText(award.delivered_at)}{:else}<button
									type="button"
									disabled={busy}
									on:click={() => {
										deliveryAward = award;
										deliveryTime = '';
										deliveryNote = '';
									}}
								>
									Record delivery
									<span class="sr-only">for {award.external_reference || award.contact_email}</span>
								</button>{/if}
						</td>
					</tr>
				{:else}<tr>
						<td colspan="4" class="empty">No award records match this search.</td>
					</tr>{/each}
			</tbody>
		</table>
	</div>
	<div class="pager">
		<span class="muted">{awardsTotal} award records</span>
		<div class="actions">
			<button
				type="button"
				disabled={loadingAwards || awardOffset === 0}
				on:click={() => loadAwards(Math.max(0, awardOffset - 20))}
			>
				Previous awards
			</button>
			<button
				type="button"
				disabled={loadingAwards || awardOffset + 20 >= awardsTotal}
				on:click={() => loadAwards(awardOffset + 20)}
			>
				Next awards
			</button>
		</div>
	</div>
	{#if deliveryAward}<form on:submit|preventDefault={recordDelivery}>
			<h3>Delivery for {deliveryAward.external_reference || deliveryAward.contact_email}</h3>
			<label for="delivery-time">Known delivery date and time</label>
			<input
				id="delivery-time"
				type="datetime-local"
				bind:value={deliveryTime}
				required
				disabled={busy}
			/>
			<p class="muted">
				Times use {timezone}. Change the timezone in the record form above if needed.
			</p>
			<label for="delivery-note">Delivery evidence / notes</label>
			<textarea
				id="delivery-note"
				bind:value={deliveryNote}
				maxlength="2000"
				required
				disabled={busy}
			/>
			<div class="actions">
				<button
					class="primary"
					type="submit"
					disabled={busy || !deliveryTime || !deliveryNote.trim() || !enabled}
				>
					Save delivery
				</button>
				<button type="button" disabled={busy} on:click={() => (deliveryAward = null)}>
					Cancel delivery
				</button>
			</div>
		</form>{/if}
</section>
