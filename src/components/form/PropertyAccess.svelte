<script>
	export let answers;
	export let prefix = 'property-access';
	const restrictions = [
		[1, 'Locked gates'],
		[2, 'Coded gates'],
		[3, 'Electric gates']
	];
	$: selected = (answers.property_access_restrictions || []).map(Number);
	function select(value, checked) {
		answers.property_access_restrictions = checked
			? [...new Set([...selected, value])]
			: selected.filter((item) => item !== value);
	}
</script>

<fieldset class="access">
	<legend>Is access to your property restricted?</legend>
	<p>Answer Yes or No. You can save unanswered questions and return to them later.</p>
	{#each [[true, 'Yes'], [false, 'No']] as [value, label]}
		<label for={`${prefix}-${label}`}>
			<input
				id={`${prefix}-${label}`}
				type="radio"
				name="property_access_restricted"
				{value}
				bind:group={answers.property_access_restricted}
				aria-controls={`${prefix}-restrictions`}
				aria-expanded={answers.property_access_restricted === true}
			/>
			{label}
		</label>
	{/each}
	<fieldset id={`${prefix}-restrictions`} hidden={answers.property_access_restricted !== true}>
		<legend>If yes, please select the restrictions that apply</legend>
		{#each restrictions as [value, label]}
			<label for={`${prefix}-restriction-${value}`}>
				<input
					id={`${prefix}-restriction-${value}`}
					type="checkbox"
					name="property_access_restrictions"
					{value}
					checked={selected.includes(value)}
					disabled={answers.property_access_restricted !== true}
					on:change={(event) => select(value, event.currentTarget.checked)}
				/>
				{label}
			</label>
		{/each}
	</fieldset>
</fieldset>

<style>
	.access {
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
	fieldset fieldset {
		padding: 0.5rem;
		margin-top: 0.5rem;
	}
</style>
