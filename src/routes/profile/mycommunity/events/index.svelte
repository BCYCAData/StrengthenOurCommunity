<script>
	import { beforeNavigate } from '$app/navigation';
	import { communityMeetingOptions } from '$lib/profileOptions';

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

	export let profileEvents;
</script>

{#if modalVisible}
	<Modal on:exit={() => (modalVisible = !modalVisible)}>
		<SaveProfilePrompt />
	</Modal>
{/if}
<form
	id="profileEventsForm"
	on:change={() => {
		unsaved = true;
	}}
	class="flex flex-col py-3 mx-auto w-full text-orange-900 bg-orange-300"
	action="/profile/mycommunity/events"
	method="POST"
>
	<!-- community_meeting_choices -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label class="mt-1 text-lg font-bold mb-1" for="community_meeting_choices_list">
			What Community Events are you interested in?
		</label>
		<div class="flex flex-col rounded-lg bg-orange-50 p-1">
			{#each communityMeetingOptions as { value, lable }}
				<li
					class="list-none sm:text-base sm:font-semibold sm:p-1"
					name="community_meeting_choices_list"
				>
					<input
						name="community_meeting_choices"
						type="checkbox"
						bind:group={profileEvents.community_meeting_choices}
						{value}
					/>
					<label for="community_meeting_choices">{lable}</label>
				</li>
			{/each}
		</div>
	</div>

	<!-- other_community_meeting -->
	<TextAreaInput
		lableClass="font-bold pl-4 pt-4 text-base sm:text-lg"
		headingText="If there are other events you would be interested in, please add them
			below."
		divClass="px-4 pt-2 rounded-lg sm:text-lg"
		nameText="other_community_meeting"
		textAreaClass="w-full resize-y sm:text-lg"
		bind:inputValue={profileEvents.other_community_meeting}
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
				form="profileEventsForm"
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
