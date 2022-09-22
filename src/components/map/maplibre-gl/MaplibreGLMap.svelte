<script>
	import { onMount, onDestroy } from 'svelte';
	import { Map } from 'maplibre-gl';

	const styleKey = import.meta.env.VITE_MAPTILER_KEY.toString();

	// export let mapObject;
	// export let mapData;

	let map;
	let mapContainer;

	const style = {
		version: 8,
		sources: {
			osm: {
				type: 'raster',
				tiles: [`https://api.maptiler.com/maps/basic-v2/3/4/2.png?key=${styleKey}`]
			}
		},
		layers: [
			{
				id: 'osm',
				type: 'raster',
				source: 'osm' // This must match the source key above
			}
		]
	};

	onMount(async () => {
		const map = new Map({
			container: mapContainer,
			style: style,
			center: [1, 15],
			zoom: 3
		});
	});

	onDestroy(async () => {
		if (map) {
			map.remove();
		}
	});
</script>

<div class="w-full h-full z-0" id="map" bind:this={mapContainer} />
