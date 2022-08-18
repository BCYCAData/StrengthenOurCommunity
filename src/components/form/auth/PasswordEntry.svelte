<script>
	export let redirectType;

	let strength = 0;
	let validations = [];
	let showPassword = false;

	let heading = '';
	let submitText = '';

	$: password = '';
	$: confirmPassword = '';
	$: canGo = password === confirmPassword && strength === 4;

	if (redirectType == 'invite') {
		heading = 'Thank you for accepting our invitation.';
		submitText = 'Please Set a Password';
	} else if (redirectType == 'recovery') {
		heading = 'Please enter your new password.';
		submitText = 'Set new Password';
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
</script>

<div class="container max-w-sm mx-auto flex-1 flex flex-col items-center justify-center px-2">
	<div class="bg-stone-200 px-6 py-8 rounded shadow-md text-gray-900 w-full">
		<form action="/api/auth/updateuser" method="POST">
			<h1 class="mb-8 text-3xl text-center">{heading}</h1>
			<label
				class="inline uppercase tracking-wide text-orange-900 text-xs font-bold"
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
				type={showPassword ? 'text' : 'password'}
				class="block border border-orange-700 w-full py-3 rounded mb-4"
				name="password"
				required={true}
				placeholder="New Password"
				autocomplete="new-password"
				on:input={validatePassword}
				value={password}
			/>
			<label
				class="inline uppercase tracking-wide text-orange-900 text-xs font-bold"
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
				type={showPassword ? 'text' : 'password'}
				class="block border border-orange-700 w-full py-3 rounded mb-4"
				name="confirmPassword"
				required={true}
				placeholder="Confirm New Password"
				autocomplete="new-password"
				on:input={validatePassword}
				value={confirmPassword}
			/>
			<div class="strength">
				<span class="bar bar-1" class:bar-show={strength > 0} />
				<span class="bar bar-2" class:bar-show={strength > 1} />
				<span class="bar bar-3" class:bar-show={strength > 2} />
				<span class="bar bar-4" class:bar-show={strength > 3} />
			</div>

			<ul class="list-none text-left">
				<li>
					<span class="text-xs">{validations[0] ? '✔️' : '❌'}</span>
					<span class="text-sm">must be at least 8 characters</span>
				</li>
				<li>
					<span class="text-xs">{validations[1] ? '✔️' : '❌'}</span>
					<span class="text-sm">must contain a capital letter</span>
				</li>
				<li>
					<span class="text-xs">{validations[2] ? '✔️' : '❌'}</span>
					<span class="text-sm">must contain a number</span>
				</li>
				<li>
					<span class="text-xs">{validations[3] ? '✔️' : '❌'}</span>
					<span class="text-sm">must contain one symbol ($ & + , : ; = ? # ^ !)</span>
				</li>
			</ul>
			<input type="hidden" id="mode" name="mode" value={redirectType} />
			<button
				type="submit"
				class="w-full text-center text-xl py-3 rounded-full bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1 disabled:opacity-25"
				disabled={!canGo}
			>
				{submitText}
			</button>
		</form>
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
