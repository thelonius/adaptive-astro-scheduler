#!/bin/bash

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?set TELEGRAM_BOT_TOKEN before running}"
CHAT_ID="${TELEGRAM_CHAT_ID:?set TELEGRAM_CHAT_ID before running}"

echo "🔍 Testing bot functionality..."

# Test sendMessage
echo "📤 Sending test message..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"${CHAT_ID}\",\"text\":\"🤖 Bot test - system check at $(date)\"}"

echo -e "\n\n🔍 Getting recent updates..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-5"