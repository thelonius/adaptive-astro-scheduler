import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneratedRecipePanel } from './GeneratedRecipePanel';
import type { GeneratedRecipe } from '../../services/optimalTimingV2Service';

const recipe: GeneratedRecipe = {
    intent: 'launch a coffee shop',
    rationale: 'For a new business launch...',
    disqualifiers: [{ type: 'moon_void_of_course' }],
    weighted_conditions: [{ predicate: { type: 'moon_waxing' }, weight: 8 }],
    vibes: [
        { id: 'aggressive_growth', label: 'aggressive growth', emoji: '🚀' },
        { id: 'sustainable_build', label: 'sustainable build', emoji: '🌱' },
    ],
    metadata: {},
};

const llm = { model: 'mock', prompt_version: 'recipe.v2', cached: false, attempts: 1 };

describe('GeneratedRecipePanel vibes', () => {
    it('renders vibes chips when expanded', async () => {
        const user = userEvent.setup();
        render(<GeneratedRecipePanel recipe={recipe} llm={llm} />);
        await user.click(screen.getByRole('button')); // expand
        expect(screen.getByText(/aggressive growth/i)).toBeInTheDocument();
        expect(screen.getByText(/sustainable build/i)).toBeInTheDocument();
        expect(screen.getByText('🚀')).toBeInTheDocument();
    });

    it('does not crash when vibes is empty', async () => {
        const user = userEvent.setup();
        render(<GeneratedRecipePanel recipe={{ ...recipe, vibes: [] }} llm={llm} />);
        await user.click(screen.getByRole('button'));
        expect(screen.getByText(/launch a coffee shop/)).toBeInTheDocument();
    });
});
