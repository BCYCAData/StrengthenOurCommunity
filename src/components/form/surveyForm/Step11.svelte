<script>
	import { stayInTouchOptions } from '$lib/profileOptions';
	import TextAreaInput from '../inputs/TextAreaInput.svelte';

	export let surveyData;
</script>

<h3 class="text-base sm:text-lg">How would you prefer to stay in touch?</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	<ul class="list-none w-full pl-0 my-0">
		{#each stayInTouchOptions as { value, lable }}
			<li class="sm:text-lg pr-3">
				<input
					name="stay_in_touch_choices"
					type="checkbox"
					bind:group={surveyData.stay_in_touch_choices}
					{value}
				/>
				<label for="stay_in_touch_choices">{lable}</label>
			</li>
		{/each}
	</ul>
</div>

<TextAreaInput
	lableClass="font-bold text-base sm:text-lg"
	headingText="Do you have any other comments that you would like to add?"
	divClass="p-2 rounded-lg bg-orange-300 sm:text-lg"
	nameText="other_comments"
	textAreaClass="w-full resize-y sm:text-lg"
	bind:inputValue={surveyData.other_comments}
/>
