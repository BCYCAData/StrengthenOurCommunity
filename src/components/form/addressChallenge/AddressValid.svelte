<script>
	import AuthErrorMessage from '$components/form/AuthErrorMessage.svelte';

	export let searchAddress;
	export let validAddress;
	export let community;
	export let oid;
	export let gid;

	let email = '';
	let strength = 0;
	let validations = [];
	let showPassword = false;

	$: password = '';
	$: confirmPassword = '';
	$: canGo = validEmail && strength === 5;
	$: validEmail = validateEmail(email);

	function validateEmail(email) {
		let emailRegEx =
			/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return emailRegEx.test(String(email).toLowerCase());
	}

	function validatePassword(e) {
		const passwordValue = e.target.value;
		validations = [
			passwordValue.length > 8,
			passwordValue.search(/[A-Z]/) > -1,
			passwordValue.search(/[0-9]/) > -1,
			passwordValue.search(/[$&+,:;=?#^!]/) > -1,
			passwordValue === confirmPassword
		];
		strength = validations.reduce((acc, cur) => acc + cur, 0);
	}

	function validateConfirmPassword(e) {
		const passwordValue = e.target.value;
		validations = [
			passwordValue.length > 8,
			passwordValue.search(/[A-Z]/) > -1,
			passwordValue.search(/[0-9]/) > -1,
			passwordValue.search(/[?~!@#%^&$&*()_+-=,:;=|]/) > -1,
			passwordValue === password
		];
		strength = validations.reduce((acc, cur) => acc + cur, 0);
	}

	function togglePassword(node, showPassword) {
		return {
			update(showPassword) {
				if (showPassword) {
					node.type = 'text';
				} else {
					node.type = 'password';
				}
			}
		};
	}
	let errorMessage = '';
</script>

<div class="bg-green-100 mt-1 rounded-lg">
	<p class="font-semibold text-center text-lg m-1">
		{searchAddress}
	</p>
	{#if searchAddress.replace(',', '') !== validAddress}
		<p class="text-center m-1">( {validAddress} )</p>
	{/if}
	<p class="text-center m-1">
		is part of the
		<span class="font-semibold">{community}</span>
		community.
	</p>
</div>
<div class="max-w-sm mx-auto flex-1 flex flex-col items-center justify-center px-2">
	<div class="px-6 py-2 rounded shadow-md text-gray-900 w-full">
		<div class="mt-2 mb-3">
			Please enter your email address and a password to completes the registration process.
		</div>
		<form action="/api/auth/signup" method="POST">
			<input id="oid" type="hidden" name="oid" bind:value={oid} />
			<input id="gid" type="hidden" name="gid" bind:value={gid} />
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
					class="text-2xl text-gray-900 font-normal ml-3  align-middle "
					on:mouseenter={() => (showPassword = true)}
					on:mouseleave={() => (showPassword = false)}
				>
					{showPassword ? '👁️' : '👁️'}
					<!-- {showPassword ? '🙈' : '🐵'} -->
				</span>
			</label>
			<input
				id="password"
				use:togglePassword={showPassword}
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
					class="text-2xl text-gray-900 font-normal ml-3  align-middle "
					on:mouseenter={() => (showPassword = true)}
					on:mouseleave={() => (showPassword = false)}
				>
					{showPassword ? '👁️' : '👁️'}
					<!-- {showPassword ? '🙈' : '🐵'} -->
				</span>
			</label>

			<input
				id="confirmPassword"
				use:togglePassword={showPassword}
				type="password"
				class="block border border-orange-700 w-full py-3 rounded mb-4"
				name="confirmPassword"
				required={true}
				placeholder="Confirm New Password"
				autocomplete="new-password"
				on:input={validateConfirmPassword}
				bind:value={confirmPassword}
			/>
			<div class="strength">
				<span class="bar bar-1" class:bar-show={strength > 0} />
				<span class="bar bar-2" class:bar-show={strength > 1} />
				<span class="bar bar-3" class:bar-show={strength > 2} />
				<span class="bar bar-4" class:bar-show={strength > 3} />
			</div>

			<ul class="list-none text-left pl-1">
				Must have:
				<li class="pl-4">
					<span class="text-[10px]">{validations[0] ? '✔️' : '❌'}</span>
					<span class="text-sm">at least 8 characters</span>
				</li>
				<li class="pl-4">
					<span class="text-[10px]">{validations[1] ? '✔️' : '❌'}</span>
					<span class="text-sm">at least 1 capital letter</span>
				</li>
				<li class="pl-4">
					<span class="text-[10px]">{validations[2] ? '✔️' : '❌'}</span>
					<span class="text-sm">at least 1 number</span>
				</li>
				<li class="pl-4">
					<span class="text-[10px]">{validations[3] ? '✔️' : '❌'}</span>
					<span class="text-sm">at least 1 symbol (?~!@#%^&$&*_+-=,:;=|)</span>
				</li>
				<li class="pl-4">
					<span class="text-[10px]">{validations[4] ? '✔️' : '❌'}</span>
					<span class="text-sm">matching passwords</span>
				</li>
			</ul>
			{#if errorMessage !== ''}
				<AuthErrorMessage message={errorMessage} />
			{/if}
			<button
				type="submit"
				class="w-full text-center py-3 rounded-full bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1 disabled:opacity-25"
				value=""
				disabled={!canGo}
			>
				Create Account
			</button>
		</form>
		<div class="text-center text-sm text-gray-900 mt-1">
			By signing up, you agree to the
			<a class="no-underline text-orange-600" href="/policies/termsofservice">Terms of Service</a>
			and
			<a class="no-underline text-orange-600" href="/policies/privacy">Privacy Policy</a>
		</div>
	</div>

	<div class="text-gray-900 mt-3">
		Already have an Account?
		<a class="no-underline text-blue" href="../auth/signin/">Sign in</a>
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
