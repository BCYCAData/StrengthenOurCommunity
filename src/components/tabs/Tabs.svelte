<script>
	export let items = [];
	export let activeTabValue = 1;

	const handleClick = (tabValue) => () => (activeTabValue = tabValue);
</script>

<ul>
	{#each items as item}
		<li class={activeTabValue === item.value ? 'active' : ''}>
			<span
				on:click={handleClick(item.value)}
				on:keydown={(event) => {
					if (event.key === 'Enter') handleClick(item.value);
				}}
			>
				{item.label}
			</span>
		</li>
	{/each}
</ul>
{#each items as item}
	{#if activeTabValue == item.value}
		<div class="box">
			<svelte:component this={item.component} />
		</div>
	{/if}
{/each}

<style>
	.box {
		/* margin-bottom: 100px; */
		padding-bottom: 40px;
		border: 1px solid #dee2e6;
		border-radius: 0 0 0.5rem 0.5rem;
		border-top: 0;
		height: 88%;
		background-color: rgb(253, 186, 116);
	}
	ul {
		display: flex;
		flex-wrap: wrap;
		padding-left: 0;
		margin-bottom: 0;
		list-style: none;
	}
	li {
		margin-bottom: -1px;
		margin-inline-end: 5px;
	}

	span {
		border: 1px solid transparent;
		border-bottom: 2px solid transparent;
		border-top-left-radius: 0.25rem;
		border-top-right-radius: 0.25rem;
		display: block;
		padding: 0.5rem 1rem;
		cursor: pointer;
	}

	span:hover {
		border-color: #e9ecef #e9ecef #dee2e6;
	}

	li > span {
		font-weight: bolder;
		background-color: rgb(0, 153, 232);
		color: rgb(245, 245, 244);
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
	}

	li.active > span {
		font-weight: bolder;
		background-color: rgb(253, 186, 116);
		color: rgb(234, 88, 12);
		border-bottom: 3px solid rgb(253, 186, 116) !important;
	}
</style>
