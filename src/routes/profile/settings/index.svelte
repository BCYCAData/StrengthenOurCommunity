<script>
	import { beforeNavigate } from '$app/navigation';

	import Modal from '$components/Modal.svelte';
	import SaveProfilePrompt from '$components/form/SaveProfilePrompt.svelte';

	let unsaved = false;
	let modalVisible = false;

	beforeNavigate(({}) => {
		if (!unsaved) return;
		modalVisible = !modalVisible;
	});
</script>

{#if modalVisible}
	<Modal on:exit={() => (modalVisible = !modalVisible)}>
		<SaveProfilePrompt />
	</Modal>
{/if}
<form
	id="settingsForm"
	on:change={() => {
		unsaved = true;
	}}
	class="flex flex-col py-3 mx-auto w-full text-orange-900 bg-orange-300"
	action="/profile/settings"
	method="POST"
>
	<div class="flex flex-row mx-2 tracking-wide text-lg font-bold mb-1" for="postal_address_street">
		In this section you can change your password and / or email address.
	</div>

	<button
		on:click={() => {
			unsaved = false;
		}}
		hidden={!unsaved}
		type="submit"
		form="settingsForm"
	>
		Save My Answers
	</button>
</form>
