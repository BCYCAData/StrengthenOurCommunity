<script>
	export let section = 'information';
</script>

<section class="community-information">
	{#if section === 'ready'}
		<h2>Getting Ready Together</h2>
		<p>
			By completing this survey and preparing yourself and your property you are helping our
			community to get ready together.
		</p>
		<p>
			We hold an annual Getting Ready Together event at Burrell Creek Hall which will be advertised
			in The Burrell Creek Notes and on our Facebook page.
		</p>
		<p>In an emergency situation the Burrell Creek Hall will be opened as an information point.</p>
		<p>
			The Hall has a generator, solar batteries, satellite internet, Telstra booster, toilets and a
			small kitchen.
		</p>
	{:else}
		<h2>Information</h2>
		<p>
			The Rural Fire Service has lots of resources available in the <a
				href="https://www.rfs.nsw.gov.au/plan-and-prepare"
			>
				Plan and Prepare section of their website
			</a>
			.
		</p>
		<p>
			Burrell Creek Hall has lots of information available on our <a
				href="https://www.facebook.com/p/Burrell-Creek-Youth-and-Community-Association-Inc-100080354636275/"
			>
				Facebook page
			</a>
			, or call
			<a href="tel:+61265151460">02 6515 1460</a>
			.
		</p>
		<p>
			There are lots of events held at the Hall, these will be advertised in The Burrell Creek Notes
			and on our Facebook page.
		</p>
	{/if}
</section>

<style>
	.community-information {
		padding: 1.25rem;
		color: #542b0a;
		line-height: 1.6;
	}
	h2 {
		font-size: 1.4rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}
	p {
		margin-block: 0.75rem;
	}
	a {
		text-decoration: underline;
	}
	a:focus-visible {
		outline: 3px solid #16534a;
		outline-offset: 3px;
	}
</style>
