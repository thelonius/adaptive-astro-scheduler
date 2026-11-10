#!/usr/bin/env bash
# Починить доступ бота к Telegram-диалогам через Telethon-скиллы (не Bot API).
#
#   ./scripts/openclaw-telegram-fix-n150.sh
#
set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Нет SSH-ключа: $SSH_KEY" >&2
  exit 1
fi

SSH=(ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=30 "${SSH_USER}@${SSH_HOST}")

echo "=== OpenClaw Telegram fix (n150) ==="

"${SSH[@]}" bash -s <<'REMOTE'
set -euo pipefail
WS="$HOME/.openclaw/workspace"
AGENTS="$WS/AGENTS.md"
SYSTEM="$HOME/.openclaw/agents/main/agent/system.md"
SEARCH="$WS/telegram_search.py"

echo "--- patch AGENTS.md ---"
python3 <<'PY'
from pathlib import Path
import re

p = Path.home() / ".openclaw/workspace/AGENTS.md"
text = p.read_text(encoding="utf-8")

telegram_rows = """| Поиск чатов/каналов/сообщений в Telegram | telegram-search | `cd ~/.openclaw/workspace && ./.skills/telegram-search/run.sh dialogs "имя"` или `... messages "запрос"` |
| Отправить сообщение от @edubnitsky | tg-sender | `python3 ~/.openclaw/workspace/.skills/tg-sender/send.py --company <slug> --to @handle` |"""

note = """
### Telegram: Bot API vs твой аккаунт
- **@misgirbot** (этот чат) — Bot API: видит **только** переписку с ботом. Чужие личные диалоги через Bot API **недоступны** — это ограничение Telegram.
- **@edubnitsky** — Telethon (`job_monitor_session.session`): полный список диалогов, поиск, отправка. Всегда через **telegram-search** / **tg-sender**.
- Если просят найти кому написать / переслать / найти диалог — **exec** telegram-search, не отвечай «вижу только твой чат».
"""

changed = False
if "telegram-search" not in text and "| Вакансии |" in text:
    text = text.replace("| Вакансии | python-job-hunter |", "| Вакансии | python-job-hunter |\n" + telegram_rows)
    changed = True

if "### Telegram: Bot API vs твой аккаунт" not in text:
    anchor = "### Telegram Search"
    if anchor in text:
        text = text.replace(anchor, note.strip() + "\n\n" + anchor)
        changed = True

if changed:
    p.write_text(text, encoding="utf-8")
    print("AGENTS.md updated")
else:
    print("AGENTS.md already ok")
PY

echo "--- patch system.md ---"
python3 <<'PY'
from pathlib import Path
p = Path.home() / ".openclaw/agents/main/agent/system.md"
text = p.read_text(encoding="utf-8")
block = """
## TELEGRAM
- Ты бот @misgirbot: **не** видишь личные диалоги через Bot API.
- Для списка чатов и поиска — **exec**:
  - `cd ~/.openclaw/workspace && ./.skills/telegram-search/run.sh dialogs "имя"`
  - `cd ~/.openclaw/workspace && ./.skills/telegram-search/run.sh messages "запрос"`
- Никогда не говори «чужие диалоги недоступны», пока не запустил telegram-search.
"""
if "## TELEGRAM" not in text:
    if "## TOOL DISCIPLINE" in text:
        text = text.replace("## TOOL DISCIPLINE", block + "\n## TOOL DISCIPLINE")
    elif "## IGNORE INTERNAL EVENTS" in text:
        text = text.replace("## IGNORE INTERNAL EVENTS", block + "\n## IGNORE INTERNAL EVENTS")
    else:
        text = block + text
    p.write_text(text, encoding="utf-8")
    print("system.md updated")
else:
    print("system.md already ok")
PY

echo "--- add dialogs to telegram_search.py ---"
if [[ -f "$SEARCH" ]]; then
python3 <<'PY'
from pathlib import Path
p = Path.home() / ".openclaw/workspace/telegram_search.py"
text = p.read_text(encoding="utf-8")

# fix broken patch from earlier attempt
text = text.replace('username or }', 'username or ""}')

if "async def search_dialogs" not in text:
    helper = '''
async def search_dialogs(query, limit=25):
    """Личные и групповые диалоги @edubnitsky (Telethon, не Bot API)."""
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.start(phone=PHONE)
    q = (query or "").strip().lower()
    results = []
    try:
        async for dialog in client.iter_dialogs(limit=300):
            entity = dialog.entity
            title = dialog.name or ""
            username = getattr(entity, "username", None)
            hay = f"{title} {username or ''}".lower()
            if q and q not in hay:
                continue
            results.append({
                "title": title,
                "username": f"@{username}" if username else None,
                "id": getattr(entity, "id", None),
                "type": type(entity).__name__,
                "unread": dialog.unread_count,
            })
            if len(results) >= limit:
                break
    except Exception as e:
        print(f"❌ Error searching dialogs: {e}", file=sys.stderr)
    await client.disconnect()
    return results

'''
    text = text.replace("async def search_channels(query, limit=20):", helper + "async def search_channels(query, limit=20):")

if "search_type == 'dialogs'" not in text:
    text = text.replace(
        'print("  Search in channel:      python3 telegram_search.py channel @channel_name <query>", file=sys.stderr)',
        'print("  Search dialogs:         python3 telegram_search.py dialogs <query>", file=sys.stderr)\n'
        '        print("  Search in channel:      python3 telegram_search.py channel @channel_name <query>", file=sys.stderr)',
    )
    branch = """
    elif search_type == 'dialogs':
        query = ' '.join(sys.argv[2:])
        results = asyncio.run(search_dialogs(query))
        print(json.dumps(results, indent=2, ensure_ascii=False))

"""
    text = text.replace("    elif search_type == 'channel':", branch + "    elif search_type == 'channel':")

p.write_text(text, encoding="utf-8")
print("telegram_search.py ok")
PY
fi

echo "--- smoke test ---"
cd "$WS"
./.skills/telegram-search/run.sh dialogs "шур" 2>&1 | head -15

systemctl --user restart openclaw-gateway.service
sleep 2
systemctl --user is-active openclaw-gateway.service
REMOTE

echo "Done."
