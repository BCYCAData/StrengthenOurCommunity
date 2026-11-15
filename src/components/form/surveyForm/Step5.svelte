<script>
	import { choiceGroup } from '$lib/surveyAnswerValues';
	import {
		staticWaterOptions,
		yesNoMaybeOptions,
		fireFightingResources
	} from '$lib/profileOptions';

	export let surveyData;

	let have_stortzChecked = surveyData.have_stortz === 'Y';
</script>

<h3 class="text-base sm:text-lg">Are there any static water supplies on the property?</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	<ul class="list-none w-full pl-0 my-0">
		{#each staticWaterOptions as { value, lable }}
			<li class="sm:text-lg pr-3">
				<input
					name="static_water_available"
					type="checkbox"
					{value}
					checked={(surveyData.static_water_available || []).map(Number).includes(Number(value))}
					on:change={(event) => {
						surveyData.static_water_available = choiceGroup(
							surveyData.static_water_available,
							value,
							event.currentTarget.checked,
							5
						);
					}}
				/>
				<label for="static_water_available">{lable}</label>
			</li>
		{/each}
	</ul>
</div>

<h3 class="text-base sm:text-lg">Do you have a Stortz fitting attached to a water tank?</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	{#each yesNoMaybeOptions as { value, lable }}
		<li class="list-none sm:text-lg pr-3">
			<input
				on:change={(e) => {
					have_stortzChecked = e.currentTarget.value == 'Y';
				}}
				name="have_stortz"
				type="radio"
				bind:group={surveyData.have_stortz}
				{value}
			/>
			<label for="have_stortz">{lable}</label>
		</li>
	{/each}
</div>
{#if have_stortzChecked}
	<h3>Please include the size</h3>
	<div class="p-2 flex justify-start rounded-lg bg-orange-300">
		<label class="flex-none mr-2 sm:text-lg" for="stortz_size">Size (mm)</label>
		<input
			type="number"
			id="stortz_size"
			name="stortz_size"
			class="border border-orange-700 w-half rounded sm:text-lg"
			bind:value={surveyData.stortz_size}
		/>
	</div>
{/if}
<h3 class="text-base sm:text-lg">Do you have any of the following at this property?</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	<ul class="list-none w-full pl-0 my-0">
		{#each fireFightingResources as { value, lable }}
			<li class="sm:text-lg pr-3">
				<input
					name="fire_fighting_resources"
					type="checkbox"
					{value}
					checked={(surveyData.fire_fighting_resources || []).map(Number).includes(Number(value))}
					on:change={(event) => {
						surveyData.fire_fighting_resources = choiceGroup(
							surveyData.fire_fighting_resources,
							value,
							event.currentTarget.checked,
							0
						);
					}}
				/>
				<label for="fire_fighting_resources">{lable}</label>
			</li>
		{/each}
	</ul>
</div>
