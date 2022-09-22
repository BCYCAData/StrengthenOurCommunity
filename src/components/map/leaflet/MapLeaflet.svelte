<script>
	import { onMount, onDestroy } from 'svelte';

	export let mapObject;
	export let mapData;
	export let mapTileLayer;

	let map;
	let featureGroup;
	let registeredGroup;

	onMount(async () => {
		const leaflet = await import('leaflet');
		console.log('mapData', mapData.jsonLayers);
		map = leaflet.map(mapObject.divId, {
			center: mapObject.centre,
			zoom: mapObject.zoom,
			// minZoom: mapObject.minZoom,
			// maxZoom: mapObject.maxZoom,
			maxBounds: mapObject.maxBounds,
			zoomControl: mapObject.zoomControl,
			doubleClickZoom: mapObject.doubleClickZoom,
			scrollWheelZoom: mapObject.scrollWheelZoom
		});
		if (!mapObject.dragging) {
			map.dragging.disable();
		}
		leaflet.tileLayer(mapTileLayer.url, mapTileLayer.layerOptions).addTo(map);

		if (mapData.jsonLayers) {
			let features = [];
			// for (let i = 0; i < mapData.jsonLayers.length; i++) {
			let g = mapData.jsonLayers[0];
			for (let j = 0; j < g.length; j++) {
				let p = g[j].geom.coordinates;
				let n = g[j].addresspointtype;
				let lon = p[0];
				let lat = p[1];
				let markerLocation = new leaflet.LatLng(lat, lon, 0);
				let marker = new leaflet.circleMarker(markerLocation);
				// if (n === 1) {
				// marker.setStyle({ color: '#f97316', weight: 0, radius: 3, fillOpacity: 0.8 });
				// } else {
				marker.setStyle({ color: '#a5a5a5', weight: 0, radius: 2, fillOpacity: 0.5 });
				// }
				features.push(marker);
				// map.addLayer(marker);
			}
			// }
			featureGroup = leaflet.featureGroup(features);
			map.addLayer(featureGroup);
			features = [];
			// for (let i = 0; i < mapData.jsonLayers.length; i++) {
			g = mapData.jsonLayers[1];
			for (let j = 0; j < g.length; j++) {
				let p = g[j].geom.coordinates;
				let n = g[j].addresspointtype;
				let lon = p[0];
				let lat = p[1];
				let markerLocation = new leaflet.LatLng(lat, lon, 0);
				let marker = new leaflet.circleMarker(markerLocation);
				// if (n === 1) {
				marker.setStyle({ color: '#f97316', weight: 0, radius: 3, fillOpacity: 0.9 });
				// } else {
				// marker.setStyle({ color: '#a5a5a5', weight: 0, radius: 3, fillOpacity: 0.8 });
				// }
				features.push(marker);
				// map.addLayer(marker);
			}
			// }
			registeredGroup = leaflet.featureGroup(features);
			map.addLayer(registeredGroup);
		}
		map.on('resize', function () {
			map.minZoom = 0;
			map.maxZoom = 20;
			map.fitBounds(featureGroup.getBounds());
			map.invalidateSize();
			map.minZoom = map.getZoom();
			map.minZoom = map.getZoom();
			map.invalidateSize();
			console.log(map.getZoom());
		});
	});

	onDestroy(async () => {
		if (map) {
			map.remove();
		}
	});
</script>

<div
	class="mx-auto flex w-full h-full items-center justify-center border-double border-orange-600 z-0"
	id={mapObject.divId}
/>
