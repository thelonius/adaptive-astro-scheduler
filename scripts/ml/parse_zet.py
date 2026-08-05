"""Парсер текстовой базы интерпретаций ZET в нормализованный JSONL.

Что делает сверх прежней версии:

1. Читает шапку `// КОД Раздел` — она говорит, что вообще означает ключ.
   Прежний парсер её выбрасывал, и `[01.05]` было не отличить от `[01.05]`
   из другого раздела.
2. Декодирует ключ в структуру: `[01.05]` → `{planet: SUN, sign: LEO}`.
   Раскладка не зашита, а подбирается по подписям внутри самого файла:
   нумерация в файлах разная (в SNPP первым идёт партнёр, в AP — своя
   планета), поэтому единой таблицы не существует.
3. Разбирает градусные файлы на втором уровне. `Sabian.txt` и
   `Globa. Zoodiac.txt` устроены как `[ 2] Тельца` с тридцатью строками
   `   N текст` внутри; прежний парсер отдавал 12 монолитов вместо 360
   градусов, теряя 2.95 МБ адресуемого текста.
4. Берёт автора из второй строки шапки, а не из имени файла. Раньше
   `Engl. Planet_Aspects_2.txt` давал автора «Engl».

Запуск:
    ./scripts/ml/unpack_zet.sh                 # архивы → zet/library/*
    python -m scripts.ml.parse_zet             # zet/library → zet/corpus.jsonl

Вход — весь `zet/library`, а не один Txt4: текстовых баз в репозитории две,
и вторая (Виноградов) лежит отдельным архивом. Обход рекурсивный, так что
новая база подключается распаковкой в свой подкаталог.
"""

from __future__ import annotations

import argparse
import itertools
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

from .zet_lexicon import SIGN_ORDER, decode_mnemonic, extract_entities

# Ключ в начале строки, необязательная подпись следом. Две нотации:
# `[01.05]` в большинстве баз и `<<< mo.moonmansion[3] & Male >>>` в UNI,
# где ключ — не номер, а выражение над свойствами карты.
_KEY_RE = re.compile(
    r"(?m)^(?:\[([^\]\n]{1,40})\]|<<<([^\n>]{1,200})>>>)[ \t]*(\S[^\n]*)?$"
)
# Строка градуса внутри блока знака: два и более пробела, номер, текст.
_DEGREE_RE = re.compile(r"(?m)^[ \t]{2,}(\d{1,2})[ \t]+(\S.*)$")
# Углы, которые могут стоять в ключе напрямую (TR, английские AP).
_DEGREE_VALUES = {0, 30, 40, 45, 51, 60, 72, 90, 120, 135, 144, 150, 180}

_ROLES = ("planet", "sign", "house", "aspect")

# Разделы с односоставным ключом. Подписей в них обычно нет, подгонять
# раскладку не на чем, но и подгонять нечего: `[1]` в разделе знаков — это
# Овен, в разделе домов — первый дом, и по-другому быть не может.
# (роль, максимальный номер)
SINGLE_SLOT: dict[str, tuple[str, int]] = {
    "P": ("planet", 14),      # Солнце..Плутон плюс узлы, Лилит, Хирон
    "S": ("sign", 12),
    "H": ("house", 12),
    "MD": ("moon_day", 30),
    "TD": ("solar_day", 32),  # зороастрийский месяц длиннее лунного
    "MM": ("mansion", 28),
    "MH": ("moon_house", 28),
    "RP": ("planet", 14),
    "FER": ("planet", 14),
    "HVH": ("hour", 24),
}

# Нумерация планет одинакова во всех разделах корпуса; проверена подписями
# в AP/PS/PH, где она восстанавливается независимо.
PLANET_BY_INDEX = [
    "SUN", "MOON", "MERCURY", "VENUS", "MARS", "JUPITER", "SATURN",
    "URANUS", "NEPTUNE", "PLUTO", "NODE", "SOUTH_NODE", "LILITH", "CHIRON",
]


def decode_single_slot(code: str, slots: list[list[int]] | None) -> dict[str, Any] | None:
    """Расшифровка по соглашению раздела, когда ключ состоит из одного числа."""
    spec = SINGLE_SLOT.get(code)
    if not spec or not slots or len(slots) != 1 or len(slots[0]) != 1:
        return None
    role, limit = spec
    n = slots[0][0]
    if not 1 <= n <= limit:
        return None
    if role == "planet":
        return {"planet": PLANET_BY_INDEX[n - 1]} if n <= len(PLANET_BY_INDEX) else None
    if role == "sign":
        return {"sign": SIGN_ORDER[n - 1]}
    return {role: n}


