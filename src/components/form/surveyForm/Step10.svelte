<script>
	import { communityMeetingOptions } from '$lib/profileOptions';
	import TextAreaInput from '../inputs/TextAreaInput.svelte';

	export let surveyData;
</script>

<h3 class="text-base sm:text-lg">What Community Events are you interested in?</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	<ul class="list-none w-full pl-0 my-0">
		{#each communityMeetingOptions as { value, lable }}
			<li class="sm:text-lg pr-3">
				<input
					name="community_meeting_choices"
					type="checkbox"
					bind:group={surveyData.community_meeting_choices}
					{value}
				/>
				<label for="community_meeting_choices">{lable}</label>
			</li>
		{/each}
	</ul>
</div>
<TextAreaInput
	lableClass="font-bold text-base sm:text-lg"
	headingText="If there are other events you would be interested in, please add them
			below."
	divClass="p-2 rounded-lg bg-orange-300 sm:text-lg"
	nameText="other_community_meeting"
	textAreaClass="w-full resize-y sm:text-lg"
	bind:inputValue={surveyData.other_community_meeting}
/>
