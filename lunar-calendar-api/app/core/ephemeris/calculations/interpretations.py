"""
Russian interpretations for chart points.

Texts live in app/data/chart_points_ru.json, one per point and zodiac sign,
so that adding or rewording a reading does not touch calculation code.
"""

import json
from pathlib import Path
from typing import Dict

from ..types import ZodiacSignName


# parents: calculations -> ephemeris -> core -> app
_DATA_PATH = Path(__file__).resolve().parents[3] / 'data' / 'chart_points_ru.json'

_TEXTS: Dict[str, Dict[str, str]] = {}


def _load() -> Dict[str, Dict[str, str]]:
    global _TEXTS
    if not _TEXTS:
        with _DATA_PATH.open(encoding='utf-8') as f:
            content = json.load(f)
        _TEXTS = {k: v for k, v in content.items() if isinstance(v, dict)}
    return _TEXTS


def interpretation_ru(point: str, sign: ZodiacSignName) -> str:
    """
    Russian reading for `point` in `sign`.

    Returns an empty string for a point or sign with no text yet, so a missing
    entry degrades the response instead of failing the whole calculation.
    """
    sign_key = sign.value if isinstance(sign, ZodiacSignName) else str(sign)
    return _load().get(point, {}).get(sign_key, "")
