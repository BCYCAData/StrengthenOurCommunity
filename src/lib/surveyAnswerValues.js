// Keep a deliberate zero distinguishable from an unanswered numeric input.
export function optionalCount(value) {
	if (value == null || String(value).trim() === '') return null;
	const text = String(value).trim();
	if (!/^\d+$/.test(text)) return null;
	const count = Number(text);
	return Number.isSafeInteger(count) && count <= 32767 ? count : null;
}

// Explicit None must never be saved alongside any substantive checkbox option.
export function choiceGroup(values, value, checked, noneValue = 0) {
	const selected = new Set((values || []).map(Number));
	const numeric = Number(value);
	if (checked) selected.add(numeric);
	else selected.delete(numeric);
	if (checked && numeric === noneValue) return [noneValue];
	if (checked) selected.delete(noneValue);
	return [...selected];
}
