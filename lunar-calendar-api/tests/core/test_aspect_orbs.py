"""Орбисы аспектов и определение сходимости.

Регресс, из-за которого тесты появились: параметр `orb` подменял таблицу
целиком, поэтому запрос с орбисом 8° ловил полутораквадрат (его орбис 2°) в
семь градусов от точки. Плюс сходимость считалась как `speed2 > speed1`, что
не про орб вообще, а при нулевых скоростях делала все аспекты расходящимися.
"""

import pytest

from app.core.ephemeris.types import (
    AspectType,
    CelestialBody,
    PlanetName,
    ZodiacSign,
    aspect_applying,
    orb_for,
)


def body(name: PlanetName, longitude: float, speed: float = 0.0) -> CelestialBody:
    return CelestialBody(
        name=name,
        longitude=longitude,
        latitude=0.0,
        zodiac_sign=ZodiacSign.from_longitude(longitude),
        speed=speed,
        is_retrograde=speed < 0,
        distance_au=1.0,
    )


class TestOrbFor:
    def test_reads_per_aspect_widths(self):
        assert orb_for(AspectType.CONJUNCTION) == 8
        assert orb_for(AspectType.TRINE) == 7
        assert orb_for(AspectType.SEXTILE) == 4
        assert orb_for(AspectType.SEMI_SEXTILE) == 2

    def test_luminaries_get_wider_orb(self):
        assert orb_for(AspectType.TRINE, PlanetName.SUN, PlanetName.MARS) == 8
        assert orb_for(AspectType.TRINE, PlanetName.MARS, PlanetName.SATURN) == 7
        assert orb_for(AspectType.SEXTILE, PlanetName.MARS, PlanetName.MOON) == 6

    def test_accepts_bodies_not_only_names(self):
        sun = body(PlanetName.SUN, 0.0)
        mars = body(PlanetName.MARS, 120.0)
        assert orb_for(AspectType.TRINE, sun, mars) == 8

    def test_cap_narrows_but_never_widens(self):
        # Просили 3° — сужается всё, что шире.
        assert orb_for(AspectType.CONJUNCTION, cap=3) == 3
        assert orb_for(AspectType.SEMI_SEXTILE, cap=3) == 2
        # Просили 15° — таблица остаётся на месте, это и был баг.
        assert orb_for(AspectType.SEMI_SEXTILE, cap=15) == 2
        assert orb_for(AspectType.SESQUIQUADRATE, cap=8) == 2


class TestAspectApplying:
    def test_unknown_without_speeds(self):
        a = body(PlanetName.SUN, 10.0)
        b = body(PlanetName.SATURN, 130.0)
        assert aspect_applying(a, b, 120.0) is None

    def test_faster_planet_closing_from_outside(self):
        # Расстояние 122°, цель 120°: сближение сжимает орб.
        slow = body(PlanetName.SATURN, 0.0, speed=0.03)
        fast = body(PlanetName.SUN, 122.0, speed=0.96)
        assert aspect_applying(slow, fast, 120.0) is False
        # Обратный порядок тел не меняет физику.
        assert aspect_applying(fast, slow, 120.0) is False

    def test_closing_from_inside(self):
        # Расстояние 118°, догоняющая планета расширяет разрыв к 120°.
        slow = body(PlanetName.SATURN, 0.0, speed=0.03)
        fast = body(PlanetName.SUN, 118.0, speed=0.96)
        assert aspect_applying(slow, fast, 120.0) is True

    def test_retrograde_planet_can_apply(self):
        # Сатурн идёт назад к точному трину от натального Марса.
        natal_mars = body(PlanetName.MARS, 253.96)
        saturn = body(PlanetName.SATURN, 14.75, speed=-0.0045)
        assert aspect_applying(natal_mars, saturn, 120.0) is True

    def test_exact_aspect_is_not_applying(self):
        a = body(PlanetName.SUN, 0.0, speed=0.96)
        b = body(PlanetName.MARS, 120.0, speed=0.68)
        assert aspect_applying(a, b, 120.0) is False

    @pytest.mark.parametrize("separation,expected", [(95.0, False), (85.0, True)])
    def test_far_branch_of_the_circle(self, separation, expected):
        # Пара, у которой разность долгот больше 180°: знак производной
        # расстояния переворачивается, и без учёта этого сходимость
        # определялась наоборот.
        a = body(PlanetName.SUN, 350.0, speed=0.96)
        b = body(PlanetName.MARS, (350.0 - separation) % 360, speed=0.68)
        assert aspect_applying(a, b, 90.0) is expected