# ── Чтение файла ────────────────────────────────────────────────────────
def read_text(path: Path) -> str:
    raw = path.read_bytes()
    text = None
    for enc in ("utf-8", "cp1251"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = raw.decode("cp1251", errors="replace")
    # Переводы строк в корпусе смешанные. `\r` — пробельный символ, но не
    # тот, на котором срабатывает `$` в multiline: строка `<<< ... >>>\r`
    # не матчится ни одним якорем конца. Нормализуем на входе.
    return text.replace("\r\n", "\n").replace("\r", "\n")


def parse_header(text: str) -> tuple[str, str, str | None]:
    """→ (код базы, полная вторая строка шапки, автор)."""
    lines = [ln.strip() for ln in text.split("\n")[:8] if ln.strip().startswith("//")]
    code = "?"
    if lines:
        m = re.match(r"//\s*(\S+)", lines[0])
        if m:
            code = m.group(1)
    source_title = lines[1][2:].strip() if len(lines) > 1 else ""
    return code, source_title, guess_author(source_title)


# Имя в начале второй строки шапки. Резать по первой точке нельзя:
# «П.П.Глоба. О чем молчит Луна» даст автора «П». Инициалы съедаются
# явно, дальше берётся до трёх слов с заглавной.
_AUTHOR_RE = re.compile(
    r"^(?:by\s+|автор[:\s]+)?"
    r"((?:[A-ZА-ЯЁ]\.\s*){0,3}"
    r"[A-ZА-ЯЁ][A-Za-zА-Яа-яЁё'’-]+"
    r"(?:\s+[A-ZА-ЯЁ][A-Za-zА-Яа-яЁё'’-]+){0,2})",
    re.UNICODE,
)
_NOT_AUTHOR = {
    "новая", "интерпретация", "значения", "различные", "астрологический",
    "дни", "описание", "the", "aspects", "transit", "planet", "moon", "sun",
    "astrology", "astrological", "influence", "horary", "midpoint",
}


def guess_author(source_title: str) -> str | None:
    head = source_title.strip(" \"«»")
    m = _AUTHOR_RE.match(head)
    if not m:
        return None
    # Структура шапки — «Автор. Заголовок». Если после имени нет точки или
    # запятой, это не имя, а начало заголовка: «Тау-Квадраты по КРЕСТАМ».
    tail = head[m.end():].lstrip()
    if not head.lower().startswith("by ") and not tail.startswith((".", ",")):
        return None
    name = re.sub(r"\s+", " ", m.group(1)).strip(" .")
    # Инициалы без фамилии («К.В.») автором не считаем.
    if not re.search(r"[A-Za-zА-Яа-яЁё]{3,}", name):
        return None
    first_word = re.sub(r"^(?:[A-ZА-ЯЁ]\.\s*)+", "", name).split(" ")[0].lower()
    if first_word in _NOT_AUTHOR:
        return None
    return name if len(name) <= 40 else None


# ── Разбиение на блоки ──────────────────────────────────────────────────
def split_blocks(text: str) -> list[tuple[str, str | None, str]]:
    """→ [(тег, подпись, тело)]. Комментарии `//` из тела вычищаются."""
    matches = list(_KEY_RE.finditer(text))
    blocks: list[tuple[str, str | None, str]] = []
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[m.end():end]
        body = "\n".join(ln for ln in body.split("\n") if not ln.strip().startswith("//"))
        tag = (m.group(1) or m.group(2) or "").strip()
        blocks.append((tag, (m.group(3) or "").strip() or None, body.strip()))
    return blocks


def split_degrees(body: str) -> list[tuple[int, str]]:
    """Второй уровень градусных файлов: [(номер градуса в знаке, текст)]."""
    hits = list(_DEGREE_RE.finditer(body))
    if len(hits) < 10:  # не градусный блок, а просто текст с отступами
        return []
    out: list[tuple[int, str]] = []
    for i, m in enumerate(hits):
        deg = int(m.group(1))
        if not 1 <= deg <= 30:
            continue
        end = hits[i + 1].start() if i + 1 < len(hits) else len(body)
        out.append((deg, body[m.start():end].strip()))
    return out


# ── Разбор тега ─────────────────────────────────────────────────────────
def tag_slots(tag: str) -> list[list[int]] | None:
    """`01.060,120.02` → [[1],[60,120],[2]]. None, если тег не числовой."""
    parts = [p.strip() for p in tag.split(".") if p.strip()]
    if not parts:
        return None
    slots: list[list[int]] = []
    for part in parts:
        nums = [n.strip() for n in part.split(",")]
        # Префиксы вроде u01/h03 в RHH — буква несёт роль, число значение.
        cleaned = [re.sub(r"^[a-zA-Zа-яА-Я]+", "", n) for n in nums]
        if not all(c.isdigit() for c in cleaned if c != ""):
            return None
        vals = [int(c) for c in cleaned if c != ""]
        if not vals:
            return None
        slots.append(vals)
    return slots


def fit_layout(samples: list[tuple[list[list[int]], list[tuple[str, Any]]]]) -> dict | None:
    """Подбирает роль для каждой позиции ключа по подписям файла.

    Возвращает {'roles': [...], 'maps': {позиция: {число: канон}}, 'score': доля}.
    Перебираются все назначения сущностей на позиции; выигрывает то, где
    число→сущность выходит однозначным на максимуме примеров.
    """
    samples = [(s, e) for s, e in samples if s and e and len(s) == len(e)]
    if len(samples) < 3:
        return None
    width = Counter(len(s) for s, _ in samples).most_common(1)[0][0]
    samples = [(s, e) for s, e in samples if len(s) == width]
    if len(samples) < 3:
        return None

    shared = _shared_role_maps(samples)

    best: dict | None = None
    for perm in itertools.permutations(range(width)):
        maps: list[dict[int, Any]] = [dict() for _ in range(width)]
        roles: list[str | None] = [None] * width
        conflicts = 0
        for slots, ents in samples:
            for pos in range(width):
                role, value = ents[perm[pos]]
                if roles[pos] is None:
                    roles[pos] = role
                elif roles[pos] != role:
                    conflicts += 1
                    continue
                for num in slots[pos]:
                    prev = maps[pos].get(num)
                    if prev is None:
                        maps[pos][num] = value
                    elif prev != value:
                        conflicts += 1
        consistency = 1.0 - conflicts / max(1, len(samples) * width)
        # Вырожденность: если позиция всегда указывает на одну и ту же
        # сущность, конфликтов не возникает вовсе, и такая раскладка
        # выглядит идеальной. Так ловится SNPP, где в `[02.000.01]` первое
        # число — планета партнёра, а не своя: перестановка «своя первой»
        # даёт отображение {1:SUN, 2:SUN, 3:SUN} и ноль конфликтов.
        # Штрафуем за неинъективность.
        injectivity = 1.0
        for m in maps:
            if m:
                injectivity = min(injectivity, len(set(map(str, m.values()))) / len(m))
        score = consistency * (0.5 + 0.5 * injectivity)
        if best is None or score > best["score"]:
            best = {
                "roles": roles, "maps": maps, "width": width,
                "score": round(score, 4),
                "consistency": round(consistency, 4),
                "injectivity": round(injectivity, 4),
            }

    if best is None:
        return None

    # Позиции с одинаковой ролью нумеруются одним и тем же словарём: в
    # `[02.000.01]` двойка — это Луна и слева, и справа. Поэтому там, где
    # роль повторяется, общий словарь достовернее позиционного — он
    # собран по «диагональным» ключам вида «Солнце в соединении с Солнцем»,
    # где порядок сущностей однозначен.
    repeated = {r for r in best["roles"] if best["roles"].count(r) > 1}
    if repeated:
        for pos, role in enumerate(best["roles"]):
            if role in repeated and shared.get(role):
                merged = dict(shared[role])
                for num, val in best["maps"][pos].items():
                    merged.setdefault(num, val)
                best["maps"][pos] = merged
        best["symmetric_role"] = sorted(repeated)
    return best


def _shared_role_maps(
    samples: list[tuple[list[list[int]], list[tuple[str, Any]]]],
) -> dict[str, dict[int, Any]]:
    """Один словарь номер→сущность на роль, устойчивый к порядку в подписи.

    Опора — ключи, где все сущности повторяющейся роли совпадают («Солнце в
    соединении с Солнцем»): в них позиция не важна, номер однозначно
    привязан к сущности. Затем словарь достраивается теми ключами, где одна
    из позиций уже известна, а вторая выводится по остатку.
    """
    maps: dict[str, dict[int, Any]] = defaultdict(dict)
    pending: list[tuple[list[list[int]], list[tuple[str, Any]]]] = []

    for slots, ents in samples:
        by_role: dict[str, list[Any]] = defaultdict(list)
        for role, val in ents:
            by_role[role].append(val)
        pinned = False
        for role, values in by_role.items():
            if len(values) > 1 and len(set(map(str, values))) == 1:
                for pos, (r, _) in enumerate(ents):
                    if r == role and pos < len(slots):
                        for num in slots[pos]:
                            maps[role].setdefault(num, values[0])
                pinned = True
        if not pinned:
            pending.append((slots, ents))

    # Достраиваем по остатку: если из двух номеров один уже известен и
    # соответствует одной из двух сущностей, второй получает вторую.
    for _ in range(3):
        for slots, ents in pending:
            by_role_pos: dict[str, list[int]] = defaultdict(list)
            by_role_val: dict[str, list[Any]] = defaultdict(list)
            for pos, (role, val) in enumerate(ents):
                if pos < len(slots):
                    by_role_pos[role].append(pos)
                    by_role_val[role].append(val)
            for role, positions in by_role_pos.items():
                if len(positions) != 2:
                    continue
                nums = [slots[p][0] for p in positions]
                values = by_role_val[role]
                known = [maps[role].get(n) for n in nums]
                if known[0] is not None and known[1] is None:
                    rest = [v for v in values if v != known[0]] or values
                    maps[role].setdefault(nums[1], rest[-1])
                elif known[1] is not None and known[0] is None:
                    rest = [v for v in values if v != known[1]] or values
                    maps[role].setdefault(nums[0], rest[0])
    return dict(maps)


def decode(slots: list[list[int]], layout: dict) -> dict[str, Any] | None:
    if layout is None or len(slots) != layout["width"]:
        return None
    out: dict[str, Any] = {}
    for pos, (role, mapping) in enumerate(zip(layout["roles"], layout["maps"])):
        if role is None:
            return None
        values = [mapping.get(n) for n in slots[pos]]
        values = [v for v in values if v is not None]
        if not values:
            # Аспект часто стоит в ключе прямо в градусах — словарь не нужен.
            if role == "aspect" and all(n in _DEGREE_VALUES for n in slots[pos]):
                values = list(slots[pos])
            else:
                return None
        # Роль может повторяться: у мидпойнта три планеты (цель и пара),
        # у синастрии две. Нумеруем, а не затираем.
        key = role
        n = 2
        while key in out:
            key = f"{role}{n}"
            n += 1
        out[key] = values[0] if len(values) == 1 else values
    return out


# ── Основной проход ─────────────────────────────────────────────────────
def parse_file(path: Path, fallback: dict[tuple[str, int], dict] | None = None) -> tuple[list[dict], dict]:
    text = read_text(path)
    code, source_title, author = parse_header(text)
    blocks = split_blocks(text)
    # NFC: имя файла попадает в ключ уникальности corpus_interpretations, а
    # кириллица в именах приезжает то составленной, то разложенной — зависит
    # от того, чем распакован архив. Без нормализации перезаливка после
    # пересборки другим распаковщиком дублирует строки вместо обновления.
    name = unicodedata.normalize("NFC", path.name)

    # Градусные файлы: знак в теге, градус внутри тела.
    degree_records: list[dict] = []
    if code == "DG":
        for tag, label, body in blocks:
            slots = tag_slots(tag)
            sign_idx = slots[0][0] if slots and len(slots) == 1 else None
            degrees = split_degrees(body)
            if sign_idx and 1 <= sign_idx <= 12 and degrees:
                sign = SIGN_ORDER[sign_idx - 1]
                for deg, dtext in degrees:
                    degree_records.append({
                        "code": code, "source_file": name, "author": author,
                        "source_title": source_title,
                        "tag": f"{sign_idx:02d}.{deg:02d}",
                        "label": f"{deg}° {label or sign}",
                        "decoded": {"sign": sign, "degree": deg,
                                    "absolute_degree": (sign_idx - 1) * 30 + deg},
                        "decode_score": 1.0,
                        "text": dtext,
                    })
        if degree_records:
            return degree_records, {"code": code, "file": name, "mode": "degrees",
                                    "records": len(degree_records), "decoded": len(degree_records)}

    samples = [(tag_slots(t), extract_entities(l)) for t, l, _ in blocks if l]
    layout = fit_layout([(s, e) for s, e in samples if s])

    # Файл без подписей раскладку не даёт. Но ключи той же ширины в том же
    # разделе кодируются одинаково у разных авторов, так что берём
    # раскладку, выученную на подписанных файлах этого же кода.
    borrowed = False
    if layout is None and fallback:
        widths = Counter(len(s) for s in (tag_slots(t) for t, _, _ in blocks) if s)
        if widths:
            layout = fallback.get((code, widths.most_common(1)[0][0]))
            borrowed = layout is not None

    records: list[dict] = []
    decoded_n = 0
    for tag, label, body in blocks:
        if not body:
            continue
        slots = tag_slots(tag)
        dec = decode(slots, layout) if (slots and layout) else None
        source = "fitted" if dec and not borrowed else ("borrowed" if dec else None)
        if dec is None:
            dec = decode_mnemonic(tag)
            if dec:
                source = "mnemonic"
        if dec is None:
            dec = decode_single_slot(code, slots)
            if dec:
                source = "convention"
        if dec:
            decoded_n += 1
        records.append({
            "code": code, "source_file": name, "author": author,
            "source_title": source_title,
            "tag": tag, "label": label,
            "decoded": dec,
            "decode_source": source,
            "decode_score": layout["score"] if (source in ("fitted", "borrowed") and layout) else (1.0 if source == "mnemonic" else None),
            "text": body,
        })
    stats = {
        "code": code, "file": name, "mode": "keyed",
        "records": len(records), "decoded": decoded_n, "borrowed": borrowed,
        "layout": None if not layout else {"roles": layout["roles"], "score": layout["score"]},
    }
    return records, stats


def main(argv: Iterable[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description="ZET interpretation DB → normalized JSONL")
    ap.add_argument("--input", default="zet/library")
    ap.add_argument("--output", default="zet/corpus.jsonl")
    ap.add_argument("--report", default="zet/corpus_report.json")
    args = ap.parse_args(list(argv) if argv is not None else None)

    root = Path(args.input)
    if not root.exists():
        raise SystemExit(f"нет входной директории: {root}")

    files = [p for p in sorted(root.rglob("*")) if p.is_file() and p.suffix.lower() == ".txt"]

    # Первый проход: собираем раскладки с подписанных файлов, чтобы во
    # втором проходе одолжить их файлам без подписей.
    registry: dict[tuple[str, int], dict] = {}
    for path in files:
        text = read_text(path)
        code, _, _ = parse_header(text)
        blocks = split_blocks(text)
        samples = [(tag_slots(t), extract_entities(l)) for t, l, _ in blocks if l]
        layout = fit_layout([(s, e) for s, e in samples if s])
        if layout and layout["score"] > 0.8:
            key = (code, layout["width"])
            if key not in registry or layout["score"] > registry[key]["score"]:
                registry[key] = layout

    all_records: list[dict] = []
    all_stats: list[dict] = []
    for path in files:
        recs, st = parse_file(path, fallback=registry)
        all_records.extend(recs)
        all_stats.append(st)

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as fh:
        for r in all_records:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    by_code: dict[str, dict[str, int]] = defaultdict(lambda: {"records": 0, "decoded": 0, "files": 0})
    for st in all_stats:
        b = by_code[st["code"]]
        b["records"] += st["records"]
        b["decoded"] += st["decoded"]
        b["files"] += 1
    Path(args.report).write_text(
        json.dumps({"by_code": by_code, "files": all_stats}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    total = len(all_records)
    dec = sum(s["decoded"] for s in all_stats)
    authors = len({r["author"] for r in all_records if r["author"]})
    print(f"файлов        {len(all_stats)}")
    print(f"записей       {total}")
    print(f"декодировано  {dec} ({dec / max(1, total) * 100:.1f}%)")
    print(f"авторов       {authors}")
    print(f"\n{'код':<7}{'записей':>9}{'декод.':>9}{'%':>7}  файлов")
    for code, b in sorted(by_code.items(), key=lambda kv: -kv[1]["records"]):
        pct = b["decoded"] / max(1, b["records"]) * 100
        print(f"{code:<7}{b['records']:>9}{b['decoded']:>9}{pct:>6.0f}%  {b['files']}")


if __name__ == "__main__":
    main()
