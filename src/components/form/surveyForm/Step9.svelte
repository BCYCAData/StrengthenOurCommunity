<script>
	import { informationSheetOptions } from '$lib/profileOptions';
	import TextAreaInput from '../inputs/TextAreaInput.svelte';

	export let surveyData;
</script>

<h3 class="text-base sm:text-lg">What information would be useful to you?</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	<ul class="list-none w-full pl-0 my-0">
		{#each informationSheetOptions as { value, lable }}
			<li class="sm:text-lg pr-3">
				<input
					name="information_sheet_choices"
					type="checkbox"
					bind:group={surveyData.information_sheet_choices}
					{value}
				/>
				<label for="information_sheet_choices">{lable}</label>
			</li>
		{/each}
	</ul>
</div>

<TextAreaInput
	lableClass="font-bold text-base sm:text-lg"
	headingText="Is there other information which you would find useful?"
	divClass="p-2 rounded-lg bg-orange-300 sm:text-lg"
	nameText="other_information_sheet"
	textAreaClass="w-full resize-y sm:text-lg"
	bind:inputValue={surveyData.other_information_sheet}
/>
