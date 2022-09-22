<script>
	import { onMount } from 'svelte';

	export let accessToken;

	onMount(async () => {
		const response = await fetch('/api/data/userdata', {
			method: 'POST',
			body: JSON.stringify({
				token: accessToken
			}),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const data = await response.json();
	});
</script>
