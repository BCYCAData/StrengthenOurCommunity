<script>
	import Spinner from '$components/Spinner.svelte';

	export let searchAddress = '';
	export let status;
	export let validAddress;
	export let community;
	export let gid;
	export let oid;
	// export let gurasid;
	// export let principaladdresssiteoid;

	let loading = false;
	let streetaddress = '';
	let suburb = '';
	let retry = '';

	let canGo = false;
	$: canGo = validateAddress(streetaddress);
	$: searchAddress = `${streetaddress.toUpperCase()} ${suburb.toUpperCase()}`;
	function validateAddress(streetaddress) {
		let streetRegEx = /^(\d+).*/;
		return streetRegEx.test(String(streetaddress).toLowerCase());
	}

	async function submitForm() {
		loading = !loading;
		let data = {};
		try {
			const response = await fetch('/api/data/validateAddress', {
				method: 'POST',
				body: JSON.stringify({
					streetAddress: streetaddress.toUpperCase(),
					suburb: suburb.toUpperCase()
				})
			});
			if (response.status === 400 || response.status === 404) {
				// Malformed query
				// status = 'unchallenged';
				status = response.status;
				retry = 'addressNotFound';
				data = await response.json();
			} else if (response.status === 401) {
				// status = 'addressEligible';
				status = response.status;
				data = await response.json();
				community = data.community_name;
				validAddress = data.address;
				oid = data.principaladdresssiteoid;
				gid = data.gurasid;
			} else if (response.status === 500 || response.status === 503) {
				// status = 'serviceNotAvailable';
				status = response.status;
				data = await response.json();
			} else if (response.status === 403) {
				// status = 'addressIneligible';
				status = response.status;
				data = await response.json();
			} else if (response.status === 200) {
				// status = 'addressValid';
				status = response.status;
				data = await response.json();
				community = data.community_name;
				validAddress = data.address;
				oid = data.principaladdresssiteoid;
				gid = data.gurasid;
			} else {
				// status = 'anErrorOccurred';
				status = 418;
			}
		} catch (error) {
			// status = 'failedToFetch';
			status = 418;
		}
		loading = !loading;
	}
</script>

{#if loading}
	<Spinner />
{/if}

{#if status === 400 || status === 404}
	<div class="bg-red-100 rounded-lg">
		<h2 class=" text-center mt-5 ">This address could not be found.</h2>
		<p class="m-1 mt-2">
			Please check that your Street Address and Suburb are correctly structured and try again.
		</p>
		<p class="m-1">Each address must have a number</p>
		<p class="m-1">Abbreviations are not allowed.</p>
	</div>
{/if}
<h2 class=" text-center mt-5">Membership is restricted to specific Communities</h2>
<p class="text-center mb-2">
	Please enter your Street Address and Suburb to check your qualification
</p>

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
		{#if !canGo && streetaddress.length > 0}
			<div class="bg-red-100 rounded-lg my-3 text-base text-red-700" role="alert">
				The address must have a number.
			</div>
		{/if}
		<button
			type="submit"
			class="w-24 m-4 text-center py-1 rounded-full  cursor-pointer bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1 disabled:opacity-25"
			disabled={!canGo}
		>
			Check
		</button>
	</div>
</form>
