<script>
	import { yesNoOptions, accessOptions } from '$lib/profileOptions';
	import { formatMobile, formatPhone } from '$lib/utils';

	/**
	 * Need to get the validAddress & searchAddress from the address challenge into a store
	 * and validate this address OR populate the address
	 */
	const validateAddress = (e) => {
		console.log('Validate address:  ', e.currentTarget.value);
	};
	export let surveyData;
	let otherAccessChecked = surveyData.truck_access === 4 ? true : false;
	let rentingChecked = surveyData.property_rented;
</script>

<h3 class="text-base sm:text-lg">What is your name?</h3>
<div class="p-2 rounded-lg bg-orange-300">
	<div class="flex flex-wrap w-full">
		<input
			type="text"
			id="first_name"
			name="first_name"
			class="w-5/12  border border-orange-700 rounded sm:text-lg"
			placeholder="First Name"
			autocomplete="given-name"
			style="text-transform:uppercase"
			on:change={(e) => {
				validateAddress(e);
			}}
			bind:value={surveyData.first_name}
		/>
		<input
			type="text"
			id="family_name"
			name="family_name"
			class="w-6/12 ml-2 border border-orange-700 rounded sm:text-lg"
			placeholder="Family Name"
			autocomplete="family_name"
			style="text-transform:uppercase"
			on:change={(e) => {
				validateAddress(e);
			}}
			bind:value={surveyData.family_name}
		/>
	</div>
</div>

<h3 class="text-base sm:text-lg">What is your property address?</h3>
<div class="p-2 rounded-lg bg-orange-300">
	<input
		type="text"
		id="property_address_street"
		name="property_address_street"
		class="w-full border border-orange-700 rounded sm:text-lg"
		placeholder="Street Address"
		autocomplete="street-address"
		style="text-transform:uppercase"
		on:change={(e) => {
			validateAddress(e);
		}}
		bind:value={surveyData.property_address_street}
	/>
	<div class="flex flex-wrap w-full">
		<input
			type="text"
			id="property_address_suburb"
			name="property_address_suburb"
			class="w-8/12 border border-orange-700 rounded sm:text-lg"
			placeholder="Suburb"
			autocomplete="address-level2"
			style="text-transform:uppercase"
			on:change={(e) => {
				validateAddress(e);
			}}
			bind:value={surveyData.property_address_suburb}
		/>
		<input
			type="text"
			id="property_address_postcode"
			name="property_address_postcode"
			class="w-3/12 border border-orange-700 rounded sm:text-lg"
			placeholder="Postcode"
			autocomplete="postal-code"
			style="text-transform:uppercase"
			on:change={(e) => {
				validateAddress(e);
			}}
			bind:value={surveyData.property_address_postcode}
		/>
	</div>
</div>

