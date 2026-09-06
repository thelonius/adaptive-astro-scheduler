"""
Ретроградность планет: сверка с эталонными значениями swisseph.

Регрессия на баг, из-за которого GET /api/v1/ephemeris/retrogrades всегда
отдавал пустой массив. EphemerisCore.get_planet_position звал swe.calc_ut без
флага FLG_SPEED, а без него swisseph кладёт в result[3..5] ровно 0.0 вместо
скоростей. Проверка speed < 0 в этом случае ложна всегда, и ретроградной не
становится ни одна планета.

Корутины гоняем через asyncio.run — pytest-asyncio здесь не нужен.
"""

import asyncio
from datetime import datetime

import pytest
import pytz

from app.calculators._swe_import import swe, HAS_SWE
from app.calculators.ephemeris_core import ephemeris_core
from app.calculators.planetary_engine import planetary_engine
from app.core.ephemeris import (
    SkyfieldEphemerisAdapter,
    CachedEphemerisCalculator,
    DateTime,
    Location,
    PlanetName,
)


# 2026-09-05 12:00 UTC: по swisseph ретроградны Сатурн, Нептун и Плутон.
# Дата из баг-репорта, на ней ручка отдавала [].
REFERENCE_DT = datetime(2026, 9, 5, 12, 0, 0, tzinfo=pytz.UTC)

# Уран на этот момент идёт +0.0046°/сут, то есть почти стоит перед разворотом.
# Знак у него в эталон не выносим, чтобы тест не ловил разницу версий эфемерид.
EXPECTED_RETROGRADE = {"Saturn", "Neptune", "Pluto"}

SWE_PLANET_IDS = {
    "Sun": "SUN",
    "Moon": "MOON",
    "Mercury": "MERCURY",
    "Venus": "VENUS",
    "Mars": "MARS",
    "Jupiter": "JUPITER",
    "Saturn": "SATURN",
    "Uranus": "URANUS",
    "Neptune": "NEPTUNE",
    "Pluto": "PLUTO",
}

pytestmark = pytest.mark.skipif(not HAS_SWE, reason="swisseph недоступен")


@pytest.fixture
def adapter():
    return SkyfieldEphemerisAdapter()


@pytest.fixture
def moscow_datetime():
    return DateTime(
        date=REFERENCE_DT,
        timezone="Europe/Moscow",
        location=Location(latitude=55.7558, longitude=37.6173),
    )


def swe_reference(dt: datetime) -> dict:
    """Эталон: прямой вызов swisseph с FLG_SPEED, мимо всех слоёв приложения."""
    dt = dt.astimezone(pytz.UTC)
    jd = swe.julday(
        dt.year, dt.month, dt.day,
        dt.hour + dt.minute / 60.0 + dt.second / 3600.0,
        swe.GREG_CAL,
    )
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    out = {}
    for name, attr in SWE_PLANET_IDS.items():
        result = swe.calc_ut(jd, getattr(swe, attr), flags)[0]
        out[name] = {"longitude": result[0] % 360, "speed": result[3]}
    return out


# ============================================================================
# Корень бага: скорость из swisseph
# ============================================================================

def test_get_planet_position_returns_nonzero_speed():
    """Без FLG_SPEED swisseph отдавал ровно 0.0 в поле скорости."""
    for name in SWE_PLANET_IDS:
        pos = ephemeris_core.get_planet_position(name, REFERENCE_DT)
        assert pos[3] != 0.0, f"{name}: скорость 0.0 — потерян FLG_SPEED"


def test_get_planet_position_speed_matches_swisseph():
    reference = swe_reference(REFERENCE_DT)
    for name, expected in reference.items():
        pos = ephemeris_core.get_planet_position(name, REFERENCE_DT)
        assert pos[0] % 360 == pytest.approx(expected["longitude"], abs=1e-4), name
        assert pos[3] == pytest.approx(expected["speed"], abs=1e-4), name


def test_explicit_flags_still_carry_speed():
    """Сигнатура обещает скорости в кортеже даже при явно переданных флагах."""
    pos = ephemeris_core.get_planet_position("Saturn", REFERENCE_DT, flags=swe.FLG_SWIEPH)
    assert pos[3] < 0


def test_is_retrograde_helper():
    for name in EXPECTED_RETROGRADE:
        assert ephemeris_core.is_retrograde(name, REFERENCE_DT) is True
    assert ephemeris_core.is_retrograde("Mercury", REFERENCE_DT) is False


