<script>
	import { onMount, onDestroy } from 'svelte';
	onMount(async () => {
		const response = await fetch('/about', {
			method: 'GET'
		});
		const data = response.body;
		console.log('AboutMapData', JSON.stringify(data));
	});
</script>
