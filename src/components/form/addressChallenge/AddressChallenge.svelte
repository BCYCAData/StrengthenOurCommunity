<script>
	import AddressValid from '$components/form/addressChallenge/AddressValid.svelte';
	import AddressEligible from '$components/form/addressChallenge/AddressEligible.svelte';
	import AddressIneligible from '$components/form/addressChallenge/AddressIneligible.svelte';
	import AddressUnchallenged from '$components/form/addressChallenge/AddressUnchallenged.svelte';
	import AddressSystemError from '$components/form/addressChallenge/AddressSystemError.svelte';

	let searchAddress = '';
	let status = 100; // unchallenged
	let validAddress = '';
	let community = '';
	let principaladdresssiteoid; //: resultData.principaladdresssiteoid,
	// let addressPointLon; //: resultData.addresspoint_geom,
	// let addressPointLat; //: resultData.addresspoint_geom,
	let gurasid; //: resultData.gurasid
</script>

{#if status === 100 || status === 400 || status === 404}
	<AddressUnchallenged
		bind:validAddress
		bind:status
		bind:searchAddress
		bind:community
		bind:principaladdresssiteoid
		bind:gurasid
	/>
{/if}
{#if status === 403}
	<AddressIneligible {searchAddress} />
{/if}
{#if status === 401}
	<!-- <AddressEligible {searchAddress} {validAddress} {community} {principaladdresssiteoid} {gurasid} /> -->
	<AddressEligible {searchAddress} {validAddress} {community} />
{/if}
{#if status >= 500}
	<AddressSystemError />
{/if}
{#if status === 200}
	<AddressValid {searchAddress} {validAddress} {community} {principaladdresssiteoid} {gurasid} />
{/if}
