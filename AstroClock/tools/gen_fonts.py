"""Сглаженные шрифты для AMOLED-сборки: TTF -> VLW -> src/fonts/*.h

Растр 5x7 и глифы 13x13 рассчитаны на GC9A01 240x240. На 466x466 при 326 ppi
они либо мелкие, либо, растянутые вдвое, ступенчатые. LovyanGFX умеет рисовать
VLW-шрифты с 8-битной альфой и смешивать их с фоном спрайта, поэтому текст и
символы здесь рендерятся из настоящих шрифтов заранее, на компьютере.

Шрифты:
  Inter (OFL) — текст. Тот же, что у веба (frontend/src/theme/antigravity.css).
  Noto Sans Symbols (OFL) — планеты, знаки, аспекты. В нём нет ☉, Солнце и
  квадрат с треугольником берутся из Noto Sans Symbols 2.
  Material Symbols Rounded (Apache 2.0) — иконки сфер лунного календаря вместо
  растров 13x13 из lunardays.h. Порядок тот же, что у lunardays::Icon.

Символы ☉☽☾☿♀♂♃♄⛢♆♇ совпадают с getPlanetSymbol() во фронтенде. Внутри кегля
они разного роста (Марс и Уран почти вдвое мельче Меркурия), поэтому каждый
вписывается в общий квадрат по своим чернилам, а не по кеглю.

Запуск (TTF скачиваются в tools/fonts/, в репозиторий не кладутся):

    python3 -m venv /tmp/fontvenv && /tmp/fontvenv/bin/pip install pillow
    /tmp/fontvenv/bin/python tools/gen_fonts.py [--preview out.png]
"""

import argparse
import os
import struct
import sys
import urllib.request

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")
OUT_DIR = os.path.join(HERE, "..", "src", "fonts")

SOURCES = {
    "Inter.ttf": "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf",
    "NotoSansSymbols.ttf": "https://github.com/google/fonts/raw/main/ofl/notosanssymbols/NotoSansSymbols%5Bwght%5D.ttf",
    "NotoSansSymbols2.ttf": "https://github.com/google/fonts/raw/main/ofl/notosanssymbols2/NotoSansSymbols2-Regular.ttf",
    "MaterialSymbolsRounded.ttf": "https://github.com/google/material-design-icons/raw/master/variablefont/MaterialSymbolsRounded%5BFILL,GRAD,opsz,wght%5D.ttf",
    "MaterialSymbolsRounded.codepoints": "https://github.com/google/material-design-icons/raw/master/variablefont/MaterialSymbolsRounded%5BFILL,GRAD,opsz,wght%5D.codepoints",
}

# ASCII, кириллица и типографика, которая встречается в строках прошивки
# (тире, буллет) или может понадобиться (кавычки-ёлочки, градус, многоточие)
TEXT_CHARS = (
    [chr(c) for c in range(0x20, 0x7F)]
    + [chr(c) for c in range(0x410, 0x450)]
    + list("Ёё—–•«»°…·′″←→±×")
)
DIGITS = list("0123456789")

# Имя в прошивке, начертание Inter (оптический размер, вес), кегль, набор.
# Кегли подобраны под 326 ppi: основной текст 22 px даёт высоту строчных около
# 1.2 мм, это чуть крупнее прежнего 5x7 на 187 ppi.
TEXT_FACES = [
    ("INTER_SMALL", 18, 400, 18, TEXT_CHARS),
    ("INTER_BODY", 22, 500, 22, TEXT_CHARS),
    ("INTER_HEAD", 24, 600, 24, TEXT_CHARS),
    ("INTER_TITLE", 32, 600, 32, TEXT_CHARS),
    ("INTER_HUGE", 32, 600, 112, DIGITS),
]

# Символы: код, доля квадрата. Доля меньше единицы у тех, что при вписывании по
# чернилам выходят визуально тяжелее соседей: сплошной круг Солнца, серпы Луны
PLANETS = [("☉", 0.86), ("☽", 0.9), ("☾", 0.9), ("☿", 1.0), ("♀", 1.0),
           ("♂", 1.0), ("♃", 1.0), ("♄", 1.0), ("⛢", 1.0), ("♆", 1.0),
           ("♇", 1.0)]
