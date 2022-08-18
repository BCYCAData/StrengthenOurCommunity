<script>
	// @ts-nocheck

	import { onMount } from 'svelte';

	onMount(async () => {
		const leaflet = await import('leaflet');
		/* Set up the initial map center and zoom level */
		const map = leaflet.map('map', {
			center: [-31.952345, 152.295649], // EDIT coordinates to re-center map
			zoom: 12, // EDIT from 1 (zoomed out) to 18 (zoomed in)
			scrollWheelZoom: false,
			tap: false
		});

		/* display basemap tiles -- see others at https://leaflet-extras.github.io/leaflet-providers/preview/ */
		leaflet
			.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
				maxZoom: 17,
				attribution:
					'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
			})
			.addTo(map);

		// L.tileLayer(
		//   'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
		//     attribution: '&copy; <a href="https://osm.org/copyright">\
		//       OpenStreetMap</a> contributors, &copy;\
		//       <a href="https://carto.com/attribution">CARTO</a>'
		// }).addTo(map);

		/* Display a point marker with pop-up text */
		leaflet
			.marker([-31.952345, 152.295649])
			.addTo(map) // EDIT marker coordinates
			.bindPopup('The centre of our community'); // EDIT pop-up text message

		// leaflet
		// 	.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		// 		attribution:
		// 			'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		// 	})
		// 	.addTo(map);

		// leaflet
		// 	.marker([51.5, -0.09])
		// 	.addTo(map)
		// 	.bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
		// 	.openPopup();
		// }
	});
</script>

<div id="map" class="flex justify-center m-0 h-full w-3/4" />

<style>
	@import 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
</style>
