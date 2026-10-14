const VOLUME_UNITS = {
	teaspoon: 1.0,
	teaspoons: 1.0,
	tsp: 1.0,
	cdta: 1.0,
	cdtas: 1.0,
	cucharadita: 1.0,
	cucharaditas: 1.0,
	tablespoon: 3.0,
	tablespoons: 3.0,
	tbsp: 3.0,
	cda: 3.0,
	cdas: 3.0,
	cucharada: 3.0,
	cucharadas: 3.0,
	cup: 48.0,
	cups: 48.0,
	tz: 48.0,
	tzs: 48.0,
	taza: 48.0,
	tazas: 48.0,
};

const WEIGHT_UNITS = {
	gram: 1.0,
	grams: 1.0,
	g: 1.0,
	gramo: 1.0,
	gramos: 1.0,
	kilogram: 1000.0,
	kilograms: 1000.0,
	kg: 1000.0,
	kilo: 1000.0,
	kilos: 1000.0,
	kilogramo: 1000.0,
	kilogramos: 1000.0,
};

export const formatFraction = (value, isTsp = false) => {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return '';

	const sign = numeric < 0 ? '-' : '';
	const absolute = Math.abs(numeric);
	const whole = Math.floor(absolute);
	const decimal = absolute - whole;

	if (decimal < 0.01) {
		return `${sign}${whole}`;
	}

	const fractions = [
		{ num: 1, den: 16, val: 1 / 16 },
		{ num: 1, den: 8, val: 1 / 8 },
		{ num: 1, den: 4, val: 1 / 4 },
		{ num: 1, den: 3, val: 1 / 3 },
		{ num: 3, den: 8, val: 3 / 8 },
		{ num: 1, den: 2, val: 1 / 2 },
		{ num: 5, den: 8, val: 5 / 8 },
		{ num: 2, den: 3, val: 2 / 3 },
		{ num: 3, den: 4, val: 3 / 4 },
		{ num: 7, den: 8, val: 7 / 8 },
		{ num: 1, den: 1, val: 1.0 },
	];

	if (isTsp) {
		fractions.unshift({ num: 1, den: 32, val: 1 / 32 });
	}

	let best = null;
	let minDiff = 10000;
	for (const candidate of fractions) {
		const diff = Math.abs(decimal - candidate.val);
		if (diff < minDiff) {
			minDiff = diff;
			best = candidate;
		}
	}

	if (!best || best.val >= 0.99) {
		return `${sign}${whole + 1}`;
	}

	const fracStr = `${best.num}/${best.den}`;
	return whole > 0 ? `${sign}${whole} ${fracStr}` : `${sign}${fracStr}`;
};

const scaledQuantity = (ingredient) => {
	const quantity = Number(ingredient?.cantidad);
	if (!Number.isFinite(quantity)) return null;

	const scheduledServings = Number(ingredient?.get_servings);
	if (!Number.isFinite(scheduledServings)) return quantity;

	const subrecipePortion =
		ingredient?.subrecipe && typeof ingredient.subrecipe === 'object'
			? Number(ingredient.subrecipe.porcion)
			: NaN;
	const basePortion = Number.isFinite(subrecipePortion)
		? subrecipePortion
		: Number(ingredient?.porcion);

	if (!Number.isFinite(basePortion) || basePortion <= 0) return quantity;
	return (quantity * scheduledServings) / basePortion;
};

const isToTaste = (ingredient) =>
	Number(ingredient?.tipo_medida_id) === 4 ||
	String(ingredient?.medida || '').trim().toLowerCase() === 'al gusto';

const getVolumeFactor = (ingredient) => {
	const english = String(ingredient?.medida_english || '').trim().toLowerCase();
	const display = String(ingredient?.medida || '').trim().toLowerCase();
	return VOLUME_UNITS[english] ?? VOLUME_UNITS[display] ?? null;
};

const getWeightFactor = (ingredient) => {
	const english = String(ingredient?.medida_english || '').trim().toLowerCase();
	const display = String(ingredient?.medida || '').trim().toLowerCase();
	return WEIGHT_UNITS[english] ?? WEIGHT_UNITS[display] ?? null;
};

