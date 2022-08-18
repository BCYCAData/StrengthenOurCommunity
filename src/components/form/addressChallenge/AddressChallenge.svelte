<script>
	// @ts-nocheck

	import AddressValid from '$components/form/addressChallenge/AddressValid.svelte';
	import AddressError from '$components/form/addressChallenge/AddressError.svelte';
	import AddressNotFound from '$components/form/addressChallenge/AddressNotFound.svelte';
	import AddressInvalid from '$components/form/addressChallenge/AddressInvalid.svelte';
	import AddressUnchallenged from '$components/form/addressChallenge/AddressUnchallenged.svelte';
	import AddressNoService from '$components/form/addressChallenge/AddressNoService.svelte';

	let streetaddress;
	let suburb;
	let validAddress = '';

	let unchallenged = true;
	let status = 'unchallenged';

	let searchAddress = '';
	let community = '';
</script>

{#if unchallenged && status !== 'addressError'}
	<AddressUnchallenged
		{streetaddress}
		{suburb}
		bind:validAddress
		bind:unchallenged
		bind:status
		bind:searchAddress
		bind:community
	/>
{/if}
{#if status === 'addressInvalid'}
	<AddressInvalid {searchAddress} />
{/if}
{#if status === 'addressNotFound'}
	<AddressNotFound />
{/if}
{#if status === 'serviceNotAvailable'}
	<AddressNoService />
{/if}
{#if status === 'addressError'}
	<AddressError />
{/if}
{#if status === 'addressValid'}
	<AddressValid {searchAddress} {validAddress} {community} />
{/if}
