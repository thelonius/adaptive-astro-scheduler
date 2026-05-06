import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WindowListItem } from './WindowListItem';
import type { TimingWindowV2 } from '../../services/optimalTimingV2Service';

const mockWindow: TimingWindowV2 = {
    date: '2026-05-19',
    score: 73,
    rank: 1,
    matched_predicates: [],
    moon: { sign: 'Cancer', phase: 'waxing_crescent', illumination: 0.18 },
    sun_sign: 'Taurus',
    retrograde_planets: [],
};

describe('WindowListItem', () => {
    it('renders rank, formatted date, score, and moon summary', () => {
        render(<WindowListItem window={mockWindow} language="ru" selected={false} onSelect={() => {}} />);
        expect(screen.getByText('#1')).toBeInTheDocument();
        // Date should appear in some Russian-localized form (we don't pin the exact string;
        // the test just confirms the year-or-month is rendered)
        expect(screen.getByText(/мая|май/i)).toBeInTheDocument();
        expect(screen.getByText('73')).toBeInTheDocument();
        // Cancer should appear localized
        expect(screen.getByText(/Раке|Cancer/)).toBeInTheDocument();
    });

    it('applies the selected class when selected=true', () => {
        const { container } = render(
            <WindowListItem window={mockWindow} language="ru" selected={true} onSelect={() => {}} />,
        );
        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toMatch(/is-selected/);
    });

    it('calls onSelect with the window date when clicked', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(<WindowListItem window={mockWindow} language="ru" selected={false} onSelect={onSelect} />);
        await user.click(screen.getByRole('button'));
        expect(onSelect).toHaveBeenCalledWith('2026-05-19');
    });

    it('renders VoC and retrograde tags when present', () => {
        render(
            <WindowListItem
                window={{
                    ...mockWindow,
                    moon: { ...mockWindow.moon, void_of_course: true },
                    retrograde_planets: ['Mercury'],
                }}
                language="ru"
                selected={false}
                onSelect={() => {}}
            />,
        );
        expect(screen.getByText(/VoC/i)).toBeInTheDocument();
        expect(screen.getByText(/Mercury/)).toBeInTheDocument();
    });
});
