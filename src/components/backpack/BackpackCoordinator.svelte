<script>
	import { tick } from 'svelte';
	import HouseholdReview from './HouseholdReview.svelte';
	import SpecialCases from './SpecialCases.svelte';
	import AwardRecords from './AwardRecords.svelte';
	import BaselineReview from './BaselineReview.svelte';
	import { coordinatorAction, liveAvailable } from '../../lib/backpackCoordinator.js';
	import './coordinator.css';
	export let initialSnapshot = null;
	export let accessState = 'disabled';
	export let workerEnabled = false;
	export let requestAction = coordinatorAction;
	let access = accessState;
	let snapshot = initialSnapshot;
	let tab = 'households';
	let search = '';
	let filter = 'all';
	let offset = 0;
	let busy = false;
	let error = '';
	let refreshKey = 0;
	let readVersion = 0;
	let pendingWrites = 0;
	const tabs = [
		['households', 'Households'],
		['cases', 'Special cases'],
		['awards', 'Backpacks'],
		['baseline', 'Baseline']
	];
	const readActions = [
		'snapshot',
		'household_details',
		'list_awards',
		'preview_household',
		'baseline_preview'
	];
	let mode = 'baseline';
	$: policy = snapshot?.policy;
	$: liveReady = liveAvailable(policy);
	$: if (mode === 'live' && !liveReady) mode = 'baseline';
	$: members = snapshot?.members || [];
	$: ready = snapshot?.readiness || {};
	$: mutationsEnabled =
		mode === 'live' ? liveReady : !policy?.email_enabled && !ready.processing_jobs;
	async function api(action, args = {}) {
		const write = !readActions.includes(action);
		if (write) pendingWrites++;
		try {
			return await requestAction(action, args);
		} catch (e) {
			if (e.status === 401 || e.status === 403) {
				access = e.status === 401 ? 'signedout' : 'forbidden';
				snapshot = null;
			}
			throw e;
		} finally {
			if (write) pendingWrites--;
		}
	}
	async function refresh(nextOffset = offset) {
		const version = ++readVersion;
		busy = true;
		error = '';
		try {
			const result = await api('snapshot', {
				limit: 25,
				offset: nextOffset,
				search: search.trim(),
				filter
			});
			if (version === readVersion) {
				snapshot = result;
				offset = nextOffset;
			}
		} catch (e) {
			if (version === readVersion) error = e.message;
		} finally {
			if (version === readVersion) busy = false;
		}
	}
	async function saved() {
		refreshKey++;
		await refresh();
	}
	async function selectTab(value) {
		if (pendingWrites || busy) return;
		tab = value;
		const nextFilter = tab === 'cases' ? 'special_case' : 'all';
		if (filter !== nextFilter) {
			filter = nextFilter;
			await refresh(0);
		}
	}
	async function tabKey(event, index) {
		let next = index;
		if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
		else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = tabs.length - 1;
		else return;
		event.preventDefault();
		await selectTab(tabs[next][0]);
		await tick();
		document.getElementById(`backpack-tab-${tabs[next][0]}`)?.focus();
	}
</script>

