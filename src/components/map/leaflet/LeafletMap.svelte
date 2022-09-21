<script>
	import { browser } from '$app/env';
	import { onMount, onDestroy } from 'svelte';

	if (browser) {
		onMount(async () => {
			const leaflet = await import('leaflet');
		});

		onDestroy(async () => {
			if (map) {
				map.remove();
			}
		});
	}
</script>
