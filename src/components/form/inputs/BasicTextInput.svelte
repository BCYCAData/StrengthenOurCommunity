<script>
	export let headingText;
	export let nameText;
	export let requiredText;
	export let placeholderText;
	export let autocompleteText;
</script>

<div>
	<h3>{headingText}</h3>
	<div class="py-2 px-2 p-0 rounded-lg bg-orange-100">
		<input
			type="text"
			id={nameText}
			name={nameText}
			class="block border w-full max-w-3xl border-orange-700 p-1 rounded"
			required={requiredText}
			placeholder={placeholderText}
			autocomplete={autocompleteText}
		/>
	</div>
</div>
