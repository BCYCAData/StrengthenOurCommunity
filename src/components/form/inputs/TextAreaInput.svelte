<script>
	export let lableClass;
	export let headingText;
	export let nameText;
	export let divClass;
	export let textAreaClass;
	export let inputValue;
</script>

<label class={lableClass} for={nameText}>{headingText}</label>
<div class={divClass}>
	<textarea id={nameText} name={nameText} class={textAreaClass} value={inputValue} />
</div>
