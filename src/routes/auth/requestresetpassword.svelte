<script>
	import AuthErrorMessage from '$components/form/AuthErrorMessage.svelte';
	import AuthSuccessMessage from '$components/form/AuthSuccessMessage.svelte';
	import { supabaseClient, supabaseRedirectBase } from '$lib/dbClient';

	let email = '';
	let waiting = false;

	$: canGo = validEmail;
	$: validEmail = validateEmail(email);

	function validateEmail(email) {
		let emailRegEx =
			/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return emailRegEx.test(String(email).toLowerCase());
	}

	async function resetPassword() {
		waiting = true;
		canGo = false;
		const { error } = await supabaseClient.auth.api.resetPasswordForEmail(email, {
			redirectTo: `${supabaseRedirectBase}/auth/redirect`
		});
		if (error) {
			errorMessage = error.message;
		} else {
			waiting = false;
			successMessage = 'Your request has been lodged. Check your Inbox.';
		}
	}

	let errorMessage = '';
	let successMessage = '';
</script>

<div class="max-w-sm mx-auto flex-1 flex flex-col items-center justify-center px-2">
	<div class="bg-stone-200 p-6 sm:ml-0 rounded shadow-md text-gray-900 w-5/6 sm:w-full">
		<form on:submit|preventDefault={resetPassword}>
			<h1 class="mb-8 text-3xl text-center">Reset Password</h1>
			<p>Please enter the email address you registered with.</p>
			<p>If it is validated you will receive an email with a link to enable your password reset.</p>
			<input
				id="email"
				type="email"
				class="block border border-orange-700 w-full py-3 text-xl rounded mb-4"
				name="email"
				required={true}
				placeholder="Email"
				autocomplete="email"
				bind:value={email}
			/>
			{#if errorMessage !== ''}
				<AuthErrorMessage message={errorMessage} />
			{/if}
			{#if waiting}
				<p>Please wait while we validate your email address...</p>
			{/if}
			{#if successMessage !== ''}
				<AuthSuccessMessage message={successMessage} />
			{/if}
			<button
				type="submit"
				class="w-full text-xl text-center py-3 rounded-full bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1 disabled:opacity-25"
				disabled={!canGo}
			>
				Request Password Reset
			</button>
		</form>
	</div>
</div>
