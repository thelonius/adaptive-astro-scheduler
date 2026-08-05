#!/usr/bin/env bash
# Распаковка текстовых баз ZET в zet/library/ перед сборкой корпуса.
#
#   ./scripts/ml/unpack_zet.sh
#   python -m scripts.ml.parse_zet        # читает всё zet/library целиком
#
# zet/library/ в git не хранится (см. .gitignore): исходники лежат рядом
# архивами, каталог пересобирается из них. Каждый архив разворачивается в
# свой подкаталог, потому что имена .txt внутри разных архивов совпадать
# не обязаны, а parse_zet обходит zet/library рекурсивно.
#
# Распаковкой занимается bsdtar: он есть в macOS из коробки и понимает rar,
# в отличие от unzip. На Linux ставится как libarchive-tools.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
src="$root/zet"
dst="$root/zet/library"

if ! command -v bsdtar >/dev/null 2>&1; then
  echo "нужен bsdtar (macOS: есть из коробки, Debian/Ubuntu: apt install libarchive-tools)" >&2
  exit 1
fi

# Только текстовые базы интерпретаций. Остальные архивы в zet/ — орбисы,
# формулы арабских частей, конфиги ZET — другого формата, корпус их не ест.
for archive in Txt4.rar Vinogradov.rar; do
  name="${archive%.*}"
  out="$dst/$name"
  if [ ! -f "$src/$archive" ]; then
    echo "нет архива $src/$archive" >&2
    exit 1
  fi
  mkdir -p "$out"
  bsdtar -xf "$src/$archive" -C "$out"
  # -iname, а не -name: пара файлов в Txt4 лежит с расширением .TXT.
  echo "$name: $(find "$out" -iname '*.txt' | wc -l | tr -d ' ') файлов"
done