<div class="backpack-console">
	<header class="toolbar">
		<div>
			<p class="eyebrow">Strengthen Our Community</p>
			<h1>Backpack programme</h1>
			<p class="muted intro">
				Review households, reconcile earlier awards and prepare the programme for delivery.
			</p>
		</div>
		{#if access === 'ready'}<span
				class="badge"
				class:positive={policy?.email_enabled && workerEnabled}
			>
				{policy?.email_enabled && workerEnabled
					? 'Live email dispatch enabled'
					: 'Email sending disabled'}
			</span>{/if}
	</header>
	{#if access !== 'ready'}
		<section class="panel" aria-label="Coordinator access">
			{#if access === 'disabled'}<h2>Coordinator tools are not enabled</h2>
				<p>The programme administrator needs to enable these tools in this environment.</p>
			{:else if access === 'forbidden'}<h2>Coordinator access required</h2>
				<p>
					Your account does not have access to the backpack coordinator tools. Contact the programme
					administrator.
				</p>
			{:else if access === 'signedout'}<h2>Sign in again</h2>
				<p>Your session no longer grants access to these tools.</p>
				<a class="button" href="/auth/signin">Sign in</a>
			{:else}<h2>Coordinator tools are unavailable</h2>
				<p>
					The programme setup may not be complete, or the service may be temporarily unavailable.
				</p>{/if}
			<button type="button" on:click={() => window.location.reload()}>Try again</button>
		</section>
	{:else}
		{#if !ready.configured}<p class="notice">
				Qualification is waiting for the cutoff date and approved question rules. You can still
				prepare households and import known historical awards.
			</p>{/if}
		{#if policy?.email_enabled && !workerEnabled}<p class="notice">
				The email worker is paused. Live changes may still queue notifications for later dispatch.
			</p>{/if}
		<div class="metric-grid" aria-label="Programme readiness">
			<div class="metric">
				<strong>{ready.unresolved_memberships ?? '—'}</strong>
				<span>Memberships to review</span>
			</div>
			<div class="metric">
				<strong>{ready.missing_contacts ?? '—'}</strong>
				<span>Contacts missing</span>
			</div>
			<div class="metric">
				<strong>{ready.pending_special_cases ?? '—'}</strong>
				<span>Special cases pending</span>
			</div>
			<div class="metric">
				<strong>{ready.unassessed_accounts ?? '—'}</strong>
				<span>Accounts to assess</span>
			</div>
		</div>
		<div class="toolbar">
			<div class="mode">
				<label for="working-mode">Working mode</label>
				<select id="working-mode" bind:value={mode} disabled={pendingWrites > 0 || busy}>
					<option value="baseline">Historical review — no new emails</option>
					<option value="live" disabled={!liveReady}>
						Live programme — notification rules apply
					</option>
				</select>
			</div>
			<button type="button" disabled={busy || pendingWrites > 0} on:click={() => refresh()}>
				Refresh programme
			</button>
		</div>
		{#if mode === 'live'}<p class="notice">
				Live household reviews and special-case approvals can queue congratulations emails for newly
				qualifying households.
			</p>{:else if !mutationsEnabled}<p class="notice">
				Historical changes require email dispatch to be paused and in-flight jobs to be resolved.
				You can still view and preview records.
			</p>{/if}
		<div class="tabs" role="tablist" aria-label="Backpack coordinator sections">
			{#each tabs as item, index}<button
					id={`backpack-tab-${item[0]}`}
					role="tab"
					type="button"
					aria-selected={tab === item[0]}
					aria-controls={`backpack-panel-${item[0]}`}
					tabindex={tab === item[0] ? 0 : -1}
					disabled={pendingWrites > 0 || busy}
					on:click={() => selectTab(item[0])}
					on:keydown={(event) => tabKey(event, index)}
				>
					{item[1]}
				</button>{/each}
		</div>
		{#if error}<p class="notice error" role="alert">{error}</p>{/if}
		{#if tab !== 'baseline'}
			<form class="search" on:submit|preventDefault={() => refresh(0)}>
				<div class="query">
					<label for="participant-search">
						Find a participant by name, email, address or property
					</label>
					<input id="participant-search" bind:value={search} maxlength="120" />
				</div>
				<div class="filter">
					<label for="participant-filter">Show</label>
					<select id="participant-filter" bind:value={filter}>
						<option value="all">All participants</option>
						<option value="pending">Needs household review</option>
						<option value="special_case">Special cases</option>
						<option value="incomplete">Incomplete answers</option>
						<option value="qualified">Qualified households</option>
						<option value="awarded">Backpack recorded</option>
					</select>
				</div>
				<button type="submit" disabled={busy || pendingWrites > 0}>Find participants</button>
			</form>
			<div class="pager">
				<small>
					{snapshot.total_members || 0} matching participants{busy ? ' — loading…' : ''}
				</small>
				<div class="actions">
					<button
						type="button"
						disabled={busy || pendingWrites > 0 || !offset}
						on:click={() => refresh(Math.max(0, offset - 25))}
					>
						Previous participants
					</button>
					<button
						type="button"
						disabled={busy || pendingWrites > 0 || offset + 25 >= snapshot.total_members}
						on:click={() => refresh(offset + 25)}
					>
						Next participants
					</button>
				</div>
			</div>
		{/if}
		<section
			id="backpack-panel-households"
			role="tabpanel"
			aria-labelledby="backpack-tab-households"
			hidden={tab !== 'households'}
		>
			<HouseholdReview
				{members}
				{api}
				{mode}
				busyPage={busy}
				enabled={mutationsEnabled}
				on:saved={saved}
			/>
		</section>
		<section
			id="backpack-panel-cases"
			role="tabpanel"
			aria-labelledby="backpack-tab-cases"
			hidden={tab !== 'cases'}
		>
			<SpecialCases
				{members}
				{api}
				{mode}
				programme={policy?.programme || 'backpack'}
				enabled={mutationsEnabled}
				on:saved={saved}
			/>
		</section>
		<section
			id="backpack-panel-awards"
			role="tabpanel"
			aria-labelledby="backpack-tab-awards"
			hidden={tab !== 'awards'}
		>
			<AwardRecords
				{members}
				{api}
				{mode}
				programme={policy?.programme || 'backpack'}
				{refreshKey}
				policyEnabled={policy?.enabled}
				enabled={mutationsEnabled}
				on:saved={saved}
			/>
		</section>
		<section
			id="backpack-panel-baseline"
			role="tabpanel"
			aria-labelledby="backpack-tab-baseline"
			hidden={tab !== 'baseline'}
		>
			<BaselineReview {snapshot} {api} on:saved={saved} />
		</section>
	{/if}
</div>
