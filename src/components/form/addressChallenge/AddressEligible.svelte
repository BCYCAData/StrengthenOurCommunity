<script>
	export let searchAddress;
	export let validAddress;
	export let community;
</script>

<div class="bg-green-100 mt-1 rounded-lg">
	<p class="font-semibold text-center text-lg m-1">
		{searchAddress}
	</p>
	{#if searchAddress.replace(',', '') !== validAddress}
		<p class="text-center m-1">( {validAddress} )</p>
	{/if}
	<p class="text-center m-1">
		is part of the
		<span class="font-semibold">{community}</span>
		community.
	</p>
</div>

<div class="max-w-sm mx-auto flex-1 flex flex-col items-center justify-center px-2">
	<div class="px-6 py-2 rounded shadow-md text-gray-900 w-full">
		<p class="font-semibold text-center m-1">Thanks for your interest in our project</p>
		<p class="font-semibold text-center">
			We are not currently engaging with the {community} community. But we will be soon.
		</p>
		<p>If you would like information on future rollouts please call Sue on 0492 802 129</p>
	</div>
</div>
