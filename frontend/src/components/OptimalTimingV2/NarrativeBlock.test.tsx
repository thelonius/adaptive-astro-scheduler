import { render, screen } from '@testing-library/react';
import { NarrativeBlock } from './NarrativeBlock';

describe('NarrativeBlock', () => {
    it('renders narrative text when present', () => {
        render(
            <NarrativeBlock
                narratives={{ practical_cleanup: 'Луна в Раке настраивает на бытовое внимание.' }}
                selectedVibeId="practical_cleanup"
            />,
        );
        expect(screen.getByText(/Луна в Раке/)).toBeInTheDocument();
    });

    it('renders skeleton placeholder when narratives is undefined (still loading)', () => {
        const { container } = render(<NarrativeBlock narratives={undefined} selectedVibeId="practical_cleanup" />);
        expect(container.querySelector('.otv2-narrative-skeleton')).toBeInTheDocument();
    });

    it('renders fallback text when the selected vibe has no narrative', () => {
        render(
            <NarrativeBlock
                narratives={{ practical_cleanup: 'something' }}
                selectedVibeId="missing_vibe"
            />,
        );
        // Fallback should be visible — the test checks for any text that hints "not available"
        expect(screen.getByText(/недоступно|not available/i)).toBeInTheDocument();
    });

    it('renders nothing meaningful when no vibe is selected', () => {
        const { container } = render(
            <NarrativeBlock
                narratives={{ practical_cleanup: 'something' }}
                selectedVibeId={null}
            />,
        );
        // Should not crash, should not render the narrative paragraph
        expect(container.querySelector('.otv2-narrative-text')).toBeNull();
    });
});
