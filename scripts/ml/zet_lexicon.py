"""Словари сущностей ZET-корпуса.

Нужны, чтобы декодировать числовые ключи вида `[01.05]` в осмысленное
`{planet: SUN, sign: LEO}`. Прямо сопоставить номер и сущность нельзя:
нумерация в разных файлах не совпадает (в SNPP первым идёт партнёр, в AP —
своя планета; HS кодирует Асцендент как 101, а не как первый дом). Поэтому
номера не зашиты, а выучиваются из подписей рядом с ключом — эти словари
переводят подпись в канонический идентификатор.
"""

from __future__ import annotations

import re
from typing import Final

# ── Планеты и точки ──────────────────────────────────────────────────────
PLANET_NAMES: Final[dict[str, str]] = {}


def _p(canonical: str, *names: str) -> None:
    for n in names:
        PLANET_NAMES[n] = canonical


_p("SUN", "солнце", "солнца", "солнцем", "солнцу", "sun")
_p("MOON", "луна", "луны", "луной", "луне", "moon")
_p("MERCURY", "меркурий", "меркурия", "меркурием", "меркурию", "mercury")
_p("VENUS", "венера", "венеры", "венерой", "венере", "venus")
_p("MARS", "марс", "марса", "марсом", "марсу", "mars")
_p("JUPITER", "юпитер", "юпитера", "юпитером", "юпитеру", "jupiter")
_p("SATURN", "сатурн", "сатурна", "сатурном", "сатурну", "saturn")
_p("URANUS", "уран", "урана", "ураном", "урану", "uranus")
_p("NEPTUNE", "нептун", "нептуна", "нептуном", "нептуну", "neptune")
_p("PLUTO", "плутон", "плутона", "плутоном", "плутону", "pluto")
_p("NODE", "восходящий узел", "северный узел", "раху", "north node", "node")
_p("SOUTH_NODE", "нисходящий узел", "южный узел", "кету", "south node")
_p("LILITH", "лилит", "чёрная луна", "черная луна", "lilith", "black moon")
_p("SELENA", "селена", "белая луна", "selena")
_p("CHIRON", "хирон", "хирона", "chiron")
_p("FORTUNA", "фортуна", "колесо фортуны", "part of fortune", "fortune")
_p("ASC", "асцендент", "асцендента", "ascendant", "asc")
_p("MC", "мс", "середина неба", "midheaven", "mc")
_p("DSC", "десцендент", "descendant", "dsc")
_p("IC", "ic", "надир", "имум коели")
_p("VERTEX", "вертекс", "vertex")

# ── Знаки ────────────────────────────────────────────────────────────────
SIGN_ORDER: Final[tuple[str, ...]] = (
    "ARIES", "TAURUS", "GEMINI", "CANCER", "LEO", "VIRGO",
    "LIBRA", "SCORPIO", "SAGITTARIUS", "CAPRICORN", "AQUARIUS", "PISCES",
)
SIGN_NAMES: Final[dict[str, str]] = {}


def _s(canonical: str, *names: str) -> None:
    for n in names:
        SIGN_NAMES[n] = canonical


_s("ARIES", "овен", "овна", "овне", "овну", "aries")
_s("TAURUS", "телец", "тельца", "тельце", "тельцу", "taurus")
_s("GEMINI", "близнецы", "близнецов", "близнецах", "gemini")
_s("CANCER", "рак", "рака", "раке", "cancer")
_s("LEO", "лев", "льва", "льве", "leo")
_s("VIRGO", "дева", "девы", "деве", "virgo")
_s("LIBRA", "весы", "весов", "весах", "libra")
_s("SCORPIO", "скорпион", "скорпиона", "скорпионе", "scorpio")
_s("SAGITTARIUS", "стрелец", "стрельца", "стрельце", "sagittarius")
_s("CAPRICORN", "козерог", "козерога", "козероге", "capricorn")
_s("AQUARIUS", "водолей", "водолея", "водолее", "aquarius")
_s("PISCES", "рыбы", "рыб", "рыбах", "pisces")

# ── Аспекты: имя → точный угол в градусах ───────────────────────────────
ASPECT_DEGREES: Final[dict[str, int]] = {
    "соединение": 0, "соединении": 0, "conjunct": 0, "conjunction": 0,
    "полусекстиль": 30, "полусекстиле": 30, "semisextile": 30, "semi-sextile": 30,
    "новиль": 40, "novile": 40,
    "полуквадрат": 45, "полуквадрате": 45, "semisquare": 45, "semi-square": 45,
    "септиль": 51, "septile": 51,
    "секстиль": 60, "секстиле": 60, "sextile": 60,
    "квинтиль": 72, "квинтиле": 72, "quintile": 72,
    "квадрат": 90, "квадрате": 90, "квадратура": 90, "квадратуре": 90,
    "square": 90,
    "тригон": 120, "тригоне": 120, "трин": 120, "трине": 120, "trine": 120,
    "полутораквадрат": 135, "полутораквадрате": 135,
    "сесквиквадрат": 135, "sesquiquadrate": 135, "sesquisquare": 135,
    "бикводратура": 135,
    "биквинтиль": 144, "biquintile": 144,
    "квиконс": 150, "квиконсе": 150, "квинконс": 150,
    "полутораквадратура": 135, "inconjunct": 150, "quincunx": 150,
    "оппозиция": 180, "оппозиции": 180, "opposition": 180, "opposite": 180,
}

