import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VibeTabSwitcher } from './VibeTabSwitcher';
import type { Vibe } from '../../services/optimalTimingV2Service';

const vibes: Vibe[] = [
    { id: 'practical_cleanup', label: 'practical cleanup', emoji: '🧹' },
    { id: 'nostalgic_return', label: 'nostalgic return', emoji: '🪵' },
    { id: 'first_greens', label: 'first greens' },
];

describe('VibeTabSwitcher', () => {
    it('renders one button per vibe with emoji and label', () => {
        render(<VibeTabSwitcher vibes={vibes} selectedVibeId="practical_cleanup" onChange={() => {}} />);
        expect(screen.getByRole('tab', { name: /practical cleanup/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /nostalgic return/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /first greens/i })).toBeInTheDocument();
        expect(screen.getByText('🧹')).toBeInTheDocument();
    });

    it('marks the selected vibe as active', () => {
        render(<VibeTabSwitcher vibes={vibes} selectedVibeId="nostalgic_return" onChange={() => {}} />);
        const active = screen.getByRole('tab', { name: /nostalgic return/i });
        expect(active.getAttribute('aria-selected')).toBe('true');
        const inactive = screen.getByRole('tab', { name: /practical cleanup/i });
        expect(inactive.getAttribute('aria-selected')).toBe('false');
    });

    it('calls onChange with the clicked vibe id', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<VibeTabSwitcher vibes={vibes} selectedVibeId="practical_cleanup" onChange={onChange} />);
        await user.click(screen.getByRole('tab', { name: /first greens/i }));
        expect(onChange).toHaveBeenCalledWith('first_greens');
    });

    it('renders nothing when vibes array is empty', () => {
        const { container } = render(
            <VibeTabSwitcher vibes={[]} selectedVibeId={null} onChange={() => {}} />,
        );
        expect(container.firstChild).toBeNull();
    });
});
