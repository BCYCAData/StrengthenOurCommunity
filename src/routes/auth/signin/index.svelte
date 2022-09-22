<script>
	import Modal from '$components/Modal.svelte';
	import AddressChallenge from '$components/form/addressChallenge/AddressChallenge.svelte';

	import AuthErrorMessage from '$components/form/AuthErrorMessage.svelte';

	/**
	 * @type {string}
	 */
	let email;
	/**
	 * @type {string}
	 */
	let password;

	let modalVisible = false;
	export let errorMessage = '';
</script>

<div class="flex flex-col items-center max-w-sm max-w-screen-xsm mx-auto">
	<div class="bg-stone-200 p-6 sm:ml-0 rounded shadow-md text-gray-900 w-5/6 sm:w-full">
		<h1 class="text-2xl text-center">Welcome Back</h1>
		<form method="POST">
			<input
				id="email"
				type="email"
				class="block text-xl border border-orange-700 w-full py-3 rounded mb-4"
				name="email"
				required={true}
				placeholder="Email"
				autocomplete="email"
				bind:value={email}
			/>
			<input
				id="password"
				type="password"
				class="block text-xl border border-orange-700 w-full py-3 rounded mb-4"
				name="password"
				required={true}
				placeholder="Password"
				autocomplete="current-password"
				bind:value={password}
			/>
			<div class="flex justify-between mt-4 mb-3">
				<a
					href="/auth/requestresetpassword"
					class="text-sm font-semibold text-orange-600 hover:underline"
				>
					Forgot Your Password? &lt&lt&lt
				</a>
			</div>
			{#if errorMessage !== ''}
				<AuthErrorMessage message={errorMessage} />
			{/if}
			<button
				type="submit"
				class="w-full text-center py-3 rounded-full bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1"
			>
				Sign In
			</button>
		</form>
		{#if modalVisible}
			<Modal on:exit={() => (modalVisible = !modalVisible)}>
				<AddressChallenge />
			</Modal>
		{/if}
	</div>
	<div class="text-gray-900 mt-6">
		Not registered?
		<button
			class="text-center py-1 px-5 rounded-full bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1"
			on:click={() => (modalVisible = !modalVisible)}
		>
			Create an Account
		</button>
	</div>
</div>
