<script>
	import SurveyFormContainer from '$components/form/surveyForm/SurveyFormContainer.svelte';
	import ProgressBar from '$components/form/ProgressBar.svelte';

	let steps = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
	let currentActive = 1;
	let progressBar;

	const handleProgress = (stepIncrement) => {
		progressBar.handleProgress(stepIncrement);
	};

	const skipTo = (e) => {
		progressBar.skipTo(e);
	};

	export let surveyData;
</script>

<section class="mx-auto h-full w-full text-gray-900 bg-orange-300">
	<div class="mx-auto h-full w-full sm:w-11/12  bg-orange-100">
		<SurveyFormContainer active_step={steps[currentActive - 1]} {surveyData} />
		<div class="mx-auto w-full sm:w-8/12">
			<ProgressBar
				{steps}
				bind:currentActive
				bind:this={progressBar}
				on:click={(e) => {
					skipTo(e);
				}}
			/>
			<div class="mt-1 text-center">
				<button
					class="px-[20px] py-[6px] text-stone-100 bg-orange-500 rounded-xl focus:outline-none active:transform scale 98 disabled:cursor-not-allowed disabled:bg-slate-300"
					on:click={() => handleProgress(-1)}
					disabled={currentActive == 1}
				>
					Prev
				</button>
				<button
					class="px-[20px] py-[6px] text-stone-100 bg-orange-500 rounded-xl focus:outline-none active:transform scale 98 disabled:cursor-not-allowed disabled:bg-slate-300"
					on:click={() => handleProgress(+1)}
					hidden={currentActive == steps.length}
				>
					Next
				</button>
			</div>
		</div>
	</div>
</section>
