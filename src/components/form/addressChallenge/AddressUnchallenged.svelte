<script>
	// @ts-nocheck

	import Spinner from '$components/Spinner.svelte';
	import { PIP } from '$lib/spatialUtils';
	import communityPolygons from '$lib/geojsonData/communities';
	import { suburbAliases } from '$lib/utils';

	export let streetaddress;
	export let suburb;
	export let searchAddress;
	export let unchallenged;
	export let status;
	export let validAddress;
	export let community;

	let loading = false;

	async function submitForm() {
		loading = !loading;
		searchAddress = `${streetaddress.toUpperCase()}, ${suburb.toUpperCase()}`;
		let found = [];
		let notFound = [];

		const aliases = suburbAliases(streetaddress.toUpperCase(), suburb.toUpperCase());
		for (let address of aliases) {
			const response = await fetch('/api/data/propertyNSWSS', {
				method: 'POST',
				body: JSON.stringify({ address })
			});
			if (response.status === 400) {
				error = ['addressError', response];
			} else if (response.status === 404) {
				notFound = ['addressNotFound', response];
			} else if (response.status === 500) {
				notFound = ['serviceNotAvailable', response.json()];
			} else {
				found = ['addressFound', await response.json()];
			}
		}
		if (found.length === 2) {
			for (let i = 0; i < communityPolygons.features.length; i++) {
				let polygon = communityPolygons.features[i].geometry.coordinates[0];
				let ok = PIP(polygon[0], found[1].point);
				unchallenged = false;
				if (ok) {
					status = 'addressValid';
					community = communityPolygons.features[i].properties.Community;
					validAddress = found[1].address;
				} else {
					status = 'addressInvalid';
				}
			}
		} else if (notFound.length > 0) {
			unchallenged = true;
			status = notFound[0];
		} else {
			unchallenged = true;
			status = 'addressError';
		}
		loading = !loading;
	}
</script>

{#if loading}
	<Spinner />
{/if}

{#if status === 'addressNotFound'}
	<h2 class=" text-center mt-5">This address could not be found.</h2>
{:else}
	<h2 class=" text-center mt-5">Membership is restricted to specific Communities</h2>
	<p class="text-center mb-2">
		Please enter your Street Address and Suburb to check your qualification
	</p>
{/if}

<form on:submit|preventDefault={submitForm}>
	<input
		id="streetaddress"
		type="text"
		class="block border border-orange-700 w-full py-3 rounded mb-1"
		name="streetaddress"
		required={true}
		placeholder="Street Address"
		autocomplete="street-address"
		style="text-transform:uppercase"
		bind:value={streetaddress}
	/>
	<div class="flex justify-between">
		<input
			id="suburb"
			type="text"
			class=" border max-w-1/2 border-orange-700 w-30% object-left py-3 rounded mb-1"
			name="suburb"
			required
			placeholder="Suburb"
			autocomplete="address-level2"
			style="text-transform:uppercase"
			bind:value={suburb}
		/>
		<button
			type="submit"
			class="w-24 m-4 text-center py-1 rounded-full  cursor-pointer bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1"
		>
			Check
		</button>
	</div>
</form>
