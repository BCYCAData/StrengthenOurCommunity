<script>
	import Logo from '$components/header/logo/Logo.svelte';
	import { page, session } from '$app/stores';

	let menuOpen = true;

	const handleNav = () => {
		menuOpen = !menuOpen;
	};
</script>

<nav class="h-15 flex justify-around items-center bg-orange-500">
	<Logo />
	<!-- Primary Navbar items -->
	<div class="flex ml-[89px] items-center">
		<div class="hidden md:block">
			<a
				class:active={$page.url.pathname.endsWith('/')}
				sveltekit:prefetch
				href="/"
				class="p-2 text-stone-100 bg-[#0099E8] font-semibold rounded-xl outline-black"
			>
				Home
			</a>
			<a
				class:active={$page.url.pathname.endsWith('/about')}
				sveltekit:prefetch
				href="/about"
				class="p-2 text-stone-100 bg-[#0099E8] font-semibold rounded-xl outline-black"
			>
				About
			</a>
			<a
				class:active={$page.url.pathname.endsWith('/contact')}
				sveltekit:prefetch
				href="/contact"
				class="p-2 text-stone-100 bg-[#0099E8] font-semibold rounded-xl outline-black"
			>
				Contact Us
			</a>
		</div>
	</div>

	<!-- Secondary Navbar items -->
	<div class="md:flex items-center">
		<div class="hidden md:block">
			{#if $session?.user?.id}
				<a
					class:active={$page.url.pathname.includes('/profile')}
					href="/profile"
					class="p-2 text-stone-100 bg-orange-500 font-semibold rounded-xl outline-black"
				>
					Profile
				</a>
				<a
					href="/api/auth/logout"
					class="p-2 text-stone-100 bg-orange-500 font-semibold rounded-xl outline-black"
				>
					Sign Out
				</a>
			{:else}
				<a
					class="p-2 text-stone-100 bg-orange-500 font-semibold rounded-xl outline-black"
					class:active={$page.url.pathname.endsWith('/signin')}
					sveltekit:prefetch
					href="/auth/signin"
				>
					Sign In
				</a>
			{/if}
		</div>
		<div
			class="text-sm pl-3 mb-4 mt-6 bg-orange-500 text-center z-50 font-extrabold text-orange-600 md:hidden"
		>
			Strengthen Our Community
		</div>
		<!-- Mobile menu button -->
		<div class="md:hidden flex items-center">
			<button class="outline-none bg-transparent mobile-menu-button" on:click={handleNav}>
				<svg
					class=" w-6 h-6 text-orange-600 hover:text-red-700 "
					x-show="!showMenu"
					fill="none"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
		</div>
	</div>
	<!-- Mobile menu -->
	<div class="bg-orange-500 absolute w-full mobile-menu" class:hidden={menuOpen}>
		<ul class="space-y-2 list-none">
			<li>
				<a
					on:click={handleNav}
					class:active={$page.url.pathname.endsWith('/')}
					sveltekit:prefetch
					href="/"
					class="p-2 text-stone-100 bg-[#0099E8] font-semibold rounded-xl outline-black"
				>
					Home
				</a>
			</li>
			<li>
				<a
					on:click={handleNav}
					class:active={$page.url.pathname.endsWith('/about')}
					sveltekit:prefetch
					href="/about"
					class="p-2 text-stone-100 bg-[#0099E8] font-semibold rounded-xl outline-black"
				>
					About
				</a>
			</li>
			<li>
				<a
					on:click={handleNav}
					class:active={$page.url.pathname.endsWith('/contact')}
					sveltekit:prefetch
					href="/contact"
					class="p-2 text-stone-100 bg-[#0099E8] font-semibold rounded-xl outline-black"
				>
					Contact Us
				</a>
			</li>
			<li>
				{#if $session?.user?.id}
					<a
						href="/api/auth/logout"
						class="p-2 text-stone-100 bg-orange-500 font-semibold rounded-xl outline-black"
					>
						Sign Out
					</a>
				{:else}
					<a
						class:active={$page.url.pathname.endsWith('/signin')}
						class="p-2 text-stone-100 bg-orange-500 font-semibold rounded-xl outline-black"
						sveltekit:prefetch
						href="/auth/signin"
					>
						Sign In
					</a>
				{/if}
			</li>
		</ul>
	</div>
</nav>

<style>
	a.active {
		background-color: rgb(253, 186, 116);
		color: rgb(249, 115, 22);
	}
</style>
