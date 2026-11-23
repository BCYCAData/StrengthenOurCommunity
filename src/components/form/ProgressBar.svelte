<script>
	export let steps = [];
	export let currentActive = 1;
	export function handleProgress(increment) {
		currentActive = Math.max(1, Math.min(steps.length, Number(currentActive) + increment));
	}
	export function skipTo(event) {
		currentActive = Number(event.currentTarget.dataset.index);
	}
</script>

<nav aria-label="Survey progress">
	<p>Step {currentActive} of {steps.length}</p>
	<ol>
		{#each steps as step, index}<li>
				<button
					type="button"
					class:active={index + 1 === Number(currentActive)}
					data-index={index + 1}
					aria-label={`Go to survey step ${index + 1} of ${steps.length}`}
					aria-current={index + 1 === Number(currentActive) ? 'step' : undefined}
					on:click={skipTo}
				>
					{index + 1}
				</button>
			</li>{/each}
	</ol>
</nav>

<style>
	nav {
		margin: 1rem auto;
		text-align: center;
	}
	ol {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.3rem;
		list-style: none;
		padding: 0;
	}
	button {
		min-width: 44px;
		min-height: 48px;
		border: 2px solid #a56a3a;
		border-radius: 0.5rem;
		background: #fff8ed;
		color: #542b0a;
	}
	button.active {
		background: #a64d05;
		color: white;
		font-weight: 700;
	}
	button:focus-visible {
		outline: 3px solid #16534a;
		outline-offset: 3px;
	}
</style>
