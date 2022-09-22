<script>
	import { beforeNavigate } from '$app/navigation';
	import { communityWorkshopOptions } from '$lib/profileOptions';

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

	export let profileWorkshops;
</script>

{#if modalVisible}
	<Modal on:exit={() => (modalVisible = !modalVisible)}>
		<SaveProfilePrompt />
	</Modal>
{/if}
<form
	id="profileWorkshopsForm"
	on:change={() => {
		unsaved = true;
	}}
	class="flex flex-col py-3 mx-auto w-full text-orange-900 bg-orange-300"
	action="/profile/mycommunity/workshops"
	method="POST"
>
	<!-- community_workshop_choices -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label class="mt-1 text-lg font-bold mb-1" for="community_workshop_choices_list">
			Which of these community initiated workshops <br />
			would be useful to you?
		</label>
		<div class="flex flex-col rounded-lg bg-orange-50 p-1">
			{#each communityWorkshopOptions as { value, lable }}
				<li
					class="list-none sm:text-base sm:font-semibold sm:p-1"
					name="community_workshop_choices"
				>
					<input
						name="community_workshop_choices"
						type="checkbox"
						bind:group={profileWorkshops.community_workshop_choices}
						{value}
					/>
					<label for="community_workshop_choices">{lable}</label>
				</li>
			{/each}
		</div>
	</div>

	<!-- other_community_workshop -->
	<TextAreaInput
		lableClass="font-bold pl-4 pt-4 text-base sm:text-lg"
		headingText="If there are other workshops that you would like to see run, please add
			the details here"
		divClass="px-4 pt-2 rounded-lg sm:text-lg"
		nameText="other_community_workshop"
		textAreaClass="w-full resize-y sm:text-lg"
		bind:inputValue={profileWorkshops.other_community_workshop}
	/>

	<!-- will_run_community_workshops -->
	<TextAreaInput
		lableClass="font-bold pl-4 pt-4 text-base sm:text-lg"
		headingText="If you would like to help run any of the workshops, please indicate which
			ones below."
		divClass="px-4 pt-2 rounded-lg sm:text-lg"
		nameText="will_run_community_workshops"
		textAreaClass="w-full resize-y sm:text-lg"
		bind:inputValue={profileWorkshops.will_run_community_workshops}
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
				form="profileWorkshopsForm"
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
