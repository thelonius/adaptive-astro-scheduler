#!/usr/bin/env bash
# Тюнинг OpenClaw на n150: loop detection, compaction, таймауты, AGENTS.md.
#
#   ./scripts/openclaw-tune-n150.sh
#   OPENCLAW_RESTART=1 ./scripts/openclaw-tune-n150.sh
#
set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"
REMOTE_DIR="${N150_REMOTE_DIR:-~/apps/astro}"
RESTART="${OPENCLAW_RESTART:-1}"
LOCAL_REPO="$(cd "$(dirname "$0")/.." && pwd)"

SSH=(ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=25 "${SSH_USER}@${SSH_HOST}")
SCP=(scp -i "$SSH_KEY" -P "$SSH_PORT")

echo "=== OpenClaw tune n150 ==="

"${SCP[@]}" \
  "$LOCAL_REPO/deploy/n150/openclaw-tuning.patch.json5" \
  "${SSH_USER}@${SSH_HOST}:/tmp/openclaw-tuning.patch.json5"

"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
cd ${REMOTE_DIR}
PATCH="/tmp/openclaw-tuning.patch.json5"

echo "--- config patch ---"
openclaw config patch --file "\$PATCH"

echo "--- verify key settings ---"
openclaw config get agents.defaults.timeoutSeconds
openclaw config get agents.defaults.compaction
openclaw config get tools.loopDetection
openclaw config get tools.web.search

echo "--- patch workspace AGENTS.md (skills first) ---"
AGENTS="\$HOME/.openclaw/workspace/AGENTS.md"
if [[ -f "\$AGENTS" ]] && ! grep -q "SKILLS FIRST" "\$AGENTS"; then
  python3 <<'PY'
from pathlib import Path
p = Path.home() / ".openclaw/workspace/AGENTS.md"
text = p.read_text(encoding="utf-8")

block = """
## SKILLS FIRST — ПРИОРИТЕТ НАД GREP

Перед read/grep по репозиторию проверь \`openclaw skills list\` и запусти скрипт скилла:

| Задача | Скилл | Команда |
|--------|-------|---------|
| Поиск в интернете, цены, товары | websearch | \`python3 ~/.agents/skills/websearch/search.py search "..."\` |
| Лунный день, ретрограды | astro-scheduler | \`python3 ~/.agents/skills/astro-scheduler/astro.py moon\` |
| Планирование дел + слоты | astro-todo | \`python3 ~/apps/astro/skills/astro-todo/astro_todos.py ...\` |
| Вакансии | python-job-hunter | \`python3 ~/.openclaw/workspace/.skills/python-job-hunter/format_results.py morning\` |
| Поиск чатов/сообщений Telegram | telegram-search | \`cd ~/.openclaw/workspace && ./.skills/telegram-search/run.sh dialogs "имя"\` |
| Отправка от @edubnitsky | tg-sender | \`python3 ~/.openclaw/workspace/.skills/tg-sender/send.py ...\` |

Правила:
- **НЕ** говори «вижу только чат с ботом» — для диалогов exec **telegram-search** (Telethon @edubnitsky).
- **НЕ** read/grep \`~/apps/astro\` для типовых задач — только exec скилла.
- **НЕ** \`web_fetch\` на ozon/wb/avito — только websearch.
- Максимум **3 tool-вызова** подряд без ответа пользователю; потом ответь что есть или спроси уточнение.
- Если контекст раздулся или бот «не по теме» — предложи \`/new\`.

"""

marker = "## Как работать"
if "SKILLS FIRST" not in text and marker in text:
    text = text.replace(marker, block + marker)
    p.write_text(text, encoding="utf-8")
    print("AGENTS.md patched")
else:
    print("AGENTS.md already patched or marker missing")
PY
fi

echo "--- patch system.md tool limits ---"
python3 <<'PY'
from pathlib import Path
p = Path.home() / ".openclaw/agents/main/agent/system.md"
text = p.read_text(encoding="utf-8")
block = """
## TOOL DISCIPLINE
- Максимум 3 tool-вызова подряд без текстового ответа пользователю.
- Не read/grep исходники \`~/apps/astro\` — используй скиллы (websearch, astro-todo, astro-scheduler, telegram-search, tg-sender).
- Личные диалоги Telegram — только через \`telegram-search\` (Bot API их не видит).
- Если estimated context >100k или ответы «не по теме» — предложи пользователю \`/new\`.
"""
if "TOOL DISCIPLINE" not in text:
    if "## IGNORE INTERNAL EVENTS" in text:
        text = text.replace("## IGNORE INTERNAL EVENTS", block + "\n## IGNORE INTERNAL EVENTS")
    else:
        text = block + text
    p.write_text(text, encoding="utf-8")
    print("system.md patched")
else:
    print("system.md already has TOOL DISCIPLINE")
PY

rm -f "\$PATCH"

if [[ "${RESTART}" == "1" ]]; then
  echo "--- restart gateway ---"
  systemctl --user restart openclaw-gateway.service
  sleep 3
  systemctl --user is-active openclaw-gateway.service
fi

echo "--- sessions ---"
openclaw sessions list 2>&1 | head -6
REMOTE

echo "Done."