<h3 class="text-base sm:text-lg">Are you renting this property?</h3>
<div class="p-2 flex flex-col justify-start rounded-lg bg-orange-300">
	<div class="pb-2 flex flex-row">
		{#each yesNoOptions as { value, lable }}
			{#if lable === 'Yes'}
				<li class="list-none sm:text-lg pr-3">
					<input
						on:change={() => {
							rentingChecked = true;
						}}
						name="property_rented"
						type="radio"
						bind:group={surveyData.property_rented}
						{value}
					/>
					<label for="property_rented">{lable}</label>
				</li>
			{:else}
				<li class="list-none sm:text-lg pr-3">
					<input
						on:change={() => {
							rentingChecked = false;
						}}
						name="property_rented"
						type="radio"
						bind:group={surveyData.property_rented}
						{value}
					/>
					<label for="property_rented">{lable}</label>
				</li>
			{/if}
		{/each}
	</div>
	<div class="flex justify-start flex-row sm:text-lg">
		<label class="pl-1" for="agent_name" hidden={rentingChecked === false}>Agent</label>
		<input
			type="text"
			class="ml-1 py-0 border border-orange-700 sm:text-lg sm:w-6/12 rounded"
			id="agent_name"
			name="agent_name"
			hidden={rentingChecked === false}
			bind:value={surveyData.agent_name}
		/>
		<label class="pl-4" for="agent_mobile" hidden={rentingChecked === false}>Mobile</label>
		<input
			type="text"
			class="ml-1 border border-orange-700 sm:text-lg sm:w-3/24 rounded"
			id="agent_mobile"
			name="agent_mobile"
			hidden={rentingChecked === false}
			bind:value={surveyData.agent_mobile}
		/>
		<label class="pl-4" for="agent_phone" hidden={rentingChecked === false}>Landline</label>
		<input
			type="text"
			class="ml-1 border border-orange-700 sm:text-lg sm:w-3/24 rounded"
			id="agent_phone"
			name="agent_phone"
			hidden={rentingChecked === false}
			bind:value={surveyData.agent_phone}
		/>
	</div>
</div>

<h3 class="text-base sm:text-lg">
	Is your property well sign-posted and numbered clearly from the road?
</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	{#each yesNoOptions as { value, lable }}
		<li class="list-none sm:text-lg pr-3">
			<input name="sign_posted" type="radio" bind:group={surveyData.sign_posted} {value} />
			<label for="sign_posted">{lable}</label>
		</li>
	{/each}
</div>

<h3 class="text-base sm:text-lg">
	Is there easy truck access to the buildings, boundaries and paddocks?
</h3>
<div class="p-2 flex justify-start rounded-lg bg-orange-300">
	<ul class="list-none w-full pl-0 m-0">
		{#each accessOptions as { value, lable }}
			{#if lable === 'Other'}
				<li class="sm:text-lg pr-3">
					<div class="flex flex-row ">
						<input
							on:change={() => {
								otherAccessChecked = !otherAccessChecked;
							}}
							name="truck_access"
							type="radio"
							bind:group={surveyData.truck_access}
							{value}
						/>
						<label class="ml-1" for="truck_access">{lable}</label>
						<input
							type="text"
							class="border border-orange-700 w-full rounded ml-2 sm:text-lg"
							id="truck_access_other_information"
							name="truck_access_other_information"
							hidden={otherAccessChecked === false}
							bind:value={surveyData.truck_access_other_information}
						/>
					</div>
				</li>
			{:else}
				<li class="sm:text-lg pr-3">
					<input
						on:change={() => {
							otherAccessChecked = false;
						}}
						name="truck_access"
						type="radio"
						bind:group={surveyData.truck_access}
						{value}
					/>
					<label for="truck_access">{lable}</label>
				</li>
			{/if}
		{/each}
	</ul>
</div>

<h3 class="text-base sm:text-lg">What is your phone number?</h3>
<div class="p-2 rounded-lg bg-orange-300">
	<div class="flex flex-row sm:text-lg">
		<label class="pl-2" for="mobile">Mobile</label>
		<input
			type="tel"
			class="ml-1 border border-orange-700 w-2/12 rounded sm:text-lg"
			id="mobile"
			name="mobile"
			placeholder="Mobile 0XXX XXX XXX"
			on:keydown={(e) => {
				if (['Backspace', 'Delete'].includes(e.key)) {
					surveyData.mobile = e.currentTarget.value;
				} else {
					e.preventDefault();
					surveyData.mobile = e.currentTarget.value;
					if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
						surveyData.mobile = formatMobile(surveyData.mobile, e.key);
					}
				}
			}}
			bind:value={surveyData.mobile}
			autocomplete="off"
		/>
		<label class="pl-2" for="phone">Landline</label>
		<input
			type="tel"
			class="ml-1 border border-orange-700 w-2/12 rounded sm:text-lg"
			id="phone"
			name="phone"
			placeholder="Landline XXXX XXXX"
			on:keydown={(e) => {
				if (['Backspace', 'Delete'].includes(e.key)) {
					surveyData.phone = e.currentTarget.value;
				} else {
					e.preventDefault();
					surveyData.phone = e.currentTarget.value;
					if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
						surveyData.phone = formatPhone(surveyData.phone, e.key);
					}
				}
			}}
			bind:value={surveyData.phone}
			autocomplete="tel-local"
		/>
	</div>
</div>

<h3 class="text-base sm:text-lg">What is the quality of your mobile reception at the property?</h3>
<div class="p-1 rounded-lg bg-orange-300">
	<ul class="flex my-0 items-center list-none sm:text-lg sm:w-1/2 sm:mx-auto">
		<div class="flex-auto font-semibold text-sm sm:text-base">Poor</div>
		{#each Array(5) as _, i}
			<li class="flex-auto">
				<input
					name="mobile_reception"
					type="radio"
					bind:group={surveyData.mobile_reception}
					value={i + 1}
				/>
				<label class="inline-block" for="mobile_reception">
					{i + 1}
				</label>
			</li>
		{/each}
		<div class="flex-auto font-semibold text-sm sm:text-base">Excellent</div>
	</ul>
</div>
