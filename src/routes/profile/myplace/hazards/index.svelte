<script>
	import { siteHazardsOptions, yesNoMaybeOptions } from '$lib/profileOptions';
	import { beforeNavigate } from '$app/navigation';

	import Modal from '$components/Modal.svelte';
	import SaveProfilePrompt from '$components/form/SaveProfilePrompt.svelte';

	import TextAreaInput from '$components/form/inputs/TextAreaInput.svelte';

	let unsaved = false;
	let modalVisible = false;

	beforeNavigate(async ({ cancel }) => {
		if (unsaved) {
			cancel();
			modalVisible = !modalVisible;
		}
	});

	export let profileHazards;
</script>

{#if modalVisible}
	<Modal on:exit={() => (modalVisible = !modalVisible)}>
		<SaveProfilePrompt />
	</Modal>
{/if}
<form
	id="profileHazardsForm"
	on:change={() => {
		unsaved = true;
	}}
	class="flex flex-col py-3 mx-auto w-full text-orange-900 bg-orange-300"
	action="/profile/myplace/hazards"
	method="POST"
>
	<!-- site_hazards_list -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label
			class="tracking-wide mr-4 mt-1 text-orange-900 text-l font-bold mb-1"
			for="site_hazards_list"
		>
			Do you have any of the following on your property?
		</label>
		<div class="flex rounded-lg bg-orange-50 mx-3">
			<div class="tracking-wide text-lg font-bold mb-1" name="site_hazards_list">
				{#each siteHazardsOptions as { value, lable }}
					<li class="list-none sm:text-base sm:font-semibold sm:p-1" name="site_hazards_list">
						<input
							name="site_hazards"
							type="checkbox"
							bind:group={profileHazards.site_hazards}
							{value}
						/>
						<label for="site_hazards">{lable}</label>
					</li>
				{/each}
			</div>
		</div>
	</div>

	<!-- other_site_hazards -->
	<TextAreaInput
		lableClass="font-bold pl-4 pt-4 text-base sm:text-lg"
		headingText="Are there any other hazards on the property that should be noted?"
		divClass="px-4 pt-2 rounded-lg sm:text-lg"
		nameText="other_site_hazards"
		textAreaClass="w-full resize-y sm:text-lg"
		bind:inputValue={profileHazards.other_site_hazards}
	/>

	<!-- land_adjacent_hazard -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label class="tracking-wide mr-4 mt-1 text-lg font-bold mb-1" for="land_adjacent_hazard_list">
			Does any adjoining land represent a hazard?
		</label>
		<div class="flex flex-row rounded-lg bg-orange-50 p-1 mx-2">
			{#each yesNoMaybeOptions as { value, lable }}
				<li class="list-none sm:text-base sm:font-semibold sm:p-1" name="land_adjacent_hazard_list">
					<input
						name="land_adjacent_hazard"
						type="radio"
						bind:group={profileHazards.land_adjacent_hazard}
						{value}
					/>
					<label for="land_adjacent_hazard">{lable}</label>
				</li>
			{/each}
		</div>
	</div>

	<!-- other_hazards -->
	<TextAreaInput
		lableClass="font-bold pl-4 pt-4 text-base sm:text-lg"
		headingText="Are there other areas that concern you or represent a potential threat?"
		divClass="px-4 pt-2 rounded-lg sm:text-lg"
		nameText="other_hazards"
		textAreaClass="w-full resize-y sm:text-lg"
		bind:inputValue={profileHazards.other_hazards}
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
				form="profileHazardsForm"
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