# ── Дома: римские и словесные порядковые ────────────────────────────────
_ROMAN: Final[dict[str, int]] = {
    "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6,
    "vii": 7, "viii": 8, "ix": 9, "x": 10, "xi": 11, "xii": 12,
}
_ORDINAL_RU: Final[dict[str, int]] = {
    "перв": 1, "втор": 2, "трет": 3, "четверт": 4, "пят": 5, "шест": 6,
    "седьм": 7, "восьм": 8, "девят": 9, "десят": 10,
    "одиннадцат": 11, "двенадцат": 12,
    "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6,
    "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10,
    "eleventh": 11, "twelfth": 12,
}

# ── Мнемонические ключи ──────────────────────────────────────────────────
# Часть английских файлов кодирует ключ буквами: `[JU.CNJ.AS]` — Юпитер в
# соединении с Асцендентом. Подписей в таких файлах нет вовсе, подобрать
# раскладку не на чем, зато мнемоника читается напрямую.
MNEMONIC_PLANETS: Final[dict[str, str]] = {
    "SU": "SUN", "MO": "MOON", "ME": "MERCURY", "VE": "VENUS", "MA": "MARS",
    "JU": "JUPITER", "SA": "SATURN", "UR": "URANUS", "NE": "NEPTUNE", "PL": "PLUTO",
    "AS": "ASC", "MC": "MC", "DS": "DSC", "IC": "IC",
    "NN": "NODE", "SN": "SOUTH_NODE", "LI": "LILITH", "CH": "CHIRON",
}
MNEMONIC_ASPECTS: Final[dict[str, int]] = {
    "CNJ": 0, "CON": 0, "SSX": 30, "SSQ": 45, "SXT": 60, "SEX": 60,
    "QUI": 72, "SQR": 90, "SQU": 90, "TRI": 120, "TRN": 120,
    "SQQ": 135, "SES": 135, "BQU": 144, "QCX": 150, "INC": 150,
    "OPP": 180,
}


def decode_mnemonic(tag: str) -> dict[str, object] | None:
    """`JU.CNJ.AS` → {'planet': JUPITER, 'aspect': 0, 'planet2': ASC}."""
    parts = [p.strip().upper() for p in tag.split(".") if p.strip()]
    if not 2 <= len(parts) <= 3:
        return None
    out: dict[str, object] = {}
    for part in parts:
        if part in MNEMONIC_ASPECTS:
            if "aspect" in out:
                return None
            out["aspect"] = MNEMONIC_ASPECTS[part]
        elif part in MNEMONIC_PLANETS:
            key = "planet" if "planet" not in out else "planet2"
            if key in out:
                return None
            out[key] = MNEMONIC_PLANETS[part]
        else:
            return None
    return out if len(out) == len(parts) else None

_WORD = re.compile(r"[a-zа-яё]+", re.IGNORECASE)


def normalize(s: str) -> str:
    return s.replace("ё", "е").strip().lower()


# Словари наполнялись с «ё», а подписи прогоняются через normalize —
# приводим ключи к тому же виду один раз при импорте.
def _fold(table: dict[str, str]) -> None:
    for key in list(table):
        folded = normalize(key)
        if folded != key:
            table.setdefault(folded, table[key])


_fold(PLANET_NAMES)
_fold(SIGN_NAMES)


def _lookup(table: dict[str, str], token: str) -> str | None:
    return table.get(token)


def extract_entities(label: str) -> list[tuple[str, object]]:
    """Разбирает подпись ключа в упорядоченный список сущностей.

    «Солнце в Овне» → [('planet','SUN'), ('sign','ARIES')]
    «Katy's Sun Conjunct Peter's Moon» → [('planet','SUN'), ('aspect',0), ('planet','MOON')]

    Порядок сохраняется: именно по нему подбирается раскладка ключа.
    """
    text = normalize(label)
    out: list[tuple[str, object]] = []

    # Дома по римским цифрам: «ЛУНА В I ДОМЕ». Ищем до словарной прогонки,
    # иначе 'i' и 'v' утонут в общем потоке токенов.
    for m in re.finditer(r"\b([ivx]{1,4})\b(?=[ -]*дом)", text):
        out.append(("__house_roman__", (m.start(), _ROMAN.get(m.group(1)))))

    tokens = [(m.start(), m.end(), m.group(0)) for m in _WORD.finditer(text)]
    consumed: set[int] = set()

    # Сначала двусловные имена («восходящий узел», «black moon»), иначе
    # «узел» и «moon» разберутся поодиночке и дадут не ту сущность.
    for i in range(len(tokens) - 1):
        if i in consumed:
            continue
        pair = f"{tokens[i][2]} {tokens[i + 1][2]}"
        planet = _lookup(PLANET_NAMES, pair)
        if planet:
            out.append(("planet", (tokens[i][0], planet)))
            consumed.update({i, i + 1})

    for i, (start, end, tok) in enumerate(tokens):
        if i in consumed:
            continue
        planet = _lookup(PLANET_NAMES, tok)
        if planet:
            out.append(("planet", (start, planet)))
            continue
        sign = _lookup(SIGN_NAMES, tok)
        if sign:
            out.append(("sign", (start, sign)))
            continue
        if tok in ASPECT_DEGREES:
            out.append(("aspect", (start, ASPECT_DEGREES[tok])))
            continue
        for stem, num in _ORDINAL_RU.items():
            if tok.startswith(stem) and "дом" in text[end:end + 22]:
                out.append(("house", (start, num)))
                break

    # Числовые дома: «Управитель 1-го дома в 3-м доме»
    for m in re.finditer(r"(\d{1,2})[- ]?(?:го|м|й|ом)?\s*дом", text):
        out.append(("house", (m.start(), int(m.group(1)))))

    ordered = sorted(out, key=lambda e: e[1][0])
    result: list[tuple[str, object]] = []
    for role, (_, value) in ordered:
        result.append(("house" if role == "__house_roman__" else role, value))
    return result
