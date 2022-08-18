<script context="module">
	let showFooter = true;
</script>

<script>
	// @ts-nocheck

	import { page, session } from '$app/stores';
	import { supabaseClient } from '$lib/dbClient';
	import { SupaAuthHelper } from '@supabase/auth-helpers-svelte';
	import Navbar from '$components/header/navbar/Navbar.svelte';

	import '../app.css';
	import 'uno.css';
	import '../../node_modules/leaflet/dist/leaflet.css';
</script>

<SupaAuthHelper {supabaseClient} {session}>
	<div class="grid w-11/12 mx-auto min-h-screen" id="wrapper">
		<header class="col-span-8 row-span-1">
			<Navbar />
		</header>
		<main class="col-span-8 row-span-22">
			<slot />
		</main>
		{#if showFooter}
			<footer class="col-span-8 row-span-1 sticky bottom-0">
				<div
					class="flex content-center items-center justify-around bg-orange-600 text-stone-100 w-full h-[45px]"
				>
					<a
						class:active={$page.url.pathname.endsWith('/policies/termsofservice')}
						sveltekit:prefetch
						href="/policies/termsofservice"
					>
						Terms of Service
					</a>
					<h3>Prepare Connect Rebound</h3>
					<a
						class:active={$page.url.pathname.endsWith('/policies/privacy')}
						sveltekit:prefetch
						href="/policies/privacy"
					>
						Privacy Policy
					</a>
				</div>
			</footer>
		{/if}
	</div>
</SupaAuthHelper>

<style>
	#wrapper {
		grid-template-rows: auto 1fr auto;
	}
</style>
