<script>
	import {
		siteHazardsOptions,
		fireHazardReductionOptions,
		yesNoMaybeOptions
	} from '$lib/profileOptions';
	import TextAreaInput from '../inputs/TextAreaInput.svelte';

	export let surveyData;
</script>

<h3 class="text-base sm:text-lg">Do you have any of the following on your property?</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	<ul class="list-none w-full pl-0  my-0">
		{#each siteHazardsOptions as { value, lable }}
			<li class="sm:text-lg pr-3">
				<input name="site_hazards" type="checkbox" {value} />
				<label for="site_hazards">{lable}</label>
			</li>
		{/each}
	</ul>
</div>
<TextAreaInput
	lableClass="font-bold text-base sm:text-lg"
	headingText="Are there any other hazards on the property that should be noted?"
	divClass="p-3 rounded-lg bg-orange-300 sm:text-lg"
	nameText="other_site_hazards"
	textAreaClass="w-full resize-y sm:text-lg"
	bind:inputValue={surveyData.other_site_hazards}
/>
<h3 class="text-base sm:text-lg">Does your property have?</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	<ul class="list-none w-full pl-0 my-0">
		{#each fireHazardReductionOptions as { value, lable }}
			<li class="sm:text-lg pr-3">
				<input
					name="fire_hazard_reduction"
					type="checkbox"
					bind:group={surveyData.fire_hazard_reduction}
					{value}
				/>
				<label for="fire_hazard_reduction">{lable}</label>
			</li>
		{/each}
	</ul>
</div>
<h3 class="text-base sm:text-lg">Does any adjoining land represent a hazard?</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	{#each yesNoMaybeOptions as { value, lable }}
		<li class="list-none sm:text-lg pr-3">
			<input
				name="land_adjacent_hazard"
				type="radio"
				bind:group={surveyData.land_adjacent_hazard}
				{value}
			/>
			<label for="land_adjacent_hazard">{lable}</label>
		</li>
	{/each}
</div>
<TextAreaInput
	lableClass="font-bold text-base sm:text-lg"
	headingText="Are there other areas that concern you or represent a potential threat?"
	divClass="p-3 rounded-lg bg-orange-300 sm:text-lg"
	nameText="other_hazards"
	textAreaClass="w-full resize-y sm:text-lg"
	bind:inputValue={surveyData.other_hazards}
/>
