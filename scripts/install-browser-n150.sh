#!/usr/bin/env bash
# Chromium на n150 для редких страниц активации. Обычно не нужен.
#
#   ./scripts/install-browser-n150.sh

set -euo pipefail

SSH_HOST="${N150_SSH_HOST:-95.165.10.115}"
SSH_PORT="${N150_SSH_PORT:-22299}"
SSH_USER="${N150_SSH_USER:-developer}"
SSH_KEY="${N150_SSH_KEY:-$HOME/.ssh/id_ed25519_n150_server2_developer}"

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" bash -s <<'REMOTE'
set -euo pipefail
if command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1; then
  echo "Chromium уже установлен"
elif command -v snap >/dev/null 2>&1; then
  sudo snap install chromium
else
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y chromium-browser xvfb
fi
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y xvfb curl 2>/dev/null || true
mkdir -p ~/bin
cat > ~/bin/open-auth-url <<'INNER'
#!/usr/bin/env bash
URL="${1:?usage: open-auth-url <url>}"
echo "Откройте в браузере на Mac или телефоне:"
echo "$URL"
INNER
chmod +x ~/bin/open-auth-url
echo "OK: ~/bin/open-auth-url"
command -v chromium || command -v chromium-browser || ls /snap/bin/chromium 2>/dev/null
REMOTE
