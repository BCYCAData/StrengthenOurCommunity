<script>
	import { yesNoMaybeOptions, yesNoOptions } from '$lib/profileOptions';
	import NumberInput from '$components/form/inputs/NumberInput.svelte';
	import TextAreaInput from '../inputs/TextAreaInput.svelte';

	export let surveyData;

	let live_stock_present = surveyData.live_stock_present;
	let live_stock_safe_area = surveyData.live_stock_safe_area;
</script>

<h3 class="text-base sm:text-lg">Please record the number of pets you have on this property</h3>
<div class="p-2 rounded-lg bg-orange-300">
	<ul class="flex pl-0 m-0 justify-start list-none sm:text-lg">
		<NumberInput
			name="number_dogs"
			lable="Dogs"
			lableClass="sm:text-lg"
			inputClass="border border-orange-700 w-20 rounded sm:text-lg"
			bind:inputValue={surveyData.number_dogs}
		/>
		<NumberInput
			name="number_cats"
			lable="Cats"
			lableClass="sm:text-lg"
			inputClass="border border-orange-700 w-20 rounded sm:text-lg"
			bind:inputValue={surveyData.number_cats}
		/>
		<NumberInput
			name="number_birds"
			lable="Birds"
			lableClass="sm:text-lg"
			inputClass="border border-orange-700 w-20 rounded sm:text-lg"
			bind:inputValue={surveyData.number_birds}
		/>
		<NumberInput
			name="number_other_pets"
			lable="Other"
			lableClass="sm:text-lg"
			inputClass="border border-orange-700 w-20 rounded sm:text-lg"
			bind:inputValue={surveyData.number_other_pets}
		/>
	</ul>
</div>
<h3 class="text-base sm:text-lg">Do you have livestock?</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	{#each yesNoOptions as { value, lable }}
		<li class="list-none sm:text-lg pr-3">
			<input
				on:change={() => {
					live_stock_present = value;
				}}
				name="live_stock_present"
				type="radio"
				bind:group={surveyData.live_stock_present}
				{value}
			/>
			<label for="live_stock_present">{lable}</label>
		</li>
	{/each}
</div>

{#if live_stock_present === true}
	<h3 class="text-base sm:text-lg">
		Do you have an area which would be safe for stock in the event of a bushfire or flood?
	</h3>
	<div class="p-2 flex justify-start rounded-lg bg-orange-300">
		{#each yesNoMaybeOptions as { value, lable }}
			<li class="list-none sm:text-lg pr-3">
				<input
					on:change={() => {
						live_stock_safe_area = value;
					}}
					name="live_stock_safe_area"
					type="radio"
					bind:group={surveyData.live_stock_safe_area}
					{value}
				/>
				<label for="live_stock_safe_area">{lable}</label>
			</li>
		{/each}
	</div>
	{#if live_stock_present && live_stock_safe_area != 'N'}
		<h3 class="text-base sm:text-lg">
			Would you be happy for other people to leave their stock on your property, in your safe area,
			for a short period in an emergency?
		</h3>
		<div class="p-2 flex justify-start rounded-lg bg-orange-300">
			{#each yesNoMaybeOptions as { value, lable }}
				<li class="list-none sm:text-lg pr-3">
					<input
						name="share_livestock_safe_area"
						type="radio"
						live_stock_present
						bind:group={surveyData.share_livestock_safe_area}
						{value}
					/>
					<label for="share_livestock_safe_area">{lable}</label>
				</li>
			{/each}
		</div>
	{/if}
{/if}

<TextAreaInput
	lableClass="font-bold text-base sm:text-lg"
	headingText="If there are assets, other than the residence, that you consider essential (eg crops, sheds with equipment or antique cars) please describe them here."
	divClass="p-2 rounded-lg bg-orange-300 sm:text-lg"
	nameText="other_essential_assets"
	textAreaClass="w-full resize-y sm:text-lg"
	bind:inputValue={surveyData.other_essential_assets}
/>

<style>
	ul {
		margin-block-start: 10px;
		margin-block-end: 10px;
		padding-inline-start: 20px;
	}
</style>
