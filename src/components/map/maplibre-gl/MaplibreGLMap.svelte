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
		// map = new Map({
		// 	container: mapContainer,
		// 	style: 'https://demotiles.maplibre.org/style.json',
		// 	center: [37.138, 0.414],
		// 	zoom: 6,
		// 	hash: true,
		// 	attributionControl: false
		// });
		// var map = new Map({
		// 	container: mapContainer,
		// 	style: `https://api.maptiler.com/maps/openstreetmap/style.json?key=${styleKey}`,
		// 	center: [152.300884, -31.955815],
		// 	zoom: 10
		// });
		const map = new Map({
			container: mapContainer,
			style: style,
			center: [1, 15],
			zoom: 3
		});

		// map.addControl(new NavigationControl({}), 'top-right');
		// map.addControl(
		// 	new GeolocateControl({
		// 		positionOptions: { enableHighAccuracy: true },
		// 		trackUserLocation: true
		// 	}),
		// 	'top-right'
		// );
		// map.addControl(new ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-left');
		// map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
	});

	onDestroy(async () => {
		if (map) {
			map.remove();
		}
	});
</script>

<div class="w-full h-full z-0" id="map" bind:this={mapContainer} />
