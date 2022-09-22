<script>
	/**@type {string}
	 * @description Text for the question
	 */
	export let headingText = '';

	/**@type {string}
	 * @description Tailwind class string to style a div element after the  headingText
	 */
	export let headingClass = '';

	/**@type {string}
	 * @description Tailwind class string to style the Unordered List element
	 */
	export let ulClass = '';

	/**@type {string}
	 * @description Tailwind class string to style individual List elements
	 */
	export let liClass = '';

	/**@type {string}
	 * @description The input type attribute see @link developer.mozilla.org/en-US/docs/Web/HTML/Element/input
	 */
	export let inputType = '';

	/**@type {string}
	 *@description Input name & id. Needs to match the target table column name.
	 */
	export let inputName = '';

	/**@type {boolean}
	 * @description Whether a value must be present to enable submission of the form
	 */
	export let inputRequired = false;

	/**@type {string}
	 * @description Input hint for text based inputs
	 */
	export let inputPlaceholder = '';

	/**@type {string}
	 * @description What guidance the browser should follow to provide assistance in filling out the field
	 * see @link developer.mozilla.org/en-US/docs/Web/HTML/Element/input
	 */
	export let inputAutocomplete = '';

	/**@type {string}
	 *  @description Tailwind class string to style individual Input elements
	 */
	export let inputClass = '';

	/**@type {Object[]}
	 * @description Array of {value:<T>, lable: ''} objects for the input.
	 * <T> can be boolean, number or string
	 */
	export let optionsArray = [];
</script>

<div>
	<h3>{headingText}</h3>
	{#if inputType === 'text'}
		<div class={headingClass}>
			<input
				type={inputType}
				id={inputName}
				name={inputName}
				class={inputClass}
				required={inputRequired}
				placeholder={inputPlaceholder}
				autocomplete={inputAutocomplete}
			/>
		</div>
	{:else if inputType === 'radio'}
		<div class={headingClass}>
			<ul class={ulClass}>
				{#each optionsArray as { value, lable }}
					<li class={liClass}>
						<input name={inputName} type="radio" {value} required={inputRequired} />
						<label for={inputName}>{lable}</label>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