export const aggregateShoppingListIngredient = (ingredient) => {
	const occurrences = [ingredient, ...(ingredient?.repeat || [])];
	let hasToTaste = false;
	let volumeTeaspoons = 0;
	let hasVolume = false;
	let weightGrams = 0;
	let hasWeight = false;
	const otherTotals = new Map();
	const unitOrder = [];

	occurrences.forEach((occurrence) => {
		if (isToTaste(occurrence)) {
			hasToTaste = true;
			return;
		}

		const quantity = scaledQuantity(occurrence);
		if (quantity === null) return;

		const volumeFactor = getVolumeFactor(occurrence);
		if (volumeFactor !== null) {
			if (!unitOrder.includes('__volume__')) {
				unitOrder.push('__volume__');
			}
			volumeTeaspoons += quantity * volumeFactor;
			hasVolume = true;
			return;
		}

		const weightFactor = getWeightFactor(occurrence);
		if (weightFactor !== null) {
			if (!unitOrder.includes('__weight__')) {
				unitOrder.push('__weight__');
			}
			weightGrams += quantity * weightFactor;
			hasWeight = true;
			return;
		}

		const englishUnit = String(occurrence?.medida_english || '').trim().toLowerCase();
		const displayUnit = String(occurrence?.medida || '').trim();
		const unitKey = englishUnit && englishUnit !== 'na'
			? englishUnit
			: displayUnit.toLowerCase();

		if (!unitOrder.includes(unitKey)) {
			unitOrder.push(unitKey);
		}

		const existing = otherTotals.get(unitKey) || {
			quantity: 0,
			singular: displayUnit,
			plural: String(occurrence?.medida_plural || displayUnit).trim(),
			isTsp: false,
		};
		existing.quantity += quantity;
		otherTotals.set(unitKey, existing);
	});

	const finalTotals = [];

	unitOrder.forEach((key) => {
		if (key === '__volume__' && hasVolume && volumeTeaspoons > 0) {
			if (volumeTeaspoons < 3) {
				finalTotals.push({
					quantity: volumeTeaspoons,
					singular: 'cdta',
					plural: 'cdtas',
					isTsp: true,
				});
			} else if (volumeTeaspoons < 12) {
				finalTotals.push({
					quantity: volumeTeaspoons / 3,
					singular: 'cda',
					plural: 'cdas',
					isTsp: false,
				});
			} else {
				finalTotals.push({
					quantity: volumeTeaspoons / 48,
					singular: 'tz',
					plural: 'tzs',
					isTsp: false,
				});
			}
		} else if (key === '__weight__' && hasWeight && weightGrams > 0) {
			if (weightGrams < 1000) {
				finalTotals.push({
					quantity: Math.round(weightGrams),
					singular: 'g',
					plural: 'g',
					isTsp: false,
				});
			} else {
				finalTotals.push({
					quantity: weightGrams / 1000,
					singular: 'kg',
					plural: 'kg',
					isTsp: false,
				});
			}
		} else if (otherTotals.has(key)) {
			finalTotals.push(otherTotals.get(key));
		}
	});

	const result = { ...ingredient, repeat: [] };

	if (finalTotals.length === 1 && !hasToTaste) {
		const total = finalTotals[0];
		if (Math.abs(total.quantity - Math.round(total.quantity)) < 1e-4) {
			result.cantidad = Math.round(total.quantity);
		} else {
			result.cantidad = formatFraction(total.quantity, total.isTsp);
		}
		result.medida = total.quantity > 1
			? total.plural || total.singular
			: total.singular;
		result.medida_plural = total.plural;
		return result;
	}

	const parts = finalTotals.map((total) => {
		const unit = total.quantity > 1
			? total.plural || total.singular
			: total.singular;
		return `${formatFraction(total.quantity, total.isTsp)} ${unit}`.trim();
	});
	if (hasToTaste) parts.push('al gusto');

	return {
		...result,
		cantidad: parts.join(' + '),
		medida: '',
		medida_plural: '',
	};
};
