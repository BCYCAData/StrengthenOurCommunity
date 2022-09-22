<script>
	import { beforeNavigate } from '$app/navigation';
	import { yesNoOptions, yesNoMaybeOptions } from '$lib/profileOptions';

	import TextAreaInput from '$components/form/inputs/TextAreaInput.svelte';
	import NumberInput from '$components/form/inputs/NumberInput.svelte';
	import Modal from '$components/Modal.svelte';
	import SaveProfilePrompt from '$components/form/SaveProfilePrompt.svelte';

	let unsaved = false;
	let modalVisible = false;

	beforeNavigate(async ({ cancel }) => {
		if (unsaved) {
			cancel();
			modalVisible = !modalVisible;
		}
	});

	export let profileAssets;
</script>

{#if modalVisible}
	<Modal on:exit={() => (modalVisible = !modalVisible)}>
		<SaveProfilePrompt />
	</Modal>
{/if}
<form
	id="profileAssetsForm"
	on:change={() => {
		unsaved = true;
	}}
	class="flex flex-col py-3 mx-auto w-full text-orange-900 bg-orange-300"
	action="/profile/myplace/assets"
	method="POST"
>
	<!-- number_dog number_cats number_birds number_other_pets -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label class="mt-1 text-lg font-bold mb-1" for="animals_profile">
			How many pets do you usually have at this property?
		</label>
		<div
			class="flex flex-row justify-around list-none rounded-lg bg-orange-50 p-1 mx-2"
			name="animals_profile"
		>
			<NumberInput
				name="number_dogs"
				lable="Dogs"
				lableClass="tracking-wide text-orange-900 px-2 text-l font-bold mb-1"
				inputClass="border border-orange-700 w-10 rounded py-1 sm:text-lg"
				bind:inputValue={profileAssets.number_dogs}
			/>
			<NumberInput
				name="number_cats"
				lable="Cats"
				lableClass="tracking-wide text-orange-900 px-2 text-l font-bold mb-1"
				inputClass="border border-orange-700 w-10 rounded py-1 sm:text-lg"
				bind:inputValue={profileAssets.number_cats}
			/>
			<NumberInput
				name="number_birds"
				lable="Birds"
				lableClass="tracking-wide text-orange-900 px-2 text-l font-bold mb-1"
				inputClass="border border-orange-700 w-10 rounded py-1 sm:text-lg"
				bind:inputValue={profileAssets.number_birds}
			/>
			<NumberInput
				name="number_other_pets"
				lable="Other"
				lableClass="tracking-wide text-orange-900 px-2 text-l font-bold mb-1"
				inputClass="border border-orange-700 w-10 rounded py-1 sm:text-lg"
				bind:inputValue={profileAssets.number_other_pets}
			/>
		</div>
	</div>

	<!-- live_stock_present -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label class="mt-1 text-lg font-bold mb-1" for="live_stock_present_list">
			Do you have livestock?
		</label>
		<div class="flex flex-row rounded-lg bg-orange-50 p-1 mx-2">
			{#each yesNoOptions as { value, lable }}
				<li class="list-none sm:text-base sm:font-semibold sm:p-1" name="live_stock_present_list">
					<input
						name="live_stock_present"
						type="radio"
						bind:group={profileAssets.live_stock_present}
						{value}
					/>
					<label for="live_stock_present">{lable}</label>
				</li>
			{/each}
		</div>
	</div>

	<!-- live_stock_safe_area -->
	<div class:hidden={profileAssets.live_stock_present != true}>
		<div class="flex flex-row justify-between items-center px-4 mt-2">
			<label class="mt-1 text-lg font-bold mb-1" for="live_stock_safe_area_list">
				Do you have a safe area for stock in the event of a bushfire or flood?
			</label>
			<div class="flex flex-row rounded-lg bg-orange-50 p-1">
				{#each yesNoMaybeOptions as { value, lable }}
					<li
						class="list-none sm:text-base sm:font-semibold sm:p-1"
						name="live_stock_safe_area_list"
					>
						<input
							name="live_stock_safe_area"
							type="radio"
							bind:group={profileAssets.live_stock_safe_area}
							{value}
						/>
						<label for="live_stock_safe_area">{lable}</label>
					</li>
				{/each}
			</div>
		</div>
	</div>

	<!-- share_livestock_safe_area -->
	<div class:hidden={profileAssets.live_stock_safe_area !== 'Y'}>
		<div class="flex flex-row justify-between items-center px-4 mt-2">
			<label class="mt-1 text-lg font-bold mb-1" for="share_livestock_safe_area_list">
				Would you let others leave their stock in your safe area, for a short time, in an emergency?
			</label>
			<div class="flex flex-row rounded-lg bg-orange-50 p-1 mx-2">
				{#each yesNoMaybeOptions as { value, lable }}
					<li
						class="list-none sm:text-base sm:font-semibold sm:p-1"
						name="share_livestock_safe_area_list"
					>
						<input
							name="share_livestock_safe_area"
							type="radio"
							bind:group={profileAssets.share_livestock_safe_area}
							{value}
						/>
						<label for="share_livestock_safe_area">{lable}</label>
					</li>
				{/each}
			</div>
		</div>
	</div>
	<TextAreaInput
		lableClass="font-bold px-4 pt-4 text-base sm:text-lg"
		headingText="If there are assets, other than the residence, that you consider essential (eg crops, sheds with equipment or antique cars) please describe them here."
		divClass="px-4 pt-2 rounded-lg sm:text-lg"
		nameText="other_essential_assets"
		textAreaClass="w-full resize-y sm:text-lg"
		bind:inputValue={profileAssets.other_essential_assets}
	/>

	<div class="sticky mt-5 bottom-2">
		<div class="flex flex-row">
			<div class="w-1/2" />
			<button
				class="w-1/4 mx-3 mb-3 rounded-lg text-base font-semibold bg-[#0099E8] text-stone-100 border border-purple-700"
				on:click={() => {
					unsaved = false;
				}}
				hidden={!unsaved}
				type="submit"
				form="profileAssetsForm"
			>
				Save My Answers
			</button>
			<button
				class="w-1/4 mx-auto mb-3 rounded-lg text-base font-semibold bg-[#27C7BD] text-stone-100 border border-purple-700"
				on:click={() => {
					unsaved = false;
					location.reload();
				}}
				hidden={!unsaved}
				type="button"
			>
				Cancel
			</button>
		</div>
	</div>
</form>
