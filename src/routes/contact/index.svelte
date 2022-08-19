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
	class="flex flex-col items-center mx-auto mt-10 sm:mt-1 h-full max-w-3xl text-gray-800 text-center"
>
	<h1 class="text-gray-800">If you want to be more involved</h1>

	<h1 class="text-gray-800">Please call</h1>
	<p class="font-semibold text-gray-800">
		<span class="text-xl text-orange-600">Helen</span>
		<span>on</span>
		<span>0424 515 963</span>
	</p>
	<h3 class=" text-gray-800">or</h3>
	<p class="font-semibold text-gray-800">
		<span class="text-xl text-orange-600">Christine</span>
		<span>on</span>
		<span>0488 288 661</span>
	</p>
</section>
