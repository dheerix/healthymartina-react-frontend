import { aggregateShoppingListIngredient } from '../../../utils/shopping-list/shoppingListUtils';

const ingredient = (cantidad, medida, medidaPlural, porcion, servings, english = 'unit') => ({
	cantidad,
	medida,
	medida_plural: medidaPlural,
	medida_english: english,
	tipo_medida_id: 1,
	porcion,
	get_servings: servings,
});

describe('aggregateShoppingListIngredient', () => {
	test('scales and sums all scheduled occurrences', () => {
		const source = ingredient(3, 'scoop', 'scoops', 3, 1);
		source.repeat = [
			ingredient(3, 'scoop', 'scoops', 3, 1),
			ingredient(3, 'scoop', 'scoops', 3, 1),
		];

		expect(aggregateShoppingListIngredient(source)).toMatchObject({
			cantidad: 3,
			medida: 'scoops',
			repeat: [],
		});
	});

	test('keeps original units instead of adding incompatible measurements', () => {
		const source = ingredient(1 / 3, 'pza', 'pzas', 1, 1, 'piece');
		source.repeat = [
			ingredient(1 / 3, 'pza', 'pzas', 1, 1, 'piece'),
			ingredient(75, 'g', 'g', 1, 1, 'gram'),
		];

		expect(aggregateShoppingListIngredient(source).cantidad).toBe('2/3 pza + 75 g');
	});

	test('converts mixed volume units and normalizes ratios', () => {
		const source = ingredient(1.5625, 'cdta', 'cdtas', 1, 1, 'teaspoon');
		source.repeat = [
			ingredient(8.9167, 'cda', 'cdas', 1, 1, 'tablespoon'),
		];

		const result = aggregateShoppingListIngredient(source);
		expect(result.cantidad).toBe('5/8');
		expect(result.medida).toBe('tz');
	});

	test('keeps to taste once alongside numeric units', () => {
		const source = ingredient(1 / 8, 'cdta', 'cdtas', 1, 1, 'teaspoon');
		source.repeat = [
			ingredient(1 / 2, 'cdta', 'cdtas', 1, 1, 'teaspoon'),
			{
				cantidad: 1,
				medida: 'al gusto',
				tipo_medida_id: 4,
			},
		];

		expect(aggregateShoppingListIngredient(source).cantidad).toBe('5/8 cdta + al gusto');
	});

	test('converts 2 1/3 cdtas + 23/48 tz into 1/2 tz', () => {
		const source = ingredient(7 / 3, 'cdta', 'cdtas', 1, 1, 'teaspoon');
		source.repeat = [
			ingredient(23 / 48, 'tz', 'tzs', 1, 1, 'cup'),
		];

		const result = aggregateShoppingListIngredient(source);
		expect(result.cantidad).toBe('1/2');
		expect(result.medida).toBe('tz');
	});
});
