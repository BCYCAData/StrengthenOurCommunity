<script>
	export let answers;
	export let prefix = 'critical-assets';
</script>

<fieldset>
	<legend>Your house may not be the only critical asset.</legend>
	<p>
		If there are others (e.g. sheds, machinery, crops, livestock), please select Yes. Otherwise
		select No.
	</p>
	{#each [[true, 'Yes'], [false, 'No']] as [value, label]}
		<label for={`${prefix}-${label}`}>
			<input
				id={`${prefix}-${label}`}
				type="radio"
				name="has_other_critical_assets"
				{value}
				bind:group={answers.has_other_critical_assets}
			/>
			{label}
		</label>
	{/each}
	{#if answers.other_essential_assets}
		<details>
			<summary>Earlier asset description (retained for reference)</summary>
			<p>{answers.other_essential_assets}</p>
		</details>
	{/if}
</fieldset>

<style>
	fieldset {
		margin: 1rem;
		padding: 1rem;
		border: 1px solid #9a5a12;
		border-radius: 0.5rem;
		background: #fff8ed;
	}
	legend {
		font-weight: 700;
		font-size: 1.125rem;
	}
	p {
		margin: 0.5rem 0;
	}
	label {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 48px;
		margin-inline-end: 1rem;
	}
	input {
		accent-color: #9a4b06;
		width: 1.1rem;
		height: 1.1rem;
	}
	input:focus-visible {
		outline: 3px solid #16534a;
		outline-offset: 3px;
	}
</style>
