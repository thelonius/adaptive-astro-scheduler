"""
Tests for AspectEngine._aspect_diff — the signed discriminator used by
perfection-finding scans.

Covers the bug class that broke v1 VoC end detection (conjunction +
opposition were never seen as zero crossings of the unsigned distance).

Pure-math tests; no swisseph or ephemeris call required.
"""
import pytest

from app.calculators.aspect_engine import AspectEngine


class TestAspectDiffSignChange:
    """For each aspect target, the discriminator must change sign as
    the bodies sweep through the exact aspect. The old unsigned formula
    failed to do this for target ∈ {0, 180}."""

    def test_conjunction_changes_sign(self):
        # Sun at 11.5°, Moon sweeping past from 10° to 13°
        diffs = [AspectEngine._aspect_diff(moon, 11.5, 0)
                 for moon in (10.0, 11.0, 11.4, 11.6, 12.0, 13.0)]
        # Negative before, positive after
        assert diffs[0] < 0 and diffs[1] < 0 and diffs[2] < 0
        assert diffs[3] > 0 and diffs[4] > 0 and diffs[5] > 0

    def test_opposition_changes_sign(self):
        # Sun at 0°, Moon sweeping past 180° from 179° to 181°
        diffs = [AspectEngine._aspect_diff(moon, 0.0, 180)
                 for moon in (179.0, 179.9, 180.1, 181.0)]
        assert diffs[0] < 0 and diffs[1] < 0
        assert diffs[2] > 0 and diffs[3] > 0

    def test_opposition_works_across_zero_wrap(self):
        # Sun near 360 wrap (350°), Moon approaching opposition at ~170°
        diffs = [AspectEngine._aspect_diff(moon, 350.0, 180)
                 for moon in (169.0, 170.0, 171.0)]
        assert diffs[0] < 0
        assert diffs[2] > 0

    def test_trine_unchanged_behavior(self):
        # The unsigned discriminator already worked here; this guards
        # against a regression on the non-extremal branch.
        diffs = [AspectEngine._aspect_diff(moon, 100.0, 120)
                 for moon in (219.0, 220.0, 220.5, 221.0)]
        assert diffs[0] < 0
        # 220 vs 100 is exactly trine -> diff == 0
        assert diffs[1] == pytest.approx(0.0, abs=1e-9)
        assert diffs[2] > 0 and diffs[3] > 0


class TestAspectDiffOldFormulaWouldFail:
    """Sanity-check the bug we are fixing: with the OLD unsigned formula
    (angular_distance - target), conjunction/opposition never showed a
    sign change. This test documents that and asserts our new formula
    does the right thing."""

    @staticmethod
    def _old(lon_a, lon_b, target):
        return AspectEngine.angular_distance(lon_a, lon_b) - target

    def test_old_conjunction_never_negative(self):
        for moon in (10.0, 11.0, 11.5, 12.0, 13.0):
            assert self._old(moon, 11.5, 0) >= 0

    def test_old_opposition_never_positive(self):
        for moon in (179.0, 179.9, 180.0, 180.1, 181.0):
            assert self._old(moon, 0.0, 180) <= 0

    def test_new_conjunction_does_change_sign(self):
        before = AspectEngine._aspect_diff(11.0, 11.5, 0)
        after = AspectEngine._aspect_diff(12.0, 11.5, 0)
        assert before * after < 0

    def test_new_opposition_does_change_sign(self):
        before = AspectEngine._aspect_diff(179.0, 0.0, 180)
        after = AspectEngine._aspect_diff(181.0, 0.0, 180)
        assert before * after < 0
