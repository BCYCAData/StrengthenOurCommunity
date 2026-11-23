<script>
	import PropertyAccess from '../../src/components/form/PropertyAccess.svelte';
	import CriticalAssets from '../../src/components/form/CriticalAssets.svelte';
	import CommunityInformation from '../../src/components/form/CommunityInformation.svelte';
	import ProgressBar from '../../src/components/form/ProgressBar.svelte';
	let answers = {
		property_access_restricted: null,
		property_access_restrictions: [],
		has_other_critical_assets: null,
		other_essential_assets: 'Retained earlier shed description'
	};
	const steps = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '12'];
	let currentActive = 1;
	let submitted = '';
</script>

<main>
	<h1>Committee form browser fixture</h1>
	<ProgressBar {steps} bind:currentActive />
	<output aria-label="Underlying form step">{steps[currentActive - 1]}</output>
	<form
		on:submit|preventDefault={(event) => {
			submitted = JSON.stringify([...new FormData(event.currentTarget)]);
		}}
	>
		<PropertyAccess {answers} prefix="fixture-access" />
		<CriticalAssets {answers} prefix="fixture-assets" />
		<button type="submit">Save partial answers</button>
	</form>
	<pre role="status">{submitted}</pre>
	<CommunityInformation section="ready" />
	<CommunityInformation section="information" />
</main>

<style>
	main {
		max-width: 100%;
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