# ============================================================================
# Адаптер: is_retrograde в CelestialBody
# ============================================================================

def test_planet_positions_retrograde_flags_match_swisseph(adapter, moscow_datetime):
    reference = swe_reference(REFERENCE_DT)
    positions = asyncio.run(adapter.get_planets_positions(moscow_datetime))

    for planet in positions.to_list():
        expected_speed = reference[planet.name.value]["speed"]
        assert planet.speed == pytest.approx(expected_speed, abs=1e-3), planet.name.value
        assert planet.is_retrograde == (expected_speed < 0), planet.name.value


def test_get_retrograde_planets_not_empty(adapter, moscow_datetime):
    """Собственно баг-репорт: ручка отдавала [] там, где ретроградных трое."""
    retrogrades = asyncio.run(adapter.get_retrograde_planets(moscow_datetime))
    assert {p.name.value for p in retrogrades} == EXPECTED_RETROGRADE


def test_get_retrograde_planets_all_have_negative_speed(adapter, moscow_datetime):
    retrogrades = asyncio.run(adapter.get_retrograde_planets(moscow_datetime))
    for planet in retrogrades:
        assert planet.is_retrograde is True
        assert planet.speed < 0, planet.name.value


def test_luminaries_never_retrograde(adapter, moscow_datetime):
    """Солнце и Луна исключены из выдачи независимо от расчёта."""
    retrogrades = asyncio.run(adapter.get_retrograde_planets(moscow_datetime))
    names = {p.name for p in retrogrades}
    assert PlanetName.SUN not in names
    assert PlanetName.MOON not in names


# ============================================================================
# planetary_engine: вторая ручка на том же расчёте (/planning/retrogrades)
# ============================================================================

def test_planetary_engine_retrogrades_match_adapter():
    detailed = planetary_engine.get_all_retrogrades(REFERENCE_DT, detailed=True)
    assert {entry["planet"] for entry in detailed} == EXPECTED_RETROGRADE
    for entry in detailed:
        assert entry["speed"] < 0


# ============================================================================
# Вторая опорная дата: набор ретроградных не пересекается с первой
# ============================================================================

def test_second_reference_date_matches_swisseph(adapter):
    """2026-02-20 12:00 UTC: ретрограден один Юпитер.

    Набор не пересекается с 2026-09-05, где Юпитер идёт директно (+0.207), а
    Сатурн ретрограден. Так тест ловит не только «список всегда пуст», но и
    «флаг залип на одном и том же наборе».
    """
    dt = datetime(2026, 2, 20, 12, 0, 0, tzinfo=pytz.UTC)
    reference = swe_reference(dt)
    date_time = DateTime(
        date=dt,
        timezone="UTC",
        location=Location(latitude=55.7558, longitude=37.6173),
    )
    retrogrades = asyncio.run(adapter.get_retrograde_planets(date_time))
    expected = {
        name for name, data in reference.items()
        if data["speed"] < 0 and name not in ("Sun", "Moon")
    }
    assert {p.name.value for p in retrogrades} == expected
    assert {p.name.value for p in retrogrades} == {"Jupiter"}


# ============================================================================
# Кеширующий слой: именно он стоит за HTTP-ручкой
# ============================================================================

def test_cached_calculator_accepts_aware_datetime(moscow_datetime):
    """CachedEphemerisCalculator._get_ttl ронял TypeError на aware-дате.

    Ручка /api/v1/ephemeris/retrogrades?date=2026-09-05T12:00:00+00:00 парсит
    смещение и отдаёт aware datetime, так что на холодном кеше отвечала 500.
    """
    calculator = CachedEphemerisCalculator(SkyfieldEphemerisAdapter())
    retrogrades = asyncio.run(calculator.get_retrograde_planets(moscow_datetime))
    assert {p.name.value for p in retrogrades} == EXPECTED_RETROGRADE


def test_cached_calculator_accepts_naive_datetime():
    calculator = CachedEphemerisCalculator(SkyfieldEphemerisAdapter())
    date_time = DateTime(
        date=REFERENCE_DT.replace(tzinfo=None),
        timezone="UTC",
        location=Location(latitude=55.7558, longitude=37.6173),
    )
    retrogrades = asyncio.run(calculator.get_retrograde_planets(date_time))
    assert {p.name.value for p in retrogrades} == EXPECTED_RETROGRADE
