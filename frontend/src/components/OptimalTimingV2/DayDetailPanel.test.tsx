import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayDetailPanel } from './DayDetailPanel';
import type { TimingWindowV2, Vibe } from '../../services/optimalTimingV2Service';

// Stub ZodiacWheel — its internal data fetch isn't relevant to this component test
vi.mock('../ZodiacWheel', () => ({
    ZodiacWheel: ({ date }: { date?: string }) => (
        <div data-testid="zodiac-wheel" data-date={date} />
    ),
}));

const window: TimingWindowV2 = {
    date: '2026-05-19',
    score: 73,
    rank: 1,
    matched_predicates: [],
    moon: { sign: 'Cancer', phase: 'waxing_crescent', illumination: 0.18 },
    sun_sign: 'Taurus',
    retrograde_planets: [],
    vibe_narratives: {
        practical_cleanup: 'Practical text.',
        nostalgic_return: 'Nostalgic text.',
    },
};

const vibes: Vibe[] = [
    { id: 'practical_cleanup', label: 'practical cleanup', emoji: '🧹' },
    { id: 'nostalgic_return', label: 'nostalgic return', emoji: '🪵' },
];


describe('DayDetailPanel', () => {
    it('renders zodiac wheel for the day', () => {
        render(
            <DayDetailPanel
                window={window}
                vibes={vibes}
                selectedVibeId="practical_cleanup"
                onVibeChange={() => {}}

                language="ru"
            />,
        );
        const wheel = screen.getByTestId('zodiac-wheel');
        expect(wheel).toHaveAttribute('data-date', '2026-05-19');
    });

    it('renders the vibe tabs and the narrative for the selected vibe', () => {
        render(
            <DayDetailPanel
                window={window}
                vibes={vibes}
                selectedVibeId="nostalgic_return"
                onVibeChange={() => {}}

                language="ru"
            />,
        );
        expect(screen.getByRole('tab', { name: /nostalgic return/i })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('Nostalgic text.')).toBeInTheDocument();
    });

    it('forwards vibe-tab clicks to onVibeChange', async () => {
        const user = userEvent.setup();
        const onVibeChange = vi.fn();
        render(
            <DayDetailPanel
                window={window}
                vibes={vibes}
                selectedVibeId="practical_cleanup"
                onVibeChange={onVibeChange}

                language="ru"
            />,
        );
        await user.click(screen.getByRole('tab', { name: /nostalgic return/i }));
        expect(onVibeChange).toHaveBeenCalledWith('nostalgic_return');
    });

    it('renders skeleton when window has no vibe_narratives field', () => {
        const { container } = render(
            <DayDetailPanel
                window={{ ...window, vibe_narratives: undefined }}
                vibes={vibes}
                selectedVibeId="practical_cleanup"
                onVibeChange={() => {}}

                language="ru"
            />,
        );
        expect(container.querySelector('.otv2-narrative-skeleton')).toBeInTheDocument();
    });

    it('renders the matched-predicates list inside the panel', () => {
        const w: TimingWindowV2 = {
            ...window,
            matched_predicates: [
                { type: 'moon_in_sign', weight: 6, details: { sign: 'Cancer' } },
                { type: 'moon_waxing', weight: 7 },
            ],
        };
        render(
            <DayDetailPanel
                window={w}
                vibes={vibes}
                selectedVibeId="practical_cleanup"
                onVibeChange={() => {}}

                language="ru"
            />,
        );
        expect(screen.getByText(/moon_in_sign/)).toBeInTheDocument();
        expect(screen.getByText(/moon_waxing/)).toBeInTheDocument();
    });
});
