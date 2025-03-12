<script>
	import { page } from '$app/stores';
	import Modal from '$components/Modal.svelte';
	import AddressChallenge from '$components/form/addressChallenge/AddressChallenge.svelte';

	let modalVisible = false;

	const url = $page.url;
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>
<section class="flex flex-col items-center text-center mx-auto h-full max-w-5xl">
	<div class="text-center">
		<h1 class="unstyled title-font font-bold hidden sm:block sm:text-4xl sm:mt-4 text-primary-600">
			Strengthen OUR Community
		</h1>
		<p class="unstyled text-base mt-3 mb-0 sm:text-lg text-grey-900">
			This project, funded by the Bushfire Community Recovery Resilience Fund, is a response to the
			community’s feedback following the 2019 bushfires.
		</p>
		<p class="text-base sm:text-lg  mt-1 mb-0">
			As a community we share the same environment.&nbsp; We want our community to feel prepared for
			future challenges and be armed with knowledge that helps us to tackle whatever natural
			disaster comes our way.
		</p>
		{#if modalVisible}
			<Modal on:exit={() => (modalVisible = !modalVisible)}>
				<AddressChallenge />
			</Modal>
		{/if}
		<p class="text-base text-gray-900 font-semibold md:text-xl mt-1 mb-0">
			Above all, we want our community to feel prepared, safe and connected.
		</p>
		<p class="text-base md:text-lg text-red-700 font-semibold mt-1 mb-0">Will you join us?</p>
		<button
			class="cursor-pointer p-2 px-8 max-w-100 no-underline font-semibold md:text-xl hover:underline mt-1 text-stone-100 bg-orange-500 rounded-xl"
			on:click={() => (modalVisible = !modalVisible)}
			on:keydown={() => (modalVisible = !modalVisible)}
			tabindex="0"
		>
			Tap here to find out if you qualify
		</button>
		<p class="unstyled text-sm md:text-lg mt-1 font-semibold">Want more information?</p>
		<p class="unstyled text-sm md:text-lg mt-0 font-semibold">Call Helen 0424 515 963</p>
		<div class="iframe-center mt-4">
			<iframe
				width="560"
				height="315"
				src="https://www.youtube.com/embed/Q6CCR6gBUkU"
				title="YouTube video player"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				allowfullscreen
			/>
			<iframe
				width="560"
				height="315"
				src="https://www.youtube.com/embed/ukXYzMK6zk4"
				title="YouTube video player"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				allowfullscreen
			/>
		</div>
	</div>
</section>

<style>
	/* Default styles for both iframes */
	iframe {
		width: 100%;
		height: 315px; /* Adjust the height as needed */
		margin: 5px; /* Remove margin between iframes */
	}

	/* Media query for larger screens (min-width: 768px) */
	@media (min-width: 768px) {
		.iframe-center {
			display: flex;
			flex-direction: row;
			justify-content: space-around;
		}

		iframe {
			max-width: 75%;
			margin: 10px; /* Remove margin between iframes */
		}
	}
</style>
