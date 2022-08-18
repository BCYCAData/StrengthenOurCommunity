<script>
	import AuthErrorMessage from '$components/form/AuthErrorMessage.svelte';
	import AuthSuccessMessage from '$components/form/AuthSuccessMessage.svelte';

	import { supabaseClient, supabaseRedirectBase } from '$lib/dbClient';

	export let searchAddress;
	export let validAddress;
	export let community;

	let email = '';
	let strength = 0;
	let validations = [];
	let showPassword = false;

	$: password = '';
	$: confirmPassword = '';
	$: canGo = validEmail && password === confirmPassword && strength === 4;

	$: validEmail = validateEmail(email);

	function validateEmail(email) {
		var emailRegEx =
			/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return emailRegEx.test(String(email).toLowerCase());
	}

	function validatePassword(e) {
		const passwordValue = e.target.value;
		validations = [
			passwordValue.length > 8,
			passwordValue.search(/[A-Z]/) > -1,
			passwordValue.search(/[0-9]/) > -1,
			passwordValue.search(/[$&+,:;=?#^!]/) > -1
		];
		strength = validations.reduce((acc, cur) => acc + cur, 0);
	}

	let successMessage = '';
	let errorMessage = '';

	const handleSubmit = async () => {
		try {
			const { error } = await supabaseClient.auth.signUp(
				{
					email: email,
					password: password
				},
				{
					redirectTo: `${supabaseRedirectBase}/auth/redirect`
				}
			);
			if (error) throw error;
		} catch (error) {
			errorMessage = error.message;
		} finally {
			successMessage = 'Your request has been lodged.';
		}
	};
</script>

<h3 class="text-center mt-2">
	{searchAddress}
</h3>
{#if searchAddress.replace(',', '') !== validAddress}
	<h3 class="text-center">( {validAddress} )</h3>
{/if}
<h3 class="text-center">is part of the</h3>
<h3 class="text-center">{community}</h3>
<h3 class="text-center">community.</h3>
<div class="max-w-sm mx-auto flex-1 flex flex-col items-center justify-center px-2">
	<div class="px-6 py-2 rounded shadow-md text-gray-900 w-full">
		<form on:submit|preventDefault={handleSubmit}>
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
			<label
				class="inline uppercase tracking-wide text-orange-600 text-xs font-bold"
				for="password"
			>
				Password:
				<span
					class="toggle-password text-3xl text-gray-900 font-normal ml-3  align-middle "
					on:mouseenter={() => (showPassword = true)}
					on:mouseleave={() => (showPassword = false)}
				>
					{showPassword ? '👁' : '👁'}
				</span>
			</label>
			<input
				id="password"
				type="password"
				class="block border border-orange-700 w-full py-3 rounded mb-4"
				name="password"
				required={true}
				placeholder="New Password"
				autocomplete="new-password"
				on:input={validatePassword}
				bind:value={password}
			/>
			<label
				class="inline uppercase tracking-wide text-orange-600 text-xs font-bold"
				for="confirmPassword"
			>
				Confirm Password:
				<span
					class="toggle-password text-3xl text-gray-900 font-normal ml-3  align-middle "
					on:mouseenter={() => (showPassword = true)}
					on:mouseleave={() => (showPassword = false)}
				>
					{showPassword ? '👁' : '👁'}
				</span>
			</label>

			<input
				id="confirmPassword"
				type="password"
				class="block border border-orange-700 w-full py-3 rounded mb-4"
				name="confirmPassword"
				required={true}
				placeholder="Confirm New Password"
				autocomplete="new-password"
				on:input={validatePassword}
				bind:value={confirmPassword}
			/>
			<div class="strength">
				<span class="bar bar-1" class:bar-show={strength > 0} />
				<span class="bar bar-2" class:bar-show={strength > 1} />
				<span class="bar bar-3" class:bar-show={strength > 2} />
				<span class="bar bar-4" class:bar-show={strength > 3} />
			</div>

			<ul class="list-none text-left">
				<li>
					<span class="text-[10px]">{validations[0] ? '✔️' : '❌'}</span>
					<span class="text-sm">must be at least 8 characters</span>
				</li>
				<li>
					<span class="text-[10px]">{validations[1] ? '✔️' : '❌'}</span>
					<span class="text-sm">must contain a capital letter</span>
				</li>
				<li>
					<span class="text-[10px]">{validations[2] ? '✔️' : '❌'}</span>
					<span class="text-sm">must contain a number</span>
				</li>
				<li>
					<span class="text-[10px]">{validations[3] ? '✔️' : '❌'}</span>
					<span class="text-sm">must contain one symbol ($ & + , : ; = ? # ^ !)</span>
				</li>
			</ul>
			{#if errorMessage !== ''}
				<AuthErrorMessage message={errorMessage} />
			{/if}
			{#if successMessage === ''}
				<button
					type="submit"
					class="w-full text-center py-3 rounded-full bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1 disabled:opacity-25"
					value=""
					disabled={!canGo}
				>
					Create Account
				</button>
			{/if}
			{#if successMessage !== ''}
				<AuthSuccessMessage message={successMessage} />

				<a
					type="button"
					class="text-center cursor-pointer max-w-80 no-underline hover:underline mt-2 p-1 text-grey bg-green-500 rounded-xl"
					href="/auth/redirect"
				>
					Tap here to continue...
				</a>
			{/if}
		</form>
		<div class="text-center text-sm text-gray-900 mt-1">
			By signing up, you agree to the
			<a class="no-underline text-orange-600" href="/policies/termsofservice">Terms of Service</a>
			and
			<a class="no-underline text-orange-600" href="/policies/privacy">Privacy Policy</a>
		</div>
	</div>

	<div class="text-gray-900 mt-3">
		Already have an account?
		<a class="no-underline text-blue" href="../auth/signin/">Sign in</a>
		.
	</div>
</div>

<style>
	.strength {
		display: flex;
		height: 15px;
		width: 100%;
	}
	.bar {
		margin-right: 2px;
		border-radius: 5px;
		height: 100%;
		width: 25%;
		transition: box-shadow 500ms;
		box-shadow: inset 0px 20px #f2f1f1;
	}
	.bar-show {
		box-shadow: none;
	}
	.bar-1 {
		background: linear-gradient(to right, red, orangered);
	}
	.bar-2 {
		background: linear-gradient(to right, orangered, yellow);
	}
	.bar-3 {
		background: linear-gradient(to right, yellow, yellowgreen);
	}
	.bar-4 {
		background: linear-gradient(to right, yellowgreen, green);
	}
	.bar:last-child {
		margin-right: 0;
	}
</style>
