<script>
	import { beforeNavigate } from '$app/navigation';
	import {
		staticWaterOptions,
		yesNoMaybeOptions,
		fireFightingResources,
		fireHazardReductionOptions
	} from '$lib/profileOptions';

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
	export let profileResources;
	let noneChecked = false;

	let selectedStaticSources = new Set();
	const unCheckAllStaticWater = (e) => {
		if (e.currentTarget.checked) {
			for (const source of selectedStaticSources) {
				source.checked = false;
			}
			selectedStaticSources.clear();
			noneChecked = true;
		}
	};
	const setStaticWater = (e) => {
		if (e.currentTarget.checked) {
			selectedStaticSources.add(e.currentTarget);
		} else {
			selectedStaticSources.delete(e.currentTarget);
		}
		if (noneChecked) {
			noneChecked = false;
		}
	};
</script>

{#if modalVisible}
	<Modal on:exit={() => (modalVisible = !modalVisible)}>
		<SaveProfilePrompt />
	</Modal>
{/if}
<form
	id="profileResourcesForm"
	on:change={() => {
		unsaved = true;
	}}
	class="flex flex-col py-3 mx-auto w-full text-orange-900 bg-orange-300"
	action="/profile/myplace/resources"
	method="POST"
>
	<!-- <div class="flex flex-row">
			<div class="w-1/2" />
			<button
				class="w-1/4 mx-3 mb-3 rounded-lg text-base font-semibold bg-[#0099E8] text-stone-100 border border-purple-700"
				on:click={() => {
					unsaved = false;
				}}
				hidden={!unsaved}
				type="submit"
				form="profileResourcesForm"
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
		</div> -->

	<!-- static_water_available -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label class="tracking-wide mr-4 mt-1 text-lg font-bold mb-1" for="static_water_available_list">
			Are there any static water supplies on the property?
		</label>
		<div class="flex rounded-lg bg-orange-50 mx-3">
			<div
				class="list-none sm:text-base sm:font-semibold sm:p-1"
				name="static_water_available_list"
			>
				{#each staticWaterOptions as { value, lable }}
					<li class="justify-start place-items-center" name="static_water_available_list">
						{#if value < 5}
							<input
								name="static_water_available"
								type="checkbox"
								bind:group={profileResources.static_water_available}
								{value}
								on:change={(e) => {
									setStaticWater(e);
								}}
							/>
						{:else}
							<input
								name="static_water_available"
								type="checkbox"
								bind:group={profileResources.static_water_available}
								{value}
								on:change={(e) => {
									unCheckAllStaticWater(e);
								}}
								checked={noneChecked}
							/>
						{/if}
						<label for="static_water_available">{lable}</label>
					</li>
				{/each}
			</div>
		</div>
	</div>

	<!-- have_stortz -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label class="tracking-wide mr-4 mt-1 text-lg font-bold mb-1" for="have_stortz_list">
			Do you have a Stortz fitting attached to a water tank?
		</label>
		<div class="flex flex-row rounded-lg bg-orange-50 p-1 mx-2">
			{#each yesNoMaybeOptions as { value, lable }}
				<li class="list-none sm:text-base sm:font-semibold sm:p-1" name="have_stortz_list">
					<input
						on:change={() => {
							profileResources.have_stortz = value;
							console.log(value);
						}}
						name="have_stortz"
						type="radio"
						bind:group={profileResources.have_stortz}
						{value}
					/>
					<label for="have_stortz">{lable}</label>
				</li>
			{/each}
		</div>
	</div>
	{profileResources.have_stortz}
	<!-- stortz_size -->
	<div class:hidden={profileResources.have_stortz !== 'Y'}>
		<div class="flex flex-row justify-start items-center px-4 mt-2">
			<label class="mt-1 text-lg font-bold mb-1" for="stortz_size">
				Please include the size (mm)
			</label>
			<input
				type="number"
				id="stortz_size"
				name="stortz_size"
				class="border border-orange-700 w-20 rounded ml-4 py-1 sm:text-lg"
				bind:value={profileResources.stortz_size}
			/>
		</div>
	</div>

	<!-- fire_fighting_resources -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label
			class="tracking-wide mr-4 mt-1 text-lg font-bold mb-1"
			for="fire_fighting_resources_list"
		>
			Do you have any of the following at this property?
		</label>
		<div class="flex rounded-lg bg-orange-50 mx-3">
			<div
				class="list-none sm:text-base sm:font-semibold sm:p-1"
				name="fire_fighting_resources_list"
			>
				{#each fireFightingResources as { value, lable }}
					<li
						class="list-none sm:text-base sm:font-semibold sm:p-1"
						name="fire_fighting_resources_list"
					>
						<input
							name="fire_fighting_resources"
							type="checkbox"
							bind:group={profileResources.fire_fighting_resources}
							{value}
						/>
						<label for="fire_fighting_resources">{lable}</label>
					</li>
				{/each}
			</div>
		</div>
	</div>

	<!-- fire_hazard_reduction -->
	<div class="flex flex-row justify-between items-center px-4 mt-2">
		<label class="tracking-wide mr-4 mt-1 text-lg font-bold mb-1" for="fire_hazard_reduction_list">
			Does your property have?
		</label>
		<div class="flex rounded-lg bg-orange-50 mx-3">
			<div class="list-none sm:text-base sm:font-semibold sm:p-1" name="fire_hazard_reduction_list">
				{#each fireHazardReductionOptions as { value, lable }}
					<li>
						<input
							name="fire_hazard_reduction"
							type="checkbox"
							bind:group={profileResources.fire_hazard_reduction}
							{value}
						/>
						<label for="fire_hazard_reduction">{lable}</label>
					</li>
				{/each}
			</div>
		</div>
	</div>
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
				form="profileResourcesForm"
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
