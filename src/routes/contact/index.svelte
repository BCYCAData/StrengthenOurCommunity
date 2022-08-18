<script context="module">
	import { browser, dev } from '$app/env';

	// we don't need any JS on this page, though we'll load
	// it in dev so that we get hot module replacement...
	export const hydrate = dev;

	// ...but if the client-side router is already loaded
	// (i.e. we came here from elsewhere in the app), use it
	export const router = browser;

	// since there's no dynamic data here, we can prerender
	// it so that it gets served as a static asset in prod
	export const prerender = true;
</script>

<svelte:head>
	<title>Contact Us</title>
</svelte:head>

<section
	class="flex flex-col items-center mx-auto mt-10 sm:mt-1 h-full max-w-3xl text-gray-900 text-center"
>
	<h1>We are here</h1>

	<h3>We have a project</h3>
	<p>
		Our aim is to <br />
		Prepare
		<br />
		Connect
		<br />
		Rebound
	</p>
</section>