SIGNS = [(c, 1.0) for c in "♈♉♊♋♌♍♎♏♐♑♒♓"]
# Аспекты: соединение, секстиль, квадрат, трин, оппозиция
ASPECTS = [("☌", 0.9), ("⚹", 0.9), ("□", 0.8), ("△", 0.85), ("☍", 0.9)]
SYMBOLS = PLANETS + SIGNS + ASPECTS
SYMBOL_WEIGHT = 600

# Квадрат глифа на кольце и в шапках. 26 px это прежние 13 на 240, умноженные
# на 466/240 и округлённые до чётного
SYMBOL_FACES = [("SYM_RING", 26), ("SYM_BIG", 36)]

# Иконки сфер в порядке lunardays::Icon. В VLW они перекладываются на коды
# ICON_BASE + индекс, чтобы прошивка не держала таблицу кодов Material
ICONS = ["rocket_launch", "work", "payments", "favorite", "chat", "home",
         "fitness_center", "weekend", "bedtime", "menu_book", "healing",
         "route", "restaurant", "handshake", "center_focus_strong", "warning",
         "lightbulb", "cleaning_services",
         # Пункты меню часов, идут следом за сферами: толкования, список
         # транзитов, лунный календарь, легенда, тест тача
         "auto_stories", "format_list_bulleted", "dark_mode", "info", "touch_app"]
ICON_BASE = 0xE000
MENU_ICON_FIRST = 18
# Квадрат иконки: прежние 13 px с масштабом 2 на 240, пересчитанные на 466
ICON_CELL = 48


def fetch():
    os.makedirs(FONT_DIR, exist_ok=True)
    for name, url in SOURCES.items():
        path = os.path.join(FONT_DIR, name)
        if not os.path.exists(path):
            print("скачиваю", name)
            urllib.request.urlretrieve(url, path)


def inter(opsz, wght, size):
    f = ImageFont.truetype(os.path.join(FONT_DIR, "Inter.ttf"), size)
    f.set_variation_by_axes([opsz, wght])
    return f


def symbol_font(ch, size):
    """Noto Sans Symbols с весом, либо Symbols 2 для того, чего в первом нет."""
    f = ImageFont.truetype(os.path.join(FONT_DIR, "NotoSansSymbols.ttf"), size)
    f.set_variation_by_axes([SYMBOL_WEIGHT])
    if not is_fallback(ch):
        return f
    return ImageFont.truetype(os.path.join(FONT_DIR, "NotoSansSymbols2.ttf"), size)


def is_fallback(ch):
    f = ImageFont.truetype(os.path.join(FONT_DIR, "NotoSansSymbols.ttf"), 40)
    return f.getmask(ch).getbbox() is None or ch in "☉□△"


