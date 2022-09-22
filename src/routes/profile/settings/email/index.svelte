<script>
	import AuthErrorMessage from '$components/form/AuthErrorMessage.svelte';
	import AuthSuccessMessage from '$components/form/AuthSuccessMessage.svelte';

	export let successMessage = '';
	export let errorMessage = '';

	let heading = 'Please enter an Email Address';
	let submitText = 'Set New Email';
	let email = '';

	$: canGo = validEmail;
	$: validEmail = validateEmail(email);

	function validateEmail(email) {
		let emailRegEx =
			/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return emailRegEx.test(String(email).toLowerCase());
	}
</script>

<div class="container max-w-sm mx-auto flex-1 flex flex-col items-center justify-center px-2 mt-3">
	<div class="bg-stone-200 px-6 py-8 rounded shadow-md text-gray-900 w-full">
		<form method="POST">
			<h1 class="mb-8 text-xl text-center">{heading}</h1>
			<label class="inline uppercase tracking-wide text-orange-600 text-xs font-bold" for="email">
				Email:
			</label>
			<input
				id="email"
				type="email"
				class="block border border-orange-700 w-full py-3 rounded mb-4"
				name="email"
				required={true}
				placeholder="Email"
				autocomplete="email"
				bind:value={email}
			/>
			<button
				type="submit"
				class="w-full text-center py-3 rounded-full bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1 disabled:opacity-25"
				disabled={!canGo}
			>
				{submitText}
			</button>
		</form>
		{#if errorMessage !== ''}
			<AuthErrorMessage message={errorMessage} />
		{/if}
		{#if successMessage !== ''}
			<AuthSuccessMessage message={successMessage} />
		{/if}
	</div>
</div>
