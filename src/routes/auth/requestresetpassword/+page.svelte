<script>
	import AuthErrorMessage from '$components/form/AuthErrorMessage.svelte';
	import { supabaseClient, supabaseRedirectBase } from '$lib/dbClient';

	let email = '';

	$: canGo = validEmail;
	$: validEmail = validateEmail(email);

	function validateEmail(email) {
		var emailRegEx =
			/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return emailRegEx.test(String(email).toLowerCase());
	}

	async function resetPassword() {
		const { data, error } = await supabaseClient.auth.api.resetPasswordForEmail(email, {
			redirectTo: `${supabaseRedirectBase}/auth/redirect`
		});
		if (error) {
			errorMessage = error.message;
		}
	}

	let errorMessage = '';
</script>

<div class="max-w-sm mx-auto flex-1 flex flex-col items-center justify-center px-2">
	<div class="bg-stone-200 p-6 sm:ml-0 rounded shadow-md text-gray-900 w-5/6 sm:w-full">
		<form on:submit|preventDefault={resetPassword}>
			<h1 class="mb-8 text-3xl text-center">Reset Password</h1>
			<p>Please enter the email address you registered with.</p>
			<p>If it is validated you will receive an email with a link to enable your password reset.</p>
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
			{#if errorMessage !== ''}
				<AuthErrorMessage message={errorMessage} />
			{/if}
			{#if canGo}
				<button
					type="submit"
					class="w-full text-center py-3 rounded-full bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1 disabled:opacity-25"
					value=""
					disabled={!canGo}
				>
					Request Reset Link
				</button>
			{/if}
		</form>
	</div>
</div>
