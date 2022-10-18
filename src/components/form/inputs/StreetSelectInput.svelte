<script>
	export let streetList;
	export let nameText;
	export let requiredText;
	export let classText;
	export let selectedStreet;
</script>

<select
	bind:value={selectedStreet}
	id={nameText}
	name={nameText}
	class={classText}
	required={requiredText}
>
	<option value="" disabled selected>Select a street name</option>
	{#each streetList as street}
		<option value={street}>
			{street}
		</option>
	{/each}
</select>
<!-- <select bind:value={selectedStreet} on:change={() => (answer = '')}>
	{#each streetList as street}
		<option value={street}>
			{street}
		</option>
	{/each}
</select> -->
