<script>
	import { onMount } from 'svelte';
	import { dateText } from '../../lib/backpackCoordinator.js';
	export let api;
	export let refreshKey = 0;
	let status = 'all',
		offset = 0,
		result = null,
		busy = false,
		error = '',
		mounted = false;
	onMount(() => {
		mounted = true;
	});
	$: if (mounted && refreshKey >= 0) load(0);
	async function load(next = offset) {
		if (busy) return;
		busy = true;
		error = '';
		try {
			result = await api('list_notifications', { limit: 25, offset: next, status });
			offset = next;
		} catch (e) {
			error = e.message;
		} finally {
			busy = false;
		}
	}
</script>

<h2>Email operations</h2>
<p>
	Accepted means the provider acknowledged the request; it does not confirm inbox delivery.
	Uncertain deliveries require provider reconciliation before any manual retry.
</p>
<form class="search" on:submit|preventDefault={() => load(0)}>
	<label for="notification-status">Notification status</label>
	<select id="notification-status" bind:value={status}>
		{#each ['all', 'pending', 'processing', 'accepted', 'failed', 'needs_review', 'suppressed'] as value}<option
				{value}
			>
				{value.replaceAll('_', ' ')}
			</option>{/each}
	</select>
	<button type="submit" disabled={busy}>Refresh email history</button>
</form>
{#if error}<p class="notice error" role="alert">{error}</p>{/if}
{#if result}
	<p>{result.total} notifications. Internal processing errors: {result.processing_error_count}.</p>
	<div
		class="table-scroll history-scroll"
		role="region"
		aria-label="Notification history scroll area"
		{...{ tabindex: 0 }}
	>
		<table aria-label="Backpack email history">
			<thead>
				<tr>
					<th scope="col">Household / event</th>
					<th scope="col">Recipient</th>
					<th scope="col">Status</th>
					<th scope="col">Attempts</th>
					<th scope="col">Next attempt</th>
					<th scope="col">Provider acceptance</th>
					<th scope="col">Review information</th>
				</tr>
			</thead>
			<tbody>
				{#each result.notifications as row (row.id)}<tr>
						<th scope="row">
							{row.household_id}
							<br />
							<small>{row.kind} · {dateText(row.created_at)}</small>
						</th>
						<td>
							{row.recipient_email || 'Contact needs review'}
							<br />
							<small>{row.recipient_state || ''}</small>
							<br />
							<small>BCC: {row.coordinator_bcc || 'Not configured'}</small>
						</td>
						<td>{row.status.replaceAll('_', ' ')}</td>
						<td>{row.attempts}</td>
						<td>{row.status === 'pending' ? dateText(row.available_at) : '—'}</td>
						<td>
							{dateText(row.accepted_at)}
							<br />
							<small>{row.provider_id || ''}</small>
						</td>
						<td>{row.last_error || '—'}</td>
					</tr>{:else}<tr><td colspan="7">No notifications match this status.</td></tr>{/each}
			</tbody>
		</table>
	</div>
	<div class="actions">
		<button
			type="button"
			disabled={busy || !offset}
			on:click={() => load(Math.max(0, offset - 25))}
		>
			Previous emails
		</button>
		<button
			type="button"
			disabled={busy || offset + 25 >= result.total}
			on:click={() => load(offset + 25)}
		>
			Next emails
		</button>
	</div>
{/if}

<style>
	.history-scroll {
		max-block-size: min(32rem, 70vh);
		container-type: inline-size;
	}
	table {
		border-collapse: separate;
		border-spacing: 0;
	}
	thead {
		position: sticky;
		inset-block-start: 0;
		z-index: 1;
	}
	tbody th {
		position: sticky;
		inset-inline-start: 0;
		background: #fff8ed;
		white-space: nowrap;
	}
	.history-scroll:focus-visible {
		outline: 3px solid #16534a;
		outline-offset: 3px;
	}
</style>
