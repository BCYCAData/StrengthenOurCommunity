<script>
	import { beforeNavigate } from '$app/navigation';
	import { stayInTouchOptions } from '$lib/profileOptions';

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
	export let profileCommunity;
	/**
	 * Need to get the validAddress & searchAddress from the address challenge into a store
	 * and validate this address OR populate the address
	 */
	const validateAddress = (e) => {
		console.log('Validate address:  ', e.currentTarget.value);
	};
</script>

{#if modalVisible}
	<Modal on:exit={() => (modalVisible = !modalVisible)}>
		<SaveProfilePrompt />
	</Modal>
{/if}
<form
	id="profileCommunityForm"
	on:change={() => {
		unsaved = true;
	}}
	class="flex flex-col py-3 mx-auto w-full text-orange-900 bg-orange-300"
	action="/profile/mycommunity"
	method="POST"
>
	<!--stay_in_touch_choices -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label class="tracking-wide mr-4 mt-1 text-lg font-bold mb-1" for="stay_in_touch_choices_list">
			How would you prefer to stay in touch?
		</label>
		<div class="flex rounded-lg bg-orange-50 mx-3">
			<div class="list-none sm:text-base sm:font-semibold sm:p-1" name="stay_in_touch_choices_list">
				{#each stayInTouchOptions as { value, lable }}
					<li>
						<input
							name="stay_in_touch_choices"
							type="checkbox"
							bind:group={profileCommunity.stay_in_touch_choices}
							{value}
						/>
						<label for="stay_in_touch_choices">{lable}</label>
					</li>
				{/each}
			</div>
		</div>
	</div>

	<!-- Postal address -->
	<div class:hidden={!profileCommunity.stay_in_touch_choices.includes(5)}>
		<div class="flex flex-row mx-2">
			<div class="flex flex-col basis-7/12 mx-2">
				<label class="tracking-wide text-lg font-bold mb-1" for="postal_address_street">
					Postal address
				</label>
				<input
					type="text"
					name="postal_address_street"
					class="border w-full border-orange-700 rounded bg-orange-50 py-1 sm:text-lg"
					placeholder="Street Address"
					autocomplete="street-address"
					style="text-transform:uppercase sm:text-lg"
					on:change={(e) => {
						validateAddress(e);
					}}
					bind:value={profileCommunity.postal_address_street}
				/>
			</div>
			<div class="flex flex-col basis-3/12 mx-2">
				<label class="tracking-wide text-lg font-bold mb-1" for="postal_address_suburb">
					Suburb
				</label>
				<input
					type="text"
					name="postal_address_suburb"
					class="border w-full border-orange-700 rounded bg-orange-50 py-1 sm:text-lg"
					placeholder="Suburb"
					autocomplete=""
					style="text-transform:uppercase sm:text-lg"
					on:change={(e) => {
						validateAddress(e);
					}}
					bind:value={profileCommunity.postal_address_suburb}
				/>
			</div>
			<div class="flex flex-col basis-2/12 mx-2">
				<label class="tracking-wide text-lg font-bold mb-1" for="postal_address_postcode">
					Postcode
				</label>
				<input
					type="text"
					name="postal_address_postcode"
					class="border w-full border-orange-700 rounded bg-orange-50 py-1 sm:text-lg"
					placeholder="Postcode"
					autocomplete=""
					on:change={(e) => {
						validateAddress(e);
					}}
					bind:value={profileCommunity.postal_address_postcode}
				/>
			</div>
		</div>
	</div>

	<!-- other_comments -->
	<TextAreaInput
		lableClass="font-bold pl-4 pt-4 text-base sm:text-lg"
		headingText="If you have any other comments, add them here."
		divClass="px-4 pt-2 rounded-lg sm:text-lg"
		nameText="other_community_workshop"
		textAreaClass="w-full resize-y sm:text-lg"
		bind:inputValue={profileCommunity.other_comments}
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
				form="profileCommunityForm"
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
