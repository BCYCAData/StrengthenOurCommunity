<script>
	import MapLeaflet from '$components/map/leaflet/MapLeaflet.svelte';

	let mapObject = {
		divId: 'basicMap',
		centre: [-31.955815, 152.300884], //-31.955814913,152.300883592
		zoomControl: false,
		doubleClickZoom: false,
		scrollWheelZoom: false,
		zoom: 11.6,
		minZoom: 11.6,
		maxZoom: 11.5,
		maxBounds: null,
		dragging: false
	};
	let mapTileLayer = {
		url: `https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY.toString()}`,
		layerOptions: {
			tileSize: 512,
			zoomOffset: -1,
			minZoom: 1,
			attribution:
				'\u003ca href="https://www.maptiler.com/copyright/" target="_blank"\u003e\u0026copy; MapTiler\u003c/a\u003e \u003ca href="https://www.openstreetmap.org/copyright" target="_blank"\u003e\u0026copy; OpenStreetMap contributors\u003c/a\u003e \u003ca href="https://www.spatial.nsw.gov.au" target="_blank"\u003e\u0026copy; Spatial Services NSW \u003c/a\u003e',
			crossOrigin: true
		}
	};

	// '© State of New South Wales (Spatial Services, a business unit of the Department of Customer Service NSW). For current information go to spatial.nsw.gov.au.’
	async function getMapData() {
		const response = await fetch('/api/data/addressPoints');
		const data = await response.json();
		return data.mapData;
	}
	let mapData = getMapData();
</script>

{#await mapData}
	<p>...waiting</p>
{:then mapData}
	<div class="flex flex-1  border-double border-stone-100">
		<MapLeaflet {mapObject} {mapTileLayer} {mapData} />
		<!-- <MaplibreGlMap /> -->
	</div>
{:catch error}
	<p style="color: red">{error.message}</p>
{/await}
