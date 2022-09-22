<script>
	export let headingRadio;
	export let optionsArrayRadio;
	export let nameRadio;
</script>

<div>
	<h3>{headingRadio}</h3>
	<ul class="py-1 px-2 p-0 rounded-lg bg-orange-100">
		{#each optionsArrayRadio as { value, lable }}
			<li>
				<input name={nameRadio} type="radio" {value} />
				<label for={nameRadio}>{lable}</label>
			</li>
		{/each}
	</ul>
</div>
