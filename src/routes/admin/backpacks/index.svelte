<script>
	import BackpackCoordinator from '$components/backpack/BackpackCoordinator.svelte';
	export let initialSnapshot = null;
	export let accessState = 'disabled';
	export let workerEnabled = false;
</script>

<svelte:head><title>Backpack programme | Coordinator</title></svelte:head>
<BackpackCoordinator {initialSnapshot} {accessState} {workerEnabled} />
