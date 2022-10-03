<script>
	import { page } from '$app/stores';
	import PasswordEntry from '$components/form/auth/PasswordEntry.svelte';
	import { onMount } from 'svelte';

	const url = new URLSearchParams($page.url.hash.substring(1));
	const redirectType = url.get('type');
	const message = url.get('message');
	const accessToken = url.get('access_token');

	let haveSurvey = false;

	onMount(async () => {
		if (redirectType === 'signup') {
			const response = await fetch('/api/data/userdata', {
				method: 'POST',
				body: JSON.stringify({
					token: accessToken
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});
			const data = await response.json();
			console.log(data);
			haveSurvey = data.redirect;
		}
	});
</script>

<svelte:head>
	<title>Redirect</title>
</svelte:head>

{#if redirectType === 'invite'}
	<PasswordEntry {redirectType} {accessToken} {url} />
{:else if redirectType === 'signup'}
	<section class="flex flex-col items-center text-center mt-5 sm:mt-1 mx-auto h-full max-w-3xl">
		<h1 class="title-font mt-2 font-bold underline hidden sm:block sm:text-2xl text-orange-600">
			Thank you for joining our Strengthen Our Community Project.
		</h1>
		{#if haveSurvey}
			<p class="text-base mt-3 mb-0 sm:text-lg ">
				Please step through our project survey again and ensure you answers are still valid and
				answer the new ones we have added. <b>Don't forget to save your answers at step 12.</b>
			</p>
		{/if}
		<p class="text-base mt-3 mb-0 sm:text-lg ">
			We hope that the questions in our project survey prompt you to review your preparedness for
			fire and flood. By completing our project survey you are helping to protect our community.
		</p>

		<p class="text-base mt-3 mb-0 sm:text-lg ">
			You are the only person who will see your information.
		</p>
		<p class="text-base mt-3 mb-0 sm:text-lg ">
			We will never sell your data, it will only ever be shared with emergency services in an
			emergency situation. However, they will not see any of your personal information.
		</p>
		<p class="text-base mt-3 mb-0 sm:text-lg ">
			If you have any questions don’t hesitate to contact either
		</p>
		<p class="text-base mt-3 mb-0 sm:text-lg ">Helen 0424 515 963 or Christine 0488 288 661</p>
		<a
			type="button"
			class="no-underline w-1/3 text-center py-3 rounded-full bg-orange-500 text-stone-100 hover:bg-orange-700 focus:outline-none my-1 disabled:opacity-25"
			href="/survey"
		>
			Complete the Survey
		</a>
	</section>
{:else if redirectType === 'recovery'}
	<PasswordEntry {redirectType} {accessToken} />
{:else if message && redirectType === null}
	<section class="flex flex-col items-center text-center mt-5 sm:mt-1 mx-auto h-full max-w-3xl">
		<h1 class="title-font font-bold underline hidden sm:block sm:text-2xl text-orange-600">
			Strengthen OUR Community
		</h1>
		<div class="bg-green-100 rounded-lg mt-2 text-gray-900 items-center w-full">
			<p class="my-1 text-xl">You need to validate your new email address.</p>
			<p>{message}</p>
		</div>
	</section>
{:else if redirectType === 'email_change'}
	<section class="flex flex-col items-center text-center mt-5 sm:mt-1 mx-auto h-full max-w-3xl">
		<h1 class="title-font font-bold underline hidden sm:block sm:text-2xl text-orange-600">
			Strengthen OUR Community
		</h1>
		<div class="bg-green-100 rounded-lg mt-2 text-gray-900 items-center w-full">
			<p class="my-1 text-xl">Your login email has been changed.</p>
		</div>
	</section>
{:else}
	<section class="flex flex-col items-center text-center mt-5 sm:mt-1 mx-auto h-full max-w-3xl">
		<h1 class="title-font font-bold underline hidden sm:block sm:text-2xl text-orange-600">
			Strengthen OUR Community
		</h1>
		<div class="bg-green-100 rounded-lg mt-2 text-gray-900 items-center w-full">
			<p class="my-1 text-xl">Your request has been lodged.</p>
			<p class="my-1 text-xl">Please check you email inbox to confirm your details.</p>
			<p>You may need to 'Send/Receive'.</p>
			<p>If nothing is showing check your 'Spam' folder.</p>
		</div>
	</section>
{/if}