def render(font, ch, embolden=False):
    """Глиф как альфа-растр плюс метрики VLW относительно базовой линии."""
    l, t, r, b = font.getbbox(ch, anchor="ls")
    adv = int(round(font.getlength(ch)))
    w, h = r - l, b - t
    if w <= 0 or h <= 0:
        return dict(code=ord(ch), w=0, h=0, adv=adv, dy=0, dx=0, px=b"")
    im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(im).text((-l, -t), ch, font=font, fill=255, anchor="ls")
    if embolden:
        # Symbols 2 есть только в регулярном весе, и его тонкий круг Солнца
        # терялся рядом с полужирными соседями. Растр раздувается на пиксель
        im = ImageChops.lighter(im, im.filter(ImageFilter.MaxFilter(3)).point(lambda v: v * 3 // 4))
    return dict(code=ord(ch), w=w, h=h, adv=adv, dy=-t, dx=l, px=im.tobytes())


def render_symbol(ch, cell, k):
    """Символ, вписанный по чернилам в квадрат cell*k и отцентрованный в cell.

    Базовая линия проходит по низу квадрата, поэтому у шрифта ascent = cell и
    descent = 0, а datum middle_center у LovyanGFX ставит центр глифа ровно в
    заданную точку.
    """
    probe = 200
    bb = symbol_font(ch, probe).getbbox(ch, anchor="ls")
    ink = max(bb[2] - bb[0], bb[3] - bb[1])
    size = probe * cell * k / ink
    # Кегль дробный, и чернила после растеризации могут вылезти на пиксель за
    # квадрат: подгоняется вниз, пока не влезет
    for _ in range(8):
        g = render(symbol_font(ch, size), ch, embolden=(ch == "☉"))
        if max(g["w"], g["h"]) <= round(cell * k):
            break
        size *= 0.97
    w, h = g["w"], g["h"]
    g["adv"] = cell
    g["dx"] = (cell - w) // 2
    g["dy"] = (cell + h) // 2
    return g


def render_icons():
    cps = {}
    with open(os.path.join(FONT_DIR, "MaterialSymbolsRounded.codepoints")) as f:
        for line in f:
            name, cp = line.split()
            cps[name] = int(cp, 16)
    f = ImageFont.truetype(os.path.join(FONT_DIR, "MaterialSymbolsRounded.ttf"), ICON_CELL)
    axes = [a["name"] for a in f.get_variation_axes()]
    # Заливка, а не контур: на 48 px контурная иконка в два пикселя толщиной
    # рядом с перечёркиванием читалась хуже
    want = {b"fill": 1, b"grade": 0, b"optical size": 48, b"weight": 500}
    f.set_variation_by_axes([want[a.lower()] for a in axes])
    out = []
    for i, name in enumerate(ICONS):
        g = render(f, chr(cps[name]))
        g["code"] = ICON_BASE + i
        g["adv"] = ICON_CELL
        g["dx"] = (ICON_CELL - g["w"]) // 2
        g["dy"] = (ICON_CELL + g["h"]) // 2
        out.append(g)
    return out


def vlw(glyphs, size, ascent, descent):
    glyphs = sorted(glyphs, key=lambda g: g["code"])
    out = bytearray(struct.pack(">6i", len(glyphs), 11, size, 0, ascent, descent))
    for g in glyphs:
        out += struct.pack(">7i", g["code"], g["h"], g["w"], g["adv"], g["dy"], g["dx"], 0)
    for g in glyphs:
        out += g["px"]
    return bytes(out)


def write_header(name, data, note):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name.lower() + ".h")
    with open(path, "w", encoding="utf-8") as f:
        f.write("#pragma once\n")
        f.write("// Сгенерировано tools/gen_fonts.py, руками не править.\n")
        f.write(f"// {note}, {len(data)} байт.\n\n#include <stdint.h>\n\n")
        f.write(f"alignas(4) static const uint8_t {name}[] = {{\n")
        for i in range(0, len(data), 24):
            f.write("  " + ",".join(f"0x{b:02X}" for b in data[i:i + 24]) + ",\n")
        f.write("};\n")
    return path


def write_index(caps):
    """fonts.h: подключает все шрифты и отдаёт высоту заглавных.

    Высота заглавных нужна раскладке: строки ставятся по базовой линии, а
    центрировать подпись по глифу рядом можно только зная, где у неё верх.
    """
    with open(os.path.join(OUT_DIR, "fonts.h"), "w", encoding="utf-8") as f:
        f.write("#pragma once\n// Сгенерировано tools/gen_fonts.py, руками не править.\n\n")
        for name in caps:
            f.write(f'#include "{name.lower()}.h"\n')
        f.write("\nnamespace fontcap {\n")
        for name, cap in caps.items():
            f.write(f"constexpr int {name} = {cap};\n")
        f.write(f"}}  // namespace fontcap\n\nconstexpr uint16_t ICON_BASE = 0x{ICON_BASE:04X};\n")
        f.write(f"constexpr int MENU_ICON_FIRST = {MENU_ICON_FIRST};\n")


def decode(data):
    """Обратный разбор VLW для превью: проверка, что формат собран верно."""
    n, _, size, _, asc, desc = struct.unpack(">6i", data[:24])
    recs = [struct.unpack(">7i", data[24 + i * 28:52 + i * 28]) for i in range(n)]
    ptr = 24 + n * 28
    out = {}
    for code, h, w, adv, dy, dx, _ in recs:
        out[chr(code)] = (w, h, adv, dy, dx, data[ptr:ptr + w * h])
        ptr += w * h
    return out, max(r[4] for r in recs), max(r[1] - r[4] for r in recs)


def draw_decoded(img, faces, text, x, y, color):
    glyphs, asc, _ = faces
    for ch in text:
        if ch not in glyphs:
            x += 6
            continue
        w, h, adv, dy, dx, px = glyphs[ch]
        if w:
            a = Image.frombytes("L", (w, h), px)
            img.paste(Image.new("RGB", (w, h), color), (x + dx, y + asc - dy), a)
        x += adv
    return x


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="PNG с образцами, собранный из готовых VLW")
    args = ap.parse_args()
    fetch()

    built = {}
    caps = {}
    total = 0
    for name, opsz, wght, size, chars in TEXT_FACES:
        f = inter(opsz, wght, size)
        glyphs = [render(f, c) for c in chars]
        if chars is DIGITS:
            # Шрифт из одних цифр: межстрочие Inter с запасом под диакритику
            # и нижние выносные тут пустое место, рамка берётся по чернилам
            asc = max(g["dy"] for g in glyphs)
            desc = max(g["h"] - g["dy"] for g in glyphs)
        else:
            asc, desc = f.getmetrics()
        data = vlw(glyphs, size, asc, desc)
        write_header(name, data, f"Inter {wght}, {size} px, {len(chars)} глифов")
        caps[name] = next(g["dy"] for g in glyphs if g["code"] in (ord("Н"), ord("0")))
        built[name] = data
        total += len(data)
    for name, cell in SYMBOL_FACES:
        data = vlw([render_symbol(c, cell, k) for c, k in SYMBOLS], cell, cell, 0)
        write_header(name, data, f"Noto Sans Symbols {SYMBOL_WEIGHT}, квадрат {cell} px")
        caps[name] = cell
        built[name] = data
        total += len(data)
    data = vlw(render_icons(), ICON_CELL, ICON_CELL, 0)
    write_header("ICONS", data, f"Material Symbols Rounded, квадрат {ICON_CELL} px")
    caps["ICONS"] = ICON_CELL
    built["ICONS"] = data
    total += len(data)
    write_index(caps)
    print(f"готово: {len(built)} шрифтов, {total} байт")

    if args.preview:
        img = Image.new("RGB", (466, 600), (0, 0, 0))
        y = 20
        for name, sample in [
            ("SYM_RING", "".join(c for c, _ in PLANETS)),
            ("SYM_RING", "".join(c for c, _ in SIGNS)),
            ("SYM_BIG", "".join(c for c, _ in PLANETS[:8])),
            ("SYM_RING", "".join(c for c, _ in ASPECTS)),
            ("INTER_TITLE", "ЧТ 25.09  12:40"),
            ("INTER_HEAD", "ТРАНЗИТ Марс"),
            ("INTER_BODY", "Марс в трине к Венере:"),
            ("INTER_BODY", "сходится, орбис 1.2°"),
            ("INTER_SMALL", "линия ярче — аспект точнее"),
            ("INTER_HUGE", "27"),
            ("ICONS", "".join(chr(ICON_BASE + i) for i in range(9))),
            ("ICONS", "".join(chr(ICON_BASE + i) for i in range(9, len(ICONS)))),
        ]:
            faces = decode(built[name])
            draw_decoded(img, faces, sample, 40, y, (255, 214, 150))
            y += faces[1] + faces[2] + 8
        img.save(args.preview)
        print("превью:", args.preview)


if __name__ == "__main__":
    sys.exit(main())
