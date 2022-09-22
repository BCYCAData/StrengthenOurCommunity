<script>
	import { beforeNavigate } from '$app/navigation';
	import { informationSheetOptions } from '$lib/profileOptions';

	import TextAreaInput from '$components/form/inputs/TextAreaInput.svelte';

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

	export let profileInformation;
</script>

{#if modalVisible}
	<Modal on:exit={() => (modalVisible = !modalVisible)}>
		<SaveProfilePrompt />
	</Modal>
{/if}
<form
	id="profileInformationForm"
	on:change={() => {
		unsaved = true;
	}}
	class="flex flex-col py-3 mx-auto w-full text-orange-900 bg-orange-300"
	action="/profile/mycommunity/information"
	method="POST"
>
	<div class="w-1/2" />
	<button
		class="w-1/4 mx-3 mb-3 rounded-lg text-base font-semibold bg-[#0099E8] text-stone-100 border border-purple-700"
		on:click={() => {
			unsaved = false;
		}}
		hidden={!unsaved}
		type="submit"
		form="profileInformationForm"
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

	<!-- information_sheet_choices -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label class="mt-1 text-orange-900 text-l font-bold mb-1" for="information_sheet_choices_list">
			What information would be useful to you?
		</label>
		<div class="flex flex-col rounded-lg bg-orange-50 p-1">
			{#each informationSheetOptions as { value, lable }}
				<li
					class="list-none sm:text-base sm:font-semibold sm:p-1"
					name="information_sheet_choices_list"
				>
					<input
						name="information_sheet_choices"
						type="checkbox"
						bind:group={profileInformation.information_sheet_choices}
						{value}
					/>
					<label for="information_sheet_choices">{lable}</label>
				</li>
			{/each}
		</div>
	</div>

	<!-- other_information_sheet -->
	<TextAreaInput
		lableClass="font-bold pl-4 pt-4 text-base sm:text-lg"
		headingText="Is there other information which you would find useful?"
		divClass="px-4 pt-2 rounded-lg sm:text-lg"
		nameText="other_information_sheet"
		textAreaClass="w-full resize-y sm:text-lg"
		bind:inputValue={profileInformation.other_information_sheet}
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
				form="profileInformationForm"
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
