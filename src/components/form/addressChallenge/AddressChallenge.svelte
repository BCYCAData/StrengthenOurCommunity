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
	let oid = ''; //: resultData.principaladdresssiteoid,
	let gid = ''; //: resultData.gurasid	// let principaladdresssiteoid; //: resultData.principaladdresssiteoid,
</script>

{#if status === 100 || status === 400 || status === 404}
	<AddressUnchallenged
		bind:validAddress
		bind:status
		bind:searchAddress
		bind:community
		bind:oid
		bind:gid
	/>
{/if}
{#if status === 403}
	<AddressIneligible {searchAddress} />
{/if}
{#if status === 401}
	<AddressEligible {searchAddress} {validAddress} {community} />
{/if}
{#if status >= 500}
	<AddressSystemError>
		<button
			type="button"
			class="w-24 m-4 text-center py-1 rounded-full cursor-pointer bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none"
			on:click={() => (status = 100)}
		>
			Try again
		</button>
	</AddressSystemError>
{/if}
{#if status === 200}
	<AddressValid {searchAddress} {validAddress} {community} {oid} {gid} />
{/if}
