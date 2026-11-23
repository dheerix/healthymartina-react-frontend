import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecipeNutrition } from './RecipeNutrition';

const nutrientes = {
	info: [
		{ id: 94, nombre: 'Calorías', cantidad: 100, unidad_medida: 'kcal' },
		{ id: 104, nombre: 'Magnesio', cantidad: 20, unidad_medida: 'mg' },
	],
};

describe('RecipeNutrition', () => {
	it('shows any nutrient selected in the profile', () => {
		render(
			<RecipeNutrition
				nutrientes={nutrientes}
				filterInfo={[104]}
				filterEnabled
			/>
		);

		expect(screen.getByText('Magnesio')).toBeInTheDocument();
		expect(screen.queryByText('Calorías')).not.toBeInTheDocument();
	});

	it('allows a profile to hide every nutrient', () => {
		render(
			<RecipeNutrition
				nutrientes={nutrientes}
				filterInfo={[]}
				filterEnabled
			/>
		);

		expect(screen.queryByText('Calorías')).not.toBeInTheDocument();
		expect(screen.queryByText('Magnesio')).not.toBeInTheDocument();
	});

	it('shows all available nutrition when no profile filter applies', () => {
		render(<RecipeNutrition nutrientes={nutrientes} />);

		expect(screen.getByText('Calorías')).toBeInTheDocument();
		expect(screen.getByText('Magnesio')).toBeInTheDocument();
	});
});
