<script>
	import { onMount, onDestroy } from 'svelte';

	export let mapObject;
	export let mapData;

	let map;

	onMount(async () => {
		const leaflet = await import('leaflet');
		map = leaflet.map(mapObject.divId, {
			center: mapObject.centre,
			zoom: mapObject.zoom,
			minZoom: mapObject.minZoom,
			maxZoom: mapObject.maxZoom,
			maxBounds: mapObject.maxBounds,
			zoomControl: mapObject.zoomControl,
			doubleClickZoom: mapObject.doubleClickZoom,
			scrollWheelZoom: mapObject.scrollWheelZoom
		});
		if (!mapObject.dragging) {
			map.dragging.disable();
		}
		// const ssNSWBaseLayer = leaflet.tileLayer
		// 	.wms('http://maps.six.nsw.gov.au/arcgis/services/public/NSW_Base_Map/MapServer/WmsServer', {
		// 		layers: 'LPIMap_PlacePoint',
		// 		attribution: '© Spatial Services NSW'
		// 	})
		// 	.addTo(map);
		// const ssNSWTopoLayer = leaflet.tileLayer
		// 	.wms('https://maps.six.nsw.gov.au/arcgis/services/public/NSW_Topo_Map/MapServer/WmsServer', {
		// 		layers: '0',
		// 		attribution: '© Spatial Services NSW'
		// 	})
		// 	.addTo(map);
		const osmMapTiles = leaflet
			.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 12,
				attribution: '© OpenStreetMap'
			})
			.addTo(map);
		// const openTopoLayer = leaflet
		// 	.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
		// 		maxZoom: 17,
		// 		attribution:
		// 			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>)'
		// 	})
		// 	.addTo(map);

		if (mapData.jsonLayers) {
			for (let i = 0; i < mapData.jsonLayers.length; i++) {
				let g = mapData.jsonLayers[i];
				for (let j = 0; j < g.length; j++) {
					let p = g[j].geom.coordinates;
					let n = g[j].addresspointtype;
					let lon = p[0];
					let lat = p[1];
					let markerLocation = new leaflet.LatLng(lat, lon, 0);
					let marker = new leaflet.circleMarker(markerLocation);
					if (n === 1) {
						marker.setStyle({ color: '#f97316', weight: 0, radius: 3, fillOpacity: 0.8 });
					} else {
						marker.setStyle({ color: '#a5a5a5', weight: 0, radius: 3, fillOpacity: 0.8 });
					}
					map.addLayer(marker);
				}
			}
		}
	});

	onDestroy(async () => {
		if (map) {
			map.remove();
		}
	});
</script>

<div class="w-7/8 h-full z-0" id={mapObject.divId} />
